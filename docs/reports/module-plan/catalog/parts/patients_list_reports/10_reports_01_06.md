## Patient List - `lists.patient_list`

Lists › Patient/Resp. Party List, group PATIENT LIST, screenshot `2.PNG` (index id `patients_list_reports.r02`) - P3 - M - right family `lists_patient` (`reports_lists_patient_list_screen_view_only` / `reports_lists_patient_list_screen_full_control`) - cost_class interactive (background when the office scope is an office group or `all`) - legacy output confidence PARTIALLY DOCUMENTED (layout of the predecessor `Patient List - Detail`, 2014)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office, marketing | On demand (campaigns, mailings, e-mail drives) | Name, address, phones, e-mail and birth date of a patient population for a mailing, an e-mail campaign or a phone list |
| Office manager | Month end, audits | Count of active / inactive records (vendor: the way to know the number of records); clean-up of records without e-mail |
| Ortho coordinator | On demand | All orthodontic patients (`PATIENT TYPE = Ortho`, vendor article) |

Not on the vendor's daily or monthly routines; ad hoc (research `Patient List`, Who / when).

### Legacy output

Printed title: `Patient List` [I] (predecessor title `Patient List - Detail`, 2014 sample). Landscape. One row per patient, no
group headers. Confidence of the column list: DOCUMENTED for the predecessor, INFERRED for today's report (same criteria lineage:
`Exclude Patient Type`, `Sex`, `Age`, `Include Inactive Patients`).

| # | Printed column | Content |
|---|---|---|
| 1 | `Title` | `Mr.`, `Mrs.`, `Ms.`, `Miss`, `Dr.` or blank |
| 2 | `Firstname` | |
| 3 | `Lastname` | |
| 4 | `Address` | street line |
| 5 | `City` | |
| 6 | `State` | two letters |
| 7 | `Zip` | |
| 8 | `Email` | wraps onto a second line; blank when missing |
| 9 | `Homephone` | `nnn-nnn-nnnn` |
| 10 | `Cellphone` | |
| 11 | `Birthdate` | `M/D/YYYY` |

| Element | Legacy | DentC |
|---|---|---|
| Order | first name (sample) | kept as default `sort_by = first_name`; last-name order offered (quirk kept, defect fixed by option) |
| Identifier | none printed (duplicates cannot be told apart) | `patient_id`, `chart_no` added as hidden-by-default columns (header rule) |
| Total | none visible on page 1 (15-page sample) | `Total : n` after the last row (header count rule); the vendor describes the list as the way to count records |
| Footer echo | `ExPatType :` (excluded types), `* Excludes Inactive Patients` | same labels, plus `Printed :`, `By :`, `Page : n of m` |
| Older variants | `Patients List` showed the HIPAA flag; `Active Patient List` had Summary / Detail | not reproduced: unknown whether today's report keeps them (open question 2) |

No money. Sign conventions: none.

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Snapshot rendered as PDF (`output_format = pdf`); rows unchanged; preview on screen first |
| PRINT FORMAT `Excel` | `xlsx`, flat typed sheet; `csv` added |
| PATIENT STATUS `Active` (default) | `rpt_patient_dim.is_active = true`; footer `* Excludes Inactive Patients` |
| PATIENT STATUS `Inactive` | `is_active = false` (inactive or deleted until DATA-44; printed "inactive or deleted") |
| PATIENT STATUS `Both` | No predicate |
| PATIENT TYPE `Both` (default) | No predicate |
| PATIENT TYPE `General` | `NOT rpt_patient_dim.is_ortho_patient` |
| PATIENT TYPE `Ortho` | `is_ortho_patient` (ortho tag or active `ortho_plans` contract, data_card 3.5; open decision O-3) |
| OFFICE/GROUP `Office` (default) + picker (default working office) | `office_ids`: `rpt_patient_dim.home_office_id IN (...)` [I] |
| OFFICE/GROUP `Office Group` + picker | `office_group_id`: home offices of the group; no groups defined = every office of the account (`patients_list_reports.r01.d01`) |
| PROVIDER `ALL` (default) | No predicate; patients without any provider kept |
| PROVIDER list | `coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id) IN (:provider_ids)` [I]; patients with neither are dropped |
| INCLUDE PATIENT TYPE `ALL` (default) | No predicate; untyped patients kept |
| INCLUDE PATIENT TYPE list | `patient_type_codes && :list`; source row `no_type_defined` adds patients with an empty `patient_type_codes` |
| EXCLUDE PATIENT TYPE `None` (default) | No predicate |
| EXCLUDE PATIENT TYPE list | `NOT (patient_type_codes && :list)`; untyped patients kept unless `no_type_defined` is chosen; footer `ExPatType : <codes>` |
| SEX `------` (default) | `gender = all`: no predicate |
| SEX other values (not captured, `unknown_legacy`) | Candidate `male` / `female` / `unknown` on the normalised `gender_code` (M / F / blank); patients without a value match only `all` or `unknown` |
| AGE RANGE From / To blank (default) | No predicate (open bounds); patients without `dob` kept |
| AGE RANGE From and / or To set | Whole years at the office-local today of the run: `age >= age_from` and / or `age <= age_to`, inclusive; patients without `dob` dropped |
| OTHER OPTIONS `Include Patients With No Email` ticked (default) | No predicate |
| `Include Patients With No Email` unticked | `nullif(btrim(email), '') IS NOT NULL` (legacy `Patients List - Email`) [I] |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset to defaults (`frontend`) / run then render (`print`) / saved view + favorite (`saved_view`) |

Dependency rules: only the office rule `patients_list_reports.r01.d01` (picker lists offices or office groups by the radio).
No control enables or hides another; `age_from` and `age_to` are independent (no gate on this report, filter_card 3.4 `age`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `sort_by` | `enum` (NEW options for this report): `first_name` (legacy), `last_name_first_name`, `zip_code`, `birth_date`, `chart_no` | `first_name` | Row order; `patient_id` always the final tie-breaker |
| `last_visit_date` | `date_range` (shared key of r06, optional attribute range) | blank | `rpt_patient_activity.last_visit_date BETWEEN ...`; blank = no predicate. Saved view "Not seen in 18 months": `last_visit_date_to = today-18m` |
| `has_future_appointment` | `enum` NEW (`any`, `yes`, `no`) | `any` | `no` = `rpt_patient_activity.next_appointment_date IS NULL`: recall / reactivation call list |
| `only_patients_without_email` | `boolean` NEW | `false` | Inverse of the legacy box: only patients with no e-mail (data-capture drive). `enabled_when include_patients_with_no_email == true` |
| `exclude_no_correspondence` | `boolean` NEW | `false` | Drops `no_correspondence` patients before a mailing; bulk actions apply the consent flags anyway |
| `zip_code` | `text_range` NEW (`zip_code_from`, `zip_code_to`) | blank | `zip5` between the bounds (catchment mailing) |
| `preferred_hygienist_ids` | `entity_multi` (shared) | `all` | Hygiene-team lists |
| `office_scope` choices | shared enhancement | `working_office` | `my_offices`, several groups |

Saved views shipped: "Active ortho patients" (`patient_type = ortho`), "Active patients without e-mail", "Seniors 65+" (`age_from = 65`).

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_patient_dim` (`patient_id`, `chart_no`, `title`, `first_name`, `middle_initial`, `last_name`, `address_line1`, `address_line2`, `city`, `state`, `zip5`, `email`, `phone`, `cell_phone`, `work_phone`, `dob`, `gender_code`, `is_active`, `is_ortho_patient`, `patient_type_codes`, `home_office_id`, `preferred_provider_id`, `preferred_hygienist_id`, `no_correspondence`, `no_auto_email`, `no_auto_sms`, `is_placeholder_patient`); `rpt_patient_activity` (`last_visit_provider_id`, `last_visit_date`, `next_appointment_date`); `rpt_provider_dim` (provider label); `rpt_office_dim` (`office_name`) |
| Date basis | none (`date_basis = null`); age at the office-local today (`rpt_office_dim.local_today` of the working office) |
| Office attribution | home office `rpt_patient_dim.home_office_id` (`scope.office_attribution = patient_home_office`) [I] |
| Provider attribution | `preferred` with fallback `last_visit_provider_id` (`scope.provider_attribution = preferred`); provider ids are strings; never `providers.office_id` |
| Gender | `gender_code` stored as `Male` / `M` etc.; normalised by expression in the dataset (data_card 3.7) to `M` / `F` / NULL |
| Placeholders | Quick-save placeholder records (`is_placeholder_patient`) are not patient records in the legacy tool [I]; they are excluded once DATA-44 sets `registration_status`. Until then the interim flag over-counts real patients, so no row is dropped by it (availability `placeholder_rule_interim`) |
| Availability | Coverage 74: **READY**. Provider criterion on history: no preferred provider was migrated, the derived last-visit provider is used and labelled (`provider_source` column, availability `provider_derived_from_last_visit`). `last_visit_date` enhancement: REPAIR(19) (DATA-19) |
| Migrated history | Current state only (home office, type, flags, address); no list can show the state of an earlier date |

### Output

One format `standard`, one block `main`, grain patient.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `title` | Title | `text` | `phi_identified` | - |
| `first_name` | Firstname | `text` | `phi_identified` | count -> `Total : n` (grand total; per office band when multi-office) |
| `last_name` | Lastname | `text` | `phi_identified` (key column) | - |
| `address` | Address | `text` | `phi_identified` | - (`address_line1`, `address_line2` joined by a space; XLSX keeps two columns) |
| `city`, `state`, `zip5` | City, State, Zip | `text` | `phi_identified` | - |
| `email` | Email | `text` | `phi_identified` | - |
| `home_phone` | Homephone | `text` | `phi_identified` | - (`phone`, formatted `nnn-nnn-nnnn`) |
| `cell_phone` | Cellphone | `text` | `phi_identified` | - |
| `dob` | Birthdate | `date` (`M/D/YYYY`) | `phi_identified` | - |
| optional (`default_visible = false`): `patient_id` (Pat ID), `chart_no` (Chart #), `age_years` (Age), `gender` (Sex), `patient_type_codes` (Pat Type), `home_office_name` (Home Office), `provider_label` (Provider), `provider_source` (`preferred` / `last_visit`), `last_visit_date`, `next_appointment_date`, `work_phone` | | `id`, `text`, `integer`, `date` | `phi_identified`; `provider_label` `aggregate` | - |
| hidden: `patient_id` (`row_id_column`, entity patient), `home_office_id`, `first_name_sort`, `last_name_sort` | | | `phi_identified` / `aggregate` | - |

| Topic | Rule |
|---|---|
| Grouping | `fixed_outer` `Office : {office_name}` when `["ctx", "multi_office"]`; no other level (legacy) |
| Sort | `sort_by` options above; default `first_name`, `last_name`, `patient_id` |
| Page break | `page_break_by` `none` (default) / `office` (enhancement, `layout`) |
| Summary cards | `Patients` (count of the block) |
| Metrics | none reconcile: the count with `patient_status = active` is a status-flag count, not `active_patients` (visit window, PD-5); the card is labelled "Records with status Active" |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list. Multi-office runs offer a bar of patients per home office from the snapshot |
| Name cells | `record` patient (`route_key patient_overview`), `phi_identified`, `assert_patient_visible` |
| `Patients` card | `rows` of the same run (no-op on a list; used by the hub card) |
| `last_visit_date` (optional column) | `record` patient ledger (`route_key patient_ledger`, ledger right) |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open patient | row `navigate` | Patient overview |
| Book appointment | row `navigate` | `openSchedulerForBooking` hand-off with the patient preselected |
| Letters, postcards, labels | bulk `letters` / `postcards` / `labels` | Correspondence features (PD-15); `no_correspondence` patients counted and excluded |
| Text / e-mail campaign | bulk `send_sms` / `send_email` | `requires` `sms_consent` / e-mail present, `no_auto_sms`, `no_auto_email`; exclusion counts shown before send |
| Follow-up task | row / bulk `create_task` | E-mail capture or address correction tasks |
| Export selection | bulk `export_selection` | `reports_export_data_files` |
| Reactivation | link | Opens `worklists.reactivation` (06) with the office scope copied |

Doubles as a worklist: no (static list); the reactivation worklist is the live version.

### Export and print

PDF `banded_table`, landscape (2014 sample), letterhead line 1 office or organisation name, line 2 `Patient List`, grey
header row repeated per page, `Total : n` on the last page, footer echo `ExPatType :`, `* Excludes Inactive Patients`,
`Printed :`, `By :`, `Page : n of m`. XLSX: sheet `Patient List`, one typed row per patient, `address_line1` and
`address_line2` as two columns, the optional columns included when chosen, criteria sheet, no merged cells. CSV: main block
(mail-merge friendly). Background run when escalated (office group / `all`).

### Open questions

| # | Question |
|---|---|
| 1 | SEX option list and labels (captured collapsed, `unknown_legacy`); whether an "unknown" value exists |
| 2 | Does today's Patient List print the 2014 columns, a count line, a HIPAA column or a Summary variant (old `Active Patient List`)? |
| 3 | Office attribution: home office or any office the patient visited (header question 8) |
| 4 | PROVIDER role: preferred provider (assumed) or last treating provider |
| 5 | Are scheduler placeholders ever listed by the legacy Patient List? |
| 6 | PATIENT TYPE `Ortho`: Ortho Patient checkbox only, or also an active ortho contract (data_card 3.5, O-3) |

## Patient List - New Patient - `lists.patient_list_new_patient`

Lists › Patient/Resp. Party List, group PATIENT LIST, screenshot `3.PNG` (index id `patients_list_reports.r03`) - P3 - L - right family `lists_patient` (`reports_lists_patient_list_screen_view_only` / `..._full_control`) - cost_class interactive (background for an office group or `all`) - legacy output confidence PARTIALLY DOCUMENTED (modes and definitions documented, no layout seen)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office | End of day (vendor end-of-day list: `New Patient Thru Appointment`, `New Patient List`) | Complete Quick Save placeholders before the visit; check that every new patient was registered |
| Office manager | Month end | New-patient count and its sources (carrier mix, referral sources, referral types) |
| Marketing | Monthly [I] | Referral and referral-type yield; thank-you letters to referrers |

Three populations share one menu item (placeholders, created records, first visits), so counts differ by mode (research quirk).

### Legacy output

No layout seen; everything below the mode list is INFERRED (basis: legacy variant names, Dentrix Enterprise `New Patient
List`, Open Dental `New Patients Report`). Printed title per mode [I]: `Patient List - New Patient : <mode label>`.

| `report_by` (legacy value) | Folded legacy report | Population (documented) | Printed rows [I] | Grouping and totals [I] |
|---|---|---|---|---|
| `appointment` `Appointment` (default) | `New Patient Thru Appointment` | Patients who have only a "New Patient" appointment and were not activated into a full record | appointment date, time, patient name, phone, provider, operatory | none; `Total : n` |
| `carrier` `Carrier` | none listed | New patients by insurance carrier (meaning inferred) | patient rows | group `Carrier : <name>`, count per group, grand total |
| `created_date_first_visit_date` `Created Date / First Visit Date` | `New Patient List` | Records newly created in the range; the name adds the first-completed-procedure definition | patient rows with both dates | none; `Total : n` |
| `referral` `Referral` | `New Patients - By Referral` | New records in the range, sorted by referral source | patient rows | group `Referral : <source>`, count per group |
| `referral_type` `Referral Type` | `New Patients - By Referral Type` | New records in the range, sorted by referral type | patient rows | group `Referral Type : <type>`, count per group |

No money in the legacy modes (Open Dental totals a production fee; offered here as an enhancement). The same placeholder
population is also printed by `appointment.new_patients_via_appointments`.

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT BY `Appointment` (default) | Block `by_appointment`: one row per live appointment whose patient is a placeholder (`rpt_appointment_facts.is_placeholder_patient`) or that has no patient record (`is_patientless`); date range on `appointment_date`; office = appointment office |
| REPORT BY `Carrier` | Block `by_carrier`: new patients (definition of `new_patient_definition`) grouped by the carrier of the primary dental coverage slot; `(No Insurance)` group for patients without a slot |
| REPORT BY `Created Date / First Visit Date` | Block `by_created_first_visit`: new patients by `new_patient_definition` (default `created_date`), both dates printed |
| REPORT BY `Referral` | Block `by_referral`: new patients grouped by referral source (`referral_source_name`, `(No Referral)` group) |
| REPORT BY `Referral Type` | Block `by_referral_type`: new patients grouped by `source_type_label` |
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added); rows unchanged |
| OFFICE/GROUP `Office` (default: working office) / `Office Group` + picker | `appointment`: `rpt_appointment_facts.office_id IN (...)`; other modes: `rpt_patient_dim.home_office_id IN (...)` [I]; groups per `patients_list_reports.r01.d01` |
| APPOINTMENT DATE RANGE Start / End (default today / today) | Inclusive office-local range on the basis of the mode: `appointment_date` (Appointment); created date of the patient (`created_at_utc` converted with the home office's time zone) or `rpt_patient_activity.first_visit_date` per `new_patient_definition` (the other four modes) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset / run / saved view; the saved view always stores `report_by` |

Dependency rules: none captured. `report_by` selects the block, the title template, the date basis and the office column;
whether the date section title changes with the mode was not captured (open question 3). `new_patient_definition`
(below) is `visible_when ["ne", "report_by", "appointment"]`, `disabled_value created_date`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `new_patient_definition` | `enum` NEW (04 to adopt): `created_date`, `first_visit_date` | `created_date` (first named definition; legacy `New Patient List` = records created) | Makes the slash option deterministic: which date qualifies a patient in the four non-appointment modes. Both dates are always printed. Parity concern: the legacy screen shows no such choice (open question 1) |
| `include_first_visit_production` | `boolean` NEW | `false` | Adds `First Visit Prod.` = `rpt_visits.charged_production` on `first_visit_date` (`financial_patient`); group and grand totals summed |
| `show_next_appointment` | `boolean` NEW | `false` | Adds `next_appointment_date` (`rpt_patient_activity`): new patients not yet rebooked |
| `carrier_ids` | `entity_multi` (shared) | `all` | `visible_when report_by == carrier`; restrict to carriers |
| `referral_type_codes` | `entity_multi` (shared) | `all` | `visible_when report_by in [referral, referral_type]` |
| `preferred_provider_ids` | `entity_multi` (shared) | `all` | New patients of a provider (preferred, fallback first-visit provider is NOT used: migrated patients match only `all`) |
| `appointment_statuses_shown` | `enum` NEW (`all`, `live_only`) | `all` | `live_only` drops cancelled / no-show placeholder appointments (`status_class`); default keeps every non-deleted appointment (legacy rule unknown) |
| `compare_to` | shared enhancement (P4) | `none` | Prior period count beside the grand total and each group count |

Saved views: "New patients this month by referral" (`report_by = referral`, `date_preset = month_to_date`); "Placeholders for tomorrow" (`appointment`, `date_preset = tomorrow`).

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_appointment_facts` (`appointment_id`, `office_id`, `provider_id`, `operatory_id`, `patient_id`, `appointment_date`, `start_time`, `duration_minutes`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`, `is_placeholder_patient`, `status_norm`, `status_class`, `procedure_label`, `booking_source`, `notes`); `rpt_patient_dim` (identity and contact columns, `home_office_id`, `created_at_utc`, `created_at_reliable`, `referral_source_id`, `referral_source_name`, `referred_by_raw`, `referral_type_raw`, `preferred_provider_id`, `is_active`); `rpt_patient_activity` (`first_visit_date`, `first_visit_office_id`, `next_appointment_date`); `rpt_insurance_coverage` (`carrier_id`, `carrier_name`, `employer_name`, `group_number`, `category`, `tier`); `rpt_referral_facts` (`referral_kind = 'inbound_source'`: `source_name`, `source_type_label`, `referral_date`); `rpt_visits` (`charged_production`, enhancement) |
| Appointment mode rows | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND (is_placeholder_patient OR is_patientless)`; a patientless appointment prints `(no patient record)` in the name cell and its `notes` as contact text [I] |
| Other modes rows | live patients with the qualifying date in range: `created_date` basis requires `created_at_reliable = true` (migrated rows carry the load time and are never listed by created date; availability `created_date_app_only`); `first_visit_date` basis reads `rpt_patient_activity.first_visit_date` |
| Carrier | one row per patient: the primary dental slot (`category = dental`, `tier = primary`) via `LEFT JOIN LATERAL ... LIMIT 1`; current coverage (coverage 75b "today's coverage"), not coverage at the first visit |
| Referral | `rpt_patient_dim.referral_source_name` / `rpt_referral_facts.source_type_label`; app patients hold free text until DATA-40 (printed as typed, grouped by text) |
| Office / provider | appointment office (mode `appointment`), home office otherwise [I]; no provider parameter in the legacy screen |
| Availability | Coverage 75a: **SCHEMA(44)** for the default mode - placeholders by the interim rule [I] until `registration_status` (DATA-44); 75b Carrier READY (today's coverage); 75c Created / First Visit READY with first visit derived (REPAIR(19), DATA-19) and created date APP; 75d / 75e Referral READY, app patients SCHEMA(40) (DATA-40) |
| Migrated history | No created date exists for migrated patients; the first-visit definition works for both eras but depends on visit-code flags (DATA-04) and the archive policy (an archived old charge can make a long-standing patient look new) |

### Output

Grain: appointment (mode `appointment`), patient (other modes). `fixed_outer` `Office : {office_name}` when multi-office.

Block `by_appointment`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | `date` | `phi_identified` | - |
| `start_time` | Time | `time` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key) | count -> `Total : n` |
| `home_phone`, `cell_phone` | Homephone, Cellphone | `text` | `phi_identified` | - |
| `provider_label` | Provider | `text` | `aggregate` | - |
| `operatory_label` | Operatory | `text` | `aggregate` | - |
| `status_norm` | Status | `enum` | `phi_identified` | - |
| `procedure_label` | Procedures | `text` | `phi_identified` | - |
| `booking_source` | Source | `enum` | `aggregate` | - (`default_visible = false`) |
| hidden: `appointment_id` (`row_id_column`), `patient_id` (entity patient, NULL when patientless), `office_id` | | | | |

Blocks `by_created_first_visit`, `by_carrier`, `by_referral`, `by_referral_type` share the patient columns:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key) | count per group; grand total `Total : n` |
| `created_date` | Created Date | `date` | `phi_identified` | - (`null_display` `-` when `created_at_reliable = false`) |
| `first_visit_date` | First Visit | `date` | `phi_identified` | - |
| `home_phone`, `cell_phone`, `email` | Homephone, Cellphone, Email | `text` | `phi_identified` | - |
| `provider_label` | Pref. Provider | `text` | `aggregate` | - |
| `referral_source_name` | Referral | `text` | `phi_identified` | - (hidden in `by_referral`, it is the group) |
| `source_type_label` | Referral Type | `text` | `aggregate` | - (hidden in `by_referral_type`) |
| `carrier_name` | Carrier | `text` | `aggregate` | - (hidden in `by_carrier`) |
| `first_visit_production` | First Visit Prod. | `money` | `financial_patient` | sum per group and grand total (`visible_when include_first_visit_production`) |
| `next_appointment_date` | Next Appt | `date` | `phi_identified` | - (`visible_when show_next_appointment`) |
| group keys: `carrier_id` + `carrier_name` (`Carrier : {carrier_name}`), `referral_source_id` + `referral_source_name` (`Referral : {referral_source_name}`), `source_type_label` (`Referral Type : {source_type_label}`) | | `text` | carrier, type `aggregate`; referral source `phi_identified` + `deny` (rule 13: a source can be a patient) | subtotal = count per group |

Sort: `by_appointment` appointment date, time, patient; other blocks group label, then last name, first name, `patient_id`.
Page break: `page_break_by` `none` / `group` (enhancement). Summary cards: `New patients` (grand count), and in group
modes `Groups`. `reconciles_with`: `by_created_first_visit` with `new_patient_definition = created_date` ->
`new_patients_created`; with `first_visit_date` -> `new_patients_first_visit` (same office binding and range; to confirm in
05). The appointment mode reconciles with no metric (placeholders are not `new_patients_first_appointment`).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Group modes: bar of new patients per carrier / referral source / referral type (top 15, from the snapshot); created mode: column per day of the range |
| Group count | `rows` of this report filtered to the group (`carrier_ids`, referral source, `referral_type_codes`) |
| Patient name | `record` patient (`route_key patient_overview`), `phi_identified` |
| Appointment row | `record` appointment (`route_key appointment`), scheduling right |
| Grand count (appointment mode) | `report` `appointment.new_patients_via_appointments` with `office_scope` and `date_range` copied |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Complete registration | row `navigate` | Placeholder rows: opens the patient edit wizard (`route_key patient_edit`, 07) |
| Open patient / book next visit | row `navigate` | Overview; `openSchedulerForBooking` |
| Welcome text / e-mail | bulk `send_sms` / `send_email` | Consent exclusions |
| Referral thank-you letter | bulk `letters` | `by_referral` blocks; letter addressed to the referral source (Letters feature, PD-15) |
| Insurance verification task | bulk `create_task` | `by_carrier`; one task per patient |
| Export selection | bulk `export_selection` | export right |

Doubles as a worklist: the appointment mode is the end-of-day placeholder list; a row disappears once the record is completed (DATA-44).

### Export and print

PDF `banded_table`, portrait (landscape when `include_first_visit_production` and `show_next_appointment` are both on),
title per mode, group bands with count lines, footer echo `From :`, `Thru :`, `Report By :`, `Offices :`. XLSX: one
sheet per block actually produced (`New Patient - <mode>`), group label as a column, no merged cells, criteria sheet.
CSV: the main block. Background when escalated.

### Open questions

| # | Question |
|---|---|
| 1 | How `Created Date / First Visit Date` chooses between the two dates (one qualifying date, either date, or both printed) - `new_patient_definition` is our default until confirmed |
| 2 | Which date the range filters in modes Carrier / Referral / Referral Type; meaning of Carrier (primary carrier assumed) |
| 3 | Does the APPOINTMENT DATE RANGE section title change with the mode? |
| 4 | Appointment mode: are cancelled / missed placeholder appointments listed; are appointments without any patient record listed? |
| 5 | Printed columns and totals of every mode (no sample) |
| 6 | Office attribution of the non-appointment modes (home office versus first-visit office `first_visit_office_id`) |

## Patients Seen - `lists.patients_seen`

Lists › Patient/Resp. Party List, group PATIENT LIST, screenshot `4.PNG` (index id `patients_list_reports.r04`) - P3 - M - right family `lists_patient` (`reports_lists_patient_list_screen_view_only` / `..._full_control`) - cost_class interactive (Detail on an office group or `all` escalates to background) - legacy output confidence PARTIALLY DOCUMENTED (only REPORT BY `Day` known; variant purposes documented, no layout)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Office manager, owner | Month end, on demand | Patient volume per day (staffing, marketing effect), age mix, catchment by zip |
| Clinical lead | On demand | How many patients with a given medical alert were treated (protocol planning) |
| Provider | On demand | Own patients seen (with `PROVIDER`) |

Seen = a patient with a visit-code production charge on the day; missed and cancelled appointments never count (vendor
statement, parity correction).

### Legacy output

No layout seen (INFERRED from the four folded reports, `[P1]`):

| `report_by` (candidate) | Folded legacy report | Summary [I] | Detail [I] |
|---|---|---|---|
| `day` (`Day`, default, captured) | `Patients Seen Per Day` | `Date`, `Patients Seen`; total line; possibly a daily average | patients under each day: patient ID, name, age, provider |
| `age` | `Patients Seen Per Day By Age` | one count column per 10-year age band | patients under each band |
| `medical_alert` | `Patients Seen by Medical Alerts` | one row per alert with a count; a patient counts under every alert | patients under each alert |
| `zip_code` | `Patients Seen by Zip code` | one row per zip with a count | patients under each zip |

Quirk to confirm: a patient seen on two days counts once per day in the per-day rows but once in a distinct count; the
legacy total is not documented (header question 4). DentC prints both figures: `Total Patients Seen` (distinct) and `Total
Visits` (patient-office-days).

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT BY `Day` (default; other values `unknown_legacy`) | Block `by_day`: one row per office-local visit date with distinct patients |
| REPORT BY candidate `age` | Block `by_age`: matrix, rows = visit date, columns = 10-year bands `0-9` ... `80-89`, `90+`, `Unknown` (no `dob`); age at the visit date [I] |
| REPORT BY candidate `medical_alert` | Block `by_medical_alert`: one row per active alert (`rpt_patient_alerts.alert_label`) with distinct seen patients holding it; clinical key column |
| REPORT BY candidate `zip_code` | Block `by_zip_code`: one row per `zip5` (blank zip = `(no zip)`) with distinct seen patients |
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added) |
| REPORT TYPE `Summary` (default) | Count rows only (`report_format = summary`) |
| REPORT TYPE `Detail` | Same population; patient rows under each day / band / alert / zip, the count as the group subtotal |
| OFFICE/GROUP `Office` (default: working office) / `Office Group` + picker | Office of the visit: `rpt_visits.office_id` (or `rpt_provider_visits.office_id`) `IN (...)`; one `Office :` band per office when several |
| PROVIDER `ALL` (default) | Reads `rpt_visits` (distinct patients per office-day) |
| PROVIDER list | Reads `rpt_provider_visits` with `provider_id IN (:provider_ids)`: a patient seen that day by a selected provider; the distinct total still counts the patient once [I: legacy role "transaction provider"] |
| DATE RANGE `Transaction Date` (default) | `date_basis = transaction_date`: visit day = posting date of the visit-code charges. Until DATA-13 equals the service date; the run prints `transaction_date_equals_service_date` |
| DATE RANGE `DOS Date` | `date_basis = service_date`: `rpt_visits.visit_date` |
| DATE RANGE Start / End (default today / today) | Inclusive, office-local |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset / run / saved view (stores `report_by`) |

Dependency rules: none captured; whether another REPORT BY value swaps criteria is unknown (open question 1). Population
rule without a control: only visit-code charges (`rpt_procedure_code_dim.is_visit_code`) make a visit; appointments are
not read.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `period_grain` | `enum` NEW: `day`, `week`, `month` | `day` | `visible_when report_by == day`; rows per ISO week or month (`rpt_dates.week_start`, `month_start`), distinct patients per period |
| `group_by` | `enum` NEW options: `none`, `provider` | `none` | Provider level from `rpt_provider_visits` (counts not additive across providers; the practice total stays distinct) |
| `split_new_existing` | `boolean` NEW | `false` | Adds `New` (`first_visit_date = visit_date`) and `Existing` count columns per row |
| `include_days_without_visits` | `boolean` NEW | `false` | Zero rows for office working days without a visit (`rpt_office_calendar_days()`), for staffing review |
| `medical_alert_codes` | `entity_multi` NEW (source `medical_alerts`, 04 to own) | `all` | `visible_when report_by == medical_alert`; restrict to chosen alerts (`alert_code`) |
| `age` | `number_range` (shared key) | blank | `visible_when report_by == age`; restrict detail to an age span |
| `compare_to` | shared enhancement (P4) | `none` | Prior-period column per row and on the totals |

Saved views: "Patients seen last month by week" (`period_grain = week`, `date_preset = last_month`); "My patients seen this week" (`provider_ids` = own link).

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_visits` (`patient_id`, `office_id`, `visit_date`, `primary_provider_id`, `procedure_count`, `era`); `rpt_provider_visits` (`patient_id`, `office_id`, `provider_id`, `visit_date`); `rpt_patient_dim` (`dob`, `zip5`, names, `chart_no`); `rpt_patient_alerts` (`alert_code`, `alert_label`, `is_active`, `alert_kind`); `rpt_patient_activity` (`first_visit_date`, enhancement); `rpt_provider_dim`; `rpt_dates` |
| Date basis | `date_basis` parameter: `service_date` -> `visit_date`; `transaction_date` -> visit day of the charge's `transaction_date`. NEW: a transaction-date keyed visit (column `transaction_visit_date` or a parameter of a function form of `rpt_visits`), owner `03_data_foundation.md`; identical rows until DATA-13 |
| Office | office of the visit (office of service of the visit-code charges, data_card 5.1) |
| Provider | `rpt_provider_visits.provider_id` (data_card 5.2 "Provider of a visit"); `primary_provider_id` is never a filter |
| Counting | summary row = `count(DISTINCT patient_id)` of the bucket; grand total = distinct over the range (`patients_seen`); second total = `count(*)` of patient-office-days (`patient_visits`). Medical alert: a patient counts under every active alert (repeat), grand total distinct patients with an alert |
| Medical alerts | current state of `rpt_patient_alerts` (an alert added after the visit counts, legacy behaviour assumed); `no` / `unknown` answers are not alerts |
| Availability | Coverage 76a-d: **READY**. Transaction Date = DOS Date until SCHEMA(13) (DATA-13); visit-code flags must be reviewed in setup (DATA-04: until filled, the view's default rule applies); medical alert mode needs class `clinical` |
| Migrated history | Complete for migrated charges with a service date; visit-code dependence as above; archived ledger rows excluded by the tenant archive policy |

### Output

`fixed_outer` `Office : {office_name}` when multi-office. Summary formats below; Detail adds the patient rows under each
row of the summary (the summary row becomes the group header and its count the subtotal).

| Block (`report_by`) | key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|---|
| `by_day` | `period_label` | Date | `date` | `aggregate` | - |
| | `patients_seen` | Patients Seen | `integer` | `aggregate` | grand total distinct (`Total Patients Seen`), second line `Total Visits` = sum of rows |
| | `new_patients`, `existing_patients` | New, Existing | `integer` | `aggregate` | sum (enhancement) |
| `by_age` (matrix) | `period_label` x `age_band` | Date x `0-9` ... `90+`, `Unknown` | `integer` | `aggregate` | row totals and column totals distinct per cell scope |
| `by_medical_alert` | `alert_label` | Medical Alert | `text` | `clinical` (key) | - |
| | `patients_seen` | Patients Seen | `integer` | `aggregate` | grand total distinct patients with an alert |
| `by_zip_code` | `zip5` | Zip Code | `text` | `phi_identified` + `deny` (rule 13) | - |
| | `patients_seen` | Patients Seen | `integer` | `aggregate` | grand total distinct |
| Detail rows (all blocks) | `patient_id` | Pat ID | `id` | `phi_identified` | - |
| | `patient_name` | Patient Name | `text` | `phi_identified` (key) | count = group subtotal |
| | `age_years` | Age | `integer` | `phi_identified` | - |
| | `visit_date` | Visit Date | `date` | `phi_identified` | - (shown in bucket modes) |
| | `provider_labels` | Provider | `text` | `aggregate` | - (`string_agg` of the day's providers from `rpt_provider_visits`) |
| | hidden: `patient_id` (entity), `office_id`, `row_key` = `patient_id:office_id:visit_date` (`row_id_column`) | | | | |

Sort: by date (day, age), by count descending then label (alert, zip). Page break: `none` / `group` (Detail, enhancement).
Summary cards: `Patients seen` (distinct), `Visits`, `Average per day` (visits / days with visits). `reconciles_with`:
`patients_seen` (distinct total), `patient_visits` (row sum) for the same office set, range and basis.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | `by_day`: line of patients seen per day (`period_grain`); `by_age`: stacked bar per band; alert / zip: bar top 20 |
| Count cell (Summary) | `rows`: the Detail format filtered to the day / band / alert / zip |
| Patient name (Detail) | `record` patient (`route_key patient_overview`) |
| Visit date (Detail) | `record` patient ledger at that date (`route_key patient_ledger`, ledger right) |
| `Patients seen` card | `report` `monthly.executive_summary` with office and range copied (same `patients_seen` metric) |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open patient | row `navigate` | Detail only |
| Post-visit survey / thank-you | bulk `send_sms` / `send_email` | Detail rows; consent exclusions |
| Export selection | bulk `export_selection` | export right |

Doubles as a worklist: no.

### Export and print

PDF `banded_table`, portrait (landscape for `by_age`), title `Patients Seen : <mode>` [I], totals `Total Patients Seen` and
`Total Visits`, footer echo `From :`, `Thru :`, `Date Basis :`, `Providers :`, `Offices :`. XLSX: summary sheet (matrix as
a flat grid with band columns), Detail sheet with the bucket as a column. CSV: main block. Background when escalated.

### Open questions

| # | Question |
|---|---|
| 1 | REPORT BY option labels, order and whether a value swaps criteria (captured collapsed) |
| 2 | Legacy grand total: distinct patients or the sum of per-day counts |
| 3 | Provider role: transaction (charge) provider assumed; appointment provider possible |
| 4 | Age bands: edges, top band, age at visit date or at run date |
| 5 | Does `by_medical_alert` list patients without an alert, and does it use current alerts? |
| 6 | Is a daily average printed? |

## Patient's Notes - `lists.patients_notes`

Lists › Patient/Resp. Party List, group PATIENT LIST, screenshot `5.PNG` (index id `patients_list_reports.r05`) - P3 - S - right family `lists_patient` (`reports_lists_patient_list_screen_view_only` / `..._full_control`) - cost_class instant - legacy output confidence DOCUMENTED (sample 2011, criteria 2020, article 2026)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front desk, records staff | On request | Records release, disputes, audits: every note of one patient in a range |
| Office manager | On demand | History older than the ~10 years the `Clinical History` print shows (vendor recommendation) |

The notes screen is also a system activity log (forms saved, statements, walkouts, letters printed, scans), so the
report doubles as a patient activity history.

### Legacy output

Printed title `Patient Notes` (menu name `Patient's Notes`). Portrait. Header: office name, title, then
`Notes for Patient : <name>   PatID : <id>` (DOCUMENTED, 2011 sample).

| # | Column | Content |
|---|---|---|
| 1 | `Date Created` | date and time to the minute (`4/8/2011 12:52 PM`) |
| 2 | `Created By` | username |
| 3 | `Note Type` | `Patient Notes`, `Responsible Party Notes`, `Financial Notes`, `Chart Notes` |
| 4 | `Note` | full text, wrapped, never truncated |

Rows newest first. Last line `Total number of notes : n`. Footer echo `From :`, `Thru :`, `Patient :` (patient id),
`Note Type :` (blank when all). Kept: newest-first order, full text, the count line. System-generated notes carry their own
time-zone suffix inside the text (kept as text).

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r05 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added) |
| PRINT NOTES `ALL` (default) | `note_type_codes = all`: notes of every type |
| PRINT NOTES list (`Patient Notes`, `Resp. Party Notes`, further types not captured) | Only the chosen types: `patient_notes` -> `patient_notes` rows; `responsible_party_notes` / `financial_notes` -> `account_notes` rows of the patient's account mapped to that type, plus the account field `financial_notes`; `chart_notes` -> `patient_notes` rows whose type maps to chart [I]. Footer `Note Type : <labels>` |
| PATIENT Patient (required, empty by default) | `patient_id` (`entity_single`, `required`): the one patient; missing -> 422 `parameter_required`; a patient the caller may not open -> 403 `patient_not_in_office` (`assert_patient_visible`) |
| PATIENT `SEARCH` button | Superseded: typeahead in the box plus the search icon (full dialog); the patient in context is the first suggestion, never pre-filled |
| DATE RANGE Start / End (default today / today) | Created date of the note, office-local, inclusive; migrated notes use `note_date` where present |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset / run / saved view (stores `patient_id` only as a token or a named-user share, 08 SH-1) |

Dependency rules: `patient_id` `required_when true` (shared rule). No office section (`scope.office_mode = none`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| Date preset `all_dates` | preset of `date_range` (7.4) | - | Whole history in one click (records release) |
| `include_struck_off_notes` | `boolean` NEW | `true` | `false` drops `account_notes.is_struck_off` rows; when included they print with the prefix `[struck off]` |
| `include_undated_migrated_notes` | `boolean` NEW | `false` | Adds migrated account notes whose only date is the load time, whatever the range (they can never match a real range); dated `-` |
| `note_origin` | `enum` NEW: `all`, `user_entered`, `system_generated` | `all` | `system_generated` = notes written by the system (scan file names, print events); needs a stored origin (NEW column, owner 03; interim [I]: `document_id IS NOT NULL` or no creating user) |
| `note_text_contains` | `text` NEW | blank | Case-insensitive contains filter on the text; never written to the URL (filter_card 12) |

### Data

| Item | Rule |
|---|---|
| Datasets | passthrough `patient_notes` (`patient_id`, `note_date`, `note_type`, `notes`, `document_id`, `office_id`, `is_archived`, `is_deleted`, `created_by`, `created_at`); passthrough `account_notes` (`patient_id`, `note_type`, `notes`, `is_struck_off`, `created_at`); `rpt_account_dim` (`account_id`, `financial_notes`); `rpt_patient_dim` (`account_id`, name, `patient_id`); `rpt_user_dim` (`user_label`) |
| Union | `patient_notes` of the patient (live: `NOT is_deleted`; `is_archived` follows the archive policy) UNION ALL `account_notes` of **every member** of the patient's current account (migrated account notes sit on one representative member, analysis `be_data_patients_clinical` table row `account_notes`) UNION ALL one row for `rpt_account_dim.financial_notes` when not blank |
| Note type | NEW `rpt_value_map` domain `note_type` (owner 03) maps `patient_notes.note_type` and `account_notes.note_type` raw values to `patient_notes`, `responsible_party_notes`, `financial_notes`, `chart_notes`; the option source lists exactly these four (parity concern on `note_types`) |
| Date basis | `created_date` of the note: `(created_at AT TIME ZONE 'UTC' AT TIME ZONE tz)::date`, tz = note office, else patient home office; migrated rows: `note_date` where present, else load time (`created_at_reliable` false) |
| Financial notes field | has no date: printed as one row with `Date Created` `-`, Note Type `Financial Notes`, included when the type is selected regardless of the range [I], sorted last |
| Created By | `rpt_user_dim.user_label` of `created_by`; migrated notes carry no user (`-`) |
| Availability | Coverage 77: **READY**. `patient_notes` are app-era only (none migrated); 4,518 migrated `account_notes` carry the load time as created date and no user; availability `migrated_notes_load_time` printed when the patient has such notes |

### Output

One block `main`, grain note.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `created_at_local` | Date Created | `datetime` (`M/D/YYYY h:mm AM/PM`, tz `office`) | `phi_identified` | - |
| `created_by_label` | Created By | `text` | `phi_identified` | - |
| `note_type_label` | Note Type | `enum` | `phi_identified` | - |
| `note_text` | Note | `text` (wrapped) | `clinical` (key column: the cell can hold Chart Notes, rule 1 / 4) | count -> `Total number of notes : n` |
| hidden: `note_key` (`<source>:<pk>`, `row_id_column`), `patient_id` (entity), `note_source`, `document_id` | | | `phi_identified` | - |

Header band: `Notes for Patient : {patient_name}   PatID : {patient_id}` from `title_templates` / report-start block
(`key_value`). Sort: `created_at_local` descending, then `note_key` (legacy newest first); on screen the column re-sort is
allowed. No grouping, no page break. Summary card: `Notes` (count). No metric.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Note row with `document_id` | `record` patient document (`route_key patient_document`, 07; opened through `openAsset`), documents right |
| Header patient | `record` patient (`route_key patient_overview`) |
| Note row | `record` patient notes screen (`route_key patient_notes`, NEW for 07) |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open patient notes | criteria / row `navigate` | Notes screen of the patient |
| Records-release print | `print` | Audited with the patient manifest (AD-7); Full Control needed |
| Export selection | bulk `export_selection` | export right; patient-identifying run, never shared organisation-wide |

Not a worklist; `schedulable: false` (required single patient).

### Export and print

PDF `banded_table`, portrait, header with the patient line, `Note` column with the widest weight and full wrapping
(rows split across pages), `Total number of notes : n`, footer echo `From :`, `Thru :`, `Patient :`, `Note Type :`,
`Printed :`, `By :`, `Page : n of m`. XLSX: one row per note, `created_at_local` as a datetime cell, text in one cell
(wrap format). CSV: main block, formula guard on note text. Never background.

### Open questions

| # | Question |
|---|---|
| 1 | Complete PRINT NOTES list (only `ALL`, `Patient Notes`, `Resp. Party Notes` captured in 2020) |
| 2 | Source of `Chart Notes` (a `patient_notes` type, or progress notes) and of `Financial Notes` (account notes typed financial, the account field, or both) |
| 3 | Does the legacy report list the notes of the whole account or only those attached to the patient? |
| 4 | Product: a front-desk role without `clinical` cannot run the report (note text is `clinical`); offer a variant without Chart Notes whose text is `phi_identified`? |
| 5 | Are struck-off notes printed? |

## Patient List - Grouped By - `lists.patient_list_grouped_by`

Lists › Patient/Resp. Party List, group PATIENT LIST, screenshot `6.PNG` (index id `patients_list_reports.r06`) - P3 - L - right family `lists_patient` (`reports_lists_patient_list_screen_view_only` / `..._full_control`) - cost_class interactive (background for an office group or `all`) - legacy output confidence PARTIALLY DOCUMENTED (13 modes, 2 criteria panels seen, no layout)

### Purpose

| Mode family | Who | When | Task |
|---|---|---|---|
| `last_visit` (with the no-last-visit box) | Recall / reactivation staff | Weekly, on demand | Patients not seen for a period |
| `zip_code`, `birthdate` | Marketing | Monthly | Catchment mailings, birthday greetings |
| `carrier`, `employer`, `insurance_plan`, `uninsured`, `fee_schedule` | Insurance coordinator | On demand (before replacing a fee schedule, carrier changes) | Patients attached to a carrier, plan, employer or schedule; patients without insurance |
| `hipaa_agreement`, `medical_alert` | Compliance, clinical lead | Audits | Who lacks a HIPAA agreement; who has selected alerts |
| `attached_to_provider`, `preferred_provider`, `patient_type` | Providers, office manager | On demand | Patient panel per provider; patients per type |

### Legacy output

No layout seen. INFERRED (basis: variant purposes, Dentrix Enterprise `Birthday List`, `Insurance Carrier List`,
`Employers and Employed Patients Report`): a group header per value, patient rows (ID, name, phones plus the grouping
detail), a count per group and a grand total. Printed title [I] `Patient List - Grouped By : <mode label>`.

| `report_by` | Folded legacy report | Group key | Mode detail columns [I] |
|---|---|---|---|
| `attached_to_provider` (default) | none identified | attached provider | Last Visit |
| `birthdate` | `Patients by Birthdate` | birth month (list sorted by birthday month) | Birthdate, Age, mailing address |
| `carrier` | `Patients by Carrier` | carrier; count per carrier, separated by employer (S) | Employer, Group #, Coverage |
| `employer` | - | employer of the insurance plan | Carrier, Group # |
| `fee_schedule` | `Patients by Fee Schedule` | default fee schedule of the patient | - |
| `hipaa_agreement` | part of `Patients List` | Yes / No | - |
| `insurance_plan` | `Patients Insurance List` | plan (carrier + group number + employer) | Coverage, Subscriber, Subscriber ID |
| `last_visit` | `Patients by Lastvisit` | provider of `provider_basis` [I] | Last Visit, Next Appt |
| `medical_alert` | `Patients with Medical Alerts` | alert | - |
| `patient_type` | `Patients by Patient Type` | patient type | - |
| `preferred_provider` | `Patients by Provider` / `Patients by Preferred Provider` | preferred provider | Last Visit |
| `uninsured` | `UnInsured Patient List` | none (one list) | Last Visit |
| `zip_code` | `Patients by Zip Code` | zip | Address, City, State |

Quirks: the checkbox label reads `Lastvisit` (kept verbatim in `legacy_names` / label); 13 modes behind one name, so every
saved view stores `report_by`.

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r06 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT BY `Attached to Provider` (default) | Group by `coalesce(preferred_provider_id, last_visit_provider_id)`; `(No Provider)` group; `provider_source` printed |
| REPORT BY `Birthdate` | Group by birth month of `dob` (January ... December, `(No Birthdate)`), rows by day of month |
| REPORT BY `Carrier` | One row per patient x active coverage slot, grouped by `carrier_name`; a patient with two carriers repeats |
| REPORT BY `Employer` | Rows per patient x slot, grouped by `employer_name` of the plan; `(No Employer)` |
| REPORT BY `Fee Schedule` | Group by `rpt_patient_dim.fee_schedule_id` (name from the `fee_schedules` passthrough, DATA-45); `(No Fee Schedule)` |
| REPORT BY `HIPAA Agreement` | Two groups `Yes` / `No` on `hipaa_agreement` (NULL = `No`) |
| REPORT BY `Insurance Plan` | Rows per patient x slot, grouped by `ins_plan_id` (label carrier / group number / employer) |
| REPORT BY `Last Visit` | Panel `patients_list_reports.r06.d01`; group by the provider chosen by `provider_basis`; `last_visit_date` range and no-last-visit rule apply |
| REPORT BY `Medical Alert` | Rows per patient x active alert, grouped by `alert_label`; class `clinical` required (403 `data_class_denied` otherwise) |
| REPORT BY `Patient Type` | Rows per patient x type code of `patient_type_codes`, grouped by type; untyped patients under `No Type Defined` |
| REPORT BY `Preferred Provider` | Group by `preferred_provider_id` only (no fallback); `(No Preferred Provider)` |
| REPORT BY `Uninsured` | Patients without an active `rpt_insurance_coverage` slot; no group level |
| REPORT BY `Zip Code` | Group by `zip5`; `(No Zip)` |
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added) |
| PATIENT STATUS `Active` (default) / `Inactive` / `Both` | `is_active` true / false / no predicate; footer `* Excludes Inactive Patients` on Active |
| OFFICE/GROUP `Office` (default: working office) / `Office Group` + picker | `rpt_patient_dim.home_office_id IN (...)` [I]; groups per `patients_list_reports.r01.d01` |
| PROVIDER `ALL` (default) / list | Default panel only: attached provider `IN (:provider_ids)`; hidden and `all` in mode Last Visit |
| INCLUDE PATIENT TYPE `ALL` (default) / list | Overlap with `patient_type_codes`; `no_type_defined` = untyped patients |
| EXCLUDE PATIENT TYPE `None` (default) / list | `NOT` overlap; untyped kept unless `no_type_defined`; footer `ExPatType :` |
| SPECIALTY `ALL` (default) / value | Default panel only: `rpt_provider_dim.specialty` of the attached provider `IN (:specialty_codes)`; legacy single-select, list allowed |
| PREFERRED PROVIDER radio `Preferred Provider` (Last Visit panel; default `preferred_provider` per 04) | `preferred_provider_ids` filters `coalesce(preferred_provider_id, last_visit_provider_id)` and the group key is that provider |
| PREFERRED PROVIDER radio `Treating Provider` | `preferred_provider_ids` filters `rpt_patient_activity.last_visit_provider_id`; group key = last-visit provider |
| PREFERRED PROVIDER picker `ALL` / list | `all` = no predicate; list = predicate on the provider chosen by the radio |
| LAST VISIT DATE RANGE (Last Visit panel; default blank, legacy default not documented) | `rpt_patient_activity.last_visit_date BETWEEN :last_visit_date_from AND :last_visit_date_to`, inclusive; blank = no predicate |
| `Include Patients with No Lastvisit date.` ticked | Patients with `last_visit_date IS NULL` added to the selected rows |
| `Include Patients with No Lastvisit date.` unticked (default `false` proposed) | Patients without a last visit left out |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset (also resets the panel) / run / saved view with `report_by` |

Dependency rules: `patients_list_reports.r06.d01` - `report_by == last_visit` shows `provider_basis`,
`preferred_provider_ids`, `last_visit_date`, `include_patients_with_no_last_visit` and hides `provider_ids`,
`specialty_codes` (disabled value `all`). `patients_list_reports.r06.d02` - every other mode shows `provider_ids`,
`specialty_codes` and hides the four Last Visit keys (disabled values `preferred_provider`, `all`, no range, `false`). The
11 uncaptured modes keep the default panel until read on the live tool.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `carrier_ids` | `entity_multi` (shared) | `all` | `visible_when report_by in [carrier, insurance_plan, employer]`: one carrier's patients |
| `employer_ids` | `entity_multi` (shared) | `all` | `visible_when report_by in [employer, carrier]` |
| `fee_schedule_ids` | `entity_multi` (shared) | `all` | `visible_when report_by == fee_schedule`: patients on the schedule about to be replaced |
| `medical_alert_codes` | `entity_multi` NEW (as on `lists.patients_seen`) | `all` | `visible_when report_by == medical_alert` (legacy "patients having selected alerts") |
| `birth_months` | `enum_multi` NEW (`1`..`12`, `min_items` 1, `full_selection no_predicate`) | all ticked | `visible_when report_by == birthdate`; saved view "Birthdays next month" uses the relative token `next_month` |
| `hipaa_agreement_value` | `enum` NEW (`both`, `yes`, `no`) | `both` | `visible_when report_by == hipaa_agreement`: only patients without an agreement |
| `has_future_appointment` | `enum` NEW (as on `lists.patient_list`) | `any` | `no` = not on the books (reactivation, insurance outreach) |
| `last_visit_date` presets | relative tokens | - | "Last visit 12-24 months ago" (`today-24m` .. `today-12m`) |
| `subtotal_by_office` | `boolean` NEW | `false` | Second level office inside each group for multi-office runs |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_patient_dim` (identity, contact, `dob`, `zip5`, `fee_schedule_id`, `hipaa_agreement`, `patient_type_codes`, `preferred_provider_id`, `home_office_id`, `is_active`); `rpt_patient_activity` (`last_visit_date`, `last_visit_provider_id`, `next_appointment_date`); `rpt_provider_dim` (`provider_name`, `short_id`, `specialty`); `rpt_insurance_coverage` (`slot_id`, `category`, `tier`, `ins_plan_id`, `carrier_id`, `carrier_name`, `employer_id`, `employer_name`, `group_number`, `subscriber_name`, `subscriber_id`, `relationship`); `rpt_patient_alerts` (`alert_code`, `alert_label`, `is_active`); passthrough `fee_schedules` (name, DATA-45); `definitions:patient_type` labels |
| Date basis | none; mode Last Visit: attribute range on `last_visit_date` (general last visit, not ortho) |
| Office | home office [I]; Provider: attached (default panel), `provider_basis` (Last Visit panel), preferred only (mode Preferred Provider) |
| Repeating modes | Carrier, Employer, Insurance Plan (one row per active slot), Medical Alert (per active alert), Patient Type (per code): group counts = rows of the group, grand total = distinct patients (`Total Patients : n`) plus `Total Rows : n` |
| Uninsured | `NOT EXISTS (SELECT 1 FROM rpt_insurance_coverage c WHERE c.patient_id = p.patient_id)` (active slots only); medical-only coverage counts as insured [I] |
| Availability | Coverage 78a: **APP** for the default mode (no provider attached to migrated patients; history uses the derived last-visit provider, labelled `provider_derived_from_last_visit`); 78b Preferred Provider APP (migrated patients fall in `(No Preferred Provider)`); 78c Birthdate, Zip, Patient Type READY, Last Visit REPAIR(19) (DATA-19); 78d coverage modes READY on today's coverage, tiers on history REPAIR(32) (DATA-32); 78e Fee Schedule, HIPAA READY; 78f Medical Alert READY, class `clinical` |
| Data gaps | `specialty` is blank on 96 of 97 migrated providers: a SPECIALTY value selects almost nobody until providers are edited (availability `provider_specialty_sparse`) |

### Output

Grain: patient within group (patient x slot / alert / type in repeating modes). `fixed_outer` `Office : {office_name}` when
multi-office. One block per mode (`by_<report_by>`), common columns:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key) | count per group; grand total |
| `home_phone`, `cell_phone` | Homephone, Cellphone | `text` | `phi_identified` | - |
| `email` | Email | `text` | `phi_identified` | - (`default_visible = false`) |
| `chart_no` | Chart # | `text` | `phi_identified` | - (`default_visible = false`) |
| hidden: `row_key` (`patient_id[:slot_id / alert_key / type_code]`, `row_id_column`), `patient_id` (entity), group key ids | | | | |

Mode columns and group header templates:

| Block | Group header | Extra columns (key, type, data_class) |
|---|---|---|
| `by_attached_to_provider` | `Provider : {provider_name} ({short_id})` (`aggregate`) | `last_visit_date` date `phi_identified`; `provider_source` enum `aggregate` |
| `by_birthdate` | `Birth Month : {month_name}` (`aggregate`) | `dob` date, `age_years` integer, `address`, `city`, `state`, `zip5` text - all `phi_identified` |
| `by_carrier` | `Carrier : {carrier_name}` (`aggregate`) | `employer_name` text `phi_sensitive` (guarantor employer on a patient row), `group_number` text `phi_identified`, `coverage_label` (`Dental Primary` ...) enum `phi_identified` |
| `by_employer` | `Employer : {employer_name}` (`phi_identified` + `deny`, rule 13; key) | `carrier_name` `aggregate`, `group_number` `phi_identified` |
| `by_fee_schedule` | `Fee Schedule : {fee_schedule_name}` (`aggregate`) | - |
| `by_hipaa_agreement` | `HIPAA Agreement : {Yes / No}` (`phi_identified`) | - |
| `by_insurance_plan` | `Plan : {carrier_name} / {group_number} / {employer_name}` (`phi_identified`) | `coverage_label`, `subscriber_name` `phi_identified`, `subscriber_id` `phi_sensitive` (`default_visible = false`), `relationship` `phi_identified` |
| `by_last_visit` | `Provider : {provider_name} ({short_id})` (`aggregate`) | `last_visit_date`, `next_appointment_date` date `phi_identified`; sort `last_visit_date` ascending, NULLs first |
| `by_medical_alert` | `Medical Alert : {alert_label}` (`clinical`, key) | - |
| `by_patient_type` | `Patient Type : {type_code} - {type_label}` (`phi_identified`) | - |
| `by_preferred_provider` | `Preferred Provider : {provider_name} ({short_id})` (`aggregate`) | `last_visit_date` |
| `by_uninsured` | none | `last_visit_date`, `next_appointment_date` |
| `by_zip_code` | `Zip Code : {zip5}` (`phi_identified` + `deny`) | `address`, `city`, `state` |

Group subtotal label `Total : n` (rows); grand total `Total Patients : n` (distinct) and in repeating modes `Total Rows :
n`. Sort inside a group: last name, first name, `row_key` (birthdate: day of month first; last visit: date). Page break:
`page_break_by` `none` (default) / `group` (enhancement). Summary cards: `Patients` (distinct), `Groups`. No metric
reconciles (current-state attribute lists).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar of patients per group (top 20; by month for Birthdate, by provider for the provider modes) |
| Group count | `rows` of this report with the group value as filter (`provider_ids`, `carrier_ids`, `fee_schedule_ids`, `medical_alert_codes`, ...) |
| Patient name | `record` patient (`route_key patient_overview`) |
| Plan header | `record` insurance plan (`route_key insurance_plan`, 07), insurance setup right |
| Provider group (Last Visit) | `report` `lists.patient_list` with `provider_ids` and `last_visit_date` copied |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open patient / book | row `navigate` | Overview; `openSchedulerForBooking` |
| Birthday greeting | bulk `send_sms` / `send_email` / `postcards` | Birthdate mode; consent exclusions |
| Reactivation outreach | bulk `send_sms` / `letters`; link `worklists.reactivation` | Last Visit mode; hand-off carries the office scope and the last-visit window |
| Insurance update task | bulk `create_task` | Carrier / Plan / Employer / Uninsured modes |
| HIPAA form request | bulk `letters` | HIPAA Agreement `No` group |
| Export selection | bulk `export_selection` | export right |

Doubles as a worklist: mode Last Visit with `has_future_appointment = no` is a reactivation list; the live version is `worklists.reactivation`.

### Export and print

PDF `banded_table`, portrait (landscape for Birthdate and Insurance Plan, which carry address or subscriber columns), group
bands with count lines, title per mode, footer echo `Report By :`, `Offices :`, `ExPatType :`, `* Excludes Inactive
Patients`, `Last Visit From :` / `Thru :` in mode Last Visit. XLSX: sheet `Grouped By - <mode>`, the group label as a
column on every row, criteria sheet, no merged cells. CSV: main block. Background when escalated.

### Open questions

| # | Question |
|---|---|
| 1 | Difference between `Attached to Provider` and `Preferred Provider`; what SPECIALTY applies to |
| 2 | Criteria panels of the 11 uncaptured modes (carrier address / state narrowing of the old `Patients by Carrier`, fee-schedule picker of the old screen) |
| 3 | Defaults of `provider_basis`, `last_visit_date` (blank or today) and `include_patients_with_no_last_visit` |
| 4 | Header question 6: does PREFERRED PROVIDER filter the last-visit provider when `Treating Provider` is chosen? |
| 5 | Carrier mode: all slots or primary only; employer sub-grouping (old article (S)) |
| 6 | Printed columns and totals of every mode (no sample) |

## Patients on Payment Plan - `lists.patients_on_payment_plan`

Lists › Patient/Resp. Party List, group PATIENT LIST, screenshot `7.PNG` (index id `patients_list_reports.r07`) - P3 - M - right family `lists_patient` (`reports_lists_patient_list_screen_view_only` / `..._full_control`) - cost_class interactive - legacy output confidence DOCUMENTED for `PLAN TYPE = Ortho` (sample 2021); Regular INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Ortho / treatment coordinator | Month end, after new starts | Contracts set up in a period, their amounts and remaining payments |
| Billing | Monthly before the periodic posting | Reconcile contracts with periodic charge generation (`management.payment_plan_charges`); chase plans without a stored card |

The report filters on the setup date, so it is a list of plans set up in the range, not of all open plans (research quirk).

### Legacy output

Ortho (DOCUMENTED, 2021): title `Patients on Ortho Payment Plan`; header office name, title, note line
`* <office> is integrated with Open Edge` (card processor). Group header `Provider : <Last, First Degree> : <ShortID>`.

| # | Column group | Sub-columns | Sample |
|---|---|---|---|
| 1 | `ChartNo#` | | blank |
| 2 | `PatID` | | `147` |
| 3 | `Patient Name` | | `Last, First` |
| 4 | `Total Ortho Amt.` | | `1000.00` |
| 5 | `Pat Plan Setup Dt` | | `9/4/2020` |
| 6 | `Periodic Amt.` (patient) | | `58.34` |
| 7 | `Pat No. of Pay` | `Total`, `Rem.` | `12`, `12` |
| 8 | `Pat Amount` | `Total Pln.`, `Rem.` | `700.00`, `700.00` |
| 9 | `Ty` | | `P` (meaning not documented) |
| 10 | `Ins Plan Setup Dt` | | `9/4/2020` |
| 11 | `Periodic Amt.` (insurance) | | `25.00` |
| 12 | `Ins No. of Pay` | `Total`, `Rem.` | `12`, `11` |
| 13 | `Ins Amount` | `Total Pln.`, `Rem.` | `300.00`, `275.00` |
| 14 | `CC On File` | | `NO` |

Totals: one `Total :` row for the report summing `Total Ortho Amt.`, patient `Total Pln.` / `Rem.`, insurance `Total Pln.`
/ `Rem.`; no per-provider subtotal; last line `Total number of Patients on Ortho Contract Plans : n`.

Regular (INFERRED: a regular contract has no insurance block): title `Patients on Regular Payment Plan`; columns 1-3,
`Total Plan Amt.`, `Pat Plan Setup Dt`, `Periodic Amt.`, `Pat No. of Pay` `Total` / `Rem.`, `Pat Amount` `Total Pln.` /
`Rem.`, `CC On File`; `Total :` row; last line `Total number of Patients on Regular Payment Plans : n` [I].

Quirk fixed: the sample shows 24 total payments and 25 remaining (stale client snapshot); DentC prints recomputed remaining
counts and amounts (`pat_payments_remaining`, `pat_amount_remaining`), never the stored `rem_payments`. Money positive =
amount owed under the contract.

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r07 -->

| Legacy option | Effect on the result |
|---|---|
| PLAN TYPE `Regular` (default) | `contract_kind = 'regular'` (`patient_payment_plans`); block `regular`, title `Patients on Regular Payment Plan` |
| PLAN TYPE `Ortho` | `contract_kind = 'ortho'` (`ortho_plans`); block `ortho` with the insurance columns, title `Patients on Ortho Payment Plan` |
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added) |
| OFFICE/GROUP `Office` (default: working office) / `Office Group` + picker | `rpt_payment_plan_contracts.office_id IN (...)` [I]; groups per `patients_list_reports.r01.d01` |
| PREFERRED PROVIDER `ALL` (default) | No predicate |
| PREFERRED PROVIDER list | `coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id) IN (...)` (parity mapping; the group header is the contract provider - open question 1) |
| PLAN SETUP DATE RANGE Start / End (default today / today) | `setup_date BETWEEN :date_from AND :date_to`, inclusive (default run is nearly empty, legacy behaviour kept) |
| EXCLUDE PATIENT TYPE `None` (default) / list | `NOT (patient_type_codes && :list)`; untyped kept unless `no_type_defined`; footer `ExPatType :` |
| CREDIT CARD ON FILE `Both` (default) | No predicate |
| CREDIT CARD ON FILE other values (`unknown_legacy`; candidates `Yes` / `No`) | `has_card_on_file = true` / `false` |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset / run / saved view |

Dependency rules: none captured; PLAN TYPE switches block, title and the count-line wording (`title_templates` with `["eq",
"plan_type", "ortho"]`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `plan_status` | `enum` NEW: `all`, `open`, `paid_off` | `all` | `open` = `pat_amount_remaining > 0 OR ins_amount_remaining > 0`; with the preset `all_dates` it is the "all open plans" list the legacy report lacks (research defect 11) |
| `only_overdue_installments` | `boolean` NEW | `false` | Contracts with an instalment due before today and not posted (`rpt_contract_installments.due_date < local_today AND NOT is_billed`); adds `Overdue #` and `Next Due` columns |
| `show_provider_subtotals` | `boolean` NEW | `false` | Subtotal per provider group (legacy prints only the report total) |
| `show_next_due_date` | `boolean` NEW | `false` | Adds `next_due_date` (min due date of unposted instalments) |
| `contract_provider_ids` | `entity_multi` NEW (`provider_role = contract`, 04) | `all` | Filters the provider printed in the group header (`rpt_payment_plan_contracts.provider_id`) |

Saved views: "Open ortho contracts" (`plan_type = ortho`, `plan_status = open`, `date_preset = all_dates`); "Plans without a card" (`credit_card_on_file = no`, `plan_status = open`).

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_payment_plan_contracts` (`contract_kind`, `contract_key`, `payment_plan_id`, `ortho_plan_id`, `patient_id`, `office_id`, `provider_id`, `setup_date`, `ins_setup_date`, `total_amount`, `pat_plan_amount`, `pat_periodic_amount`, `pat_payments_total`, `pat_payments_remaining`, `pat_amount_remaining`, `ins_plan_amount`, `ins_periodic_amount`, `ins_payments_total`, `ins_payments_remaining`, `ins_amount_remaining`, `has_card_on_file`, `is_active`); `rpt_contract_installments` (`due_date`, `is_billed`, enhancements); `rpt_patient_dim` (`chart_no`, names, `patient_type_codes`, `preferred_provider_id`); `rpt_patient_activity` (`last_visit_provider_id`); `rpt_provider_dim` (`last_name`, `first_name`, `title`, `short_id`); `rpt_office_dim` |
| Rows | `is_active` contracts (soft-deleted plans excluded, data_card 3.6) with `contract_kind = :plan_type` and `setup_date` in range |
| Date basis | `plan_setup_date` -> `setup_date` (fixed, no basis radio) |
| Office / provider | contract office [I]; filter on the patient's preferred provider (parity), group header on the contract provider (data_card 2.25) |
| Remaining | recomputed `pat_payments_remaining`, `pat_amount_remaining`, `ins_*_remaining`; stored snapshots only in `pat_payments_remaining_stored` (not printed) |
| Card-processor note | NEW office attribute (processor integration name, owner 03 / 08); line omitted until it exists |
| `Ty` column | source not documented: printed blank (`null_display` empty) until confirmed (open question 2) |
| Availability | Coverage 79: **APP** - no regular plan, ortho contract or instalment was migrated; every run covers app-era contracts only (availability `contracts_app_only`). Remaining figures depend on DATA-37 (contract link on the charge, `contract_movement` credit); until then remaining counts follow the billed instalments |

### Output

Block `ortho` (PLAN TYPE Ortho), grain contract:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `chart_no` | ChartNo# | `text` | `phi_identified` | - |
| `patient_id` | PatID | `id` | `phi_identified` | - |
| `patient_name` | Patient Name (`Last, First`) | `text` | `phi_identified` (key) | count -> `Total number of Patients on Ortho Contract Plans : n` |
| `total_amount` | Total Ortho Amt. | `money` | `financial_patient` | sum (`Total :`) |
| `setup_date` | Pat Plan Setup Dt | `date` | `phi_identified` | - |
| `pat_periodic_amount` | Periodic Amt. | `money` | `financial_patient` | - |
| `pat_payments_total`, `pat_payments_remaining` | Pat No. of Pay Total, Rem. | `integer` | `financial_patient` | - |
| `pat_plan_amount`, `pat_amount_remaining` | Pat Amount Total Pln., Rem. | `money` | `financial_patient` | sum |
| `type_code` | Ty | `text` | `phi_identified` | - |
| `ins_setup_date` | Ins Plan Setup Dt | `date` | `phi_identified` | - |
| `ins_periodic_amount` | Periodic Amt. | `money` | `financial_patient` | - |
| `ins_payments_total`, `ins_payments_remaining` | Ins No. of Pay Total, Rem. | `integer` | `financial_patient` | - |
| `ins_plan_amount`, `ins_amount_remaining` | Ins Amount Total Pln., Rem. | `money` | `financial_patient` | sum |
| `has_card_on_file` | CC On File | `boolean` (`YES` / `NO`) | `phi_identified` | - |
| `overdue_count`, `next_due_date` | Overdue #, Next Due | `integer`, `date` | `financial_patient`, `phi_identified` | enhancements |
| group key `provider_id` + label `Provider : {last_name}, {first_name} {title} : {short_id}` | | `text` | `provider_comp` (provider key in a block with money, rule 3) | subtotal only with `show_provider_subtotals` |
| hidden: `contract_key` (`row_id_column`), `patient_id` (entity), `office_id` | | | | |

Block `regular`: the same columns without `type_code` and the four `ins_*` columns plus `ins_setup_date`; `total_amount`
labelled `Total Plan Amt.`; count line `Total number of Patients on Regular Payment Plans : n` [I].

Sort: provider group, then patient `Last, First`, `contract_key` (header rule). Page break: `none` / `group` (enhancement).
`fixed_outer` `Office :` when multi-office. Summary cards: `Contracts`, `Total contract amount`, `Patient remaining`,
`Insurance remaining` (ortho). No metric reconciles in the legacy run; with `plan_status = open` and `date_preset =
all_dates` the ortho remaining total is comparable to `ortho_remaining_to_bill_amount` (not a `reconciles_with`: billed
versus paid differ).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list; summary cards only |
| Patient name | `record` patient payment-plan screen (`route_key patient_payment_plans`, entity patient), payment-plan feature right |
| Remaining amounts | `report` `management.payment_plan_charges` with `plan_type`, `office_scope` and the patient copied |
| Provider group header | `rows` of this report with `contract_provider_ids = [provider]` |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open payment plan | row `navigate` | Patient payment-plan screen |
| Request card on file | bulk `send_sms` / `send_email` | Rows with `CC On File = NO`; message hand-off only, no card data in the report |
| Follow-up task | row / bulk `create_task` | Overdue or missing card |
| Export selection | bulk `export_selection` | export right plus `financial_patient` |

Doubles as a worklist: with `plan_status = open` and `only_overdue_installments` it is a billing exception list.

### Export and print

PDF `banded_table`, landscape (14 columns, two-row header with `Total` / `Rem.` sub-headers), header note line when the
office has a processor integration, provider bands, single `Total :` row, count line, footer echo `Plan Type :`, `From :`,
`Thru :`, `Providers :`, `ExPatType :`, `CC On File :`. XLSX: one row per contract, sub-columns flattened to
`pat_payments_total`, `pat_payments_remaining`, ... with header text `Pat No. of Pay - Total`, money as numeric cells, no
merged headers. CSV: main block. Never background.

### Open questions

| # | Question |
|---|---|
| 1 | PREFERRED PROVIDER: patient's preferred provider (parity) or the contract provider printed in the group header (header question 7) |
| 2 | Meaning and source of the `Ty` column (`P`) |
| 3 | CREDIT CARD ON FILE option list (captured collapsed) |
| 4 | Printed layout of the Regular variant (no sample) |
| 5 | Are inactive / paid-off contracts listed when their setup date is in range? |

<!-- WORK-ITEMS -->
| RPT-PLIST-10 | Patient List enhancements and outputs: `sort_by` options, `last_visit_date`, `has_future_appointment`, `only_patients_without_email`, `exclude_no_correspondence`, `zip_code`, optional columns, landscape PDF, XLSX address split, bulk correspondence and campaign actions | P3 | S | RPT-PLIST-02, ENG-27, ENG-49, DASH-31 | Default run equals the RPT-PLIST-02 golden fixture; `has_future_appointment = no` drops a booked fixture patient; the bulk text action reports the consent exclusion count before dispatch |
| RPT-PLIST-11 | Gender vocabulary: normalised `gender_code` expression in `rpt_patient_dim`, `gender` option list (candidate `male` / `female` / `unknown`), live-tool confirmation and `param_migrations` if labels change | P3 | S | DATA-05, RPT-PLIST-01, RPT-PLIST-09 | Every stored gender value of the fixture maps to one option; `gender = all` drops no patient; a renamed option keeps saved views valid |
| RPT-PLIST-12 | New Patient mode blocks: `by_appointment` (placeholders and patientless appointments), `by_created_first_visit`, `by_carrier` (primary slot lateral), `by_referral`, `by_referral_type`; title templates; NEW parameter `new_patient_definition` registered with 04 | P3 | M | RPT-PLIST-04, DATA-16, DATA-19, DATA-21, DATA-40, DATA-44, FLT-05 | Each mode runs on the fixture; created-date mode never lists a migrated patient (`created_at_reliable = false`) and prints `created_date_app_only`; a patient with two dental slots appears once under the primary carrier |
| RPT-PLIST-13 | New Patient enhancements and actions: first-visit production, next appointment, `carrier_ids` / `referral_type_codes` / `preferred_provider_ids`, `appointment_statuses_shown`, complete-registration hand-off, referral thank-you letters, drills to `appointment.new_patients_via_appointments` | P3 | S | RPT-PLIST-12, ENG-30, ENG-49 | First-visit production total equals `rpt_visits.charged_production` summed over the listed first visits; a placeholder row opens the edit wizard; the appointment-mode count equals the same-range count of `appointment.new_patients_via_appointments` |
| RPT-PLIST-14 | Patients Seen blocks for the four `report_by` candidates (`by_day`, `by_age` matrix, `by_medical_alert`, `by_zip_code`), Summary / Detail, distinct and visit totals, transaction-date keyed visit (NEW column requested from 03) | P3 | M | RPT-PLIST-04, DATA-04, DATA-13, DATA-18, DATA-52, ENG-11 | Two-day fixture: a patient seen both days counts 1 per day, `Total Patients Seen` 1, `Total Visits` 2; a missed appointment without a visit-code charge never counts; a caller without `clinical` gets 403 on `medical_alert` only |
| RPT-PLIST-15 | Patients Seen enhancements: `period_grain`, `group_by provider`, `split_new_existing`, `include_days_without_visits`, `medical_alert_codes` (NEW option source `medical_alerts` for 04), `age`, line and bar charts, drill to `monthly.executive_summary` | P3 | S | RPT-PLIST-14, DATA-55, FLT-09, DASH-11 | Weekly grain distinct counts equal a hand count; zero-fill rows appear only for office working days; new + existing equals the row count |
| RPT-PLIST-16 | Patient's Notes union: `patient_notes`, account-wide `account_notes`, `financial_notes` field row; NEW `rpt_value_map` domain `note_type`; static `note_types` source with the four legacy types; header band, newest-first sort, struck-off and undated-migrated options, `note_origin`, document drill | P3 | S | RPT-PLIST-05, DATA-52, FLT-09, FLT-16, ENG-23 | A note on a representative account member prints on every member's report as `Responsible Party Notes`; a migrated undated note appears only with `include_undated_migrated_notes`; `Total number of notes` equals the rows; the PDF wraps a 4,000-character note across pages |
| RPT-PLIST-17 | Grouped By per-mode blocks and columns: 13 group header templates, repeating-mode totals (`Total Patients` distinct, `Total Rows`), birth-month order, Uninsured anti-join, fee-schedule label passthrough, sparse-specialty availability warning | P3 | M | RPT-PLIST-03, DATA-21, DATA-45, DATA-52, ENG-23 | Fixture patient with dental and medical slots: two rows in Carrier, `Total Patients` 1; an uninsured patient appears only in Uninsured; Birthdate prints January before February and day order inside a month |
| RPT-PLIST-18 | Grouped By enhancements and actions: `carrier_ids`, `employer_ids`, `fee_schedule_ids`, `medical_alert_codes`, `birth_months`, `hipaa_agreement_value`, `has_future_appointment`, `subtotal_by_office`; birthday and reactivation hand-offs, HIPAA letters, insurance tasks; drill to `lists.patient_list` and the insurance plan record | P3 | M | RPT-PLIST-17, ENG-30, ENG-49, DASH-31, DASH-34 | Saved view "Birthdays next month" lists exactly the fixture patients born next month on re-run in a later month; reactivation hand-off carries the last-visit window |
| RPT-PLIST-19 | Patients on Payment Plan blocks `ortho` (2021 column set, two-row header, single `Total :` row, count line) and `regular` (inferred layout); recomputed remaining columns; `Ty` placeholder; provider-comp class on the group key | P3 | M | RPT-PLIST-06, DATA-37, ENG-23, ENG-27 | Ortho fixture with three contracts reproduces the sample totals arithmetic (`Total Ortho Amt.`, patient and insurance `Total Pln.` / `Rem.`); a contract with stale stored remaining prints the recomputed value; XLSX has flat sub-column headers |
| RPT-PLIST-20 | Payment Plan enhancements and actions: `plan_status`, `only_overdue_installments`, `show_provider_subtotals`, `show_next_due_date`, `contract_provider_ids` (NEW role `contract` for 04), card-on-file request hand-off, drill to `management.payment_plan_charges` | P3 | S | RPT-PLIST-19, ENG-30, ENG-49 | `plan_status = open` with `all_dates` lists every fixture contract with a remaining amount and none paid off; an unposted past-due instalment marks the contract overdue |
<!-- /WORK-ITEMS -->
