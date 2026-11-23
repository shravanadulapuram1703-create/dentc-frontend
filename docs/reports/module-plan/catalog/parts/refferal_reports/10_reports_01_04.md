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

<!-- PARITY:refferal_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | `output_format = pdf`: preview on screen, then the banded PDF. Rows unchanged |
| PRINT FORMAT `Excel` | `output_format = xlsx`: flat typed sheet from the same snapshot (`csv` added). Rows unchanged |
| OFFICE/GROUP `Office` (default) + picker (default working office) | `office_ids`: patients whose `rpt_patient_dim.home_office_id` is in the set (current state); their production, visits and procedures counted only where `rpt_charges.office_id` is in the set, collections and adjustments only where the transaction office is in the set. One `Office :` band per office when more than one office resolves |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` (or `office_group_ids`): every office of the group, same rule as above, banded per home office |
| PROCEDURE DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on `service_date`: production, `#Proc` and `# Visits` of charges / visits dated in the range; collection = payments allocated to those charges; `Adjs` = adjustments whose effective service date is in the range |
| FIRST VISIT DATE RANGE Start / End (default blank = all patients) | `first_visit_date_from` / `first_visit_date_to`: keep only patients whose `first_visit_date` is in the range (new-patient cohort); one bound blank = open on that side; both blank = no restriction. Help text `( LEAVE BLANK FOR ALL PATIENTS )` kept |
| ZIP CODE RANGE From / Through (default blank) | `zip_code_from` / `zip_code_to`: inclusive string range on `rpt_patient_dim.zip5`; blank side = open; patients without a zip drop out as soon as either bound is set |
| REFERRAL TYPE `ALL` (default) | `referral_type_codes = all`: no type predicate; patients with any type, and patients with a Referred By source but no type, are listed |
| REFERRAL TYPE one type | `referral_type_codes = [code]`: the patient's own referral type (`source_type_label`), not the type of the source row; patients of that type without a source are kept (blank `Referral`) |
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
| Share columns | column switch `show_share_columns` (`boolean`, P3, family item) | `false` | Adds `% of patients` and `% of production` per type and source (`share_of_parent`) |
| `compare_to` | comparison period (FLT-26, P4) | `none` | Adds `Production (prior)` and `Collection (prior)` per patient and per subtotal for `previous_period` / `previous_year` |
| All-office activity option | `boolean` NEW, P4 (family enhancement "cross-office view"; key to be aligned with r05 / r06) | `false` | Ignore the office restriction of the money legs: count the patient's production and collections in every office |
| Saved view "New patients this month by source" | saved view | - | `date_preset = month_to_date`, `first_visit_date_preset = month_to_date` |
| Saved view "Last year by zip" | saved view | - | `date_preset = last_year`, `group_by = zip_code` |

### Data

| Item | Rule |
|---|---|
| Population | `rpt_referral_facts` rows with `referral_kind = 'inbound_source'` (patients with a non-blank `referred_by` or `referral_type`), one per patient; `office_id` (= `rpt_patient_dim.home_office_id`) in the resolved office set; filters below; and at least one of: a visit, a charge, a collection allocation or an adjustment counted in the range [I] (unless `include_zero_activity`) |
| Datasets | `rpt_referral_facts` (`patient_id`, `office_id`, `referral_source_id`, `source_name`, `source_type_label`, `source_category`); `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `zip5`, `first_visit_date`); `rpt_charges` (`patient_id`, `office_id`, `service_date`, `charged_fee`, `is_production`); `rpt_visits` (`patient_id`, `office_id`, `visit_date`); `rpt_payment_allocations` (`debit_patient_id`, `service_date`, `amount`, `credit_ledger_bucket`, `counts_as_collection`, `allocation_target`, `credit_office_id`); `rpt_adjustments` (`patient_id`, `office_id`, `amount`, `entry_type`, `is_transfer`, `linked_service_date`, `transaction_date`); `rpt_office_dim` (`office_name`, band label) |
| `# Visits` | `count(*)` of `rpt_visits` rows of the patient with `visit_date` in the range and `office_id` in the set |
| `#Proc` | `count(*)` of live `rpt_charges` rows of the patient with `is_production`, `service_date` in the range, `office_id` in the set [I: legacy may count only ledger codes - confirm] |
| `Production` | `Σ charged_fee` of the same rows (posted fee, PD-1 legacy parity) |
| `Collection` | `Σ amount` of `rpt_payment_allocations` rows with `credit_ledger_bucket = 'collection'`, `counts_as_collection`, `allocation_target = 'production'`, `debit_patient_id` = patient, `service_date` (of the paid charge) in the range, `credit_office_id` in the set. Positive. Net of refunds by construction (a refund takes its payment back first, data card 2.13). As of the run: a payment posted after `date_to` on a charge in the range counts [I] |
| `Adjs` | `Σ amount` (signed: credit negative) of `rpt_adjustments` with `entry_type = 'adjustment'`, `NOT is_transfer`, `coalesce(linked_service_date, transaction_date)` in the range, `office_id` in the set |
| Date basis | `service_date` fixed (`date_basis` served, no parameter); office-local inclusive dates; `today` of the working office |
| Office attribution | `home_office` for the patient row (current state) plus office-restricted money legs (header). `scope.office_attribution = home_office` |
| Provider attribution | None (no provider parameter, no provider column) |
| `first_visit_date` filter | `rpt_patient_dim.first_visit_date` (first visit-code charge in any office; maintained by DATA-19) |
| `zip_code` filter | `zip5 >= :from AND zip5 <= :to` (text comparison, bounds trimmed to 5 characters) |
| `referral_type_codes` | `source_type_label` mapped through `rpt_value_map` domain `referral_type` (migrated `REFTYPE` codes and app labels fold to one canonical value) |
| Group keys | `source_type_label` (null -> `No Referral Type` [I]); `zip5` (null -> `No Zip`); `referral_source_id` with label `source_name` |
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
| `patient_id` | Pat ID | id | `phi_identified` | `count` -> the `[n]` of the subtotal label |
| `patient_name` | Patient Name | text | `phi_identified` | label `Total for Referral type, {referral_type_label} [{n}]:` |
| `visit_count` | # Visits | integer | `phi_identified` | `sum` |
| `procedure_count` | #Proc | integer | `phi_identified` | `sum` |
| `production` | Production | money | `financial_patient` | `sum` |
| `collection` | Collection | money | `financial_patient` | `sum` |
| `adjustments` | Adjs | money | `financial_patient` | `sum` |
| `pct_of_patients`, `pct_of_production` | % Patients, % Production | percent | derived | `share_of_parent` on subtotals only; `visible_when` `["truthy", "show_share_columns"]` |
| `patient_last_name`, `referral_source_id`, `source_category`, `office_id` | (hidden) | text / id | `phi_identified` / `aggregate` | sort and drill keys |

By-zip variant (`group_by = zip_code`): same columns without `adjustments`, plus `zip_code` (`zip5`, `phi_identified`, first visible column). Levels: `referral_type_label` (subtotal `Total for Referral type, {referral_type_label} :`, `production` and `collection` only) -> `zip_code` (subtotal `Total for Zip code, {zip_code} :`, all four numeric) -> `referral_source_id` (subtotal `Total for Referral, {referral_source_name} :`, all four numeric). Patient rows inside the source level.

| Item | Rule |
|---|---|
| Grand total | Enhancement on both variants: `Grand Total [n]:` with the same sums (legacy shows none) |
| Sort options | `referral_patient` = `referral_source_name` asc nulls first, `patient_last_name`, `first_name`, `patient_id`; `patient_last_name`; `production_desc`; `collection_desc`; `chart_no`. Group levels always sort by label |
| Page break | `page_break_options`: `none`, `group` (level `referral_type_label`) |
| Title templates | `[{"when": ["eq", "group_by", "zip_code"], "title": "Referral Production Listing (by Zip Code)"}, {"when": true, "title": "Referral Production Listing"}]` |
| Summary cards | `Referred patients` (`count` of `patient_id`), `Production`, `Collection`, `Adjs` (block totals). `reconciles_with`: `production` and `collection` per source = `referral_source_production` for the same params (RPT-REF-03 test) |
| `availability[]` | `referral_current_state`, `referral_free_text_source` (app patients without a source id; applies when any listed row has `referral_source_id IS NULL` and a non-blank `source_name`), `allocation_derived`, `migrated_charges_incomplete` |
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
| 5 | Is "first visit" the first visit in the selected office or in any office? (we use any office) | Live legacy run on a patient who moved offices |
| 6 | Does the legacy tool accept several offices or an office group here (family question 1) | Live legacy tool |
| 7 | Product: should the zip layout type subtotal also sum `# Visits` and `#Proc` (legacy prints only money)? | Product owner |

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

<!-- PARITY:refferal_reports.r02 -->

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
| Datasets | `rpt_referral_facts` with `referral_kind = 'outbound_patient'` (`patient_id`, `office_id` = home office, `source_name` = `patients.referred_to` text, `referral_date` = `referral_to_date`); `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `phone`, `cell_phone`, `work_phone`, `patient_type_codes`, `is_active`); `rpt_patient_activity` (`last_visit_date`); passthrough `referrals` (`id`, `referral_type`, `practice_name`, `last_name`, `first_name`, `specialty`) for the specialist match |
| Specialist match | Until DATA-40 stores a target id: `LEFT JOIN LATERAL (SELECT ... FROM referrals WHERE tenant_id = f.tenant_id AND referral_type = '1' AND lower(btrim(coalesce(practice_name, concat_ws(', ', last_name, first_name)))) = lower(btrim(f.source_name)) ORDER BY id LIMIT 1)` - never multiplies rows. After DATA-40: NEW `patients.referred_to_source_id` (structured referred-out target, header gap, owner 03) joined on `referrals.id` |
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
| `ref_out_dentist` | Ref Out Dentist | text | `phi_identified` | - |
| `specialty` | Specialty | text | `phi_identified` | - |
| `patient_id` | (hidden) | id | `phi_identified` | `count` -> `n` of the total line, per office band and grand |
| `procedure_code`, `row_source` | Procedure, Source | text | `phi_identified` | `visible_when` `["truthy", "include_plan_item_referrals"]` |
| `referred_to_source_id`, `patient_last_name`, `is_returned` | (hidden) | id / text / boolean | `phi_identified` | drill, sort, filter |

| Item | Rule |
|---|---|
| Totals | `Total Patients Referred Out : n` per office band and grand (`count`); with `group_by` also per group |
| Sort options | `ref_out_date` = `ref_out_date`, `patient_last_name`, `first_name`, `patient_id`; `patient_last_name`; `chart_no`; `ref_out_dentist`; `last_visit_date` |
| Page break | `none`, `group` (with `group_by`) |
| Summary cards | `Patients referred out` (count); `Not back since referral` (count where `is_returned = false`). `reconciles_with`: count = `outbound_referrals` restricted to `outbound_patient` (RPT-REF-04 test) |
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

<!-- PARITY:refferal_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (`csv` added); rows unchanged |
| OFFICE/GROUP `Office` / `Office Group` + picker (greyed, shows the working office) | Display only (`enabled_when` false, `disabled_value {"office_ids": "all"}`): never filters. The run applies the catalog rule: sources pinned to an office the caller may read plus sources without an office; every source for a caller with `office_scope_view_all_offices` |
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
| Availability | Coverage matrix row 58: **READY** for the default run (all sources). REFERRAL TYPE and REFERRED TO/BY `both` filters: NEW columns (header gap, owner 03); `include_inactive_sources`: DATA-40 |
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
| 3 | Since the 2026-11 office-group associations of sources: is OFFICE/GROUP still disabled, and are associated sources filtered (family question 7)? | Live legacy tool |
| 4 | Are inactive or deleted sources printed? | Live legacy run after retiring a source |
| 5 | Product: label printed for a patient source to a caller without patient data | Product owner with 08 |

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

<!-- PARITY:refferal_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (`csv` added); rows unchanged |
| REFERRED FROM OFFICE/GROUP `Office` (default working office) / `Office Group` | `referred_from_office_ids` / `referred_from_office_group_id`: cases whose referring office (`referral_cases.from_office_id`) is in the set. Security scope of the report (`security_scope: true`): a caller sees only cases of offices they may read; band `Office : <office>` per office when several |
| REFERRAL DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on `referral_date` of the case; office-local, inclusive |
| REFERRED FROM PROVIDER `ALL` (default) / providers | `referred_from_provider_ids`: `from_provider_id IN (...)`; roster-first list, never scoped by `providers.office_id` |
| REFERRED TO `ALL` (default) / sources | `referred_to_ids`: `external_referral_id IN (...)` (referral sources, direction referred-to) |
| PROCEDURE CODES `ALL` (default) / codes | `procedure_codes`: case kept when ANY of its codes is in the list (`procedure_codes && :list`) |
| USERS `ALL` (default) / users | `user_ids`: creator of the case (`created_by`) [inferred] |
| SPECIALTY `ALL` (default) / one value | `specialty_codes`: `coalesce(case specialty, source specialty)` matches (trimmed, case-insensitive) |
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
| `show_status_summary` | `boolean` NEW | `true` on screen, printed | Block `status_summary` at report end: count per status |
| Saved view "Open outgoing referrals" | saved view | - | `referral_statuses = [pending, accepted, in_progress]`, `date_preset = last_90_days` |
| Saved view "About to expire" | saved view | - | `referral_statuses = [pending]`, `days_open_from = 21` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` case rows (`referral_kind = 'case'`, `case_id`) with `referral_cases.direction = 'external_out'`; case-only columns read from `referral_cases` through `case_id` (`from_office_id`, `from_provider_id`, `external_referral_id`, `procedure_codes`, `specialty`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `treatment_plan_item_id`); `rpt_patient_dim` (`chart_no`, names); `rpt_provider_dim` (`provider_name`, `short_id`); passthrough `referrals` (source label, `specialty`); `rpt_user_dim` (`user_label`, key `'u:' || created_by`); `rpt_office_dim` |
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

Block `status_summary` (`placement: report_end`, `visible_when` `["truthy", "show_status_summary"]`): `referral_status` (`aggregate`) · `case_count` (integer, `aggregate`, `sum`) · `pct_of_cases` (percent, `share_of_parent`). Every vocabulary value printed, zero rows included.

| Item | Rule |
|---|---|
| Sort options | `referral_date` = `referral_date`, `patient_last_name`, `case_id`; `patient_last_name`; `status`; `referred_to`; `days_open_desc` |
| Page break | `none`, `group`, `office` |
| Summary cards | `Referrals` (count), `Open` (pending + accepted + in progress), `Expired` (from `status_summary`). `reconciles_with`: count = `outbound_referrals` restricted to external-out cases |
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
| PDF | `banded_table`, landscape (procedure code lists), office band, `status_summary` block at the end, `criteria_echo = footer` (labels as the legacy sections: `Referred From Office`, `From` / `Thru`, `Referred From Provider`, `Referred To`, `Procedure Codes`, `Users`, `Specialty`, `Statuses` [I: legacy echo labels unknown]) |
| XLSX | Sheet `Outgoing Referrals` (one row per case, `procedure_codes_text` as one text cell, status as label, office as a column); sheet `Status Summary`; criteria sheet |
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

<!-- WORK-ITEMS -->
| RPT-REF-10 | `referral.referral_production_list` definition as specified: population rule, both variant blocks with levels and subtotal labels, grand total, sort options, title templates, summary cards, `availability[]` entries | P3 | M | RPT-REF-02, RPT-REF-01, RPT-REF-07, DATA-40, DATA-19, DATA-26, ENG-11 | Golden fixture of three referral types, a patient without a source and a patient who moved offices: rows, subtotals and grand total equal hand sums in both variants; zip variant has no `adjustments` column and its type subtotal carries only money; definition lint passes against the parity file |
| RPT-REF-11 | Referral Production List drills and actions: patient record, account ledger record, source and zip `rows` drills, type drill to `referral.referral_summary_report`, bulk letters / labels to distinct sources, tasks | P3 | S | RPT-REF-10, ENG-30, ENG-49 | A source-subtotal drill returns exactly the rows of that source; the letter action resolves one recipient per distinct source from the snapshot and counts sources without an address |
| RPT-REF-12 | Referral Production List P3 enhancements: `referred_from_ids`, `source_categories` (NEW), `include_zero_activity`, `sort_by`, `page_break_by`, share columns, two saved views | P3 | S | RPT-REF-10, FLT-09, ENG-28 | Default run unchanged byte for byte; `include_zero_activity = true` adds referred patients without activity with zeros; share columns sum to 100 % per parent |
| RPT-REF-13 | Referral Production List P4: `compare_to` prior-period columns and the all-office activity option (key aligned with r05 / r06) | P4 | S | RPT-REF-10, FLT-26, RPT-REF-09 | Prior-period columns equal a separate run for the prior range; the all-office option changes only the money legs, never the patient population |
| RPT-REF-14 | `referral.referred_out_list` definition as specified: columns, phones cell, totals per band, sort options, summary cards, warnings | P3 | S | RPT-REF-04, RPT-REF-01, DATA-19, ENG-11, ENG-23 | Fixture: patients with `referral_to_date` inside / outside the range and with excluded types give the expected list; `Total Patients Referred Out` equals the row count per band; XLSX splits the three phones |
| RPT-REF-15 | Referred-out target resolution: interim name match of `patients.referred_to` to direction-referred-to sources (lateral, one row), then NEW `patients.referred_to_source_id` after DATA-40; warning `referred_out_name_match` with the unmatched count | P3 | S | DATA-40, DATA-05, RPT-REF-14 | Two sources with the same label never duplicate a patient; a renamed source stops matching and is counted in the warning; after DATA-40 the id join returns the same rows on back-filled data |
| RPT-REF-16 | Referred Out List enhancements: `include_plan_item_referrals` (outbound_item rows), `returned_since_referral`, `group_by`, follow-up worklist view, task / SMS / letter actions | P3 | S | RPT-REF-14, ENG-49 | `not_returned` lists exactly the patients without a visit after `Ref Out On`; SMS action excludes opted-out patients and reports the count; plan-item rows carry `Source = Treatment plan` |
| RPT-REF-17 | `referral.referral_source_list` definition as specified: catalog rule with display-only office control, direction and type filters with their warnings, columns and label mapping, footer echo by label | P3 | S | RPT-REF-05, DATA-45, FLT-03 | Changing the greyed office picker changes neither rows nor hash; `referral_direction = referred_to` lists only direction `1` sources (plus `both` once present); a type filter before the NEW column returns no rows and prints the warning |
| RPT-REF-18 | NEW source attributes consumed by r03: `referrals.source_type_code` (label via `definitions:referral_type`) and the three-valued direction `both`, exposed in Setup › Referrals (request to 03 as a DATA-40 extension) | P3 | S | DATA-40 | A source saved with type and `Both` in Setup appears under `Referred By`, `Referred To` and `Both` and under its type on r03 |
| RPT-REF-19 | Referral Source List extras: usage columns, `duplicates_only`, `group_by`, `sort_by`, extra columns, bulk letters / labels / e-mail to sources, drill to r01 | P3 | S | RPT-REF-17, ENG-49, RPT-REF-12 | Usage counts equal `rpt_referral_facts` counts per source; two sources differing only in punctuation are both listed by `duplicates_only` |
| RPT-REF-20 | Row-level degrade of patient-named referral sources for callers without `phi_identified` (r03; shared with r05): name to type label, contact fields blank (masking rule requested from 08 section 5.5) | P3 | S | SEC-02, ENG-03, RPT-REF-17 | A caller without the class sees `Existing Patient` instead of the patient's name and no address on patient sources, in screen, PDF, XLSX and CSV; doctor sources are unchanged |
| RPT-REF-21 | `referral.external_outgoing_referral_management` definition as specified: case filters, `effective_status`, columns, office band, `status_summary` block, sort options, deleted-case handling | P3 | M | RPT-REF-06, RPT-REF-01, DATA-40, ENG-11, ENG-23 | Fixture with one case per status, one deleted and one pending case older than 30 days: every status checkbox selects exactly its cases, the old pending case is selected by `Expired`, the deleted case appears only with `exclude_deleted_referrals = false`; a caller without the referring office gets none of its cases |
| RPT-REF-22 | Outgoing referrals worklist: saved views "Open outgoing referrals" and "About to expire", `days_open` filter, row drill to the case record, task / SMS actions, `custom:referral_resend` hand-off to the referral feature | P3 | S | RPT-REF-21, ENG-49, ENG-28 | The open view lists only pending, accepted and in-progress cases; the resend action is refused when the feature handler is absent and is audited when present |
<!-- /WORK-ITEMS -->
