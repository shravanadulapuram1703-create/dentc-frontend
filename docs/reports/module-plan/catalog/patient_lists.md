# Lists - Patient and Responsible Party - report specifications

Patient rosters, new-patient and patients-seen counts, one patient's note history, payment-plan and online-registration lists
(group `PATIENT LIST`, 8 reports) and guarantor-account lists for billing and collections (group `RESPONSIBLE PARTY LIST`, 4
reports). Hub home: Lists, `subcategory = patient` (brief section 1). Default phase P3; every report ships in P3.

## Overview

Order = legacy index order (`legacy/index/patients_list_reports.controls.json`, screenshot numbering), which the section order
of this document follows. The legacy menu order differs (Patient List first, Update Patient Insurance eighth); the hub lists
the reports in menu order.

Menu position -> index id (work items, findings and drills use index ids only): 1 Patient List `r02`, 2 New Patient
`r03`, 3 Patients Seen `r04`, 4 Patient's Notes `r05`, 5 Grouped By `r06`, 6 Patients on Payment Plan `r07`, 7 Online
Registered Patients `r08`, 8 Update Patient Insurance `r01`, 9 Responsible Party List `r09`, 10 Statements Sent `r11`,
11 Sent to Collection `r10`, 12 Email Statement Error Report `r12`.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `lists.update_patient_insurance_conversion_list_by_appointment` | Update Patient Insurance (Conversion) List - By Appointment | Converted practices: patients with appointments in the range whose insurance is still the conversion placeholder (type `UP`), to fix before the visit | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.patient_list` | Patient List | Roster of patients with contact data by status, ortho flag, office, provider, patient type, sex and age | P3 | M | READY (provider criterion on history: derived last-visit provider) | PARTIALLY DOCUMENTED (predecessor sample 2014) |
| `lists.patient_list_new_patient` | Patient List - New Patient | New patients in a range in five modes: appointment-only placeholders, carrier, created / first visit, referral, referral type | P3 | L | SCHEMA(44) for the default mode `appointment` (interim placeholder rule [I]); other modes APP with the default `new_patient_definition = created_date`, READY on REPAIR(19) with `first_visit_date`; referral on app patients SCHEMA(40) | PARTIALLY DOCUMENTED (modes documented, no layout) |
| `lists.patients_seen` | Patients Seen | Counts of patients seen (visit-code charges) per day, age band, medical alert or zip code; Detail lists the patients | P3 | M | READY (Transaction Date = DOS Date until SCHEMA(13)) | PARTIALLY DOCUMENTED (only mode `Day` known) |
| `lists.patients_notes` | Patient's Notes | Every note of one patient (patient, responsible party, financial, chart notes) in a created-date range | P3 | S | READY for Responsible Party Notes and Financial Notes (migrated account notes undated); APP for Patient Notes and Chart Notes (none migrated) | DOCUMENTED (sample 2011) |
| `lists.patient_list_grouped_by` | Patient List - Grouped By | Patients grouped by one of 13 attributes (provider, birthdate, carrier, employer, fee schedule, HIPAA, plan, last visit, medical alert, type, preferred provider, uninsured, zip) | P3 | L | APP for the default mode `attached_to_provider` (history uses the derived last-visit provider, labelled); other modes READY (Last Visit REPAIR(19), coverage tiers REPAIR(32)) | PARTIALLY DOCUMENTED (2 of 13 panels seen, no layout) |
| `lists.patients_on_payment_plan` | Patients on Payment Plan | Patients whose regular or ortho contract was set up in the range, with plan amounts, remaining payments and card on file | P3 | M | APP (no contract was migrated) | DOCUMENTED for Ortho (sample 2021); Regular INFERRED |
| `lists.online_registered_patients` | Online Registered Patients | Online registrations received in the range per office, pending versus imported | P3 | S | APP (registration source on the patient: SCHEMA(44)) | PARTIALLY DOCUMENTED |
| `lists.responsible_party_list` | Responsible Party List | Guarantor accounts in six modes: created date, balance, balance aged over X days, resp. party type, send-statement status, zip | P3 | L | REPAIR(10) for the default mode `created_date`; balance modes READY; resp. party type SCHEMA(53) | PARTIALLY DOCUMENTED (modes documented, no layout) |
| `lists.responsible_party_sent_to_collection` | Responsible Party - Sent to Collection | Accounts flagged sent to collection, within an account balance range | P3 | S | READY (date sent: SCHEMA(35)) | PARTIALLY DOCUMENTED |
| `lists.responsible_party_statements_sent` | Responsible Party - Statements Sent | Accounts that received a statement of one statement date, by delivery channel | P3 | S | APP (no statement was migrated) | PARTIALLY DOCUMENTED |
| `lists.responsible_party_email_statement_error_report` | Responsible Party - Email Statement Error Report | Accounts whose e-mailed statement failed on one sent date | P3 | S | SCHEMA(22) (`delivery_error` text) | PARTIALLY DOCUMENTED |

No report needs a phase other than P3: every DATA item named above is P3 or earlier (DATA-10 P0, DATA-13/19/22/53 P1,
DATA-20/27/32/35/37 P2, DATA-40/44 P3). Where a mode is APP or SCHEMA the report still ships in P3 with an `availability[]`
warning (02 section 3.1) printed in the criteria block.

## Shared rules

### Families inside the category

| Family | Reports | Grain | Datasets (data_card) |
|---|---|---|---|
| Patient roster | `lists.patient_list`, `lists.patient_list_grouped_by` | patient (Grouped By: patient within group; Medical Alert / Carrier / Plan modes can repeat a patient per alert or coverage slot) | `rpt_patient_dim`, `rpt_patient_activity`, `rpt_provider_dim`, `rpt_insurance_coverage` (carrier, employer, plan, uninsured), `rpt_patient_alerts` (medical alert); fee schedule name from the `fee_schedules` catalog passthrough (DATA-45) on `rpt_patient_dim.fee_schedule_id` |
| New and seen patients | `lists.patient_list_new_patient`, `lists.patients_seen` | patient (New Patient); day / bucket and patient (Patients Seen) | `rpt_patient_dim` (`is_placeholder_patient`, `created_at_utc`, `created_at_reliable`), `rpt_patient_activity` (`first_visit_date`), `rpt_appointment_facts`, `rpt_insurance_coverage`, `rpt_referral_facts`; `rpt_visits`, `rpt_provider_visits`, `rpt_patient_alerts` |
| Single patient | `lists.patients_notes` | note | passthroughs `patient_notes`, `account_notes`; `rpt_account_dim.financial_notes` |
| Patient programmes | `lists.patients_on_payment_plan`, `lists.online_registered_patients`, `lists.update_patient_insurance_conversion_list_by_appointment` | contract; registration; appointment x patient | `rpt_payment_plan_contracts`; passthrough `booking_requests` (NEW registration of the table as a dataset, owner `03_data_foundation.md`, with DATA-44) and `rpt_patient_dim`; `rpt_appointment_facts`, `rpt_patient_dim` (`patient_type_codes` contains `UP`), `rpt_insurance_coverage` |
| Guarantor accounts | `lists.responsible_party_list`, `lists.responsible_party_sent_to_collection` | account | `rpt_account_dim`, `rpt_ar_open_items()` (unit `account`, PD-4) for balance and aged balance |
| Statement delivery | `lists.responsible_party_statements_sent`, `lists.responsible_party_email_statement_error_report` | statement row (one per `patient_statements` row; account = `coalesce(s.account_id, rpt_patient_dim.account_id)`, patient-scope rows name the patient) | passthrough `patient_statements` (`statement_date`, `delivery_method`, `delivery_status`, `delivered_to`, `delivered_at`, `batch_id`), `statement_runs` and `delivery_error` (DATA-22), `rpt_account_dim` |

### Shared parameters and defaults (from the parity file; report sections do not repeat them)

| Parameter | Type | Reports (index ids) | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 12 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | all except r05 | `working_office` | Mode Office / Office Group (`patients_list_reports.r01.d01`). Attribution per report in the next table. r05 has no office parameter (`scope.office_mode = none`) |
| `report_format` | `enum` | r01, r04, r08 (legacy REPORT TYPE) | `summary` | Summary -> `summary`, Detail -> `detail`; same population, row grain only |
| `report_by` | `enum` | r03, r04, r06, r09 | `appointment`, `day`, `attached_to_provider`, `created_date` | Selects the variant (population, grouping, columns, title) and, on r03, the date basis. Option lists of r03 / r06 / r09 come from vendor screenshots; r04 stays `unknown_legacy` (only `day` known). A saved view always stores `report_by` (13 modes behind one name) |
| `date_range` (`date_from`, `date_to`) | `date_range` | r01, r03, r04, r05, r07, r08, r09 | `today` / `today` | Fixed basis per report (table below); `date_basis` parameter only on r04 (`transaction_date` / `service_date`). Hidden on r09 when `report_by = send_statement_status` |
| `patient_status` | `enum` | r02, r06 | `active` | `active` / `inactive` / `both` on `rpt_patient_dim.is_active` (inactive and deleted share the flag until DATA-44; printed "inactive or deleted") |
| `provider_ids` | `entity_multi` | r02, r04, r06 | `all` | Role per report: r02 and r06 `scope.provider_attribution = attached` (NEW role, owner 04 section 3 provider-role table and 03 section 5.2: `coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id)`; r06 mode `preferred_provider`: `preferred_provider_id` only, the group key of that mode); r04 provider of the visit (`rpt_provider_visits`). Never scoped by `providers.office_id`; roster-first ordering only |
| `preferred_provider_ids` | `entity_multi` | r07; r06 (mode Last Visit) | `all` | r07: `rpt_patient_dim.preferred_provider_id`, no fallback, also the group key (interim, open question 7). r06: the provider chosen by `provider_basis` (`preferred_provider` = `preferred_provider_id`, no fallback; `treating_provider` NEW option = last-visit provider; extension of the shared key, open question 6) |
| `include_patient_type_codes` / `exclude_patient_type_codes` | `entity_multi` | r02, r06 / r02, r06, r07 | `all` / `none` | Overlap test on `rpt_patient_dim.patient_type_codes` (up to six user-defined types); source row `no_type_defined`; exclude keeps patients without a type; footer echo `ExPatType :` |
| `exclude_resp_party_type_codes` | `entity_multi` | r09 | `none` | `coalesce(rpt_account_dim.resp_party_type, 'no_type_defined') <> ALL(:codes)`: an untyped account counts as `No Type Defined` (every legacy account has exactly one, mandatory type; supplement correction `patients_list_reports.r09.s05.c01`), so it is dropped only when `no_type_defined` is excluded; type empty for self-guarantor accounts until DATA-53 |
| `statement_date` / `statement_sent_date` | `date` | r11 / r12 | `today` | r11 `filter_equals` on `patient_statements.statement_date`; r12 office-local date of NEW `patient_statements.delivery_attempted_at` (RPT-PLIST-55; `delivered_at` is a date and is set only on success) [I] |
| Report-specific keys | various | one report each | legacy default | r02 `patient_type`, `gender` (`unknown_legacy`), `age` (no gate, blank bounds), `include_patients_with_no_email` (`true`); r05 `note_type_codes`, `patient_id` (required); r06 `specialty_codes`, `provider_basis`, `last_visit_date`, `include_patients_with_no_last_visit`; r07 `plan_type`, `credit_card_on_file` (`unknown_legacy`); r09 `include_inactive_accounts`, `send_statement_status`, `aged_balance`, `aging_days`; r10 `account_balance`; r11 `statement_type` |

Dynamic rules of the family: `patients_list_reports.r01.d01` (office mode, all reports with OFFICE/GROUP),
`patients_list_reports.r06.d01` / `.d02` (Last Visit panel versus default panel), `patients_list_reports.r09.d01` (Send
Statement Status replaces the created range). Every mode not captured keeps the default panel until read on the live tool
(04 section 9.2). Footer actions on every report: CLEAR CRITERIA -> reset to defaults (`frontend`), PRINT / PREVIEW -> `print`,
ADD TO MY FAVORITES -> `saved_view` (one favorite per caller and report, re-labelled UPDATE MY FAVORITES once it exists).

### Date bases, attribution, freshness

| Report | Date basis (AD-9) | Office attribution | Provider attribution |
|---|---|---|---|
| r01 Update Patient Insurance | `appointment_date` (`rpt_appointment_facts`) | appointment office | none (no provider parameter) |
| r02 Patient List | none (no date criterion; age computed at the office-local today of the run) | patient home office (`rpt_patient_dim.home_office_id`) [I] | `attached` (NEW role: preferred, fallback `rpt_patient_activity.last_visit_provider_id`) [I] |
| r03 New Patient | follows `report_by`: `appointment_date`; created date or `first_visit_date`; created date for referral modes [I]; carrier not documented | appointment office (mode appointment); home office otherwise [I] | none |
| r04 Patients Seen | `date_basis`: `transaction_date` (default) / `service_date`; visits from `rpt_visits` (visit-code charges, missed and cancelled appointments never count) | office of the visit (office of service) | provider of the visit (`rpt_provider_visits.provider_id`) [I] |
| r05 Patient's Notes | note created date (app-era notes); migrated `account_notes` have no note date and are outside the date predicate (`include_undated_migrated_notes`) | none (one patient; `assert_patient_visible`) | none |
| r06 Grouped By | none, except `last_visit_date` in mode Last Visit (attribute range) | patient home office [I] | `attached` (NEW role, as r02); mode Preferred Provider: `preferred_provider_id`; mode Last Visit: `provider_basis` |
| r07 Payment Plan | contract `setup_date` (`rpt_payment_plan_contracts`) | contract office [I] | patient preferred provider, filter and group key [I]; contract provider via enhancement `contract_provider_ids` (open question 7) |
| r08 Online Registered | registration received date (`booking_requests` created) | office of the registration | none |
| r09 RP List | account created date (`rpt_account_dim.created_at_utc`); none in mode Send Statement Status | account home office | none |
| r10 Sent to Collection | none (current state) | account home office | none |
| r11 Statements Sent | `statement_date` equality | `coalesce(statement_runs.office_id, patient_statements.office_id, rpt_account_dim.home_office_id)` (data_card 5.1) [I] | none |
| r12 Email Error | send-attempt date (NEW `delivery_attempted_at`) [I] | as r11 | none |

| Topic | Rule |
|---|---|
| Today, ranges | Office-local today of the working office; inclusive on both ends; presets and relative tokens are enhancements (filter_card section 12) |
| Created dates | Created-date bases on patients, accounts, notes and appointments are reliable only for app rows (data_card 4.2): r03 created mode and r09 default mode print an `availability[]` warning when the range touches migrated rows (`created_at_reliable = false`) |
| Current state | Home office, preferred provider, patient type, coverage, send-statement and collection flags are current values; no list reproduces an earlier state (legacy behaviour) |
| Inactive | Patient lists: `is_active`, labelled "inactive or deleted" until DATA-44. Accounts: "inactive account" = no active member (`active_member_count = 0`) |
| Freshness | `live` (views over OLTP). `cost_class`: `instant` for r05, r11, r12; `interactive` for the rest, escalating to `background` for an office group or `all` on r02, r04 Detail, r06, r09 balance modes and r10 (`escalate_when`, 02 section 4.9) |

### Sign and arithmetic conventions

| Item | Convention |
|---|---|
| Money | Only r07 (plan amounts), r09 (balance modes), r10 and r11 / r12 (statement balance, when printed) carry money. Balances are account balances of the canonical ledger layer (PD-2): positive = owed by the account, negative = credit. Contract `Rem.` columns are recomputed (`pat_amount_remaining`), never the stale stored snapshots |
| Counts | Each list ends with a count line in the legacy wording where a sample shows one (`Total number of notes : n`, `Total number of Patients on Ortho Contract Plans : n`), otherwise `Total : n`. Count = rows of the block, except where a patient can repeat (Grouped By alert / coverage modes, Patients Seen per day): group counts are rows, the grand total states distinct patients |
| Patients Seen totals | Per-day rows count distinct patients of that office-day; the grand total is distinct patients over the range (`patients_seen`), and a second figure gives visits (`patient_visits`). The legacy total is not documented (open question 4) |
| Age | Whole years at the run's reference date; open bounds blank / `0` / `999` add no predicate |

### Page furniture, sort, rights, data classes

| Topic | Rule |
|---|---|
| Header | Line 1 office name (one office) or organisation name (several offices, office group, account-wide lists); line 2 printed title from `title_templates`: r05 `Patient Notes` with `Notes for Patient : <name>   PatID : <id>`; r07 `Patients on Regular Payment Plan` / `Patients on Ortho Payment Plan`; other reports the menu name plus the mode (`Patient List - Grouped By : Zip Code`) [I]. `Office : <name>` outer band when `["ctx", "multi_office"]` |
| Footer | `criteria_echo = footer` with legacy echo labels where a sample shows them (`From :`, `Thru :`, `Patient :`, `Note Type :`, `ExPatType :`, `* Excludes Inactive Patients` when `patient_status = active`), `Printed : <date time>`, `By : <user>`, `Page : n of m`. The vendor copyright line is not reproduced |
| Orientation | r02 landscape (2014 sample); others portrait unless the column set needs landscape; layout `banded_table` (ENG-23) |
| Default sort | The printed legacy order where a sample shows it: r02 first name (2014 sample, quirk kept as default, last-name sort offered); r05 newest first; r07 provider group, then patient. Otherwise patient (or responsible party) `Last, First`. `row_id_column` = `patient_id` / `account_id` / note or statement key |
| Identifier columns | Legacy Patient List prints no patient id; `patient_id` and `chart_no` are added as hidden-by-default columns (enhancement), so duplicates can be told apart |
| Right families | r01-r08: `lists_patient` (`reports_lists_patient_list_screen_view_only` / `..._full_control`). r09-r12: `lists_responsible_party` (`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`). No per-report override (security_card 2.3). View Only = run and view; Full Control adds print, export, schedule (PD-10); XLSX / CSV also need `reports_export_data_files` |
| Data classes | Name, patient id, chart #, birth date, age, sex, phones, e-mail, address, appointment date, patient type, referral source, HIPAA flag, last visit: `phi_identified` (rule 5: patient name is a key column). Subscriber id, guarantor employer on a patient row: `phi_sensitive`. Medical alert (r04 mode medical alert, r06 mode Medical Alert): `clinical`, a key column there, so a caller without `clinical` cannot run that mode (403 `data_class_denied`). r05 note text: `phi_identified` (rule 4, other notes); Chart Notes rows are `clinical` and are dropped, not refused, for a caller without `clinical`, with a printed notice (NEW row-class rule, owner 08); note type and author `phi_identified`. Balances, plan amounts, statement amounts: `financial_patient`. Counts per day / band / office: `aggregate`; zip and employer group keys: `phi_identified` + `deny` (rule 13). Patient-identifying parameters (`patient_id`, name-bearing values) need `phi_identified` (rule 8) |
| Schedulable | All except r05 (required single patient, `schedulable: false`) |
| Drill | Patient cell -> `kind: record` patient overview (`phi_identified`, `assert_patient_visible`); account cell -> account ledger; count cells of r03 / r04 / r08 summaries -> `kind: rows` (Detail filtered to the bucket); r07 contract -> payment plan screen |
| Metrics | `reconciles_with[]`: r04 distinct total = `patients_seen`, row sum = `patient_visits`; r03 modes created / first visit / appointment = `new_patients_created` / `new_patients_first_visit` / `new_patients_first_appointment` where the definitions match (to confirm in 05); r02 count with `patient_status = active` is not `active_patients` (status flag versus visit window) and is labelled so |

### Family-wide enhancements (additive; a run with untouched defaults is the legacy run)

| Enhancement | Reports | Phase |
|---|---|---|
| Bulk actions letters, postcards, labels, SMS / e-mail campaign hand-off (owning features, PD-15), respecting `no_correspondence`, `no_auto_email`, `no_auto_sms` | r01, r02, r03, r06, r08 | P3 |
| Row actions open patient, open account ledger, book appointment (`openSchedulerForBooking` hand-off) | patient and account lists | P3 |
| Chart hints: patients seen per day (line), per age band (bar); grouped counts (bar) | r04, r06 | P3 |
| Multi-select on legacy single-select dropdowns (SPECIALTY); search and inactive switch in pickers | r06 and all pickers | P3 |
| `patient_id`, `chart_no`, home office, last visit as optional columns (column chooser) | r02, r06, r03 | P3 |
| Link from r06 mode Last Visit and r02 to `worklists.reactivation` (06) | r02, r06 | P3 |
| Comparison period on counts | r03, r04 | P4 |

### Family-wide open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Printed columns, grouping and totals of every report except r05 and r07 Ortho (no sample) | live legacy run of each mode, PDF and Excel |
| 2 | REPORT BY values of Patients Seen; criteria panels of the 11 uncaptured Grouped By modes, the 4 other New Patient modes and 4 other RP List modes | live legacy tool, expand REPORT BY and select each value |
| 3 | How `Created Date / First Visit Date` chooses between the two definitions; which date the range filters in modes Carrier / Referral / Referral Type | live legacy tool |
| 4 | Patients Seen grand total: distinct patients or sum of per-day counts; provider role (transaction versus appointment provider) | live legacy run with a two-day range |
| 5 | SEX and CREDIT CARD ON FILE option lists; default of `include_patients_with_no_last_visit`, `send_statement_status`, `provider_basis`, `last_visit_date` | live legacy tool |
| 6 | Mode Last Visit: does the PREFERRED PROVIDER picker filter the treating provider of the last visit when `Treating Provider` is chosen (role switched by `provider_basis`, recorded here as an extension of `preferred_provider_ids` that 04 must adopt)? | live legacy tool; 04 owner |
| 7 | Patients on Payment Plan: is PREFERRED PROVIDER the patient's preferred provider or the contract provider, and is the `Provider :` band of the sample the same provider (interim: preferred provider for both)? Regular-plan layout | live legacy run, both plan types |
| 8 | Office attribution of the patient lists (home office versus any office the patient visited) and of the statement reports (run office versus account home office) | live legacy run with a patient whose home office differs |
| 9 | Why STATEMENT TYPE `Email` / `Both` are greyed; whether Statement Sent Date is the send date or the statement date | live legacy tool of an organisation with e-statements |
| 10 | Sent to Collection: are 0.00 / 999999.99 real bounds (credit balances excluded) or open bounds | live legacy run with a credit-balance account flagged |
| 11 | The worked example `lists.patient_list` of 02 section 3.12 uses provisional keys (`sex`, `include_patient_types`, `exclude_patient_types`) and the old class `phi_sensitive` for birth date; the parity file (`gender`, `include_patient_type_codes`, `exclude_patient_type_codes`) and 08 section 5.1 (`phi_identified`) supersede it | 02 owner |
| 12 | The task brief lists report ids in menu order (r01 = Patient List); the legacy index numbers them by screenshot (r01 = Update Patient Insurance). The parity file and this document use the index ids | plan coordinator |

## Update Patient Insurance (Conversion) List - By Appointment - `lists.update_patient_insurance_conversion_list_by_appointment`

Lists › Patient/Resp. Party List, group `PATIENT LIST`, screenshots 1.PNG / 9.PNG (identical) - P3 - S - `lists_patient`
(`reports_lists_patient_list_screen_view_only` / `..._full_control`) - interactive - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front office, insurance coordinator | Daily, for the appointments two days ahead (vendor routine; the only Lists report in the vendor's role matrix) | Before the visit, replace the conversion placeholder coverage with the real plan and verify eligibility, so the visit can be estimated and claimed |
| Office manager | Weekly while the practice is post-conversion | How many booked patients still carry conversion insurance; whether the clean-up is progressing per office |

The report is meaningful only for practices that were converted from another system (research quirk). In DentC every
tenant is a converted Denticon practice, and Denticon's own conversion tag (`UP`, "Update Information") was migrated into
`patients.patient_types` / `patient_type` [A `be_data_patients_clinical.md` L82, L95], so the population exists from day one.

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose and cadence documented `[P17]`, placeholder plan documented `[P18]`; layout [I].

| Item | Legacy (as documented or inferred) | DentC |
|---|---|---|
| Printed title | [I] menu name plus the format, pattern of `Explosion Codes List (Summary)`: `Update Patient Insurance (Conversion) List - By Appointment (Summary)` / `(Detail)` | `title_templates`: `report_format = summary` -> `... (Summary)`, `detail` -> `... (Detail)` [I] |
| Detail rows [I] | Appointment date and time, patient ID, patient name, phone, provider, and the converted insurance hint per coverage slot: carrier, employer, group, subscriber ID | One row per appointment x active coverage slot of the patient (a patient without a slot prints one row with blank coverage) |
| Summary rows [I] | Count of such patients per office or day | One row per office-day: appointments, distinct patients |
| Placeholder plan `[P18]` | Carrier `CONVERSION DEFAULT - Do NOT Delete! Change Pt Ins!`, employer `CONVERSION`, group `DO NOT TOUCH`; the plan record carries the old system's plan details as a hint | The slot is flagged `is_conversion_placeholder` (NEW computed column, see Data) and printed in a `Placeholder` column |
| Totals | Not documented | Detail: `Total : n` appointments and `Patients : n` distinct; Summary: grand total row |
| Sign conventions | No money | - |
| Quirks kept | Useless for never-converted practices; the default range is today (the vendor routine looks two days ahead) | Kept; the two-days-ahead routine is a saved view (enhancements) |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REPORT TYPE | (no label) (radio_group) | **Summary** / Detail | `report_format` | enum | Summary -> `summary`, Detail -> `detail` | `summary` | replicated | REPORT TYPE with Summary / Detail is the report format spelled differently. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: appointment office (rpt_appointment_facts.office_id) of the appointments in the range. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. Fixed basis appointment_date (rpt_appointment_facts.appointment_date, office-local); this section has no basis radio. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Fixed basis appointment_date; no basis radio. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| OFFICE/GROUP = Office Group | The SELECT picker chooses office groups defined in Setup > Office Groups (for example regions) instead of offices; when no office groups are defined, a group run covers all offices of the account. Cross-cutting statement of the document for all Lists screens (vendor articles on office groups and on the new reports menu) - recorded once here; it applies to every report of this category that has the Office / Office Group radios (all except Patient's Notes). | office_scope on the 11 reports of this category that have OFFICE/GROUP (all except Patient's Notes, which has no office parameter: scope.office_mode = none, patient visibility via assert_patient_visible): the mode radio decides the value key. Mode office -> the picker lists offices (lookup:offices) and writes office_ids (list, token working_office (default), my_offices or all). Mode office_group -> the picker lists office groups (lookup:office_groups) and writes office_group_id or office_group_ids, default all. A tenant without office groups: mode office_group offers only all, which resolves to every office the caller may read (legacy: a group run covers all offices of the account), never wider than the caller's office rights (filter_card 6.1). Switching the mode resets the selection to that mode's default. Exactly one value key is sent. |
<!-- PARITY:patients_list_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | `output_format = pdf`; result shown on screen first, PDF rendered from the same snapshot; never changes rows |
| PRINT FORMAT `Excel` | `output_format = xlsx`; flat typed sheet of the chosen format; `csv` added |
| REPORT TYPE `Summary` (default) | `report_format = summary`: one row per office and appointment date with counts; same population as Detail |
| REPORT TYPE `Detail` | `report_format = detail`: one row per appointment x coverage slot with patient and insurance columns |
| OFFICE/GROUP `Office` (default) | `office_ids` (default token `working_office`): appointments whose `rpt_appointment_facts.office_id` is in the list; SELECT picks other offices, `my_offices` and `all` added |
| OFFICE/GROUP `Office Group` | `office_group_id` / `office_group_ids`: appointments at the offices of the chosen groups; no groups defined -> `all` = every office the caller may read |
| APPOINTMENT DATE RANGE Start Date / End Date (default today / today) | `date_from` / `date_to` on `rpt_appointment_facts.appointment_date` (office-local), inclusive; presets and relative tokens added |
| Rule `patients_list_reports.r01.d01` | Mode radio decides the value key; switching the mode resets the picker to that mode's default; exactly one office key is sent |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset to defaults (`frontend`) / run then print (`print`) / `saved_view` (one favorite per caller and report) |

No control is greyed, hidden or dependent except the office mode. Population rule (not a control): patients tagged `UP`
in `rpt_patient_dim.patient_type_codes` with a live appointment in the range (coverage matrix row 81); see Data.

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `conversion_basis` | `enum` NEW (owner 04 when adopted) | `patient_type_up` | `patient_type_up` = tag `UP` (coverage matrix rule); `placeholder_plan` = patient holds an active slot with `is_conversion_placeholder`; `either` = union. Lets the office catch patients whose tag was removed but whose plan was not replaced, and the reverse |
| `include_cancelled_appointments` | `boolean` (shared, 3.7) | `false` [I] | `true` adds cancelled and no-show appointments (`status_class IN ('cancelled','no_show')`); default drops them [I, open question 2] |
| `appointment_provider_ids` | `entity_multi` (shared role key `appointment`) | `all` | Filter on `rpt_appointment_facts.provider_id`; picker roster-first, never excludes |
| `operatory_ids` | `entity_multi` (shared, 3.7) | `all` | Filter on `rpt_appointment_facts.operatory_id` (one coordinator per column of the schedule) |
| `eligibility_statuses` | `enum_multi` NEW: `verified`, `not_eligible`, `unknown` | all ticked, `full_selection = no_predicate` | Narrow to slots not yet verified (`rpt_insurance_coverage.elig_status_class`) |
| `sort_by` | `enum` (shared key) | `appointment_date` | `appointment_date` (date, time, patient), `patient_last_name`, `provider_last_name_appointment_date` (values of sig0016) |
| `page_break_by` | `enum` (shared, `layout`) | `none` | `office`, `date` (one page per appointment day, handed to the chair-side team) |
| Saved view "Conversion check - 2 days ahead" | preset | - | `date_from = date_to = today+2d`, `report_format = detail`; schedulable daily at 07:00 office time (link-only e-mail, PD-12) |

### Data

Availability **READY** (coverage matrix row 81). Datasets: `rpt_appointment_facts` (DATA-16, P1), `rpt_patient_dim`
(DATA-05), `rpt_insurance_coverage` (DATA-21, P1), `rpt_provider_dim`, `rpt_office_dim`.

| Dataset | Columns used |
|---|---|
| `rpt_appointment_facts` | `appointment_id`, `office_id`, `appointment_date`, `start_time`, `provider_id`, `operatory_id`, `patient_id`, `status_class`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`, `is_placeholder_patient` |
| `rpt_patient_dim` | `patient_id`, `chart_no`, `last_name`, `first_name`, `preferred_name`, `dob`, `phone`, `cell_phone`, `work_phone`, `patient_type_codes`, `home_office_id`, `no_auto_sms`, `sms_opt_out_at`, `no_correspondence` |
| `rpt_insurance_coverage` | `slot_id`, `patient_id`, `category`, `tier`, `carrier_name`, `employer_name`, `group_number`, `subscriber_id`, `subscriber_name`, `relationship`, `elig_status_class`, `elig_verified_on`; NEW computed `is_conversion_placeholder` = `carrier_name ILIKE 'CONVERSION DEFAULT%' OR (employer_name = 'CONVERSION' AND group_number = 'DO NOT TOUCH')` (owner 03, RPT-PLIST-41) |
| `rpt_provider_dim`, `rpt_office_dim` | `provider_name`, `short_id`; `office_name`, `timezone`, `local_today` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `f.office_id = ANY(:office_ids)` (appointment office, 03 section 5.1) |
| `date_range` | `f.appointment_date BETWEEN :date_from AND :date_to` (appointment date is already office-local; "today" per office, AD-9) |
| `report_format` | Selects block `summary_by_day` or `detail` |
| fixed row filter | `NOT f.is_block AND NOT f.is_deleted AND NOT f.is_legacy_archive AND NOT f.is_patientless` and `f.status_class NOT IN ('cancelled','no_show')` unless `include_cancelled_appointments` |
| population (`conversion_basis = patient_type_up`) | `'UP' = ANY(p.patient_type_codes)` (mapping of the single `patient_type` value through `rpt_value_map`, data card 3.5) |
| `conversion_basis = placeholder_plan` / `either` | `EXISTS (SELECT 1 FROM rpt_insurance_coverage c WHERE c.patient_id = f.patient_id AND c.is_conversion_placeholder)` / OR of both |
| Detail coverage | `LEFT JOIN rpt_insurance_coverage` on `patient_id` (one row per active slot; ordered dental before medical, then tier) |

| Topic | Rule |
|---|---|
| Date basis | `appointment_date` (fixed, `scope.date_basis`) |
| Office attribution | appointment office (`office_attribution = appointment`) |
| Provider attribution | appointment provider, printed only; no legacy provider criterion |
| Migrated history | Appointments exist for both eras. The tag and the coverage are current state: once the tag is removed the patient leaves every past run; when a plan was fixed is not recorded (no coverage history, data card 2.21) |
| Eligibility | `elig_status_class` is `unknown` on every migrated subscriber [D], so the eligibility filter is meaningful for app-era verifications only |

### Output

`report_format = detail` - block `detail` (main, table). Fixed outer level `Office : <office_name>` when `["ctx", "multi_office"]`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | - |
| `start_time` | Time | time | `phi_identified` | - |
| `patient_name` | Patient | text (`Last, First`) | `phi_identified` (key column) | `count_distinct(patient_id)` labelled `Patients :` |
| `patient_id` | Pat ID | id | `phi_identified` | - |
| `chart_no` | Chart # | text, `default_visible: false` | `phi_identified` | - |
| `dob` | Birth Date | date, `default_visible: false` | `phi_identified` | - |
| `phone` | Phone | text (cell, else home, else work) | `phi_identified` | - |
| `provider_name` | Provider | text | `aggregate` | - |
| `operatory_name` | Op | text, `default_visible: false`; label of `rpt_appointment_facts.operatory_id` from a NEW `operatories` catalog passthrough (owner 03, with DATA-45) | `aggregate` | - |
| `coverage_label` | Coverage | text (`Dental Primary`, ...) | `phi_identified` | - |
| `carrier_name` | Carrier | text | `phi_identified` | - |
| `employer_name` | Employer | text | `phi_sensitive` | - |
| `group_number` | Group # | text | `phi_identified` | - |
| `subscriber_id` | Subscriber ID | text | `phi_sensitive` | - |
| `is_conversion_placeholder` | Placeholder | boolean (`Yes` / blank) | `phi_identified` | `count` of true labelled `Placeholder plans :` |
| `elig_status_class` | Elig. | enum, `default_visible: false` | `phi_identified` | - |
| `appointment_id`, `slot_id`, `office_id` | - | id, `hidden` | `phi_identified` / `aggregate` | `appointment_id` = `row_id_column` with `slot_id` |

Grand total: `Total : n` = `count_distinct(appointment_id)`, `Patients : n`. Default sort `appointment_date`, `start_time`,
`last_name`, `first_name`, `appointment_id`, `slot_id`.

`report_format = summary` - block `summary_by_day` (main, table), same outer office level.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `aggregate` | - |
| `appointment_count` | Appointments | integer | `aggregate` | `sum` (office subtotal and grand total) |
| `patient_count` | Patients | integer | `aggregate` | `count_distinct(patient_id)` over the level (not a sum: a patient booked on two days counts once in the total) |
| `placeholder_patient_count` | With Placeholder Plan | integer | `aggregate` | `count_distinct` as above |

Summary cards (both formats, block totals): appointments, patients, patients with a placeholder plan. No metric key exists
in metrics_card for conversion clean-up; the figures are described here only. Page break: `none` (default), `office`, `date`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (Summary) | Bar: patients to update per appointment day (`kind: bar`, category `appointment_date`, value `patient_count`), useful with a 14-day range |
| Summary count cell | `kind: rows` - same report, `report_format = detail`, `office_ids` <- group office, `date_from` / `date_to` <- `appointment_date` |
| Patient name | `kind: record` patient overview (`assert_patient_visible`, `phi_identified`) |
| Coverage / carrier cell | `kind: record` patient insurance screen of the slot (`slot_id`), feature right of the insurance screen (08) |
| Appointment date / time | `kind: record` appointment in the Scheduler day view (route via `openSchedulerForBooking`-style hand-off is not used; open existing appointment) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_patient_insurance` | row | navigate | insurance feature right | Opens the slot to attach the real plan |
| `verify_eligibility` | row / bulk | navigate | eligibility feature right | Opens `worklists.eligibility_verification` (06) filtered to the selected appointments' dates and patients |
| `open_appointment` | row | navigate | scheduler right | Scheduler at the appointment |
| `create_task` | row / bulk | create_task | task feature | "Update conversion insurance" task per patient, due the day before the appointment |
| `send_sms` | bulk | send_sms | SMS feature; `requires: sms_consent` | "Please bring your insurance card"; excludes `no_auto_sms`, opted-out; excluded count shown before send |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

The report doubles as a daily worklist through the tasks it creates; follow-up state (worked / resolved) belongs to
`worklists.eligibility_verification`, not to this list.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`; Detail landscape (12 default-visible columns, 16 with the column chooser), Summary portrait; header line 1 office name (one office) or organisation name, line 2 title from `title_templates`; footer `criteria_echo = footer` with `From :`, `Thru :`, `Offices :`, `Report Type :`, `Printed :`, `By :`, `Page : n of m`; repeat header per page |
| XLSX | One sheet per run (`Detail` or `Summary`), one row per appointment x slot, appointment columns repeated on every slot row, no merged cells, frozen header, autofilter; criteria sheet |
| CSV | Main block, formula-injection guard |
| Background | Not needed (one office-day range is small); `escalate_when` office group or `all` with a span over 31 days -> `background` |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Population rule of the legacy report: patient type `UP`, the placeholder plan, or both? (coverage matrix uses `UP`; research documents the plan) | Live legacy run on a converted test practice |
| 2 | Are cancelled / missed appointments listed? Is a patient listed once per appointment or once per range? | Live legacy run with a cancelled appointment in range |
| 3 | Printed columns and Summary grain (per office, per day, per provider) - INFERRED | Live legacy PDF and Excel of both formats |
| 4 | Does the legacy title carry `(Summary)` / `(Detail)`? | Live legacy PDF |
| 5 | Product: should the `UP` tag be cleared automatically when a placeholder slot is replaced (would empty the list as staff work)? | Product owner |

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

<!-- PARITY:patients_list_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| PATIENT STATUS | (no label) (radio_group) | **Active** / Inactive / Both | `patient_status` | enum | Active -> `active`, Inactive -> `inactive`, Both -> `both` | `active` | replicated | - |
| PATIENT TYPE | (no label) (radio_group) | **Both** / General / Ortho | `patient_type` | enum | Both -> `both`, General -> `general`, Ortho -> `ortho` | `both` | replicated | Ortho-patient flag, not the user-defined patient types of INCLUDE / EXCLUDE PATIENT TYPE. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: home office of the patient (rpt_patient_dim.home_office_id, current state; inferred - the legacy rule is not documented). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this report: attached provider (scope.provider_attribution = attached, NEW role: coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id); owner 04 section 3 provider-role table and 03 section 5.2) - the fallback serves migrated patients, who carry no preferred provider; inferred from the research (old Active Patient List had the same Provider box). Generic key provider_ids kept because the legacy label is plain PROVIDER. ALL = no restriction; patients with neither provider match only under all. Never scoped by providers.office_id. |
| INCLUDE PATIENT TYPE | (no label) (picker) | shown: ALL | `include_patient_type_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| SEX | (no label) (dropdown) | shown: ------ | `gender` | enum | - | `all` | unknown_legacy | Static dropdown captured collapsed: only the default is known. Expand the list on the live tool and record every option. The six hyphens are a no-selection placeholder (= all). |
| AGE RANGE | From (number_input) | (empty) | `age_from` | number_range | - | - | replicated | Lower age bound in years, inclusive; blank = no lower bound. |
| AGE RANGE | To (number_input) | (empty) | `age_to` | number_range | - | - | replicated | Upper age bound in years, inclusive; blank = no upper bound. |
| OTHER OPTIONS | Include Patients With No Email (checkbox) | **checked** | `include_patients_with_no_email` | boolean | - | `true` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r02:END -->

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
| PROVIDER list | attached provider (`scope.provider_attribution = attached`, NEW): `coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id) IN (:provider_ids)` [I]; patients with neither are dropped |
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
| Provider attribution | `scope.provider_attribution = attached` (NEW role, owner 04 section 3 provider-role table and 03 section 5.2: preferred provider, fallback `last_visit_provider_id`); the shared `preferred` role stays `preferred_provider_id` only; provider ids are strings; never `providers.office_id` |
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

<!-- PARITY:patients_list_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT BY | (no label) (dropdown) | Carrier † / Created Date / First Visit Date † / Referral † / Referral Type † (shown: Appointment) | `report_by` | enum | Appointment -> `appointment`, Carrier -> `carrier`, Created Date / First Visit Date -> `created_date_first_visit_date`, Referral -> `referral`, Referral Type -> `referral_type` | `appointment` | replicated | Option list read from a vendor screenshot (2022), not from our capture: re-check on the live tool. The value selects the report variant and the date the range applies to (Appointment uses APPOINTMENT DATE RANGE). Differs from the shared mapping: REPORT BY list of Patient List - New Patient is known from vendor documentation; the signature itself stays unknown_legacy. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: report_by = appointment: appointment office (rpt_appointment_facts.office_id); every other mode: home office of the patient (rpt_patient_dim.home_office_id) - inferred, confirm on the live tool. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; the basis follows report_by: appointment -> appointment_date of the new-patient appointment (rpt_appointment_facts); created_date_first_visit_date -> created date of the patient record and/or first_visit_date (rpt_patient_activity) - how the legacy screen chooses between the two is not documented; referral, referral_type -> date the record was created (vendor: new records in the range) - inferred; carrier -> not documented. Whether the section title changes with the mode was not captured. Default today in the office time zone. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end; basis follows report_by exactly as Start Date (appointment_date / created_date / first_visit_date). Default today in the office time zone. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r03:END -->

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
| Availability | Coverage 75a: **SCHEMA(44)** for the default mode - placeholders by the interim rule [I] until `registration_status` (DATA-44). Modes Carrier, Created / First Visit, Referral, Referral Type depend on `new_patient_definition`: with the default `created_date` every one of them is **APP** (migrated patients are never listed by created date; availability `created_date_app_only`); with `first_visit_date` they are **READY** on REPAIR(19) (first visit derived, DATA-19). Referral on app patients additionally SCHEMA(40) (DATA-40). Coverage rows 75b / 75d / 75e (READY on `patient_activity`) assume the first-visit basis: correction requested from the 03 owner |
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

<!-- PARITY:patients_list_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT BY | (no label) (dropdown) | shown: Day | `report_by` | enum | - | `day` | unknown_legacy | Static dropdown captured collapsed: only the default Day is known. Expected values from the four folded legacy reports (inferred, research 'Patients Seen'): Day (Patients Seen Per Day), by age in 10-year bands (Patients Seen Per Day By Age), by medical alert (Patients Seen by Medical Alerts), by zip code (Patients Seen by Zip code); candidate keys day, age, medical_alert, zip_code. Expand the list on the live tool and record labels, order and whether any value swaps criteria. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REPORT TYPE | (no label) (radio_group) | **Summary** / Detail | `report_format` | enum | Summary -> `summary`, Detail -> `detail` | `summary` | replicated | REPORT TYPE with Summary / Detail is the report format spelled differently. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: office of the visit (rpt_visits.office_id / rpt_provider_visits.office_id = office of service of the visit-code charges). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this report: provider of the visit (rpt_provider_visits.provider_id = every provider who charged a visit code that day; data_card 5.2). With all the count reads rpt_visits (distinct patients); with a list it reads rpt_provider_visits, so a patient seen by two selected providers on one day counts once per provider row but once in the distinct total. Legacy role (transaction provider) is inferred - confirm on the live tool. |
| DATE RANGE | (no label) (radio_group) | **Transaction Date** / DOS Date | `date_basis` | enum | Transaction Date -> `transaction_date`, DOS Date -> `service_date` | `transaction_date` | replicated | - |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT BY `Day` (default; other values `unknown_legacy`) | Block `by_day`: one row per office-local visit date with distinct patients |
| REPORT BY candidate `age` [I] | Block `by_age`: matrix, rows = visit date, columns = 10-year bands `0-9` ... `80-89`, `90+`, `Unknown` (no `dob`); age at the visit date - matrix layout, top band and reference date are DentC choices (open question 4) |
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
| `by_age` (matrix) [I] | `period_label` x `age_band` | Date x `0-9` ... `90+`, `Unknown` (layout, top band and age-at-visit-date are DentC choices; research: counts in 10-year categories only; open question 4) | `integer` | `aggregate` | row totals and column totals distinct per cell scope |
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

<!-- PARITY:patients_list_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| PRINT NOTES | (no label) (picker) | shown: ALL | `note_type_codes` | entity_multi | - | `all` | replicated_enhanced | Vendor documentation: the picker selects the note types to print (list starts ALL, Patient Notes, Resp. Party Notes; the printed Note Type column shows Patient Notes, Responsible Party Notes, Financial Notes, Chart Notes; footer echo Note Type, blank when all). Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| PATIENT | Patient (text_input) | (empty) | `patient_id` | entity_single | - | - | replicated | Mandatory single patient (vendor documentation: type the last name, search, pick); the report prints the notes of that one patient and has no office filter. Required, no all, no list. Empty by default as captured; the patient in context is offered as the first suggestion, never pre-filled silently. Differs from the shared mapping: Same box as the optional patient filter of Audit Trail (sig0170), different meaning: optional filter with all there, one required patient here. |
| PATIENT | SEARCH (button) | - | `patient_id.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. Differs from the shared mapping: SEARCH button of the single-patient box of Patient's Notes (parameter patient_id, not patient_ids). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed basis created date of the note (patient_notes created_at as office-local date; app-era notes only). Migrated account_notes have no note-date column and their created_at is the load time (created_at_reliable = false): they are outside the date predicate and print only with the enhancement include_undated_migrated_notes (Date Created '-'). Default today in the office time zone. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end, fixed basis created date of the note (app-era notes; migrated account_notes are undated and outside the predicate). Default today in the office time zone. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `patient_id` | required_when | true | - | documented - Mandatory single patient. |
<!-- PARITY:patients_list_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added) |
| PRINT NOTES `ALL` (default) | `note_type_codes = all`: notes of every type |
| PRINT NOTES list (`Patient Notes`, `Resp. Party Notes`, further types not captured) | Only the chosen types: `patient_notes` -> `patient_notes` rows; `responsible_party_notes` / `financial_notes` -> `account_notes` rows of the patient's account mapped to that type, plus the account field `financial_notes`; `chart_notes` -> `patient_notes` rows whose type maps to chart [I]. Footer `Note Type : <labels>` |
| PATIENT Patient (required, empty by default) | `patient_id` (`entity_single`, `required`): the one patient; missing -> 422 `parameter_required`; a patient the caller may not open -> 403 `patient_not_in_office` (`assert_patient_visible`) |
| PATIENT `SEARCH` button | Superseded: typeahead in the box plus the search icon (full dialog); the patient in context is the first suggestion, never pre-filled |
| DATE RANGE Start / End (default today / today) | Created date of the note, office-local, inclusive. Migrated `account_notes` have no note date (`created_at_reliable = false`): they never match the range and print only with `include_undated_migrated_notes` |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset / run / saved view (stores `patient_id` only as a token or a named-user share, 08 SH-1) |

Dependency rules: `patient_id` `required_when true` (shared rule). No office section (`scope.office_mode = none`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| Date preset `all_dates` | preset of `date_range` (7.4) | - | Whole history in one click (records release) |
| `include_struck_off_notes` | `boolean` NEW | `true` | `false` drops `account_notes.is_struck_off` rows; when included they print with the prefix `[struck off]` |
| `include_undated_migrated_notes` | `boolean` NEW | `false`; `true` when `date_preset = all_dates` | Adds the migrated account notes (no note date; `created_at` = load time, never used as a date), whatever the range; `Date Created` printed `-`, sorted after the dated notes |
| `note_origin` | `enum` NEW: `all`, `user_entered`, `system_generated` | `all` | `system_generated` = notes written by the system (scan file names, print events); needs a stored origin (NEW column, owner 03; interim [I]: `document_id IS NOT NULL` or no creating user) |
| `note_text_contains` | `text` NEW | blank | Case-insensitive contains filter on the text; never written to the URL (filter_card 12) |

### Data

| Item | Rule |
|---|---|
| Datasets | passthrough `patient_notes` (`patient_id`, `note_date`, `note_type`, `notes`, `document_id`, `office_id`, `is_archived`, `is_deleted`, `created_by`, `created_at`); passthrough `account_notes` (`patient_id`, `note_type`, `notes`, `is_struck_off`, `created_at`); `rpt_account_dim` (`account_id`, `financial_notes`); `rpt_patient_dim` (`account_id`, name, `patient_id`); `rpt_user_dim` (`user_label`) |
| Union | `patient_notes` of the patient (live: `NOT is_deleted`; `is_archived` follows the archive policy) UNION ALL `account_notes` of **every member** of the patient's current account (migrated account notes sit on one representative member, analysis `be_data_patients_clinical` table row `account_notes`) UNION ALL one row for `rpt_account_dim.financial_notes` when not blank |
| Note type | NEW `rpt_value_map` domain `note_type` (owner 03) maps `patient_notes.note_type` and `account_notes.note_type` raw values to `patient_notes`, `responsible_party_notes`, `financial_notes`, `chart_notes`; the option source lists exactly these four (parity concern on `note_types`) |
| Date basis | `created_date` of the note: `(created_at AT TIME ZONE 'UTC' AT TIME ZONE tz)::date`, tz = note office, else patient home office. Migrated `account_notes` (4,518, `RESPNOTES.txt`) have no note-date column and their `created_at` is the load time: `created_at_reliable = false`, excluded from the date predicate, `Date Created` `-`. NEW DATA item (owner `03_data_foundation.md`): load the note date from `RESPNOTES.txt` into a NEW `account_notes.note_date` if the source carries one |
| Financial notes field | has no date: printed as one row with `Date Created` `-`, Note Type `Financial Notes`, included when the type is selected regardless of the range, sorted last - DentC behaviour, not documented legacy behaviour (open question 6) |
| Created By | `patient_notes`: `rpt_user_dim.user_label` of `created_by`. `account_notes` has no creator column (analysis `be_data_patients_clinical` row `account_notes`): `-` on every account note, migrated or app-era, until NEW column `account_notes.created_by` (owner 03; open question 7) |
| Availability | **READY** for Responsible Party Notes and Financial Notes; **APP** for Patient Notes and Chart Notes: `patient_notes` has 0 migrated rows (no legacy export, open question 8), so the legacy output of a migrated patient cannot be reproduced for those types. Warnings: `patient_notes_app_only` on every run for a migrated patient; `migrated_notes_undated` when the patient's account has migrated account notes. Coverage matrix row 77 (READY) to be corrected by the 03 owner |

### Output

One block `main`, grain note.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `created_at_local` | Date Created | `datetime` (`M/D/YYYY h:mm AM/PM`, tz `office`) | `phi_identified` | - |
| `created_by_label` | Created By | `text` | `phi_identified` | - |
| `note_type_label` | Note Type | `enum` | `phi_identified` | - |
| `note_text` | Note | `text` (wrapped) | `phi_identified` (rule 4); Chart Notes rows `clinical`: dropped for a caller without `clinical`, notice `chart_notes_withheld` with the dropped count (NEW row-class rule, owner 08) | count -> `Total number of notes : n` (rows printed) |
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
| 4 | 08 owner: adopt the row-class rule (Chart Notes rows dropped with a notice, other note text `phi_identified`), so that `lists_patient` holders without `clinical` (front desk, treatment coordinator) keep the legacy run |
| 5 | Are struck-off notes printed? |
| 6 | Does the legacy report print the account financial-notes field, and with which date? |
| 7 | Is the author of an account note stored anywhere (legacy export or app)? |
| 8 | Does a legacy export of Patient Notes / Chart Notes exist (none was migrated)? |

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

<!-- PARITY:patients_list_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT BY | (no label) (dropdown) | Birthdate † / Carrier † / Employer † / Fee Schedule † / HIPAA Agreement † / Insurance Plan † / Last Visit † / Medical Alert † / Patient Type † / Preferred Provider † / Uninsured † / Zip Code † (shown: Attached to Provider) | `report_by` | enum | Attached to Provider -> `attached_to_provider`, Birthdate -> `birthdate`, Carrier -> `carrier`, Employer -> `employer`, Fee Schedule -> `fee_schedule`, HIPAA Agreement -> `hipaa_agreement`, Insurance Plan -> `insurance_plan`, Last Visit -> `last_visit`, Medical Alert -> `medical_alert`, Patient Type -> `patient_type`, Preferred Provider -> `preferred_provider`, Uninsured -> `uninsured`, Zip Code -> `zip_code` | `attached_to_provider` | replicated | All 13 values read from vendor screenshots, not from our capture: re-check on the live tool. The criteria panel changes with the value; only the modes Attached to Provider and Last Visit were seen. Differs from the shared mapping: REPORT BY list of Patient List - Grouped By is known from vendor documentation; the signature itself stays unknown_legacy. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| PATIENT STATUS | (no label) (radio_group) | **Active** / Inactive / Both | `patient_status` | enum | Active -> `active`, Inactive -> `inactive`, Both -> `both` | `active` | replicated | - |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: home office of the patient (rpt_patient_dim.home_office_id, current state; inferred). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this report (report_by = attached_to_provider and the other modes that keep the PROVIDER section): scope.provider_attribution = attached (NEW role, owner 04 section 3 and 03 section 5.2: coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id)); the fallback is labelled on history (coverage 78a: no provider is attached to migrated patients). In mode preferred_provider the same picker filters rpt_patient_dim.preferred_provider_id only (the group key of that mode). How Attached to Provider differs from mode Preferred Provider is not documented - confirm on the live tool. Hidden when report_by = last_visit (04 shared rule). |
| INCLUDE PATIENT TYPE | (no label) (picker) | shown: ALL | `include_patient_type_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| SPECIALTY | (no label) (dropdown) | shown: ALL | `specialty_codes` | entity_multi | - | `all` | replicated_enhanced | Specialty of the provider resolved as for provider_ids (attached provider; preferred provider in mode preferred_provider), not of a referral source. rpt_provider_dim.specialty is free text: codes of the specialties option source match it through a NEW rpt_value_map domain specialty (owner 03); blank on 96 of 97 migrated providers (availability provider_specialty_sparse). Legacy single-select; the parameter accepts a list (enhancement). Hidden when report_by = last_visit (04 shared rule). Confirm the list source on the live tool. |
| PREFERRED PROVIDER | (no label) (radio_group) † | Preferred Provider / Treating Provider | `provider_basis` | enum | Preferred Provider -> `preferred_provider`, Treating Provider -> `treating_provider` | `preferred_provider` | replicated | 04 shared vendor-doc parameter provider_basis with a per-report option list: option treating_provider is NEW (04 section 3 to add; the Aging reports list preferred_provider / transaction_provider). preferred_provider -> the picker and the group key read rpt_patient_dim.preferred_provider_id (no fallback; patients without one under (No Preferred Provider)); treating_provider -> both read the provider of the last visit (rpt_patient_activity.last_visit_provider_id). Visible only when report_by = last_visit. Legacy preselection is not documented by the vendor screenshots; 04 sets preferred_provider (first option) - confirm on the live tool. |
| PREFERRED PROVIDER | (no label) (picker) † | (empty) | `preferred_provider_ids` | entity_multi | - | `all` | replicated_enhanced | PREFERRED PROVIDER picker of mode Last Visit. Shared preferred_provider_ids (lookup:providers, all = no restriction; legacy pickers default to Include All, vendor article on the new reports). Its provider_role is switched by provider_basis on this report (preferred -> preferred provider; treating_provider -> last-visit provider): an extension of the shared definition that 04 must record. Not provider_ids, which 04 hides in this mode. Visible only when report_by = last_visit. Row label and default were not quoted by the vendor screenshots - confirm on the live tool. |
| LAST VISIT DATE RANGE | (no label) (date_input) † | (empty) | `last_visit_date` | date_range | - | `today` | replicated_enhanced | 04 shared vendor-doc parameter last_visit_date (value keys last_visit_date_from, last_visit_date_to, last_visit_date_preset): attribute range on the general last visit of the patient (rpt_patient_activity.last_visit_date, last visit-code charge; REPAIR(19) until patients.last_visit is maintained), inclusive, office-local dates; not the ortho last visit. Visible only when report_by = last_visit. Default today / today (date_preset today) per the cross-cutting legacy rule 'every date box defaults to the current day' (research 3.1) and the Provider Holidays capture of the same header - inferred, confirm on the live tool. Enhanced with presets and relative tokens. Default differs: The vendor capture of mode Last Visit shows the box empty; research section 3.1 states every date box of the Lists screens defaults to the current day. Interim today / today until the live tool shows otherwise. |
| OTHER OPTIONS | Include Patients with No Lastvisit date. (checkbox) † | **unchecked** | `include_patients_with_no_last_visit` | boolean | - | `false` | replicated | 04 shared vendor-doc parameter include_patients_with_no_last_visit: true = patients whose last_visit_date is NULL are added to the rows selected by last_visit_date; false = they are left out. Visible only when report_by = last_visit. Legacy default not documented: false (unticked, also the disabled value) is inferred from the research (reactivation users tick the box) - confirm on the live tool. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| REPORT BY = Last Visit | The criteria panel becomes: PATIENT STATUS; OFFICE/GROUP; a PREFERRED PROVIDER block with the radio Preferred Provider / Treating Provider; LAST VISIT DATE RANGE; INCLUDE PATIENT TYPE / EXCLUDE PATIENT TYPE; OTHER OPTIONS with the checkbox 'Include Patients with No Lastvisit date.'. The PROVIDER and SPECIALTY sections of the default mode are replaced and no longer shown. | report_by == last_visit: visible = patient_status, office_scope, provider_basis (radio Preferred Provider / Treating Provider), preferred_provider_ids (the PREFERRED PROVIDER picker, filtering the provider chosen by provider_basis), last_visit_date (last_visit_date_from / _to / _preset), include_patient_type_codes, exclude_patient_type_codes, include_patients_with_no_last_visit. Hidden: provider_ids and specialty_codes (visible_when report_by != last_visit, 04 shared rule); their values are replaced by the disabled_value all before hashing, so a value chosen in another mode never filters a Last Visit run. |
| REPORT BY = Attached to Provider (the default) | The panel shows PATIENT STATUS; OFFICE/GROUP; PROVIDER; INCLUDE PATIENT TYPE / EXCLUDE PATIENT TYPE; SPECIALTY - the state our screenshot captured, and a vendor screenshot shows the same set. PROVIDER and SPECIALTY belong to this mode (Last Visit replaces them). | report_by != last_visit (attached_to_provider is the default; the other 11 modes were not captured and keep this panel until read on the live tool): visible = patient_status, office_scope, provider_ids, include_patient_type_codes, exclude_patient_type_codes, specialty_codes. Hidden (visible_when report_by == last_visit): provider_basis, preferred_provider_ids, last_visit_date, include_patients_with_no_last_visit; their disabled values (preferred_provider, all, no range, false) add no predicate. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `provider_basis` | visible_when | report_by == last_visit | - | documented - Mode Last Visit (vendor screenshots). |
| `last_visit_date` | visible_when | report_by == last_visit | - | documented - Mode Last Visit (vendor screenshots). |
| `include_patients_with_no_last_visit` | visible_when | report_by == last_visit | - | documented - Mode Last Visit (vendor screenshots). |
| `provider_ids` | visible_when | report_by != last_visit | - | documented - Replaced by the PREFERRED PROVIDER block in mode Last Visit; the other 11 modes were not captured (treated as visible). |
| `specialty_codes` | visible_when | report_by != last_visit | - | documented - Replaced by the PREFERRED PROVIDER block in mode Last Visit; the other 11 modes were not captured (treated as visible). |
<!-- PARITY:patients_list_reports.r06:END -->

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
| PROVIDER `ALL` (default) / list | Default panel only: attached provider (`attached`, NEW role) `IN (:provider_ids)`; in mode Preferred Provider `rpt_patient_dim.preferred_provider_id IN (:provider_ids)` (the group key, so no selected-provider row prints under `(No Preferred Provider)`); hidden and `all` in mode Last Visit |
| INCLUDE PATIENT TYPE `ALL` (default) / list | Overlap with `patient_type_codes`; `no_type_defined` = untyped patients |
| EXCLUDE PATIENT TYPE `None` (default) / list | `NOT` overlap; untyped kept unless `no_type_defined`; footer `ExPatType :` |
| SPECIALTY `ALL` (default) / value | Default panel only: specialty of the provider resolved as for PROVIDER; `rpt_provider_dim.specialty` is free text, matched to the `specialties` codes through a NEW `rpt_value_map` domain `specialty` (owner 03); legacy single-select, list allowed; warning `provider_specialty_sparse` |
| PREFERRED PROVIDER radio `Preferred Provider` (Last Visit panel; default `preferred_provider` per 04) | `preferred_provider_ids` filters `rpt_patient_dim.preferred_provider_id` (no fallback) and the group key is that provider; `(No Preferred Provider)` band |
| PREFERRED PROVIDER radio `Treating Provider` (`provider_basis` option `treating_provider`, NEW: 04 section 3 to add, per-report option list) | `preferred_provider_ids` filters `rpt_patient_activity.last_visit_provider_id`; group key = last-visit provider |
| PREFERRED PROVIDER picker `ALL` / list | `all` = no predicate; list = predicate on the provider chosen by the radio |
| LAST VISIT DATE RANGE (Last Visit panel; default today / today [I], research 3.1 'every date box defaults to the current day'; legacy default of this mode not seen) | `rpt_patient_activity.last_visit_date BETWEEN :last_visit_date_from AND :last_visit_date_to`, inclusive; cleared = no predicate |
| `Include Patients with No Lastvisit date.` ticked | Patients with `last_visit_date IS NULL` added to the selected rows |
| `Include Patients with No Lastvisit date.` unticked (default `false` [I]) | Patients without a last visit left out |
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
| Office | home office [I]; Provider: `attached` (NEW role, default panel), `provider_basis` (Last Visit panel; `treating_provider` option NEW), `preferred_provider_id` only for filter and group key (mode Preferred Provider) |
| Repeating modes | Carrier, Employer, Insurance Plan (one row per active slot), Medical Alert (per active alert), Patient Type (per code): group counts = rows of the group, grand total = distinct patients (`Total Patients : n`) plus `Total Rows : n` |
| Uninsured | `NOT EXISTS (SELECT 1 FROM rpt_insurance_coverage c WHERE c.patient_id = p.patient_id)` (active slots only); medical-only coverage counts as insured [I] |
| Availability | Coverage 78a: **APP** for the default mode (no provider attached to migrated patients; history uses the derived last-visit provider, labelled `provider_derived_from_last_visit`); 78b Preferred Provider APP (migrated patients fall in `(No Preferred Provider)`); 78c Birthdate, Zip, Patient Type READY, Last Visit REPAIR(19) (DATA-19); 78d coverage modes READY on today's coverage, tiers on history REPAIR(32) (DATA-32); 78e Fee Schedule, HIPAA READY; 78f Medical Alert READY, class `clinical` |
| Data gaps | `specialty` is free text, blank on 96 of 97 migrated providers: `specialty_codes` matches through the NEW `rpt_value_map` domain `specialty` (owner 03, code -> free-text values); a SPECIALTY value selects almost nobody until providers are edited (availability `provider_specialty_sparse`) |

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
| `by_carrier` | `Carrier : {carrier_name}` (`aggregate`) | `employer_name` (employer of the insurance plan) text `phi_identified`, `group_number` text `phi_identified`, `coverage_label` (`Dental Primary` ...) enum `phi_identified` |
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
| 3 | Defaults of `provider_basis` (interim `preferred_provider`), `last_visit_date` (interim today / today, research 3.1) and `include_patients_with_no_last_visit` (interim `false`) |
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

<!-- PARITY:patients_list_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PLAN TYPE | (no label) (radio_group) | **Regular** / Ortho | `plan_type` | enum | Regular -> `regular`, Ortho -> `ortho` | `regular` | replicated | - |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: office of the contract (rpt_payment_plan_contracts.office_id; inferred - the sample prints one office in the header). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| PREFERRED PROVIDER | Preferred Provider (picker) | shown: ALL | `preferred_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Shared preferred_provider_ids: preferred provider of the patient (rpt_patient_dim.preferred_provider_id, no fallback; migrated patients carry none and match only all). Interim: the group key is the same provider (band 'Provider : <name> : <ShortID>', patients without one under (No Preferred Provider)), per the research inference that PREFERRED PROVIDER is both filter and grouping key. The 2021 Ortho sample header may instead be the contract provider (rpt_payment_plan_contracts.provider_id), offered as the enhancement contract_provider_ids - confirm on the live tool. ALL = no restriction. |
| PLAN SETUP DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = plan_setup_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PLAN SETUP DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = plan_setup_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| CREDIT CARD ON FILE | (no label) (dropdown) | shown: Both | `credit_card_on_file` | enum | - | `both` | unknown_legacy | Static dropdown captured collapsed: only the default Both is known. Expected options Both / Yes / No (inferred from the CC On File column YES / NO of the 2021 sample); candidate values both / yes / no on rpt_payment_plan_contracts.has_card_on_file. Expand the list on the live tool and record every option and its order. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r07:END -->

| Legacy option | Effect on the result |
|---|---|
| PLAN TYPE `Regular` (default) | `contract_kind = 'regular'` (`patient_payment_plans`); block `regular`, title `Patients on Regular Payment Plan` |
| PLAN TYPE `Ortho` | `contract_kind = 'ortho'` (`ortho_plans`); block `ortho` with the insurance columns, title `Patients on Ortho Payment Plan` |
| PRINT FORMAT `PDF` (default) / `Excel` | `pdf` / `xlsx` (`csv` added) |
| OFFICE/GROUP `Office` (default: working office) / `Office Group` + picker | `rpt_payment_plan_contracts.office_id IN (...)` [I]; groups per `patients_list_reports.r01.d01` |
| PREFERRED PROVIDER `ALL` (default) | No predicate |
| PREFERRED PROVIDER list | `rpt_patient_dim.preferred_provider_id IN (...)` (no fallback); the group key is the same provider, so every row prints under a selected provider (interim, open question 1) |
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
| `contract_provider_ids` | `entity_multi` NEW (`provider_role = contract`, 04) | `all` | Filters the contract provider (`rpt_payment_plan_contracts.provider_id`); with `group_by_contract_provider` (NEW `boolean`, default `false`) the bands use that provider |

Saved views: "Open ortho contracts" (`plan_type = ortho`, `plan_status = open`, `date_preset = all_dates`); "Plans without a card" (`credit_card_on_file = no`, `plan_status = open`).

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_payment_plan_contracts` (`contract_kind`, `contract_key`, `payment_plan_id`, `ortho_plan_id`, `patient_id`, `office_id`, `provider_id`, `setup_date`, `ins_setup_date`, `total_amount`, `pat_plan_amount`, `pat_periodic_amount`, `pat_payments_total`, `pat_payments_remaining`, `pat_amount_remaining`, `ins_plan_amount`, `ins_periodic_amount`, `ins_payments_total`, `ins_payments_remaining`, `ins_amount_remaining`, `has_card_on_file`, `is_active`); `rpt_contract_installments` (`due_date`, `is_billed`, enhancements); `rpt_patient_dim` (`chart_no`, names, `patient_type_codes`, `preferred_provider_id`); `rpt_patient_activity` (`last_visit_provider_id`); `rpt_provider_dim` (`last_name`, `first_name`, `title`, `short_id`); `rpt_office_dim` |
| Rows | `is_active` contracts (soft-deleted plans excluded, data_card 3.6) with `contract_kind = :plan_type` and `setup_date` in range |
| Date basis | `plan_setup_date` -> `setup_date` (fixed, no basis radio) |
| Office / provider | contract office [I]; filter and group key on `rpt_patient_dim.preferred_provider_id` with the `(No Preferred Provider)` band (research: PREFERRED PROVIDER is filter and grouping key [I]); the contract provider (`rpt_payment_plan_contracts.provider_id`, data_card 2.25) only through `contract_provider_ids` |
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
| group key `preferred_provider_id` + label `Provider : {last_name}, {first_name} {title} : {short_id}` (`(No Preferred Provider)` when NULL) | | `text` | `aggregate` + `alias` (rule 13 provider dimension): the band is a patient attribute and the amounts are patient contract amounts (`financial_patient`), not provider production or income - NEW exception to rule 3 for contract lists, owner `08_security_compliance.md`; without it `lists_patient` holders without `provider_comp` (front desk, treatment coordinator) would be refused | subtotal only with `show_provider_subtotals` |
| hidden: `contract_key` (`row_id_column`), `patient_id` (entity), `office_id` | | | | |

Block `regular`: the same columns without `type_code`, `ins_setup_date` and the five `ins_*` columns; `total_amount`
labelled `Total Plan Amt.`; count line `Total number of Patients on Regular Payment Plans : n` [I]. Count = contracts (grain
contract): a patient with two contracts set up in the range counts twice (legacy grain assumed, open question 6).

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
| Provider group header | `rows` of this report with `preferred_provider_ids = [provider]` (`contract_provider_ids` when `group_by_contract_provider`) |

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
| 1 | PREFERRED PROVIDER: patient's preferred provider (interim filter and group key) or the contract provider; does the `Provider :` band of the 2021 sample follow the filter? (header question 7) |
| 2 | Meaning and source of the `Ty` column (`P`) |
| 3 | CREDIT CARD ON FILE option list (captured collapsed) |
| 4 | Printed layout of the Regular variant (no sample) |
| 5 | Are inactive / paid-off contracts listed when their setup date is in range? |
| 6 | Count line: contracts or distinct patients (a patient with two contracts in range)? |
| 7 | 08 owner: adopt the contract-list exception to rule 3 (provider band `aggregate`, amounts `financial_patient`), or grant `provider_comp` to `lists_patient` holders |

## Online Registered Patients - `lists.online_registered_patients`

Lists › Patient/Resp. Party List, group `PATIENT LIST`, screenshot 8.PNG - P3 - S - `lists_patient`
(`reports_lists_patient_list_screen_view_only` / `..._full_control`) - interactive - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front office | Daily | Find online registrations still pending and import (approve) them into patient records before the visit |
| Operations / multi-office manager | Weekly, monthly | Adoption of online registration per office during a roll-out (vendor purpose `[P15][P16]`) |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose and the field `Active` documented `[P15][P16]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Online Registered Patients` (+ `(Summary)` / `(Detail)` [I]) | `title_templates` per format |
| Detail [I] | One row per registration: created date, patient name and contact data, office, `Active` | Same, plus status, new / existing and the imported patient |
| Summary [I] | Registrations per office, possibly split pending / imported | One row per office: registrations, active (pending), imported, declined / expired |
| `Active` `[P15]` | `TRUE` = registration still active, not yet imported; `FALSE` = imported. Raw `TRUE` / `FALSE` suggests an unformatted dataset | Kept literally: column `Active` prints `TRUE` / `FALSE` (legacy quirk kept for parity); a readable `Status` column is added |
| Totals | Not documented | `Total : n` per office band and grand total |
| Sign conventions | No money (an AppointNow deposit is not printed) | - |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REPORT TYPE | (no label) (radio_group) | **Summary** / Detail | `report_format` | enum | Summary -> `summary`, Detail -> `detail` | `summary` | replicated | REPORT TYPE with Summary / Detail is the report format spelled differently. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: office the online registration was addressed to (booking_requests office; vendor text: registrations per office). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| CREATED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = created_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| CREATED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = created_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); never changes rows |
| REPORT TYPE `Summary` (default) | `report_format = summary`: one row per office with counts by status |
| REPORT TYPE `Detail` | `report_format = detail`: one row per registration |
| OFFICE/GROUP `Office` (default working office) | `office_ids`: registrations addressed to these offices (`booking_requests.office_id`) |
| OFFICE/GROUP `Office Group` | `office_group_id(s)`: offices of the groups; no groups -> `all` within the caller's rights |
| CREATED DATE RANGE Start Date / End Date (default today / today) | `date_from` / `date_to` on the office-local date the registration was received (`booking_requests.created_at`, UTC -> office time zone), inclusive |
| Rule `patients_list_reports.r01.d01` | Office mode switch, as on every report of the family |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `registration_statuses` | `enum_multi` NEW: `pending`, `awaiting_payment`, `imported`, `approved_not_linked`, `declined`, `expired` | all ticked, `full_selection = no_predicate` | Daily view "pending only" (`pending`, `awaiting_payment`) |
| `registration_kind` | `enum` NEW: `all`, `new_patient`, `existing_patient` | `all` | On `booking_requests.is_new_patient`; adoption reporting usually wants `new_patient` |
| `summary_period` | `enum` NEW: `none`, `week`, `month` | `none` | Summary only: adds a period column inside each office (adoption trend over a roll-out); `none` = legacy one row per office |
| `compare_to` | shared comparison period (filter_card 12, P4) | `none` | Summary: prior-period registrations column per office |
| `include_contact_columns` | via column chooser (no parameter) | phone and e-mail visible | - |
| Saved view "Pending online registrations - last 7 days" | preset | - | `date_preset = custom`, `date_from = today-7d`, `date_to = today`, `registration_statuses = [pending, awaiting_payment]`, `report_format = detail` |

### Data

Availability **APP** (coverage matrix row 80): online registrations exist only since AppointNow went live in DentC; no
Denticon registration history was migrated (0 rows [A] `be_data_patients_clinical.md` §1.7). Registration source on the
patient record: **SCHEMA(44)** (DATA-44, P3: `patients.registration_source`, `registration_status`, `activated_at`).

| Dataset | Columns used |
|---|---|
| passthrough `booking_requests` (NEW registration as a dataset, owner 03, with DATA-44) | `id`, `tenant_id`, `office_id`, `created_at`, `status` (`pending`, `awaiting_payment`, `approved`, `declined`, `expired`), `first_name`, `last_name`, `phone`, `email`, `date_of_birth`, `is_new_patient`, `reason_label`, `slot_date`, `start_time`, `provider_name`, `patient_id`, `appointment_id`, `actioned_at`, `actioned_by`, `decline_reason`, `notes`, `insurance_info` |
| `rpt_patient_dim` | `patient_id`, `chart_no`, `registration_source`, `registration_status` (after DATA-44) - label of the imported patient |
| `rpt_office_dim`, `rpt_user_dim` | `office_name`, `timezone`; `user_label` of `actioned_by` |

| Derived column | Rule |
|---|---|
| `registration_status` | `pending` / `awaiting_payment` = stored status; `imported` = `approved` with `patient_id IS NOT NULL`; `approved_not_linked` = `approved` with `patient_id IS NULL` (approved, no patient record linked); `declined`, `expired` = stored status. The five derived values partition every stored row: `registration_count = active_count + imported_count + approved_not_linked_count + declined_expired_count` |
| `is_active` (legacy `Active`) | `true` when `registration_status IN ('pending','awaiting_payment')`, else `false` [I: legacy defines only pending vs imported] |
| `created_date` | `(created_at AT TIME ZONE 'UTC' AT TIME ZONE office.timezone)::date`; range predicate on the timestamp with per-office UTC bounds (data card 4.3) |

| Parameter | Becomes |
|---|---|
| `office_scope` | `b.office_id = ANY(:office_ids)` (office of the registration) |
| `date_range` | `b.created_at >= utc(:date_from) AND b.created_at < utc(:date_to + 1)` per office time zone |
| `registration_statuses`, `registration_kind` | `IN` list on the derived status; `b.is_new_patient = true / false` |
| `report_format` | block `summary_by_office` or `detail` |

| Topic | Rule |
|---|---|
| Date basis | `created_date` of the registration (fixed); reliable for every row (app era only) |
| Office attribution | office of the registration (`booking_requests.office_id`) |
| Caveat | `expired` is set lazily and by the cron `expire_booking_requests` (outside the repo [V]); until it runs, overdue requests still count as `pending` / Active `TRUE` - printed as an `availability[]` note `registration_expiry_lazy` |
| Caveat | DentC has no separate online registration form today: AppointNow requests are the registration source. Registrations from other channels (patient portal intake) enter once DATA-44 stores `registration_source` - then the dataset unions patients with `registration_source = 'online'` |

### Output

`report_format = detail` - block `detail` (main). Fixed outer `Office : <office_name>` when multi-office.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `created_date` | Created Date | date | `phi_identified` | - |
| `created_time` | Time | time (office tz), `default_visible: false` | `phi_identified` | - |
| `registrant_name` | Patient | text `Last, First` | `phi_identified` (key column) | `count` -> `Total : n` per office and grand total |
| `date_of_birth` | Birth Date | date | `phi_identified` | - |
| `phone` | Phone | text | `phi_identified` | - |
| `email` | E-mail | text | `phi_identified` | - |
| `patient_kind` | New / Existing | enum (`New`, `Existing`) | `phi_identified` | `count` of `New` |
| `reason_label` | Reason | text, `default_visible: false` | `phi_identified` | - |
| `requested_slot` | Requested Appt | datetime (office tz), `default_visible: false` | `phi_identified` | - |
| `registration_status` | Status | enum | `phi_identified` | - |
| `is_active` | Active | boolean, `format.labels {true: TRUE, false: FALSE}` | `phi_identified` | `count` of `TRUE` labelled `Active :` |
| `patient_id` | Pat ID | id (blank until imported) | `phi_identified` | - |
| `actioned_at` | Imported / Actioned | datetime, `default_visible: false` | `phi_identified` | - |
| `actioned_by_label` | By | text, `default_visible: false` | `aggregate` | - |
| `notes` | Notes | text, `default_visible: false`, export `pdf: false` | `clinical` (rule 4: patient-typed free text can be clinical) | - |
| `insurance_info` | Insurance | text, `default_visible: false` | `phi_sensitive` | - |
| `registration_id`, `office_id`, `appointment_id` | - | id, `hidden` | `phi_identified` / `aggregate` | `registration_id` = `row_id_column` |

Default sort: `created_at`, `last_name`, `first_name`, `registration_id` (legacy order unknown).

`report_format = summary` - block `summary_by_office` (main).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | text | `aggregate` | - |
| `period_label` | Period | text, `visible_when ["ne", "summary_period", "none"]` | `aggregate` | - |
| `registration_count` | Registrations | integer | `aggregate` | `sum`, grand total |
| `active_count` | Active (Pending) | integer | `aggregate` | `sum` |
| `imported_count` | Imported | integer | `aggregate` | `sum` |
| `approved_not_linked_count` | Approved, not linked | integer | `aggregate` | `sum` |
| `declined_expired_count` | Declined / Expired | integer | `aggregate` | `sum` |
| `import_rate` | Imported % | percent, `computed ratio(imported_count, registration_count)` | `aggregate` | `ratio` on the grand total |
| `prior_registration_count` | Prior Period | integer, `visible_when ["ne", "compare_to", "none"]` | `aggregate` | `sum` |

Summary cards: registrations, active, imported %. `reconciles_with`: Summary `registration_count` grand total =
`online_booking_requests` (metrics_card 5.10, basis created) for the same offices and range, with
`registration_kind = all` and every status (to confirm in 05 that the metric counts every status). Imported % is not
`online_booking_conversion_pct` (that one counts requests that became an appointment). Page break: `none`, `office`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (Summary) | Stacked bar per office: active / imported / declined-expired; with `summary_period` a line of registrations per period |
| Summary count cell | `kind: rows` - Detail of the same report with `office_ids` <- office, `registration_statuses` <- the clicked status column, period bounds as `date_from` / `date_to` |
| Registrant (pending) | `kind: record` the request in the AppointNow staff inbox (`booking_requests.id`), feature right of AppointNow (08) |
| Registrant (imported) | `kind: record` patient overview of `patient_id` (`assert_patient_visible`) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_request` | row | navigate | AppointNow feature right | Inbox at the request, where approve / decline / import happen (the report never writes) |
| `send_email` / `send_sms` | bulk | send_email / send_sms | correspondence features; `requires: sms_consent` for SMS | Reminder to finish a registration awaiting payment; e-mail is a link, no PHI attachment |
| `create_task` | row / bulk | create_task | task feature | "Call registrant" for pending rows older than a day |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

Detail with `registration_statuses = [pending, awaiting_payment]` is the daily import queue; the inbox remains the place
where the work is done.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (Detail 9 visible columns), header office or organisation name + title; footer echo `From :`, `Thru :`, `Offices :`, `Report Type :`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet per format; `Active` written as a boolean cell with the `TRUE` / `FALSE` display; no merged cells |
| CSV | Main block; formula guard (registrant-typed names and notes are untrusted input) |
| Background | Not needed; `escalate_when` office group or `all` over more than 366 days |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Detail columns and Summary layout (split pending / imported?) - INFERRED | Live legacy run of both formats |
| 2 | Does the legacy list include existing patients who re-registered, and declined / expired registrations? | Live legacy tool |
| 3 | `Active` of a declined or expired registration: FALSE or not listed? | Live legacy tool |
| 4 | Product: is AppointNow the intended DentC counterpart of Denticon Online Patient Registration, or should a patient-portal intake form (Pat Reg / Medical Info Forms, PD-15) feed it? | Product owner; DATA-44 owner |

## Responsible Party List - `lists.responsible_party_list`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 10.PNG (mode Created Date) - P3 - L -
`lists_responsible_party` (`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - interactive
(background for office group / `all` in the balance modes) - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing | Before each statement run | Mode Send Statement Status = No: which accounts will get no statement and why (documented use `[P20]`) |
| Billing / collections | Month end | Modes Balance and Balance Aged Over X Days: which accounts owe, and which are overdue past 30 / 60 / 90 / 120 days (the vendor points to the Aging reports for full A/R) |
| Office manager | On demand | Mode Created Date: new guarantor accounts in a period; modes Resp. Party Type and Zip: account mix by billing type and area (mailings) |

### Legacy output

Confidence PARTIALLY DOCUMENTED: the six `REPORT BY` values and their purposes `[P19]`, two modes' criteria
`[P19·img][P20·img]`; no layout seen. Each mode replaces one legacy report:

| `report_by` | Legacy report replaced `[P19·img]` | Documented purpose | Output [I] (basis: variants; Dentrix Enterprise Collections Manager List) |
|---|---|---|---|
| `balance` | Responsible Party List by Balance | Which accounts have a balance | Account rows with balance; count and balance total |
| `balance_aged_over_x_days` | Responsible Party List Over [30/60/90/120] days | Accounts overdue in the selected ageing period | Account rows with balance and the aged amount; totals |
| `created_date` (default) | Responsible Party List | Number of responsible-party accounts | Account rows with contact data, type, created date, send-statement flag; count |
| `resp_party_type` | Responsible Party by Billing Type | Accounts by type | Grouped by type with a count per group |
| `send_statement_status` | Responsible Party-Send Statement Status | Accounts eligible / ineligible for a statement | Account rows with the flag; count |
| `zip` | Responsible Party Zip Code | Accounts by zip code | Grouped by zip with a count per group |

| Item | Rule |
|---|---|
| Printed title | [I] `Responsible Party List - <mode label>` (`title_templates` per `report_by`), header line 1 office or organisation name |
| Columns [I] | Responsible-party ID, name, address, phones, e-mail, type, created date, send-statement flag, balance (aged amount in the aged mode) |
| Sign convention | Balance positive = owed by the account, negative = credit (PD-2); canonical ledger balance, not the six legacy formulas |
| Quirks | "Inactive account" = every patient of the account inactive; the aged mode filters on the created date as well as on the aged balance - seen only on an older 2021 build screen (the supplement did not add it; the current Balance Aged Over X Days panel was never seen), kept as inferred (open question 1). `Responsible Party List - Email` has no named successor (supplement unresolved) - not reproduced, covered by the e-mail column and `has_email` enhancement |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r09:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REPORT BY | (no label) (dropdown) | Balance † / Balance Aged Over X Days † / Resp. Party Type † / Send Statement Status † / Zip † (shown: Created Date) | `report_by` | enum | Balance -> `balance`, Balance Aged Over X Days -> `balance_aged_over_x_days`, Created Date -> `created_date`, Resp. Party Type -> `resp_party_type`, Send Statement Status -> `send_statement_status`, Zip -> `zip` | `created_date` | replicated | Six values from vendor documentation, not from our capture: re-check on the live tool. Send Statement Status and Balance Aged Over X Days swap criteria. Differs from the shared mapping: REPORT BY list of Responsible Party List is known from vendor documentation; the signature itself stays unknown_legacy. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: home office of the guarantor account (rpt_account_dim.home_office_id; data_card 5.1, home office for A/R and statements, PD-4 home-office variant). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| CREATED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed basis created date of the guarantor account (rpt_account_dim.created_at_utc as office-local date). Applies in every report_by mode except send_statement_status. That it also applies in mode balance_aged_over_x_days rests on an older (2021) build screen; the current aged panel was never seen - inferred, confirm on the live tool. Migrated accounts carry the back-fill time: REPAIR(10). Default today in the office time zone. |
| CREATED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end, fixed basis account created date; hidden when report_by = send_statement_status. Default today in the office time zone. |
| EXCLUDE RESPONSIBLE PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. |
| OTHER OPTIONS | Include Inactive Accounts (All patients inactive in account) (checkbox) | **unchecked** | `include_inactive_accounts` | boolean | - | `false` | replicated | Inactive account = an account in which every member patient is inactive (rpt_account_dim.active_member_count = 0). false (legacy default, unticked) = such accounts are left out; true = they are listed too. Not the patient-level include_inactive_patients. |
| SEND STATEMENT STATUS | (no label) (dropdown) † | Yes / No | `send_statement_status` | enum | Yes -> `yes`, No -> `no` | `yes` | replicated | 04 shared vendor-doc parameter send_statement_status: yes = accounts flagged to receive statements (rpt_account_dim.send_statements true), no = accounts not flagged (documented use: list before a statement run the accounts that will get no statement). Visible and required only when report_by = send_statement_status, where it replaces the created date range. Default yes (first option) - INFERRED, confirm on the live tool. Default differs: A legacy dropdown always shows one value; the default is not documented. yes (first option) is preselected - INFERRED, confirm on the live tool. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| REPORT BY = Send Statement Status | The CREATED DATE RANGE section is replaced by a SEND STATEMENT STATUS dropdown (Yes / No); EXCLUDE RESPONSIBLE PARTY TYPE and the inactive-accounts checkbox (Include Inactive Accounts (All patients inactive in account)) stay. | report_by == send_statement_status: send_statement_status becomes visible and required (required_when report_by == send_statement_status); date_range is hidden (visible_when report_by != send_statement_status, 04 shared rule) and no created-date predicate is applied; exclude_resp_party_type_codes and include_inactive_accounts stay visible. In every other mode send_statement_status is hidden and adds no predicate. report_by == balance_aged_over_x_days additionally shows aged_balance (aged_balance_from / _to, default 1.00 / 999999.99) and aging_days (04 shared vendor-doc parameters; no control of our capture, specified in the report section). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `send_statement_status` | visible_when | report_by == send_statement_status | - | documented |
| `date_range` | visible_when | report_by != send_statement_status | - | documented - The date range is replaced by SEND STATEMENT STATUS in that mode. |
| `aged_balance` | visible_when | report_by == balance_aged_over_x_days | - | documented |
| `aging_days` | visible_when | report_by == balance_aged_over_x_days | - | documented |
<!-- PARITY:patients_list_reports.r09:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| REPORT BY `Created Date` (default) | `report_by = created_date`: accounts created in the range; flat list; title `... - Created Date` |
| REPORT BY `Balance` | `report_by = balance`: accounts whose current balance is not 0.00 [I], balance column and total; created range still applies (default-panel rule) |
| REPORT BY `Balance Aged Over X Days` | `report_by = balance_aged_over_x_days`: shows `aged_balance` and `aging_days`; accounts whose amount older than `aging_days` lies in the aged-balance range; created range applies [I] (older 2021 build screen; current panel not seen) |
| REPORT BY `Resp. Party Type` | `report_by = resp_party_type`: same population as Created Date, grouped by `resp_party_type` with group counts |
| REPORT BY `Send Statement Status` | `report_by = send_statement_status`: created range hidden, `send_statement_status` shown and required; accounts filtered on `send_statements` |
| REPORT BY `Zip` | `report_by = zip`: population as Created Date, grouped by the guarantor zip with group counts |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on `rpt_account_dim.home_office_id` (account home office) |
| CREATED DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on the office-local account created date, inclusive; hidden in mode Send Statement Status |
| EXCLUDE RESPONSIBLE PARTY TYPE (default `None`) | `exclude_resp_party_type_codes`: accounts whose type is in the list are dropped; `none` = nothing. An account without a stored type counts as `No Type Defined` (legacy: every account has exactly one, mandatory type, supplement correction `patients_list_reports.r09.s05.c01`): it is dropped only when `no_type_defined` is in the list (until DATA-53 every self-guarantor account is untyped) |
| OTHER OPTIONS `Include Inactive Accounts (All patients inactive in account)` (default unticked) | `include_inactive_accounts = false`: accounts with `active_member_count = 0` left out; ticked: listed too |
| SEND STATEMENT STATUS `Yes` / `No` (VENDOR-DOC; default `yes`, first option preselected - INFERRED, open question 3) | `send_statements = true` / `false`; required in its mode, so CLEAR CRITERIA restores `yes` and the mode stays runnable |
| Aged Balance range Start `1.00` / End `999999.99` (older 2021 build screen; not added by the supplement - inferred, 04 owner; open question 1) | `aged_balance_from` / `aged_balance_to` on the aged amount, inclusive |
| Days `30` / `60` / `90` / `120` (older 2021 build screen; not added by the supplement - inferred, 04 owner; default not documented, candidate `30`) | `aging_days`: the age threshold of the aged amount |
| Rule `patients_list_reports.r09.d01` | `report_by = send_statement_status` -> `send_statement_status` visible + required, `date_range` hidden and no created predicate; `exclude_resp_party_type_codes` and `include_inactive_accounts` stay. `report_by = balance_aged_over_x_days` -> `aged_balance` and `aging_days` visible. Hidden parameters take their `disabled_value` (default) before hashing |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` (the favorite stores `report_by`) |

Modes Balance, Resp. Party Type and Zip were never captured: they keep the default panel (created range, exclude type,
inactive checkbox) until read on the live tool (header shared rule; 04 section 9.2).

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `include_account_balance` | `boolean` NEW | `false` | Adds the balance column (and its total) in the modes without one (`created_date`, `resp_party_type`, `send_statement_status`, `zip`); `role: query` (joins `rpt_ar_open_items`) |
| `include_balance_split` | `boolean` NEW | `false` | Balance modes: adds `Est. Ins.` / `Est. Pat.` from `open_insurance_est` / `open_patient` |
| `sort_by` | `enum` (shared, values of sig0191) | `responsible_party_last_name` | `responsible_party_last_name`, `responsible_party_id` (`resp_party_id` = `coalesce(a.legacy_key, a.account_no)`); NEW `balance_desc` in the balance modes |
| `has_email` | `enum` NEW: `all`, `with_email`, `without_email` | `all` | Successor of the old `Responsible Party List - Email`; e-statement enrolment work |
| `no_email_statement` filter | `enum` NEW: `all`, `yes`, `no` | `all` | Mode Send Statement Status: split "no paper" and "no e-mail" statement flags (`no_email_statement`) |
| `exclude_sent_to_collection` | `boolean` (shared, 3.4) | `false` | Drops accounts flagged sent to collection (balance modes, before a reminder campaign) |
| `responsible_party_name` | `text_range` (shared, 3.4) | `AAAAA` / `ZZZZZ` | Alphabetical batch (mailing in halves); open bounds add no predicate |
| `all_dates` preset | `date_preset` NEW value (owner 04) | - | Removes the created-date predicate in the modes that keep the range (Balance on all accounts, not only today's) |
| Saved views | preset | - | "No statement - check before run": `report_by = send_statement_status`, `send_statement_status = no`; "Over 90 with balance > 50": `report_by = balance_aged_over_x_days`, `aging_days = 90`, `aged_balance_from = 50.00`, `date_preset = all_dates` |
| `compare_to` | not offered | - | Current-state list; no prior period exists |

### Data

Availability by mode (coverage matrix rows 82a-82d): `created_date` **REPAIR(10)** - migrated accounts carry the backfill
time as `created_at` until DATA-10 restores the legacy created date (if the export holds it; otherwise APP for history);
`balance`, `balance_aged_over_x_days` **READY** (derived ageing, DATA-07 P0, DATA-20 P1, DATA-27 P2 tenant-wide);
`resp_party_type` **SCHEMA(53)** (DATA-53, P1: `accounts.resp_party_type`; also blocks EXCLUDE RESPONSIBLE PARTY TYPE on
self-guarantor accounts); `send_statement_status`, `zip` **READY**.

| Dataset | Columns used |
|---|---|
| `rpt_account_dim` | `account_id`, `legacy_key` (Denticon `RPID` on migrated accounts, data_card 2.x `rpt_account_dim`), `account_no`, `home_office_id`, `guarantor_last_name`, `guarantor_first_name`, address (line 1, city, state, zip), phones, NEW `guarantor_email`, NEW `guarantor_zip5` (owner 03, RPT-PLIST-48), `resp_party_type`, `send_statements`, `no_email_statement`, `send_collections`, `member_count`, `active_member_count`, `is_active`, `merged_into_account_id`, `created_at_utc`, `last_statement_date` |
| `rpt_ar_open_items(p_tenant_id, p_account_ids, p_as_of = local_today, p_unit = 'account')` | `account_id`, `item_kind`, `open_amount`, `open_insurance_est`, `open_patient`, `age_days`, `split_quality` |
| `rpt_aging_bucket_sets` | the `legacy` set (edges of 30 / 60 / 90 / 120, data card 2.14) for the aged threshold |
| `rpt_office_dim` | `office_name`, `timezone`, `local_today` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `a.home_office_id = ANY(:office_ids)` (account home office, 03 section 5.1) |
| `date_range` (all modes but `send_statement_status`) | `a.created_at_utc` within per-office UTC bounds of `date_from` / `date_to` (home-office time zone) |
| `exclude_resp_party_type_codes` | `coalesce(a.resp_party_type, 'no_type_defined') <> ALL(:codes)` (NULL type = `No Type Defined`, kept unless `no_type_defined` is excluded) |
| `include_inactive_accounts` | `false`: `a.active_member_count > 0` |
| always | `a.merged_into_account_id IS NULL` (a merged source account is a DentC artefact with no legacy counterpart [I]) |
| `send_statement_status` | `a.send_statements = (:value = 'yes')` |
| `report_by = balance` | `balance = Σ open_amount` (both item kinds; equals the account ledger balance, R-05) `<> 0` [I] |
| `report_by = balance_aged_over_x_days` | `aged_amount = Σ open_amount` of debit items with `age_days > :aging_days` (bucket edge of the legacy set; credits are never inside a bucket); `aged_amount BETWEEN :aged_balance_from AND :aged_balance_to` |
| `report_by = resp_party_type` / `zip` | group level on `resp_party_type` / `guarantor_zip5` |

| Topic | Rule |
|---|---|
| Date basis | `created_date` of the account (fixed); none in mode Send Statement Status |
| Balance as of | Office-local today of the home office; `rpt_ar_open_items` per account set of the page of offices (one call per scope, not per row) |
| Office attribution | account home office; balances are consolidated across offices (home-office unit, PD-4) |
| Migrated history | Created date unreliable before DATA-10 (`availability[]` `account_created_date_migrated`, printed when the range touches migrated accounts); resp. party type empty on self-guarantor accounts before DATA-53 (`resp_party_type_missing`); balances valid for both eras subject to ledger completeness |

### Output

One block `accounts` (main) for every mode; columns switch with `visible_when` on `report_by`. Fixed outer
`Office : <office_name>` when multi-office (home office).

| key | label | type | data_class | total / subtotal rule | visible in |
|---|---|---|---|---|---|
| `resp_party_id` | Resp. Party ID | text: `coalesce(a.legacy_key, a.account_no)` (legacy RPID on migrated accounts) | `phi_identified` | - | all |
| `responsible_party_name` | Responsible Party | text `Last, First` | `phi_identified` (key column) | `count` -> `Total Accounts : n` | all |
| `address` | Address | text (line 1, city, state) | `phi_identified` | - | all |
| `zip` | Zip | text | `phi_identified` | - | all |
| `phone` | Phone | text (home, else cell) | `phi_identified` | - | all |
| `email` | E-mail | text | `phi_identified` | - | all |
| `resp_party_type` | Type | text (definition label) | `phi_identified` | - | all |
| `created_date` | Created | date | `phi_identified` | - | all but `send_statement_status` (default hidden there) |
| `send_statements` | Send Stmt | boolean (`Yes` / `No`) | `phi_identified` | `count` of `No` in mode `send_statement_status` | all |
| `no_email_statement` | No E-mail Stmt | boolean, `default_visible: false` | `phi_identified` | - | all |
| `member_count` / `active_member_count` | Patients / Active | integer, `default_visible: false` | `phi_identified` | - | all |
| `balance` | Balance | money | `financial_patient` | `sum`; subtotal per group | `balance`, `balance_aged_over_x_days`; others when `include_account_balance` |
| `aged_amount` | Over `{aging_days}` Days | money | `financial_patient` | `sum` | `balance_aged_over_x_days` |
| `est_insurance` / `est_patient` | Est. Ins. / Est. Pat. | money | `financial_patient` | `sum` | balance modes with `include_balance_split` |
| `last_statement_date` | Last Stmt | date, `default_visible: false` | `phi_identified` | - | all (NULL until DATA-22) |
| `account_id`, `home_office_id` | - | id, `hidden` | `phi_identified` / `aggregate` | `account_id` = `row_id_column` | all |

| Mode | Group levels and subtotals | Default sort |
|---|---|---|
| `created_date`, `send_statement_status` | none (office band only) | `responsible_party_last_name` (last, first, `resp_party_id`, `account_id`) |
| `balance`, `balance_aged_over_x_days` | none; grand total of `balance` (and `aged_amount`) | as above; `balance_desc` offered |
| `resp_party_type` | level `resp_party_type`, header `Type : {resp_party_type_label}` (label class `aggregate` + `allow`, NEW dimension declaration in 05 section 1.5), subtotal count (+ balance when shown) | type label, then name |
| `zip` | level `guarantor_zip5`, header `Zip : {zip}` (group key `phi_identified` + `deny`, rule 13), subtotal count | zip, then name |

Page break: `none` (default), `group` (modes with a group level), `office`. Summary cards: accounts; total balance and
aged amount in the balance modes. `reconciles_with` (tests): mode `balance` with `date_preset = all_dates`,
`include_inactive_accounts = true` and `office_scope = all`: Σ `balance` = `total_ar` (as of today, home-office
attribution); mode `balance_aged_over_x_days` with `aging_days = 90`, `aged_balance` open: Σ `aged_amount` =
`ar_over_90_amount` (same bucket set).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Mode `resp_party_type`: bar of accounts (and balance) per type; mode `zip`: top 20 zips by accounts (labels follow rule 13); other modes none - a list |
| Balance cell | `kind: report` `ledger.ledger_report` with `account_id` <- row, `report_type` <- literal `account_ledger`, `date_preset` <- literal `all_dates` (the target defaults to today / today) |
| Aged amount cell | `kind: report` `monthly.aging_report_by_home_office` with `responsible_party_name_from` / `_to` <- row name, `report_date` <- today, `aging_buckets` <- buckets above `aging_days` |
| Group subtotal (type, zip) | `kind: rows` - same report filtered to the group (`exclude_resp_party_type_codes` cannot express an include, so the target receives a NEW hidden `include_resp_party_type_codes` / `zip_codes` through `param_map`) |
| Responsible party name | `kind: record` guarantor account screen (route `patient_ledger` of the guarantor patient, ledger feature right of 08) to correct the address, type or Send Statements flag |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_account` | row | navigate | ledger feature right | Account ledger / guarantor edit |
| `letters` / `labels` / `postcards` | bulk | letters / labels / postcards | letters feature (`patient_letters_generate`), PD-15 | Mailing to guarantors (zip mode), balance letters (balance modes); guarantor patients with `no_correspondence` excluded with a count |
| `send_sms` | bulk | send_sms | SMS feature; `requires: sms_consent` | Balance reminder (balance modes) |
| `print_statements_for_selection` | bulk | navigate to `statements.statement_run` with NEW `account_ids` = selection | statements family Full Control | Balance modes, mid-cycle statements |
| `create_task` | row / bulk | create_task | task feature | "Billing follow-up"; mode Send Statement Status = No: "Review statement flag" |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

Mode `send_statement_status` = `no` doubles as a pre-run checklist; mode `balance_aged_over_x_days` as a collections
call list (the follow-up state lives in `worklists.patient_ar`, 06).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (up to 11 columns), header office / organisation name + mode title; footer echo `Report By :`, `From :` / `Thru :` (not in mode Send Statement Status), `Send Statement Status :`, `ExRespType :` [I label], `Aged Over : n days`, `Aged Balance : a - b`, `* Excludes Inactive Accounts` when unticked, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet per run with the visible columns; group key written as a column (`Type`, `Zip`) on every row instead of band rows; `outline_groups` for the group levels; money as numeric cells |
| CSV | Main block, guard on |
| Background | Balance modes for an office group or `all` (`escalate_when`), and any mode with `all_dates` over more than 20,000 accounts |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Criteria panels of modes Balance, Resp. Party Type, Zip and today's Balance Aged Over X Days: section titles, labels, defaults (`aged_balance` 1.00 / 999999.99 and `aging_days` 30 / 60 / 90 / 120 come only from an older 2021 build screen) and whether the created range stays in the aged panel | Live legacy tool, each mode |
| 2 | Mode Balance: non-zero, positive only, or a balance range? Are credit balances listed? | Live legacy run with a credit account |
| 3 | Defaults of SEND STATEMENT STATUS and of the days selector; aged threshold `> 30` or `>= 30` days | Live legacy tool |
| 4 | Printed columns and grouping of every mode (INFERRED); exact footer label of the excluded types | Live legacy PDF |
| 5 | Is `Responsible Party List - Email` gone or folded into a mode? | Live legacy menu |
| 6 | Are merged-away accounts (`merged_into_account_id`) ever wanted on this list? | Product owner |

## Responsible Party - Sent to Collection - `lists.responsible_party_sent_to_collection`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 11.PNG - P3 - S - `lists_responsible_party`
(`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - interactive (background for an office group or `all`) - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing / collections | Monthly | Reconcile DentC's flagged accounts with the agency's placement list; follow balances still on the books |
| Office manager | Month end | Size of the book at collection, per agency |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P19]`; the flag `Send to Collection` and the field `Collection Agency` of the
responsible party `[P23][P24]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Responsible Party - Sent to Collection` | same |
| Columns [I] (basis: fields; Dentrix Enterprise Collections Manager List) | Responsible-party ID, name, phone, collection agency, account balance (possibly aged), last payment | Same, ageing buckets optional |
| Totals [I] | Count and balance total | `Total Accounts : n`, balance total |
| Data facts | The flag has no date; the vendor recommends a zero-fee `Z` code on the ledger as the hand-over marker and ticking `No Correspondence`; the balance stays on the account and in ageing / statements unless excluded | No date before DATA-35; a Z-code marker date is offered as an enhancement |
| Sign convention | Balance positive = owed; the default lower bound 0.00 is treated as a real bound [I], so credit balances are not listed by default | parity note of `r10.s03.c01`; open question |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r10:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: home office of the guarantor account (rpt_account_dim.home_office_id). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| ACCOUNT BALANCE RANGE | Start (number_input) | shown: 0.00 | `account_balance_from` | number_range | - | `0.00` | replicated | Lower bound, inclusive, on the current account balance of the canonical ledger layer (PD-2, PD-4: rpt_ar_open_items unit account). Population = accounts with rpt_account_dim.send_collections true. Inferred: 0.00 is a real bound, so credit-balance accounts are not listed by the default run (unlike the age range, no open-bound rule is documented) - confirm on the live tool. |
| ACCOUNT BALANCE RANGE | End (number_input) | shown: 999999.99 | `account_balance_to` | number_range | - | `999999.99` | replicated | Upper bound, inclusive, on the current account balance. Inferred: 999999.99 is the practical open bound. Confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r10:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on `rpt_account_dim.home_office_id` |
| ACCOUNT BALANCE RANGE Start (default `0.00`) | `account_balance_from`: balance `>=` bound, inclusive; real bound [I] - negative balances excluded |
| ACCOUNT BALANCE RANGE End (default `999999.99`) | `account_balance_to`: balance `<=` bound; practical open bound [I] |
| (population, no control) | Accounts with `send_collections = true` |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

No date criterion: the list is current state. Number boxes accept negative values (`validation.min = -999999.99`) so a
user can list credit balances of collection accounts.

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `collection_agency_ids` | `entity_multi` NEW (`lookup:collection_agencies` NEW source, owner 04) | `all` | Per-agency reconciliation |
| `group_by` | `enum` (shared key) NEW value `collection_agency` | `none` | Group level per agency with count and balance subtotal |
| `sent_to_collections_date` | `date_range` NEW (secondary range) | blank (no restriction) | Accounts placed in a period; needs DATA-35 (`sent_to_collections_at`), else greyed with the reason |
| `include_inactive_accounts` | `boolean` (family key) | `true` [I] | Collection accounts are usually inactive; `false` drops accounts without an active patient |
| `include_aging` | `boolean` NEW | `false` | Adds `Current`, `31-60`, `61-90`, `91-120`, `Over 120` columns (legacy bucket set) |
| `marker_code_group` | via setup: code group `collection_marker` NEW in `rpt_code_groups` (owner 03) | - | Column `Marker Date` = first charge with a code of that group (the vendor's Z-code hand-over marker) |
| Saved view "Credit balances at collection" | preset | - | `account_balance_from = -999999.99`, `account_balance_to = -0.01` (refund due before closing with the agency) |

### Data

Availability **READY** (coverage matrix row 84); date sent **SCHEMA(35)** (DATA-35, P2: `accounts.sent_to_collections_at`,
`balance_status_code`). Datasets: `rpt_account_dim`, `rpt_ar_open_items()` (unit `account`), `rpt_payments`,
`rpt_charges` (marker), passthrough `collection_agencies` (NEW registration, catalog passthrough as DATA-45 does for list
catalogs: `id`, `name`, `phone`, `city`, `state`).

| Dataset | Columns used |
|---|---|
| `rpt_account_dim` | `account_id`, `legacy_key`, `account_no`, `home_office_id`, `guarantor_last_name`, `guarantor_first_name`, phones, address, `send_collections`, `collection_agency_id`, `active_member_count`, `merged_into_account_id`, `sent_to_collections_at`, `balance_status_code` |
| `rpt_ar_open_items(p_unit = 'account', p_as_of = local_today)` | `account_id`, `open_amount`, `item_kind`, `age_days` |
| `rpt_payments` | `account_id`, `payer`, `amount`, `transaction_date`, `txn_class` (`collection_agency_payment`) - last patient-side payment date and amount, agency payments since placement |
| `rpt_charges` | `account_id`, `procedure_code`, `service_date` - marker date via `rpt_code_in_group(tenant_id, 'collection_marker', code, date)` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `a.home_office_id = ANY(:office_ids)` |
| population | `a.send_collections AND a.merged_into_account_id IS NULL` |
| `account_balance_from` / `_to` | `balance BETWEEN :from AND :to`, `balance = Σ open_amount` per account (R-05) |
| `collection_agency_ids` | `a.collection_agency_id = ANY(:ids)` |
| `sent_to_collections_date` | `a.sent_to_collections_at` office-local date in range (DATA-35) |

| Topic | Rule |
|---|---|
| Date basis | none (`scope.date_basis = null`); balance as of the home office's today |
| Office attribution | account home office; balance consolidated across offices |
| Migrated history | The flag and agency were migrated with the responsible party (current state); when an account was placed is unknowable for history - DATA-35 stamps it from the first edit after the column exists (`availability[]` `collection_date_unknown`) |

### Output

Block `accounts` (main). Fixed outer office band when multi-office; optional agency level.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | `phi_identified` | - |
| `responsible_party_name` | Responsible Party | text | `phi_identified` (key column) | `count` -> `Total Accounts : n` |
| `phone` | Phone | text | `phi_identified` | - |
| `address` | Address | text, `default_visible: false` | `phi_identified` | - |
| `collection_agency_name` | Collection Agency | text | `phi_identified` (on an account row) | group label `aggregate` when grouped |
| `balance` | Balance | money | `financial_patient` | `sum` (agency subtotal, office subtotal, grand total) |
| `aging_current` ... `aging_over_120` | Current / 31-60 / 61-90 / 91-120 / Over 120 | money, `visible_when ["truthy", "include_aging"]` | `financial_patient` | `sum` |
| `last_payment_date` | Last Payment | date | `phi_identified` | - |
| `last_payment_amount` | Amount | money, `default_visible: false` | `financial_patient` | - |
| `agency_payments_since` | Agency Pmts | money, `default_visible: false` (needs DATA-35) | `financial_patient` | `sum` |
| `sent_to_collections_date` | Sent On | date (blank before DATA-35) | `phi_identified` | - |
| `marker_date` | Marker Date | date, `default_visible: false` | `phi_identified` | - |
| `account_id` | - | id, `hidden`, `row_id_column` | `phi_identified` | - |

Default sort: responsible-party last name, first name, `resp_party_id`, `account_id` [I]; `sort_by` enhancement values
`responsible_party_last_name`, `responsible_party_id`, `balance_desc`. Page break `none`, `group` (agency), `office`.
Summary cards: accounts, total balance, accounts with a payment in the last 90 days. No metric key covers collection
placements (metrics_card); figures described here only.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | With `group_by = collection_agency`: bar of balance per agency; otherwise none - a list |
| Balance cell | `kind: report` `ledger.ledger_report` (`account_id` <- row, `report_type` <- `account_ledger`, `date_preset` <- literal `all_dates`) |
| Last payment | `kind: report` `ledger.ledger_report` with `date_from` / `date_to` <- `last_payment_date` |
| Agency subtotal | `kind: rows` - same report with `collection_agency_ids` <- group key |
| Name | `kind: record` guarantor account screen (ledger feature right) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `export_for_agency` | bulk | export_selection | `reports_export_data_files` | CSV / XLSX with account no, name, address, phone, balance, last payment - the agency placement file |
| `letters` | bulk | letters | letters feature, PD-15 | Final notice / placement letter (ignores `no_correspondence` only if the letter feature allows legal notices - decided there) |
| `create_task` | row / bulk | create_task | task feature | "Agency follow-up" |
| `open_account` | row | navigate | ledger feature right | Clear the flag or change agency on the account screen (the report never writes) |

Doubles as the monthly agency reconciliation worklist via tasks.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (landscape when `include_aging`); header office / organisation + title; footer echo `Offices :`, `Account Balance : <from> - <to>`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet; agency as a column on each row; money numeric |
| CSV | Main block; the agency export shape is a named `export_shapes[]` entry `agency_placement` |
| Background | `interactive`; `escalate_when` office group or `all` -> `background` (one `rpt_ar_open_items()` balance per flagged account, as the RP List balance modes) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Are 0.00 / 999999.99 real bounds (credit balances excluded) or open bounds? (family open question 10) | Live legacy run with a credit-balance account flagged |
| 2 | Printed columns (agency, last payment, ageing?) - INFERRED | Live legacy PDF |
| 3 | Are accounts with only inactive patients listed? | Live legacy run |
| 4 | Product: should flagging an account post the Z-code marker automatically once DATA-35 stores the date? | Product owner |

## Responsible Party - Statements Sent - `lists.responsible_party_statements_sent`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 12.PNG - P3 - S - `lists_responsible_party`
(`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - instant - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing | After each statement run | Confirm which accounts received a statement of that statement date, per channel |
| Billing / front desk | When a payer says no statement arrived | Check the account, the channel, the address used and the balance stated |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P21]`; statement formats `[P22·img]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Responsible Party - Statements Sent` | same; `title_templates` adds ` - Paper` / ` - Email` / ` - Both` [I] |
| Columns [I] | Responsible-party ID, name, mailing address or e-mail, statement date, channel, statement balance | Same |
| Totals [I] | Count of statements and total balance | `Total Statements : n`, total of `Statement Balance` |
| Related legacy outputs | Statement Setup buttons `PRINT STATEMENT SENT`, `EMAIL STATEMENT SENT REPORT`, `EMAIL STATEMENT ERROR REPORT`; the old `Email Statement Sent Report` is probably this report with `Email` [I] | Statement Setup buttons link here and to `lists.responsible_party_email_statement_error_report` |
| Sign convention | Statement balance positive = owed, negative = credit | `closing_balance` of the frozen statement row, never recomputed |
| Quirk | `Email` and `Both` greyed in the only capture (presumably offices without e-statements) | Kept enabled until the live rule is read (parity note); candidate rule below |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r11:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| STATEMENT TYPE | (no label) (radio_group) | **Paper** / Email / Both | `statement_type` | enum | Paper -> `paper`, Email -> `email`, Both -> `both` | `paper` | replicated | Option rules: email enabled when unknown; both enabled when unknown. Delivery channel: paper = patient_statements.delivery_method print, or NULL with delivery_status generated (generated, not yet marked) - inferred; email = delivery_method email and not failed; both = no channel restriction (download rows appear only here). Whether downloaded portal statements count as Paper is not documented - confirm. Email and Both are greyed in the only capture; 04 9.4 keeps them enabled (option_enabled_when unknown) until read on the live tool - candidate rule: the organisation e-statement feature. Default paper as captured. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: coalesce(statement_runs.office_id, patient_statements.office_id, rpt_account_dim.home_office_id) - office of the statement run, else the office stored on the statement row, else the account home office (data_card 5.1; inferred). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| STATEMENT DATE | Statement Date (date_input) | shown: 11/21/2026 | `statement_date` | date | - | `today` | replicated_enhanced | Single date, role filter_equals: equality with patient_statements.statement_date of the stored statement rows; statement_type filters patient_statements.delivery_method. Default today in the office time zone. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r11:END -->

| Legacy option | Effect on the result |
|---|---|
| STATEMENT TYPE `Paper` (default) | `statement_type = paper`: rows printed (`delivery_method = 'print'`) or generated and not yet marked (`delivery_method` NULL, `delivery_status = 'generated'`) [I]; downloaded rows excluded until open question 5 is answered |
| STATEMENT TYPE `Email` (greyed in capture) | `statement_type = email`: rows with `delivery_method = 'email'` and a successful send; candidate `enabled_when ["ctx", "feature.e_statements"]` (FLT-05) once confirmed |
| STATEMENT TYPE `Both` (greyed in capture) | `statement_type = both`: no channel restriction (parity mapping); channel printed per row |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on `coalesce(statement_runs.office_id, patient_statements.office_id, rpt_account_dim.home_office_id)` (data_card 5.1) [I] |
| STATEMENT DATE (default today) | `statement_date` (`filter_equals`): `patient_statements.statement_date = :statement_date`; must equal the date of a past run |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `statement_run_id` | `entity_single` NEW (`lookup:statement_runs` NEW source: runs of the office, newest first, label `<statement date> - <n> statements`) | `null` (no restriction) | Pick one run when two runs share a date; sets `statement_date` from the run |
| `statement_date` token | relative token (filter_card 12) | `today` | Saved view "Last run" with NEW display token `last_statement_run_date` (owner 04, from `statement_runs`) so the favorite always opens the latest run |
| `responsible_party_name` | `text_range` (shared, 3.4) | `AAAAA` / `ZZZZZ` | Answer "did this payer get a statement" without paging |
| `include_failed_deliveries` | `boolean` NEW | `false` | `true` adds e-mail rows whose send failed (they are the subject of the error report) |
| `show_previous_statement` | `boolean` NEW | `false` | Adds `Previous Stmt` (date of the account's previous statement row) and `Change` (balance difference) |

### Data

Availability **APP** (coverage matrix row 83): `statement_date`, `delivery_method`, `delivery_status`, `delivered_to`,
`delivered_at`, `batch_id` exist [V]; no statement was migrated, so nothing before the first DentC run can be listed. Run
header and run office: DATA-22 (P1, `statement_runs`); rows are written by `statements.statement_run` (RPT-STMT-13).

| Dataset | Columns used |
|---|---|
| passthrough `patient_statements` (DATA-52) | `id`, `account_id`, `patient_id`, `statement_scope`, `office_id`, `statement_date`, `closing_balance`, `delivery_method` (`print`, `email`, `download`), `delivery_status` (stored `generated`, `printed`, `emailed`, `downloaded`; `sent`, `reopened`, `failed` added by RPT-STMT / DATA-22), `delivered_to`, `delivered_at`, `batch_id`, `snapshot`, `created_by` |
| `statement_runs` (DATA-22) | `batch_id`, `office_id`, `statement_date`, `status`, `statement_count`, `started_by` |
| `rpt_account_dim` | `account_id`, `legacy_key`, `account_no`, `guarantor_last_name`, `guarantor_first_name`, address, `guarantor_email`, `home_office_id` |
| `rpt_patient_dim` | `patient_id`, `account_id`, names - resolves the account of patient-scope rows and names the patient addressee |

| Parameter | Becomes |
|---|---|
| account | `a.account_id = coalesce(s.account_id, p.account_id)` with `p` = `rpt_patient_dim` on `s.patient_id` (`patient_statements.account_id` is nullable and `statement_scope` defaults to `patient`; only the family-account path writes `account` [V backend `billing.py`, `family_account_service.py`]) |
| `office_scope` | `coalesce(r.office_id, s.office_id, a.home_office_id) = ANY(:office_ids)` |
| `statement_date` | `s.statement_date = :statement_date` |
| `statement_type` | `paper`: `s.delivery_method = 'print' OR (s.delivery_method IS NULL AND s.delivery_status = 'generated')` [I]; `email`: `s.delivery_method = 'email' AND s.delivery_status <> 'failed'`; `both`: none. `download` (portal) rows appear only under `both`, with channel `Download` (open question 5) |
| fixed | `s.delivery_status IS DISTINCT FROM 'reopened'` (undone runs are not "sent"); `failed` dropped unless `include_failed_deliveries` |
| `statement_run_id` | `s.batch_id = :batch_id` |

| Topic | Rule |
|---|---|
| Date basis | `statement_date` equality (fixed) |
| Office attribution | `coalesce(statement_runs.office_id, patient_statements.office_id, rpt_account_dim.home_office_id)` (data_card 5.1) [I] |
| Grain | one row per `patient_statements` row: account-scope rows name the responsible party; patient-scope rows (`statement_scope = 'patient'`) name the patient as addressee and resolve the account through `rpt_patient_dim`; `Scope` column visible |
| Address printed | For paper rows the mailing address frozen in `snapshot` at generation when present, else the current account address with a footnote `* current address` [I] |
| Migrated history | None (APP); `availability[]` `no_migrated_statements` printed when `statement_date` precedes the tenant's first run |

### Output

Block `statements` (main). Fixed outer office band when multi-office.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `resp_party_id` | Resp. Party ID | text: `coalesce(a.legacy_key, a.account_no)` | `phi_identified` | - |
| `responsible_party_name` | Responsible Party | text (patient-scope rows: the patient as addressee) | `phi_identified` (key column) | `count` -> `Total Statements : n` |
| `delivery_address` | Address / E-mail | text: `CASE delivery_method WHEN 'email' THEN s.delivered_to ELSE coalesce(snapshot mailing address, current account address) END` (`* current address` footnote) | `phi_identified` | - |
| `statement_date` | Statement Date | date | `phi_identified` | - |
| `channel` | Type | enum (`Paper`, `Email`, `Download`) | `phi_identified` | `count` per channel in the footer when `statement_type = both` |
| `closing_balance` | Statement Balance | money | `financial_patient` | `sum` |
| `delivery_status` | Status | enum, `default_visible: false` | `phi_identified` | - |
| `delivered_at` | Sent | date, `default_visible: false` | `phi_identified` | - |
| `previous_statement_date` / `balance_change` | Previous Stmt / Change | date / money, `visible_when ["truthy", "show_previous_statement"]` | `phi_identified` / `financial_patient` | `sum` of change |
| `statement_scope` | Scope | enum (`Account`, `Patient`) | `phi_identified` | - |
| `statement_id`, `account_id`, `batch_id` | - | id, `hidden`; `statement_id` = `row_id_column` | `phi_identified` | - |

Default sort: responsible-party last name, first name, `resp_party_id`, `statement_id`. Page break `none`, `office`.
Summary cards: statements, total stated balance, paper / e-mail split. No metric key (metrics_card has no statement
figures); described in words.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Row | `kind: record` the frozen statement PDF (`patient_statements.id`; feature right of the statement screen, 08) |
| Statement balance | `kind: report` `ledger.ledger_report` (`account_id` <- row, `report_type` <- `account_ledger`, `date_to` <- `statement_date`) |
| Header link | `kind: report` `statements.statement_run` of that office and `statement_date` (statements right) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `reprint_statement` | row / bulk | custom: render the frozen statements of the selection (no new rows) | statements family Full Control | Re-mail on request; identical document |
| `email_statement` | row / bulk | custom: `email_statements` handler of `statements.statement_run` (RPT-STMT-23) | statements Full Control; account e-mail present, `no_email_statement = false` | Login-gated link (PD-12) |
| `open_account` | row | navigate | ledger feature right | - |
| `create_task` | row | create_task | task feature | "Statement not received" follow-up |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait; header office / organisation + title; footer echo `Statement Type :`, `Statement Date :`, `Offices :`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet; channel and status as columns |
| CSV | Main block; guard on |
| Background | Not needed (`instant`; one run is at most a few thousand rows) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Why are `Email` / `Both` greyed - e-statement subscription or office setting? (family open question 9) | Live legacy tool of an organisation with e-statements |
| 2 | `Both`: no channel restriction, or only accounts that received paper and e-mail (format "Email & Paper")? | Live legacy run |
| 3 | Does the legacy list include statements generated but not yet marked sent (before UPDATE STATEMENT DATES / PAPER STATEMENT SENT)? | Live legacy run before and after the update |
| 4 | Printed columns and address shown (address at mailing or current) - INFERRED | Live legacy PDF |
| 5 | Are downloaded (portal) statements counted under Paper? | Live legacy run of an organisation with a patient portal |

## Responsible Party - Email Statement Error Report - `lists.responsible_party_email_statement_error_report`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 13.PNG - P3 - S - `lists_responsible_party`
(`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - instant - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing | After each e-statement send (the vendor sends three days after the statement date) | Fix the e-mail address on file or re-send the statement on paper, so the account is not left without a statement |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P19]`; limits `[P22]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Responsible Party - Email Statement Error Report` | same |
| Columns [I] | Responsible-party ID, name, e-mail address, statement date / sent date, balance | Same, plus error text (enhancement) |
| Totals [I] | Count | `Total : n` |
| Documented limit `[P22]` | The legacy reports give no reason for a failed delivery (typical causes: wrong address, blocking by the recipient's provider) | DentC stores the error text (DATA-22 `delivery_error`) and prints it as an added column; the legacy run without it is unchanged |
| Quirk `[P22]` [conflict] | The vendor article contradicts itself on whether `No Email Statements` must be ticked to send e-statements | DentC: an account gets e-statements when it has an e-mail and `no_email_statement = false` (RPT-STMT-23) |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r12:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (default token working_office). Office attribution on this report: coalesce(statement_runs.office_id, patient_statements.office_id, rpt_account_dim.home_office_id) - office of the statement run, else the office stored on the statement row, else the account home office (data_card 5.1; inferred). Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. |
| STATEMENT SENT DATE | Statement Sent Date (date_input) | shown: 11/21/2026 | `statement_sent_date` | date | - | `today` | replicated_enhanced | Single date. Binding inferred: office-local date of NEW patient_statements.delivery_attempted_at (timestamp written by the e-statement handler, RPT-PLIST-55 / DATA-22 / RPT-STMT-23) on rows with delivery_method email and the NEW delivery_status 'failed'; delivered_at is a date and is set only on success. The vendor says e-statements are sent three days after the statement date, so the date is not the statement date. Confirm on the live tool. Default today in the office time zone. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:patients_list_reports.r12:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on the statement office (as on Statements Sent) |
| STATEMENT SENT DATE (default today) | `statement_sent_date`: office-local date of the e-mail send attempt [I: not the statement date, which precedes the send by three days at the vendor]; rows with `delivery_method = 'email'` and `delivery_status = 'failed'` |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `statement_sent_date_through` | `date` NEW (optional end of a range) | blank = the single legacy date | Weekly sweep of failures |
| `sent_date_basis` | `enum` NEW: `sent_date`, `statement_date` | `sent_date` | Interprets the date as the run's statement date instead, until the live tool settles it (open question 1) |
| `error_classes` | `enum_multi` NEW: `invalid_address`, `rejected`, `bounced`, `other` (derived from `delivery_error`, owner 03) | every class except `bounced` (the legacy e-statement service keeps separate sent / error / bounced reports, research; open question 2) | Separate typos from provider blocks; ticking `bounced` adds asynchronous bounces (enhancement) |
| `only_unresolved` | `boolean` NEW | `false` | Drops accounts whose current e-mail differs from the failed address or that received a later successful statement |
| Saved view "E-statement failures - last 7 days" | preset | - | `statement_sent_date = today-7d`, `statement_sent_date_through = today`, `only_unresolved = true` |

### Data

Availability **SCHEMA(22)** (coverage matrix row 85): `delivery_status` exists, the failure outcome and its text do not.
Today `statement_service.deliver` only records intent (`emailed`) and no SMTP is wired [V], so no failure can occur
before DATA-22 (P1) adds the outcome and RPT-STMT-23 (P3) sends e-statements and writes `delivery_status = 'failed'`
with `delivery_error`. Asynchronous bounces need the mail provider's bounce feed (NEW, owner of the correspondence
transport); without it only synchronous rejections are listed (`availability[]` `bounces_not_captured`). No statement
was migrated (APP for history).

| Dataset | Columns used |
|---|---|
| passthrough `patient_statements` | `id`, `account_id`, `patient_id`, `statement_scope`, `office_id`, `statement_date`, `closing_balance`, `delivery_method`, `delivery_status`, `delivered_to`, `delivered_at`, `batch_id`, NEW `delivery_error`, NEW `delivery_attempted_at` (timestamp of the send attempt; needed because `delivered_at` is stored as a date [A `be_data_financial.md` L241] and an attempt is not a delivery) |
| `statement_runs` (DATA-22) | `batch_id`, `office_id`, `statement_date` |
| `rpt_account_dim` | `account_id`, `legacy_key`, `account_no`, guarantor names, `guarantor_email` (current), phones, `no_email_statement`, `home_office_id`; account = `coalesce(s.account_id, p.account_id)`, `p` = `rpt_patient_dim` on `s.patient_id` (grain and patient-scope rule as Statements Sent) |

| Parameter | Becomes |
|---|---|
| `office_scope` | `coalesce(r.office_id, s.office_id, a.home_office_id) = ANY(:office_ids)` |
| `statement_sent_date` (+ `_through`) | office-local date of `s.delivery_attempted_at` between the dates (single date when `_through` blank); `sent_date_basis = statement_date`: `s.statement_date` instead |
| fixed | `s.delivery_method = 'email' AND s.delivery_status = 'failed'` |
| `only_unresolved` | `lower(a.guarantor_email) = lower(s.delivered_to) AND NOT EXISTS (later row of the account with delivery_status IN ('emailed','sent'))` |

| Topic | Rule |
|---|---|
| Date basis | send-attempt date (fixed, [I]) |
| Office attribution | as Statements Sent |
| Migrated history | none |

### Output

Block `failures` (main). Fixed outer office band when multi-office.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `resp_party_id` | Resp. Party ID | text: `coalesce(a.legacy_key, a.account_no)` | `phi_identified` | - |
| `responsible_party_name` | Responsible Party | text (patient-scope rows: the patient as addressee) | `phi_identified` (key column) | `count` -> `Total : n` |
| `statement_scope` | Scope | enum (`Account`, `Patient`) | `phi_identified` | - |
| `delivered_to` | E-mail Address | text (the address the send used) | `phi_identified` | - |
| `statement_date` | Statement Date | date | `phi_identified` | - |
| `sent_date` | Sent Date | date | `phi_identified` | - |
| `closing_balance` | Balance | money | `financial_patient` | `sum` |
| `delivery_error` | Error | text (NEW; blank before DATA-22) | `phi_identified` (free text, rule 4) | - |
| `error_class` | Error Type | enum, `default_visible: false` | `phi_identified` | `count` per class in the footer |
| `current_email` | Current E-mail | text, `default_visible: false` | `phi_identified` | - |
| `phone` | Phone | text, `default_visible: false` | `phi_identified` | - |
| `statement_id`, `account_id` | - | id, `hidden`; `statement_id` = `row_id_column` | `phi_identified` | - |

Default sort: responsible-party last name, first name, `statement_id`. Page break `none`, `office`. Summary cards:
failures, balance not delivered. No metric key exists; a delivery-rate metric for statements would be NEW in 05.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Row | `kind: record` the frozen statement PDF |
| Name | `kind: record` guarantor account screen to correct the e-mail (ledger feature right) |
| Statement date | `kind: report` `lists.responsible_party_statements_sent` with `statement_date` <- row, `statement_type` <- `email`, `include_failed_deliveries` <- `true` |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_account` | row | navigate | ledger feature right | Correct the address |
| `reprint_statement` | row / bulk | custom (frozen statements, as on Statements Sent) | statements Full Control | Paper re-send of the same statement |
| `email_statement` | row / bulk | custom: `email_statements` handler (RPT-STMT-23) | statements Full Control | Re-send after correction; idempotent per `(run_id, action_key, account)` |
| `send_sms` | bulk | send_sms | SMS feature; `requires: sms_consent` | "Please confirm your e-mail address" |
| `create_task` | row / bulk | create_task | task feature | "Fix e-mail address" |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

With `only_unresolved = true` the report doubles as the e-statement repair worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (landscape when `delivery_error` is visible); header office / organisation + title; footer echo `Statement Sent Date :`, `Offices :`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet; error text in its own column |
| CSV | Main block; guard on (error text comes from a remote mail server) |
| Background | Not needed (`instant`) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Does Statement Sent Date match the run's statement date or the day the e-mails went out? (family open question 9; supplement unresolved) | Live legacy run three days after a statement date |
| 2 | Does the legacy list include bounces reported later by the recipient's server, or only immediate rejections? The vendor e-statement service has separate sent, error and bounced reports, so the default excludes `bounced` | Live legacy tool; vendor e-statement service notes |
| 3 | Printed columns - INFERRED | Live legacy PDF |
| 4 | Product: on a failed e-mail, should the next statement run fall back to paper automatically? | Product owner; `statements.statement_run` owner |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-PLIST-01 | Shared parameter set and option sources of the family: `patient_status`, `patient_type`, `gender`, `age`, patient-type and resp.-party-type definitions (with `no_type_defined`), `note_type_codes`, `specialty_codes`, `include_inactive_accounts`; office attribution per definition | P3 | S | FLT-03, FLT-09, FLT-16, DATA-05, DATA-53 | All 12 definitions validate with the parity defaults (FLT-20); `exclude_patient_type_codes` keeps patients without a type; `no_type_defined` selects exactly the untyped patients and accounts |
| RPT-PLIST-02 | `lists.patient_list` on `rpt_patient_dim` / `rpt_patient_activity`: legacy 11-column layout, first-name default sort, footer echo `ExPatType :` / `* Excludes Inactive Patients`, no-email filter | P3 | M | DATA-05, DATA-19, ENG-11, ENG-23, RPT-PLIST-01 | Golden fixture: each criterion alone and combined selects the hand-computed set; the default run lists active patients of the working office's home-office set; blank age bounds drop no patient without a birth date |
| RPT-PLIST-03 | `lists.patient_list_grouped_by`: 13 `report_by` modes with group headers and counts, Last Visit panel (`provider_basis`, `preferred_provider_ids`, `last_visit_date`, `include_patients_with_no_last_visit`), clinical-class gate on Medical Alert | P3 | L | DATA-19, DATA-21, DATA-32, DATA-52, ENG-04, FLT-15, RPT-PLIST-01 | Every mode runs on the fixture; switching mode hides and resets the parameters of `patients_list_reports.r06.d01` / `.d02`; a caller without `clinical` gets 403 on Medical Alert only; Uninsured lists exactly the patients without an active coverage slot |
| RPT-PLIST-04 | `lists.patient_list_new_patient` (5 modes incl. placeholder patients) and `lists.patients_seen` (Summary / Detail, Transaction / DOS date basis, visit rule) | P3 | L | DATA-04, DATA-16, DATA-18, DATA-19, DATA-40, DATA-44, MET-16 | Appointment mode lists only `is_placeholder_patient` rows with an appointment in range; Patients Seen ignores missed and cancelled appointments; totals reconcile with `patients_seen`, `patient_visits`, `new_patients_first_visit` for the same params |
| RPT-PLIST-05 | `lists.patients_notes`: one required patient, note types from `patient_notes`, `account_notes`, `financial_notes`; newest first; `Total number of notes` line; not schedulable | P3 | S | DATA-52, FLT-16, SEC-37 | A patient outside the caller's visibility is refused (403 `patient_not_in_office`); a caller without `clinical` gets every row except Chart Notes plus the `chart_notes_withheld` notice; migrated account notes print `-` as date, only with `include_undated_migrated_notes` (default with `all_dates`) |
| RPT-PLIST-06 | `lists.patients_on_payment_plan` (regular and ortho layouts, recomputed remaining columns, card on file), `lists.online_registered_patients` (Summary / Detail on `booking_requests`), `lists.update_patient_insurance_conversion_list_by_appointment` (type `UP`, placeholder plan) | P3 | M | DATA-37, DATA-44, DATA-16, DATA-21, RPT-PLIST-01 | Ortho layout reproduces the 2021 sample columns and the single `Total :` row; registrations are counted per office with `Active` pending / imported; conversion list shows only `UP` patients with appointments in range |
| RPT-PLIST-07 | `lists.responsible_party_list` (6 modes incl. aged balance and send-statement status) and `lists.responsible_party_sent_to_collection` on `rpt_account_dim` and `rpt_ar_open_items()` | P3 | L | DATA-07, DATA-10, DATA-20, DATA-27, DATA-35, DATA-53, RPT-PLIST-01 | Balance equals the on-screen account balance for every fixture account (R-02); `patients_list_reports.r09.d01` hides the created range; inactive accounts appear only with `include_inactive_accounts = true` |
| RPT-PLIST-08 | `lists.responsible_party_statements_sent` and `lists.responsible_party_email_statement_error_report` on `patient_statements` with `statement_runs` and `delivery_error` | P3 | S | DATA-22, RPT-PLIST-01 | A statement run of the fixture lists one row per statement row (a patient-scope statement with NULL `account_id` resolves its account through the patient and prints the patient as addressee); a failed e-mail appears on the error report of its send date with the stored error text |
| RPT-PLIST-09 | Family conventions and live verification: title templates, footer echo labels, `availability[]` warnings (created dates, placeholders, derived providers), then the live legacy pass for every `unknown_legacy` and inferred note of `patients_list_reports.parity.json` | P3 | S | ENG-23, FLT-18, FLT-23 | PDF footers print the legacy echo labels; every open question of this header is answered or re-confirmed and the parity file is rebuilt PARITY VALID |
| RPT-PLIST-10 | Patient List enhancements and outputs: `sort_by` options, `last_visit_date`, `has_future_appointment`, `only_patients_without_email`, `exclude_no_correspondence`, `zip_code`, optional columns, landscape PDF, XLSX address split, bulk correspondence and campaign actions | P3 | S | RPT-PLIST-02, ENG-27, ENG-49, DASH-31 | Default run equals the RPT-PLIST-02 golden fixture; `has_future_appointment = no` drops a booked fixture patient; the bulk text action reports the consent exclusion count before dispatch |
| RPT-PLIST-11 | Gender vocabulary: normalised `gender_code` expression in `rpt_patient_dim`, `gender` option list (candidate `male` / `female` / `unknown`), live-tool confirmation and `param_migrations` if labels change | P3 | S | DATA-05, RPT-PLIST-01, RPT-PLIST-09 | Every stored gender value of the fixture maps to one option; `gender = all` drops no patient; a renamed option keeps saved views valid |
| RPT-PLIST-12 | New Patient mode blocks: `by_appointment` (placeholders and patientless appointments), `by_created_first_visit`, `by_carrier` (primary slot lateral), `by_referral`, `by_referral_type`; title templates; NEW parameter `new_patient_definition` registered with 04 | P3 | M | RPT-PLIST-04, DATA-16, DATA-19, DATA-21, DATA-40, DATA-44, FLT-05 | Each mode runs on the fixture; created-date mode never lists a migrated patient (`created_at_reliable = false`) and prints `created_date_app_only`; a patient with two dental slots appears once under the primary carrier |
| RPT-PLIST-13 | New Patient enhancements and actions: first-visit production, next appointment, `carrier_ids` / `referral_type_codes` / `preferred_provider_ids`, `appointment_statuses_shown`, complete-registration hand-off, referral thank-you letters, drills to `appointment.new_patients_via_appointments` | P3 | S | RPT-PLIST-12, ENG-30, ENG-49 | First-visit production total equals `rpt_visits.charged_production` summed over the listed first visits; a placeholder row opens the edit wizard; the appointment-mode count equals the same-range count of `appointment.new_patients_via_appointments` |
| RPT-PLIST-14 | Patients Seen blocks for the four `report_by` candidates (`by_day`, `by_age` matrix, `by_medical_alert`, `by_zip_code`), Summary / Detail, distinct and visit totals, transaction-date keyed visit (NEW column requested from 03) | P3 | M | RPT-PLIST-04, DATA-04, DATA-13, DATA-18, DATA-52, ENG-11 | Two-day fixture: a patient seen both days counts 1 per day, `Total Patients Seen` 1, `Total Visits` 2; a missed appointment without a visit-code charge never counts; a caller without `clinical` gets 403 on `medical_alert` only |
| RPT-PLIST-15 | Patients Seen enhancements: `period_grain`, `group_by provider`, `split_new_existing`, `include_days_without_visits`, `medical_alert_codes` (NEW option source `medical_alerts` for 04), `age`, line and bar charts, drill to `monthly.executive_summary` | P3 | S | RPT-PLIST-14, DATA-55, FLT-09, DASH-11 | Weekly grain distinct counts equal a hand count; zero-fill rows appear only for office working days; new + existing equals the row count |
| RPT-PLIST-16 | Patient's Notes union: `patient_notes`, account-wide `account_notes`, `financial_notes` field row; NEW `rpt_value_map` domain `note_type`; static `note_types` source with the four legacy types; header band, newest-first sort, struck-off and undated-migrated options, `note_origin`, document drill | P3 | S | RPT-PLIST-05, DATA-52, FLT-09, FLT-16, ENG-23 | A note on a representative account member prints on every member's report as `Responsible Party Notes`; a migrated undated note appears only with `include_undated_migrated_notes`; `Total number of notes` equals the rows; the PDF wraps a 4,000-character note across pages |
| RPT-PLIST-17 | Grouped By per-mode blocks and columns: 13 group header templates, repeating-mode totals (`Total Patients` distinct, `Total Rows`), birth-month order, Uninsured anti-join, fee-schedule label passthrough, sparse-specialty availability warning | P3 | M | RPT-PLIST-03, DATA-21, DATA-45, DATA-52, ENG-23 | Fixture patient with dental and medical slots: two rows in Carrier, `Total Patients` 1; an uninsured patient appears only in Uninsured; Birthdate prints January before February and day order inside a month |
| RPT-PLIST-18 | Grouped By enhancements and actions: `carrier_ids`, `employer_ids`, `fee_schedule_ids`, `medical_alert_codes`, `birth_months`, `hipaa_agreement_value`, `has_future_appointment`, `subtotal_by_office`; birthday and reactivation hand-offs, HIPAA letters, insurance tasks; drill to `lists.patient_list` and the insurance plan record | P3 | M | RPT-PLIST-17, ENG-30, ENG-49, DASH-31, DASH-34 | Saved view "Birthdays next month" lists exactly the fixture patients born next month on re-run in a later month; reactivation hand-off carries the last-visit window |
| RPT-PLIST-19 | Patients on Payment Plan blocks `ortho` (2021 column set, two-row header, single `Total :` row, count line) and `regular` (inferred layout); recomputed remaining columns; `Ty` placeholder; preferred-provider group key of class `aggregate` (08 exception to rule 3) | P3 | M | RPT-PLIST-06, DATA-37, ENG-23, ENG-27 | Ortho fixture with three contracts reproduces the sample totals arithmetic (`Total Ortho Amt.`, patient and insurance `Total Pln.` / `Rem.`); a contract with stale stored remaining prints the recomputed value; XLSX has flat sub-column headers |
| RPT-PLIST-20 | Payment Plan enhancements and actions: `plan_status`, `only_overdue_installments`, `show_provider_subtotals`, `show_next_due_date`, `contract_provider_ids` (NEW role `contract` for 04), card-on-file request hand-off, drill to `management.payment_plan_charges` | P3 | S | RPT-PLIST-19, ENG-30, ENG-49 | `plan_status = open` with `all_dates` lists every fixture contract with a remaining amount and none paid off; an unposted past-due instalment marks the contract overdue |
| RPT-PLIST-40 | Definition `lists.update_patient_insurance_conversion_list_by_appointment`: parity parameters, formats `summary` / `detail` (appointment x slot), title templates, columns and data classes of this section, row filters, enhancement keys `conversion_basis`, `include_cancelled_appointments`, `appointment_provider_ids`, `operatory_ids`, `eligibility_statuses`, `sort_by`, `page_break_by` | P3 | S | DATA-16, DATA-21, RPT-PLIST-01, RPT-PLIST-06, RPT-PLIST-41 | Golden fixture: a `UP` patient with two slots and one appointment in range gives two Detail rows and Summary 1 appointment / 1 patient; a cancelled appointment appears only with `include_cancelled_appointments`; defaults equal the parity file (FLT-20) |
| RPT-PLIST-41 | NEW computed column `rpt_insurance_coverage.is_conversion_placeholder` (carrier `CONVERSION DEFAULT%` or employer `CONVERSION` + group `DO NOT TOUCH`) and its count on the migrated tenant | P3 | S | DATA-21 | The flag is true exactly on the placeholder slots of a hand-checked sample; the count of `UP` patients with and without a placeholder slot is recorded for open question 1 |
| RPT-PLIST-42 | Conversion list actions and saved view: `open_patient_insurance`, `verify_eligibility` hand-off to `worklists.eligibility_verification`, `create_task`, `send_sms`, schedulable "2 days ahead" view | P3 | S | RPT-PLIST-40, ENG-28, ENG-49 | The view opened on two consecutive days lists the appointments of today+2d; SMS excludes opted-out patients and shows the excluded count |
| RPT-PLIST-43 | Definition `lists.online_registered_patients` on passthrough `booking_requests`: derived `registration_status` / `is_active` (`TRUE` / `FALSE` display), Summary per office with optional period, Detail columns, enhancement keys `registration_statuses`, `registration_kind`, `summary_period` | P3 | S | DATA-44, MET-18, RPT-PLIST-06, RPT-PLIST-44 | Fixture with one request per status plus an approved request without a patient: Summary counts active 2 (pending + awaiting payment), imported 1, approved not linked 1, declined / expired 2, and the columns sum to `registration_count`; created-date bounds respect the office time zone; Summary total equals `online_booking_requests` |
| RPT-PLIST-44 | Register `booking_requests` as a passthrough dataset (tenant scope, office column, created-date binding) and, after DATA-44, union patients with `registration_source = 'online'` | P3 | S | DATA-44, ENG-09 | Lint passes; a run never reads a request of another tenant; the `registration_expiry_lazy` warning prints when overdue pending rows exist |
| RPT-PLIST-45 | Definition `lists.responsible_party_list`: six `report_by` modes in one block with `visible_when` columns, rule `patients_list_reports.r09.d01`, group levels for type and zip, title per mode, enhancement keys `include_account_balance`, `include_balance_split`, `sort_by`, `has_email`, `exclude_sent_to_collection`, `responsible_party_name` | P3 | M | DATA-07, DATA-10, DATA-20, RPT-PLIST-01, RPT-PLIST-07, RPT-PLIST-48 | Each mode runs on the fixture; switching to Send Statement Status hides and resets the created range; inactive accounts (no active member) appear only with `include_inactive_accounts`; merged-away accounts never appear |
| RPT-PLIST-46 | Aged mode: `aged_balance` (`number_range`, 1.00 / 999999.99) and `aging_days` (30 / 60 / 90 / 120) bound to `rpt_ar_open_items` unit `account` and the legacy bucket set; reconciliation tests against `total_ar` and `ar_over_90_amount` | P3 | S | DATA-27, RPT-PLIST-45, MET-10 | Σ balance (mode balance, all dates, all offices, inactive included) = `total_ar`; Σ aged amount with 90 days = `ar_over_90_amount`; credits never counted in the aged amount |
| RPT-PLIST-47 | Resp. party type mode and exclude filter on `rpt_account_dim.resp_party_type`, option source `definitions:resp_party_type` with `No Type Defined`, `resp_party_type_missing` warning until the back-fill | P3 | S | DATA-53, RPT-PLIST-45 | After DATA-53 every fixture account has a type and the type group counts sum to the account count; before it the warning prints; a NULL-type fixture account is kept by an exclusion of any other type and dropped by an exclusion of `no_type_defined` |
| RPT-PLIST-48 | `rpt_account_dim` contact columns for the guarantor lists: NEW `guarantor_email`, `guarantor_zip5`, phone preference, mailing address of party and self-guarantor accounts (owner 03) | P3 | S | DATA-05 | Every account of a 500-account sample shows the address and e-mail the guarantor screen shows, for both guarantor kinds |
| RPT-PLIST-49 | NEW display token `last_statement_run_date` and option source `statement_runs` (owner 04) for the statement lists | P3 | S | DATA-22, FLT-06 | A favorite with the token opens on the latest run's date of the working office; the source lists runs newest first with their counts |
| RPT-PLIST-50 | Definition `lists.responsible_party_sent_to_collection`: population `send_collections`, `account_balance` range with negative values allowed, columns incl. agency, last payment, optional ageing, `group_by = collection_agency`, agency export shape | P3 | S | DATA-07, DATA-20, RPT-PLIST-07, RPT-PLIST-51 | Default run excludes a flagged credit account and includes it with the credit saved view; agency subtotals sum to the grand total; the `agency_placement` CSV has one row per account |
| RPT-PLIST-51 | Passthrough `collection_agencies` and option source `collection_agencies`; code group `collection_marker` for the Z-code marker date; `sent_to_collections_date` range and `agency_payments_since` after DATA-35 | P3 | S | DATA-35, DATA-04, DATA-45, FLT-06 | Agency names resolve for every flagged account; marker date equals the first marker charge of a fixture account; the date range is greyed with its reason before DATA-35 |
| RPT-PLIST-52 | Definition `lists.responsible_party_statements_sent` on `patient_statements` + `statement_runs`: `statement_type` channel mapping, run-office attribution with fallbacks, reopened rows excluded, `statement_run_id`, `responsible_party_name`, `include_failed_deliveries`, `show_previous_statement` | P3 | S | DATA-22, RPT-STMT-13, RPT-PLIST-08, RPT-PLIST-49 | A fixture run of 3 accounts (2 paper, 1 e-mail) lists 2 / 1 / 3 rows for paper / email / both; an undone run lists nothing; the stated balance equals `closing_balance` of the frozen row |
| RPT-PLIST-53 | STATEMENT TYPE option rule: read the greyed `Email` / `Both` cause on the live tool and declare `enabled_when` (candidate `ctx.feature.e_statements`); Statement Setup links to both statement lists | P3 | S | FLT-23, FLT-05, RPT-PLIST-52 | The served definition greys the options exactly when the live tool does; the parity file is rebuilt PARITY VALID |
| RPT-PLIST-54 | Definition `lists.responsible_party_email_statement_error_report`: failed e-mail rows by send-attempt date, `delivery_error` column and `error_classes`, `statement_sent_date_through`, `sent_date_basis`, `only_unresolved`, repair actions | P3 | S | DATA-22, RPT-STMT-23, RPT-PLIST-08, RPT-PLIST-55 | A send that the transport rejects appears on the report of its attempt date with the stored error text; after the address is corrected the row leaves the `only_unresolved` view |
| RPT-PLIST-55 | Statement delivery outcome capture for the error report: `delivery_status = 'failed'`, `delivery_error`, NEW `delivery_attempted_at` written by the e-statement handler; bounce feed from the mail provider marked as follow-up (owner of the correspondence transport) | P3 | S | DATA-22, RPT-STMT-23 | Every e-mail attempt writes one outcome; a synchronous rejection stores `failed` and the text; `bounces_not_captured` prints until the bounce feed exists |

<!-- ASSEMBLED from catalog/parts/patients_list_reports/ (00_header.md, 10_reports_01_06.md, 20_reports_07_12.md). Edit this document directly from now on. -->
