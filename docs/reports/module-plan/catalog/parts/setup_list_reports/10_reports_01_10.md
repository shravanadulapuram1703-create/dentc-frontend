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

<!-- PARITY:setup_list_reports.r01 -->

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
| 3 | Class of the employer name (`phi_identified` per rule 13 refuses the run for callers without it) | Family open question 1 (08) |

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

<!-- PARITY:setup_list_reports.r03 -->

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
| `include_usage_counts` (`boolean`, NEW) | `false` | Adds `plan_count` and `subscriber_count` (as on Employer List) |
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
| `created_at_effective`, `modified_at`, `modified_by_label` | Created, Modified, Modified By | `datetime`, `datetime`, `text` | `aggregate` (operational label, 08 5.2 rule 12: not a change log here) | `default_visible = false` |

| Item | Rule |
|---|---|
| Groups | none |
| Sort | `carrier_name`, `carrier_id` |
| Summary header | carriers listed, without payer id, inactive (block totals) |

### Visuals and drill-through

Chart: none. Drill: row → record `insurance_carrier` (Setup › Insurance › Carriers); `plan_count` → family cross-report
drill `lists.insurance_plan_list` with `carrier_ids = {"column": "carrier_id"}`, `date_basis_set = []`, `sort_by = carrier`;
a carrier with no plans also drills to `lists.inactive_plans_list` with the same `carrier_ids`.

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

<!-- PARITY:setup_list_reports.r05 -->

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

<!-- PARITY:setup_list_reports.r06 -->

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
| Dataset | `rpt_procedure_code_dim` (03 2.5, P0, DATA-04); production-type label from `production_types` (tenant) on `production_type_id`; coverage-category label from `definitions` `coverage_category` (one row per `tenant_id`, `group_code`, `key1`) |
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
| 4 | Where `production_type_id` and `bill_to_insurance` live when `procedure_codes` is global but production types are per tenant (per-tenant override table?) | 03 decision (DATA-04) |

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

<!-- PARITY:setup_list_reports.r08 -->

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
(default `all`, catalog rule) filters the FEE SCHEDULE option source (see open question 4).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `procedure_category_codes`, `production_type_ids` multi-select | `all` | Several values |
| `procedure_codes` (shared, code ranges) | `all` | Code subset (e.g. `D2000-D2999` for a crown fee review) |
| `compare_fee_schedule_id` (shared `entity_single`, `lookup:fee_schedules`) | `null` (no compare column; on this report not gated by `include_ucr`) | Adds `compare_fee`, `fee_difference` (`difference(fee, compare_fee)`) and `fee_difference_pct` (`ratio(fee_difference, compare_fee)`): PPO versus UCR |
| `compare_effective_date` (`entity_single`, NEW, `lookup:fee_schedule_effective_dates`, `depends_on [compare_fee_schedule_id]`) | token `today` resolved to the version in force today | Version of the compare schedule |
| `fee_entry_filter` (`enum`, NEW: `all`, `priced`, `unpriced`, `no_charge`) | `all` | `unpriced` = no entry in force or `patient_fee <= 0` without `is_no_charge` (the resolver's "not priced" rule): gaps in an imported schedule |
| `group_by` (`enum`, NEW: `none`, `category`) | `none` | Category bands with `Codes :` subtotal |
| `show_entry_dates` (`boolean`, NEW, `role layout`) | `false` | Shows the entry's own `effective_date` (an entry older than the chosen version still in force) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_procedure_code_dim` (driving set, after code filters) `LEFT JOIN` `rpt_fee_schedule_fees` (P1, DATA-51) on `procedure_code` with `fee_schedule_id = :fee_schedule_id` and the half-open validity test on `:fee_schedule_effective_date`; the unique key (schedule, code, validity period) makes the join row-preserving |
| Columns used | dim as on Procedure Codes List; fees `fee_schedule_name`, `pricing_model`, `fee_type`, `effective_date`, `effective_to`, `patient_fee`, `insurance_fee`, `is_no_charge`, `schedule_fee` |
| Effective-date list | distinct `fee_schedule_entries.effective_date` of the schedule, newest first (order unconfirmed). DentC also versions schedules as rows (`fee_schedules.effective_date`, `version`, `parent_schedule_id`): which of the two is the legacy version list is open for 03 (parity note) |
| Office | hidden `office_scope` `all`, catalog rule of 04 6.4 on the option source and the schedule; `fee_schedules.office_id` is deprecated and never read (codes.py docstring), see open question 4 |
| Provider | none |
| Date basis | `fee_schedule_effective_date` (as-of date of the fee), no transaction date |
| Availability | READY (row 100) with `code_type_default_rule` warning; DATA-51 lands in P1, so the report is buildable in P3 as planned. History: entries carry one `effective_date` and no end; a deleted entry rewrites the past (data card 2.29): an older version prints the entries that still exist |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` | Code | `text` | `aggregate` | `row_id_column`; `count`, `Codes :` |
| `description` | Description | `text` | `aggregate` | - |
| `code_category` | Category | `text` | `aggregate` | hidden unless `group_by = category` (band key) |
| `fee` | Fee | `money` (`decimals 2`, `negative minus`) | `financial_practice` | `none` (no sum); `count` non-null as `Priced :` |
| `insurance_fee` | Plan Pays | `money` | `financial_practice` | `default_visible = false` (managed-care schedules; open question 3) |
| `is_no_charge` | No Charge | `boolean` | `aggregate` | `default_visible = false`; a no-charge code prints `No Charge` in `fee` |
| `entry_effective_date` | Entry Date | `date` (`M/D/YYYY`) | `aggregate` | `visible_when ["truthy", "show_entry_dates"]` |
| `compare_fee` | Fee ({compare_fee_schedule_name}) | `money` | `financial_practice` | `visible_when ["not_empty", "compare_fee_schedule_id"]` |
| `fee_difference` | Difference | `money` | `financial_practice` | computed `difference(fee, compare_fee)`; same `visible_when` |
| `fee_difference_pct` | Difference % | `percent` (`decimals 1`) | `financial_practice` | computed `ratio(fee_difference, compare_fee)`, zero guard; same `visible_when` |
| `requires_tooth`, `requires_surface`, `bill_to_insurance`, `is_active`, `code_type`, `production_type_name` | as Procedure Codes List | | `aggregate` | `default_visible = false` |

| Item | Rule |
|---|---|
| Fee classes | `financial_practice` columns are non-key: a caller without the class gets the code list without fee columns (header) |
| Groups | optional category band; grand total counts only |
| Sort | `procedure_code` asc |
| Summary header | codes listed, priced, unpriced (block totals) |
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
| 4 | Office scope of fee schedules: the catalog rule cannot read the deprecated `fee_schedules.office_id` | 04 / 03 (parity concern) |
| 5 | Category headings in the printout | Live sample |

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

<!-- PARITY:setup_list_reports.r10 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; rows unchanged |
| FEE SCHEDULE `ALL` (default) | `fee_schedule_ids = "all"`: every fee schedule the caller may read (catalog rule of the hidden `office_scope`) |
| FEE SCHEDULE one schedule (`<name> [ED: m/d/yyyy]`) | `fee_schedules.id IN (:fee_schedule_ids)` |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view |

Dependency rules: none. Option labels: `{name} [ED: {M/D/YYYY}]` with ED = `fee_schedules.effective_date`, else the latest
entry date (open question 2).

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
| Office | hidden `office_scope` `all`, catalog rule (see open question 4 of Procedure Codes by Fee Schedule: `office_id` is deprecated) |
| Availability | READY (row 103). `created_at` = migration time on migrated schedules |

### Output

Block `main`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `fee_schedule_id` | Fee Schedule ID | `id` | `aggregate` | `row_id_column` |
| `legacy_id` | Legacy ID | `text` | `aggregate` | `default_visible = false` |
| `fee_schedule_name` | Fee Schedule Name | `text` | `aggregate` | `count`, `Fee Schedules :` |
| `effective_date` | Effective Date | `date` (`M/D/YYYY`) | `aggregate` | - |
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
and `fee_schedule_effective_date` = the latest version (family cross-report drill); managed-care row →
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
| 2 | Which date the `ED` suffix shows in DentC terms (header date or latest entry date) | Compare with a migrated schedule |
| 3 | Office scope of schedules (deprecated `office_id`) | 04 / 03 |

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

<!-- PARITY:setup_list_reports.r12 -->

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
| `treatment_address` | Address | `text` (line 1 + line 2) | `aggregate` | - |
| `city`, `state`, `zip` | City, State, Zip | `text` | `aggregate` | - |
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

<!-- PARITY:setup_list_reports.r14 -->

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

<!-- PARITY:setup_list_reports.r15 -->

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

<!-- PARITY:setup_list_reports.r17 -->

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
| `type_code` | Type Code | `text` | `aggregate` | `row_id_column`; `count`, `Document Types :` |
| `description` | Description | `text` | `aggregate` | - |
| `group_code` | Group | `text` | `aggregate` | `visible_when` the list holds two groups (`["in", "document_type_groups", ["imaging_document_type"]]`) |
| `is_active` | Active | `boolean` | `aggregate` | `count` false |
| `document_count` | Documents | `integer` | `aggregate` | `visible_when ["truthy", "include_document_counts"]`; `sum` |
| `last_used_at` | Last Used | `date` | `aggregate` | same `visible_when` |
| `updated_at` | Modified | `datetime` | `aggregate` | `default_visible = false` |

Sort: `type_code` (numeric-aware: `01` < `10`), tie-breaker `description`. No groups.

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

<!-- WORK-ITEMS -->
| RPT-STLIST-10 | Employer List definition `lists.employer_list`: `employer_ids`, `state_codes`, flat block, row count, footer echo | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | Default run lists every employer of the tenant once; STATE = one state drops employers with a blank state; legacy alias `Employer List` searchable |
| RPT-STLIST-11 | Usage and duplicate enhancements for Employer and Carrier List: `employer_usage`, `carrier_usage`, `include_usage_counts`, `duplicate_candidates_only` (normalised name key) | P3 | S | RPT-STLIST-10, RPT-STLIST-12, RPT-STLIST-03 | An employer referenced by no plan appears only under `unused`; `plan_count` equals `GET /insurance-plans?employer_id=` total; two employers `ACME Inc` / `Acme` share a duplicate band |
| RPT-STLIST-12 | Carrier List definition `lists.carrier_list` with legacy / app stamp coalescing, `catalog_status`, `carrier_insurance_types`, `carrier_data_gaps` | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | Default run lists active and inactive carriers with an `Active` column; `carrier_data_gaps = [payer_id]` lists exactly the carriers with NULL or blank `payer_id`; drill to Insurance Plan List passes `carrier_ids` |
| RPT-STLIST-13 | Drug List definition `lists.drug_list`: `library_entry_user` role, offices column (`All Offices` when unassigned), `drug_office_ids`, `duplicate_candidates_only`, availability warning | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | USER = one app user lists only drugs created or modified by that user and shows the `no_user_on_migrated_rows` warning; a drug assigned to no office prints `All Offices` |
| RPT-STLIST-14 | Procedure Codes List definition `lists.procedure_codes_list` with the six legacy criteria, `coverage_category_codes`, `code_office_ids`, `setup_gaps`, optional category band | P3 | S | RPT-STLIST-05, DATA-04 | Default run count equals active codes of `GET /procedure-codes/stats`; STATUS Both returns all codes; a ticked Bill to Insurance on an unfilled catalogue returns 0 rows plus `bill_to_insurance_unset` |
| RPT-STLIST-15 | `user_code` column for procedure codes (confirm the legacy field; add the column or drop it from the list with a recorded decision) | P3 | S | DATA-45, RPT-STLIST-09 | Decision recorded in 03; when added, a converted code carries its legacy user code |
| RPT-STLIST-16 | Procedure Codes by Fee Schedule definition `lists.procedure_codes_by_fee_schedule`: code filters, `procedure_code_types` (`no_predicate`), required `fee_schedule_id` / `fee_schedule_effective_date`, LEFT JOIN of `rpt_fee_schedule_fees` by validity, `financial_practice` fee columns, header template with schedule and date | P3 | M | RPT-STLIST-05, DATA-51, FLT-09 | For a code with entries dated 1/1/2020 and 1/1/2024 the run on version 1/1/2020 prints the 2020 fee and on 1/1/2024 the 2024 fee; a code without an entry prints an empty fee and counts under `Not priced`; a caller without `financial_practice` gets no fee column |
| RPT-STLIST-17 | Compare and gap enhancements of Procedure Codes by Fee Schedule: `compare_fee_schedule_id`, `compare_effective_date`, computed difference and difference %, `fee_entry_filter`, `show_entry_dates` | P3 | S | RPT-STLIST-16 | Difference % of a code with compare fee 0 prints empty (zero guard); `unpriced` lists codes whose entry is missing or `patient_fee <= 0` without `is_no_charge` |
| RPT-STLIST-18 | Fee Schedule List definition `lists.fee_schedule_list`: `[ED: m/d/yyyy]` option labels, entry count and last fee change, `fee_types`, `pricing_models`, usage counts | P3 | S | RPT-STLIST-01, RPT-STLIST-02, DATA-45 | ALL lists every readable schedule once with its entry count equal to `GET /fee-schedule-entries?fee_schedule_id=` total; a schedule used by no assignment and no office default appears under `unused` |
| RPT-STLIST-19 | Fee Schedule List `include_fees` block (reading b) as of the office-local today, sheet `Fees` | P3 | S | RPT-STLIST-18, DATA-51 | With `include_fees` each schedule is followed by its codes and the fee in force today; XLSX holds sheets `Fee Schedules` and `Fees` |
| RPT-STLIST-20 | Fee-schedule office scope: replace the catalog rule on the deprecated `fee_schedules.office_id` (r08, r10, option source `fee_schedules`) with the rule decided by 04 / 03 | P3 | S | FLT-01, DATA-45 | No query of the three reads `fee_schedules.office_id`; a caller restricted to office A sees the schedules the decided rule grants |
| RPT-STLIST-21 | Office List definition `lists.office_list`: `listed_office` scope, NEW `rpt_office_dim` columns (address, treatment address, phone, fax, email, tax id, NPI, legacy id), label joins, landscape PDF | P3 | S | RPT-STLIST-04, DATA-05, DATA-45 | Default run lists the working office only; `all` lists every readable office including inactive ones flagged `Active = No`; office group mode without groups lists every readable office |
| RPT-STLIST-22 | Office List enhancements: `include_schedule_hours` block from `office_schedule_days` (stored or default), `include_counts`, `office_data_gaps` | P3 | S | RPT-STLIST-21 | An office without stored hours prints Mon-Fri 08:00-17:00 marked `default`; `timezone_default` lists migrated offices still on `America/New_York` |
| RPT-STLIST-23 | Operatory List definition `lists.operatory_list`: `operatory_office` scope through `offices`, provider labels, `default_provider_ids`, `include_assigned_providers`, `sort_by`, active-count reconciliation | P3 | S | RPT-STLIST-04, RPT-STLIST-02, DATA-45 | Per office the active count equals `rpt_office_dim.active_operatory_count`; a caller of office A never sees office B's operatories; `sort_by = operatory_name` matches the scheduler's column order |
| RPT-STLIST-24 | ADA Categories List definition `lists.ada_categories_list`: category rows from `rpt_procedure_code_dim`, derived range, CDT order, `include_code_counts`, `include_non_ada_categories` | P3 | S | RPT-STLIST-01, DATA-04 | 12 ADA categories print in CDT order with ranges from their codes; counts equal `GET /procedure-code-categories`; a row drills to Procedure Codes List filtered to the category |
| RPT-STLIST-25 | Document Types List definition `lists.document_types_list`: de-duplicated `definitions` rows, numeric-aware type-code sort, `catalog_status`, `include_document_counts`, `document_type_groups` | P3 | S | RPT-STLIST-02, DATA-45 | A type code with five migrated copies prints once; `01` sorts before `10`; `document_count` equals the patient documents of that type |
<!-- /WORK-ITEMS -->
