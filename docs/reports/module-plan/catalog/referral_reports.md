# Referral Reports - report specifications

Referral marketing and referral-case follow-up: where patients come from and what they produce (six classic reports on the
patient referral fields and the referral-source catalog), and the status of referral cases sent and received (three
Referral Management reports). Hub home: Patients › Referrals (brief section 1). Default phase P3; every report ships in P3.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `referral.referral_production_list` | Referral Production List | Per referred patient: visits, procedures, production, collection, adjustments in the period, grouped by referral type (or type, zip, source) | P3 | M | READY (app patients: SCHEMA(40); first-visit filter: REPAIR(19)) | DOCUMENTED (both layouts, samples 2016) |
| `referral.referred_out_list` | Referred Out List | Patients the office referred out, with date, dentist and specialty | P3 | S | APP (structured target and specialty: SCHEMA(40)) | DOCUMENTED (sample 2016) |
| `referral.referral_source_list` | Referral Source List | Master list of referral sources | P3 | S | READY (default run); REFERRAL TYPE filter, `Referral Type` column and `Both`: SCHEMA(NEW `source_type_code` / three-valued direction, extension of DATA-40) | DOCUMENTED (sample 2016) |
| `referral.external_outgoing_referral_management` | External Outgoing Referral Management | Referral cases sent by our providers to outside providers, with status | P3 | M | SCHEMA(40) | INFERRED (utility grid only) |
| `referral.referral_summary_report` | Referral Summary Report | Per referral type and source: #Ref, production, collection, average, referral counts MTD / YTD / Last Year | P3 | M | READY for Production / Collection; `#Ref`, `Referral #` columns and `Avg Production`: REPAIR(19) (first-visit fallback) or SCHEMA(40) (`patients.referral_date`) | DOCUMENTED (sample 2023) |
| `referral.referral_count_summary` | Referral Count Summary | Per referral type and source: referred patients seen in the period | P3 | S | READY (as Referral Production List) | DOCUMENTED (sample 2016) |
| `referral.internal_referral_management` | Internal Referral Management | Referral cases between our own providers / offices, with Tx Status and booked appointment | P3 | M | SCHEMA(40) (items with status `internal_referral` exist (APP) without a case or Tx Status) | INFERRED (utility grid only; GROUP BY hidden) |
| `referral.external_incoming_referral_management` | External Incoming Referral Management | Referral cases received from outside providers, with status and contact tracking | P3 | M | SCHEMA(40) | INFERRED (utility grid and field guide only) |

## Shared rules

### Families inside the category

| Family | Reports | Grain | Dataset rows |
|---|---|---|---|
| Patient referral (inbound) | Referral Production List, Referral Summary Report, Referral Count Summary | referred patient; referral source within referral type | `rpt_referral_facts` with `referral_kind = 'inbound_source'`, joined on `patient_id` to `rpt_charges`, `rpt_payment_allocations`, `rpt_adjustments`, `rpt_patient_dim`, `rpt_patient_activity` |
| Patient referral (outbound) | Referred Out List | referred-out patient (one per patient: single `patients.referred_to`) | `rpt_referral_facts` with `referral_kind = 'outbound_patient'`, `rpt_patient_dim`, `rpt_patient_activity` (`Last Visit`) |
| Source catalog | Referral Source List | referral source | passthrough `referrals` (catalog rule of 04 section 6.5) |
| Referral cases | the three Referral Management reports | referral case | `rpt_referral_facts` with `referral_kind = 'case'` over `referral_cases` (NEW, DATA-40), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`, `rpt_appointment_facts` (booked appointment) |

`referral_kind = 'outbound_item'` (treatment-plan items with a referred-out status) feeds no legacy report; it is the
interim source of `outbound_referrals` and of the case reports' history (see open questions).

### Shared parameters and defaults (from the parity file; no report repeats them)

| Parameter | Type | Reports | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 8 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | r01, r02, r05, r06; r03 display-only | `working_office` | Patient reports: attribution = patient home office, money legs restricted to the same office set (below). r03: `enabled_when false`, `disabled_value {"office_ids": "all"}`, catalog rule of 04 section 6.5 (can hide office-pinned sources from an office-restricted caller, narrower than legacy; r03 open question 3) |
| `referred_from_office_scope` | `office_scope` | r04 (security scope), r07 (filter) | `working_office` | Referring office of the case |
| `referred_to_office_scope` | `office_scope` | r07 (filter, default `all`), r08 (security scope, default `working_office`) | per report | Receiving office of the case |
| `date_range` (`date_from`, `date_to`) | `date_range` | all but r03 | `today` / `today` | Fixed basis per report: `service_date` (r01, r05, r06), `referred_out_date` (r02), `referral_date` (r04, r07, r08); no `date_basis` parameter |
| `referral_type_codes` | `entity_multi` | r01, r03, r05, r06 | `all` | Patient's referral type on r01 / r05 / r06 (predicate on NEW `rpt_referral_facts.referral_type_code`, canonical value of `rpt_value_map` domain `referral_type`, owner 03 DATA-40); type of the source row on r03 (NEW `referrals.source_type_code`). Legacy single-select, list = enhancement. Options: canonical `referral_type` values with `definitions:referral_type` labels. Request to 04_filter_framework.md section 3.7: make the dictionary semantics per report (today "Lead-source type of the referral source") |
| `specialty_codes` | `entity_multi` | r02, r04, r07 | `all` | Referral-source specialty on r02 / r04 (NEW referral-source variant of `lookup:specialties`: distinct trimmed `referrals.specialty`, to be declared in 04 section 13.3); case specialty on r07 (`coalesce(referral_cases.specialty, referred-to provider specialty)`) |
| `referred_to_ids`, `referred_from_ids` | `entity_multi` | r02, r04 / r08 | `all` | `lookup:referral_sources` filtered by direction (referred-to / referred-by); search source, `max_items` 500 |
| `referred_from_provider_ids`, `referred_to_provider_ids` | `entity_multi` | r04, r07 / r07, r08 | `all` | `provider_role` `referring` / `referred_to`; never scoped by `providers.office_id` |
| `procedure_codes`, `user_ids` | `entity_multi` | r04, r07 | `all` | Any-match on the referred codes of the case; user = creator of the case (inferred) |
| `referral_statuses` | `enum_multi`, `accepts_all` | r04, r08 | `all` | Eight-value case vocabulary; `predicate`, `min_items` 1 |
| `exclude_deleted_referrals` | `boolean` | r07, r08 | `true` | Soft-deleted cases dropped |

Dynamic rules for the whole family: `refferal_reports.r01.d01` (Office / Office Group mode decides the value key of all three
office-scope parameters) and `refferal_reports.r01.d02` (ADD TO MY FAVORITES / UPDATE MY FAVORITES = one favorite saved view
per caller and report). Footer actions on every report: CLEAR CRITERIA -> reset to defaults (frontend), PRINT / PREVIEW ->
`print`, ADD TO MY FAVORITES -> `saved_view`.

### Date bases, attribution, freshness

| Topic | Rule |
|---|---|
| Date basis | `service_date` of posted procedures (`rpt_charges.service_date`); collection = allocations to those charges (PD-3 definition; allocation via `rpt_payment_allocations`, data card 2.13, PD-7); adjustments by effective service date. `referred_out_date` = `patients.referral_to_date`. `referral_date` = Referral Date of the case. Office-local dates, inclusive (AD-9) |
| "Today" | Office-local date of the working office (security-scope office on r04 / r08, `referred_from_office_scope` on r07) |
| Office attribution | Patient reports (r01, r02, r05, r06): `scope.office_attribution = home_office` (`rpt_patient_dim.home_office_id`), current state - legacy "patients currently in that office". Money legs of r01 / r05 / r06 are additionally restricted to the resolved office set through the named exception NEW `scope.money_leg_office_filter` (owner 03 section 5.1 / 02, so the one-attribution lint of data card 5.1 rule 1 accepts it): production, `#Proc`, `# Visits` and the r06 qualifying visit on office of service (`rpt_charges.office_id`, `rpt_visits.office_id`); collection on the allocation office (`rpt_payment_allocations.allocation_office_id`, the office of the paid charge, so only allocations to counted charges count); adjustments on `rpt_adjustments.office_id` - the legacy "no cross-office data". Case reports: referring office (r04), receiving office (r08), either office readable under 08 S-13 (r07). r03: none (catalog rule) |
| Provider attribution | Patient reports: none (no provider parameter). Case reports: `referring` and `referred_to` roles of the case |
| History limit | Current state only: a change of the patient's home office, referral type or source rewrites history (legacy behaviour, vendor text). Printed as an `availability[]` warning on r01, r05, r06 |
| Freshness | `live` (views over OLTP). `cost_class`: `instant` for r03; `interactive` for the rest |

### Sign and arithmetic conventions (deliberate, because the legacy samples conflict)

| Item | Convention | Legacy evidence |
|---|---|---|
| Collection | Positive, allocation-based on the charges in the range (PD-3, PD-6) on r01 / r05, net of refunds, in every layout and total. The metric `referral_source_production` takes collections from payments on the patient join (`-Σ p.amount [COLL]`), so it does not reconcile: `reconciles_with` covers production only until 05_metric_catalog.md redefines the collection leg on the allocation join (request to 05; data card 2.23 to name `rpt_payment_allocations`, request to 03) | standard layout printed negative, zip layout positive [conflict] |
| Adjs | Signed: credit adjustments negative, debit adjustments positive | sample shows signed values |
| `# Visits` | Rows of `rpt_visits` (patient-office-days with a live visit-code production charge) in the range and office set; subtotals are sums of rows | zip-sample subtotals do not equal row sums [conflict] |
| `Avg Production` | `ratio(production, ref_count)` with the zero-denominator guard: empty cell when `#Ref` = 0 (never production); layout option `avg_production_zero_ref` (`legacy` / `empty`, default `empty`) reproduces the legacy value | vendor sample prints production when `#Ref` = 0 [quirk not copied by default; family open question 9] |
| Totals | `Total for Referral type, <type> [n]:` (n = patients) on r01; `Total :` per type on r05 / r06. Grand total: layout parameter `show_grand_total` (`boolean`, `role: layout`, default `false`, so the legacy default prints none); `true` adds `Grand Total :` after the last group | samples |

### Page furniture, rights, data classes

| Topic | Rule |
|---|---|
| Header | Organisation name, printed title from `title_templates` (r01 `Referral Production Listing`, subtitle `(by Zip Code)` when `group_by = zip_code`; r05 `Referral Summary`; others the menu name), `Office : <office name>` outer band when `["ctx", "multi_office"]` |
| Footer | `criteria_echo = footer` with the legacy echo labels (`From` / `Thru`, `First Visit Date From` / `Thru` (legacy typo `Firsti` not copied), `Referral Types`, `From Zip` / `Zip`, `Exclude Pat Type`, `Specialty`, `Referred Out to`, `Referral By/To`), `Printed : <date time>`, `By : <user>`, `Page : n of m` |
| Right family | `referral`: `reports_referral_reports_screen_view_only` (run and view) / `reports_referral_reports_screen_full_control` (also print, export, schedule) (08 section 2.3, PD-10). No per-report override; whether the three case reports also need the legacy `Utilities - Referral Management Full Control` is an open question |
| Data classes | Patient name, chart #, patient id, phones, zip, dates of service, referral source on a patient row: `phi_identified`. Money on a patient row (r01): `financial_patient`. Money per source or type (r05): `financial_practice`; a source that is a patient or free text is a `phi_identified` + `deny` label (08 section 5.2 rule 13) and degrades to `source_type_label` for a caller without the class. Counts (r06): `aggregate`. r03 catalog columns: `aggregate`, `Cost` `financial_practice`, a source naming a patient `phi_identified`. Case rows: `phi_identified`; referral reason and notes `phi_identified` (free text, rule 4) |
| Drill | Source or type row -> `kind: rows` (r01 filtered to the source); patient cell -> `kind: record` patient chart (right of the chart feature, `phi_identified`); case row -> patient chart and booked appointment |
| Metrics | Summary figures reconcile with `referral_source_production` (r01 / r05 production per source; collection excluded, see sign conventions), `new_patients_missing_source_pct` (r06 "No Referred By" share, cohort condition) - `reconciles_with[]` tests, never second queries. r02, r04 and r07 carry a plain row-count test instead of `outbound_referrals`: the metric's dimensions are office, provider, specialty and direction, and its direction `out` / `internal` also counts `outbound_item` rows (request to 05_metric_catalog.md: add `referral_kind` as a dimension, then the tests become `reconciles_with`) |

### Data gaps the family depends on (owned by 03)

| Gap | Effect | Owner |
|---|---|---|
| `referral_cases` entity (direction, from / to office and provider, status, Tx status, contact entries, reason code, appointment, created_by, soft delete) | r04, r07, r08 return no rows until it exists and the app writes cases | DATA-40 |
| `patients.referral_source_id`, `referral_date` | App patients hold free-text `referred_by`; source match only by name until back-fill | DATA-40 |
| Structured referred-out target | r02 source and specialty filters match by name until a source id is stored | DATA-40 |
| Type of a referral-source row (legacy setup field `Type`) and the `Both` direction | r03 REFERRAL TYPE and REFERRED TO/BY `both` cannot filter and the `Referral Type` column prints blank: NEW `referrals.source_type_code` and a three-valued direction, with a back-fill of the 665 migrated sources (Type and Referred by/To = Both) from the legacy referral-source export by `referrals.legacy_id`, owner 03_data_foundation.md (extension of DATA-40; coverage matrix row 58 to be updated by 03) | NEW |
| Canonical patient referral type code | r01 / r05 / r06 REFERRAL TYPE predicate and the `Referral Type :` group key: NEW `rpt_referral_facts.referral_type_code` (`patients.referral_type` through `rpt_value_map` domain `referral_type`, folding definitions group `REFTYPE` codes and app labels) | NEW, owner 03 (DATA-40) |
| Maintained first visit date | r01 first-visit cohort is NULL until maintained; r05 `#Ref` / `Referral #` fallback date | DATA-19 |
| `referrals` hard delete, no index | Deleting a source breaks the string link; lookups unindexed | DATA-08, DATA-40 (`is_active`) |

### Family-wide enhancements (additive; defaults unchanged)

| Enhancement | Reports | Phase |
|---|---|---|
| Multi-select on REFERRAL TYPE and SPECIALTY; search and inactive switch in the source pickers | all | P3 |
| Columns: percent of patients and percent of production per source (`share_of_parent`); `show_grand_total` (default `false`) | r01, r05, r06 | P3 |
| ROI column from `referrals.cost` (labelled reference-only, no period) | r05 | P4 |
| Cross-office view (home office ignored, money in all offices) as an explicit option, default off | r01, r05, r06 | P4 |
| Case funnel (received -> contacted -> scheduled -> completed) with ageing; row actions "open case", "book appointment" | r04, r07, r08 | P4 |
| Bulk actions letters / labels to referral sources (owning feature handles, PD-15) | r03, r05 | P3 |

### Family-wide open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Do r01 / r05 / r06 accept several offices or an office group, given the vendor text "limited to the office the report is run in"? | live legacy tool, office group run |
| 2 | Values and order of REFERRAL TYPE, SPECIALTY and REFERRED TO/BY dropdowns; source of SPECIALTY (provider or referral-source specialties) per report | live legacy tool, expand each dropdown |
| 3 | What follows the third STATUSES row on External Outgoing (Exclude Deleted Referrals? GROUP BY?) and the GROUP BY options of Internal Referral Management | live legacy tool, scroll the criteria panel |
| 4 | Output columns, grouping and totals of the three Referral Management reports (no sample exists) | live legacy run of each, PDF and Excel |
| 5 | Meaning of USERS (creator versus modifier) and of CONTACT STATUSES (latest entry? no entry = No Response?) | live legacy tool |
| 6 | Whether the case reports also require `Utilities - Referral Management Full Control` | live legacy tool with a View Only group |
| 7 | Since the 2026-11 office-group associations of referral sources: are source pickers filtered by office, and is OFFICE/GROUP still disabled on Referral Source List? | live legacy tool |
| 8 | Product: confirm `show_grand_total` default `false` (legacy prints none), or approve a grand total as a default deviation | product owner |
| 9 | Product: `Avg Production` when `#Ref` = 0 - default `empty` (quirk not copied) or `legacy` (prints production)? | product owner |
| 10 | Is a payment applied in an office outside the selected set to a charge inside it counted as Collection (we count by allocation office)? | live legacy run, two offices |

## Referral Production List - `referral.referral_production_list`

Referral Reports, screenshot `1.PNG` - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class interactive - legacy output confidence DOCUMENTED (both layouts, vendor samples 2016)

Legacy names (aliases): `Referral Production List`, `Referral Production Listing`, `Referral Production Listing by Zipcode`.

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Owner, marketing coordinator | Month end, quarter end, before a marketing budget decision | Which referral types and sources bring patients who produce and pay; which sources deserve a thank-you or more spend (vendor: a marketing return-on-investment report, not an accounting report) |
| Office manager | On demand, new-patient cohort review | With FIRST VISIT DATE RANGE: what the patients who started in a period produced afterwards |
| Marketing coordinator | Before a local campaign | Group By Zip Code: where referred patients live, per type and source |

### Legacy output

DOCUMENTED from two 2016 samples (research section 6, `[P54·img]`). Samples are old; the layout may have changed (research section 10 #6).

| Layout (`group_by`) | Printed title | Groups | Columns in order | Subtotals |
|---|---|---|---|---|
| Standard (`none`) | `Referral Production Listing` | `Referral Type : <type>` | `Referral` · `Chart #` · `Pat ID` · `Patient Name` · `# Visits` · `#Proc` · `Production` · `Collection` · `Adjs` | `Total for Referral type, <type> [n]:` (n = patients) with sums of the five numeric columns |
| By zip (`zip_code`) | `Referral Production Listing` + subtitle `(by Zip Code)` | `Referral Type` -> `Zip Code` -> `Referral` | `Zip Code` · `Referral` · `Chart #` · `Pat ID` · `Patient Name` · `# Visits` · `#Proc` · `Production` · `Collection` (no `Adjs`) | `Total for Referral, <source> :`, `Total for Zip code, <zip> :`, `Total for Referral type, <type> :` (type level: production and collection only) |

Footer echo: `From` / `Thru`, `First Visit Date From` / `Thru`, `Referral Types`; zip layout adds `From Zip` / `Zip`. No `Office :` band in the 2016 samples.

| Quirk | Treatment |
|---|---|
| `Referral` blank when the patient has a referral type but no Referred By source | Kept: blank cell (`null_display` empty). In the zip layout the source group of those patients is labelled `(no source)` so the subtotal line reads `Total for Referral, (no source) :` [deliberate] |
| Collection printed negative in the standard layout and positive in the zip layout [conflict] | Fixed: positive in both (header sign conventions) |
| `# Visits` subtotals not equal to row sums in the zip sample [conflict] | Fixed: every subtotal is the sum of its rows |
| Zip layout has no `Adjs` column; type subtotal of the zip layout shows only production and collection | Kept |
| Footer typo `Firsti Visit Date From` | Not copied |
| Single-office, current-state data (vendor text) | Kept as home-office attribution plus office-restricted money legs; `availability[]` warning `referral_current_state` |

Not documented: row order inside a type group, whether patients with no activity in the range are listed, how `#Proc` counts (all posted lines or only ledger/visit codes). Proposals below are [I].

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this report: home office of the patient (scope.office_attribution = home_office: rpt_referral_facts.office_id of the inbound_source rows = rpt_patient_dim.home_office_id, current state). Named exception NEW scope.money_leg_office_filter (owner 03 section 5.1 / 02): the money legs of those patients are restricted to the same resolved office set - production, #Proc and # Visits on office of service (rpt_charges.office_id, rpt_visits.office_id); Collection on the allocation office (rpt_payment_allocations.allocation_office_id = office of the paid charge), so only payments allocated to counted charges count; Adjs on rpt_adjustments.office_id. This reproduces the legacy rule 'data limited to the office the report is run in, for patients currently in that office, no cross-office data' when one office is selected [I: whether a payment applied in another office counts is unconfirmed]. With several offices or an office group the result is the union; whether the legacy tool allowed that at all is an open question. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PROCEDURE DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = service_date: the date of service of the posted procedures (rpt_charges.service_date) of the referred patients. Production and #Proc count charges with service_date in the range, # Visits counts rpt_visits rows with visit_date in the range; Collection = payments allocated to those charges (PD-3 definition; allocation via rpt_payment_allocations, data card 2.13, PD-7); Adjs = adjustments whose effective service date (coalesce(linked_service_date, transaction_date)) is in the range. Default today in the office time zone. |
| PROCEDURE DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = service_date: the date of service of the posted procedures (rpt_charges.service_date) of the referred patients. Production and #Proc count charges with service_date in the range, # Visits counts rpt_visits rows with visit_date in the range; Collection = payments allocated to those charges (PD-3 definition; allocation via rpt_payment_allocations, data card 2.13, PD-7); Adjs = adjustments whose effective service date (coalesce(linked_service_date, transaction_date)) is in the range. Default today in the office time zone. |
| FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS ) | Start Date (date_input) | (empty) | `first_visit_date_from` | date_range | - | - | replicated_enhanced | Optional cohort range on the patient's first visit date (rpt_patient_dim.first_visit_date = min(rpt_visits.visit_date), any office, maintained by DATA-19); blank = no restriction (all patients). Not the primary range. Header instruction ( LEAVE BLANK FOR ALL PATIENTS ) is kept as help text. Footer echo legacy spelling 'Firsti Visit Date From' is not copied. |
| FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS ) | End Date (date_input) | (empty) | `first_visit_date_to` | date_range | - | - | replicated_enhanced | Optional attribute range: blank = no restriction. Not the primary date range. |
| ZIP CODE RANGE | From (text_input) | (empty) | `zip_code_from` | text_range | - | - | replicated | Start of the patient zip range on rpt_patient_dim.zip5 (string comparison on the first five characters); blank = no lower bound. Footer echo From Zip. |
| ZIP CODE RANGE | Through (text_input) | (empty) | `zip_code_to` | text_range | - | - | replicated | End of the patient zip range, inclusive, on rpt_patient_dim.zip5; blank = no upper bound. Footer echo Zip. |
| REFERRAL TYPE | (no label) (dropdown) | shown: ALL | `referral_type_codes` | entity_multi | - | `all` | replicated_enhanced | Filters the patient's own referral type (patients.referral_type), NOT the type stored on the referral-source row. Predicate on NEW rpt_referral_facts.referral_type_code of the inbound_source row: canonical value of patients.referral_type through rpt_value_map domain referral_type (migrated REFTYPE codes and app labels fold to one value; owner 03_data_foundation.md, DATA-40); the printed label stays source_type_label. A patient with a type and no Referred By source is kept; Referral prints blank (standard layout), and the source group is labelled (no source) in the zip layout. Legacy single-select (one type or ALL); the parameter accepts a list (enhancement). Options: the canonical values of rpt_value_map domain referral_type with their definitions:referral_type labels (option-source variant requested from 04 section 13.3). |
| OTHER OPTIONS | Group By Zip Code (checkbox) | **unchecked** | `group_by.zip_code` | enum | - | `false` | replicated | Ticked sets group_by = zip_code: variant 'by Zip Code' (subtitle '(by Zip Code)'), groups Referral Type -> Zip Code -> Referral, no Adjs column (legacy layout). Unticked = group_by none = standard layout grouped by Referral Type. Former report name Referral Production Listing by Zipcode kept as alias. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| OFFICE/GROUP = Office Group | The SELECT picker chooses office groups defined in setup instead of offices; with Office it chooses one or more offices. Cross-cutting statement of the document for the Appointment, Recall and Referral criteria screens - recorded once here (Referral Production List); it applies to every report of this category that has the Office / Office Group radios. | office_scope (r01, r02, r05, r06; display-only on r03), referred_from_office_scope (r04, r07) and referred_to_office_scope (r07, r08): the mode radio decides the value key. mode office -> the picker lists offices (lookup:offices) and writes office_ids (list, working_office, my_offices or all); mode office_group -> it lists office groups (lookup:office_groups) and writes office_group_id or office_group_ids (all = every group). Switching the mode resets the selection to that mode's default (working_office / all). Exactly one value key is sent. |
| A favorite has already been saved for the report (the legacy tool keeps one saved version per report) | The action button ADD TO MY FAVORITES reads UPDATE MY FAVORITES. Cross-cutting statement of the document for the Appointment, Recall and Referral criteria screens - recorded once here (Referral Production List); it applies to every report of this category. Whether the relabel shows only when the screen is opened from My Favorites is not stated. | Every report of the category: the ADD TO MY FAVORITES action saves the current params as a server-side saved view flagged favorite (report_saved_views, report_favorites). When the caller already holds a favorite for this report_key the action is labelled UPDATE MY FAVORITES and overwrites that favorite's params (legacy: one saved version per report); further named views are an additive enhancement. Shown on every open of the report, from the hub or from My Favorites. |
<!-- PARITY:refferal_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | `output_format = pdf`: preview on screen, then the banded PDF. Rows unchanged |
| PRINT FORMAT `Excel` | `output_format = xlsx`: flat typed sheet from the same snapshot (`csv` added). Rows unchanged |
| OFFICE/GROUP `Office` (default) + picker (default working office) | `office_ids`: patients whose `rpt_patient_dim.home_office_id` is in the set (current state); their production, visits and procedures counted only where `rpt_charges.office_id` / `rpt_visits.office_id` is in the set, collections only where `allocation_office_id` (office of the paid charge) is in the set, adjustments only where `rpt_adjustments.office_id` is in the set (`scope.money_leg_office_filter`). One `Office :` band per office when more than one office resolves |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` (or `office_group_ids`): every office of the group, same rule as above, banded per home office |
| PROCEDURE DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on `service_date`: production, `#Proc` and `# Visits` of charges / visits dated in the range; collection = payments allocated to those charges; `Adjs` = adjustments whose effective service date is in the range |
| FIRST VISIT DATE RANGE Start / End (default blank = all patients) | `first_visit_date_from` / `first_visit_date_to`: keep only patients whose `first_visit_date` is in the range (new-patient cohort); one bound blank = open on that side; both blank = no restriction. Help text `( LEAVE BLANK FOR ALL PATIENTS )` kept |
| ZIP CODE RANGE From / Through (default blank) | `zip_code_from` / `zip_code_to`: inclusive string range on `rpt_patient_dim.zip5`; blank side = open; patients without a zip drop out as soon as either bound is set |
| REFERRAL TYPE `ALL` (default) | `referral_type_codes = all`: no type predicate; patients with any type, and patients with a Referred By source but no type, are listed |
| REFERRAL TYPE one type | `referral_type_codes = [code]`: the patient's own referral type (NEW `referral_type_code`, label `source_type_label`), not the type of the source row; patients of that type without a source are kept (blank `Referral`; `(no source)` group in the zip layout) |
| OTHER OPTIONS Group By Zip Code unticked (default) | `group_by = none`: standard layout, grouped by referral type, `Adjs` column present |
| OTHER OPTIONS Group By Zip Code ticked | `group_by = zip_code`: zip layout (title subtitle `(by Zip Code)`, groups type -> zip -> source, no `Adjs`) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset to defaults (frontend) / run with `render_output` / one favorite saved view per caller (`UPDATE MY FAVORITES` when one exists; rule `refferal_reports.r01.d02`) |

Dependency rules: `refferal_reports.r01.d01` (mode radio decides `office_ids` versus `office_group_id`; switching mode resets the selection to that mode's default). Nothing is greyed on this screen. `zip_code_from <= zip_code_to` and `first_visit_date_from <= first_visit_date_to` when both are set (422 `invalid_parameter`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `referral_type_codes` as a list | `entity_multi` (`lookup:definitions:referral_type`) | `all` | Several types at once (family enhancement) |
| `referred_from_ids` | `entity_multi` (`lookup:referral_sources`, direction referred-by, `max_items` 500) | `all` | Restrict to one or more Referred By sources; target of the source-subtotal drill. Same key as on r08 (header) |
| `source_categories` | `enum_multi` NEW: `doctor`, `patient`, `other`, `none` (owner 04) | full selection, `no_predicate` | Professional referrals versus patient word-of-mouth versus marketing; `none` = patients without a source row |
| `include_zero_activity` | `boolean` NEW | `false` | `true`: also list referred patients (in scope and cohort) with no visit, charge, collection or adjustment in the range, zeros printed; finds referrals that never converted |
| `sort_by` | `enum`: `referral_patient` (default), `patient_last_name`, `production_desc`, `collection_desc`, `chart_no` | `referral_patient` [I] | Row order inside the innermost group |
| `page_break_by` | `enum` (`role: layout`): `none`, `group` | `none` | `group`: new PDF page per referral type |
| `show_grand_total` | `boolean` NEW (`role: layout`, family) | `false` | Adds `Grand Total [n]:` after the last type |
| Share columns | column switch `show_share_columns` (`boolean`, P3, family item) | `false` | Adds `% of patients` and `% of production` per type and source (`share_of_parent`) |
| `compare_to` | comparison period (FLT-26, P4) | `none` | Adds `Production (prior)` and `Collection (prior)` per patient and per subtotal for `previous_period` / `previous_year` |
| All-office activity option | `boolean` NEW, P4 (family enhancement "cross-office view"; key to be aligned with r05 / r06) | `false` | Ignore the office restriction of the money legs: count the patient's production and collections in every office |
| Saved view "New patients this month by source" | saved view | - | `date_preset = month_to_date`, `first_visit_date_preset = month_to_date` |
| Saved view "Last year by zip" | saved view | - | `date_preset = last_year`, `group_by = zip_code` |

### Data

| Item | Rule |
|---|---|
| Population | `rpt_referral_facts` rows with `referral_kind = 'inbound_source'` (patients with a non-blank `referred_by` or `referral_type`), one per patient; `office_id` (= `rpt_patient_dim.home_office_id`) in the resolved office set; filters below; and at least one of: a visit, a charge, a collection allocation or an adjustment counted in the range [I] (unless `include_zero_activity`) |
| Datasets | `rpt_referral_facts` (`patient_id`, `office_id`, `referral_source_id`, `source_name`, `source_type_label`, `source_category`); `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `zip5`, `first_visit_date`); `rpt_charges` (`patient_id`, `office_id`, `service_date`, `charged_fee`, `is_production`); `rpt_visits` (`patient_id`, `office_id`, `visit_date`); `rpt_payment_allocations` (`debit_patient_id`, `service_date`, `amount`, `credit_ledger_bucket`, `counts_as_collection`, `allocation_target`, `allocation_office_id`); `rpt_adjustments` (`patient_id`, `office_id`, `amount`, `entry_type`, `is_transfer`, `linked_service_date`, `transaction_date`); `rpt_office_dim` (`office_name`, band label) |
| `# Visits` | `count(*)` of `rpt_visits` rows of the patient with `visit_date` in the range and `office_id` in the set |
| `#Proc` | `count(*)` of live `rpt_charges` rows of the patient with `is_production`, `service_date` in the range, `office_id` in the set [I: legacy may count only ledger codes - confirm] |
| `Production` | `Σ charged_fee` of the same rows (posted fee, PD-1 legacy parity) |
| `Collection` | `Σ amount` of `rpt_payment_allocations` rows with `credit_ledger_bucket = 'collection'`, `counts_as_collection`, `allocation_target = 'production'`, `debit_patient_id` = patient, `service_date` (of the paid charge) in the range, `allocation_office_id` (office of the paid charge) in the set, so only allocations to charges whose production is counted [I: legacy treatment of a payment applied in another office, family open question 10]. Positive. Net of refunds by construction (a refund takes its payment back first, data card 2.13). As of the run: a payment posted after `date_to` on a charge in the range counts [I] |
| `Adjs` | `Σ amount` (signed: credit negative) of `rpt_adjustments` with `entry_type = 'adjustment'`, `NOT is_transfer`, `coalesce(linked_service_date, transaction_date)` in the range, `office_id` in the set |
| Date basis | `service_date` fixed (`date_basis` served, no parameter); office-local inclusive dates; `today` of the working office |
| Office attribution | `scope.office_attribution = home_office` for the patient row (current state) plus the named exception NEW `scope.money_leg_office_filter` (owner 03 section 5.1 / 02) for the money legs (Shared rules) |
| Provider attribution | None (no provider parameter, no provider column) |
| `first_visit_date` filter | `rpt_patient_dim.first_visit_date` = `min(rpt_visits.visit_date)`, any office (DATA-19) |
| `zip_code` filter | `zip5 >= :from AND zip5 <= :to` (text comparison, bounds trimmed to 5 characters) |
| `referral_type_codes` | NEW `rpt_referral_facts.referral_type_code IN (...)`: canonical value of `patients.referral_type` through `rpt_value_map` domain `referral_type` (migrated `REFTYPE` codes and app labels fold to one value; owner 03, DATA-40) |
| Group keys | `referral_type_code` with label `source_type_label` (null -> `No Referral Type` [I]); `zip5` (null -> `No Zip`); `referral_source_id` with label `source_name` |
| Availability | Coverage matrix row 56: **READY** for migrated patients (source link by legacy id); app patients: **SCHEMA(40)** (free-text `referred_by` groups by the typed text until `patients.referral_source_id` exists); first-visit filter: **REPAIR(19)**. Collection needs `rpt_payment_allocations` tenant-wide (DATA-26, P2); migrated allocations are derived oldest-first and the run prints "allocation derived (oldest first)" |
| Migrated history | A change of home office, referral type or source rewrites the past (legacy behaviour; warning `referral_current_state`). Charges skipped by the migration are missing (completeness caveat of data card 2.9). Migrated adjustments are unclassified, so `Adjs` includes every non-transfer adjustment; refunds and transfers of history are not separable until DATA-12 |

### Output

Block `main`, grain referred patient; `row_id_column` = `patient_id` (hidden); `fixed_outer` office band `Office : <office_name>` when `["ctx", "multi_office"]`.

Standard variant (`group_by = none`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `referral_type_label` (hidden group key) | Referral Type | text | `aggregate` | group header `Referral Type : {referral_type_label}` |
| `referral_source_name` | Referral | text | `phi_identified` | - |
| `chart_no` | Chart # | text | `phi_identified` | - |
| `patient_id` | Pat ID | id | `phi_identified` | `count` -> the `[n]` of the subtotal label. Prints the DentC `patients.id`: for migrated patients this is not the Denticon patient id (`legacy_id`, not exposed by `rpt_patient_dim`); availability note `patient_id_not_legacy` [deliberate; legacy id would need NEW `rpt_patient_dim.legacy_patient_id`, owner 03] |
| `patient_name` | Patient Name | text | `phi_identified` | label `Total for Referral type, {referral_type_label} [{n}]:` |
| `visit_count` | # Visits | integer | `phi_identified` | `sum` |
| `procedure_count` | #Proc | integer | `phi_identified` | `sum` |
| `production` | Production | money | `financial_patient` | `sum` |
| `collection` | Collection | money | `financial_patient` | `sum` |
| `adjustments` | Adjs | money | `financial_patient` | `sum` |
| `pct_of_patients`, `pct_of_production` | % Patients, % Production | percent | derived | `share_of_parent` on subtotals only; `visible_when` `["truthy", "show_share_columns"]` |
| `patient_last_name`, `referral_source_id`, `source_category`, `office_id` | (hidden) | text / id | `phi_identified` / `aggregate` | sort and drill keys |

By-zip variant (`group_by = zip_code`): same columns without `adjustments`, plus `zip_code` (`zip5`, `phi_identified`, first visible column). Levels: `referral_type_label` (subtotal `Total for Referral type, {referral_type_label} :`, `production` and `collection` only) -> `zip_code` (subtotal `Total for Zip code, {zip_code} :`, all four numeric [I]) -> `referral_source_id` (subtotal `Total for Referral, {referral_source_name} :`, all four numeric [I]; columns of these two levels not documented, open question 8). Patient rows inside the source level.

| Item | Rule |
|---|---|
| Grand total | `show_grand_total` (layout, default `false`; legacy shows none): `true` adds `Grand Total [n]:` with the same sums on both variants |
| Sort options | `referral_patient` = `referral_source_name` asc nulls first, `patient_last_name`, `first_name`, `patient_id`; `patient_last_name`; `production_desc`; `collection_desc`; `chart_no`. Group levels always sort by label |
| Page break | `page_break_options`: `none`, `group` (level `referral_type_label`) |
| Title templates | `[{"when": ["eq", "group_by", "zip_code"], "title": "Referral Production Listing (by Zip Code)"}, {"when": true, "title": "Referral Production Listing"}]` |
| Summary cards | `Referred patients` (`count` of `patient_id`), `Production`, `Collection`, `Adjs` (block totals). `reconciles_with`: `production` per source = `referral_source_production` for the same params (RPT-REF-10 test). Collection is allocation-based and does not reconcile with the metric's patient-join collection leg until 05 redefines it (Shared rules) |
| `availability[]` | `referral_current_state`, `referral_free_text_source` (app patients without a source id; applies when any listed row has `referral_source_id IS NULL` and a non-blank `source_name`), `allocation_derived`, `migrated_charges_incomplete`, `patient_id_not_legacy` (any migrated patient listed: Pat ID is the DentC id) |
| `empty_when` | `no_detail_rows` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Horizontal bar, `category_column = referral_type_label` (standard) or `referral_source_name` (top 10), `value_columns = [production, collection]`; screen only |
| Patient name / Pat ID | `kind: record`, entity `patient`, `route_key` patient overview (07), `right_code` of the patient chart feature; `phi_identified` |
| `production` cell of a patient | `kind: record`, entity `patient`, `route_key` patient account ledger with the date range copied (07 owns the route) |
| Source subtotal (zip variant) or `Referral` cell | `kind: rows`: same report, `group_by = none`, `referred_from_ids = [{"column": "referral_source_id"}]`, other params copied |
| Type subtotal | `kind: report`, `referral.referral_summary_report`, `referral_type_codes = [{"group": "referral_type_label"}]`, dates and office copied |
| Zip subtotal | `kind: rows`: same report, `zip_code_from = zip_code_to = {"group": "zip_code"}` |

### Actions

| Key | Scope | Kind | Rule |
|---|---|---|---|
| `open_patient` | row | `navigate` | Patient overview |
| `thank_source_letter` | bulk | `letters` | One letter per distinct `referral_source_id` of the selection (recipient = the source row, not the patient); owning correspondence feature (PD-15); sources without an address are counted as excluded. Right `patient_letters_generate` [I: letters to sources may need its own right in the feature] |
| `source_labels` | bulk | `labels` | Mailing labels for the distinct sources of the selection |
| `create_task` | row / bulk | `create_task` | Follow-up task per patient (for example "ask for a review") |
| `export_selection` | bulk | `export_selection` | Selected rows as XLSX / CSV (needs `reports_export_data_files`) |

Not a worklist (a period analysis).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait [I: 9 columns of the standard layout fit portrait at 8 pt], repeating column header, group bands as above, `criteria_echo = footer` with labels `From` / `Thru`, `First Visit Date From` / `Thru`, `Referral Types`, `From Zip` / `Zip` (zip layout); `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet `Referral Production` per run: flat detail rows with the group keys as columns (`office_name`, `referral_type_label`, `zip_code` in the zip variant, `referral_source_name`), typed numbers, `freeze_header`, `autofilter`; subtotals on a second sheet `Totals` (one row per group level and key); criteria sheet |
| CSV | Main block, one row per patient, group keys as columns |
| Background | Escalates to `background` when the resolved office set has more than 5 offices or the range spans more than 400 days [I: thresholds owned by 02 `escalate_when`] |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Are patients without activity in the range listed (with zeros)? | Live legacy run with a referred patient seen only before the range |
| 2 | What `#Proc` counts (every posted line, only visit codes, only ledger codes) and whether `# Visits` is visits or appointment days | Live legacy run on a known patient |
| 3 | Is Collection as of the run date or limited to payments dated up to `Thru`? | Live legacy run before and after a later payment on a charge in the range |
| 4 | Row order inside a type group | Live legacy PDF |
| 5 | Is "first visit" the first visit in the selected office or in any office? (we use `min(rpt_visits.visit_date)`, any office) | Live legacy run on a patient who moved offices |
| 6 | Does the legacy tool accept several offices or an office group here (family question 1) | Live legacy tool |
| 7 | Product: should the zip layout type subtotal also sum `# Visits` and `#Proc` (legacy prints only money)? | Product owner |
| 8 | Which columns do the zip-layout `Total for Zip code` and `Total for Referral` subtotals print (we sum all four numeric columns [I])? | Live legacy PDF, zip layout |
| 9 | Product: print the DentC patient id or the Denticon patient id in `Pat ID` for migrated patients (same choice for `Patient ID` on the case reports)? | Product owner with 03 |

## Referred Out List - `referral.referred_out_list`

Referral Reports, screenshot `2.PNG` - P3 - S - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class interactive - legacy output confidence DOCUMENTED (vendor sample 2016)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front desk, treatment coordinator | Weekly | Which patients we sent to a specialist recently; call those who have not come back |
| Office manager, owner | Month end | Volume of referrals out by specialist and specialty (relationship with specialists, in-house opportunity: what we refer out that our own providers could do) |

### Legacy output

DOCUMENTED (`[P55·img]`, 2016). Printed title `Referred Out List`. One row per patient (the report reads the single `Referred To` field of the patient record).

| # | Column | Content |
|---|---|---|
| 1 | `Chart #` | chart number |
| 2 | `Patient Name` | last, first |
| 3 | `Phones` | `(H) <home>` `(C) <cell>` `(W) <work>` in one cell |
| 4 | `Last Visit` | last visit date |
| 5 | `Ref Out On` | referred-out date (presumed the patient's `Ref. To Date` [unverified]) |
| 6 | `Ref Out Dentist` | the referred-to source |
| 7 | `Specialty` | specialty of that source |

Totals: `Total Patients Referred Out : n`. No grouping in the sample. Footer: `From` / `Thru`, `Exclude Pat Type`, `Specialty`, `Referred Out to`. Sort order not documented [I: `Ref Out On`, then patient name].

Quirk kept: referrals created per procedure (treatment plan `Refer To`, referral cases) are not on this report [unverified]; the enhancement `include_plan_item_referrals` adds them explicitly.

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = working office. Office attribution: home office of the patient (rpt_patient_dim.home_office_id), because the referred-out fact sits on the patient record (patients.referred_to / referral_to_date). Mode office lists offices, mode office_group office groups; all = every office the caller may read. |
| REFERRED OUT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referred_out_date = patients.referral_to_date (rpt_referral_facts.referral_date of the outbound_patient rows; column Ref Out On). Presumed by the research, unverified: confirm on the live tool that the range matches the patient's Ref. To Date. Patients without a date are never listed. Default today in the office time zone. |
| REFERRED OUT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referred_out_date = patients.referral_to_date (rpt_referral_facts.referral_date of the outbound_patient rows; column Ref Out On). Presumed by the research, unverified: confirm on the live tool that the range matches the patient's Ref. To Date. Patients without a date are never listed. Default today in the office time zone. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on the patient's user-defined types (rpt_patient_dim.patient_type_codes): None = exclude nothing; patients with any selected type are dropped; patients without a type are kept. Footer echo Exclude Pat Type. Dialog content not captured - confirm on the live tool. |
| REFERRAL OUT TO | (no label) (picker) | shown: ALL | `referred_to_ids` | entity_multi | - | `all` | replicated_enhanced | Filters the referred-to target of the patient record (patients.referred_to; Ref Out Dentist column). Option source referral_sources limited to direction referred-to. Migrated and app patients hold the target as free text today: matching on a source id needs the structured link (SCHEMA(40), DATA-40); until then a list matches by source name and ALL is exact. Footer echo Referred Out to. |
| SPECIALTY | (no label) (dropdown) | shown: ALL | `specialty_codes` | entity_multi | - | `all` | replicated_enhanced | Specialty of the referred-to referral source (referrals.specialty of the Ref Out Dentist; free text today), not a provider specialty. Option source: NEW referral-source variant of lookup:specialties (distinct trimmed referrals.specialty values; to be declared in 04 section 13.3), not GET /provider-specialties. Legacy single-select; list accepted (enhancement). Values not captured - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:refferal_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (`csv` added); rows unchanged |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id`: patients whose home office (`rpt_patient_dim.home_office_id`, current state) is in the set; `Office :` band per office when several |
| REFERRED OUT DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on `referred_out_date` = `patients.referral_to_date`; patients without a date are never listed |
| EXCLUDE PATIENT TYPE `None` (default) | `exclude_patient_type_codes = none`: nothing excluded |
| EXCLUDE PATIENT TYPE types picked | Patients having any picked type (`patient_type_codes` overlap) are dropped; patients without a type are kept; source row `no_type_defined` drops patients without a type |
| REFERRAL OUT TO `ALL` (default) | `referred_to_ids = all`: no predicate (exact, also for free-text targets) |
| REFERRAL OUT TO sources picked | Keep patients whose referred-to target is one of the sources: by source id after DATA-40; until then by name (target text equals the source label, case- and space-insensitive) |
| SPECIALTY `ALL` (default) | `specialty_codes = all`: no predicate |
| SPECIALTY one value | Keep patients whose referred-to source has that specialty (`referrals.specialty`, free text, compared trimmed and case-insensitive); patients whose target matches no source drop out |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | As on every report of the category (`refferal_reports.r01.d02`) |

Dependency rules: `refferal_reports.r01.d01` (office mode). Nothing greyed; no other rule.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `specialty_codes`, `referred_to_ids` as lists | `entity_multi` | `all` | Several specialties / specialists |
| `include_plan_item_referrals` | `boolean` NEW | `false` | Also list treatment-plan items with a referred-out status (`rpt_referral_facts.referral_kind = 'outbound_item'`, direction `out`): one row per item, `Ref Out On` = `presented_date` (no status-change date exists), extra column `Procedure`; a `Source` column says `Patient record` / `Treatment plan` |
| `returned_since_referral` | `enum` NEW: `any`, `returned`, `not_returned` | `any` | `not_returned`: only patients with no visit after `Ref Out On` (`last_visit_date <= referral_to_date` or NULL) - the follow-up list |
| `group_by` | `enum`: `none`, `referred_to`, `specialty` | `none` | Band per specialist or specialty with `Total Patients Referred Out for <value> : n` |
| `sort_by` | `enum`: `ref_out_date` (default), `patient_last_name`, `chart_no`, `ref_out_dentist`, `last_visit_date` | `ref_out_date` [I] | Row order |
| `include_inactive_patients` | `boolean` NEW | `true` | `false` drops inactive patients (legacy prints whatever has the field set [I]) |
| Saved view "Referred out last 30 days, not back" | saved view | - | `date_preset = last_30_days`, `returned_since_referral = not_returned` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` with `referral_kind = 'outbound_patient'` (`patient_id`, `office_id` = home office, `target_name` = `patients.referred_to` text, `referral_date` = `referral_to_date`); `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `phone`, `cell_phone`, `work_phone`, `patient_type_codes`, `is_active`); `rpt_patient_activity` (`last_visit_date`); passthrough `referrals` (`id`, `referral_type`, `practice_name`, `last_name`, `first_name`, `specialty`) for the specialist match |
| Specialist match | Until DATA-40 stores a target id: `LEFT JOIN LATERAL (SELECT ... FROM referrals WHERE tenant_id = f.tenant_id AND referral_type = '1' AND lower(btrim(coalesce(practice_name, concat_ws(', ', last_name, first_name)))) = lower(btrim(f.target_name)) ORDER BY id LIMIT 1)` - never multiplies rows. After DATA-40: NEW `patients.referred_to_source_id` (structured referred-out target, header gap, owner 03) joined on `referrals.id` |
| `Ref Out Dentist` column | `coalesce(matched source label, target_name)`: a free-text target that matches no source still prints its text |
| `Specialty` column | `referrals.specialty` of the matched row; blank when no match |
| `Last Visit` | `rpt_patient_activity.last_visit_date` (any office) |
| `Phones` | Built by the builder from the three phone columns with `(H)` / `(C)` / `(W)` prefixes, empty parts omitted |
| Date basis | `referred_out_date` fixed; office-local, inclusive |
| Office / provider attribution | `home_office`; none |
| Filters | `office_scope` -> `f.office_id IN`; dates -> `f.referral_date BETWEEN`; `exclude_patient_type_codes` -> `NOT (patient_type_codes && :list)`; `referred_to_ids` -> matched `referrals.id IN` (interim name match); `specialty_codes` -> `lower(btrim(rs.specialty)) IN` |
| Availability | Coverage matrix row 57: **APP** (`referred_to` / `referral_to_date` were not migrated; no migrated row can appear). Structured target and specialty: **SCHEMA(40)**; until then REFERRAL OUT TO and SPECIALTY filters match by name, warning `referred_out_name_match` lists how many rows matched no source |
| Migrated history | None. Referral targets: no `referrals` row with direction "referred to" was migrated (all 665 are "referred by"), so the Specialty column is blank until staff create referred-to sources |
| Current state | `referred_to` holds one target per patient: a later referral overwrites the earlier one (legacy behaviour) |

### Output

Block `main`, grain patient (`row_id_column` `patient_id`), office band when `["ctx", "multi_office"]`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `chart_no` | Chart # | text | `phi_identified` | - |
| `patient_name` | Patient Name | text | `phi_identified` | label `Total Patients Referred Out :` |
| `phones` | Phones | text | `phi_identified` | - |
| `last_visit_date` | Last Visit | date | `phi_identified` | - |
| `ref_out_date` | Ref Out On | date | `phi_identified` | - |
| `ref_out_dentist` | Ref Out Dentist | text | `phi_identified` | - (`coalesce(matched source label, target_name)`) |
| `specialty` | Specialty | text | `phi_identified` | - |
| `patient_id` | (hidden) | id | `phi_identified` | `count` -> `n` of the total line, per office band and grand |
| `procedure_code`, `row_source` | Procedure, Source | text | `phi_identified` | `visible_when` `["truthy", "include_plan_item_referrals"]` |
| `referred_to_source_id`, `patient_last_name`, `is_returned` | (hidden) | id / text / boolean | `phi_identified` | drill, sort, filter |

| Item | Rule |
|---|---|
| Totals | `Total Patients Referred Out : n` per office band and grand (`count`); with `group_by` also per group |
| Sort options | `ref_out_date` = `ref_out_date`, `patient_last_name`, `first_name`, `patient_id`; `patient_last_name`; `chart_no`; `ref_out_dentist`; `last_visit_date` |
| Page break | `none`, `group` (with `group_by`) |
| Summary cards | `Patients referred out` (count); `Not back since referral` (count where `is_returned = false`). Row-count test: `Patients referred out` = number of detail rows (RPT-REF-14); no `reconciles_with` until 05 adds `referral_kind` to `outbound_referrals` (Shared rules) |
| `availability[]` | `referred_out_app_only`, `referred_out_name_match` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar of patients by `specialty` (screen only) |
| Patient name / Chart # | `kind: record`, entity `patient`, patient overview |
| `ref_out_dentist` | `kind: record`, entity `referral_source`, Setup › Referrals › Referral Sources (`/setup/referrals/referral-sources`) with the source opened; only when `referred_to_source_id` is resolved |
| Group subtotal (`group_by = referred_to`) | `kind: rows`, same report filtered `referred_to_ids = [{"group": "referred_to_source_id"}]` |

### Actions

| Key | Scope | Kind | Rule |
|---|---|---|---|
| `open_patient` | row | `navigate` | Patient overview |
| `follow_up_task` | row / bulk | `create_task` | "Confirm specialist visit" task per patient, due in 14 days [I] |
| `patient_sms` | bulk | `send_sms` | Message to the selected patients; `requires: sms_consent`; excluded count shown (`no_auto_sms`, `no_correspondence`, `sms_opt_out_at`) |
| `patient_letter` | bulk | `letters` | Referral reminder letter (correspondence feature, PD-15) |
| `export_selection` | bulk | `export_selection` | XLSX / CSV of the selection |

Doubles as a worklist with `returned_since_referral = not_returned` (saved view above); resolution state is not stored by the report.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait, columns as listed (`Phones` wraps over up to three lines), `criteria_echo = footer` with labels `From` / `Thru`, `Exclude Pat Type`, `Specialty`, `Referred Out to` |
| XLSX | One sheet `Referred Out`; `Phones` split into three typed columns `home_phone`, `cell_phone`, `work_phone` (no multi-line cell); office as a column; criteria sheet |
| CSV | Same columns as XLSX |
| Background | Not expected (one row per referred patient) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Is REFERRED OUT DATE RANGE matched on the patient's `Ref. To Date`? | Live legacy run with a known patient |
| 2 | Content of the REFERRAL OUT TO dialog (referral sources with direction Referred To or Both? inactive?) and the SPECIALTY values (referral-source specialties or provider specialties) | Live legacy tool, open both |
| 3 | Is `Last Visit` the last visit in any office or in the selected office? | Live legacy run |
| 4 | Are referrals made with the treatment-plan `Refer To` workflow ever listed here? | Live legacy run after creating one |
| 5 | Row order | Live legacy PDF |
| 6 | EXCLUDE PATIENT TYPE dialog content (types, `no_type_defined` row, inactive types) and whether it excludes or includes (filter card open decision 1) | Live legacy tool |

## Referral Source List - `referral.referral_source_list`

Referral Reports, screenshot `3.PNG` - P3 - S - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class instant - legacy output confidence DOCUMENTED (vendor sample 2016)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, marketing coordinator | On demand, before a mailing, during setup clean-up | Print or export the master list of referral sources (referring doctors, referred-to specialists, marketing sources) with contact data and cost; find duplicates (legacy: sources are often added twice or under the wrong type) |

### Legacy output

DOCUMENTED (`[P56·img]`, 2016). Printed title `Referral Source List`. One row per source; no totals visible.

| # | Column | Content |
|---|---|---|
| 1 | `Referral By/To` | `Referred By`, `Referred To` or `BOTH` |
| 2 | `Referral Name` | source name |
| 3 | `Address` | address |
| 4 | `Phone` | phone |
| 5 | `Contact` | contact person |
| 6 | `Speciality` (sic) | specialty |
| 7 | `Referral Type` | type of the source row (setup field `Type`) |
| 8 | `Cost` | stored cost (reference only, no period) |
| 9 | `Notes` | notes |

Footer: `Referral By/To : <code>` (`99` printed for all), `Referral Type:`, `By : <user>`. Deliberate fix: the echo prints the option label (`ALL`, `Referred By`, ...) instead of the code `99`. The legacy header spelling `Speciality` is kept as the column label (identifier). Sort order not documented [I: by direction, then name].

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group - greyed out | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Enabled when: false. Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 - greyed out | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Enabled when: false. 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| REFERRED TO/BY | (no label) (dropdown) | shown: ALL | `referral_direction` | enum | - | `all` | unknown_legacy | Static dropdown captured collapsed: only the default ALL is known. Filters the source on its Referred by/To setting; the footer echoes a code (99 = all). Candidate options to confirm on the live legacy tool (labels and order): ALL -> all, Referred By -> referred_by, Referred To -> referred_to, Both -> both. Proposed until confirmed: Referred By and Referred To also select sources set to Both; Both selects only Both sources. DentC stores the direction in referrals.referral_type ('0' / '1'); 'Both' has no stored value today and the migration loaded all 665 sources as referred by (NEW three-valued direction with back-fill, owner 03, DATA-40 extension); until then Both prints the warning referral_direction_both_unavailable. |
| REFERRAL TYPE | (no label) (dropdown) | shown: ALL | `referral_type_codes` | entity_multi | - | `all` | replicated_enhanced | On Referral Source List this filters the type of the referral-source row itself (legacy setup field Type), not a patient. DentC referrals has no such column today (referrals.referral_type holds the by/to direction code '0'/'1'): NEW column referrals.source_type_code, owner 03_data_foundation.md (extension of DATA-40), back-filled for the 665 migrated sources from the legacy referral-source export by referrals.legacy_id. Until it exists only ALL returns rows and any type choice prints the availability[] warning referral_source_type_unavailable. Legacy single-select; list accepted (enhancement). Options: definitions:referral_type. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | disabled_value | true | {"office_ids": "all"} | documented - The control is display-only (enabled_when false); the run uses the catalog rule instead of the displayed office. |
<!-- PARITY:refferal_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (`csv` added); rows unchanged |
| OFFICE/GROUP `Office` / `Office Group` + picker (greyed, shows the working office) | Display only (`enabled_when` false, `disabled_value {"office_ids": "all"}`): never filters. The run applies the catalog rule of 04 section 6.5: sources pinned to an office the caller may read plus sources without an office; every source for a caller with `office_scope_view_all_offices`. Legacy sources are organisation-wide, so an office-restricted caller can see fewer sources than legacy when app-created sources carry `referrals.office_id` (open question 3) |
| REFERRED TO/BY `ALL` (default) | `referral_direction = all`: no predicate |
| REFERRED TO/BY `Referred By` [candidate label] | `referral_direction = referred_by`: sources with direction `0`, plus `both` once the NEW three-valued direction exists [I] |
| REFERRED TO/BY `Referred To` [candidate label] | `referral_direction = referred_to`: sources with direction `1`, plus `both` [I] |
| REFERRED TO/BY `Both` [candidate label] | `referral_direction = both`: sources with the NEW direction `both` only; returns no rows until it exists (warning `referral_direction_both_unavailable`) |
| REFERRAL TYPE `ALL` (default) | `referral_type_codes = all`: no predicate |
| REFERRAL TYPE one type | Sources whose NEW `referrals.source_type_code` equals the type; until the column exists no source matches (warning `referral_source_type_unavailable`) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | As on every report of the category |

Dependency rules: OFFICE/GROUP radios and picker `enabled_when: false` (shared rule, documented: greyed by design). `refferal_reports.r01.d01` applies to the displayed control only. REFERRED TO/BY is `unknown_legacy`: option labels after `ALL` and their order to be read on the live tool.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `referral_type_codes` as a list | `entity_multi` | `all` | Several types |
| `specialty_codes` | `entity_multi` (referral-source specialty variant of `lookup:specialties`) | `all` | Specialists of one specialty (mailing to all endodontists) |
| `include_inactive_sources` | `boolean` NEW (needs `referrals.is_active`, DATA-40) | `true` | `false` hides retired sources; the default prints every existing row, as the legacy list does |
| `show_usage_columns` | `boolean` NEW | `false` | Adds `Patients Referred` (all-time count of patients with this source as Referred By), `Last Referral` (latest `referral_date` of those patients), `Referred Out` (patients whose referred-to target is this source) |
| `duplicates_only` | `boolean` NEW | `false` | Only sources whose normalised name, or normalised phone, equals another source's (clean-up list) |
| `group_by` | `enum`: `none`, `direction`, `referral_type`, `specialty` | `none` | Band per value with `Total Sources : n` |
| `sort_by` | `enum`: `direction_name` (default [I]), `name`, `specialty`, `referral_type`, `cost_desc` | `direction_name` | Row order |
| Extra columns | column chooser, `default_visible = false` | - | `Email`, `NPI`, `eReferral ID`, `City`, `State`, `Zip` |

### Data

| Item | Rule |
|---|---|
| Dataset | Passthrough `referrals` (registered through DATA-45, catalog rule of 04 section 6.5): `id`, `office_id`, `referral_type` (direction `0` / `1`), `practice_name`, `first_name`, `last_name`, `address`, `city`, `state`, `zip`, `phone`, `email`, `contact_name`, `specialty`, `cost`, `notes`, `npi`, `e_referral_id`, `patient_id`; NEW `source_type_code`, three-valued direction, `is_active`, `source_category` (DATA-40 extension, owner 03) |
| `Referral Name` | `coalesce(nullif(btrim(practice_name), ''), concat_ws(', ', last_name, first_name))` |
| `Address` | `concat_ws(', ', address, city, concat_ws(' ', state, zip))` |
| `Referral By/To` | `0` -> `Referred By`, `1` -> `Referred To`, NEW both -> `BOTH` (label of definitions group `referral_direction`) |
| `Referral Type` | label of `source_type_code` through `definitions:referral_type`; blank until the column exists |
| Usage columns | `rpt_referral_facts`: `count(DISTINCT patient_id)` and `max(referral_date)` of `inbound_source` rows by `referral_source_id`; `outbound_patient` rows by the matched source (r02 rule). Pre-aggregated in a lateral per source, so rows are never multiplied |
| Duplicate test | `lower(regexp_replace(name, '[^a-z0-9]', '', 'gi'))` or the phone digits shared by two or more sources |
| Date basis | None (current state) |
| Office attribution | Catalog rule (`scope.office_mode = none`, display-only control); provider: none |
| Availability | **READY** for the default run (all sources); REFERRAL TYPE filter, `Referral Type` column and REFERRED TO/BY `Both`: **SCHEMA(NEW `source_type_code` / three-valued direction, extension of DATA-40)** - until then the filter returns no rows (warning `referral_source_type_unavailable`) and the column prints blank. Adding the columns alone leaves every migrated row blank: RPT-REF-18 back-fills Type and `Both` of the 665 migrated sources from the legacy referral-source export by `referrals.legacy_id`. Coverage matrix row 58 (`READY | —`) to be extended by 03 with this dependency. `include_inactive_sources`: DATA-40 |
| Migrated history | 665 migrated sources, all direction "referred by"; a deleted source is gone (hard delete, DATA-08 / DATA-40) |

### Output

Block `main`, grain source (`row_id_column` `referral_id`, hidden). No office band (organisation-wide catalog).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `direction_label` | Referral By/To | enum | `aggregate` | - |
| `referral_name` | Referral Name | text | `aggregate`; degraded per row (below) | label `Total Sources :` (enhancement) |
| `address` | Address | text | `aggregate`; degraded per row | - |
| `phone` | Phone | text | `aggregate`; degraded per row | - |
| `contact_name` | Contact | text | `aggregate` | - |
| `specialty` | Speciality | text | `aggregate` | - |
| `referral_type_label` | Referral Type | text | `aggregate` | - |
| `cost` | Cost | money | `financial_practice` | none (legacy shows no total) |
| `notes` | Notes | text | `phi_identified` (free text, 08 rule 4) | - |
| `referral_id` | (hidden) | id | `aggregate` | `count` (enhancement total) |
| `referred_patient_count`, `last_referral_date`, `referred_out_count` | Patients Referred, Last Referral, Referred Out | integer, date, integer | `aggregate` | `sum` of counts; `visible_when` `["truthy", "show_usage_columns"]` |

| Item | Rule |
|---|---|
| Patient sources | A row whose source names a patient (`referrals.patient_id` set or `source_category = 'patient'`) is identifying. For a caller without `phi_identified` the builder prints `referral_name` as the type label (`Existing Patient` [I]) and blanks `address`, `phone`, `contact_name` (row-level degrade, NEW masking rule requested from 08 section 5.5; header rule for r05) |
| Sort options | `direction_name` = `direction_label`, `referral_name`, `referral_id`; `name`; `specialty`; `referral_type`; `cost_desc` |
| Page break | `none`, `group` |
| Summary cards | `Sources` (count). No metric reconciliation |
| `empty_when` | `no_detail_rows` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| `referral_name` | `kind: record`, entity `referral_source`, Setup › Referrals › Referral Sources with the row opened; right of the Setup screen |
| `referred_patient_count` | `kind: report`, `referral.referral_production_list`, `referred_from_ids = [{"column": "referral_id"}]`, `include_zero_activity = true`, `date_preset = last_12_months` [I] |

### Actions

| Key | Scope | Kind | Rule |
|---|---|---|---|
| `open_source` | row | `navigate` | Referral source in Setup |
| `source_letters` | bulk | `letters` | Letter to each selected source (newsletter, thank-you); correspondence feature (PD-15) |
| `source_labels` | bulk | `labels` | Mailing labels |
| `source_email` | bulk | `send_email` | Sources with an e-mail; excluded count shown |
| `export_selection` | bulk | `export_selection` | XLSX / CSV |

With `duplicates_only` the report is the clean-up worklist for Setup (merge is a Setup feature, not a report action).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (nine text columns, `Notes` wraps), `criteria_echo = footer` with labels `Referral By/To`, `Referral Type`, `By :` |
| XLSX | One sheet `Referral Sources`, address parts as separate columns (`address`, `city`, `state`, `zip`), `cost` numeric, criteria sheet |
| CSV | Same as XLSX (mailing-list import) |
| Background | Never (`instant`) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | REFERRED TO/BY option labels and order; does `Referred By` include `Both` sources? | Live legacy tool, expand the dropdown and run each option |
| 2 | Does the printed `Referral Type` column show the source-row type (setup field `Type`) on current builds? | Live legacy run |
| 3 | Since the 2026-11 office-group associations of sources: is OFFICE/GROUP still disabled, and are associated sources filtered (family question 7)? If not, should this report use `all_offices` with `include_global` instead of the catalog rule, so an office-restricted caller sees every source as in legacy? | Live legacy tool; product owner with 04 |
| 4 | Are inactive or deleted sources printed? | Live legacy run after retiring a source |
| 5 | Product: label printed for a patient source to a caller without patient data | Product owner with 08 |
| 6 | Did the migration fold `Both` sources into `Referred By` (all 665 loaded as referred by), and does the legacy export carry Type and Referred by/To for the back-fill? | Legacy referral-source export, 03 migration notes |

## External Outgoing Referral Management - `referral.external_outgoing_referral_management`

Referral Reports, screenshot `4.PNG` (criteria possibly truncated below the third STATUSES row) - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`; whether `Utilities - Referral Management Full Control` is also required is family question 6) - cost_class interactive - legacy output confidence INFERRED (only the utility grid is documented)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Referral coordinator, front desk | Daily / weekly | Referral cases our providers sent to outside providers that are still `Pending`, `Accepted` or `In Progress`: chase the specialist or the patient before the case expires (30 days) |
| Office manager, owner | Month end | Volume and outcome of outgoing referrals by referring provider, specialist and specialty; rejected and expired share |

Inferred from the utility (research section 6): cases are created from the treatment plan `Refer To` > External tab; referred procedures get treatment-plan status `R*`; the outside office can update status in the eReferral portal.

### Legacy output

INFERRED. No sample or article. Proposed layout from the `EXTERNAL - OUTGOING` grid of Utilities › Referral Management (`[P57·img]`), presumably grouped by office [unverified]; comparables print `Total Referrals` (`[C1][C4]`).

| # | Column (grid header) | Content |
|---|---|---|
| 1 | `Referral Date` | date of the case |
| 2 | `Patient ID` | patient id |
| 3 | `Patient Name` | last, first |
| 4 | `Referred To` | external source (specialist) |
| 5 | `Referred Out Procedure Codes` | codes of the case, comma separated |
| 6 | `Referral Status` | status label |
| 7 | `Referring Provider` | our provider |

Added (criteria imply them; to confirm): `Specialty` (SPECIALTY filter), `Created By` (USERS filter, default hidden). Totals [I]: `Total Referrals : n` per office band and grand. Printed title [I]: `External Outgoing Referral Management`. The grid's x-ray, document, attachment and PDF icons are not printed.

Status vocabulary (fixed, vendor): `Pending` (default of a new case), `Accepted`, `Rejected` (with a note), `In Progress`, `Completed`, `Cancelled`, `Not Needed`, `Expired` (automatic after 30 days).

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REFERRED FROM OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `referred_from_office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | - |
| REFERRED FROM OFFICE/GROUP | (no label) (picker) | shown: 108 | `referred_from_office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Offices or office groups that created the referral case (referring office of referral_cases, NEW in DATA-40). security_scope parameter of this report (04 section 6.7). 108 = working office. |
| REFERRAL DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referral_date = Referral Date of the case (referral_cases, NEW DATA-40; rpt_referral_facts.referral_date of the case rows). Default today in the office time zone. |
| REFERRAL DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referral_date = Referral Date of the case (referral_cases, NEW DATA-40; rpt_referral_facts.referral_date of the case rows). Default today in the office time zone. |
| REFERRED FROM PROVIDER | (no label) (picker) | shown: ALL | `referred_from_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| REFERRED TO | (no label) (picker) | shown: ALL | `referred_to_ids` | entity_multi | - | `all` | replicated_enhanced | External referral source the case was sent to (Referred To of the EXTERNAL - OUTGOING grid). Option source referral_sources, direction referred-to. Inferred meaning (no vendor description of the report) - confirm on the live tool. |
| PROCEDURE CODES | (no label) (picker) | shown: ALL | `procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Matches a case when ANY of its Referred Out Procedure Codes is in the list (EXISTS on the code list of the case); ALL = no restriction. Inferred meaning - confirm on the live tool. |
| USERS | (no label) (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | User role on this report: the user who created the referral case (created_by of referral_cases, NEW DATA-40). Inferred - the research marks USERS on the referral reports as unverified; confirm on the live tool (creator versus last modifier). |
| SPECIALTY | (no label) (dropdown) | shown: ALL | `specialty_codes` | entity_multi | - | `all` | replicated_enhanced | Specialty of the referred-to external source (referrals.specialty), not a provider specialty; a case-level specialty fallback is [I] (open question 3). Option source: NEW referral-source variant of lookup:specialties (distinct trimmed referrals.specialty values; 04 section 13.3). Legacy single-select; list accepted (enhancement). Values not captured; inferred meaning - confirm on the live tool. |
| STATUSES | All (checkbox) | **checked** | `referral_statuses.all` | enum_multi | - | `true` | replicated | All box of the status grid: ticked = the scalar value all (no status restriction); never a member of the list. |
| STATUSES | Accepted (checkbox) | **unchecked** | `referral_statuses.accepted` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Rejected (checkbox) | **unchecked** | `referral_statuses.rejected` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Pending (checkbox) | **unchecked** | `referral_statuses.pending` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Cancelled (checkbox) | **unchecked** | `referral_statuses.cancelled` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Completed (checkbox) | **unchecked** | `referral_statuses.completed` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | In Progress (checkbox) | **unchecked** | `referral_statuses.in_progress` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Not Needed (checkbox) | **unchecked** | `referral_statuses.not_needed` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Expired (checkbox) | **unchecked** | `referral_statuses.expired` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. Every member binds to effective_status IN (...): effective_status = stored status, except that a pending case with office-local today - referral_date > 30 reads expired until the referral feature stores it [I] (legacy sets Expired automatically after 30 days; rule owned by DATA-40). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:refferal_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (`csv` added); rows unchanged |
| REFERRED FROM OFFICE/GROUP `Office` (default working office) / `Office Group` | `referred_from_office_ids` / `referred_from_office_group_id`: cases whose referring office (`referral_cases.from_office_id`) is in the set. Security scope of the report (`security_scope: true`): a caller sees only cases of offices they may read; band `Office : <office>` per office when several |
| REFERRAL DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on `referral_date` of the case; office-local, inclusive |
| REFERRED FROM PROVIDER `ALL` (default) / providers | `referred_from_provider_ids`: `from_provider_id IN (...)`; roster-first list, never scoped by `providers.office_id` |
| REFERRED TO `ALL` (default) / sources | `referred_to_ids`: `external_referral_id IN (...)` (referral sources, direction referred-to) |
| PROCEDURE CODES `ALL` (default) / codes | `procedure_codes`: case kept when ANY of its codes is in the list (`procedure_codes && :list`) |
| USERS `ALL` (default) / users | `user_ids`: creator of the case (`created_by`) [inferred] |
| SPECIALTY `ALL` (default) / one value | `specialty_codes`: specialty of the referred-to source (`referrals.specialty` of `external_referral_id`) matches (trimmed, case-insensitive); a fallback to the case's own specialty when the source has none is [I] (open question 3) |
| STATUSES `All` ticked (default) | `referral_statuses = "all"`: no status predicate |
| STATUSES `Accepted` / `Rejected` / `Pending` / `Cancelled` / `Completed` / `In Progress` / `Not Needed` / `Expired` ticked (All unticked) | `referral_statuses = [accepted, rejected, pending, cancelled, completed, in_progress, not_needed, expired]` subset: `effective_status IN (...)`; ticking a status clears All, ticking All clears the list (to confirm); empty grid = 422 (`min_items` 1) |
| (below STATUSES, not captured) | Unknown: possibly Exclude Deleted Referrals and GROUP BY (family question 3). Until confirmed, deleted cases are never listed (the utility default `Hide Deleted Referrals` [I]) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | As on every report of the category |

Dependency rules: `refferal_reports.r01.d01` (mode of `referred_from_office_scope`). All box versus members: exclusive states (`accepts_all`, filter card 2.5). Nothing greyed in the capture.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `referred_from_provider_ids`, `referred_to_ids`, `specialty_codes` as lists | `entity_multi` | `all` | Multi-select |
| `exclude_deleted_referrals` | `boolean` (shared dictionary) | `true` | `false` adds soft-deleted cases with `Deleted On` / `Deleted By` columns. Becomes parity if the live tool shows the checkbox |
| `days_open` | `number_range` NEW (`days_open_from`, `days_open_to`, integer) | open | Age filter: office-local today minus `referral_date`, for open statuses (`pending`, `accepted`, `in_progress`) |
| `group_by` | `enum`: `none`, `status`, `referred_to`, `referring_provider`, `specialty` | `none` | Band per value with `Total Referrals for <value> : n` (if the hidden legacy GROUP BY exists, its options are merged here) |
| `sort_by` | `enum`: `referral_date` (default [I]), `patient_last_name`, `status`, `referred_to`, `days_open_desc` | `referral_date` | Row order |
| `show_status_summary` | `boolean` NEW | `false` (PDF / XLSX); the screen always shows the block | `true` prints block `status_summary` at report end (count per status) on PDF and XLSX. Becomes the parity default only if the live legacy run shows such a block (RPT-REF-08) |
| Saved view "Open outgoing referrals" | saved view | - | `referral_statuses = [pending, accepted, in_progress]`, `date_preset = last_90_days` |
| Saved view "About to expire" | saved view | - | `referral_statuses = [pending]`, `days_open_from = 21` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` case rows (`rpt_referral_facts.referral_kind = 'case' AND direction = 'out'`, `case_id`; the case-level direction vocabulary of `referral_cases` (`external_out`, `external_in`, `internal`) is NEW, owner 03, DATA-40); case-only columns read from `referral_cases` through `case_id` (`from_office_id`, `from_provider_id`, `external_referral_id`, `procedure_codes`, `specialty`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `treatment_plan_item_id`); `rpt_patient_dim` (`chart_no`, names); `rpt_provider_dim` (`provider_name`, `short_id`); passthrough `referrals` (source label, `specialty`); `rpt_user_dim` (`user_label`, key `'u:' || created_by`); `rpt_office_dim` |
| Effective status | `effective_status` = stored `status`, except `pending` older than 30 days (office-local today - `referral_date` > 30) reads `expired` until the application job stores it [I]; rule to be fixed by DATA-40 (owner 03) |
| Date basis | `referral_date` fixed; today = office-local date of the working office in the security scope |
| Office attribution | Referring office (`from_office_id`) |
| Provider attribution | `referring` (`from_provider_id`) |
| Filters | As in the parity table; `exclude_deleted_referrals = false` reads deleted rows from `referral_cases` (the facts view drops them) |
| Availability | Coverage matrix row 59: **SCHEMA(40)**: no `referral_cases` table and no Refer To writer exist; the report returns no rows until DATA-40 ships and the treatment-plan Refer To flow writes cases (the Referral Management utility in DentC is a simulation, `backend: pending`). Treatment-plan items with status `referred_out` / `external_referral` (`outbound_item`) carry no case status and are not listed; whether they are back-filled into cases is an open question |
| Migrated history | None: legacy referral cases were not migrated |

### Output

Block `main`, grain referral case (`row_id_column` `case_id`, hidden); office band when `["ctx", "multi_office"]`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `referral_date` | Referral Date | date | `phi_identified` | - |
| `patient_id` | Patient ID | id | `phi_identified` | - |
| `patient_name` | Patient Name | text | `phi_identified` | label `Total Referrals :` |
| `referred_to_name` | Referred To | text | `phi_identified` | - |
| `procedure_codes_text` | Referred Out Procedure Codes | text | `phi_identified` | - |
| `referral_status` | Referral Status | enum (labels of the vocabulary) | `phi_identified` | - |
| `referring_provider` | Referring Provider | text | `aggregate` | - |
| `specialty` | Specialty | text | `phi_identified` | - |
| `created_by_label` | Created By | text | `aggregate` (08 rule 12) | `default_visible = false` |
| `days_open` | Days Open | integer | `phi_identified` | `default_visible = false`; blank for closed statuses |
| `deleted_at`, `deleted_by_label` | Deleted On, Deleted By | date, text | `user_activity` | `visible_when` `["falsy", "exclude_deleted_referrals"]` |
| `case_id` | (hidden) | id | `phi_identified` | `count` -> `Total Referrals : n` per band and grand |
| `referred_to_source_id`, `from_provider_id`, `treatment_plan_item_id`, `patient_last_name` | (hidden) | id / text | `phi_identified` / `aggregate` | drill and sort |

Block `status_summary` (`placement: report_end`; on screen always, on PDF / XLSX `visible_when` `["truthy", "show_status_summary"]`): `referral_status` (`aggregate`) · `case_count` (integer, `aggregate`, `sum`) · `pct_of_cases` (percent, `share_of_parent`). Every vocabulary value printed, zero rows included.

| Item | Rule |
|---|---|
| Sort options | `referral_date` = `referral_date`, `patient_last_name`, `case_id`; `patient_last_name`; `status`; `referred_to`; `days_open_desc` |
| Page break | `none`, `group`, `office` |
| Summary cards | `Referrals` (count), `Open` (pending + accepted + in progress), `Expired` (from `status_summary`). Row-count test: `Referrals` = number of detail rows; no `reconciles_with` until 05 adds `referral_kind` to `outbound_referrals` (Shared rules) |
| `availability[]` | `referral_cases_not_available` (until DATA-40), `referral_expired_derived` (while the expiry is derived) |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar of cases by `referral_status` per month of `referral_date` (screen only); ageing bar of open cases by `days_open` bucket (0-7, 8-14, 15-30, over 30) |
| Patient ID / Name | `kind: record`, entity `patient`, patient overview |
| Row | `kind: record`, entity `referral_case`, Referral Management utility `EXTERNAL - OUTGOING` tab with the case opened (`/utilities/batch-claims/referral-management`; NEW record route owned by the feature that ships `referral_cases`) |
| Procedure codes | `kind: record`, entity `treatment_plan_item`, the patient's treatment plan at `treatment_plan_item_id` |
| `status_summary` count | `kind: rows`, same report, `referral_statuses = [{"group": "referral_status"}]` |
| `Referred To` | `kind: record`, entity `referral_source`, Setup › Referrals › Referral Sources |

### Actions

| Key | Scope | Kind | Rule |
|---|---|---|---|
| `open_case` | row | `navigate` | Referral case in the utility (needs `Utilities - Referral Management` feature right, owned there) |
| `follow_up_task` | row / bulk | `create_task` | "Call specialist / patient" task, assigned to the case creator by default |
| `patient_sms` | bulk | `send_sms` | Reminder to book with the specialist; `requires: sms_consent`, exclusions counted |
| `specialist_email` | bulk | `custom:referral_resend` | Re-send the referral to the referred-to source (eReferral / e-mail); handler of the referral feature, NEW |
| `export_selection` | bulk | `export_selection` | XLSX / CSV |

Doubles as a worklist (saved view "Open outgoing referrals"); a status change is done in the case screen, never by the report. Interactive status update and case funnel: family enhancement, P4.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (procedure code lists), office band, `status_summary` block at the end only with `show_status_summary = true`, `criteria_echo = footer` (labels as the legacy sections: `Referred From Office`, `From` / `Thru`, `Referred From Provider`, `Referred To`, `Procedure Codes`, `Users`, `Specialty`, `Statuses` [I: legacy echo labels unknown]) |
| XLSX | Sheet `Outgoing Referrals` (one row per case, `procedure_codes_text` as one text cell, status as label, office as a column); sheet `Status Summary` only with `show_status_summary = true`; criteria sheet |
| CSV | Main block only |
| Background | Not expected |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Printed columns, grouping, totals and title of the report (no sample exists, family question 4) | Live legacy run, PDF and Excel |
| 2 | What follows the third STATUSES row (Exclude Deleted Referrals? GROUP BY and its options?) | Live legacy tool, scroll the criteria panel |
| 3 | USERS = creator or last modifier; REFERRED TO dialog content (sources with direction Referred To / Both, inactive?); SPECIALTY = specialty of the source or of the case | Live legacy tool |
| 4 | Is `Expired` stored by a job or computed, and does it apply only to `Pending` cases? | Live legacy tool, a case older than 30 days |
| 5 | Does the report need `Utilities - Referral Management Full Control` in addition to the report right (family question 6)? | Live legacy tool with a View Only group |
| 6 | Product: back-fill existing treatment-plan items with status `referred_out` / `external_referral` into `referral_cases` (status `pending` or a NEW `unknown`) so the report has history at go-live? | Product owner with 03 |

## Referral Summary Report - `referral.referral_summary_report`

Referral Reports, screenshot `5.PNG` - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class interactive (escalates to background, see Data) - legacy output confidence DOCUMENTED (sample 2023; `#Ref` and `Referral #` meaning INFERRED) - availability READY for Production / Collection; `#Ref`, `Referral #` and `Avg Production` REPAIR(19) (first-visit fallback) or SCHEMA(40) (`patients.referral_date`)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Owner, office manager, marketing lead | Month end, quarter end, before a marketing budget review | Which referral types and sources bring patients and how much those patients produce and pay; where to thank, invest or stop spending |
| Office manager of a multi-office organisation | On demand, per office | Compare sources between offices (one `Office :` band per office) |
| Front desk lead | Monthly | Size of the `No Referral` bucket: patients registered with a type but without a source (data-entry quality) |

Vendor positioning: a marketing view, not an accounting report (research section 6, [P52]); figures are current-state
(shared rule "History limit").

### Legacy output

Printed title `Referral Summary` (internal report name `ReferralRefSumm`, positional arguments PGID; OID; `false`; start
date; end date; `ALL`). DOCUMENTED from the 2023 sample [P52·img].

| Element | Legacy content | Confidence |
|---|---|---|
| Header | Organisation name, `Referral Summary`, `Office : <office name>` (underlined) | DOCUMENTED |
| Group levels | `Office : <office>` -> `Referral Type : <type>` | DOCUMENTED |
| Columns, in order | `Referral` · `#Ref` · `Production` · `Collection` · `Avg Production` · `Referral #` (two-row header over `MTD` · `YTD` · `Last Year`) | DOCUMENTED |
| Rows | One per referral source inside its type; `No Referral` collects patients that have the type but no `Referred By` source | DOCUMENTED |
| Subtotals | `Total :` per referral type for `#Ref`, `Production`, `Collection`, `Avg Production`; nothing under the three `Referral #` columns | DOCUMENTED |
| Grand total | None printed | DOCUMENTED |
| Footer | Criteria echo (`From` / `Thru`, `Referral Types`), title, `Printed : <date time>`, copyright, `Page : n of m` | INFERRED (family pattern; r06 sample) |
| Meaning of `#Ref` | Patients of the source referred in the period (a source with `#Ref` 0 still shows production: patients referred earlier) | INFERRED from the arithmetic |
| Meaning of `MTD` / `YTD` / `Last Year` | Referral counts of the source for the month and year to date and the previous calendar year | INFERRED (anchor date not documented) |
| Meaning of the third positional argument `false` | Unknown | not documented |

Arithmetic and quirks:

| Legacy behaviour | Our behaviour |
|---|---|
| `Avg Production` = `Production` / `#Ref`; equals `Production` when `#Ref` = 0 | Kept for `#Ref` > 0; empty cell when `#Ref` = 0 by default; layout option `avg_production_zero_ref = legacy` reproduces the legacy value (family open question 9) |
| Type average = type production / type `#Ref` | Kept (`ratio` total, computed from unrounded sums) |
| One `Collection` total equals the signed net of rows printed unsigned [conflict] | Fixed: collection positive on rows and totals, total = sum of rows |
| Sources with `#Ref` 0 but production in the range are listed | Kept |
| No grand total | Kept: `show_grand_total` (layout, default `false`) adds a `Grand Total :` row after the last type when set |
| No totals under `Referral #` | Kept (`total: none`); the XLSX sheet carries the row values only |
| With only the mandatory patient `Referral Type` filled, the report shows types only | Kept: such patients print under the source row `No Referral` |

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this report: home office of the patient (scope.office_attribution = home_office: rpt_referral_facts.office_id of the inbound_source rows = rpt_patient_dim.home_office_id, current state). Named exception NEW scope.money_leg_office_filter (owner 03 section 5.1 / 02): production is restricted to charges with rpt_charges.office_id in the resolved set and Collection to allocations to those charges (rpt_payment_allocations.allocation_office_id in the set); #Ref and the Referral # columns count only the patients of the set. This reproduces the legacy rule 'data limited to the office the report is run in, for patients currently in that office, no cross-office data' when one office is selected. With several offices or an office group the result is the union; whether the legacy tool allowed that at all is an open question. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PROCEDURE DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = service_date: Production counts charges of the referred patients with rpt_charges.service_date in the range; Collection = payments allocated to those charges (PD-3 definition; allocation via rpt_payment_allocations, data card 2.13, PD-7). The same range bounds #Ref: patients of the source whose referral_date (NEW patients.referral_date, else first_visit_date) lies in the range [I]. MTD / YTD / Last Year are anchored on date_to and not bounded by date_from [I]. Default today in the office time zone. |
| PROCEDURE DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = service_date: Production counts charges of the referred patients with rpt_charges.service_date in the range; Collection = payments allocated to those charges (PD-3 definition; allocation via rpt_payment_allocations, data card 2.13, PD-7). The same range bounds #Ref: patients of the source whose referral_date (NEW patients.referral_date, else first_visit_date) lies in the range [I]. MTD / YTD / Last Year are anchored on date_to and not bounded by date_from [I]. Default today in the office time zone. |
| REFERRAL TYPE | (no label) (dropdown) | shown: ALL | `referral_type_codes` | entity_multi | - | `all` | replicated_enhanced | Filters the patient's own referral type (patients.referral_type), NOT the type stored on the referral-source row. Predicate on NEW rpt_referral_facts.referral_type_code of the inbound_source row: canonical value of patients.referral_type through rpt_value_map domain referral_type (migrated REFTYPE codes and app labels fold to one value; owner 03_data_foundation.md, DATA-40); the printed label stays source_type_label. A patient with a type and no Referred By source is kept and prints under the source row 'No Referral'. Legacy single-select (one type or ALL); the parameter accepts a list (enhancement). Options: the canonical values of rpt_value_map domain referral_type with their definitions:referral_type labels (option-source variant requested from 04 section 13.3). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:refferal_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Run, preview on screen, PDF rendered from the snapshot (`output_format = pdf`, `role: output`); rows unchanged |
| PRINT FORMAT `Excel` | Same snapshot rendered as a flat typed XLSX sheet (`xlsx`); `csv` added. Rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` (working office) | `office_ids = [working office]`: patients whose current `rpt_patient_dim.home_office_id` is in the set; production limited to charges with `rpt_charges.office_id` in the set; collection limited to allocations to those charges (`allocation_office_id` in the set); `#Ref` and `Referral #` count only those patients. One office: the page header prints `Office : <office name>` |
| OFFICE/GROUP `Office` with several offices / `all` | Union of the offices (`all` = every office the caller may read); one `Office :` band per home office with its own type subtotals (`fixed_outer` office, `["ctx", "multi_office"]`); money of a patient in office A served in office B is counted in neither band unless B is also selected (legacy "no cross-office data") |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office as above |
| PROCEDURE DATE RANGE Start Date / End Date (default `today` / `today`) | `date_from` / `date_to`, inclusive, office-local. Bounds (a) production: `rpt_charges.service_date`; (b) collection: allocations to those charges; (c) `#Ref`: `rpt_referral_facts.referral_date` of the patient. Does not bound `MTD` / `YTD` / `Last Year`, which are anchored on `date_to` (Data) |
| REFERRAL TYPE `ALL` (default) | No predicate: every type with at least one row prints, ordered by type label |
| REFERRAL TYPE one type | `referral_type_codes = [code]`: only patients whose own referral type (`source_type_label` of the `inbound_source` row) is that type; one `Referral Type :` group. A list of types is an enhancement (family) |

Dependency rules: `refferal_reports.r01.d01` (Office / Office Group mode decides the value key; switching resets the
selection to `working_office` / `all`) and `refferal_reports.r01.d02` (ADD TO MY FAVORITES / UPDATE MY FAVORITES). No
control is greyed, none shows or hides another. Footer actions: CLEAR CRITERIA -> defaults (frontend), PRINT / PREVIEW ->
`print`, ADD TO MY FAVORITES -> `saved_view`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `referred_from_ids` | `entity_multi` (`lookup:referral_sources`, direction referred-by, `max_items` 500) | `all` | Restrict to chosen sources (for example the ten doctors on a thank-you list). `all` keeps `No Referral` |
| `source_categories` | `enum_multi` NEW (owner 04): `doctor`, `patient`, `other`, `none`; `accepts_all` | `all` | Filter on `rpt_referral_facts.source_category` (`none` = `No Referral` bucket). Inferred until DATA-40 stores `referrals.source_category` (run warning) |
| `first_visit_date_from` / `first_visit_date_to` | `date_range` (key of r01) | empty | New-patient cohort: only patients whose `first_visit_date` falls in the range (Open Dental "new patients only" equivalent). Needs DATA-19 |
| `report_format` | `enum`: `summary` (default, legacy), `patient_detail` (NEW) | `summary` | `patient_detail` lists the patients behind each source row with the same figures; it is the `rows` drill target, so every source number reconciles to a list |
| `compare_to` | FLT-26 (`none`, `previous_period`, `previous_year`, `custom`) | `none` | Adds `ref_count_compare`, `production_compare`, `production_change_pct` per source and type (P4) |
| `sort_by` | `enum`: `referral_name` (default), `production_desc`, `ref_count_desc`, `avg_production_desc` | `referral_name` | Row order inside the type group |
| `show_grand_total` | `boolean` NEW (`role: layout`, family) | `false` | Adds `Grand Total :` after the last type |
| `avg_production_zero_ref` | `enum` NEW (`role: layout`): `empty`, `legacy` | `empty` | `legacy` prints `Production` in `Avg Production` when `#Ref` = 0, as the vendor sample |
| Saved view "Last month by source - my offices" | saved view | - | `date_preset = last_month`, `office_ids = @my_offices` |
| Saved view "Doctor referrals, year to date" | saved view | - | `date_preset = year_to_date`, `source_categories = [doctor]`, `sort_by = production_desc` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`referral_kind = 'inbound_source'`: `patient_id`, `office_id` = home office, `referral_source_id`, `source_name`, `source_type_label`, `source_category`, `referral_date`); `rpt_patient_dim` (`home_office_id`, `referral_type_raw`, `referred_by_raw`, `first_visit_date`); `rpt_charges` (`patient_id`, `office_id`, `service_date`, `charged_fee`, `is_production`, live rows); `rpt_payment_allocations` (`debit_entry_id`, `debit_patient_id`, `credit_ledger_bucket`, `allocation_office_id`, `allocation_target`, `amount`); `rpt_office_dim` (`office_name`, `local_today`) |
| Grain | Office (home) x referral type x referral source. Source key = `referral_source_id`, else `name:<lower(btrim(source_name))>` for free text, else `none` (`No Referral`) |
| `#Ref` (`ref_count`) | Distinct patients of the source with `referral_date` between `date_from` and `date_to` [I]. `referral_date` = NEW `patients.referral_date` (DATA-40), else `first_visit_date` (DATA-19) |
| Production | `Σ rpt_charges.charged_fee` (posted fee, PD-1; `is_production`) of the source's patients, `service_date` in range, `office_id` in the office set |
| Collection | `Σ rpt_payment_allocations.amount` where `credit_ledger_bucket = 'collection'`, `allocation_target = 'production'`, `debit_entry_id` is one of the charges above (so `allocation_office_id` is in the office set); refunds reverse their allocations inside the function, so the figure is net of refunds (PD-3). Positive. Derived allocations print "allocation derived (oldest first)" |
| `Avg Production` | `ratio(production, ref_count)`, zero-denominator guard |
| `MTD` / `YTD` / `Last Year` | Distinct patients of the source with `referral_date` in: first of the month of `date_to` .. `date_to`; 1 January of the year of `date_to` .. `date_to`; the whole previous calendar year of `date_to` [I, anchor to confirm] |
| Row presence | A source row prints when any of `ref_count`, production, collection, `MTD`, `YTD`, `Last Year` is non-zero [I] |
| Office attribution | `home_office` (patient's current home office) for the patient set and the band; money legs additionally restricted to the office set (shared rules) |
| Provider attribution | None |
| Parameter -> query | `office_scope` -> `rpt_referral_facts.office_id IN :offices` plus the two money-leg office predicates; `date_range` -> the three predicates of the PROCEDURE DATE RANGE row; `referral_type_codes` -> NEW `rpt_referral_facts.referral_type_code IN` (canonical value through `rpt_value_map` domain `referral_type`, owner 03 DATA-40); `referred_from_ids` -> `referral_source_id IN`; `source_categories` -> `source_category IN`; `first_visit_date_*` -> `first_visit_date BETWEEN` |
| Availability | **READY** for Production / Collection as Referral Production List - migrated patients link to their source by legacy id; app patients hold free-text `referred_by` and match a source only by name until SCHEMA(40) (`patients.referral_source_id`). `#Ref`, `MTD` / `YTD` / `Last Year` and therefore `Avg Production` need a referral date: NEW `patients.referral_date` (**SCHEMA(40)**), else `first_visit_date` (**REPAIR(19)**); before either ships these columns are 0 / empty for every patient, and the run prints the warning `referral_date_unavailable` when both dates are NULL for a counted patient. Coverage matrix row 60 (`as 56`) to be extended by 03 with this dependency. First-visit enhancement REPAIR(19) |
| Migrated history | Current state only: a patient whose home office, type or source changed counts under the current values (warning `referral_current_state`). Migrated patients have no stored referral date: `#Ref` and the `Referral #` columns use their first visit date, so a patient referred long before the first visit is counted at the visit (warning `referral_date_from_first_visit`). Migrated charges are incomplete (DATA-57 caveat, printed on every financial run touching migrated periods) |
| Cost | `interactive`; `escalate_when` (server only): range over 366 days or more than 10 offices in the resolved set -> `background` (allocation join over many accounts) |
| Reconciliation | `reconciles_with`: block `main`, column `production` -> `referral_source_production` per source. Collection is not reconciled: the metric's collection leg is a patient join on payments; it reconciles only once 05 redefines that leg on the allocation join (open question 5) |

### Output

Format `summary` (legacy), block `main`, shape `table`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | `text` | `aggregate` | band label `Office : {office_name}` (fixed outer level, multi-office only) |
| `source_type_label` | Referral Type | `text` | `aggregate` | group header `Referral Type : {source_type_label}`, subtotal label `Total :` |
| `referral_source_label` | Referral | `text` | `phi_identified` (dimension label, rule 13 `deny` for patient / free-text sources; a caller without the class receives `source_type_label`) | `label` |
| `ref_count` | #Ref | `integer` | `aggregate` | `sum` per type, office, grand total |
| `production` | Production | `money` | `financial_practice` | `sum` |
| `collection` | Collection | `money` | `financial_practice` | `sum` |
| `avg_production` | Avg Production | `money` | `financial_practice` | `ratio(production, ref_count)` at every level; `null_display` empty |
| `ref_count_mtd` | MTD (header group `Referral #`) | `integer` | `aggregate` | `none` (legacy) |
| `ref_count_ytd` | YTD | `integer` | `aggregate` | `none` |
| `ref_count_last_year` | Last Year | `integer` | `aggregate` | `none` |
| `patient_share_pct` | % Patients | `percent` | `aggregate` | `share_of_parent(ref_count)`; default hidden (family enhancement) |
| `production_share_pct` | % Production | `percent` | `financial_practice` | `share_of_parent(production)`; default hidden |
| `ref_count_compare`, `production_compare`, `production_change_pct` | #Ref (compare), Production (compare), Change % | `integer`, `money`, `percent` | `aggregate`, `financial_practice`, `financial_practice` | `sum`, `sum`, `ratio`; `visible_when ["ne", "compare_to", "none"]` (P4) |
| hidden: `office_id`, `referral_type_code`, `referral_source_key`, `referral_source_id`, `source_category`, `row_id` | | `id` / `text` | `aggregate` (`referral_source_key` `phi_identified`) | - |

Format `patient_detail` (NEW), block `patients`: `office_name`, `source_type_label`, `referral_source_label`, `chart_no`
(Chart #), `patient_id` (Pat ID), `patient_name` (Patient Name), `referral_date` (Referral Date), `is_ref_in_range`
(Counted in #Ref, boolean), `production`, `collection`; patient columns `phi_identified`, money `financial_patient`;
subtotals per source and type equal the summary row (`sum`; `count` of `is_ref_in_range` true = `#Ref`).

| Topic | Rule |
|---|---|
| Group levels | Office (fixed outer, multi-office) -> Referral Type; `grand_total {enabled_when: ["truthy", "show_grand_total"], label: "Grand Total :"}` (default off, legacy prints none) |
| Sort | Types by `source_type_label`; sources by `sort_by` (default `referral_source_label` asc, `No Referral` last), tie-breaker `row_id` |
| Page break | `page_break_by` (layout, enhancement): `none` (default), `office`, `group` (new page per referral type) |
| Summary cards | `Referred patients` (`ref_count` block total), `Production`, `Collection`, `Avg production per referral` (block-total `avg_production`); computed as block totals whether or not `show_grand_total` prints the row |
| Empty run | `empty_when {block: main, test: no_detail_rows}` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Horizontal bars, top 15 sources by `production` with `ref_count` as a second series (`charts[]` hint, `top_n` 15); screen only |
| `#Ref`, `Production`, `Collection` cell of a source row or a type subtotal | `rows`: this report, `report_format = patient_detail`, filtered to the group (`referral_source_key`, `referral_type_code`, office); the list total equals the clicked number |
| `Referral` label of a source row | `report` `referral.referral_production_list` with `office_scope`, `date_from`, `date_to` copied, `referral_type_codes = [group type]` and the source passed as `referred_from_ids` (hidden drill parameter requested from the r01 author) |
| `MTD` / `YTD` / `Last Year` cell | `rows` (`patient_detail`) with the anchored range of that column |
| Patient name (detail block) | `record` patient -> `/patient/:id/overview` (needs `phi_identified` and the chart right; `assert_patient_visible`) |

### Actions

| Action | Scope / kind | Notes |
|---|---|---|
| Thank-you letter / labels to the listed sources | bulk `letters`, `labels` | Hand-off to Letters with the source ids (PD-15, family enhancement P3); `No Referral` and free-text rows are excluded and counted |
| Open referral source | row `navigate` | Setup › Referrals edit screen of `referral_source_id` |
| Export selection | bulk `export_selection` | Full Control + `reports_export_data_files` |
| Worklist | no | A periodic summary |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait, letter; header: organisation name, `Referral Summary`, `Office : <office name>` (single office) or office bands; two-row column header with `Referral #` spanning `MTD` / `YTD` / `Last Year`; `criteria_echo = footer` with `From` / `Thru`, `Referral Types`, then `Printed : <date time>`, `By : <user>`, `Page : n of m`; run warnings in the criteria block |
| XLSX | Sheet `Referral Summary`: one row per source with `office_name` and `source_type_label` repeated on every row, a `row_type` column (`detail`, `subtotal`, `grand_total`), flat labels `Referral # MTD`, `Referral # YTD`, `Referral # Last Year`; frozen header, autofilter, outline per type; no merged cells; criteria sheet. `patient_detail` = its own sheet |
| CSV | Main block of the chosen format, UTF-8 BOM, injection guard |
| Background | Escalated runs (Data) deliver the same snapshot to screen, PDF and XLSX |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Is `#Ref` the count of patients whose referral (or first visit) date falls in the range? Which date does the legacy use for patients without a referral date? | live legacy run against known patients |
| 2 | Anchor of `MTD` / `YTD` / `Last Year`: End Date of the range or the run date? Is `Last Year` the previous calendar year or the 12 months before? | live run with an End Date in an earlier month |
| 3 | Meaning of the positional argument `false` in `ReferralRefSumm` (a hidden option such as "include inactive patients"?) | live tool, report viewer URL with other criteria |
| 4 | Do sources whose every figure is zero print? Order of sources (alphabetical, `No Referral` last)? | live run |
| 5 | Product: 05 must define the collection leg of `referral_source_production` on the allocation join (service basis); otherwise only production is reconciled | 05_metric_catalog.md |
| 6 | Does the legacy run accept several offices or an office group (family open question 1)? | live tool |
| 7 | Footer echo labels of this report (`From` / `Thru`, `Referral Types` borrowed from the r06 / r01 samples) | live legacy PDF |

## Referral Count Summary - `referral.referral_count_summary`

Referral Reports, screenshot `6.PNG` - P3 - S - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class interactive - legacy output confidence DOCUMENTED (sample 2016; definition of "seen" INFERRED)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Owner, marketing lead | Monthly, quarterly | How many referred patients each source keeps feeding into the chairs (volume, not money) |
| Office manager | Monthly | Share of seen patients without a recorded source (`No Referred By`): front-desk data-entry quality |
| Specialist office | On demand | Which referring doctors send patients who actually arrive |

### Legacy output

Printed title `Referral Count Summary` [P53·img], DOCUMENTED from the 2016 sample.

| Element | Legacy content | Confidence |
|---|---|---|
| Header | Organisation name, `Referral Count Summary`; no `Office :` line in the 2016 sample | DOCUMENTED |
| Group level | `Referral Type : <type>` | DOCUMENTED |
| Columns | `Referral` · `# Referred Pats Seen` | DOCUMENTED |
| Rows | One per referral source; `No Referred By` for patients of the type without a source (the same bucket is called `No Referral` on Referral Summary; both labels kept per report) | DOCUMENTED |
| Subtotal | `Total :` per referral type | DOCUMENTED |
| Grand total | None visible | DOCUMENTED |
| Footer | `From` / `Thru`, `Referral Types`, printed date, page | DOCUMENTED |
| "Seen" | A referred patient with at least one posted procedure in the range (presumed) | INFERRED |

Quirks: none known beyond the label difference. Deliberate additions: an optional `Grand Total :` row (`show_grand_total`, default `false`) and, for
several offices, the `Office :` band of the family rule (the 2016 sample predates the office line).

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this report: home office of the patient (scope.office_attribution = home_office: rpt_referral_facts.office_id of the inbound_source rows = rpt_patient_dim.home_office_id, current state). Named exception NEW scope.money_leg_office_filter (owner 03 section 5.1 / 02): the qualifying visit must be in an office of the resolved set (rpt_visits.office_id under the default count_basis = visit). No money legs on this report. This reproduces the legacy rule 'data limited to the office the report is run in, for patients currently in that office, no cross-office data' when one office is selected. With several offices or an office group the result is the union; whether the legacy tool allowed that at all is an open question. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PROCEDURE DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = service_date. On this report the range defines 'seen': a referred patient is counted once per referral source when at least one rpt_visits row (patient-office-day with a live visit-code production charge, data card 2.17, the one definition of legacy 'Patients Seen') has visit_date in the range and an office of the set (default count_basis = visit). A contract instalment, a broken-appointment fee or another non-visit charge alone does not count. Presumed - vendor text says only 'referred patients seen in the period'; confirm on the live legacy tool whether a kept appointment without a posted procedure also counts. Default today in the office time zone. |
| PROCEDURE DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = service_date. On this report the range defines 'seen': a referred patient is counted once per referral source when at least one rpt_visits row (patient-office-day with a live visit-code production charge, data card 2.17, the one definition of legacy 'Patients Seen') has visit_date in the range and an office of the set (default count_basis = visit). A contract instalment, a broken-appointment fee or another non-visit charge alone does not count. Presumed - vendor text says only 'referred patients seen in the period'; confirm on the live legacy tool whether a kept appointment without a posted procedure also counts. Default today in the office time zone. |
| REFERRAL TYPE | (no label) (dropdown) | shown: ALL | `referral_type_codes` | entity_multi | - | `all` | replicated_enhanced | Filters the patient's own referral type (patients.referral_type), NOT the type stored on the referral-source row. Predicate on NEW rpt_referral_facts.referral_type_code of the inbound_source row: canonical value of patients.referral_type through rpt_value_map domain referral_type (migrated REFTYPE codes and app labels fold to one value; owner 03_data_foundation.md, DATA-40); the printed label stays source_type_label. A patient with a type and no Referred By source is kept and prints under the source row 'No Referred By'. Legacy single-select (one type or ALL); the parameter accepts a list (enhancement). Options: the canonical values of rpt_value_map domain referral_type with their definitions:referral_type labels (option-source variant requested from 04 section 13.3). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:refferal_reports.r06:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | PDF from the snapshot (`output_format = pdf`); rows unchanged |
| PRINT FORMAT `Excel` | Flat XLSX (`xlsx`); `csv` added; rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` (working office) | Patients whose current `home_office_id` is in the set and whose qualifying visit was in an office of the set (`rpt_visits.office_id`; `scope.money_leg_office_filter`) |
| OFFICE/GROUP `Office` several offices / `all` | Union; one `Office :` band per home office with its own type subtotals |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office |
| PROCEDURE DATE RANGE Start Date / End Date (default `today` / `today`) | `date_from` / `date_to`, inclusive, office-local: a patient counts when at least one `rpt_visits` row (patient-office-day with a live visit-code production charge) has `visit_date` in the range (the "seen" rule, presumed; data card 2.17 maps legacy `Patients Seen` to it). A contract instalment, a broken-appointment fee or another non-visit charge alone does not count. Each patient counts once per source in the range, however many days they came |
| REFERRAL TYPE `ALL` (default) | No predicate; every type with a non-zero count prints |
| REFERRAL TYPE one type | `referral_type_codes = [code]`: patients of that type only; one group |

Dependency rules: `refferal_reports.r01.d01`, `refferal_reports.r01.d02`; nothing greyed; no show / hide rule. Footer
actions as on every report of the family.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `count_basis` | `enum` NEW (owner 04): `visit` (default, parity rule: a `rpt_visits` day with a visit code), `posted_procedure` (enhancement: any live `rpt_charges` row with `is_production AND NOT is_contract_billing`), `kept_appointment` (`rpt_appointment_facts.is_kept`) | `visit` | Lets the office match the legacy reading once the live tool confirms what "seen" is, and count hygiene-only arrivals or kept appointments without a posted code |
| `first_visit_date_from` / `first_visit_date_to` | `date_range` (key of r01) | empty | Count only new patients (first visit in the range); with the default range this answers "new referred patients this month". Needs DATA-19 |
| `referred_from_ids` | `entity_multi` (`lookup:referral_sources`, referred-by) | `all` | Restrict to sources |
| `source_categories` | `enum_multi` NEW: `doctor`, `patient`, `other`, `none`; `accepts_all` | `all` | As on Referral Summary |
| `report_format` | `enum`: `summary` (default, legacy), `patient_detail` (NEW) | `summary` | Lists the counted patients; `rows` drill target |
| `compare_to` | FLT-26 | `none` | Adds `seen_count_compare` and `seen_change_pct` (P4) |
| `show_grand_total` | `boolean` NEW (`role: layout`, family) | `false` | Adds `Grand Total :` after the last type |
| Saved view "Referred patients seen this month - my offices" | saved view | - | `date_preset = month_to_date`, `office_ids = @my_offices` |
| Saved view "New referred patients, last quarter" | saved view | - | `date_preset = last_quarter`, `first_visit_date_*` = same range |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`inbound_source`: `patient_id`, `office_id`, `referral_source_id`, `source_name`, `source_type_label`, `source_category`); `rpt_visits` (`patient_id`, `office_id`, `visit_date`; default basis); with `count_basis = posted_procedure` `rpt_charges` (`patient_id`, `office_id`, `service_date`, `is_production`, `is_contract_billing`, live rows); with `kept_appointment` `rpt_appointment_facts` (`patient_id`, `office_id`, `appointment_date`, `is_kept`, `is_block`, `is_deleted`); `rpt_patient_dim` (`first_visit_date`); `rpt_office_dim` |
| Grain | Office (home) x referral type x source key (as Referral Summary) |
| `seen_count` | `count(DISTINCT patient_id)` of the source's patients with `EXISTS` a qualifying row (per `count_basis`) in the range and in an office of the set. `EXISTS`, never a join inside the aggregate |
| Date basis | `service_date` (fixed; `rpt_visits.visit_date` is the service date of the visit-code charge); `service_date` / `appointment_date` under the enhancement bases |
| Office attribution | `home_office` for the patient and the band; the qualifying event must be in the office set |
| Provider attribution | None |
| Parameter -> query | `office_scope` -> `rpt_referral_facts.office_id IN` and event `office_id IN`; `date_range` -> event date `BETWEEN`; `referral_type_codes`, `referred_from_ids`, `source_categories`, `first_visit_date_*` as on Referral Summary |
| Availability | Coverage matrix row 61: **READY** as Referral Production List; app patients match a source by name only until SCHEMA(40); first-visit enhancement REPAIR(19); `count_basis = kept_appointment` uses `is_kept`, which on migrated rows exists only through the same-day charge (03 section 2.15) |
| Migrated history | Current state only (warning `referral_current_state`); the archive policy (`Ledger_archive.txt` rows excluded by default) can drop old visits |
| Cost | `interactive` (count only, no money legs) |
| Related metric | `new_patients_missing_source_pct` measures new patients, this report counts seen patients: a reconciliation test holds only for the `No Referred By` share with `first_visit_date_*` equal to the range (`reconciles_with` declared under that condition only; open question 3) |

### Output

Format `summary` (legacy), block `main`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | `text` | `aggregate` | band label `Office : {office_name}` (multi-office only) |
| `source_type_label` | Referral Type | `text` | `aggregate` | group header `Referral Type : {source_type_label}`, subtotal label `Total :` |
| `referral_source_label` | Referral | `text` | `phi_identified` (rule 13 label, degrades to `source_type_label`) | `label`; no-source row label `No Referred By` |
| `seen_count` | # Referred Pats Seen | `integer` | `aggregate` | `sum` per type, office; grand total (`Grand Total :`) only with `show_grand_total` |
| `seen_share_pct` | % of Seen | `percent` | `aggregate` | `share_of_parent(seen_count)`; default hidden |
| `new_patient_count` | New Patients | `integer` | `aggregate` | `sum`; patients of the row whose `first_visit_date` is in the range; default hidden (REPAIR(19)) |
| `seen_count_compare`, `seen_change_pct` | Seen (compare), Change % | `integer`, `percent` | `aggregate` | `sum`, `ratio`; `visible_when ["ne", "compare_to", "none"]` |
| hidden: `office_id`, `referral_type_code`, `referral_source_key`, `referral_source_id`, `source_category`, `row_id` | | | `aggregate` (`referral_source_key` `phi_identified`) | - |

Format `patient_detail` (NEW), block `patients`: `office_name`, `source_type_label`, `referral_source_label`, `chart_no`,
`patient_id`, `patient_name`, `first_seen_in_range` (date), `last_seen_in_range` (date), `days_seen` (integer),
`first_visit_date`; all `phi_identified`; count per source equals `seen_count`.

| Topic | Rule |
|---|---|
| Group levels | Office (fixed outer, multi-office) -> Referral Type; grand total only with `show_grand_total` (default `false`, legacy prints none) |
| Sort | Types by label; sources by label with `No Referred By` last; enhancement `sort_by`: `referral_name` (default), `seen_count_desc` |
| Page break | `page_break_by` `none` (default), `office`, `group` (layout, enhancement) |
| Summary cards | `Referred patients seen` (block total), `Without a source` (`seen_count` of the `none` rows, from the subtotal of hidden `source_category = none`; computed as a block total) |
| Empty run | `no_detail_rows` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `seen_count` by source within type, top 15 plus `other` |
| `# Referred Pats Seen` cell or subtotal | `rows`: `report_format = patient_detail` filtered to the group |
| `Referral` label | `report` `referral.referral_summary_report` with the same `office_scope`, range and `referral_type_codes = [group type]` (money of the same sources) |
| Patient name (detail) | `record` patient -> `/patient/:id/overview` (`phi_identified`, chart right) |

### Actions

| Action | Scope / kind | Notes |
|---|---|---|
| Thank-you letter / labels to sources | bulk `letters`, `labels` | As on Referral Summary (PD-15) |
| Fix missing source | row `navigate` on a detail row of `No Referred By` | Opens the patient's edit wizard on the referral step (patient right) |
| Export selection | bulk `export_selection` | Full Control + export right |
| Worklist | no | The `No Referred By` detail list can be saved as a view for data clean-up |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait; header organisation name and `Referral Count Summary`; single office: no `Office :` line (2016 sample; open question 4); several offices: one `Office :` band per home office (`["ctx", "multi_office"]`); footer echo `From` / `Thru`, `Referral Types`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | Sheet `Referral Count Summary`, one row per source, office and type repeated, `row_type` column, no merged cells; `patient_detail` on its own sheet |
| CSV | Main block |
| Background | Not needed (count query) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | What counts as "seen": a posted procedure, a visit-code procedure or a kept appointment in the range? | live run on a patient with only a kept appointment |
| 2 | Does a patient who moved home office after the visit count in the old or the new office (current state presumed)? | live tool |
| 3 | Header lists `new_patients_missing_source_pct` as the reconciling metric; it measures new patients, so the test is declared only under the cohort condition - confirm with 05 | 05_metric_catalog.md |
| 4 | Does the current build print an `Office :` line and a grand total (2016 sample only)? | live run |

## Internal Referral Management - `referral.internal_referral_management`

Referral Reports, screenshot `7.PNG` (criteria cut off at the `GROUP BY` header) - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`; whether `Utilities - Referral Management Full Control` is also needed: family open question 6) - cost_class interactive - legacy output confidence INFERRED (utility grid only; GROUP BY options hidden)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Treatment coordinator of the referring office | Weekly | Patients our dentists referred to an in-house specialist or another office of the organisation that are still `Incomplete` or not booked; call and book |
| Receiving specialist office | Daily, weekly | Internal referrals addressed to our providers: who must be scheduled (Appt columns) |
| Regional / office manager | Month end | Volume of internal referrals per referring and receiving provider and office: how much specialty work stays inside the organisation |

Feature context: cases are created from Treatment Plan `Refer To` > Internal tab and shown in Utilities › Referral
Management, tabs `INTERNAL - INCOMING` / `INTERNAL - OUTGOING` [P60].

### Legacy output

No vendor description or sample. The columns below are the grid of the utility [P60·img] and are the proposed print
layout (INFERRED).

| # | Header (grid, verbatim) | Content |
|---|---|---|
| 1 | `Referral Date` | date of the case |
| 2 | `Patient ID` | patient id |
| 3 | `Patient Name` | last, first |
| 4 | `Referred To Provider` | receiving provider |
| 5 | `Referred Out Procedure Codes` | codes of the referred plan items, comma-separated |
| 6 | `Tx Status` | `Incomplete` / `Completed` |
| 7 | `Appt Date` | booked appointment date |
| 8 | `Appt Time` | booked start time |
| 9 | `Appt Op` | operatory of that appointment |
| 10 | `Referring Office` | office that created the case |
| 11 | `Referring Provider` | provider who referred |

Proposed (INFERRED): title `Internal Referral Management`; one row per case; grouping per the hidden GROUP BY (unknown;
default none); count line `Total Referrals : n` following the family count-line pattern; footer echo of every
non-default criterion. Grid icons (attachments, calendar booking) have no print equivalent.

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REFERRED FROM OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `referred_from_office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | - |
| REFERRED FROM OFFICE/GROUP | (no label) (picker) | shown: 108 | `referred_from_office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Referring office of the internal case (Referring Office). Plain filter inside the two-column readability rule 08 S-13 (row readable when its from OR to office is allowed); not the security scope (04 section 6.7). 108 = working office; it also gives the reference time zone. |
| REFERRED TO OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `referred_to_office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | - |
| REFERRED TO OFFICE/GROUP | (no label) (picker) | shown: ALL | `referred_to_office_scope.selection` | office_scope | - | `all` | replicated_enhanced | Office of the referred-to provider (receiving office). Plain filter inside 08 S-13; default ALL as captured. ALL (and all on referred_from_office_scope) = no predicate inside the S-13 readable set: it never narrows to the offices the caller may read, so a case sent from the caller's office to an office the caller cannot read is still listed (04 section 6.7). |
| REFERRAL DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referral_date = Referral Date of the internal case (NEW DATA-40). Default today in the office time zone. |
| REFERRAL DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referral_date = Referral Date of the internal case (NEW DATA-40). Default today in the office time zone. |
| REFERRED FROM PROVIDER | (no label) (picker) | shown: ALL | `referred_from_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| REFFERED TO PROVIDER | (no label) (picker) | shown: ALL | `referred_to_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Legacy header is misspelt REFFERED. |
| PROCEDURE CODES | (no label) (picker) | shown: ALL | `procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Matches a case when ANY of its Referred Out Procedure Codes is in the list; ALL = no restriction. Inferred - confirm. |
| USERS | (no label) (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | User role: the user who created the internal referral case (NEW DATA-40). Inferred - confirm on the live tool. |
| SPECIALTY | (no label) (dropdown) | shown: ALL | `specialty_codes` | entity_multi | - | `all` | replicated_enhanced | Specialty of the case: coalesce(referral_cases.specialty, referred-to provider specialty rpt_provider_dim.specialty); referral_cases.specialty is stamped from the referred-to provider when the case is created (rule owned by DATA-40), because the provider attribute is blank on 96 of 97 migrated providers. Option list built from both values. Legacy single-select; list accepted. Inferred - confirm (open question 4). |
| STATUSES | (no label) (radio_group) | **All** / Completed / Incomplete | `referral_completion` | enum | All -> `all`, Completed -> `completed`, Incomplete -> `incomplete` | `all` | replicated | Filters the Tx Status of the internal case: All -> all (no predicate), Completed -> completed, Incomplete -> incomplete (the two values of the INTERNAL REFERRAL grid). Inferred from the utility grid - confirm on the live tool. |
| STATUSES | Exclude Deleted Referrals (checkbox) | **checked** | `exclude_deleted_referrals` | boolean | - | `true` | replicated | true = cases marked deleted are left out (same as Hide Deleted Referrals of the utility). Needs a soft-delete flag on referral_cases (NEW DATA-40). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:refferal_reports.r07:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); rows unchanged |
| Readability (no control) | A case is readable when its referring office OR its receiving office is in the caller's allowed offices (08 S-13); both office scopes below filter inside that readable set |
| REFERRED FROM OFFICE/GROUP `Office` (default) with picker `108` (working office) | `referred_from_office_ids = [working office]`: `referral_cases.from_office_id IN` the set; this office also supplies "today" |
| REFERRED FROM OFFICE/GROUP `Office` other offices / `all` | List: `IN` the list; `all`: no from-office predicate inside the readable set |
| REFERRED FROM OFFICE/GROUP `Office Group` | `referred_from_office_group_id`: offices of the group |
| REFERRED TO OFFICE/GROUP `Office` with picker `ALL` (default) | No predicate on the receiving office (`all` must not narrow the readable set to the caller's own offices; open question 5) |
| REFERRED TO OFFICE/GROUP `Office` one or more offices | `to_office_id IN` the list (office of the referred-to provider on the case) |
| REFERRED TO OFFICE/GROUP `Office Group` | `referred_to_office_group_id`: offices of the group |
| REFERRAL DATE RANGE Start Date / End Date (default `today` / `today`) | `referral_cases.referral_date BETWEEN` (inclusive, office-local date as entered) |
| REFERRED FROM PROVIDER `ALL` (default) / list | No predicate / `from_provider_id IN` (role `referring`); never scoped by `providers.office_id` |
| REFFERED TO PROVIDER `ALL` (default) / list | No predicate / `to_provider_id IN` (role `referred_to`) |
| PROCEDURE CODES `ALL` (default) / list | No predicate / `procedure_codes && :codes` (any-match on the referred codes of the case) [I] |
| USERS `ALL` (default) / list | No predicate / `created_by IN` (creating user) [I]; cases without a creator match only under `ALL` |
| SPECIALTY `ALL` (default) / one value | No predicate / `coalesce(referral_cases.specialty, to_provider.specialty) IN` (legacy single-select, list accepted) [I]; `referral_cases.specialty` is stamped from the referred-to provider when the case is created (DATA-40), because `rpt_provider_dim.specialty` is blank on 96 of 97 migrated providers; open question 4 |
| STATUSES `All` (default) | `referral_completion = all`: no Tx Status predicate |
| STATUSES `Completed` | `tx_status = 'completed'` |
| STATUSES `Incomplete` | `tx_status = 'incomplete'` (cases with NULL `tx_status` are treated as incomplete [I]) |
| STATUSES `Exclude Deleted Referrals` checked (default) | `exclude_deleted_referrals = true`: `deleted_at IS NULL` |
| STATUSES `Exclude Deleted Referrals` unchecked | Deleted cases are read from `referral_cases` too and print with the `Deleted` column visible |
| GROUP BY (header visible, options not captured) | No control in the controls index, so no parity row; the enhancement `group_by` below stands in until the live tool shows the options and their default (open question 1) |

Dependency rules: `refferal_reports.r01.d01` (mode radio of both office scopes), `refferal_reports.r01.d02` (favorites). No
greyed control captured; the GROUP BY controls and anything below them are unknown.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `group_by` | `enum` (shared key; values NEW for this report): `none`, `referring_office`, `referred_to_office`, `referring_provider`, `referred_to_provider`, `specialty` | `none` | One group level with header and `Total Referrals for, <value> : n`. Provisional: the legacy default is unknown, so default-output parity is unverified; when RPT-REF-08 captures the options, the control is added to the controls index / supplement and mapped in the decisions file (status `replicated`), replacing this enhancement |
| `appointment_states` | `enum_multi` NEW (owner 04): `not_booked`, `booked_future`, `booked_kept`, `booked_broken`; `accepts_all` | `all` | From `appointment_id` and `rpt_appointment_facts.status_class`; `not_booked` is the follow-up list |
| `min_days_open` | `integer` NEW | empty | Incomplete cases whose `referral_date` is at least n days before the reference today |
| `include_referred_work_posted` | `boolean` NEW | `false` | Adds the column `Referred Work Posted` (a charge with one of the referred codes for the patient by the referred-to provider on or after the referral date); flags cases left `Incomplete` although the work was done |
| `sort_by` | `enum`: `referral_date` (default), `patient_last_name`, `referred_to_provider`, `days_open_desc` | `referral_date` | Row order inside the group |
| Saved view "Incoming to my office - incomplete, last 90 days" | saved view | - | `referred_from_office_ids = all`, `referred_to_office_ids = @working_office`, `referral_completion = incomplete`, `date_preset = last_90_days` |
| Saved view "Sent from my office - not booked" | saved view | - | Defaults plus `appointment_states = [not_booked]`, `date_preset = last_90_days` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`referral_kind = 'case'`, `direction = 'internal'`, `case_id`, `patient_id`, `referral_date`, `status` = Tx status on internal rows) joined through `case_id` to `referral_cases` (NEW, DATA-40: `from_office_id`, `to_office_id`, `from_provider_id`, `to_provider_id`, `specialty`, `procedure_codes`, `tx_status`, `appointment_id`, `treatment_plan_item_id`, `created_by`, `deleted_at`); `rpt_patient_dim` (`chart_no`, names); `rpt_provider_dim` twice (`provider_name`, `short_id`, `specialty`; `specialty_label` = `coalesce(referral_cases.specialty, to_provider.specialty)`); `rpt_office_dim` twice (`office_name`, `local_today`); `rpt_appointment_facts` (`appointment_date`, `start_time`, `operatory_id`, `status_class`); operatory label from the passthrough `operatories` catalog (DATA-45); `rpt_user_dim` (`user_label` via `user_key = 'u:' + created_by`); `rpt_procedure_code_dim` (descriptions in the tooltip); with the enhancement `rpt_charges` |
| Grain | One referral case |
| Date basis | `referral_date` (fixed) |
| Office attribution | Two columns: referring office (`from_office_id`) and receiving office (`to_office_id`); readable when either is allowed (08 S-13, two-column `OR` on the scoped handle requested from 02 and 03) |
| Provider attribution | `referring` (`from_provider_id`) and `referred_to` (`to_provider_id`) |
| Deleted rows | `rpt_referral_facts` carries live cases only; `exclude_deleted_referrals = false` reads `referral_cases` directly with the same columns (03 section 2.23 note) |
| Parameter -> query | As in the parity table; `appointment_states` -> `CASE` on `appointment_id IS NULL` / `status_class`; `min_days_open` -> `local_today - referral_date >= :n AND tx_status IS DISTINCT FROM 'completed'` |
| Availability | Coverage matrix row 62: **SCHEMA(40)** - no rows until `referral_cases` exists and the Treatment Plan `Refer To` > Internal flow writes cases. Today treatment-plan items with status `internal_referral` exist (APP, `referral_kind = 'outbound_item'`) without a case, a Tx Status, a referring-office stamp (DATA-39) or a referral date (`presented_date` only); they are not used as a parity source (open question 6) |
| Migrated history | None: no Denticon referral case was migrated; the report starts with the first case created in DentC |
| Cost | `interactive` (case volume is small) |
| Metric | Row-count test (`Referrals` = detail rows). `outbound_referrals` (direction internal) also counts `outbound_item` rows and has no `referral_kind` dimension, so it is not a `reconciles_with` target until 05 adds one (Shared rules) |

### Output

One block `main`, grain case.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `referral_date` | Referral Date | `date` | `phi_identified` | - |
| `patient_id` | Patient ID | `id` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` | `count` (label `Total Referrals :`) per group and grand total |
| `referred_to_provider_label` | Referred To Provider | `text` | `aggregate` | - |
| `procedure_codes_label` | Referred Out Procedure Codes | `text` | `phi_identified` | - |
| `tx_status` | Tx Status | `enum` (`incomplete` -> `Incomplete`, `completed` -> `Completed`) | `phi_identified` | - |
| `appointment_date` | Appt Date | `date` | `phi_identified` | `null_display` empty |
| `appointment_time` | Appt Time | `time` | `phi_identified` | - |
| `operatory_label` | Appt Op | `text` | `aggregate` | - |
| `referring_office_name` | Referring Office | `text` | `aggregate` | - |
| `referring_provider_label` | Referring Provider | `text` | `aggregate` | - |
| `referred_to_office_name` | Referred To Office | `text` | `aggregate` | - (added; default visible) |
| `specialty_label` | Specialty | `text` | `aggregate` | - (added; default hidden) |
| `created_by_label` | Created By | `text` | `aggregate` (rule 12) | - (added; default hidden) |
| `days_open` | Days Open | `integer` | `phi_identified` | `max` per group (added) |
| `is_deleted` | Deleted | `boolean` | `phi_identified` | `count` of true; `visible_when ["falsy", "exclude_deleted_referrals"]` |
| `referred_work_posted` | Referred Work Posted | `boolean` | `phi_identified` | `visible_when ["truthy", "include_referred_work_posted"]` |
| `is_completed`, `is_booked` | (hidden counters) | `integer` | `aggregate` | `sum` (feed the summary cards) |
| hidden: `case_id`, `appointment_id`, `treatment_plan_item_id`, `from_office_id`, `to_office_id`, `from_provider_id`, `to_provider_id`, `row_id` | | | `phi_identified` / `aggregate` | - |

| Topic | Rule |
|---|---|
| Group levels | None by default (legacy unknown); `group_by` adds one level; no `fixed_outer` office band, because each row has two offices (both are columns) |
| Sort | Default `referral_date` asc, `patient_last_name` (hidden), `row_id` [I] |
| Page break | `page_break_by` `none` (default), `group` (layout, enhancement) |
| Summary cards | `Referrals` (count), `Completed` (`is_completed` sum), `Incomplete` (count minus completed, computed as the `sum` of a hidden `is_incomplete`), `Not booked` (`count` minus `is_booked` sum, same technique) |
| Empty run | `no_detail_rows`; while DATA-40 is missing the run returns no rows with the warning `referral_cases_not_available` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bars per referred-to provider: completed / incomplete, top 15 (screen only) |
| Patient name | `record` patient -> `/patient/:id/overview` (`phi_identified`, chart right, `assert_patient_visible`) |
| Referred Out Procedure Codes | `record` treatment plan -> `/patient/:id/treatment` (treatment-plan right) |
| Appt Date | `record` appointment -> scheduler at that date with the appointment selected (scheduler right) |
| Referral Date | `record` referral case -> Referral Management case (route key `referral_case`, NEW, owner 07) |
| Group count, summary card | `rows` of this report filtered to the group / to `tx_status` / to `appointment_states` |

### Actions

| Action | Scope / kind | Phase | Notes |
|---|---|---|---|
| Book the referred appointment | row `navigate` | P4 | Scheduler booking hand-off (`openSchedulerForBooking`) with patient, referred-to provider, receiving office and the referred plan items seeded |
| Open case | row `navigate` | P4 | Referral Management case screen |
| Text / e-mail the patient to book | bulk `send_sms` / `send_email` | P4 | `requires: [sms_consent]` / e-mail opt-in; `no_auto_sms`, `no_correspondence` excluded and counted |
| Follow-up task | row / bulk `create_task` | P4 | Assigned to the caller by default |
| Export selection | bulk `export_selection` | P3 | Full Control + export right |
| Worklist | yes from P4 | P4 | `paging_mode = live` variant "Internal referrals to book" (`referral_completion = incomplete`, `appointment_states = [not_booked]`), family funnel item RPT-REF-09 |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (11 legacy columns plus additions); header organisation name, `Internal Referral Management`; repeating column header; `criteria_echo = footer` with labels `From` / `Thru`, `Referred From Offices`, `Referred To Offices`, `Referred From Provider`, `Referred To Provider`, `Procedure Codes`, `Users`, `Specialty`, `Statuses`, `Exclude Deleted Referrals` [I, echo labels not seen]; `Printed :`, `By :`, `Page : n of m` |
| XLSX | Sheet `Internal Referrals`, one row per case, codes as one text cell, dates and times typed; group value as a column when `group_by` is set; no merged cells |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Options and legacy default of GROUP BY, and any control below it (truncated capture) | live tool, scroll the criteria panel |
| 2 | Printed columns, grouping and totals (no sample exists) | live run, PDF and Excel |
| 3 | Do STATUSES `Completed` / `Incomplete` filter the Tx Status (presumed) or the case status? Who or what sets Tx Status `Completed` (manual, or posting of the referred codes)? | live tool, utility grid |
| 4 | USERS: creator or last modifier? SPECIALTY: specialty of the referred-to provider or of the case? | live tool |
| 5 | With REFERRED TO = ALL and REFERRED FROM = working office, does a receiving office see internal cases addressed to it, or only via the INCOMING tab of the utility? | live tool with a user of the receiving office |
| 6 | Product: offer an interim "internal referral items" list from `outbound_item` rows before DATA-40, labelled as not the legacy report? Default no | product owner |
| 7 | Are deleted cases printed with a marker when Exclude Deleted Referrals is unticked? | live run |

## External Incoming Referral Management - `referral.external_incoming_referral_management`

Referral Reports, screenshot `8.PNG` - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`; utility right question as on Internal Referral Management) - cost_class interactive - legacy output confidence INFERRED (utility grid and field guide only; report added after June 2023)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front desk, treatment coordinator of a specialist office | Daily | Referrals received from outside dentists (external referral link or ADD REFERRAL): who has not been contacted, who must call back, who is booked |
| Office manager | Weekly | Conversion of incoming referrals (received -> contacted -> scheduled -> completed); expired or refused referrals |
| Owner, practice-relations lead | Month end | Volume per referring doctor, per reason code and per our provider; whom to send a referral report or thank-you |

### Legacy output

No vendor description or sample. Columns from the `EXTERNAL - INCOMING` grid [P58·img][P59·img] (INFERRED as the print
layout):

| # | Header (grid, verbatim) | Content |
|---|---|---|
| 1 | `Referral Date` | date of the case |
| 2 | `Patient ID` | patient id; `N/A` until a patient record exists |
| 3 | `Patient Name` | registered patient or the prospect name keyed with the referral |
| 4 | `Referred To Provider` | our provider the case is addressed to |
| 5 | `Referral Reason Code` | office-defined reason (Setup › Misc Setup › Referral Reasons: code, specialty, description) |
| 6 | `Referral Status` | one of the eight case statuses |
| 7 | `Appt Date` | booked appointment |
| 8 | `Appt Time` | start time |
| 9 | `Appt Op` | operatory |
| 10 | `Referred By` | outside referral source |

Grid icons without a print equivalent: incoming attachment, outgoing report, calendar (book), phone (contact tracking,
source of CONTACT STATUSES), mail (send referral report), delete. Proposed (INFERRED): title `External Incoming Referral
Management`; `Office : <receiving office>` band when several offices; count line `Total Referrals : n` per office and
grand total; added column `Contact Status` (the phone-icon state the criteria filter on).

Status rules (documented for the utility [P57·img][P59·img][P61]): `Pending` is the default; staff set `Accepted`,
`Rejected` (with a note), `In Progress`, `Completed`, `Cancelled`, `Not Needed`; `Expired` is set automatically after 30
days.

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REFERRED TO OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `referred_to_office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | - |
| REFERRED TO OFFICE/GROUP | (no label) (picker) | shown: 108 | `referred_to_office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Office that received the incoming case; security_scope parameter of this report (04 section 6.7). 108 = working office. |
| REFERRAL DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referral_date = Referral Date of the incoming case (NEW DATA-40). Default today in the office time zone. |
| REFERRAL DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis = referral_date = Referral Date of the incoming case (NEW DATA-40). Default today in the office time zone. |
| REFERRED TO PROVIDER | (no label) (picker) | shown: ALL | `referred_to_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Our provider the incoming case is addressed to (Referred To Provider of the EXTERNAL - INCOMING grid). Inferred - confirm. |
| REFERRED FROM | (no label) (picker) | shown: ALL | `referred_from_ids` | entity_multi | - | `all` | replicated_enhanced | Outside referral source that sent the case (Referred By of the grid). Option source referral_sources, direction referred-by. Cases keyed with ADD REFERRAL without a source row match only under ALL. Inferred - confirm. |
| STATUSES | All (checkbox) | **checked** | `referral_statuses.all` | enum_multi | - | `true` | replicated | All box of the status grid: ticked = the scalar value all (no status restriction); never a member of the list. |
| STATUSES | Accepted (checkbox) | **unchecked** | `referral_statuses.accepted` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Rejected (checkbox) | **unchecked** | `referral_statuses.rejected` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Pending (checkbox) | **unchecked** | `referral_statuses.pending` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Cancelled (checkbox) | **unchecked** | `referral_statuses.cancelled` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Completed (checkbox) | **unchecked** | `referral_statuses.completed` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | In Progress (checkbox) | **unchecked** | `referral_statuses.in_progress` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Not Needed (checkbox) | **unchecked** | `referral_statuses.not_needed` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. |
| STATUSES | Expired (checkbox) | **unchecked** | `referral_statuses.expired` | enum_multi | - | `false` | replicated | Member of the status checkbox grid; applies when All is unticked. Every member binds to effective_status IN (...): effective_status = stored status, except that a pending case with office-local today - referral_date > 30 reads expired until the referral feature stores it [I] (legacy sets Expired automatically after 30 days; rule owned by DATA-40). |
| STATUSES | Exclude Deleted Referrals (checkbox) | **checked** | `exclude_deleted_referrals` | boolean | - | `true` | replicated | - |
| CONTACT STATUSES | All (checkbox) | **checked** | `contact_statuses.all` | enum_multi | - | `true` | replicated | All box of the contact status grid: ticked = scalar all (no restriction). A list filters the current contact_status of the case (= latest contact-tracking entry, phone icon of the grid; referral_cases.contact_status, NEW DATA-40, which stores no entry history); cases without a contact status are dropped under a list (interim null_policy drop, to be replaced by the policy RPT-REF-08 confirms). Inferred meaning - confirm on the live tool, including whether a case without an entry counts as No Response. |
| CONTACT STATUSES | No Response (checkbox) | **unchecked** | `contact_statuses.no_response` | enum_multi | - | `false` | replicated | Member of the contact status checkbox grid; applies when All is unticked. |
| CONTACT STATUSES | Patient To Call (checkbox) | **unchecked** | `contact_statuses.patient_to_call` | enum_multi | - | `false` | replicated | Member of the contact status checkbox grid; applies when All is unticked. |
| CONTACT STATUSES | Appointment Scheduled (checkbox) | **unchecked** | `contact_statuses.appointment_scheduled` | enum_multi | - | `false` | replicated | Member of the contact status checkbox grid; applies when All is unticked. |
| CONTACT STATUSES | Referral Refused (checkbox) | **unchecked** | `contact_statuses.referral_refused` | enum_multi | - | `false` | replicated | Member of the contact status checkbox grid; applies when All is unticked. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:refferal_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); rows unchanged |
| REFERRED TO OFFICE/GROUP `Office` (default) with picker `108` (working office) | Security scope of this report (04 section 6.7): `referred_to_office_ids = [working office]` -> `referral_cases.to_office_id IN` the set; supplies "today" |
| REFERRED TO OFFICE/GROUP `Office` several offices / `all` | Union / every office the caller may read; one `Office :` band per receiving office |
| REFERRED TO OFFICE/GROUP `Office Group` | `referred_to_office_group_id`: offices of the group, banded per office |
| REFERRAL DATE RANGE Start Date / End Date (default `today` / `today`) | `referral_date BETWEEN` (inclusive, office-local) |
| REFERRED TO PROVIDER `ALL` (default) / list | No predicate / `to_provider_id IN` (role `referred_to`) [I] |
| REFERRED FROM `ALL` (default) / list | No predicate / `external_referral_id IN` (`lookup:referral_sources`, direction referred-by); cases keyed without a source row match only under `ALL` [I] |
| STATUSES `All` (default, ticked) | `referral_statuses = "all"`: no status predicate |
| STATUSES `Accepted` | Member `accepted`; applies when All is unticked: `effective_status IN (...)` (Data) |
| STATUSES `Rejected` | Member `rejected` |
| STATUSES `Pending` | Member `pending` |
| STATUSES `Cancelled` | Member `cancelled` |
| STATUSES `Completed` | Member `completed` |
| STATUSES `In Progress` | Member `in_progress` |
| STATUSES `Not Needed` | Member `not_needed` |
| STATUSES `Expired` | Member `expired`: stored `expired` plus `pending` cases older than 30 days (`effective_status`, Data) |
| STATUSES `Exclude Deleted Referrals` checked (default) / unchecked | `exclude_deleted_referrals` `true`: `deleted_at IS NULL` / `false`: deleted cases included with the `Deleted` column |
| CONTACT STATUSES `All` (default, ticked) | `contact_statuses = "all"`: no predicate; cases without any contact entry are kept |
| CONTACT STATUSES `No Response` | Member `no_response`; applies when All is unticked: current `contact_status IN (...)`; cases without an entry dropped (`null_policy drop`) [I] |
| CONTACT STATUSES `Patient To Call` | Member `patient_to_call` |
| CONTACT STATUSES `Appointment Scheduled` | Member `appointment_scheduled` |
| CONTACT STATUSES `Referral Refused` | Member `referral_refused` |

Dependency rules: `refferal_reports.r01.d01`, `refferal_reports.r01.d02`; inside each grid, ticking a member clears `All`
and ticking `All` clears the members (to confirm, filter card 3.7); a grid with nothing ticked is 422 `invalid_parameter`
(`min_items` 1). No greyed control.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `has_patient_record` | `enum` NEW (owner 04): `all`, `registered`, `prospect` | `all` | `prospect` = cases with `patient_id IS NULL` (Patient ID `N/A`): people to register and call |
| `referral_reason_codes` | `entity_multi` NEW (`lookup:referral_reasons`, NEW source, owner 04 / 03) | `all` | Filter on `referral_cases.reason_code` |
| `appointment_states` | `enum_multi` NEW (as Internal Referral Management) | `all` | `not_booked`, `booked_future`, `booked_kept`, `booked_broken` |
| `contact_older_than_days` | `integer` NEW | empty | Cases whose last contact (`contact_status_at`) is older than n days or that were never contacted |
| `group_by` | `enum` (values NEW): `none`, `referred_from`, `referred_to_provider`, `reason_code`, `referral_status` | `none` | One group level with count |
| `sort_by` | `enum`: `referral_date` (default), `days_waiting_desc`, `patient_last_name`, `referred_from` | `referral_date` | Row order |
| Saved view "To call today" | saved view | - | `referral_statuses = [pending, accepted, in_progress]`, `contact_statuses = [no_response, patient_to_call]`, `date_preset = last_30_days` |
| Saved view "Last month by referring doctor" | saved view | - | `date_preset = last_month`, `group_by = referred_from` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`referral_kind = 'case'`, `direction = 'in'`, `office_id` = receiving office, `case_id`, `patient_id`, `referral_source_id`, `source_name`, `status`, `referral_date`) joined through `case_id` to `referral_cases` (NEW, DATA-40: `to_office_id`, `to_provider_id`, `external_referral_id`, `reason_code`, `status`, `contact_status`, `contact_status_at`, `appointment_id`, `prospect_first_name`, `prospect_last_name`, `prospect_phone`, `prospect_dob`, `deleted_at`); `rpt_patient_dim` (names, `chart_no`, `cell_phone`, `phone`, `no_auto_sms`, `no_correspondence`); `rpt_provider_dim` (to provider); `rpt_office_dim`; `rpt_appointment_facts` (`appointment_date`, `start_time`, `operatory_id`, `status_class`); `operatories` passthrough; referral reason catalog (NEW passthrough `referral_reasons`, owner 03 within DATA-40) |
| Grain | One incoming case |
| Date basis | `referral_date` (fixed); `contact_status_at` (UTC) converted to the receiving office's local date for display and `contact_older_than_days` |
| Office attribution | Receiving office (`to_office_id`), the security scope; S-13 also admits a case whose referring office is allowed, which is never an own office for an external case |
| Provider attribution | `referred_to` (`to_provider_id`) |
| Patient name | `coalesce` of the registered patient name and the prospect name; Patient ID prints `N/A` when `patient_id IS NULL` |
| Contact status | The stored current `contact_status` of the case (= latest contact-tracking entry). No contact history table exists in DATA-40, so "status at a past date" and contact ageing per entry are not available (a contact history table would be NEW, owner 03; open question 2) |
| Effective status | As on External Outgoing: `effective_status` = stored `status`, except that a `pending` case with office-local today (receiving office) - `referral_date` > 30 reads `expired` until the referral feature stores it [I] (legacy sets Expired automatically after 30 days; rule owned by DATA-40). Every `referral_statuses` member binds to `effective_status IN (...)`; warning `referral_expired_derived` while derived |
| Parameter -> query | As in the parity table; `has_patient_record` -> `patient_id IS [NOT] NULL`; `referral_reason_codes` -> `reason_code IN`; `contact_older_than_days` -> `contact_status_at IS NULL OR local date of contact_status_at <= local_today - n` |
| Availability | Coverage matrix row 63: **SCHEMA(40)** - no rows until `referral_cases` exists and the external-referral intake (link and ADD REFERRAL) writes cases; `referral_reason_codes` needs the reason catalog (NEW) |
| Migrated history | None: no incoming case was migrated |
| Cost | `interactive` |
| Metric | No metric counts incoming cases today; the funnel tiles of RPT-REF-09 / 06 need NEW metrics (`incoming_referrals`, `incoming_referral_conversion_pct`, owner 05) |

### Output

One block `main`, grain case.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | `text` | `aggregate` | band `Office : {office_name}` (fixed outer, multi-office) |
| `referral_date` | Referral Date | `date` | `phi_identified` | - |
| `patient_id` | Patient ID | `id` | `phi_identified` | `null_display` `N/A` |
| `patient_name` | Patient Name | `text` | `phi_identified` | `count` (label `Total Referrals :`) per office and grand total |
| `patient_phone` | Phone | `text` | `phi_identified` | - (added; registered cell phone, else `prospect_phone`) |
| `referred_to_provider_label` | Referred To Provider | `text` | `aggregate` | - |
| `reason_code` | Referral Reason Code | `text` | `phi_identified` | - (tooltip: reason description) |
| `referral_status` | Referral Status | `enum` (8 labels) | `phi_identified` | - |
| `contact_status` | Contact Status | `enum` (4 labels) | `phi_identified` | `null_display` empty (added) |
| `contact_date` | Last Contact | `date` | `phi_identified` | - (added, office-local date of `contact_status_at`) |
| `appointment_date` | Appt Date | `date` | `phi_identified` | - |
| `appointment_time` | Appt Time | `time` | `phi_identified` | - |
| `operatory_label` | Appt Op | `text` | `aggregate` | - |
| `referred_by_label` | Referred By | `text` | `phi_identified` (referral source on a patient row) | - |
| `days_waiting` | Days Waiting | `integer` | `phi_identified` | `max` per office (added: days since `referral_date` while not booked and not closed) |
| `is_deleted` | Deleted | `boolean` | `phi_identified` | `visible_when ["falsy", "exclude_deleted_referrals"]` |
| `is_contacted`, `is_scheduled`, `is_completed` | (hidden counters) | `integer` | `aggregate` | `sum` |
| hidden: `case_id`, `appointment_id`, `office_id`, `to_provider_id`, `external_referral_id`, `row_id` | | | `phi_identified` / `aggregate` | - |

| Topic | Rule |
|---|---|
| Group levels | Receiving office (fixed outer, multi-office); optional `group_by` level; grand total `Total Referrals : n` (count line of the proposed layout [I]) |
| Sort | Default `referral_date` asc, `patient_name`, `row_id` [I] |
| Page break | `page_break_by` `none` (default), `office`, `group` (layout, enhancement) |
| Summary cards | `Received` (count), `Contacted` (`is_contacted`), `Scheduled` (`is_scheduled`), `Completed` (`is_completed`); the conversion ratio is a hidden column `scheduled_pct` with total `ratio(is_scheduled, case_count)` |
| Empty run | `no_detail_rows`; warning `referral_cases_not_available` until DATA-40 |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of cases by `referred_by_label` (top 15) in P3; the funnel received -> contacted -> scheduled -> completed is the family P4 enhancement (RPT-REF-09) |
| Patient name (registered) | `record` patient -> `/patient/:id/overview` (`phi_identified`, chart right) |
| Patient name (prospect) | none in P3; P4 action "Register patient" |
| Appt Date | `record` appointment -> scheduler (scheduler right) |
| Referral Date | `record` referral case (route key `referral_case`, NEW, owner 07) |
| Referred By | `record` entity `referral_source`, Setup › Referrals record of `external_referral_id` (row `navigate`). A drill to `referral.referral_source_list` would need NEW parameter `referral_source_ids` on r03 (owner 04, work item RPT-REF-19); not in P3 |
| Office count, summary card | `rows` of this report filtered to the office / counter |

### Actions

| Action | Scope / kind | Phase | Notes |
|---|---|---|---|
| Register patient | row `navigate` (prospect rows) | P4 | Add Patient wizard pre-filled with prospect name, phone, birth date; existing-patient match runs first |
| Book appointment | row `navigate` | P4 | `openSchedulerForBooking` with patient (registered only), referred-to provider, receiving office |
| Log contact | row `custom:referral_contact` | P4 | Handler owned by the referral feature (sets `contact_status`, `contact_status_at`); idempotent per run and case |
| Send referral report to the referring doctor | row `custom:referral_report` | P4 | Legacy mail icon; handler owned by the referral feature |
| Text the patients to call | bulk `send_sms` | P4 | `requires: [sms_consent]`; prospects without a patient record have no consent record and are excluded and counted |
| Follow-up task | row / bulk `create_task` | P4 | - |
| Export selection | bulk `export_selection` | P3 | Full Control + export right |
| Worklist | yes from P4 | P4 | `paging_mode = live` worklist "Incoming referrals to contact" from the saved view "To call today" |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; header organisation name, `External Incoming Referral Management`, office band; `criteria_echo = footer` with `From` / `Thru`, `Referred To Offices`, `Referred To Provider`, `Referred From`, `Statuses`, `Contact Statuses`, `Exclude Deleted Referrals` [I]; `Printed :`, `By :`, `Page : n of m` |
| XLSX | Sheet `Incoming Referrals`, one row per case, office repeated, typed dates and times, no merged cells |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Printed columns, grouping, totals; is a contact-status column printed? | live run, PDF and Excel |
| 2 | CONTACT STATUSES: latest entry (presumed) or any entry? Does a case without an entry count as `No Response`? Is a contact history needed (as-of status, contact ageing)? | live tool with an uncontacted case |
| 3 | Does REFERRED TO PROVIDER list only our providers, and REFERRED FROM only referred-by sources? Do the pickers follow the 2026-11 office-group associations of sources? | live tool |
| 4 | Is `Expired` stored by a job or computed, and only for `Pending` cases (shared with External Outgoing open question 4)? Interim: derived (`effective_status`) | live tool, a case older than 30 days |
| 5 | Does a prospect case (Patient ID `N/A`) print with the keyed name and phone? | live run |
| 6 | Behaviour when every STATUSES box is unticked (error, empty, or all)? | live tool |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-REF-01 | Shared referral parameter set and option sources: `referral_type_codes`, `referral_sources` by direction, specialty source variants (referral-source / provider), three office-scope parameters with `security_scope` per report | P3 | S | FLT-03, FLT-09, FLT-13, DATA-40 | Each of the 8 definitions validates with the defaults of the parity file; `referred_to_ids` lists only referred-to sources, `referred_from_ids` only referred-by sources; FLT-20 parity default tests pass |
| RPT-REF-02 | `referral.referral_production_list`: standard and by-zip-code variants on inbound_source facts with production, allocated collections, adjustments, visits | P3 | M | DATA-40, DATA-19, DATA-06, DATA-20, ENG-11, ENG-23, RPT-REF-01 | Golden fixture: per-patient and per-type totals equal hand-computed sums; zip variant has no Adjs column and three group levels; `group_by = zip_code` changes the title subtitle |
| RPT-REF-03 | Umbrella: `referral.referral_summary_report` and `referral.referral_count_summary` (no acceptance of its own; see RPT-REF-40..44) | P3 | M | RPT-REF-40, RPT-REF-41, RPT-REF-42, RPT-REF-43, RPT-REF-44 | Closed when RPT-REF-40..44 pass |
| RPT-REF-04 | `referral.referred_out_list` on outbound_patient facts (patients.referred_to, referral_to_date, `target_name`) | P3 | S | DATA-40, DATA-19, RPT-REF-01 | Patients with `referral_to_date` in range are listed once; exclude patient type keeps patients without a type; total line equals row count; a free-text target matching no source prints its text in `Ref Out Dentist` |
| RPT-REF-05 | `referral.referral_source_list` on the `referrals` catalog with display-only office scope and the catalog rule | P3 | S | DATA-40, DATA-08, FLT-03 | Office picker change does not change rows; a caller sees only sources the Setup screen shows them; REFERRED TO/BY and REFERRAL TYPE filter once the NEW source columns exist, ALL returns every source before |
| RPT-REF-06 | Umbrella: the three Referral Management definitions on case facts (no acceptance of its own; see RPT-REF-21, RPT-REF-45..48) | P3 | L | RPT-REF-21, RPT-REF-45, RPT-REF-46, RPT-REF-47, RPT-REF-48 | Closed when RPT-REF-21 and RPT-REF-45..48 pass |
| RPT-REF-07 | Family conventions: signs, totals, title templates, footer criteria echo labels, `availability[]` warnings (current-state history, migrated free-text links) | P3 | S | ENG-23, FLT-18, RPT-REF-02 | PDF footers print the legacy echo labels; collection is positive in both r01 layouts; warnings appear in the criteria block of affected runs |
| RPT-REF-08 | Live legacy verification for this category: dropdown values, truncated criteria of r04 and r07, outputs of the three case reports, USERS / CONTACT STATUSES meaning | P3 | S | FLT-23 | Every `unknown_legacy` and inferred note of `refferal_reports.parity.json` is resolved or re-confirmed (checklist includes: an uncontacted case under CONTACT STATUSES `[no_response]`; GROUP BY options and default of r07; what follows STATUSES on r04; a status-summary block on r04), and the parity file is rebuilt PARITY VALID |
| RPT-REF-09 | Referral analytics enhancements: share-of-parent columns, cross-office option, ROI on source cost, case funnel and ageing with row actions | P4 | M | RPT-REF-40, RPT-REF-42, RPT-REF-21, RPT-REF-45, RPT-REF-47, MET-18 | Default runs are byte-identical to the P3 legacy runs; enhanced columns reconcile with the metric registry |
| RPT-REF-10 | `referral.referral_production_list` definition as specified: population rule, both variant blocks with levels and subtotal labels, grand total, sort options, title templates, summary cards, `availability[]` entries | P3 | M | RPT-REF-02, RPT-REF-01, RPT-REF-07, DATA-40, DATA-19, DATA-26, ENG-11 | Golden fixture of three referral types, a patient without a source and a patient who moved offices: rows, subtotals and grand total equal hand sums in both variants; zip variant has no `adjustments` column and its type subtotal carries only money; definition lint passes against the parity file |
| RPT-REF-11 | Referral Production List drills and actions: patient record, account ledger record, source and zip `rows` drills, type drill to `referral.referral_summary_report`, bulk letters / labels to distinct sources, tasks | P3 | S | RPT-REF-10, ENG-30, ENG-49 | A source-subtotal drill returns exactly the rows of that source; the letter action resolves one recipient per distinct source from the snapshot and counts sources without an address |
| RPT-REF-12 | Referral Production List P3 enhancements: `referred_from_ids`, `source_categories` (NEW), `include_zero_activity`, `sort_by`, `page_break_by`, share columns, two saved views | P3 | S | RPT-REF-10, FLT-09, ENG-28 | Default run unchanged byte for byte; `include_zero_activity = true` adds referred patients without activity with zeros; share columns sum to 100 % per parent |
| RPT-REF-13 | Referral Production List P4: `compare_to` prior-period columns and the all-office activity option (key aligned with r05 / r06) | P4 | S | RPT-REF-10, FLT-26, RPT-REF-09 | Prior-period columns equal a separate run for the prior range; the all-office option changes only the money legs, never the patient population |
| RPT-REF-14 | `referral.referred_out_list` definition as specified: columns, phones cell, totals per band, sort options, summary cards, warnings | P3 | S | RPT-REF-04, RPT-REF-01, DATA-19, ENG-11, ENG-23 | Fixture: patients with `referral_to_date` inside / outside the range and with excluded types give the expected list; `Total Patients Referred Out` equals the row count per band; XLSX splits the three phones |
| RPT-REF-15 | Referred-out target resolution: interim name match of `patients.referred_to` to direction-referred-to sources (lateral, one row), then NEW `patients.referred_to_source_id` after DATA-40; warning `referred_out_name_match` with the unmatched count | P3 | S | DATA-40, DATA-05, RPT-REF-14 | Two sources with the same label never duplicate a patient; a renamed source stops matching and is counted in the warning; after DATA-40 the id join returns the same rows on back-filled data |
| RPT-REF-16 | Referred Out List enhancements: `include_plan_item_referrals` (outbound_item rows), `returned_since_referral`, `group_by`, follow-up worklist view, task / SMS / letter actions | P3 | S | RPT-REF-14, ENG-49 | `not_returned` lists exactly the patients without a visit after `Ref Out On`; SMS action excludes opted-out patients and reports the count; plan-item rows carry `Source = Treatment plan` |
| RPT-REF-17 | `referral.referral_source_list` definition as specified: catalog rule with display-only office control, direction and type filters with their warnings, columns and label mapping, footer echo by label | P3 | S | RPT-REF-05, DATA-45, FLT-03 | Changing the greyed office picker changes neither rows nor hash; `referral_direction = referred_to` lists only direction `1` sources (plus `both` once present); a type filter before the NEW column returns no rows and prints the warning |
| RPT-REF-18 | NEW source attributes consumed by r03: `referrals.source_type_code` (label via `definitions:referral_type`) and the three-valued direction `both`, exposed in Setup › Referrals, with a back-fill of Type and Referred by/To = `Both` for the migrated sources from the legacy referral-source export matched by `referrals.legacy_id` (request to 03 as a DATA-40 extension) | P3 | S | DATA-40, DATA-08 | A source saved with type and `Both` in Setup appears under `Referred By`, `Referred To` and `Both` and under its type on r03; after the back-fill every migrated source with a legacy Type prints it in `Referral Type`, and legacy `Both` sources are `both` |
| RPT-REF-19 | Referral Source List extras: usage columns, `duplicates_only`, `group_by`, `sort_by`, extra columns, bulk letters / labels / e-mail to sources, drill to r01 | P3 | S | RPT-REF-17, ENG-49, RPT-REF-12 | Usage counts equal `rpt_referral_facts` counts per source; two sources differing only in punctuation are both listed by `duplicates_only` |
| RPT-REF-20 | Row-level degrade of patient-named referral sources for callers without `phi_identified` (r03; shared with r05): name to type label, contact fields blank (masking rule requested from 08 section 5.5) | P3 | S | SEC-02, ENG-03, RPT-REF-17 | A caller without the class sees `Existing Patient` instead of the patient's name and no address on patient sources, in screen, PDF, XLSX and CSV; doctor sources are unchanged |
| RPT-REF-21 | `referral.external_outgoing_referral_management` definition as specified: case filters, `effective_status`, columns, office band, `status_summary` block, sort options, deleted-case handling | P3 | M | RPT-REF-01, DATA-40, SEC-05, ENG-09, ENG-11, ENG-23 | Fixture with one case per status, one deleted and one pending case older than 30 days: every status checkbox selects exactly its cases, the old pending case is selected by `Expired`, the deleted case appears only with `exclude_deleted_referrals = false`; a caller without the referring office gets none of its cases |
| RPT-REF-22 | Outgoing referrals worklist: saved views "Open outgoing referrals" and "About to expire", `days_open` filter, row drill to the case record, task / SMS actions, `custom:referral_resend` hand-off to the referral feature | P3 | S | RPT-REF-21, ENG-49, ENG-28 | The open view lists only pending, accepted and in-progress cases; the resend action is refused when the feature handler is absent and is audited when present |
| RPT-REF-40 | `referral.referral_summary_report` definition: summary block with office band and type groups, guarded average, positive collection on the allocation join, optional grand total, title `Referral Summary` | P3 | M | DATA-40, DATA-19, DATA-06, DATA-20, ENG-11, ENG-23, RPT-REF-01, RPT-REF-07, MET-18 | Golden fixture with two offices, three sources, one `No Referral` patient and a refund: `#Ref`, production and collection per source equal hand-computed values; `Avg Production` empty when `#Ref` = 0; type total average = total production / total `#Ref`; production reconciles with `referral_source_production`; default run prints no grand total; with neither `referral_date` nor `first_visit_date` the run prints `referral_date_unavailable` |
| RPT-REF-41 | Referral Summary `Referral #` columns (`MTD`, `YTD`, `Last Year`) anchored on `date_to`, referral-date fallback to first visit with run warning | P3 | S | RPT-REF-40, DATA-40, DATA-19 | A run ending 2026-03-15 counts patients referred 2026-03-01..15, 2026-01-01..03-15 and in 2025; a migrated patient without `referral_date` is counted on its first visit date and the run prints `referral_date_from_first_visit` |
| RPT-REF-42 | `referral.referral_count_summary` definition with `count_basis` (`visit` default, `posted_procedure`, `kept_appointment`), `No Referred By` row, optional grand total | P3 | S | RPT-REF-01, RPT-REF-07, DATA-16, DATA-18, DATA-40 | A patient seen on three days counts once; a patient with only a kept appointment counts only under `kept_appointment`; a patient with only a contract instalment or a missed-appointment fee in the range is not counted under the default; per-type `Total :` equals the sum of its rows |
| RPT-REF-43 | `patient_detail` drill format for Referral Summary and Referral Count Summary and the `rows` drill from every count and money cell | P3 | S | RPT-REF-40, RPT-REF-42, ENG-30 | Every drilled list total equals the clicked number; the detail block refuses without `phi_identified`; summary runs stay byte-identical with the format absent |
| RPT-REF-44 | Source label class and grouping key: `referral_source_key` (id, normalised free text, none), rule-13 degrade to `source_type_label`, `source_categories` enhancement | P3 | S | RPT-REF-01, SEC-37, DATA-40 | A caller without `phi_identified` sees patient and free-text sources under their type label and the same totals; two app patients with `referred_by` " Source A" and "source a" fall in one row |
| RPT-REF-45 | `referral.internal_referral_management` definition: case rows with both offices and providers, Tx Status radio, deleted toggle, appointment columns, `Total Referrals` count | P3 | M | DATA-40, DATA-45, ENG-09, SEC-05, RPT-REF-01 | Each STATUSES option selects exactly its cases; a deleted case appears only with `exclude_deleted_referrals = false` and shows `Deleted`; with REFERRED TO = ALL a case sent from the working office to an office the caller cannot read is listed |
| RPT-REF-46 | Two-office readability for internal cases (08 S-13) and `all` as no predicate inside the readable set; `group_by` enhancement until the legacy GROUP BY is captured | P3 | S | SEC-05, SEC-37, RPT-REF-45 | A user of the receiving office reads cases addressed to it and no other office's; `referred_to_office_ids = all` never narrows the readable set; each `group_by` value prints its count line |
| RPT-REF-47 | `referral.external_incoming_referral_management` definition: receiving-office security scope and band, eight-status grid on `effective_status`, contact-status grid, prospect rows with Patient ID `N/A`, reason codes | P3 | M | DATA-40, ENG-09, SEC-05, FLT-09, RPT-REF-01, RPT-REF-08 | Each of the 8 statuses and 4 contact statuses selects exactly its cases; a pending case older than 30 days is selected by `Expired`; uncontacted cases under a contact-status list follow the null policy confirmed by RPT-REF-08 (interim: dropped) and `All` keeps them; a prospect case prints `N/A` and the keyed name; an empty grid answers 422 |
| RPT-REF-48 | Case-report enhancements: `appointment_states`, `min_days_open`, `contact_older_than_days`, `has_patient_record`, `referral_reason_codes`, `include_referred_work_posted`, saved views of both reports | P3 | S | RPT-REF-45, RPT-REF-47, FLT-09, DATA-16 | Each enhancement changes rows only when set; default runs equal the legacy runs; `referred_work_posted` is true for a fixture case whose code was posted by the referred-to provider after the referral date |
| RPT-REF-49 | Case worklists and row actions (book, register prospect, log contact, send referral report, SMS, task) on live paging for Internal and External Incoming | P4 | M | RPT-REF-09, ENG-48, ENG-49, RPT-REF-45, RPT-REF-47 | Actions resolve ids from the snapshot; SMS exclusions are counted; a logged contact removes the case from "To call today" on the next page load |
| RPT-REF-50 | Prior-period comparison and new-patient cohort on Referral Summary and Referral Count Summary (`compare_to`, `first_visit_date_*`) | P4 | S | FLT-26, RPT-REF-40, RPT-REF-42, DATA-19 | `compare_to = none` leaves the legacy columns unchanged; previous-year production of a source equals a separate run over the previous year |

<!-- ASSEMBLED from catalog/parts/refferal_reports/ (00_header.md, 10_reports_01_04.md, 20_reports_05_08.md). Edit this document directly from now on. -->
