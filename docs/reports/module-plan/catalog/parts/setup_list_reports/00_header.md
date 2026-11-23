# Lists - Setup - report specifications

Print and export lists of the setup catalogs of the legacy `Setup List Reports` screen (20 reports, 67 legacy controls,
none added from vendor documentation; screen groups INSURANCE, PRESCRIPTION, PROCEDURE, FEE SCHEDULE, OFFICE, MISC): used
after setup or conversion, before clean-ups, at fee updates and for audits. Hub area **Lists**, tab `setup` (brief section
1; category key `lists`, `subcategory = setup`). Default phase **P3** for all 20; no report needs another phase (every
dataset is a P0 dimension, the P1 `rpt_fee_schedule_fees` or a P3 passthrough of DATA-45).

## Overview

Legacy screen order (the order of `legacy/index/setup_list_reports.controls.json`; report ids r01-r20 follow it). Size: S
up to 2 days, M up to 1 week (brief section 4). Availability = default-run rating of `coverage_matrix.md` 11.1 rows 94-113
(every row READY) with the caveat of its last column. Confidence = `research/legacy_report_outputs_lists.md` section 2 rows
21-40.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `lists.employer_list` | Employer List | Every employer of the employer database (which plans refer to), filtered by employer and state | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.insurance_plan_list` | Insurance Plan List | Every insurance plan (carrier + employer + group number) with created / modified stamps; doubles as a plan-entry change audit | P3 | M | READY (creator / modifier are legacy strings on migrated plans) | PARTIALLY DOCUMENTED |
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
| `lists.default_ins_plan_coverage_category_list` | Default Ins Plan Coverage Category List | Default coverage categories that seed new plans (key, %, description, frequency, age, waiting period) | P3 | S | READY (where `DEFCOVERAGE` is seeded) | PARTIALLY DOCUMENTED |
| `lists.document_types_list` | Document Types List | Document types (type code, description) | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.notes_macro_category_list` | Notes Macro Category List | Notes macro categories (description) | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.notes_macros_list` | Notes Macros List | Notes macros by category (name, availability, probably the template text) | P3 | S | READY | INFERRED |
| `lists.patient_types_list` | Patient Types List | Patient types (code, description, flash alert, block charges) | P3 | S | READY | PARTIALLY DOCUMENTED |

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
| `office_scope` hidden (`visible_when false`, default `all`) | r08, r10, r11 | `all` | Shared rule of 04 6.4: fee schedules are office-pinned catalogs; catalog rule = rows of offices the caller may read plus rows without an office. No legacy control; the option source `fee_schedules` applies the same rule |
| none (`scope.office_mode = none`) | the other 14 | - | 04 6.4: employers, carriers, plans, drugs, codes, macros and types have no office column; the legacy screens have no office filter (procedure codes are global by design, vendor-doc correction r06) |
| `employer_ids` (`entity_multi`, `lookup:employers`) | r01, r02 | `all` | r01: the listed employer; r02: the plan's employer |
| `carrier_ids` (`entity_multi`, `lookup:carriers`) | r02, r03, r04 | `all` | r03: the listed carrier; r02 and r04: the plan's carrier |
| `state_codes` (`entity_multi`, `lookup:definitions:state`) | r01, r03 | `all` | Address state of the listed employer / carrier, normalised through `rpt_value_map` domain `state`; legacy single-select |
| `user_ids` (`entity_multi`, `lookup:users`) | r02, r05 | `all` | Role per report: r02 `plan_audit_user`, r05 `library_entry_user` (both NEW role values, owner 03 5.4, INFERRED). Migrated rows carry no user (r05) or only a legacy string (r02) and match only under `all` |
| `procedure_category_codes`, `production_type_ids` (`entity_multi`) | r06, r08 | `all` | `rpt_procedure_code_dim.code_category`, `production_type_id` (NEW, DATA-04, NULL until filled) |
| `procedure_code_status` (`enum`: `active`, `inactive`, `both`) | r06, r08 | `active` | `rpt_procedure_code_dim.is_active`. `coverage_matrix.md` row 99 says "Both statuses": not followed (legacy capture shows Active); correction requested from 03 |
| `include_only_tooth_required`, `include_only_surface_required`, `include_only_bill_to_insurance` (`boolean`) | r06, r08 | `false` | `requires_tooth`, `requires_surface`, `bill_to_insurance` (NEW, DATA-04: a ticked Bill to Insurance run is empty until setup fills the flag; availability warning) |
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
| `catalog_status` (`enum`: `active`, `inactive`, `both`) | r03, r05, r07, r10, r11, r14, r16, r17, r18, r20 (catalogs with an `is_active` column; not offered on r01 / r19, whose tables are hard-deleted, nor on read-only r15) | `both` | The legacy lists have no status control and no sample shows whether inactive rows print; `both` never hides a row the legacy run might print, and an `Active` column shows the state (no legacy control, so no `default_differs_reason`). Not offered on r06 / r08, which have the legacy STATUS radio | Changing it narrows only |

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
| `insurance_plans` | passthrough (DATA-45); r04 adds `NOT EXISTS patient_insurance` on the plan | r02, r04 | P3 |
| `insurance_carriers` | passthrough (DATA-45) | r02 (label), r03, r04 (label) | P3 |
| `prescription_library` (+ `office_prescription_library`) | passthrough (DATA-45) | r05 | P3 |
| `rpt_procedure_code_dim` | view (DATA-04, DATA-05) | r06, r08, r15 | P0 |
| `explosion_codes` + `explosion_code_items`, `code_bundles` + `code_bundle_items` | passthrough (DATA-45) | r07 | P3 |
| `rpt_fee_schedule_fees` | view (DATA-51) | r08, r11 | P1 |
| `rpt_transaction_code_dim` | view (DATA-03) | r09 | P0 |
| `fee_schedules` | passthrough (DATA-45) | r10 | P3 |
| `rpt_office_dim` | view (DATA-05) | r12; office band and labels of r13, r14 | P0 |
| `account_holidays` | passthrough (DATA-45) | r13 | P3 |
| `operatories` | passthrough (DATA-45) | r14 | P3 |
| `definitions` (`DEFCOVERAGE`, `document_type`, `NOTESMACROS`, `patient_type`) | passthrough (DATA-45), one row per (`tenant_id`, `group_code`, `key1`) (03 3.7) | r16, r17, r18, r20; category labels of r19 | P3 |
| `note_macros` (+ `office_note_macros`) | passthrough (DATA-45) | r19 | P3 |

`freshness = live` for every definition; `cacheable = false` (setup edits must show at once). `cost_class = instant` for
all except r02 (`interactive`: about 31k plans, and a `group_number` contains-filter takes about 20 s through today's API)
and r08 (`interactive`: about 1,100 codes x one schedule version). None of these lists is historical: they show the setup
as it stands now; only r02 filters by created / modified dates. Explosion codes exist in two parallel DentC catalogs: the
legacy sample columns (`Exp. Code Short Descr`, `Exp. Code Descr`, `Default Same Tooth`) match `code_bundles`
(`display_code`, `name`, `same_tooth`); which catalog the report reads is open question 3.

### Population rules without a control

| Report | Rule | Source |
|---|---|---|
| r04 Inactive Plans List | "Inactive" = the plan is attached to no `patient_insurance` row; never `insurance_plans.is_active` (the analysis map `be_data_identity_setup.md` 5.3 says `is_active = false`: superseded by the vendor definition) | vendor-doc correction r04, research 8 |
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
| Employer label | Employer name (r01 key column, r02 / r04 label) is `phi_identified` + `deny` under 08 5.2 rule 13 (an employer can name a person or a small business). Applied literally, a caller without `phi_identified` cannot run Employer List at all. Open question 1 asks 08 whether the setup employer catalog is `aggregate` |
| Audit columns | r02 `created_by_label`, `modified_by_label`, `created_on`, `modified_on` and the `user_ids` parameter: `user_activity` (08 5.2 rule 12, user on a row about a change); non-key |
| Patient manifest | None: no column identifies a patient |

### Family-wide enhancements

| Enhancement | Detail |
|---|---|
| Saved views and favorites | ADD TO MY FAVORITES = server-side saved view + favorite; relative date presets on r02 / r13 (`last_7_days`, `this_month`, `next_month`, `this_year`) |
| Status switch | `catalog_status` (above) |
| Changed-since columns | `created_at` / `updated_at` columns where the table has them (research 9 item 9: legacy has them only on r02), hidden by default in the column chooser |
| Record drill | Each row opens its setup screen (Employers, Carriers, Insurance Plan Details, Prescriptions, Procedure Codes, Explosion Codes, Fee Schedules, Office Setup, Operatories, Holidays, Definitions); `route_key` per report owned by 07, feature right in `drill_targets[].right_code` owned by 08 |
| Cross-report drill | r15 category row -> r06 with `procedure_category_codes`; r18 category row -> r19 with `note_macro_category_codes`; r10 schedule row -> r08 with `fee_schedule_id`; r03 carrier row -> r02 with `carrier_ids` |
| Data-quality hints | `availability[]` warnings: production type / bill-to-insurance / code type not filled (r06, r08), legacy-string users (r02), no user on migrated drugs (r05), no holidays configured (r13), `DEFCOVERAGE` not seeded (r16) |
| Schedules | All 20 `schedulable = true` (no patient context); typical: r02 weekly "modified last 7 days" to the insurance coordinator, r13 yearly |
| Export selection | Bulk `export_selection` on every report (Full Control + `reports_export_data_files`) |

### Family-wide open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Is the setup employer catalog `aggregate` or `phi_identified` (08 5.2 rule 13)? | Decision of 08 |
| 2 | Do the lists print inactive rows (drives `catalog_status`)? | Inactivate a test carrier, drug and operatory on the live tool; run each list |
| 3 | Which DentC catalog is the legacy explosion code: `explosion_codes` or `code_bundles`? | Compare the 2022 sample columns with both tables on a migrated tenant (03) |
| 4 | Is the Excel output a flat table or the PDF layout in cells? | Export one list to Excel on the live tool |
| 5 | Row order of each list (the Explosion Codes sample is not alphabetical) | Run each list with three rows of different initials |

<!-- WORK-ITEMS -->
| RPT-STLIST-01 | Family base module `app/reports/definitions/lists/setup/_common.py`: shared parameter declarations (`output_format`, `office_scope` visible and hidden variants, `catalog_status`), row-count totals, footer echo labels, `legacy_names` aliases (`Procedure Code List`, `Explosion Code List`, old-screen names) and the 20 definitions | P3 | M | DATA-05, ENG-03, ENG-11, ENG-23, FLT-01 | Lint passes for the 20 definitions; FLT-20 default-run test reproduces every legacy default of the parity file; r07 prints `Explosion Codes List (Summary)` by default |
| RPT-STLIST-02 | Passthrough datasets of the family (`employers`, `insurance_plans`, `insurance_carriers`, `prescription_library`, `explosion_codes`, `code_bundles` and items, `fee_schedules`, `account_holidays`, `operatories`, `note_macros`, the four `definitions` groups) with tenant scope, labels and `is_active` | P3 | M | DATA-45, ENG-09 | Each handle returns only rows of the caller's tenant; `operatories` is tenant-scoped through `offices`; a `definitions` key with five duplicate rows prints once |
| RPT-STLIST-03 | Insurance Plan List data: created / modified date and user columns (app stamps coalesced with the legacy strings), `plan_audit_user` role, `NOT EXISTS patient_insurance` rule for Inactive Plans List, trigram index on `insurance_plans.group_number` | P3 | M | DATA-45, DATA-02 | A `group_number` contains-filter over 31k plans returns in under 2 s; a plan with a patient slot never appears on r04; a migrated plan modified in the legacy tool matches its legacy modified date |
| RPT-STLIST-04 | Attribution values `listed_office`, `holiday_office`, `operatory_office` and the recurring-holiday expansion for Office Holidays (shared with RPT-PRLIST-03) | P3 | S | DATA-45, ENG-59 | A caller restricted to office A gets no operatory or holiday row of office B; an account-wide holiday prints under each selected office; a recurring 07-04 holiday returns one occurrence per year of the range |
| RPT-STLIST-05 | Procedure and fee lists on the DATA-04 flags and DATA-51 fees: `code_type`, `production_type_id`, `bill_to_insurance` bindings, `fee_schedule_effective_dates` dependent source, version pricing | P3 | M | DATA-04, DATA-51, FLT-09 | Changing `fee_schedule_id` reloads the effective dates; a code with two dated entries prints the fee in force on the chosen date; the default run of r06 equals the active-code count of `GET /procedure-codes/stats` |
| RPT-STLIST-06 | Credit Codes Report on `rpt_transaction_code_dim` with the literal `code_kind` / `legacy_class` vocabulary and the provisional TYPE / CLASS option lists | P3 | S | DATA-03 | TYPE = ALL, CLASS = ALL lists every selectable code of the tenant catalog; system codes (`is_system`) are excluded; each code prints sub type, sign and class |
| RPT-STLIST-07 | Rights and data classes of the family: any-of right families per report, `financial_practice` on fees, `user_activity` on r02 audit columns, employer label class per the decision of open question 1 | P3 | S | SEC-01, SEC-03, SEC-07 | A holder of `lists_office` alone runs r12-r14 and gets 403 on r02; a caller without `financial_practice` runs r08 without the fee column in screen, PDF, XLSX and CSV |
| RPT-STLIST-08 | Layouts, drills and actions: banded PDF (portrait / landscape as listed), flat XLSX, record drill to each setup screen, the four cross-report drills, `export_selection` | P3 | M | ENG-23, ENG-27, ENG-30, UX-22 | Layout checklist per report passes; XLSX has no merged cells and a criteria sheet; a click on an ADA category opens Procedure Codes List filtered to it and the drill is audited |
| RPT-STLIST-09 | Live legacy verification of the family: the four `unknown_legacy` controls (r08 schedule and effective-date defaults, r09 TYPE / CLASS lists), the greyed r02 date boxes, the r02 / r05 user relation, r13 account-wide holidays, family open questions 2-5; update decisions file, parity tables and layouts | P3 | M | FLT-23 | `build_parity.py` prints PARITY VALID with `unknown_legacy=0`; every INFERRED layout is confirmed or corrected from one generated sample per report |
<!-- /WORK-ITEMS -->
