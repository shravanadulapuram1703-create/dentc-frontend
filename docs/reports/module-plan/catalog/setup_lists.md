# Lists - Setup - report specifications

Print and export lists of the setup catalogs of the legacy `Setup List Reports` screen (20 reports, 67 legacy controls,
none added from vendor documentation; screen groups INSURANCE, PRESCRIPTION, PROCEDURE, FEE SCHEDULE, OFFICE, MISC): used
after setup or conversion, before clean-ups, at fee updates and for audits. Hub area **Lists**, tab `setup` (brief section
1; category key `lists`, `subcategory = setup`). Default phase **P3** for all 20; no report needs another phase (every
dataset is a P0 dimension, the P1 `rpt_fee_schedule_fees` or a P3 passthrough of DATA-45).

## Overview

Legacy screen order (the order of `legacy/index/setup_list_reports.controls.json`; report ids r01-r20 follow it). Size: S
up to 2 days, M up to 1 week (brief section 4). Availability = default-run rating of `coverage_matrix.md` 11.1 rows 94-113
(every row READY) with the caveat of its last column; this catalog rates r02 and r16 lower where a column has no storage, and asks for the matrix rows 96, 99, 111 and 113 to be corrected (RPT-STLIST-40, RPT-STLIST-14, RPT-STLIST-56, RPT-STLIST-60). Confidence = `research/legacy_report_outputs_lists.md` section 2 rows
21-40.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `lists.employer_list` | Employer List | Every employer of the employer database (which plans refer to), filtered by employer and state | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.insurance_plan_list` | Insurance Plan List | Every insurance plan (carrier + employer + group number) with created / modified stamps; doubles as a plan-entry change audit | P3 | M | READY (default run); Created By and the creator role of USER SCHEMA(1) until NEW `insurance_plans.created_by_user_id` (03, RPT-STLIST-41); creator / modifier are legacy strings on migrated plans | PARTIALLY DOCUMENTED |
| `lists.carrier_list` | Carrier List | Every carrier of the carrier database with address, phone and payer id, filtered by carrier and state | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.inactive_plans_list` | Inactive Plans List | Plans attached to no patient record (unused, not flagged inactive), for duplicate clean-up | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.drug_list` | Drug List | The prescription library (drug, dispense, sig, refills, offices) | P3 | S | READY (user is NULL on migrated drugs) | INFERRED |
| `lists.procedure_codes_list` | Procedure Codes List | The procedure code catalog with category, production type, insurance category and the tooth / surface / bill-to-insurance flags | P3 | S | READY (`PRODUCTION TYPE` and Bill to Insurance read DATA-04 columns, empty until filled in setup) | PARTIALLY DOCUMENTED |
| `lists.explosion_codes_list` | Explosion Codes List | Explosion codes (procedure shortcuts); Detail adds the member codes | P3 | S | READY | DOCUMENTED (Summary); Detail INFERRED |
| `lists.procedure_codes_by_fee_schedule` | Procedure Codes by Fee Schedule | The fees of one fee schedule at one effective date, per procedure code (the vendor's way to print a UCR or PPO schedule) | P3 | M | READY (code type by the DATA-04 default rule until reviewed) | PARTIALLY DOCUMENTED |
| `lists.credit_codes_report` | Credit Codes Report | Payment and adjustment codes with type, sub type, sign and class | P3 | S | READY (`CLASS` values beyond the seeded ones confirmed against the legacy setup screen, O-2) | PARTIALLY DOCUMENTED |
| `lists.fee_schedule_list` | Fee Schedule List | Fee schedule catalogue (name, type, effective date); content undocumented | P3 | S | READY | INFERRED |
| `lists.capitation_fee_schedule` | Capitation Fee Schedule | Managed-care (copay) schedules: per code the patient co-pay and plan amount | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.office_list` | Office List | Offices with identifiers, address, time zone, tax id, billing provider, group and default fee schedules | P3 | S | READY | INFERRED |
| `lists.office_holidays` | Office Holidays | Office (and account-wide) holidays that fall in a date range | P3 | S | READY (empty until configured: nothing migrated or seeded) | INFERRED |
| `lists.operatory_list` | Operatory List | Operatories (schedule columns) per office with order, default provider and status | P3 | S | READY | INFERRED |
| `lists.ada_categories_list` | ADA Categories List | ADA categories with code range and description (value list of every CATEGORY filter) | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.default_ins_plan_coverage_category_list` | Default Ins Plan Coverage Category List | Default coverage categories that seed new plans (key, %, description, frequency, age, waiting period) | P3 | S | READY (key, %, description where `DEFCOVERAGE` is seeded; Frequency from the built-in constant); Age Limitation, Waiting Period SCHEMA(2) (NEW storage, 03, RPT-STLIST-56) | PARTIALLY DOCUMENTED |
| `lists.document_types_list` | Document Types List | Document types (type code, description) | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.notes_macro_category_list` | Notes Macro Category List | Notes macro categories (description) | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.notes_macros_list` | Notes Macros List | Notes macros by category (name, availability, probably the template text) | P3 | S | READY | INFERRED |
| `lists.patient_types_list` | Patient Types List | Patient types (code, description, flash alert, block charges) | P3 | S | READY (`definitions` group `PATTYPE`; flash alert / block charges values on migrated rows unconfirmed) | PARTIALLY DOCUMENTED |

Report-id note: the task list that commissioned this catalog numbered the reports in another order (r02 Carrier List,
r12 Insurance Plan List, ...). The ids above and in the parity file are those of the controls index, which is the source of
the parity check; report keys are unchanged.

## Shared rules

### Shared parameters and defaults

Exactly as in `catalog/parity/setup_list_reports.parity.json` (PARITY VALID: 67 controls, 20 `replicated`, 43
`replicated_enhanced`, 4 `unknown_legacy`; 2 dynamic rules). Values are the legacy defaults (AD-8). Every key is a
parameter of `filter_card.md` section 3, except the report-specific keys that 04 already assigns (04 sections 2.5 and
15): `date_basis_set`, `include_user_in_filters`, `group_number` (r02), `procedure_code_types`, `fee_schedule_id`,
`fee_schedule_effective_date` (r08), `credit_code_type`, `credit_code_class` (r09), `note_macro_category_codes` (r19).
The family table below lists only the keys used by more than one report or carrying a family rule.

| Parameter (type) | Reports | Default | Family rule |
|---|---|---|---|
| `output_format` (`enum`: `pdf`, `xlsx`, added `csv`) | all 20 | `pdf` | `role: output`; never changes the rows; PRINT / PREVIEW shows the result on screen first, then renders the chosen format. Legacy Excel downloaded immediately; DentC keeps the on-screen preview (vendor-doc correction recorded on r06) |
| `office_scope` (`office_scope`) | r12 Office List, r13 Office Holidays, r14 Operatory List | `working_office`, mode `office` | Rule `setup_list_reports.r12.d01` holds for all three. Office attribution per report: table below |
| `office_scope` hidden (`visible_when false`, default `all`) | r08, r10, r11 | `all` | No legacy control. Office binding of fee schedules is expressed by `fee_schedule_assignments` and the offices' default / UCR pointers; `fee_schedules.office_id` is deprecated and NULL on every row (codes.py `FeeSchedule`), so until RPT-STLIST-20 decides the rule the hidden scope is a no-op and every readable schedule is listed and offered. 04 6.4 calls fee schedules "office-pinned": correction requested through RPT-STLIST-20 |
| none (`scope.office_mode = none`) | the other 14 | - | 04 6.4: employers, carriers, plans, drugs, codes, macros and types have no office column; the legacy screens have no office filter (procedure codes are global by design, vendor-doc correction r06) |
| `employer_ids` (`entity_multi`, `lookup:employers`) | r01, r02 | `all` | r01: the listed employer; r02: the plan's employer |
| `carrier_ids` (`entity_multi`, `lookup:carriers`) | r02, r03, r04 | `all` | r03: the listed carrier; r02 and r04: the plan's carrier |
| `state_codes` (`entity_multi`, `lookup:definitions:state`) | r01, r03 | `all` | Address state of the listed employer / carrier, normalised through `rpt_value_map` domain `state`; legacy single-select |
| `user_ids` (`entity_multi`, `lookup:users`) | r02, r05 | `all` | Role per report: r02 `plan_audit_user`, r05 `library_entry_user` (both NEW role values, owner 03 5.4, INFERRED). Migrated rows carry no user (r05) or only a legacy string (r02) and match only under `all`; the r02 creator branch matches app plans only after NEW `insurance_plans.created_by_user_id` (RPT-STLIST-41) |
| `procedure_category_codes`, `production_type_ids` (`entity_multi`) | r06, r08 | `all` | `rpt_procedure_code_dim.code_category` (global ADA category), `production_type_id` (NEW, DATA-04, NULL until filled; per tenant through NEW `tenant_procedure_codes`, below) |
| `procedure_code_status` (`enum`: `active`, `inactive`, `both`) | r06, r08 | `active` | `is_active` of the tenant's code settings (NEW `tenant_procedure_codes`, below). `coverage_matrix.md` row 99 says "Both statuses": not followed (legacy capture shows Active); correction of row 99 to `STATUS = Active` requested through RPT-STLIST-14 |
| `include_only_tooth_required`, `include_only_surface_required`, `include_only_bill_to_insurance` (`boolean`) | r06, r08 | `false` | `requires_tooth`, `requires_surface`, `bill_to_insurance` (NEW, DATA-04: a ticked Bill to Insurance run is empty until setup fills the flag; availability warning) |

Tenant code settings (NEW, owner `03_data_foundation.md`, DATA-04 extension, RPT-STLIST-05): `procedure_codes` is global (PK `code`, no `tenant_id`, data card 2.5) while `production_types` is a tenant catalog and the legacy STATUS, PRODUCTION TYPE and Bill to Insurance are account settings. The three bindings therefore read NEW `tenant_procedure_codes(tenant_id, procedure_code, is_active, production_type_id, bill_to_insurance, user_code)` through a tenant-scoped `rpt_procedure_code_dim` (NEW `tenant_id` column; a code without a tenant row falls back to the global `is_active` and NULL type / flag). If 03 decides DentC keeps one catalog per tenant instead, the bindings stay on the dimension unchanged (family open question 6).
| `fee_schedule_ids` (`entity_multi`) | r10, r11 | `all` | List filter; r11 restricted to `pricing_model = copay` in source and rows |
| `report_format` (`enum`: `summary`, `detail`) | r07 | `summary` | SUMMARY/DETAIL (sig0311); printed title `Explosion Codes List (Summary)` / `(Detail)` |
| `date_range` (`date_from`, `date_to`, `date_preset`) | r02, r13 | `today` / `today` | r02: basis chosen by `date_basis_set` (default `modified_date`); r13: fixed basis `holiday_date` (04 7.2 #36). Every legacy date box defaults to the current day (research 3.1) |

The four `unknown_legacy` controls carry a candidate value that the definition uses until the live check (FLT-23,
RPT-STLIST-09): `fee_schedule_id` and `fee_schedule_effective_date` (r08, candidate `first_option`, both required),
`credit_code_type` and `credit_code_class` (r09, default `all`, candidate lists in the parity notes bound to
`rpt_transaction_code_dim.code_kind` and `legacy_class`).

Family enhancement parameter (NEW, report-specific key of this catalog; 04 section 15 should own it):

| Key (type) | Reports | Default | Meaning | Parity guard |
|---|---|---|---|---|
| `catalog_status` (`enum`: `active`, `inactive`, `both`) | r03, r05, r09, r10, r11, r14, r17, r18, r20 (catalogs with an `is_active` column; not offered on r01 / r07 / r19, whose tables are hard-deleted (`code_bundles` has no `is_active`), on r16, whose builder serves only the active defaults a new plan receives, nor on read-only r15) | `both` | The legacy lists have no status control and no sample shows whether inactive rows print; `both` never hides a row the legacy run might print, and an `Active` column shows the state (no legacy control, so no `default_differs_reason`). Not offered on r06 / r08, which have the legacy STATUS radio | Changing it narrows only |

### Office attribution

None of the attributions of `data_card.md` 5.1 fits a setup list (they attribute transactions). Three NEW values for 03
section 5.1 (owner `03_data_foundation.md`; `operatory_office` is shared with `lists.provider_operatory`):

| Value (NEW) | Column | Report | Rule |
|---|---|---|---|
| `listed_office` | `rpt_office_dim.office_id` | r12 | The office row itself is in scope when its id is in the resolved set |
| `holiday_office` | `account_holidays.office_id` | r13 | Rows of the selected offices plus the account-wide rows (`office_id IS NULL`), printed under every selected office with scope `Account` (INFERRED: whether the legacy report includes enterprise holidays is unknown); an office row beats the account row of the same date |
| `operatory_office` | `operatories.office_id` | r14 | An operatory is in scope when its office is in the resolved set; `operatories` has no `tenant_id`, the handle scopes the tenant through `offices` |

Provider attribution: none (no report filters by provider; r14 prints the operatory's default provider as an attribute).
`scope.provider_restriction = none` on all 20.

### Datasets, freshness and cost

| Dataset | Kind (work item) | Reports | Phase |
|---|---|---|---|
| `employers` | passthrough (DATA-45) | r01, r02 (label), r04 (label) | P3 |
| `insurance_plans` | passthrough (DATA-45); r04 adds `NOT EXISTS` live (`is_active`) `patient_insurance` link on the plan | r02, r04 | P3 |
| `insurance_carriers` | passthrough (DATA-45) | r02 (label), r03, r04 (label) | P3 |
| `prescription_library` (+ `office_prescription_library`) | passthrough (DATA-45) | r05 | P3 |
| `rpt_procedure_code_dim` | view (DATA-04, DATA-05); tenant-scoped code settings through NEW `tenant_procedure_codes` (RPT-STLIST-05) | r06, r08, r15 | P0 |
| `explosion_codes` + `explosion_code_items`, `code_bundles` + `code_bundle_items` | passthrough (DATA-45) | r07 | P3 |
| `rpt_fee_schedule_fees` | view (DATA-51) | r08, r11 | P1 |
| `rpt_transaction_code_dim` | view (DATA-03) | r09 | P0 |
| `fee_schedules` | passthrough (DATA-45) | r10 | P3 |
| `rpt_office_dim` | view (DATA-05) | r12; office band and labels of r13, r14 | P0 |
| `account_holidays` | passthrough (DATA-45) | r13 | P3 |
| `operatories` | passthrough (DATA-45) | r14 | P3 |
| `definitions` (`DEFCOVERAGE`, `document_type`, `NOTESMACROS`, `PATTYPE`) | passthrough (DATA-45), one row per (`tenant_id`, `group_code`, `key1`) (03 3.7) | r16, r17, r18, r20; category labels of r19 | P3 |
| `note_macros` (+ `office_note_macros`) | passthrough (DATA-45) | r19 | P3 |

`freshness = live` for every definition; `cacheable = false` (setup edits must show at once). `cost_class = instant` for
all except r02 (`interactive`: about 31k plans, and a `group_number` contains-filter takes about 20 s through today's API)
and r08 (`interactive`: about 1,100 codes x one schedule version). None of these lists is historical: they show the setup
as it stands now; only r02 filters by created / modified dates. Explosion codes exist in two parallel DentC catalogs: the
legacy sample columns (`Exp. Code Short Descr`, `Exp. Code Descr`, `Default Same Tooth`) match `code_bundles`
(`display_code`, `name`, `same_tooth`), and migrated bundles land in `code_bundles` (`legacy_id`, unique per tenant); the report
reads `code_bundles`, open question 3 asks only whether `explosion_codes` also holds migrated rows.

### Population rules without a control

| Report | Rule | Source |
|---|---|---|
| r04 Inactive Plans List | "Inactive" = the plan has no live `patient_insurance` link: `NOT EXISTS (patient_insurance WHERE ins_plan_id = p.id AND is_active)` - INFERRED reading of the vendor's "not in use on any patient record", the rule of `GET /insurance-plans/{id}/usage`; enhancement `count_inactive_links_as_used = true` is the strict "any record" reading. Never `insurance_plans.is_active` (the analysis map `be_data_identity_setup.md` 5.3 says `is_active = false`: superseded by the vendor definition) | vendor-doc correction r04, research 8 |
| r08 | One schedule, one version; rows = codes passing the code filters joined to the entry of that version; codes without an entry print with an empty fee (INFERRED; confirm whether the legacy report drops them) | research 8 |
| r09 | Default TYPE = ALL, CLASS = ALL = the complete code list (vendor) | vendor-doc correction r09 |
| r15 | ADA categories are read-only system data: `code_category` with the code range derived from the member codes | research 8 |

### Sign conventions, sort and totals

Money appears only in r08 and r11 (fees: positive amounts as stored, `decimals 2`, no sign inversion; r11 prints
`patient_fee` and `insurance_fee`). r09 prints the code's `sign` (`+` / `-`) as text, never applied. Every report ends
with a row count (`Employers : n`, `Plans : n`, `Codes : n`, ...); no money totals (summing a fee list has no meaning).
Default sort: the natural key of the catalog (employer / carrier name, drug name, procedure code, explosion short code,
schedule name, office name, operatory display order, holiday date, type code), tie-breaker the row id. r02 sorts by
`sort_by` (legacy default `carrier`). The Explosion Codes sample is not alphabetical (creation order assumed): kept as an
open question, documented default is the short code.

### Page furniture

From `research/legacy_report_outputs_lists.md` 3.2 (the 2022 Explosion Codes sample is the only one of this family):

| Element | Rule |
|---|---|
| Header line 1 | Organisation (practice-group) name for the 17 account-wide lists; office name for r12 / r13 / r14 when the run resolves to one office |
| Header line 2 | Printed title = legacy name; r07 adds `(Summary)` / `(Detail)` via `title_templates[]`; r08 adds the schedule name and the effective date |
| Office band | r12-r14: `fixed_outer` level `office`, header `Office : {office_name}`, `when ["ctx", "multi_office"]` |
| Footer criteria echo | `criteria_echo = footer`: every non-empty criterion as `<Label> : <value or ALL>` (`Employer :`, `State :`, `Carrier :`, `Group # :`, `Created On / Modified On`, `From :` / `Thru :` in `M/D/YYYY`, `Users :`, `Category :`, `Status :`, `Fee Schedule :`, `Type :`, `Class :`, `Offices :` / `Office Group :`); enhancements after the legacy criteria |
| Tail | Title repeated, `Printed : <m/d/yyyy h:mm:ss AM/PM>` in office time, `By : <user>`, `Page : n of m`; DentC footer instead of the vendor copyright line |
| Orientation | Portrait, except r02 and r12 (landscape: many columns) |

### Rights and data classes

| Item | Rule |
|---|---|
| Right families (security card 2.3) | `lists_setup` = `reports_lists_setup_list_rpts_screen_full_cont` (Full Control only: any use needs it) on all 20, as an any-of with the old-screen family: r01 `lists_employer`; r12-r14 `lists_office`; r05 `lists_prescription`; r06-r11, r15 `lists_procedure_fee`. r02-r04, r16-r20 need `lists_setup` alone |
| Levels | View Only of an old-screen family = run and view; Full Control = also print / PDF; XLSX / CSV also need `reports_export_data_files` (08 2.1) |
| Column classes | `aggregate` for setup catalog content (08 5.1) on every report, with three exceptions below |
| Fees | r08, r11 fee columns `financial_practice` (fee schedules and UCR comparisons, 08 5.1); non-key: a caller without the class gets the code list without fees |
| Employer label | Employer name (r01 key column, r02 / r04 label) is `phi_identified` under 08 5.2 rule 13 (an employer can name a person or a small business). Without `phi_identified` the employer name is replaced by the neutral label `Employer`, which makes Employer List useless (every row reads `Employer`). Open question 1 asks 08 to class the setup employer catalog `aggregate` + `allow`, as already done for carriers |
| Audit columns | r02 `created_by_label`, `modified_by_label`, `created_on`, `modified_on` and the `user_ids` parameter: `user_activity` (08 5.2 rule 12, user on a row about a change); non-key |
| Patient manifest | None: no column identifies a patient |

### Family-wide enhancements

| Enhancement | Detail |
|---|---|
| Saved views and favorites | ADD TO MY FAVORITES = server-side saved view + favorite; relative date presets on r02 / r13 (`last_7_days`, `this_month`, `next_month`, `this_year`) |
| Status switch | `catalog_status` (above) |
| Changed-since columns | `created_at` / `updated_at` columns where the table has them (research 9 item 9: legacy has them only on r02), hidden by default in the column chooser |
| Record drill | Each row opens its setup screen (Employers, Carriers, Insurance Plan Details, Prescriptions, Procedure Codes, Explosion Codes, Fee Schedules, Office Setup, Operatories, Holidays, Definitions); `route_key` per report owned by 07, feature right in `drill_targets[].right_code` owned by 08 |
| Cross-report drill | r15 category row -> r06 with `procedure_category_codes`; r18 category row -> r19 with `note_macro_category_codes`; r10 schedule row -> r08 with `fee_schedule_id`; r03 carrier row -> r02 with `carrier_ids` and `date_basis_set = []` (no date restriction, 04 2.5 empty selection; without it r02's default `modified_date` today .. today would apply) |
| Data-quality hints | `availability[]` warnings: production type / bill-to-insurance / code type not filled (r06, r08), legacy-string users and `app_plan_creator_missing` (r02), `schedule_header_date_missing` (r10), no user on migrated drugs (r05), no holidays configured (r13), `DEFCOVERAGE` not seeded (r16) |
| Schedules | All 20 `schedulable = true` (no patient context); typical: r02 weekly "modified last 7 days" to the insurance coordinator, r13 yearly |
| Export selection | Bulk `export_selection` on every report (Full Control + `reports_export_data_files`) |

### Family-wide open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Is the setup employer catalog `aggregate` or `phi_identified` (08 5.2 rule 13)? | Decision of 08 |
| 2 | Do the lists print inactive rows (drives `catalog_status`)? | Inactivate a test carrier, drug and operatory on the live tool; run each list |
| 3 | The report reads `code_bundles` (migrated bundles carry `legacy_id`); does `explosion_codes` also hold migrated rows? | Count both tables on a migrated tenant (03) |
| 4 | Is the Excel output a flat table or the PDF layout in cells? | Export one list to Excel on the live tool |
| 5 | Row order of each list (the Explosion Codes sample is not alphabetical) | Run each list with three rows of different initials |
| 6 | Are procedure-code status, production type and Bill to Insurance per tenant (NEW `tenant_procedure_codes`) or does DentC keep one catalog per tenant? | 03 decision (DATA-04 extension, RPT-STLIST-05) |

## Employer List - `lists.employer_list`

Lists › Setup List › INSURANCE, screenshot `1.PNG` - P3 - S - any of `lists_setup`, `lists_employer` - instant - PARTIALLY DOCUMENTED (purpose documented `[P9]`, columns INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Insurance coordinator | Before `Consolidate Duplicate Insurance Plans` / employer clean-up; after a conversion | Find duplicate or misspelt employers (same name, different id) before plans are merged; the employer id feeds the consolidation utility `[P48][I]` |
| Office manager | On demand, audits | Print the employer database that insurance plans refer to (plan identity = group number + employer + carrier, research 3.5) |

### Legacy output

No sample, no field list (research 8, PARTIALLY DOCUMENTED). Vendor text: "all employers entered in the employer database"
`[P9]`. Reconstruction (INFERRED, comparable Dentrix Enterprise `Employers and Employed Patients Report` `[C1]`):

| Item | Reconstruction | Basis |
|---|---|---|
| Printed title | `Employer List` | menu name `[I]` |
| Header line 1 | Practice-group name (account-wide list) | family page furniture |
| Columns (order is a proposal) | `Employer ID`, `Employer Name`, `Address`, `City`, `State`, `Zip`, `Phone` | research 8 `[I]` |
| Grouping, subtotals | none | `[I]` |
| Total | `Employers : n` | family rule |
| Variants | none (no format / sort control) | `[L4]` |

Kept: one row per employer, no grouping. Deliberate fixes: deterministic sort `employer_name`, then `employer_id`; the two
address lines print separately (DentC stores `address` and `address2`, INS-PT-11). Not kept: nothing known.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| EMPLOYER | (no label) (picker) | shown: ALL | `employer_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL) becomes a searchable multi-select; ALL = no restriction; dialog content never captured - confirm whether the list shows every employer. Role on this report: the listed employer itself (employers.id IN (:employer_ids)), not the employer of a plan. Option source lookup:employers. employers is hard-deleted, so no inactive rows exist. |
| STATE | (no label) (dropdown) | shown: ALL | `state_codes` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed (only ALL known; value list never captured). Options from lookup:definitions:state. Filters employers.state (address state, free text) normalised to the USPS code through rpt_value_map domain state (03 3.7). ALL keeps employers without a state; a selected state drops them (null_policy drop). Legacy is single-select; a list is the enhancement. Which state the legacy list offers (all states or only states present in employer rows) is INFERRED - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF (`output_format = pdf`); rows unchanged |
| PRINT FORMAT `Excel` | Screen preview, then one flat XLSX sheet (`xlsx`); rows unchanged; `csv` added |
| EMPLOYER `ALL` (default) | `employer_ids = "all"`: no predicate, every employer of the tenant |
| EMPLOYER `SELECT` one or more employers | `employers.id IN (:employer_ids)`: only the listed employers themselves (not the employer of a plan) |
| STATE `ALL` (default) | `state_codes = "all"`: no predicate; employers without a state are listed |
| STATE one state | `rpt_value_map('state', employers.state) IN (:state_codes)`; employers with a blank or unmappable state are dropped (`null_policy drop`) |
| CLEAR CRITERIA | Every parameter back to its default |
| ADD TO MY FAVORITES | Saved view + favorite with the current criteria |

Dependency rules: none. EMPLOYER and STATE are independent (an employer picked outside the chosen state returns no row:
both predicates apply, AND).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `state_codes` multi-select | `all` | Several states at once (legacy single-select) |
| `employer_usage` (`enum`, NEW: `all`, `used`, `unused`) | `all` | `used` = referenced by at least one `insurance_plans.employer_id`; `unused` = referenced by none: the delete list after plan consolidation (`EXISTS` test, no join) |
| `include_usage_counts` (`boolean`, NEW) | `false` | Adds `plan_count` (plans naming the employer) and `subscriber_count` (distinct patients holding a `patient_insurance` slot on such a plan) |
| `duplicate_candidates_only` (`boolean`, NEW) | `false` | Only employers whose normalised name (`lower`, punctuation and `inc` / `llc` / `co` stripped) occurs more than once; sorted so duplicates sit together; adds hidden group key `name_key` |
| `employer_search` (`text`, NEW) | empty | Contains-match on name and city (the `GET /employers?search=` columns); never written to the URL (filter card 12) |

`catalog_status` is not offered: `employers` is hard-deleted (data card 3.6), every row is live.

### Data

| Item | Rule |
|---|---|
| Dataset | passthrough `employers` (DATA-45; family item RPT-STLIST-02), tenant-scoped on `employers.tenant_id` |
| Columns used | `id`, `legacy_id`, `name`, `address`, `address2`, `city`, `state`, `zip`, `phone`, `contact_person`, `salesrep`, `created_by`, `updated_by`, `created_at`, `updated_at` |
| Usage counts | `insurance_plans.employer_id` (count) and `patient_insurance` on those plans (count distinct patient); computed in one grouped sub-select joined on `employer_id` (unique per employer row) |
| Office / provider | `scope.office_mode = none`; no provider attribution |
| Date basis | none (`date_basis = null`; current state) |
| `employer_ids` | `employers.id IN (...)`, option source `lookup:employers` |
| `state_codes` | `rpt_value_map` domain `state` (03 3.7) over free-text `employers.state` |
| Availability | READY (coverage matrix row 94). `created_at` on migrated rows is the migration time; `created_by` / `updated_by` NULL on migrated rows: the changed-since columns are meaningful only for app-era edits (availability entry `migrated_stamps`) |

### Output

One format `standard`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `employer_id` | Employer ID | `id` | `aggregate` | `row_id_column`; drill key |
| `legacy_id` | Legacy ID | `text` | `aggregate` | `default_visible = false` |
| `employer_name` | Employer Name | `text` | `phi_identified` (08 5.2 rule 13; family open question 1) | `count`, label `Employers :` |
| `address` | Address | `text` | `aggregate` | - |
| `address2` | Address 2 | `text` | `aggregate` | `null_display` empty |
| `city` | City | `text` | `aggregate` | - |
| `state` | State | `text` | `aggregate` | - |
| `zip` | Zip | `text` | `aggregate` | - |
| `phone` | Phone | `text` | `aggregate` | - |
| `contact_person` | Contact | `text` | `aggregate` | `default_visible = false` |
| `salesrep` | Sales Rep | `text` | `aggregate` | `default_visible = false` |
| `plan_count` | Plans | `integer` | `aggregate` | `visible_when ["truthy", "include_usage_counts"]`; `sum` |
| `subscriber_count` | Patients | `integer` | `aggregate` | `visible_when ["truthy", "include_usage_counts"]`; no total (a patient can be on plans of two employers) |
| `created_at`, `updated_at` | Created, Modified | `datetime` (`tz office`) | `aggregate` | `default_visible = false` (family changed-since columns) |
| `name_key` | - | `text` | `phi_identified` | hidden; group key of `duplicate_candidates_only` |

| Item | Rule |
|---|---|
| Group levels | none; with `duplicate_candidates_only` one level on `name_key`, header `{employer_name}`, subtotal `count` `Duplicates :` |
| Sort | `default_sort`: `employer_name` asc, `employer_id` asc |
| Page break | none |
| Summary header | Block totals only: employers listed; with usage counts, employers with no plan (no metric keys) |

### Visuals and drill-through

Chart: none - a list. Drill: employer row → record `employer` (Setup › Insurance › Employers, `route_key` owned by 07);
`plan_count` cell → `lists.insurance_plan_list` with `employer_ids = {"column": "employer_id"}`, `date_basis_set = []`
(no date restriction; literal), `sort_by = employer`.

### Actions

| Key | Scope | Kind | Note |
|---|---|---|---|
| `open_employer` | row | `navigate` | Employer setup record |
| `export_selection` | bulk | `export_selection` | Family action; Full Control + `reports_export_data_files` |

Worklist use: with `employer_usage = unused` or `duplicate_candidates_only` the list is the employer clean-up worklist;
merging stays a Utilities feature (no merge action from the report).

### Export and print

PDF portrait, `banded_table`, header practice-group name + title, footer criteria echo `Employer :`, `State :`, tail per
family. XLSX one sheet `Employer List`, frozen header, autofilter, criteria sheet. CSV main block. Never background (a
tenant holds hundreds to a few thousand employers).

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns and their order (employer id printed? contact person?) | Run on the live tool |
| 2 | Does the STATE dropdown list every US state or only states present on employers? | Open the dropdown on the live tool |
| 3 | Class of the employer name (`phi_identified` per rule 13 replaces every name by the neutral label `Employer` for callers without it) | Family open question 1 (08) |

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

<!-- PARITY:setup_list_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| SORT BY | (no label) (radio_group) | **Carrier** / Employer | `sort_by` | enum | Carrier -> `carrier`, Employer -> `employer` | `carrier` | replicated | Sort and probably outer grouping key (INFERRED, research 8 Insurance Plan List): carrier = carrier name, then employer name, group number, plan id; employer = employer name, then carrier name, group number, plan id. Whether the legacy print also bands by the chosen key must be confirmed on the live tool. |
| DATE RANGE | Created On (checkbox) | **unchecked** | `date_basis_set.created_date` | enum_multi | - | `false` | replicated | Member created_date of date_basis_set (enum_multi, min_items 0, full_selection predicate; 04 2.5). Ticked: date_from / date_to apply to the plan's created date = office-local date of insurance_plans.created_at for app rows, the legacy created_on value for migrated rows (created_at holds the migration time; 04 3.10). Both members ticked = created OR modified in the range; none ticked = no date restriction (both readings INFERRED, 04 11.5 - confirm on the live tool). |
| DATE RANGE | Modified On (checkbox) | **checked** | `date_basis_set.modified_date` | enum_multi | - | `true` | replicated | Member modified_date of date_basis_set (legacy default ticked). Ticked: the range applies to the plan's last-modified date = office-local date of insurance_plans.updated_at when updated_by IS NOT NULL (edited in DentC), else the legacy modified_on, else the created date (updated_at holds the migration time on every unedited migrated plan, TimestampMixin). Both ticked = created OR modified in the range; none ticked = no date restriction (INFERRED, 04 11.5). Open question: with this default the legacy-default run lists only plans modified today, unless the greyed Start / End boxes mean the range is not applied (see r02.s03.c03). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 - greyed out | `date_from` | date_range | - | `today` | replicated_enhanced | Enabled when: unknown - enabled in every state until the legacy driver is read on the live tool (04 9.3 #51: captured grey while Modified On was ticked, so the checkbox pair is not the driver). Primary date range start (date_range = date_from, date_to, date_preset); basis chosen by date_basis_set (04 2.4). Default today in the office time zone (relative token); enhanced with presets. Captured GREY although Modified On is ticked: the legacy driver is unknown (04 9.3 #51) - it may be a read-only box filled through the calendar icon, or a range that is ignored in this state. Confirm on the live tool whether a default run (Modified On, today..today) filters at all. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 - greyed out | `date_to` | date_range | - | `today` | replicated_enhanced | Enabled when: unknown - enabled in every state until the legacy driver is read on the live tool (04 9.3 #52, same as Start Date). Primary date range, inclusive end, office-local. Default today (relative token); enhanced with presets. Captured GREY although Modified On is ticked (04 9.3 #52): confirm the driver and whether the range applies by default on the live tool. |
| EMPLOYER | (no label) (picker) | shown: ALL | `employer_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Role on this report: the employer of the plan (insurance_plans.employer_id IN (:employer_ids)); plans without an employer are kept under ALL and dropped by a selection. Option source lookup:employers. Part of the plan identity group number + employer + carrier (vendor-doc correction). |
| USER | Include User in Filters (checkbox) | **checked** | `include_user_in_filters` | boolean | - | `true` | replicated | Gate of user_ids (04 2.4, 9.6 #7): ticked = the USER picker is part of the filter; unticked = user_ids is replaced by its disabled_value all (no user predicate). Legacy default ticked with USER = ALL, so the default run has no user restriction either way. |
| USER | (no label) (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Enabled when: include_user_in_filters == true (inferred). Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. User role on this report (INFERRED, research 8): plan_audit_user (NEW role value, owner 03 5.4) = the user who created the plan when only created_date is in date_basis_set, who last modified it when only modified_date is, either of the two when both or neither are ticked. Columns: modifier = updated_by (FK users.id), else the legacy modified_by string; creator = the legacy created_by string on migrated plans; app-created plans carry no creator stamp (created_by is a text column that CRUDBase.create does not fill), so the creator role matches app plans only after NEW insurance_plans.created_by_user_id (03, RPT-STLIST-41) lands - availability app_plan_creator_missing until then. Legacy strings match only under ALL (04 3.10). Open: whether unticking Include User in Filters disables the picker or only drops its predicate (supplement unresolved r02). Data class of the parameter: user_activity (08 5.2 rule 12, user on a row about a change). |
| CARRIER | (no label) (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Role on this report: the carrier of the plan (insurance_plans.carrier_id IN (:carrier_ids)). Option source lookup:carriers, active and inactive carriers. Dialog content never captured - confirm whether inactive carriers are listed. |
| GROUP # | (no label) (text_input) | (empty) | `group_number` | text | - | - | replicated | Free-text GROUP # box, default empty = no restriction. Match rule not documented: exact or partial. DentC binds it as a case-insensitive contains match on insurance_plans.group_number (INFERRED; the existing API filter group_number_contains takes about 20 s on 31k plans, so the dataset needs a trigram index - RPT-STLIST-03). Confirm exact versus partial match on the live tool. text values are never written to the URL (04 12). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r02:END -->

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
| Neither ticked | No date restriction (INFERRED, 04 11.5); Start / End Date stay enabled until the live check (04 9.3 #51 / #52) |
| Start Date (default today) | Inclusive lower bound, office-local date of the working office |
| End Date (default today) | Inclusive upper bound |
| EMPLOYER `ALL` (default) | No employer predicate; plans without an employer kept |
| EMPLOYER selection | `insurance_plans.employer_id IN (...)`; plans without an employer dropped |
| USER `Include User in Filters` ticked (default) | USER picker applies |
| USER `Include User in Filters` unticked | `user_ids` replaced by its `disabled_value` `all` (no user predicate); whether the legacy picker is also greyed is open question 8 |
| USER `ALL` (default) | No user predicate |
| USER selection | Plans whose creator (Created On only), modifier (Modified On only) or either (both / neither) is a selected user; migrated legacy-string users match only under `ALL` |
| CARRIER `ALL` (default) | No carrier predicate |
| CARRIER selection | `insurance_plans.carrier_id IN (...)` |
| GROUP # empty (default) | No predicate |
| GROUP # text | Case-insensitive contains match on `group_number` (INFERRED: exact versus partial to confirm) |

Dependency rules: `date_from`, `date_to` enabled in every state (`unknown`, 04 9.3 #51 / #52: the boxes were captured grey
while Modified On was ticked, so the checkbox pair is not the driver); `user_ids` `enabled_when ["truthy",
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
| Modified date | `updated_by IS NOT NULL` (edited in DentC): `updated_at` office-local; else `modified_on::date`; else (app plan never edited) the created date. Not `coalesce(updated_at, modified_on)`: `updated_at` holds the migration time on every unedited migrated plan, so that rule would mark every migrated plan "modified on the migration day" |
| Created by | Migrated: `created_by` (legacy string). App: **no stamp exists** - `CRUDBase.create` writes an actor only into integer `created_by` columns and this one is text [V `app/crud/base.py` L244-247]; the creator is only in `audit_logs`. NEW `insurance_plans.created_by_user_id` stamp plus backfill from the create audit event (RPT-STLIST-41) |
| Modified by | `updated_by` -> `rpt_user_dim.user_label`, else `modified_by` (legacy string) - same rule as `GET /insurance-plans/{id}/history` [V `insurance_plan_edit_service.py` L466-469] |
| `user_ids` | `plan_audit_user` role (header): `created_by_user_id` / `updated_by` `IN (:user_ids)` per `date_basis_set`; legacy strings never match a selection |
| `group_number` | `group_number ILIKE '%' || :v || '%'` on a trigram index (RPT-STLIST-03; today's `group_number_contains` takes about 20 s on 31k plans) |
| Usage | `used` = `EXISTS (patient_insurance WHERE ins_plan_id = plan AND is_active)` - the rule of `GET /insurance-plans/{id}/usage` [V `insurance_plan_edit_service.py` L121-126] |
| Scope | `scope.office_mode = none` (plans are tenant catalog rows); no provider attribution; `date_basis` null (basis chosen by `date_basis_set`) |
| Availability | READY for the default run; `created_by_label` and the creator branch of `user_ids` SCHEMA(1) for app-created plans until NEW `insurance_plans.created_by_user_id` (owner `03_data_foundation.md`, DATA-45 extension, RPT-STLIST-41) lands. `coverage_matrix.md` row 96 says READY: correction requested through RPT-STLIST-40. `availability[]`: `legacy_plan_users` (migrated creator / modifier printed as legacy text, not selectable); `app_plan_creator_missing` until RPT-STLIST-41 |
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
| `patient_count` | `report` `lists.patient_list_grouped_by` with `report_by = insurance_plan` and `insurance_plan_ids = [{"column": "plan_id"}]` - pending NEW parameter `insurance_plan_ids` (`entity_multi`, `lookup:insurance_plans`, the plan of the patient slot; owner `04_filter_framework.md` 3.5; to be added as an enhancement parameter of `lists.patient_list_grouped_by`); needs `phi_identified`. Not built until the parameter exists |
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
| 8 | Does unticking Include User in Filters grey the USER picker, or only drop its predicate (supplement unresolved r02)? | Live tool |

## Carrier List - `lists.carrier_list`

Lists › Setup List › INSURANCE, screenshot `3.PNG` - P3 - S - `lists_setup` - instant - PARTIALLY DOCUMENTED (purpose documented `[P9]`, columns INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Insurance coordinator, billing office | After conversion; before `Consolidate Duplicate Carriers`; when e-claims reject for a payer id | Review every carrier with address, phone and payer id; carrier ids feed the consolidation utility (`Old Carrier ID` → new) `[P48]` |
| Office manager | Audits, clearinghouse enrolment | Payer-id and claim-format completeness |

### Legacy output

No sample (PARTIALLY DOCUMENTED). Reconstruction (INFERRED, research 8; plan document prints a carrier as `ID#`, name,
address, phone `[P47·img]`; Dentrix Enterprise `Insurance Carrier List` adds claim format and payor id `[C1]`):

| Item | Reconstruction |
|---|---|
| Printed title | `Carrier List` |
| Header line 1 | Practice-group name |
| Columns (proposal) | `Carrier ID`, `Carrier Name`, `Address`, `City`, `State`, `Zip`, `Phone`, `Payer ID`, `Claim Type` (electronic / paper) |
| Grouping | none |
| Total | `Carriers : n` |
| Quirk | Legacy carriers can have several claim-submission addresses `[P9]`; DentC stores one address per carrier: the list prints that one (open question 2) |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| CARRIER | (no label) (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Role on this report: the listed carrier itself (insurance_carriers.id IN (:carrier_ids)), not the carrier of a plan or claim. Option source lookup:carriers, active and inactive. Dialog content never captured - confirm whether inactive carriers are listed and printed. |
| STATE | (no label) (dropdown) | shown: ALL | `state_codes` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed (only ALL known). Options from lookup:definitions:state. Filters insurance_carriers.state (main address of the carrier record) normalised to the USPS code (rpt_value_map domain state, 03 3.7). Legacy: one carrier can have several claim-submission addresses - which address state the legacy filter reads is INFERRED (main address assumed); confirm on the live tool. ALL keeps carriers without a state. Legacy single-select; a list is the enhancement. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); preview first; rows unchanged |
| CARRIER `ALL` (default) | `carrier_ids = "all"`: every carrier of the tenant, active and inactive (see `catalog_status`) |
| CARRIER `SELECT` carriers | `insurance_carriers.id IN (:carrier_ids)`: the listed carriers themselves |
| STATE `ALL` (default) | No predicate; carriers without a state listed |
| STATE one state | `rpt_value_map('state', insurance_carriers.state) IN (:state_codes)`; blank state dropped |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view + favorite |

Dependency rules: none; CARRIER and STATE combine with AND.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `catalog_status` (family) | `both` | `active` / `inactive` / `both` on `insurance_carriers.is_active` |
| `state_codes` multi-select | `all` | Several states |
| `carrier_insurance_types` (`enum_multi`, NEW: `dental`, `medical`, `unknown`; `full_selection no_predicate`) | all ticked | Filters `insurance_carriers.insurance_type` normalised to dental / medical; `unknown` = NULL |
| `carrier_data_gaps` (`enum_multi`, NEW: `payer_id`, `address`, `phone`; `min_items` 0, `predicate`) | empty = no restriction | Carriers missing at least one ticked field: the e-claim readiness worklist |
| `include_usage_counts` (`boolean`, NEW) | `false` | Adds `plan_count` and `subscriber_count` (as on Employer List) and `unused_plan_count` (NEW: plans of the carrier with no live `patient_insurance` link, the r04 rule) |
| `carrier_usage` (`enum`, NEW: `all`, `used`, `unused`) | `all` | Carriers with / without any plan: consolidation candidates |

### Data

| Item | Rule |
|---|---|
| Dataset | passthrough `insurance_carriers` (DATA-45), tenant-scoped |
| Columns used | `id`, `legacy_id`, `name`, `carrier_type`, `insurance_type`, `payer_id`, `national_id`, `claim_type`, `phone`, `phone2`, `fax`, `email`, `address`, `address2`, `city`, `state`, `zip`, `website`, `contact`, `is_active`, `created_on`, `created_by`, `modified_on`, `modified_by` (legacy strings), `updated_at`, `updated_by` |
| Changed-since | `modified_on` (legacy) coalesced with `updated_at` (app) as `modified_at`; `created_on` coalesced with `created_at` as `created_at_effective`; user = `updated_by` label, else legacy `modified_by` string |
| Office / provider | none (`office_mode = none`) |
| Usage counts | `insurance_plans.carrier_id` grouped sub-select; patients through `patient_insurance` |
| Availability | READY (row 95). `claim_type` and `payer_id` are as migrated; no second claim address exists in DentC |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `carrier_id` | Carrier ID | `id` | `aggregate` | `row_id_column` |
| `legacy_id` | Legacy ID | `text` | `aggregate` | `default_visible = false` |
| `carrier_name` | Carrier Name | `text` | `aggregate` | `count`, `Carriers :` |
| `address`, `address2`, `city`, `state`, `zip` | Address, Address 2, City, State, Zip | `text` | `aggregate` | - |
| `phone` | Phone | `text` | `aggregate` | - |
| `phone2`, `fax`, `email`, `website`, `contact` | Phone 2, Fax, E-mail, Web, Contact | `text` | `aggregate` | `default_visible = false` |
| `payer_id` | Payer ID | `text` | `aggregate` | `count` non-null, `With Payer ID :` |
| `national_id` | National ID | `text` | `aggregate` | `default_visible = false` |
| `claim_type` | Claim Type | `text` | `aggregate` | - |
| `insurance_type` | Dental / Medical | `enum` | `aggregate` | `default_visible = false` |
| `is_active` | Active | `boolean` | `aggregate` | `count` false, `Inactive :` |
| `plan_count`, `subscriber_count` | Plans, Patients | `integer` | `aggregate` | `visible_when ["truthy", "include_usage_counts"]`; `sum` on `plan_count` only |
| `unused_plan_count` | Unused Plans | `integer` | `aggregate` | `visible_when ["truthy", "include_usage_counts"]`; `sum` |
| `created_at_effective`, `modified_at`, `modified_by_label` | Created, Modified, Modified By | `datetime`, `datetime`, `text` | `aggregate` (operational label, 08 5.2 rule 12: not a change log here) | `default_visible = false` |

| Item | Rule |
|---|---|
| Groups | none |
| Sort | `carrier_name`, `carrier_id` |
| Summary header | carriers listed, without payer id, inactive (block totals) |

### Visuals and drill-through

Chart: none. Drill: row → record `insurance_carrier` (Setup › Insurance › Carriers); `plan_count` → family cross-report
drill `lists.insurance_plan_list` with `carrier_ids = {"column": "carrier_id"}`, `date_basis_set = []`, `sort_by = carrier`;
`unused_plan_count` (a carrier that has unused plans) → `lists.inactive_plans_list` with the same `carrier_ids`.

### Actions

`open_carrier` (row, `navigate`), `export_selection` (bulk). Worklist: with `carrier_data_gaps` = `payer_id` the list is the
payer-id clean-up worklist.

### Export and print

PDF portrait (the default 9 columns fit at 8 pt), footer echo `Carrier :`, `State :`; XLSX one sheet `Carrier List`; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns (payer id and claim type printed?) | Live run |
| 2 | Which address the legacy list and its STATE filter use when a carrier has several claim addresses | Carrier with two addresses on the live tool |
| 3 | Are inactive carriers listed (`catalog_status` default) | Family open question 2 |

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

<!-- PARITY:setup_list_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| CARRIER | (no label) (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Role: the carrier of the unused plan (insurance_plans.carrier_id). Population rule without a control (vendor-doc correction): Inactive = plans attached to no patient record (no live patient_insurance row: NOT EXISTS patient_insurance WHERE ins_plan_id = plan AND is_active - INFERRED, the rule of GET /insurance-plans/{id}/usage; enhancement count_inactive_links_as_used = true is the strict any-record reading; insurance_subscribers references not counted, to confirm), not insurance_plans.is_active = false. Option source lookup:carriers. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r04:END -->

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
| Population | `NOT EXISTS (SELECT 1 FROM patient_insurance pi WHERE pi.ins_plan_id = p.id AND pi.is_active)` - same test as the "Patients" figure of `GET /insurance-plans/{id}/usage`, so the list agrees with "Not Used" in plan setup. INFERRED reading of the vendor's "not in use on any patient record" (the same rule as the shared population rule and the parity note); `count_inactive_links_as_used = true` is the strict "any record" reading (open question 2) |
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

None - a list. Row -> `record` Insurance Plan Details. `claim_count` -> `report` `insurance.claims_list` with
`insurance_plan_ids = [{"column": "plan_id"}]` - pending NEW parameter `insurance_plan_ids` (`entity_multi`,
`lookup:insurance_plans`, the plan of the claim; owner `04_filter_framework.md` 3.5; to be added as an enhancement parameter of
`insurance.claims_list`); needs `phi_identified`; not built until the parameter exists. Carrier -> `lists.insurance_plan_list`
with `{"carrier_ids": [{"column": "carrier_id"}], "plan_usage_status": "unused", "date_basis_set": []}` (the empty basis
set removes r02's default modified-today range).

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
| 2 | Does a plan still on an inactive patient (or a removed slot) count as used; does a subscriber-only reference (`insurance_subscribers.ins_plan_id`) count as use? | Live tool: remove a plan from a test patient and run; attach a plan to a subscriber only |
| 3 | Are plans referenced only by claims listed? | Live tool |
| 4 | Product: should DentC offer the deactivate action from the report or only from plan setup? | Product owner |

## Drug List - `lists.drug_list`

Lists › Setup List › PRESCRIPTION, screenshot `5.PNG` - P3 - S - any of `lists_setup`, `lists_prescription` - instant - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, lead dentist | After prescription setup, at periodic formulary review | Review the prescription library (drug, dispense, sig, refills) that the Prescriptions screen offers; remove duplicates and outdated entries |
| Compliance | Audit | Which drugs are offered in which office (`Add To All Offices` or office assignment `[P49]`) |

### Legacy output

INFERRED (no sample, no description; the old `Prescription/Drug List` screen held `Prescription Detail` and `Drug List`
`[P49·img]`). The neighbour `Prescription Detail` prints `Drug Name`, `Dispense`, `Sig`, `Dispense as written`, `Refill`,
`Created By` with a `Prescription Note:` sub-row; the catalogue list uses the same column names (research 8):

| Item | Reconstruction |
|---|---|
| Printed title | `Drug List` |
| Columns | `Drug Name`, `Dispense`, `Sig`, `Refill`, `Dispense as written`, `Offices`; sub-row `Prescription Note:` |
| Total | `Total Drugs : n` (patterned on `Total Prescriptions : n`) |
| Grouping | none |

Known gap: DentC `prescription_library` has no prescription-note column; the sub-row is not produced (open question 2).
The USER relation is undocumented (research open question 6).

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| USER | (no label) (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. User relation is NOT documented (research open question 6, supplement unresolved r05): DentC binds the role library_entry_user (NEW role value, owner 03 5.4) = prescription_library.created_by or updated_by IN (:user_ids) (INFERRED). created_by / updated_by are NULL on every migrated drug, so migrated rows match only under ALL. Confirm on the live tool whether USER means created-by, modified-by or user-specific drugs. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| USER `ALL` (default) | `user_ids = "all"`: every drug, migrated ones included |
| USER `SELECT` users | Role `library_entry_user` (NEW, INFERRED): `prescription_library.created_by IN (:user_ids) OR updated_by IN (:user_ids)`. Migrated drugs (both NULL) never match a selection |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

Dependency rules: none.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `catalog_status` (family) | `both` | `prescription_library.is_active` |
| `drug_office_ids` (`entity_multi`, NEW, `lookup:offices`) | `all` | Drugs available in the selected offices: assigned through `office_prescription_library` or unassigned (= whole catalogue, "unassigned = whole catalog" rule of `get_effective`) |
| `updated_date_range` (`date_range`, NEW, presets) | none (no restriction) | `prescription_library.updated_at` in range: "what changed in the library this quarter" (app-era only) |
| `allergy_conflict_keys` (`entity_multi`, NEW, `lookup:medical_alerts`) | `all` | Drugs whose `allergy_keys` contain a selected key: check the MA-5 conflict set |
| `duplicate_candidates_only` (`boolean`, NEW) | `false` | Drugs whose `lower(btrim(drug_name))` + `dispense` + `sig` occur more than once (RX-4 duplicate residue) |

### Data

| Item | Rule |
|---|---|
| Dataset | passthrough `prescription_library` (+ `office_prescription_library`, DATA-45) |
| Columns used | `id`, `legacy_id`, `drug_name`, `dispense`, `sig`, `refills`, `is_as_written`, `is_active`, `allergy_keys`, `created_by`, `updated_by`, `created_at`, `updated_at` |
| Offices column | `string_agg(office_name)` of `office_prescription_library` rows ordered by office name; no row = `All Offices` |
| Users | `rpt_user_dim` labels of `created_by` / `updated_by` (`user_key = 'u:' + id`) |
| Office / provider | `office_mode = none` (catalogue); `drug_office_ids` is an attribute filter, not a scope |
| Availability | READY (row 98) with warning `no_user_on_migrated_rows`: `created_by` / `updated_by` NULL on every migrated drug; a USER selection lists app-era entries only |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `drug_id` | ID | `id` | `aggregate` | `row_id_column` |
| `drug_name` | Drug Name | `text` | `aggregate` (setup catalogue, not a patient prescription) | `count`, `Total Drugs :` |
| `dispense` | Dispense | `text` | `aggregate` | - |
| `sig` | Sig | `text` | `aggregate` | wraps |
| `refills` | Refill | `integer` | `aggregate` | - |
| `is_as_written` | Dispense as written | `boolean` (`Yes` / `No`) | `aggregate` | - |
| `office_names` | Offices | `text` | `aggregate` | - |
| `is_active` | Active | `boolean` | `aggregate` | `count` false, `Inactive :` |
| `allergy_keys` | Allergy Conflicts | `text` | `aggregate` | `default_visible = false` |
| `created_by_label`, `modified_by_label` | Created By, Modified By | `text` | `aggregate` | `default_visible = false`; `null_display` `-` |
| `created_at`, `updated_at` | Created, Modified | `datetime` | `aggregate` | `default_visible = false` |

Sort: `drug_name`, `dispense`, `drug_id`. No groups. Summary: drugs listed, inactive.

### Visuals and drill-through

Chart: none. Drill: row → record `prescription_library_entry` (Setup › Prescriptions). Neighbour report `Prescription
Detail` (patient prescriptions) is not part of this catalogue (it stayed in `Reports (Old)`); no drill to patient rows.

### Actions

`open_drug` (row), `export_selection` (bulk). Worklist: `duplicate_candidates_only` = the RX-4 de-duplication list.

### Export and print

PDF portrait, `Sig` column widest (relative width 3); footer echo `Users :`; XLSX one sheet; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | What USER means (created by, modified by, or user-specific drugs) | Run with one user on the live tool (family RPT-STLIST-09) |
| 2 | Does the list print the prescription note; if so DentC needs `prescription_library.prescription_note` (NEW, 03) | Live sample |
| 3 | Is the offices column printed | Live sample |

## Procedure Codes List - `lists.procedure_codes_list`

Lists › Setup List › PROCEDURE, screenshot `6.PNG` - P3 - S - any of `lists_setup`, `lists_procedure_fee` - instant - PARTIALLY DOCUMENTED (every criterion documented `[P41]`, columns INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager | Annual CDT update, after conversion | Review the code catalogue: categories, active state, tooth / surface requirements |
| Insurance coordinator | Plan setup | See which codes fall in which insurance coverage category (vendor use `[P26]`) |
| Scheduler lead | Production-type setup | Check every code carries its scheduler production type |

### Legacy output

PARTIALLY DOCUMENTED. Legacy name `Procedure Code List` `[P43·img]`. Columns reconstructed from the `Setup > Procedure
Codes` fields `[P42]` (INFERRED order):

| # | Header | Content |
|---|---|---|
| 1 | `Code` | procedure code |
| 2 | `Description` | |
| 3 | `ADA Category` | ADA category of the code |
| 4 | `User Code` | practice's own code (DentC: no column; see Data) |
| 5 | `Scheduler Production Type` | production type |
| 6 | `Insurance Category` | coverage category (documented as discoverable here `[P26]`) |
| 7 | tooth / surface required | flags |
| 8 | bill to insurance | flag |
| 9 | active | flag |

Grouping and totals unknown; `Codes : n` added. No office filter by design (codes are global to the account `[P42]`).

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| CATEGORY | (no label) (dropdown) | shown: ALL | `procedure_category_codes` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed (only ALL known). Codes of one ADA category (vendor-doc correction): rpt_procedure_code_dim.code_category IN (:procedure_category_codes) (12 ADA labels plus Medical, Account). Option source lookup:procedure_categories (GET /procedure-code-categories). ALL = every category, codes without a category kept. Legacy single-select; a list is the enhancement. Confirm the value list on the live tool. |
| PRODUCTION TYPE | (no label) (dropdown) | shown: ALL | `production_type_ids` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed (only ALL known). Codes of one scheduler production type (vendor-doc correction): rpt_procedure_code_dim.production_type_id IN (:production_type_ids). The column is NEW (DATA-04) and NULL until filled in setup, so a selected type returns no code until the office maps its codes; ALL keeps every code. Option source lookup:production_types. Legacy single-select; a list is the enhancement. Code settings are per tenant: bound through the tenant-scoped rpt_procedure_code_dim over NEW tenant_procedure_codes (03, DATA-04 extension, RPT-STLIST-05), because procedure_codes is global (no tenant_id). |
| STATUS | (no label) (radio_group) | **Active** / Inactive / Both | `procedure_code_status` | enum | Active -> `active`, Inactive -> `inactive`, Both -> `both` | `active` | replicated | Status of the procedure code: rpt_procedure_code_dim.is_active. Legacy default Active (screenshot). coverage_matrix.md row 99 names 'Both statuses' as the default basis; that contradicts the captured default and is not followed - correction of coverage_matrix.md row 99 to 'STATUS = Active' requested through RPT-STLIST-14. Code settings are per tenant: bound through the tenant-scoped rpt_procedure_code_dim over NEW tenant_procedure_codes (03, DATA-04 extension, RPT-STLIST-05), because procedure_codes is global (no tenant_id). |
| OTHER OPTIONS | Include Only Tooth Required (checkbox) | **unchecked** | `include_only_tooth_required` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Only Surface Required (checkbox) | **unchecked** | `include_only_surface_required` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Only Bill to Insurance (checkbox) | **unchecked** | `include_only_bill_to_insurance` | boolean | - | `false` | replicated | Only codes set up to be billed to insurance: rpt_procedure_code_dim.bill_to_insurance = true. The column is NEW (DATA-04) and NULL until filled in setup; with the box ticked a NULL code is dropped, so the ticked run is empty until setup is completed (availability warning). Unticked default adds no predicate. Code settings are per tenant: bound through the tenant-scoped rpt_procedure_code_dim over NEW tenant_procedure_codes (03, DATA-04 extension, RPT-STLIST-05), because procedure_codes is global (no tenant_id). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r06:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| CATEGORY `ALL` (default) | No predicate; codes without a category kept |
| CATEGORY one category | `rpt_procedure_code_dim.code_category IN (:procedure_category_codes)` (12 ADA labels plus `Medical`, `Account`) |
| PRODUCTION TYPE `ALL` (default) | No predicate |
| PRODUCTION TYPE one type | `production_type_id IN (:production_type_ids)`; NULL until mapped in setup (DATA-04) → empty run plus warning |
| STATUS `Active` (default) | `is_active = true` |
| STATUS `Inactive` | `is_active = false` |
| STATUS `Both` | no predicate |
| Include Only Tooth Required (unticked default) | ticked: `requires_tooth = true` |
| Include Only Surface Required (unticked default) | ticked: `requires_surface = true` |
| Include Only Bill to Insurance (unticked default) | ticked: `bill_to_insurance = true`; NULL dropped (DATA-04; empty until setup fills the flag) |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

Dependency rules: none; all predicates combine with AND; the three boxes are independent.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `procedure_category_codes`, `production_type_ids` multi-select | `all` | Several categories / types (legacy single) |
| `procedure_codes` (shared, `entity_multi`, code picker extras: ranges `D2000-D2999`, saved code sets) | `all` | `procedure_code IN (...)` |
| `coverage_category_codes` (`entity_multi`, NEW, `lookup:coverage_categories` = `GET /metadata/coverage-categories`) | `all` | `coverage_category IN (...)`; the insurance-category view the vendor names `[P26]` |
| `code_office_ids` (`entity_multi`, NEW, `lookup:offices`) | `all` | Codes effective in the selected offices (`office_procedure_codes`; unassigned office = whole catalogue) |
| `setup_gaps` (`enum_multi`, NEW: `production_type`, `bill_to_insurance`, `coverage_category`, `code_type`; `min_items` 0, `predicate`) | empty = none | Codes with at least one ticked attribute NULL: the DATA-04 completion worklist |
| `group_by` (`enum`, NEW: `none`, `category`, `coverage_category`, `production_type`) | `none` | One band with `Codes :` subtotal |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_procedure_code_dim` (03 2.5, P0, DATA-04), tenant-scoped for `is_active`, `production_type_id`, `bill_to_insurance` through NEW `tenant_procedure_codes` (header, RPT-STLIST-05); production-type label from `production_types` (tenant) on `production_type_id`; coverage-category label from `definitions` `coverage_category` (one row per `tenant_id`, `group_code`, `key1`) |
| Columns used | `procedure_code`, `description`, `code_category`, `coverage_category`, `coverage_category_parent`, `code_type`, `production_type_id`, `requires_tooth`, `requires_surface`, `bill_to_insurance`, `billing_order`, `default_fee`, `default_duration_minutes`, `taxable`, `recall_interval`, `recall_unit`, `is_cdt`, `is_active` |
| User Code | No DentC column; `procedure_codes.legacy_code` is the converted code, not a user code: column `user_code` is NEW (owner 03, DATA-45) or confirmed absent (open question 1) |
| Office / provider | `office_mode = none` (global catalogue; vendor-doc correction r06) |
| Availability | READY (row 99) with `availability[]`: `production_type_unmapped` (PRODUCTION TYPE selected while `production_type_id` is NULL on every code), `bill_to_insurance_unset` (box ticked while the flag is NULL), `code_type_default_rule`. Coverage matrix row 99 names "Both statuses" as default basis: not followed (captured default Active; header) |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` | Code | `text` | `aggregate` | `row_id_column`; `count`, `Codes :` |
| `description` | Description | `text` | `aggregate` | - |
| `code_category` | ADA Category | `text` | `aggregate` | group key when `group_by = category` |
| `user_code` | User Code | `text` | `aggregate` | NEW; `null_display` empty |
| `production_type_name` | Scheduler Production Type | `text` | `aggregate` | `null_display` `-` |
| `coverage_category` | Insurance Category | `text` | `aggregate` | label `{key1} {description}` |
| `requires_tooth` | Tooth | `boolean` | `aggregate` | `count` true |
| `requires_surface` | Surface | `boolean` | `aggregate` | `count` true |
| `bill_to_insurance` | Bill to Ins. | `boolean` (NULL prints `-`) | `aggregate` | - |
| `is_active` | Active | `boolean` | `aggregate` | `count` false |
| `code_type` | Code Type | `enum` (`dental`, `medical`, `other`) | `aggregate` | `default_visible = false` |
| `default_fee` | Default Fee | `money` | `financial_practice` | `default_visible = false`; non-key |
| `default_duration_minutes`, `billing_order`, `recall_interval`, `taxable` | Duration, Bill Order, Recall, Taxable | mixed | `aggregate` | `default_visible = false` |

Sort: `procedure_code` asc (natural key). Groups: optional `group_by` band, subtotal `Codes :`. Page break: `page_break_by`
`group` when grouped. Summary: codes listed, inactive, without production type.

### Visuals and drill-through

Chart: optional bar `codes_by_category` (`category_column = code_category`, value count). Drill: code → record
`procedure_code` (Setup › Procedure Codes, `item_id` = code); category band → `lists.procedure_codes_by_fee_schedule`
with `procedure_category_codes = {"group": "code_category"}` and the caller's chosen schedule (`fee_schedule_id` left at
its default).

### Actions

`open_procedure_code` (row), `export_selection` (bulk). Worklist: with `setup_gaps` the report is the code-setup
completion worklist; editing stays in setup (no bulk edit from the report).

### Export and print

PDF portrait, 8 pt, ~1,100 rows ≈ 25 pages; footer echo `Category :`, `Production Type :`, `Status :`, the three options
as `Yes` / `No`. XLSX one sheet; CSV. Inline (instant).

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Is `User Code` printed, and what DentC column holds it | Live sample; Setup › Procedure Codes on the live tool |
| 2 | Value list of CATEGORY and PRODUCTION TYPE dropdowns | Open both dropdowns |
| 3 | Grouping by category in the printout | Live sample |
| 4 | Where `is_active`, `production_type_id` and `bill_to_insurance` live when `procedure_codes` is global but production types and the legacy status are per tenant: NEW `tenant_procedure_codes` (header) or one catalog per tenant | 03 decision (DATA-04 extension, RPT-STLIST-05; family open question 6) |

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

<!-- PARITY:setup_list_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| SUMMARY/DETAIL | (no label) (radio_group) | **Summary** / Detail | `report_format` | enum | Summary -> `summary`, Detail -> `detail` | `summary` | replicated | SUMMARY/DETAIL is report_format spelled differently (04 8, sig0311). summary = one row per explosion code (sample 2022: Exp. Code Short Descr, Exp. Code Descr, Default Same Tooth); detail = plus the member procedure codes in stored order (INFERRED). Printed title carries the choice: Explosion Codes List (Summary) / (Detail) via title_templates. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r07:END -->

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
| `catalog_status` | not offered | `code_bundles` is hard-deleted and has no `is_active` [V `codes.py` CodeBundle]; offered only if the source becomes `explosion_codes` (family open question 3) | header |

### Data

| Item | Rule |
|---|---|
| Source catalog | `code_bundles` + `code_bundle_items` (passthrough, DATA-45). Basis: the DentC Explosion Codes setup screen edits `/api/v1/code-bundles` [V `src/components/setup/procedure-codes/ExplosionCodeSetup.tsx` L15] and the sample columns match `display_code`, `name`, `same_tooth`. Migrated bundles land in `code_bundles` (`legacy_id`, unique per (tenant, `legacy_id`) [V `codes.py` CodeBundle]). `explosion_codes` (+ items, with `office_id`, `is_active`, `default_fee`) is a second catalog with no setup screen; family open question 3 asks only whether it holds migrated rows |
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
| `created_at` | Created | date; blank when `legacy_id` is not null (`created_at` holds the migration time on migrated bundles) | aggregate | none (default hidden, family "changed-since") |
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
| 3 | Does `explosion_codes` hold migrated rows beside `code_bundles` (family question 3)? | 03 on a migrated tenant |
| 4 | Is office availability printed? | Sample |

## Procedure Codes by Fee Schedule - `lists.procedure_codes_by_fee_schedule`

Lists › Setup List › PROCEDURE, screenshot `8.PNG` - P3 - M - any of `lists_setup`, `lists_procedure_fee` - interactive - PARTIALLY DOCUMENTED (purpose `[P43]`, effective dates `[P44]`; layout INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager | Annual fee update; after importing a schedule | Print an office (UCR) or contracted PPO fee schedule - the vendor's documented way `[P43]`; verify an imported schedule code by code |
| Owner, insurance coordinator | PPO negotiation | Compare a PPO schedule with the UCR schedule (enhancement compare column) |

### Legacy output

PARTIALLY DOCUMENTED. Header with schedule name and effective date; rows `Code`, `Description`, `Fee`, possibly under
category headings (INFERRED; Open Dental prints `Category`, `Code`, `Desc`, `Abbr`, `Fee` `[C2]`).

| Item | Reconstruction |
|---|---|
| Printed title | `Procedure Codes by Fee Schedule`; second header line `Fee Schedule : {fee_schedule_name}   Effective Date : {M/D/YYYY}` (title template, header rule) |
| Columns | `Code`, `Description`, `Fee` (+ `Plan Pays` on a managed-care schedule, INFERRED) |
| Grouping | none by default (category headings unconfirmed) |
| Total | `Codes : n`; no money total (summing a fee list has no meaning, header) |
| Sign | fees positive as stored, 2 decimals |
| Rows | codes passing the code filters; a code without an entry in force prints with an empty fee (header population rule, INFERRED) |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| PROCEDURE CODE TYPE | Dental (checkbox) | **checked** | `procedure_code_types.dental` | enum_multi | - | `true` | replicated | Member dental of procedure_code_types (enum_multi, min_items 1, full_selection no_predicate; 04 2.5): rpt_procedure_code_dim.code_type IN (...). code_type is NEW (DATA-04) and filled by the default rule until reviewed; with all three ticked (legacy default) no predicate, so codes without a type are kept. |
| PROCEDURE CODE TYPE | Medical (checkbox) | **checked** | `procedure_code_types.medical` | enum_multi | - | `true` | replicated | Member medical of procedure_code_types; code_type = medical (DATA-04 default rule: category Medical). Full selection = no predicate. |
| PROCEDURE CODE TYPE | Other (checkbox) | **checked** | `procedure_code_types.other` | enum_multi | - | `true` | replicated | Member other of procedure_code_types; code_type = other (every code that is neither CDT dental nor medical, for example Account codes). Full selection = no predicate. |
| CATEGORY | (no label) (dropdown) | shown: ALL | `procedure_category_codes` | entity_multi | - | `all` | replicated_enhanced | As on Procedure Codes List: rpt_procedure_code_dim.code_category IN (...), lookup:procedure_categories, ALL keeps every code. Legacy single-select; a list is the enhancement. |
| PRODUCTION TYPE | (no label) (dropdown) | shown: ALL | `production_type_ids` | entity_multi | - | `all` | replicated_enhanced | As on Procedure Codes List: rpt_procedure_code_dim.production_type_id (NEW, DATA-04, NULL until filled). ALL keeps every code. Legacy single-select; a list is the enhancement. Code settings are per tenant: bound through the tenant-scoped rpt_procedure_code_dim over NEW tenant_procedure_codes (03, DATA-04 extension, RPT-STLIST-05), because procedure_codes is global (no tenant_id). |
| FEE SCHEDULE | (no label) (dropdown) | shown: CIGNA PPO HAMILTON | `fee_schedule_id` | entity_single | - | `first_option` | unknown_legacy | Subject of the report, not a filter: the ONE fee schedule whose fees are printed (fee_schedule_id, entity_single, required, never all; 04 2.4 shared-signature override of sig0315). Option source lookup:fee_schedules (every readable schedule; the hidden office_scope is a no-op until RPT-STLIST-20, because fee_schedules.office_id is deprecated and NULL on every row). The captured default is a tenant row, not a rule: candidate first_option, unconfirmed. Check on the live tool: (1) which schedule is preselected for a new session (first alphabetically, the office default UCR schedule, or the last used), (2) whether the list offers ALL. Shared parameter compare: office_default_ucr_fee_schedule token exists (04 2.3) if the live tool shows the office UCR schedule. |
| EFFECTIVE DATE | (no label) (dropdown) | shown: 01/01/2020 | `fee_schedule_effective_date` | entity_single | - | `first_option` | unknown_legacy | One effective-dated version of the chosen schedule (vendor-doc correction; feature since 2020). entity_single, required, depends_on fee_schedule_id, options_source lookup:fee_schedule_effective_dates (04 13.3, FLT-09) = distinct fee_schedule_entries.effective_date of the schedule. Captured default 01/01/2020 is tenant data; candidate first_option. Check on the live tool: list order and whether the default is the earliest, the latest, or the version in force today. The version list is the entry dates: the fee in force is decided by fee_schedule_entries.effective_date and a new effective date is a dated bulk upsert into the same schedule (codes.py FeeSchedule, FEE-4); schedule rows with parent_schedule_id are separate schedules of the FEE SCHEDULE list, not versions. |
| STATUS | (no label) (radio_group) | **Active** / Inactive / Both | `procedure_code_status` | enum | Active -> `active`, Inactive -> `inactive`, Both -> `both` | `active` | replicated | - |
| OTHER OPTIONS | Include Only Tooth Required (checkbox) | **unchecked** | `include_only_tooth_required` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Only Surface Required (checkbox) | **unchecked** | `include_only_surface_required` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Only Bill to Insurance (checkbox) | **unchecked** | `include_only_bill_to_insurance` | boolean | - | `false` | replicated | As on Procedure Codes List: rpt_procedure_code_dim.bill_to_insurance = true (NEW, DATA-04, NULL until filled; ticked run empty until setup is completed). Code settings are per tenant: bound through the tenant-scoped rpt_procedure_code_dim over NEW tenant_procedure_codes (03, DATA-04 extension, RPT-STLIST-05), because procedure_codes is global (no tenant_id). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| FEE SCHEDULE = a given schedule (the selection changes) | EFFECTIVE DATE offers the effective-dated versions of the chosen schedule; one version is selected. | fee_schedule_effective_date (entity_single) has options_source lookup:fee_schedule_effective_dates (04 13.3, FLT-09) with depends_on [fee_schedule_id]: the list holds the distinct fee_schedule_entries.effective_date values for the chosen schedule. When fee_schedule_id changes the form reloads the list and resets the value to its default (candidate first_option, unconfirmed); a value that is not a version of the chosen schedule is 422 invalid_parameter. Both parameters are required. The run prices every listed code with the entry of that schedule in force on the chosen date (effective_date <= :fee_schedule_effective_date < coalesce(effective_to, infinity)). The hidden office_scope (default all) is a no-op until RPT-STLIST-20: fee_schedules.office_id is deprecated and NULL, so every readable schedule is offered. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | visible_when | false | - | inferred - Hidden scope with default all (catalog rule); no legacy control. |
<!-- PARITY:setup_list_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| PROCEDURE CODE TYPE `Dental` + `Medical` + `Other` (all ticked, default) | `procedure_code_types` full selection = no predicate (`no_predicate`): codes without a type kept |
| PROCEDURE CODE TYPE strict subset | `code_type IN (...)` (NEW, DATA-04 default rule: CDT `D` codes dental, category `Medical` medical, rest other); untyped codes dropped; no box ticked = 422 (`min_items` 1) |
| CATEGORY `ALL` / one | As Procedure Codes List: `code_category IN (...)` |
| PRODUCTION TYPE `ALL` / one | As Procedure Codes List: `production_type_id IN (...)` (NULL until mapped) |
| FEE SCHEDULE (one schedule, preselected) | `fee_schedule_id` (required, never `all`): the schedule whose fees print; default candidate `first_option` (`unknown_legacy`) |
| EFFECTIVE DATE (one version of the chosen schedule) | `fee_schedule_effective_date` (required): fee in force on that date, `effective_date <= :d < coalesce(effective_to, infinity)`; default candidate `first_option` (`unknown_legacy`) |
| STATUS `Active` (default) / `Inactive` / `Both` | `procedure_code_status` on `is_active` of the code (not of the entry) |
| Include Only Tooth Required / Surface Required / Bill to Insurance (unticked) | ticked: as Procedure Codes List |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults (schedule and date back to the candidate) / saved view (stores the schedule id; the effective date is stored as the value, a saved view whose date is no longer a version answers 422 and the form re-selects) |

Dependency rule `setup_list_reports.r08.d01`: changing FEE SCHEDULE reloads EFFECTIVE DATE from
`lookup:fee_schedule_effective_dates` (`depends_on [fee_schedule_id]`, distinct entry dates of the schedule) and resets it
to its default; a date that is not a version of the schedule is 422 `invalid_parameter`. The hidden `office_scope`
(default `all`) is a no-op until RPT-STLIST-20: every readable schedule is offered (header).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `procedure_category_codes`, `production_type_ids` multi-select | `all` | Several values |
| `procedure_codes` (shared, code ranges) | `all` | Code subset (e.g. `D2000-D2999` for a crown fee review) |
| `compare_fee_schedule_id` (shared `entity_single`, `lookup:fee_schedules`) | `null` (no compare column; on this report not gated by `include_ucr`, which the report does not have: per-report override of the shared `disabled_value` rule, to be recorded in 04 15.4 / 2.4 like the `fee_schedule_id` override, RPT-STLIST-17) | Adds `compare_fee`, `fee_difference` (`difference(fee, compare_fee)`) and `fee_difference_pct` (`ratio(fee_difference, compare_fee)`): PPO versus UCR |
| `compare_effective_date` (`entity_single`, NEW, `lookup:fee_schedule_effective_dates`, `depends_on [compare_fee_schedule_id]`) | token `today` resolved to the version in force today | Version of the compare schedule |
| `fee_entry_filter` (`enum`, NEW: `all`, `priced`, `unpriced`, `no_charge`) | `all` | `unpriced` = no entry in force or `patient_fee <= 0` without `is_no_charge` (the resolver's "not priced" rule): gaps in an imported schedule |
| `group_by` (`enum`, NEW: `none`, `category`) | `none` | Category bands with `Codes :` subtotal |
| `show_entry_dates` (`boolean`, NEW, `role layout`) | `false` | Shows the entry's own `effective_date` (an entry older than the chosen version still in force) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_procedure_code_dim` (driving set, after code filters) `LEFT JOIN` `rpt_fee_schedule_fees` (P1, DATA-51) on `procedure_code` with `fee_schedule_id = :fee_schedule_id` and the half-open validity test on `:fee_schedule_effective_date`; the unique key (schedule, code, validity period) makes the join row-preserving |
| Columns used | dim as on Procedure Codes List; fees `fee_schedule_name`, `pricing_model`, `fee_type`, `effective_date`, `effective_to`, `patient_fee` (printed `Fee`), `insurance_fee` (Plan Pays, copay lists only), `is_no_charge`; compare schedule `schedule_fee` (data card 2.29: "the single compare fee") |
| Effective-date list | distinct `fee_schedule_entries.effective_date` of the schedule, newest first (order and default unconfirmed). The fee in force is decided by the entry date and a new effective date is a dated bulk upsert into the same schedule (codes.py `FeeSchedule`, FEE-4); schedule rows with `parent_schedule_id` are separate schedules of the FEE SCHEDULE list, not versions |
| Office | hidden `office_scope` `all`, a no-op until RPT-STLIST-20 (header); `fee_schedules.office_id` is deprecated and never read (codes.py docstring) |
| Provider | none |
| Date basis | `fee_schedule_effective_date` (as-of date of the fee), no transaction date |
| Availability | READY (row 100) with `code_type_default_rule` warning; DATA-51 lands in P1, so the report is buildable in P3 as planned. History: entries carry one `effective_date` and no end; a deleted entry rewrites the past (data card 2.29): an older version prints the entries that still exist |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` | Code | `text` | `aggregate` | `row_id_column`; `count`, `Codes :` |
| `description` | Description | `text` | `aggregate` | - |
| `code_category` | Category | `text` | `aggregate` | hidden unless `group_by = category` (band key) |
| `fee` | Fee | `money` (`decimals 2`, `negative minus`) = `rpt_fee_schedule_fees.patient_fee`; prints `No Charge` when `is_no_charge`; empty when no entry is in force or `patient_fee <= 0` without `is_no_charge` (the resolver's "not priced") | `financial_practice` | `none` (no sum); counts `Priced : n` / `Not priced : n` |
| `insurance_fee` | Plan Pays | `money` | `financial_practice` | `default_visible = false` (managed-care schedules; open question 3) |
| `is_no_charge` | No Charge | `boolean` | `aggregate` | `default_visible = false`; a no-charge code prints `No Charge` in `fee` |
| `entry_effective_date` | Entry Date | `date` (`M/D/YYYY`) = `rpt_fee_schedule_fees.effective_date` of the entry in force | `aggregate` | `visible_when ["truthy", "show_entry_dates"]` |
| `compare_fee` | Fee ({compare_fee_schedule_name}) | `money` = `schedule_fee` of the compare schedule's entry in force on `compare_effective_date` (data card 2.29) | `financial_practice` | `visible_when ["not_empty", "compare_fee_schedule_id"]` |
| `fee_difference` | Difference | `money` | `financial_practice` | computed `difference(fee, compare_fee)`; same `visible_when` |
| `fee_difference_pct` | Difference % | `percent` (`decimals 1`) | `financial_practice` | computed `ratio(fee_difference, compare_fee)`, zero guard; same `visible_when` |
| `requires_tooth`, `requires_surface`, `bill_to_insurance`, `is_active`, `code_type`, `production_type_name` | as Procedure Codes List | | `aggregate` | `default_visible = false` |

| Item | Rule |
|---|---|
| Fee classes | `financial_practice` columns are non-key: a caller without the class gets the code list without fee columns (header) |
| Groups | optional category band; grand total counts only |
| Sort | `procedure_code` asc |
| Summary header | `Codes : n`, `Priced : n`, `Not priced : n` (block totals) |
| `cost_class` | `interactive` (≈1,100 codes × one version; header); `escalate_when` none |

### Visuals and drill-through

Chart: with a compare schedule, a bar of `fee_difference_pct` by category (`top_n` 12) - where the PPO discounts most.
Drill: code → record `fee_schedule_entry` (Fee Schedules › schedule › code, `route_key` 07); band → same report filtered
to the category (`kind rows`); schedule name in the header → record `fee_schedule`.

### Actions

`open_fee_schedule` (criteria-level link to the schedule editor), `open_procedure_code` (row), `export_selection` (bulk).
Worklist: `fee_entry_filter = unpriced` lists the codes to price after an import.

### Export and print

PDF portrait; header line 2 carries schedule and effective date; footer echo `Code Type :`, `Category :`, `Production Type :`,
`Fee Schedule :`, `Effective Date :`, `Status :`, options. With compare columns: landscape (`orientation auto`). XLSX one
sheet named after the schedule (31-char cut), fees as numeric cells; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Which schedule is preselected (first alphabetically, office UCR default, last used) and whether ALL exists | Live tool, new session (RPT-STLIST-09) |
| 2 | Default and order of EFFECTIVE DATE (earliest, latest, in force today) | Live tool |
| 3 | Does a managed-care schedule print `Plan Pays`; are codes without an entry printed or dropped | Live run on a copay schedule |
| 4 | Office scope of fee schedules: which rule replaces the no-op hidden scope (`fee_schedule_assignments.office_id` / `office_group_id` and the offices' default / UCR pointers, or none) | 04 / 03 (RPT-STLIST-20) |
| 5 | Category headings in the printout | Live sample |

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

<!-- PARITY:setup_list_reports.r09:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| TYPE | (no label) (dropdown) | shown: ALL | `credit_code_type` | enum | - | `all` | unknown_legacy | Static dropdown captured collapsed: only the default ALL is known, so no option can be mapped yet. Binds rpt_transaction_code_dim.code_kind (03 3.3). Expected list (vendor documentation of the code record field Type, not of the dropdown): ALL / Payment / Adjustment -> all / payment / adjustment. Check on the live tool: expand TYPE and record every entry and its order. |
| CLASS | (no label) (dropdown) | shown: ALL | `credit_code_class` | enum | - | `all` | unknown_legacy | Static dropdown captured collapsed: only the default ALL is known. Binds rpt_transaction_code_dim.legacy_class (03 3.3 literal vocabulary: payments None, Insurance Payment, Capitation Payment, Insurance Prev. Bal, Collection Agency Payment; adjustments None, Write-Off, Finance Charge, Contract Down Payment, Balance Moved to Contract, Periodic Contract billing, Late Charge, Capitation Adjustment, Sales Tax, Insurance Adjustment, Move Patient (Debit) / (Credit), Previous Balance (Debit) / (Credit), Credit Card Refund, Treatment plan discount, Collection Agency Adjustment). Check on the live tool: the exact entries, and whether the CLASS list is narrowed by TYPE (candidate rule: options enabled_when credit_code_type in [all, <kind of the class>]). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r09:END -->

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
| `catalog_status` (family) | `both` | `rpt_transaction_code_dim.is_active`; the legacy behaviour is unknown, so the default keeps inactive codes | header |
| `show_analytic_mapping` (`boolean`, `role: query`) | `false` | Adds `txn_side`, `txn_class`, `deposit_group`, `is_income`, `counts_as_collection` (data card 2.6): shows where each code lands in DentC's production / collection figures | NEW, 04 section 15 |
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
| `txn_side`, `txn_class`, `deposit_group`, `is_income`, `counts_as_collection` | (analytic mapping) | text / boolean | aggregate | visible when `show_analytic_mapping` |
| `valid_from`, `valid_to` | Valid From / To | date | aggregate | visible when `show_versions` |
| `usage_count_12m` | Used (12 m) | integer | aggregate | sum per type |
| `last_used_on` | Last Used | date | aggregate | none |
| hidden `code`, `valid_from` | | text / date | aggregate | row_id_column (`code`, `valid_from`) = the grain of data card 2.6 |

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

## Fee Schedule List - `lists.fee_schedule_list`

Lists › Setup List › FEE SCHEDULE, screenshot `10.PNG` - P3 - S - any of `lists_setup`, `lists_procedure_fee` - instant - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, insurance coordinator | Annual fee review, PPO contract renewals, after conversion | Catalogue of fee schedules: name, type, effective date; find unused or outdated schedules |
| Billing office | Before fee updates | Which schedule is the default / UCR of which office |

### Legacy output

INFERRED (research 8, open question 5: catalogue or fees not documented). Reading (a), catalogue, is the most
consistent with the `ALL` default and the separate per-code report; it is the default here:

| Item | Reconstruction |
|---|---|
| Printed title | `Fee Schedule List` |
| Columns | `Fee Schedule ID`, `Fee Schedule Name`, `Effective Date` (the `ED` of the dropdown) |
| Total | `Fee Schedules : n` |
| Variant | Reading (b) - codes and fees of each selected schedule - offered by `include_fees` (enhancement) until the live check |

Old description pane: `Fee Name/Schedule List.` `[P43·img]` (no layout information).

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r10:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| FEE SCHEDULE | (no label) (dropdown) | shown: ALL | `fee_schedule_ids` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed: ALL plus the tenant's schedules, each shown as '<name> [ED: m/d/yyyy]' (vendor-doc correction); ED = coalesce(fee_schedules.effective_date, max(fee_schedule_entries.effective_date) of the schedule), the same expression as the effective_date column. List filter (fee_schedule_ids, entity_multi, default all): fee_schedules.id IN (...). Option source lookup:fee_schedules (every readable schedule; the hidden office_scope is a no-op until RPT-STLIST-20: fee_schedules.office_id is deprecated and NULL, office binding lives in fee_schedule_assignments and the offices' default / UCR pointers). Legacy single-select; a list is the enhancement. On Procedure Codes by Fee Schedule the same signature is the subject fee_schedule_id (override there). What the report prints for one schedule (catalogue row or its fees) is undocumented (research open question 5). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | visible_when | false | - | inferred - Hidden scope with default all (catalog rule); no legacy control. |
<!-- PARITY:setup_list_reports.r10:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| FEE SCHEDULE `ALL` (default) | `fee_schedule_ids = "all"`: every fee schedule the caller may read (the hidden `office_scope` is a no-op until RPT-STLIST-20) |
| FEE SCHEDULE one schedule (`<name> [ED: m/d/yyyy]`) | `fee_schedules.id IN (:fee_schedule_ids)` |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

Dependency rules: none. Option labels: `{name} [ED: {M/D/YYYY}]` with ED = `coalesce(fee_schedules.effective_date,
max(fee_schedule_entries.effective_date) of the schedule)` - the same expression as the `effective_date` column (the header
date is display / lineage only and empty on migrated schedules, codes.py FEE-4; open question 2).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `catalog_status` (family) | `both` | `fee_schedules.is_active` |
| `fee_schedule_ids` multi-select | `all` | Several schedules |
| `fee_types` (`enum_multi`, NEW: `ucr`, `standard`, `plan`, `carrier`; `no_predicate`) | all ticked | `fee_schedules.fee_type` (`fee_vocab.FEE_TYPE_CODES`) |
| `pricing_models` (`enum_multi`, NEW: `percentage`, `copay`; `no_predicate`) | all ticked | `pricing_model`; `copay` = the Capitation Fee Schedule population |
| `include_usage_counts` (`boolean`, NEW) | `false` | Adds `assignment_count` (`fee_schedule_assignments`), `office_default_count` (offices naming it as default or UCR), `plan_count` (plans bound through assignments `ins_plan_id`) |
| `fee_schedule_usage` (`enum`, NEW: `all`, `used`, `unused`) | `all` | Schedules with / without any assignment or office default: retirement candidates |
| `include_fees` (`boolean`, NEW) | `false` | Adds block `fees` (placement `after_group`): per schedule its codes and fees in force today (reading b); a run with `true` is `interactive` |

### Data

| Item | Rule |
|---|---|
| Dataset | passthrough `fee_schedules` (DATA-45); counts from `fee_schedule_entries` (entry count, latest entry date), `fee_schedule_assignments`, `offices.default_fee_schedule_id` / `default_ucr_fee_schedule_id`; block `fees` from `rpt_fee_schedule_fees` (DATA-51) as of `local_today` |
| Columns used | `id`, `legacy_id`, `name`, `fee_type`, `pricing_model`, `effective_date`, `version`, `parent_schedule_id`, `is_active`, `created_at` |
| Office | hidden `office_scope` `all`, a no-op until RPT-STLIST-20 (header; `fee_schedules.office_id` is deprecated and NULL) |
| Availability | READY (row 103). `created_at` = migration time on migrated schedules. `availability[]` `schedule_header_date_missing`: migrated schedules have no header `effective_date`, so Effective Date and the ED label fall back to the latest entry date |

### Output

Block `main`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `fee_schedule_id` | Fee Schedule ID | `id` | `aggregate` | `row_id_column` |
| `legacy_id` | Legacy ID | `text` | `aggregate` | `default_visible = false` |
| `fee_schedule_name` | Fee Schedule Name | `text` | `aggregate` | `count`, `Fee Schedules :` |
| `effective_date` | Effective Date | `date` (`M/D/YYYY`) = `coalesce(fee_schedules.effective_date, max(fee_schedule_entries.effective_date))` | `aggregate` | - |
| `fee_type` | Type | `enum` (`ucr` UCR, `standard` Standard, `plan` Plan, `carrier` Carrier) | `aggregate` | - |
| `pricing_model` | Pricing | `enum` (`percentage` Fee for service, `copay` Managed care) | `aggregate` | - |
| `version`, `parent_schedule_name` | Version, Based On | `integer`, `text` | `aggregate` | `default_visible = false` |
| `entry_count` | Codes Priced | `integer` | `aggregate` | - |
| `latest_entry_date` | Last Fee Change | `date` | `aggregate` | - |
| `is_active` | Active | `boolean` | `aggregate` | `count` false |
| `assignment_count`, `office_default_count`, `plan_count` | Assignments, Office Defaults, Plans | `integer` | `aggregate` | `visible_when ["truthy", "include_usage_counts"]` |

Block `fees` (`visible_when ["truthy", "include_fees"]`): `procedure_code`, `description`, `fee` (`money`,
`financial_practice`), `insurance_fee` (copay schedules); grouped by `fee_schedule_id` with header `{fee_schedule_name}`,
subtotal `Codes :`.

Sort: `fee_schedule_name`, `fee_schedule_id`. Summary: schedules listed, inactive, unused (with counts).

### Visuals and drill-through

Chart: none. Drill: row → `lists.procedure_codes_by_fee_schedule` with `fee_schedule_id = {"column": "fee_schedule_id"}`
and `fee_schedule_effective_date` = `max(fee_schedule_entries.effective_date)` of the schedule (the latest version, family cross-report drill); managed-care row →
`lists.capitation_fee_schedule` with `fee_schedule_ids = [{"column": "fee_schedule_id"}]`; name → record `fee_schedule`.

### Actions

`open_fee_schedule` (row), `export_selection` (bulk). Worklist: `fee_schedule_usage = unused`.

### Export and print

PDF portrait; footer echo `Fee Schedule :`; XLSX sheet `Fee Schedules` plus sheet `Fees` when `include_fees`; CSV main
block (or `fees` by request).

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Catalogue (a) or fees (b): flips the default of `include_fees` (then `default_differs_reason` is not needed: it becomes the legacy default) | Live run with ALL and with one schedule (research open question 5) |
| 2 | ED rule is `coalesce(header date, latest entry date)`: does the legacy ED show the latest or the earliest entry date? | Compare with a migrated schedule on the live tool |
| 3 | Office scope of schedules: rule replacing the no-op hidden scope | 04 / 03 (RPT-STLIST-20) |

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
| Columns | code, description, managed-care amounts (patient co-pay and, where kept, the production / plan value); exact columns unknown | code, description, `Co - Pay` (patient), `Sup. Fee.` (insurance; the vendor's labels for the same amounts on Capitation Utilization, data card 2.29, INFERRED here), `No Charge` |
| Totals | none known | `Codes : n` per schedule; no money totals |

Money sign: positive amounts as stored, 2 decimals, never inverted.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r11:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| CAPITATION FEE SCHEDULE | (no label) (dropdown) | shown: ALL | `fee_schedule_ids` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed: ALL plus managed-care schedules shown with their ED suffix (vendor-doc correction: capitation, dental HMO, HMO and Medicaid schedules). fee_schedule_ids restricted to fee_schedules.pricing_model = copay in both the option source and the rows; ALL = every copay schedule the caller may read (the hidden office_scope is a no-op until RPT-STLIST-20). Legacy single-select; a list is the enhancement. Confirm on the live tool that the list holds exactly the managed-care schedules. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | visible_when | false | - | inferred - Hidden scope with default all (catalog rule); no legacy control. |
<!-- PARITY:setup_list_reports.r11:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| CAPITATION FEE SCHEDULE `ALL` (default) | Every managed-care (`pricing_model = copay`) schedule the caller may read, one band each |
| CAPITATION FEE SCHEDULE one schedule (`<name> [ED: m/d/yyyy]`) | That schedule only; the list holds only `copay` schedules |

Shared rule (parity file): `office_scope` hidden (`visible_when false`, default `all`), a no-op until RPT-STLIST-20 (header:
`fee_schedules.office_id` is deprecated and NULL), so every readable `copay` schedule is listed and offered. No dynamic rule.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `fee_schedule_ids` multi-select | `all` | Several schedules side by side as bands (legacy single-select) | 04 12 |
| `fee_as_of_date` (`date`) | empty = no as-of restriction | When set, keeps only the entry in force on that date (`effective_date <= d < coalesce(effective_to, infinity)`); empty keeps the legacy meaning (the selected schedule's latest entry per code) | NEW, 04 section 15 |
| `include_ucr` + `compare_fee_schedule_id` (shared, 3.6) | `false` / `office_default_ucr_fee_schedule` | Adds `Compare Fee` from the chosen schedule and `Patient Saves` = compare fee - co-pay: what the HMO patient saves versus the office fee | 04 3.6 |
| `procedure_category_codes` (shared) | `all` | Codes of the chosen ADA categories | 04 3.6 |
| `catalog_status` (family) | `both` | `fee_schedules.is_active` | header |
| `page_break_by` (`enum`: `none`, `group`) | `none` | New PDF page per schedule | 04 8 |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_fee_schedule_fees` (DATA-51, P1): `fee_schedule_id`, `fee_schedule_name`, `pricing_model`, `fee_type`, `procedure_code`, `effective_date`, `effective_to`, `patient_fee`, `insurance_fee`, `is_no_charge` |
| Schedule label | `fee_schedules.name` + ED = `coalesce(fee_schedules.effective_date, max(fee_schedule_entries.effective_date))` (same rule as Fee Schedule List); versions are entry dates inside one schedule (codes.py FEE-4), schedule rows with `parent_schedule_id` are separate schedules; option source `lookup:fee_schedules` filtered `pricing_model = copay` |
| Rows | Default: every code of the selected schedule with its latest entry (`DISTINCT ON (procedure_code) ORDER BY effective_date DESC`, the version the ED label names), no as-of predicate; with `fee_as_of_date` set, the entry in force on that date. Codes without an entry are not printed (open question 4) |
| Descriptions | `rpt_procedure_code_dim` on `procedure_code` |
| Compare (enhancement) | Second lookup in `rpt_fee_schedule_fees` for `compare_fee_schedule_id` (`schedule_fee`), in force on `fee_as_of_date`, or on `local_today` when it is empty |
| Scope | Hidden `office_scope = all`, a no-op until RPT-STLIST-20 (header) |
| Availability | READY (coverage matrix row 104). Entries carry one `effective_date` and no end date: a deleted entry rewrites the past (data card 2.29), so an as-of date in the past is the current catalog's view of it |

### Output

Block `main`, `fixed_outer` level `fee_schedule` (`key_columns` `fee_schedule_id`; header above; subtotal `Codes : n`;
`page_break_allowed`):

| key | label | type | data_class | total |
|---|---|---|---|---|
| `procedure_code` | Code | text | aggregate | count per schedule, grand count |
| `procedure_description` | Description | text | aggregate | none |
| `code_category` | Category | text | aggregate | none (default hidden) |
| `patient_fee` | Co - Pay | money (2 dp) | financial_practice | none |
| `insurance_fee` | Sup. Fee. | money | financial_practice | none |
| `is_no_charge` | No Charge | boolean | aggregate | none |
| `effective_date` | Effective | date (the entry's `effective_date`) | aggregate | none (default hidden) |
| `compare_fee` | Compare Fee (`{compare_fee_schedule_name}`) | money | financial_practice | visible when `include_ucr` |
| `patient_saves` | Patient Saves | money, computed `difference(compare_fee, patient_fee)` | financial_practice | visible when `include_ucr` |
| hidden `fee_schedule_id` | | id | aggregate | row_id_column (`fee_schedule_id`, `procedure_code`, `effective_date`) |

Money columns are non-key: a caller without `financial_practice` gets the code list without amounts (header). Sort:
schedule name, effective date, then `procedure_code`. Summary card `Schedules` (count of bands).

### Visuals and drill-through

None - a list. Band header -> `report` `insurance.capitation_utilization` with `{"include_ucr": true,
"compare_fee_schedule_id": {"column": "fee_schedule_id"}}` (the compare schedule is enabled only while `include_ucr` is true).
Fee Schedule To Compare on that report is the comparison schedule, so passing the capitation schedule itself is a semantic
choice to confirm (open question 5). Row -> `record` Fee Schedules setup on that schedule and code.

### Actions

Row: open schedule in setup. Bulk: `export_selection` (front-desk co-pay sheet).

### Export and print

PDF portrait, banded by schedule, optional page break per schedule; footer echo `Capitation Fee Schedule :` (names with `ED`)
then enhancements. XLSX: one flat table with schedule name and effective date as columns (`sheet_per_page_break` when page
break by schedule). CSV. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Exact columns (co-pay only, or co-pay and plan amount) and their labels (`Co - Pay` / `Sup. Fee.` assumed)? | Generate a sample |
| 2 | Does the dropdown hold exactly the managed-care schedules, one entry per version? | Expand on the live tool |
| 3 | Does ALL print every schedule or every version of every schedule? | Live tool; DentC prints every `copay` `fee_schedules` row with its latest entries |
| 4 | Are codes without a co-pay entry printed? | Sample |
| 5 | Product: should the band drill pass the capitation schedule as Fee Schedule To Compare of Capitation Utilization, or the office UCR schedule? | Product owner |

## Office List - `lists.office_list`

Lists › Setup List › OFFICE, screenshot `12.PNG` - P3 - S - any of `lists_setup`, `lists_office` - instant - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Organisation administrator, DSO operations | Office opening, annual audit, payer credentialing | Offices with identifiers, address, time zone, tax id, billing provider, group and default fee schedules |
| Billing office | Clearinghouse / payer enrolment | Tax id, NPI and billing provider per office |

### Legacy output

INFERRED (no sample; fields of `Setup > Offices > Office Setup` `[P39]`; comparable Dentrix Enterprise `Practice
Organization List`):

| Item | Reconstruction |
|---|---|
| Printed title | `Office List` |
| Header line 1 | office name when one office resolves, else practice-group name |
| Columns | `OID`, `Office Name`, `Short ID`, treating address, `Phone`, `Fax`, `Time Zone`, `Tax ID#`, `Insurance Billing Provider`, `Opening Date`, `Office Group`, `Default UCR Fee Schedule`, `Default Fee Schedule` |
| Grouping | office band (family `fixed_outer`, multi-office runs) |
| Total | `Offices : n` |
| Orientation | landscape (header) |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r12:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (vendor-doc correction: the box defaults to the session office, SELECT picks others). Offices (mode office) or office groups (mode office_group); the selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. On this report the office is the listed office itself: office_attribution = listed_office (NEW value, owner 03 5.1) = rpt_office_dim.office_id IN (resolved set). Inactive and deleted offices: rpt_office_dim keeps them; whether the legacy list prints them is unknown (family open question). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| OFFICE/GROUP = Office Group | The SELECT picker chooses office groups defined in Setup > Office Groups (for example regions) instead of offices; when no office groups are defined, a group run covers all offices of the account. Cross-cutting statement of the document for all Lists screens (vendor articles on office groups and on the new reports menu) - recorded once here; it applies to the three Setup List reports that have the Office / Office Group radios (Office List, Office Holidays, Operatory List). | office_scope: the radio value office_scope.mode = office_group switches the picker to lookup:office_groups and the selection fills office_group_id (one group) or office_group_ids (several, enhancement); mode office fills office_ids (default working_office). A group resolves to its member offices (offices.office_group_id) intersected with the offices the caller may read. When the tenant has no office groups (every migrated tenant: office_groups is empty) the group mode offers the single value all, which resolves to every office the caller may read - the legacy 'group run covers all offices'. Recorded once here; the same behaviour holds on lists.office_holidays and lists.operatory_list. |
<!-- PARITY:setup_list_reports.r12:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| OFFICE/GROUP `Office` (default) + office box (default = working office, legacy `108`) | `office_ids` (token `working_office`): `rpt_office_dim.office_id IN (resolved set)` (`listed_office`) |
| office box `SELECT` other offices | `office_ids` list, `my_offices`, or `all` (every office the caller may read) |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`: member offices (`offices.office_group_id`) ∩ readable offices; no groups defined → value `all` = every readable office (rule d01) |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults (working office) / saved view (stores the token, not the id) |

Dependency rule `setup_list_reports.r12.d01`: the radio switches the picker source between `lookup:offices` and
`lookup:office_groups`.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `office_scope` choices | `working_office` | `my_offices`, several groups, `all` (filter card 12) |
| `include_schedule_hours` (`boolean`, NEW) | `false` | Adds block `hours` (placement `after_group`): per office the seven `office_schedule_days` rows (open / close / lunch, `hours_source` `stored` or `default`) |
| `include_counts` (`boolean`, NEW) | `false` | Adds `active_operatory_count` (dim), `provider_count` (roster `provider_offices`), `user_count` (`user_offices`) |
| `office_data_gaps` (`enum_multi`, NEW: `tax_id`, `npi`, `billing_provider`, `default_fee_schedule`, `timezone_default`; `min_items` 0, `predicate`) | empty = none | Offices missing a ticked item; `timezone_default` = still `America/New_York` from migration (data card 2.2): the office-setup worklist |

The list prints inactive and deleted offices of the resolved set with an `Active` column (dimension keeps them; family
open question 2); `catalog_status` is not offered on this report (header).

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_office_dim` (P0, DATA-05) |
| Columns used | `office_id`, `office_name`, `short_id`, `office_code`, `office_group_id`, `office_group_name`, `timezone`, `city`, `state`, `zip`, `opening_date`, `is_active`, `is_deleted`, `billing_provider_id`, `default_ucr_fee_schedule_id`, `default_fee_schedule_id`, `active_operatory_count` |
| NEW dimension columns (DATA-05 / DATA-45, owner 03 2.2) | `address_line1`, `address_line2`, `treatment_address_line1`, `treatment_address_line2`, `treatment_city`, `treatment_state`, `treatment_zip`, `phone`, `phone_2`, `fax`, `email`, `tax_id`, `npi`, `taxonomy_code`, `corporate_name`, `legacy_id` (all exist on `offices`) |
| Labels | billing provider `rpt_provider_dim.provider_name`; schedules `fee_schedules.name` (joined on id) |
| Office attribution | `listed_office` (NEW, header) |
| Availability | READY (row 105). `office_groups` empty after migration: group mode resolves to `all` until groups exist; time zone is the migration default until edited |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | OID | `id` | `aggregate` | `row_id_column`; band key |
| `office_name` | Office Name | `text` | `aggregate` | `count`, `Offices :` |
| `short_id` | Short ID | `text` | `aggregate` | - |
| `office_code` | Office Code | `text` | `aggregate` | `default_visible = false` |
| `treatment_address` | Address | `text` (treating line 1 + line 2; each line falls back to the mailing `address_line1` / `address_line2` when NULL) | `aggregate` | - |
| `treatment_city`, `treatment_state`, `treatment_zip` | City, State, Zip | `text` (each falls back to the mailing `city` / `state` / `zip` when NULL) | `aggregate` | - |
| `mailing_address`, `city`, `state`, `zip` | Mailing Address, Mailing City, Mailing State, Mailing Zip | `text` (`address_line1` + `address_line2`; `rpt_office_dim` mailing columns) | `aggregate` | `default_visible = false` |
| `phone`, `fax` | Phone, Fax | `text` | `aggregate` | - |
| `email` | E-mail | `text` | `aggregate` | `default_visible = false` |
| `timezone` | Time Zone | `text` | `aggregate` | - |
| `tax_id` | Tax ID# | `text` | `aggregate` (practice identifier; open question 3) | - |
| `npi` | NPI | `text` | `aggregate` | `default_visible = false` |
| `billing_provider_name` | Insurance Billing Provider | `text` | `aggregate` | - |
| `opening_date` | Opening Date | `date` | `aggregate` | - |
| `office_group_name` | Office Group | `text` | `aggregate` | `null_display` `-` |
| `default_ucr_fee_schedule_name` | Default UCR Fee Schedule | `text` | `aggregate` | - |
| `default_fee_schedule_name` | Default Fee Schedule | `text` | `aggregate` | - |
| `is_active` | Active | `boolean` (`Deleted` when `is_deleted`) | `aggregate` | `count` false |
| `active_operatory_count`, `provider_count`, `user_count` | Operatories, Providers, Users | `integer` | `aggregate` | `visible_when ["truthy", "include_counts"]`; `sum` |

| Item | Rule |
|---|---|
| Groups | family office band `Office : {office_name}` (`when ["ctx", "multi_office"]`), one row per band; block `hours` repeats per band |
| Sort | `office_name`, `office_id` |
| Summary | offices listed, inactive |

### Visuals and drill-through

Chart: none. Drill: row → record `office` (Office Setup); `active_operatory_count` → `lists.operatory_list` with
`office_ids = [{"column": "office_id"}]`; office group cell → same report with `office_group_id = {"column":
"office_group_id"}`; default schedule cells → `lists.procedure_codes_by_fee_schedule` with `fee_schedule_id` of the cell.

### Actions

`open_office` (row), `export_selection` (bulk).

### Export and print

PDF landscape (header rule), 8 pt; footer echo `Offices :` / `Office Group :`; XLSX one row per office, sheet `Offices`,
sheet `Hours` when requested; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns and whether the list prints inactive offices | Live run (family OQ 2) |
| 2 | One-row office bands look redundant: suppress the band on this report in multi-office runs? | Product decision (header rule) |
| 3 | Class of office `tax_id` (EIN) and `npi`: `aggregate` or a restricted class | 08 |

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

<!-- PARITY:setup_list_reports.r13:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (vendor-doc correction). Same value rules as Office List. Office attribution = holiday_office (NEW value, owner 03 5.1): account_holidays rows whose office_id is in the resolved set, plus the tenant-wide rows (office_id NULL), printed under every selected office with a Scope column 'Account' (INFERRED: the legacy screen sets enterprise holidays under Setup > Account and whether this report includes them is unknown - supplement unresolved r13). An office row beats the account row for the same date (DentC rule). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range start; fixed basis holiday_date (04 7.2 #36). Row test (INFERRED, supplement unresolved r13): a one-time holiday whose holiday_date lies in the range; a recurring holiday (is_recurring) contributes its yearly occurrences that fall in the range. Default today in the office time zone (relative token, captured 11/21/2026 = capture date); enhanced with presets. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end; fixed basis holiday_date; same intersection rule (INFERRED). Default today (relative token); enhanced with presets. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r13:END -->

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
| Multi-day closures | `account_holidays` stores one `holiday_date` per row: a multi-day closure is entered as several rows and prints as several rows (nothing is migrated); a one-line range print is not offered (open question 5) |
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
| 5 | Does the legacy list print a multi-day holiday (date range) on one line? | Live tool: enter a two-day closure, run |

## Operatory List - `lists.operatory_list`

Lists › Setup List › OFFICE, screenshot `14.PNG` - P3 - S - any of `lists_setup`, `lists_office` - instant - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, scheduler lead | Schedule set-up, chair changes, opening an office | Operatories (schedule columns, not necessarily physical chairs `[P39]`) per office with order, default provider and status |
| Operations | Capacity planning | Chair count per office (active operatories) |

### Legacy output

INFERRED (no comparable found). Reconstruction: office, operatory name (and id), possibly providers assigned to it
(research 8). Daily view shows operatories in alphanumeric order `[P39]`.

| Item | Reconstruction |
|---|---|
| Printed title | `Operatory List` |
| Band | `Office : {office_name}` |
| Columns | `Operatory ID`, `Operatory Name`, `Provider` (default column-header provider) |
| Total | `Operatories : n` per office and grand total |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r14:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (vendor-doc correction). Same value rules as Office List. Office attribution = operatory_office (NEW value, owner 03 5.1, same value as lists.provider_operatory): operatories.office_id IN (resolved set). operatories has no tenant_id column: the dataset scopes the tenant through offices. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r14:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| OFFICE/GROUP `Office` (default) + office box (working office) | `office_ids`: `operatories.office_id IN (resolved set)` (`operatory_office`) |
| office box `SELECT` | other offices, `my_offices`, `all` |
| OFFICE/GROUP `Office Group` + picker | member offices of the group(s) ∩ readable; no groups → `all` (rule d01 of r12, shared) |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

Dependency rule: the shared d01 (radio switches the picker source).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `catalog_status` (family) | `both` | `operatories.is_active` |
| `default_provider_ids` (`entity_multi`, NEW, `lookup:providers`) | `all` | Operatories whose default provider is selected (an attribute filter, not provider attribution; owner 04 section 15) |
| `include_assigned_providers` (`boolean`, NEW) | `false` | Adds `assigned_provider_names`: providers whose `default_operatory_id` is this operatory (the `lists.provider_operatory` relation) |
| `sort_by` (`enum`, NEW: `display_order`, `operatory_name`) | `display_order` | `operatory_name` reproduces the daily view's alphanumeric order |

### Data

| Item | Rule |
|---|---|
| Dataset | passthrough `operatories` (DATA-45), tenant through `offices` (no `tenant_id` on the table) |
| Columns used | `id`, `legacy_id`, `office_id`, `name`, `display_order`, `provider_id`, `is_active`, `created_at`; `operatory_type` NEW (DATA-45) |
| Labels | office band from `rpt_office_dim`; provider `rpt_provider_dim.provider_name` (`Name (short_id)`) |
| Attribution | `operatory_office` (NEW, header) |
| Reconciliation | per office, count of active rows = `rpt_office_dim.active_operatory_count` (`reconciles_with` test, no metric key) |
| Availability | READY (row 106). Operatories of a deleted office: listed under that office when it is in the resolved set (`offices.deleted_operatory_ids` not used) |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `operatory_id` | Operatory ID | `id` | `aggregate` | `row_id_column` |
| `legacy_id` | Legacy ID | `text` | `aggregate` | `default_visible = false` |
| `display_order` | Order | `integer` | `aggregate` | - |
| `operatory_name` | Operatory Name | `text` | `aggregate` | `count`, `Operatories :` per band and grand total |
| `default_provider_name` | Provider | `text` | `aggregate` (provider label as operational attribute) | `null_display` `-` |
| `assigned_provider_names` | Providers Using as Default | `text` | `aggregate` | `visible_when ["truthy", "include_assigned_providers"]` |
| `operatory_type` | Type | `text` | `aggregate` | NEW (DATA-45); `default_visible = false` |
| `is_active` | Active | `boolean` | `aggregate` | `count` true, `Active :` |
| `created_at` | Created | `datetime` | `aggregate` | `default_visible = false` |
| `office_id`, `office_name` | Office | `id`, `text` | `aggregate` | hidden band key and label |

Groups: family office band (multi-office), subtotal `Operatories :`. Sort: `display_order`, `operatory_name`,
`operatory_id`. Page break enhancement `page_break_by` `office`. Summary: operatories, active.

### Visuals and drill-through

Chart: optional bar `operatories_by_office` (active count) in multi-office runs. Drill: row → record `operatory` (Office
Setup › Operatories); provider cell → record `provider`; office band → `lists.office_list` for that office.

### Actions

`open_operatory` (row), `open_scheduler_day` (row, `navigate` to the scheduler for the operatory's office, today),
`export_selection` (bulk).

### Export and print

PDF portrait, office band headers, `page_break_by office` optional; XLSX one flat sheet with office columns; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns (provider? order? id?) and row order | Live run |
| 2 | Are inactive operatories listed | Family OQ 2 |

## ADA Categories List - `lists.ada_categories_list`

Lists › Setup List › MISC, screenshot `15.PNG` - P3 - S - any of `lists_setup`, `lists_procedure_fee` - instant - PARTIALLY DOCUMENTED (table content `[P26]`, layout INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, insurance coordinator | Setup, plan entry training | The ADA categories with their code ranges - the value list of every CATEGORY filter and the basis of coverage setup; the setup screen is read-only (the system assigns a code's category from the code) `[P26][P42]` |

### Legacy output

PARTIALLY DOCUMENTED: the setup screen holds, per category, the procedure code range and its description `[P26]`.

| Item | Reconstruction |
|---|---|
| Printed title | `ADA Categories List` |
| Columns | `Category` (code range, e.g. `D0100 - D0999`), `Description` (e.g. `Diagnostic`) |
| Rows | the 12 ADA categories in CDT order (INFERRED); whether `Medical` / `Account` print is unknown |
| Total | `Categories : n` |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r15:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r15:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged (the only criterion) |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

No other control and no dependency rule.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `include_code_counts` (`boolean`, NEW) | `false` | Adds `code_count` and `active_code_count` (as `GET /procedure-code-categories`) |
| `include_non_ada_categories` (`boolean`, NEW) | `true` | `false` drops `Medical` and `Account` (non-CDT categories) |

`catalog_status` is not offered (read-only system data, header).

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_procedure_code_dim` (P0), grouped by `code_category` (global, no tenant column) |
| Range | header rule: derived from the member codes, `min(procedure_code)` / `max(procedure_code)` over `is_cdt` codes of the category; non-CDT categories over all members. A derived range shows the first and last code present (`D0120`), not the CDT bound (`D0100`) - open question 1 |
| Category order | NEW `category_sort` (CDT order Diagnostic, Preventive, Restorative, Endodontics, Periodontics, Prosthodontics removable, Maxillofacial Prosthetics, Implant Services, Prosthodontics fixed, Oral and Maxillofacial Surgery, Orthodontics, Adjunctive General Services; then non-CDT): `min(procedure_code)` of the category |
| Office / provider / date | none |
| Availability | READY (row 108) |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `code_category` | Description | `text` | `aggregate` | `row_id_column`; `count`, `Categories :` |
| `code_range` | Category | `text` (`{range_from} - {range_to}`) | `aggregate` | - |
| `range_from`, `range_to` | From, To | `text` | `aggregate` | hidden (sort, XLSX) |
| `code_count`, `active_code_count` | Codes, Active Codes | `integer` | `aggregate` | `visible_when ["truthy", "include_code_counts"]`; `sum` |
| `category_sort` | - | `text` | `aggregate` | hidden; default sort |

Sort: `category_sort`. No groups.

### Visuals and drill-through

Chart: with counts, bar `codes_by_category`. Drill: row → `lists.procedure_codes_list` with `procedure_category_codes =
[{"column": "code_category"}]`, `procedure_code_status = active` (family cross-report drill).

### Actions

`export_selection` (bulk). No record screen: categories are read-only.

### Export and print

PDF portrait, one page; XLSX one sheet with `range_from`, `range_to` as separate cells; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Legacy range = CDT bounds or first / last code present (if CDT bounds: a shipped range table, NEW for 03) | Live screen |
| 2 | Are `Medical` / `Account` (or other non-ADA categories) listed | Live run |
| 3 | Column order (`Category` as range first?) | Live run |

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

<!-- PARITY:setup_list_reports.r16:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r16:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF |
| PRINT FORMAT `Excel` | Screen preview, then XLSX; `csv` added |

No filters, no dependency rules: the report prints the whole default table.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
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
| Availability | READY where seeded (coverage matrix row 111) for key, % and description; frequency READY from the built-in constant; Age Limitation and Waiting Period SCHEMA(2) (NEW storage owned by 03, RPT-STLIST-56; not yet numbered in `data_work_items.md`); `Ded. Waived` constant `No` until the same storage exists. Correction of row 111 requested through RPT-STLIST-56 |

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
| `ded_waived` | Ded. Waived | boolean `Yes` / `No` (the builder returns `False` for every row: no storage, RPT-STLIST-56) | aggregate | none (default hidden) |
| `source_label` | Source | enum `Tenant` / `Built-in` | aggregate | none (default hidden) |
| `mapped_code_count` | Codes | integer | aggregate | none (default hidden) |

Row id: `coverage_key` (`row_id_column`; the builder returns one row per key and no `definition_id`). No `is_active` column
and no `catalog_status`: `default_coverage_rules()` reads only active `DEFCOVERAGE` rows - the rows a new plan receives.

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

## Document Types List - `lists.document_types_list`

Lists › Setup List › MISC, screenshot `17.PNG` - P3 - S - `lists_setup` - instant - PARTIALLY DOCUMENTED (table fields `[P26][P51]`, layout INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, imaging / records lead | Setup, before document-scanning clean-ups, audits | The document types that categorise scanned and uploaded patient documents (two-digit `Type Code`, `Description`) |

### Legacy output

PARTIALLY DOCUMENTED (fields known, layout INFERRED):

| Item | Reconstruction |
|---|---|
| Printed title | `Document Types List` |
| Columns | `Type Code`, `Description` |
| Total | `Document Types : n` |
| Order | by type code (INFERRED) |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r17:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r17:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged (the only criterion) |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

No other control, no dependency rule.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `catalog_status` (family) | `both` | `definitions.is_active` |
| `include_document_counts` (`boolean`, NEW) | `false` | Adds `document_count` (patient documents of the type, tenant-wide) and `last_used_at` (latest `created_at`): unused types to retire |
| `document_type_groups` (`enum_multi`, NEW: `document_type`, `imaging_document_type`; `predicate`) | `document_type` | Also lists the imaging document types (DentC keeps them in a second group; whether legacy lists them is open question 1) |

### Data

| Item | Rule |
|---|---|
| Dataset | passthrough `definitions` group `document_type` (DATA-45), one row per (`tenant_id`, `group_code`, `key1`) (03 3.7: up to five migrated copies) |
| Columns used | `key1` (type code), `description`, `is_active`, `sort_order`, `updated_at`, `updated_by` |
| Counts | `patient_documents.document_type` (free `String(50)`) grouped and matched to `key1` (or `description` on migrated rows; the stored form is for 03 to confirm) |
| Office / provider / date | none |
| Availability | READY (row 109) |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `type_code` | Type Code | `text` | `aggregate` | `count`, `Document Types :` (printed key and sort; not unique: one `key1` can carry two labels and occur in two groups) |
| `description` | Description | `text` | `aggregate` | - |
| `group_code` | Group | `text` | `aggregate` | `visible_when` the list holds two groups (`["in", "document_type_groups", ["imaging_document_type"]]`) |
| `is_active` | Active | `boolean` | `aggregate` | `count` false |
| `document_count` | Documents | `integer` | `aggregate` | `visible_when ["truthy", "include_document_counts"]`; `sum` |
| `last_used_at` | Last Used | `date` | `aggregate` | same `visible_when` |
| `updated_at` | Modified | `datetime` | `aggregate` | `default_visible = false` |
| hidden `document_type_id` | | `id` (`definitions.id`) | `aggregate` | `row_id_column` |

Sort: `type_code` (numeric-aware: `01` < `10`), tie-breakers `group_code`, then `description`. No groups.

### Visuals and drill-through

Chart: none. Drill: row → record `definition` (Setup › Definitions, group `document_type`). No drill to documents
(patient rows; would need `phi_identified`).

### Actions

`open_definition` (row), `export_selection` (bulk).

### Export and print

PDF portrait, one page; XLSX one sheet; CSV.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Does the legacy list include imaging document types | Live run |
| 2 | Are inactive types printed | Family OQ 2 |

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

<!-- PARITY:setup_list_reports.r18:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r18:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF |
| PRINT FORMAT `Excel` | Screen preview, then XLSX; `csv` added |

No filters, no dependency rules.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `catalog_status` (family) | `both` | `definitions.is_active` | header |
| `include_macro_counts` (`boolean`, `role: query`) | `false` (AD-8: the default run stays the legacy one-column list; a saved view turns it on) | Adds `macro_count` per category and a trailer row `(No category)` / `(Unknown category)` for macros whose `category` matches no definition | NEW, 04 section 15 |

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
| `macro_count` | Macros | integer | aggregate | sum (all macros); `visible_when ["truthy", "include_macro_counts"]` |
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

<!-- PARITY:setup_list_reports.r19:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| MACRO CATEGORY | (no label) (dropdown) | shown: ALL | `note_macro_category_codes` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed: ALL plus the account's notes-macro categories (a category is only a Description; standard list follows the ADA categories plus extras - vendor-doc correction). Options from lookup:note_macro_categories (04 13.3; GET /note-macros/categories over definitions group NOTESMACROS). Filters note_macros.category (free text, seeded as numeric category codes) matched to the definition key; ALL keeps macros without a category. Legacy single-select; a list is the enhancement. Confirm the entries on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r19:END -->

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
| `updated_at` | Modified | date; `updated_at` only when `updated_by IS NOT NULL` (edited in DentC), else blank - on migrated macros `updated_at` holds the migration time (same rule as Insurance Plan List, Data `Modified date`) | aggregate | none (default hidden) |
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

<!-- PARITY:setup_list_reports.r20:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:setup_list_reports.r20:END -->

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
| Dataset | `definitions` group `PATTYPE` (passthrough, DATA-45; the group the backend print service and the patient Overview read [V `app/services/print_service.py` L402, `src/features/patient-overview/useOverviewData.ts` L112]; confirm with 03 on a migrated tenant), one row per (`tenant_id`, `group_code`, `key1`): `key1` (type code), `description`, `is_flash_alert`, `blocks_charges`, `is_active` [V `app/db/models/reference.py` L15-50] |
| Patient counts | `rpt_patient_dim.patient_type_codes` (array: JSON `patient_types` plus the single `patient_type` mapped through `rpt_value_map` domain `patient_type`, data card 3.5); `count(*)` per code, active = `is_active` |
| Unmapped trailer | Raw `patient_type` / `patient_types` values with no `rpt_value_map` entry and no catalog code (DATA-02 readiness) |
| Not this list | The General / Ortho `PATIENT TYPE` criterion is a different concept (data card 3.5) |
| Scope | `office_mode = none`; counts are tenant-wide, limited to patients the caller may see when office-restricted (patient home office) |
| Availability | READY for code and description (coverage matrix row 113 names group `patient_type`: correction to `PATTYPE` requested through RPT-STLIST-60). Flash alert / block charges: the columns exist on `definitions`, but whether migrated `PATTYPE` rows carry the legacy values is unverified; if they do not, the two columns are REPAIR (DATA-45 extension, owner 03) with `availability[]` `patient_type_flags_not_migrated`. Counts on migrated patients depend on the `rpt_value_map` patient-type map |

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
| 3 | Do migrated `PATTYPE` definitions carry the legacy flash-alert and block-charges values? | 03 on a migrated tenant |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-STLIST-01 | Family base module `app/reports/definitions/lists/setup/_common.py`: shared parameter declarations (`output_format`, `office_scope` visible and hidden variants, `catalog_status`), row-count totals, footer echo labels, `legacy_names` aliases (`Procedure Code List`, `Explosion Code List`, old-screen names) and the 20 definitions | P3 | M | DATA-05, ENG-03, ENG-11, ENG-23, FLT-01 | Lint passes for the 20 definitions; FLT-20 default-run test reproduces every legacy default of the parity file; r07 prints `Explosion Codes List (Summary)` by default |
| RPT-STLIST-02 | Passthrough datasets of the family (`employers`, `insurance_plans`, `insurance_carriers`, `prescription_library`, `explosion_codes`, `code_bundles` and items, `fee_schedules`, `account_holidays`, `operatories`, `note_macros`, the four `definitions` groups) with tenant scope, labels and `is_active` | P3 | M | DATA-45, ENG-09 | Each handle returns only rows of the caller's tenant; `operatories` is tenant-scoped through `offices`; a `definitions` key with five duplicate rows prints once |
| RPT-STLIST-03 | Insurance Plan List data: created / modified date and user columns (app stamps coalesced with the legacy strings), `plan_audit_user` role, `NOT EXISTS patient_insurance` rule for Inactive Plans List, trigram index on `insurance_plans.group_number` | P3 | M | DATA-45, DATA-02 | A `group_number` contains-filter over 31k plans returns in under 2 s; a plan on an active patient slot never appears on r04; a migrated plan modified in the legacy tool matches its legacy modified date |
| RPT-STLIST-04 | Attribution values `listed_office`, `holiday_office`, `operatory_office` and the recurring-holiday expansion for Office Holidays (shared with RPT-PRLIST-03) | P3 | S | DATA-45, ENG-59 | A caller restricted to office A gets no operatory or holiday row of office B; an account-wide holiday prints under each selected office; a recurring 07-04 holiday returns one occurrence per year of the range |
| RPT-STLIST-05 | Procedure and fee lists on the DATA-04 flags and DATA-51 fees: `code_type`, `production_type_id`, `bill_to_insurance` bindings, tenant-scoped `rpt_procedure_code_dim` over NEW `tenant_procedure_codes(tenant_id, procedure_code, is_active, production_type_id, bill_to_insurance, user_code)` (03, DATA-04 extension) or the recorded single-catalog decision, `fee_schedule_effective_dates` dependent source, version pricing | P3 | M | DATA-04, DATA-51, FLT-09 | Inactivating a code or mapping its production type in tenant A changes no row of tenant B; changing `fee_schedule_id` reloads the effective dates; a code with two dated entries prints the fee in force on the chosen date; the default run of r06 equals the active-code count of `GET /procedure-codes/stats` |
| RPT-STLIST-06 | Credit Codes Report on `rpt_transaction_code_dim` with the literal `code_kind` / `legacy_class` vocabulary and the provisional TYPE / CLASS option lists | P3 | S | DATA-03 | TYPE = ALL, CLASS = ALL lists every selectable code of the tenant catalog; system codes (`is_system`) are excluded; each code prints sub type, sign and class |
| RPT-STLIST-07 | Rights and data classes of the family: any-of right families per report, `financial_practice` on fees, `user_activity` on r02 audit columns, employer label class per the decision of open question 1 | P3 | S | SEC-01, SEC-03, SEC-07 | A holder of `lists_office` alone runs r12-r14 and gets 403 on r02; a caller without `financial_practice` runs r08 without the fee column in screen, PDF, XLSX and CSV |
| RPT-STLIST-08 | Layouts, drills and actions: banded PDF (portrait / landscape as listed), flat XLSX, record drill to each setup screen, the four cross-report drills, `export_selection` | P3 | M | ENG-23, ENG-27, ENG-30, UX-22 | Layout checklist per report passes; XLSX has no merged cells and a criteria sheet; a click on an ADA category opens Procedure Codes List filtered to it and the drill is audited |
| RPT-STLIST-09 | Live legacy verification of the family: the four `unknown_legacy` controls (r08 schedule and effective-date defaults, r09 TYPE / CLASS lists), the greyed r02 date boxes, the r02 / r05 user relation, r13 account-wide holidays, family open questions 2-5; update decisions file, parity tables and layouts | P3 | M | FLT-23 | `build_parity.py` prints PARITY VALID with `unknown_legacy=0`; every INFERRED layout is confirmed or corrected from one generated sample per report |
| RPT-STLIST-10 | Employer List definition `lists.employer_list`: `employer_ids`, `state_codes`, flat block, row count, footer echo | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | Default run lists every employer of the tenant once; STATE = one state drops employers with a blank state; legacy alias `Employer List` searchable |
| RPT-STLIST-11 | Usage and duplicate enhancements for Employer and Carrier List: `employer_usage`, `carrier_usage`, `include_usage_counts`, `duplicate_candidates_only` (normalised name key) | P3 | S | RPT-STLIST-10, RPT-STLIST-12, RPT-STLIST-03 | An employer referenced by no plan appears only under `unused`; `plan_count` equals `GET /insurance-plans?employer_id=` total; two employers `ACME Inc` / `Acme` share a duplicate band |
| RPT-STLIST-12 | Carrier List definition `lists.carrier_list` with legacy / app stamp coalescing, `catalog_status`, `carrier_insurance_types`, `carrier_data_gaps` | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | Default run lists active and inactive carriers with an `Active` column; `carrier_data_gaps = [payer_id]` lists exactly the carriers with NULL or blank `payer_id`; drill to Insurance Plan List passes `carrier_ids` |
| RPT-STLIST-13 | Drug List definition `lists.drug_list`: `library_entry_user` role, offices column (`All Offices` when unassigned), `drug_office_ids`, `duplicate_candidates_only`, availability warning; confirm on the live tool whether the prescription note prints and, if it does, add NEW `prescription_library.prescription_note` (03, DATA-45 extension) and the `Prescription Note:` sub-row | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45, RPT-STLIST-09 | USER = one app user lists only drugs created or modified by that user and shows the `no_user_on_migrated_rows` warning; a drug assigned to no office prints `All Offices`; the note decision is recorded and, when added, a drug with a note prints its `Prescription Note:` sub-row |
| RPT-STLIST-14 | Procedure Codes List definition `lists.procedure_codes_list` with the six legacy criteria, `coverage_category_codes`, `code_office_ids`, `setup_gaps`, optional category band; request from the owner of `coverage_matrix.md` / 03 to change row 99 default basis to `STATUS = Active` (legacy screenshot default) | P3 | S | RPT-STLIST-05, DATA-04 | Default run count equals active codes of `GET /procedure-codes/stats`; STATUS Both returns all codes; a ticked Bill to Insurance on an unfilled catalogue returns 0 rows plus `bill_to_insurance_unset` |
| RPT-STLIST-15 | `user_code` column for procedure codes (confirm the legacy field; add the column or drop it from the list with a recorded decision) | P3 | S | DATA-45, RPT-STLIST-09 | Decision recorded in 03; when added, a converted code carries its legacy user code |
| RPT-STLIST-16 | Procedure Codes by Fee Schedule definition `lists.procedure_codes_by_fee_schedule`: code filters, `procedure_code_types` (`no_predicate`), required `fee_schedule_id` / `fee_schedule_effective_date`, LEFT JOIN of `rpt_fee_schedule_fees` by validity, `financial_practice` fee columns, header template with schedule and date | P3 | M | RPT-STLIST-05, DATA-51, FLT-09 | For a code with entries dated 1/1/2020 and 1/1/2024 the run on version 1/1/2020 prints the 2020 fee and on 1/1/2024 the 2024 fee; a code without an entry prints an empty fee and counts under `Not priced : n` (priced codes under `Priced : n`); a caller without `financial_practice` gets no fee column |
| RPT-STLIST-17 | Compare and gap enhancements of Procedure Codes by Fee Schedule: `compare_fee_schedule_id` (per-report override without `include_ucr`, `null` = no compare column, registered in 04 15.4 / 2.4), `compare_effective_date`, computed difference and difference %, `fee_entry_filter`, `show_entry_dates` | P3 | S | RPT-STLIST-16 | Difference % of a code with compare fee 0 prints empty (zero guard); `unpriced` lists codes whose entry is missing or `patient_fee <= 0` without `is_no_charge` |
| RPT-STLIST-18 | Fee Schedule List definition `lists.fee_schedule_list`: `[ED: m/d/yyyy]` option labels and `effective_date` column = `coalesce(fee_schedules.effective_date, max(fee_schedule_entries.effective_date))`, `schedule_header_date_missing` warning, entry count and last fee change, `fee_types`, `pricing_models`, usage counts | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | ALL lists every readable schedule once with its entry count equal to `GET /fee-schedule-entries?fee_schedule_id=` total; a migrated schedule with no header date prints its latest entry date as Effective Date; a schedule used by no assignment and no office default appears under `unused` |
| RPT-STLIST-19 | Fee Schedule List `include_fees` block (reading b) as of the office-local today, sheet `Fees` | P3 | S | RPT-STLIST-18, DATA-51 | With `include_fees` each schedule is followed by its codes and the fee in force today; XLSX holds sheets `Fee Schedules` and `Fees` |
| RPT-STLIST-20 | Fee-schedule office scope: the hidden `office_scope` of r08, r10, r11 is a no-op until 04 / 03 decide a rule over `fee_schedule_assignments.office_id` / `office_group_id` and the offices' default / UCR pointers (or `scope.office_mode = none`); request 04 to correct its 6.4 "[V] office-pinned" statement | P3 | S | FLT-01, DATA-45 | No query of the three reads `fee_schedules.office_id`; a caller restricted to office A sees the schedules the decided rule grants |
| RPT-STLIST-21 | Office List definition `lists.office_list`: `listed_office` scope, NEW `rpt_office_dim` columns (address, treatment address, phone, fax, email, tax id, NPI, legacy id), label joins, landscape PDF | P3 | S | RPT-STLIST-04, DATA-05, DATA-45 | Default run lists the working office only; `all` lists every readable office including inactive ones flagged `Active = No`; office group mode without groups lists every readable office |
| RPT-STLIST-22 | Office List enhancements: `include_schedule_hours` block from `office_schedule_days` (stored or default), `include_counts`, `office_data_gaps` | P3 | S | RPT-STLIST-21 | An office without stored hours prints Mon-Fri 08:00-17:00 marked `default`; `timezone_default` lists migrated offices still on `America/New_York` |
| RPT-STLIST-23 | Operatory List definition `lists.operatory_list`: `operatory_office` scope through `offices`, provider labels, `default_provider_ids`, `include_assigned_providers`, `sort_by`, active-count reconciliation | P3 | S | RPT-STLIST-04, RPT-STLIST-02, DATA-45 | Per office the active count equals `rpt_office_dim.active_operatory_count`; a caller of office A never sees office B's operatories; `sort_by = operatory_name` matches the scheduler's column order |
| RPT-STLIST-24 | ADA Categories List definition `lists.ada_categories_list`: category rows from `rpt_procedure_code_dim`, derived range, CDT order, `include_code_counts`, `include_non_ada_categories` | P3 | S | RPT-STLIST-01, DATA-04 | 12 ADA categories print in CDT order with ranges from their codes; counts equal `GET /procedure-code-categories`; a row drills to Procedure Codes List filtered to the category |
| RPT-STLIST-25 | Document Types List definition `lists.document_types_list`: de-duplicated `definitions` rows, numeric-aware type-code sort, `catalog_status`, `include_document_counts`, `document_type_groups` | P3 | S | RPT-STLIST-02, DATA-45 | A type code with five migrated copies prints once; `01` sorts before `10`; `document_count` equals the patient documents of that type |
| RPT-STLIST-40 | Insurance Plan List definition `lists.insurance_plan_list`: `date_basis_set` + range with the enabling rule, `include_user_in_filters` gate, `plan_audit_user` role, carrier / employer sort options, landscape layout, summary cards | P3 | M | RPT-STLIST-01, RPT-STLIST-02, RPT-STLIST-03, RPT-STLIST-07, RPT-STLIST-08, FLT-01 | Default run lists exactly the plans modified today (office-local); Created On + Modified On = union; `date_from` / `date_to` stay enabled in every state; `created_by_label` and the creator branch of `user_ids` are gated behind `availability[]` `app_plan_creator_missing` until RPT-STLIST-41; correction of `coverage_matrix.md` row 96 (creator SCHEMA) requested; unticking the gate removes the user predicate from `params`; a caller without `phi_identified` gets no Employer column and no `employer` sort |
| RPT-STLIST-41 | Plan audit stamps: NEW `insurance_plans.created_by_user_id` written on create, backfill from the create audit event, modified-date rule (`updated_by` set -> `updated_at`, else `modified_on`, else created) in the dataset | P3 | S | DATA-45, DATA-36 | A plan created in the app shows its creator; an unedited migrated plan shows its legacy modified date, never the migration day |
| RPT-STLIST-42 | Plan clean-up enhancements: `plan_usage_status`, `duplicates_only` with `duplicate_set_no`, `patient_count`, `insurance_plan_types`, `plan_coverage_type`; consolidate-duplicates navigate action | P3 | S | RPT-STLIST-40, ENG-49 | Two plans with carrier + employer + group `12-34` / `1234` share one set number; `unused` count equals the Inactive Plans List row count for the same carrier filter |
| RPT-STLIST-43 | Inactive Plans List definition `lists.inactive_plans_list`: live-link anti-join, claim and subscriber counts, `employer_ids` / `group_number` / `count_inactive_links_as_used` / `exclude_plans_with_claims` | P3 | S | RPT-STLIST-02, RPT-STLIST-03, RPT-STLIST-45 | Every listed plan returns patients = 0 from `GET /insurance-plans/{id}/usage`; a plan on one active patient slot is absent |
| RPT-STLIST-44 | Bulk action `custom:deactivate_insurance_plans` (handler in Insurance setup): re-check unused per plan, skip and report used ones, confirm, idempotent, audited | P3 | S | ENG-49, SEC-03 | A selection of 10 where one became used deactivates 9, reports 1; a repeated call changes nothing |
| RPT-STLIST-45 | Index `patient_insurance(ins_plan_id)` (Alembic) for the usage anti-join | P3 | S | DATA-45 | Inactive Plans List over 31k plans runs inside the `instant` budget |
| RPT-STLIST-46 | Explosion Codes List definition `lists.explosion_codes_list` on `code_bundles` + items: Summary / Detail formats, title templates, bundle group level, tenant scope through `code_bundles` | P3 | S | RPT-STLIST-01, RPT-STLIST-02, ENG-11 | Default run prints `Explosion Codes List (Summary)` with the three sample columns; Detail lists members in `sort_order`; no member of another tenant can appear |
| RPT-STLIST-47 | Explosion code enhancements: `procedure_codes` containment filter, `available_office_ids` (whole-catalog rule, shared with r19), `inactive_member_codes_only`, Offices column | P3 | S | RPT-STLIST-46, FLT-09 | Filtering on a code returns every bundle containing it; a bundle without office rows is listed for every office |
| RPT-STLIST-48 | Credit Codes Report definition `lists.credit_codes_report`: current version per code, `is_system` excluded, type band, provisional TYPE / CLASS options with the candidate CLASS rule | P3 | S | RPT-STLIST-06, DATA-03 | TYPE = ALL, CLASS = ALL count equals the selectable codes of the tenant; CLASS `Write-Off` with TYPE `Payment` is refused or reset per the rule |
| RPT-STLIST-49 | Credit code extras: `credit_code_sub_types`, `catalog_status`, `show_analytic_mapping`, `show_versions`, `include_usage` (12-month counts, escalation to interactive) and the drill to Special Transaction Report | P3 | S | RPT-STLIST-48, DATA-06, ENG-30 | A code with two versions prints two rows under `show_versions`; the usage drill returns exactly `usage_count_12m` legs |
| RPT-STLIST-50 | Capitation Fee Schedule definition `lists.capitation_fee_schedule`: `copay` option source with `[ED: m/d/yyyy]` labels, schedule bands, latest-entry-per-code rule (no as-of predicate by default), hidden office scope (no-op until RPT-STLIST-20), `financial_practice` fees | P3 | S | RPT-STLIST-05, DATA-51 | ALL prints one band per `copay` schedule the caller may read; for a schedule with entries dated 1/1/2026 and 1/1/2027, the default run prints the 2027 co-pays (the version its ED label names); no `percentage` schedule is offered |
| RPT-STLIST-51 | Capitation extras: `fee_as_of_date`, `include_ucr` + `compare_fee_schedule_id` with `patient_saves`, `procedure_category_codes`, page break per schedule, drill to Capitation Utilization | P3 | S | RPT-STLIST-50, ENG-30 | `patient_saves` = compare fee - co-pay on every row; `fee_as_of_date = 6/1/2026` prints the 2026 co-pays of the same schedule; the band drill opens Capitation Utilization with `include_ucr = true` and the schedule as Fee Schedule To Compare |
| RPT-STLIST-52 | Office Holidays definition `lists.office_holidays`: `holiday_office` attribution, recurring expansion, office band, `holiday_scope`, `holiday_statuses`, presets | P3 | S | RPT-STLIST-04, RPT-STLIST-08 | Default run lists today's holidays of the working office (account rows included, office row wins on the same date); `this_year` lists a recurring holiday once |
| RPT-STLIST-53 | Holiday conflict column `show_booked_appointments` and drill to Appointment List for office + date | P3 | S | RPT-STLIST-52, DATA-16, ENG-30 | `booked_count` equals the rows of the drilled Appointment List; cancelled and archived appointments are not counted |
| RPT-STLIST-54 | Holiday hours: request NEW `account_holidays.open_time`, `close_time` (03), bind `hours_label` | P3 | S | DATA-45 | A `HALF_DAY` holiday with hours prints `8:00 AM - 12:00 PM`; rows without hours print the status only |
| RPT-STLIST-55 | Default Ins Plan Coverage Category List: `python_builder` over `default_coverage_rules()` (whitelist), `coverage_key` row id, `source` and hidden `ded_waived` columns, `show_mapped_codes` / `show_unmapped_codes` blocks | P3 | S | ENG-34, RPT-STLIST-02 | Output equals the 28 rows a new plan receives (tenant or built-in); a tenant with five duplicate DEFCOVERAGE copies prints each key once |
| RPT-STLIST-56 | Per-tenant default coverage limits: NEW storage for frequency, age limitation, waiting period and deductible waived of each default category (03), read by plan seeding and the report; request correction of `coverage_matrix.md` row 111 (Age Limitation, Waiting Period SCHEMA(2)) | P3 | M | DATA-45, RPT-STLIST-55 | Editing a default waiting period changes the report and the next new plan, not existing plans |
| RPT-STLIST-57 | Notes Macro Category List definition `lists.notes_macro_category_list` with `macro_count`, unknown-category trailer and the drill to Notes Macros List | P3 | S | RPT-STLIST-02, ENG-30 | Sum of `macro_count` plus the trailer equals the number of macros; the drill returns exactly that category's macros |
| RPT-STLIST-58 | Notes Macros List definition `lists.notes_macros_list`: category band, category match rule, server-side plain-text rendering of `content`, Offices column | P3 | S | RPT-STLIST-02, RPT-STLIST-08 | ALL lists macros without a category under `(No category)`; macro text in PDF, XLSX and CSV is identical plain text with data tags as `[tag]` |
| RPT-STLIST-59 | Notes macro extras: multi-category with `no_category`, `available_office_ids`, `macro_search_text`, `include_macro_text`, page break per category | P3 | S | RPT-STLIST-58, RPT-STLIST-47 | Searching a tag name returns every macro containing it; `include_macro_text = false` prints one line per macro |
| RPT-STLIST-60 | Patient Types List definition `lists.patient_types_list` on `definitions` group `PATTYPE`: four legacy fields, `flash_alert_only`, block-charges display rule; request correction of `coverage_matrix.md` row 113 (`patient_type` -> `PATTYPE`); check on a migrated tenant whether `PATTYPE` rows carry flash alert / block charges | P3 | S | RPT-STLIST-02 | Every `PATTYPE` definition key prints once; block charges is blank where flash alert is off; the flag check is recorded (REPAIR item raised with 03 if the values were not migrated) |
| RPT-STLIST-61 | Patient type usage: `include_patient_counts`, unmapped-value trailer, drill to Patient List - Grouped By | P3 | S | RPT-STLIST-60, DATA-02, DATA-05, ENG-30 | Count of a type equals the rows of the drilled Patient List - Grouped By run; values missing from `rpt_value_map` appear in the trailer |

<!-- ASSEMBLED from catalog/parts/setup_list_reports/ (00_header.md, 10_reports_01_10.md, 20_reports_11_20.md). Edit this document directly from now on. -->
