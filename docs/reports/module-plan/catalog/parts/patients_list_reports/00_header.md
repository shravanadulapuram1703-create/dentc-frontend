# Lists - Patient and Responsible Party - report specifications

Patient rosters, new-patient and patients-seen counts, one patient's note history, payment-plan and online-registration lists
(group `PATIENT LIST`, 8 reports) and guarantor-account lists for billing and collections (group `RESPONSIBLE PARTY LIST`, 4
reports). Hub home: Lists, `subcategory = patient` (brief section 1). Default phase P3; every report ships in P3.

## Overview

Order = legacy index order (`legacy/index/patients_list_reports.controls.json`, screenshot numbering), which the section order
of this document follows. The legacy menu order differs (Patient List first, Update Patient Insurance eighth); the hub lists
the reports in menu order.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `lists.update_patient_insurance_conversion_list_by_appointment` | Update Patient Insurance (Conversion) List - By Appointment | Converted practices: patients with appointments in the range whose insurance is still the conversion placeholder (type `UP`), to fix before the visit | P3 | S | READY | PARTIALLY DOCUMENTED |
| `lists.patient_list` | Patient List | Roster of patients with contact data by status, ortho flag, office, provider, patient type, sex and age | P3 | M | READY (provider criterion on history: derived last-visit provider) | PARTIALLY DOCUMENTED (predecessor sample 2014) |
| `lists.patient_list_new_patient` | Patient List - New Patient | New patients in a range in five modes: appointment-only placeholders, carrier, created / first visit, referral, referral type | P3 | L | SCHEMA(44) for the default mode `appointment` (interim placeholder rule [I]); other modes READY (first visit REPAIR(19), created date APP, referral on app patients SCHEMA(40)) | PARTIALLY DOCUMENTED (modes documented, no layout) |
| `lists.patients_seen` | Patients Seen | Counts of patients seen (visit-code charges) per day, age band, medical alert or zip code; Detail lists the patients | P3 | M | READY (Transaction Date = DOS Date until SCHEMA(13)) | PARTIALLY DOCUMENTED (only mode `Day` known) |
| `lists.patients_notes` | Patient's Notes | Every note of one patient (patient, responsible party, financial, chart notes) in a created-date range | P3 | S | READY (migrated notes: load time as created date, creating user unknown) | DOCUMENTED (sample 2011) |
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
| Statement delivery | `lists.responsible_party_statements_sent`, `lists.responsible_party_email_statement_error_report` | statement row (one per account and statement run) | passthrough `patient_statements` (`statement_date`, `delivery_method`, `delivery_status`, `delivered_to`, `delivered_at`, `batch_id`), `statement_runs` and `delivery_error` (DATA-22), `rpt_account_dim` |

### Shared parameters and defaults (from the parity file; report sections do not repeat them)

| Parameter | Type | Reports (index ids) | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 12 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | all except r05 | `working_office` | Mode Office / Office Group (`patients_list_reports.r01.d01`). Attribution per report in the next table. r05 has no office parameter (`scope.office_mode = none`) |
| `report_format` | `enum` | r01, r04, r08 (legacy REPORT TYPE) | `summary` | Summary -> `summary`, Detail -> `detail`; same population, row grain only |
| `report_by` | `enum` | r03, r04, r06, r09 | `appointment`, `day`, `attached_to_provider`, `created_date` | Selects the variant (population, grouping, columns, title) and, on r03, the date basis. Option lists of r03 / r06 / r09 come from vendor screenshots; r04 stays `unknown_legacy` (only `day` known). A saved view always stores `report_by` (13 modes behind one name) |
| `date_range` (`date_from`, `date_to`) | `date_range` | r01, r03, r04, r05, r07, r08, r09 | `today` / `today` | Fixed basis per report (table below); `date_basis` parameter only on r04 (`transaction_date` / `service_date`). Hidden on r09 when `report_by = send_statement_status` |
| `patient_status` | `enum` | r02, r06 | `active` | `active` / `inactive` / `both` on `rpt_patient_dim.is_active` (inactive and deleted share the flag until DATA-44; printed "inactive or deleted") |
| `provider_ids` | `entity_multi` | r02, r04, r06 | `all` | Role per report: r02 preferred (fallback last-visit provider); r04 provider of the visit (`rpt_provider_visits`); r06 attached provider. Never scoped by `providers.office_id`; roster-first ordering only |
| `preferred_provider_ids` | `entity_multi` | r07; r06 (mode Last Visit) | `all` | r07: preferred provider of the patient. r06: the provider chosen by `provider_basis` (extension of the shared key, open question 6) |
| `include_patient_type_codes` / `exclude_patient_type_codes` | `entity_multi` | r02, r06 / r02, r06, r07 | `all` / `none` | Overlap test on `rpt_patient_dim.patient_type_codes` (up to six user-defined types); source row `no_type_defined`; exclude keeps patients without a type; footer echo `ExPatType :` |
| `exclude_resp_party_type_codes` | `entity_multi` | r09 | `none` | `rpt_account_dim.resp_party_type NOT IN (...)`; empty for self-guarantor accounts until DATA-53 |
| `statement_date` / `statement_sent_date` | `date` | r11 / r12 | `today` | r11 `filter_equals` on `patient_statements.statement_date`; r12 office-local date of `delivered_at` [I] |
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
| r02 Patient List | none (no date criterion; age computed at the office-local today of the run) | patient home office (`rpt_patient_dim.home_office_id`) [I] | preferred, fallback `rpt_patient_activity.last_visit_provider_id` [I] |
| r03 New Patient | follows `report_by`: `appointment_date`; created date or `first_visit_date`; created date for referral modes [I]; carrier not documented | appointment office (mode appointment); home office otherwise [I] | none |
| r04 Patients Seen | `date_basis`: `transaction_date` (default) / `service_date`; visits from `rpt_visits` (visit-code charges, missed and cancelled appointments never count) | office of the visit (office of service) | provider of the visit (`rpt_provider_visits.provider_id`) [I] |
| r05 Patient's Notes | note created date; `note_date` on migrated notes where present | none (one patient; `assert_patient_visible`) | none |
| r06 Grouped By | none, except `last_visit_date` in mode Last Visit (attribute range) | patient home office [I] | attached provider (preferred, fallback last-visit provider); mode Last Visit: `provider_basis` |
| r07 Payment Plan | contract `setup_date` (`rpt_payment_plan_contracts`) | contract office [I] | patient preferred provider [I]; group header possibly contract provider (open question 7) |
| r08 Online Registered | registration received date (`booking_requests` created) | office of the registration | none |
| r09 RP List | account created date (`rpt_account_dim.created_at_utc`); none in mode Send Statement Status | account home office | none |
| r10 Sent to Collection | none (current state) | account home office | none |
| r11 Statements Sent | `statement_date` equality | statement-run office, interim account home office [I] | none |
| r12 Email Error | sent date (`delivered_at`) [I] | as r11 | none |

| Topic | Rule |
|---|---|
| Today, ranges | Office-local today of the working office; inclusive on both ends; presets and relative tokens are enhancements (filter_card section 12) |
| Created dates | Created-date bases on patients, accounts, notes and appointments are reliable only for app rows (data_card 4.2): r03 created mode, r08 and r09 default mode print an `availability[]` warning when the range touches migrated rows (`created_at_reliable = false`) |
| Current state | Home office, preferred provider, patient type, coverage, send-statement and collection flags are current values; no list reproduces an earlier state (legacy behaviour) |
| Inactive | Patient lists: `is_active`, labelled "inactive or deleted" until DATA-44. Accounts: "inactive account" = no active member (`active_member_count = 0`) |
| Freshness | `live` (views over OLTP). `cost_class`: `instant` for r05, r10, r11, r12; `interactive` for the rest, escalating to `background` for an office group or `all` on r02, r04 Detail, r06 and r09 balance modes (`escalate_when`, 02 section 4.9) |

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
| Data classes | Name, patient id, chart #, birth date, age, sex, phones, e-mail, address, appointment date, patient type, referral source, HIPAA flag, last visit: `phi_identified` (rule 5: patient name is a key column). Subscriber id, guarantor employer on a patient row: `phi_sensitive`. Medical alert (r04 mode medical alert, r06 mode Medical Alert): `clinical`, a key column there, so a caller without `clinical` cannot run that mode (403 `data_class_denied`). r05 note text: `clinical` (the cell can hold Chart Notes; rule 1), note type and author `phi_identified`. Balances, plan amounts, statement amounts: `financial_patient`. Counts per day / band / office: `aggregate`; zip and employer group keys: `phi_identified` + `deny` (rule 13). Patient-identifying parameters (`patient_id`, name-bearing values) need `phi_identified` (rule 8) |
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
| 7 | Patients on Payment Plan: is PREFERRED PROVIDER the patient's preferred provider or the contract provider (sample groups by `Provider :`)? Regular-plan layout | live legacy run, both plan types |
| 8 | Office attribution of the patient lists (home office versus any office the patient visited) and of the statement reports (run office versus account home office) | live legacy run with a patient whose home office differs |
| 9 | Why STATEMENT TYPE `Email` / `Both` are greyed; whether Statement Sent Date is the send date or the statement date | live legacy tool of an organisation with e-statements |
| 10 | Sent to Collection: are 0.00 / 999999.99 real bounds (credit balances excluded) or open bounds | live legacy run with a credit-balance account flagged |
| 11 | The worked example `lists.patient_list` of 02 section 3.12 uses provisional keys (`sex`, `include_patient_types`, `exclude_patient_types`) and the old class `phi_sensitive` for birth date; the parity file (`gender`, `include_patient_type_codes`, `exclude_patient_type_codes`) and 08 section 5.1 (`phi_identified`) supersede it | 02 owner |
| 12 | The task brief lists report ids in menu order (r01 = Patient List); the legacy index numbers them by screenshot (r01 = Update Patient Insurance). The parity file and this document use the index ids | plan coordinator |

<!-- WORK-ITEMS -->
| RPT-PLIST-01 | Shared parameter set and option sources of the family: `patient_status`, `patient_type`, `gender`, `age`, patient-type and resp.-party-type definitions (with `no_type_defined`), `note_type_codes`, `specialty_codes`, `include_inactive_accounts`; office attribution per definition | P3 | S | FLT-03, FLT-09, FLT-16, DATA-05, DATA-53 | All 12 definitions validate with the parity defaults (FLT-20); `exclude_patient_type_codes` keeps patients without a type; `no_type_defined` selects exactly the untyped patients and accounts |
| RPT-PLIST-02 | `lists.patient_list` on `rpt_patient_dim` / `rpt_patient_activity`: legacy 11-column layout, first-name default sort, footer echo `ExPatType :` / `* Excludes Inactive Patients`, no-email filter | P3 | M | DATA-05, DATA-19, ENG-11, ENG-23, RPT-PLIST-01 | Golden fixture: each criterion alone and combined selects the hand-computed set; the default run lists active patients of the working office's home-office set; blank age bounds drop no patient without a birth date |
| RPT-PLIST-03 | `lists.patient_list_grouped_by`: 13 `report_by` modes with group headers and counts, Last Visit panel (`provider_basis`, `preferred_provider_ids`, `last_visit_date`, `include_patients_with_no_last_visit`), clinical-class gate on Medical Alert | P3 | L | DATA-19, DATA-21, DATA-32, DATA-52, ENG-04, FLT-15, RPT-PLIST-01 | Every mode runs on the fixture; switching mode hides and resets the parameters of `patients_list_reports.r06.d01` / `.d02`; a caller without `clinical` gets 403 on Medical Alert only; Uninsured lists exactly the patients without an active coverage slot |
| RPT-PLIST-04 | `lists.patient_list_new_patient` (5 modes incl. placeholder patients) and `lists.patients_seen` (Summary / Detail, Transaction / DOS date basis, visit rule) | P3 | L | DATA-04, DATA-16, DATA-18, DATA-19, DATA-40, DATA-44, MET-16 | Appointment mode lists only `is_placeholder_patient` rows with an appointment in range; Patients Seen ignores missed and cancelled appointments; totals reconcile with `patients_seen`, `patient_visits`, `new_patients_first_visit` for the same params |
| RPT-PLIST-05 | `lists.patients_notes`: one required patient, note types from `patient_notes`, `account_notes`, `financial_notes`; newest first; `Total number of notes` line; not schedulable | P3 | S | DATA-52, FLT-16, SEC-37 | A patient outside the caller's visibility is refused (403 `patient_not_in_office`); note text needs `clinical`; migrated notes are dated by `note_date` |
| RPT-PLIST-06 | `lists.patients_on_payment_plan` (regular and ortho layouts, recomputed remaining columns, card on file), `lists.online_registered_patients` (Summary / Detail on `booking_requests`), `lists.update_patient_insurance_conversion_list_by_appointment` (type `UP`, placeholder plan) | P3 | M | DATA-37, DATA-44, DATA-16, DATA-21, RPT-PLIST-01 | Ortho layout reproduces the 2021 sample columns and the single `Total :` row; registrations are counted per office with `Active` pending / imported; conversion list shows only `UP` patients with appointments in range |
| RPT-PLIST-07 | `lists.responsible_party_list` (6 modes incl. aged balance and send-statement status) and `lists.responsible_party_sent_to_collection` on `rpt_account_dim` and `rpt_ar_open_items()` | P3 | L | DATA-07, DATA-10, DATA-20, DATA-27, DATA-35, DATA-53, RPT-PLIST-01 | Balance equals the on-screen account balance for every fixture account (R-02); `patients_list_reports.r09.d01` hides the created range; inactive accounts appear only with `include_inactive_accounts = true` |
| RPT-PLIST-08 | `lists.responsible_party_statements_sent` and `lists.responsible_party_email_statement_error_report` on `patient_statements` with `statement_runs` and `delivery_error` | P3 | S | DATA-22, RPT-PLIST-01 | A statement run of the fixture lists one row per account and channel; a failed e-mail appears on the error report of its send date with the stored error text |
| RPT-PLIST-09 | Family conventions and live verification: title templates, footer echo labels, `availability[]` warnings (created dates, placeholders, derived providers), then the live legacy pass for every `unknown_legacy` and inferred note of `patients_list_reports.parity.json` | P3 | S | ENG-23, FLT-18, FLT-23 | PDF footers print the legacy echo labels; every open question of this header is answered or re-confirmed and the parity file is rebuilt PARITY VALID |
<!-- /WORK-ITEMS -->
