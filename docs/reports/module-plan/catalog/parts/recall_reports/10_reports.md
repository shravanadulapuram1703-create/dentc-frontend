## Procedural Recall Report - `recall.procedural_recall_report`

Recall Reports, screenshot `1.PNG` - P3 - M - right family `recall` (`reports_recall_reports_screen_view_only` / `reports_recall_reports_screen_full_control`) - cost_class interactive (background when `procedure_codes = all` and the span exceeds 92 days) - legacy output confidence DOCUMENTED (sample c. 2019)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Clinical staff, surgical assistant | Day after surgery or extraction days; as needed | Follow up patients after invasive treatment (call list per provider and code) |
| Office manager, provider | Month end, on demand | Count patients per procedure code and provider (how many implants, crowns, SRP quadrants were completed) |
| Hygiene coordinator | On demand | Patients who had a given code (for example D4341) in a period, to plan maintenance |

Vendor purpose: patients who had chosen codes **completed** in a date range; any code can be chosen, not only recallable
ones (research section 5, [P43][P44][P45]).

### Legacy output

Printed title `Procedural Recall - Provider` (DOCUMENTED, sample c. 2019; no `Office :` band in that sample).

| Element | Content |
|---|---|
| Group level 1 | `Provider - <Last, First> <short id> : <title>` (transaction provider) |
| Group level 2 | `Recall Code : <code>` |
| Detail columns, in order | `Patient Name` · `Pat ID` · `Chart #` · `Type` · `Homephone` (one cell, numbers prefixed `(H)` `(W)` `(C)`) · `First Visit` · `Proc. Date` · `Med. Alerts` |
| Provider totals | `Total Recalls [ <provider> ] : n` (detail rows) and `Total Patients With Recalls [ <provider> ] : n` (distinct patients) |
| Code subtotal, grand total | not shown in the sample [unverified]; DentC adds a grand total line (labelled, enhancement) |
| Footer | criteria echo `Procedure Date From` / `Thru`, `Offices`, `Providers`, codes, `Exclude Pat Type`, `* Excludes Inactive Patients` |

Quirks kept: a patient with several matching codes appears under each code (and twice under one code when the code was
completed twice in the range: one row per charge line); medical alerts print in full. Quirk fixed: none. Sign: no money
column. Row order inside a code band is not documented; DentC sorts by patient last name, first name, then `Proc. Date`
[I].

### Parameters - legacy parity

<!-- PARITY:recall_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot (`pdf` / `xlsx`; `csv` added). Rows unchanged |
| OFFICE/GROUP `Office` (default: working office) | `office_ids`: charges whose office of service `rpt_charges.office_id` is in the set; one `Office :` band per office when more than one |
| OFFICE/GROUP `Office Group` | `office_group_id`: every office of the group (picker default `ALL` = all groups the caller may read) |
| PROCEDURE DATE RANGE Start / End (default today / today) | `rpt_charges.service_date BETWEEN :date_from AND :date_to` (completion date printed as `Proc. Date`) |
| EXCLUDE PATIENT TYPE `None` (default) | No predicate |
| EXCLUDE PATIENT TYPE list | Drops patients having any selected type (`rpt_patient_dim.patient_type_codes` overlap); untyped patients kept unless `No Type Defined` is chosen |
| TRANSACTION PROVIDER `ALL` (default) | No predicate; every treating provider gets a band |
| TRANSACTION PROVIDER list | `rpt_charges.provider_id IN (:transaction_provider_ids)`; only those provider bands print |
| RECALL PROCEDURE CODES `ALL` (default) | Every completed procedure code (very long report; legacy behaviour kept, run may escalate to background) |
| RECALL PROCEDURE CODES list | `rpt_charges.procedure_code IN (:procedure_codes)`, any code, recallable or not |
| Age Range ticked (default) with From `0` / To `999` | No predicate (open bounds) |
| Age Range ticked with narrowed bounds | Age in whole years at the office-local today between `age_from` and `age_to` inclusive; patients without `dob` dropped |
| Age Range unticked | From / To disabled (inferred) and ignored |
| Include Inactive Patients unticked (default) | `rpt_patient_dim.is_active` only; footer `* Excludes Inactive Patients` |
| Include Inactive Patients ticked | Active and inactive patients; starred note not printed |
| (hidden legacy rule) | Accounts flagged Send to Collection dropped: `exclude_sent_to_collection = true` |

Dependency rules: `age_from`, `age_to` enabled when `age_range_enabled == true` (inferred); office picker follows the
mode radio (`recall_reports.r01.d01`); ADD / UPDATE MY FAVORITES (`recall_reports.r01.d02`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `exclude_sent_to_collection` | `boolean` | `true` | Family rule; unticked includes collection accounts |
| `procedure_category_codes` | `entity_multi` (`lookup:procedure_categories`) | `all` | Restrict by ADA category, for example Oral Surgery or Implant Services |
| `exclude_patients_with_future_appointment` | `boolean` (NEW, 04) | `false` | Ticked: drops patients who already hold a live future appointment (`rpt_patient_activity.next_appointment_date IS NOT NULL`) - the follow-up list of patients not yet back on the schedule |
| `group_by` | `enum` (NEW options): `provider_code` (legacy), `code_provider`, `code`, `provider` | `provider_code` | `code` gives the "patients per procedure code" count list across providers; legacy run = `provider_code` |
| `show_tooth_surface` | `boolean` | `false` | Adds `tooth`, `surface` columns (implant / extraction site follow-up) |
| `show_next_appointment` | `boolean` | `false` | Adds `next_appointment_date` |
| Saved view "Yesterday's surgery follow-up" | saved view | - | `date_preset = yesterday`, `procedure_category_codes` = oral surgery and implant categories |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_charges` (`charge_id`, `patient_id`, `account_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `surface`, `is_void`); `rpt_procedure_code_dim` (`code_category`); `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `middle_initial`, `patient_type_codes`, `phone`, `work_phone`, `cell_phone`, `dob`, `is_active`); `rpt_patient_activity` (`first_visit_date`, `next_appointment_date`); `rpt_patient_alerts` (`alert_label`, `is_active`; aggregated per patient with `string_agg` in a lateral, never joined row-wise); `rpt_account_dim` (`send_collections`); `rpt_provider_dim` (last, first, short id, title) |
| Date basis | `service_date` (fixed, `date_basis` declared on the definition) |
| Office / provider | Office of service; treating provider `rpt_charges.provider_id` (`provider_role = treating`) |
| Filters | `office_scope` -> `office_id IN`; dates -> `service_date BETWEEN`; `transaction_provider_ids` -> `provider_id IN`; `procedure_codes` -> `procedure_code IN`; `exclude_patient_type_codes` -> `NOT (patient_type_codes && :list)`; age -> computed from `dob`; `include_inactive_patients` -> `is_active`; `exclude_sent_to_collection` -> `NOT coalesce(send_collections, false)` |
| Grouping | provider -> code from the row keys (`provider_id`, `procedure_code`) |
| First Visit | `rpt_patient_activity.first_visit_date` (derived from visit-code charges; REPAIR(19) / DATA-19 maintains it) |
| Availability | Coverage matrix: **READY**. `Med. Alerts` needs `rpt_patient_alerts` (DATA-52, P1). Charges are live rows only (`is_void` excluded) |
| Migrated history | Complete for migrated charges; the 87,585 skipped source charges are missing until DATA-57 (caveat `charges_incomplete_migrated`). Medical alerts: 46,680 migrated rows, current state only (an alert added after the procedure prints too, as in the legacy tool) |

### Output

One block `main`, grain charge line.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name` | Patient Name | `text` | `phi_identified` | count (label `Total Recalls`) per provider and grand total |
| `patient_id` | Pat ID | `id` | `phi_identified` | count_distinct (label `Total Patients With Recalls`) per provider and grand total |
| `chart_no` | Chart # | `text` | `phi_identified` | - |
| `patient_type_codes` | Type | `text` | `phi_identified` | - |
| `phones` | Homephone | `text` | `phi_identified` | - (one cell `(H) n (W) n (C) n`; XLSX also `home_phone`, `work_phone`, `cell_phone`) |
| `first_visit_date` | First Visit | `date` | `phi_identified` | - |
| `service_date` | Proc. Date | `date` | `phi_identified` | - |
| `med_alerts` | Med. Alerts | `text` | `clinical` | - (`null_display` empty) |
| `tooth`, `surface` | Tooth, Surf | `text` | `phi_identified` | enhancement, `visible_when show_tooth_surface` |
| `next_appointment_date` | Next Appt | `date` | `phi_identified` | enhancement |
| group keys: `provider_label` (`Provider - {last}, {first} {short_id} : {title}`), `procedure_code` (`Recall Code : {procedure_code}`) | | `text` | `aggregate` | subtotals after the provider level only (legacy); code level header only |
| hidden: `charge_id` (`row_id_column`), `provider_id`, `office_id`, `account_id`, `patient_last_name`, `patient_first_name` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office when multi-office; levels per `group_by` (legacy `provider_code`). Sort: patient last name,
first name, `service_date`, `charge_id`. Page break: `page_break_by` `none` (default) / `group` (per provider, enhancement,
`layout`). Summary cards: `Procedures` (count), `Patients` (count_distinct `patient_id`). No metric reconciles.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar of distinct patients per procedure code (top 20), from the snapshot; none in PDF |
| Patient name | `record` patient -> patient overview (needs `phi_identified`) |
| Proc. Date | `record` ledger entry of `charge_id` -> patient ledger (ledger right) |
| Provider subtotal | `rows` of this report filtered to `transaction_provider_ids = [provider]` |
| Code header | `rows` filtered to `procedure_codes = [code]` |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open patient | row `navigate` | Patient overview |
| Follow-up call task | row / bulk `create_task` | Due tomorrow, assigned to the caller; text names code and date |
| Post-treatment text / e-mail | bulk `send_sms` / `send_email` | `requires` consent; one message per patient |
| Letter | bulk `letters` | Hand-off to Letters (PD-15) |
| Export selection | bulk `export_selection` | Export right |

Doubles as a worklist: partly - with `exclude_patients_with_future_appointment` it is a follow-up list; no live mode.

### Export and print

PDF `banded_table`, portrait, letterhead, provider and code bands, header row repeated, provider totals as two lines
(`Total Recalls`, `Total Patients With Recalls`), criteria echo in the footer, `Page n of m`. XLSX: sheet
`Procedural Recall`, one typed row per charge line with provider and code as columns (no merged bands), the three
phones as separate columns, criteria sheet. CSV: main block. Background: when escalated (all codes, span > 92 days).

### Open questions

| # | Question |
|---|---|
| Q1 | Whether the code band has its own count line and whether a grand total prints (page 1 of the sample only) |
| Q2 | Row order inside a code band |
| Q3 | Whether a code completed twice for one patient in the range prints twice (assumed: one row per charge line) |
| Q4 | Whether `Office :` banding exists in the current layout (absent in the c. 2019 sample) |
| Q5 | Whether `Med. Alerts` prints only active medical alerts or also free-text banner alerts (`alert_kind`) |

## Scheduled Recall Report - `recall.scheduled_recall_report`

Recall Reports, screenshot `2.PNG` - P3 - M - right family `recall` - cost_class interactive - legacy output confidence DOCUMENTED (sample 2026)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Hygiene coordinator | Weekly, before confirmation calls; on demand | See which recalls are already booked (code, date, time, provider) and spot stale due dates |
| Office manager | Month end | Booked recall volume per office for the coming period |

Vendor purpose: patients whose recall is already scheduled - the recall codes attached to the appointment with provider,
date and time (research section 5, [P42]).

### Legacy output

Printed title `Scheduled Recall Due` (DOCUMENTED, sample 2026).

| Element | Content |
|---|---|
| Group | `Office : <office>` |
| Patient line | `Patient Name` · `Pat ID` · `Chart #` · `Type` · `Pref Prdr` · `Pref Hyg` · `Phone#` · `First Visit` · `Last Visit` |
| Code line(s) | `Code : <code>` · `Recall Due : <date>` · `Scheduled Date : <date>` · `Time : <time>` · `Prdr : <appointment provider>` |
| Office totals | `Total Recalls for, <office> : n` and `Total Scheduled Recalls : n` |
| Grand totals | `Grand Total Recalls : n` and `Grand Total Scheduled Recalls : n` |

Two totals on a scheduled-only report suggest that the patient line lists every recall code of the patient, with the
schedule fields blank on codes that are not booked [I]. DentC prints all recall codes (within `recall_procedure_codes`)
of each qualifying patient; a patient qualifies when at least one code is exactly scheduled in the range; `Total Recalls`
= code lines, `Total Scheduled Recalls` = code lines with a scheduled date in the range. Kept quirk: a recall can be
scheduled long after its due date (sample: 18 months); `Recall Due` prints the stored or derived date unchanged. Fixed
quirk: the legacy overview kept an old scheduled date when the previous recall appointment was never checked out
([P49]); DentC reads the booked line, so a past appointment never shows as the scheduled recall.

### Parameters - legacy parity

<!-- PARITY:recall_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot. Rows unchanged |
| OFFICE/GROUP `Office` (default: working office) | `office_ids` -> `p_office_ids` of `rpt_recall_due()`: patients whose home office is in the set; `Office :` band per home office |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group |
| SCHEDULED DATE RANGE Start / End (default today / today) | Code lines whose exact booked appointment date (`scheduled_date`, `scheduled_basis = 'exact'`) is in the range; not the due date |
| EXCLUDE PATIENT TYPE `None` (default) / list | As family rule: patients with a selected type dropped |
| PREFERRED PROVIDER `ALL` (default) / list | `preferred_provider_id IN (...)` (patient value, else the provider of the last completed charge of that code) |
| PREFERRED HYGIENIST `ALL` (default) / list | `preferred_hygienist_id IN (...)`; NULL hygienists match only `ALL` |
| RECALL PROCEDURE CODES `ALL` (default) / list | `procedure_code IN (...)` on the recall item; limits both the qualifying and the printed code lines |
| Age Range ticked, 0 / 999 (default) | No predicate |
| Age Range narrowed / unticked | As in Procedural Recall |
| Include Inactive Patients unticked (default) / ticked | `patient_is_active` predicate and starred footer note; ticked removes both |
| (hidden legacy rule) | `NOT account_send_collections` (`exclude_sent_to_collection = true`); maintained recall rows with status `inactive` never print |

Dependency rules: `age_from`, `age_to` enabled when `age_range_enabled == true` (inferred); office picker rule
`recall_reports.r01.d01` and favorites rule `recall_reports.r01.d02` apply.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `exclude_sent_to_collection` | `boolean` | `true` | Family rule |
| `appointment_provider_ids` | `entity_multi` (`provider_role = appointment`) | `all` | Filter on the provider of the booked appointment (`Prdr`), for a hygienist's own booked recalls |
| `operatory_ids` | `entity_multi` | `all` | Operatory of the booked appointment (hygiene chairs) |
| `unconfirmed_only` | `boolean` (NEW, 04) | `false` | Keeps code lines whose appointment `rpt_appointment_facts.is_confirmed = false` - the recall confirmation call list |
| `show_unscheduled_codes` | `boolean` (NEW, 04) | `true` [I] | Unticked prints only the scheduled code lines; the default reproduces the assumed legacy layout (open question Q1) |
| `sort_by` | `enum`: `patient_last_name`, `scheduled_date` | `patient_last_name` [I] | Order of patients inside the office band |
| `show_overdue_at_booking` | `boolean` | `false` | Adds `days_booked_after_due` = `scheduled_date - due_date` (positive = booked late) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_recall_due()` called with `p_as_of` = office-local today, `p_office_ids` = resolved offices, `p_include_no_recall = false`, plus the scheduled-range arguments requested in RPT-RECALL-02 (`p_scheduled_from = date_from`, `p_scheduled_to = date_to`) so that past ranges return booked lines too; `rpt_appointment_facts` (`is_confirmed`, `operatory_id`) for the enhancements; `rpt_patient_dim`, `rpt_patient_activity` (`first_visit_date`, `last_visit_date`), `rpt_provider_dim` (short ids of preferred provider, hygienist, appointment provider) |
| Date basis | `scheduled_date` (fixed) |
| Office / provider | Patient home office (`rpt_recall_due().office_id`); preferred provider / hygienist; `Prdr` = `scheduled_provider_id` |
| Qualifying rule | Patient has a code line with `is_scheduled` and `scheduled_date BETWEEN :date_from AND :date_to`; code lines printed = all lines of the patient within `recall_procedure_codes` and `recall_status <> 'inactive'` (or only the qualifying ones when `show_unscheduled_codes = false`) |
| Filters | `exclude_patient_type_codes`, age, `include_inactive_patients` (`patient_is_active`), `exclude_sent_to_collection` (`account_send_collections`), preferred provider / hygienist on the function columns |
| Availability | Coverage matrix: **READY** (derived). Exact scheduling needs booked lines: app-era appointments in practice (6 % of migrated appointments have lines). Preferred provider / hygienist are not migrated (derived provider fallback, no hygienist). Maintained recall rows: SCHEMA(41) / DATA-41 |
| Migrated history | A recall booked on a migrated appointment without booked lines is not scheduled and does not print (`availability` entry `recall_booking_lines_missing_migrated`); due dates of migrated patients are derived from procedure history and the code interval (units unverified until check #22) |

### Output

One block `main`, grain (patient, recall code); PDF prints the patient columns once as the patient line.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name` | Patient Name | `text` | `phi_identified` | - (patient line) |
| `patient_id` | Pat ID | `id` | `phi_identified` | count_distinct per office and grand total (enhancement line `Patients`) |
| `chart_no` | Chart # | `text` | `phi_identified` | - |
| `patient_type_codes` | Type | `text` | `phi_identified` | - |
| `preferred_provider_short_id` | Pref Prdr | `text` | `aggregate` | - (suffix `*` when `preferred_provider_source = derived`) |
| `preferred_hygienist_short_id` | Pref Hyg | `text` | `aggregate` | - |
| `phone` | Phone# | `text` | `phi_identified` | - (home phone, else cell [I]) |
| `first_visit_date`, `last_visit_date` | First Visit, Last Visit | `date` | `phi_identified` | - |
| `procedure_code` | Code | `text` | `phi_identified` | count (label `Total Recalls for, {office_name}` / `Grand Total Recalls`) |
| `due_date` | Recall Due | `date` | `phi_identified` | - |
| `scheduled_date` | Scheduled Date | `date` | `phi_identified` | count of non-null in range (label `Total Scheduled Recalls` / `Grand Total Scheduled Recalls`) |
| `scheduled_time` | Time | `time` | `phi_identified` | - |
| `scheduled_provider_short_id` | Prdr | `text` | `aggregate` | - |
| `days_booked_after_due` | Days Late | `integer` | `phi_identified` | enhancement |
| hidden: `row_id` (`patient_id:procedure_code`), `scheduled_appointment_id`, `office_id`, `preferred_provider_id`, `preferred_hygienist_id`, `scheduled_provider_id`, `source`, `patient_last_name` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office (always printed, as in the sample); level `patient` (`key_columns = [patient_id]`, header =
patient line, no subtotal). Sort: per `sort_by`, then code. Page break: `none` / `office` (layout, enhancement). Summary
cards: `Recalls` (count), `Scheduled recalls` (count of `scheduled_date`), `Patients` (count_distinct). Related metric
(not a reconciliation): `hygiene_pre_appointment_pct`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Column chart of scheduled recalls per week of `scheduled_date` |
| Patient name | `record` patient -> patient overview |
| Scheduled Date | `record` appointment `scheduled_appointment_id` -> Scheduler opened on that appointment (route_key `appointment`) |
| Code | `record` patient recall screen (route_key `patient_recalls`, NEW for 07) |
| Office total | `rows` filtered to the office |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Open appointment | row `navigate` | Scheduler on the booked appointment |
| Confirmation text / e-mail | bulk `send_sms` / `send_email` | Message type `appointment_reminder`; consent exclusions |
| Edit recall | row `navigate` | Patient recall screen (clear a stale due date) |
| Export selection | bulk `export_selection` | Export right |

Doubles as a worklist: no (a booked-schedule list); with `unconfirmed_only` it feeds confirmation calls.

### Export and print

PDF `banded_table` with the patient-line group header (needs `header_columns[]`, RPT-RECALL-15), portrait, office bands,
office and grand totals as two count lines each, criteria echo footer. XLSX: sheet `Scheduled Recall`, one row per code
line with every patient column repeated (no merged patient line), criteria sheet. CSV: main block. Background: not needed.

### Open questions

| # | Question |
|---|---|
| Q1 | Does the patient line list unscheduled codes too (explains the two totals) or only scheduled ones |
| Q2 | Which phone `Phone#` prints (home, cell, or the preferred contact) |
| Q3 | Behaviour for a past SCHEDULED DATE RANGE (appointments already completed: does the legacy tool still list them) |
| Q4 | Whether `Prdr` is the appointment provider or the provider on the booked line (`rpt_appointment_procedures.provider_id`) |
| Q5 | Office of the band: patient home office (assumed) or office of the booked appointment (family F2) |

## Recall Due Report - `recall.recall_due_report`

Recall Reports, screenshot `3.PNG` - P3 - L - right family `recall` - cost_class interactive (background when more than 20 offices or `recall_date_mode = no_recall_date` across an office group) - legacy output confidence DOCUMENTED (sample 2022; totals not visible)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office, hygiene coordinator | Daily; weekly call sessions | Call patients whose recall is due or overdue and not booked (`Not Scheduled`) |
| Office manager | Around the 15th for the following month | Recall postcard and reminder batches (vendor postcard service: due and not scheduled next month) |
| Office manager | Month end | Size of the overdue pool per office and hygienist |

Old menu name `Recall Due/Overdue but Not Scheduled Report` = this report with `Not Scheduled` (alias in `legacy_names[]`).

### Legacy output

Printed title `Recall Due` (DOCUMENTED, sample 2022).

| Element | Content |
|---|---|
| Group | `Office : <office>` |
| Patient line | `Patient Name (Chart#)` · `Pat ID` · `Type` · `Carrier (Primary)` · `Pref Prdr` · `Pref Hyg` · `Phone#` · `First Visit` · `Last Visit` |
| Code line(s) | `Code : <code>` · `Recall Due : <date>` · `Scheduled Date :` · `Time :` · `Prdr :` (blank when not scheduled) |
| Totals | not visible in the sample (page 1 of 2); DentC prints `Total Recalls for, <office> : n` / `Total Scheduled Recalls : n` and the grand totals as on `Scheduled Recall Due` [unverified] |

Quirks kept (research section 5): a patient booked without the recall code on the appointment lists as not scheduled;
evaluation per code; stale codes after a code change (child -> adult prophylaxis) print until cleared. Fixed only on
request: `collapse_code_family` (enhancement). The 2022 sample places the chart number inside the name cell and adds
`Carrier (Primary)`; the 2026 Scheduled Recall layout differs (research section 10 #8) - DentC follows each sample.

### Parameters - legacy parity

<!-- PARITY:recall_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot. Rows unchanged |
| OFFICE/GROUP `Office` (default) / `Office Group` | `p_office_ids` of `rpt_recall_due()` = patients whose home office is in the resolved set; band per home office |
| RECALL DATE RANGE `Recall Date Range` (default) with Start / End today | Code lines with `due_date BETWEEN :date_from AND :date_to` (future range = upcoming, past range = overdue); dates enabled |
| RECALL DATE RANGE `No Recall Date` | `due_date IS NULL`: maintained recall rows without a due date plus one `none` line per patient who has no recall at all (`p_include_no_recall = true`; printed `Code : (none)`); dates disabled [unverified meaning, to confirm] |
| EXCLUDE PATIENT TYPE `None` (default) / list | Family rule |
| PREFERRED PROVIDER `ALL` (default) / list | `preferred_provider_id IN (...)` (patient value, else provider of the last completed charge of the code) |
| PREFERRED HYGIENIST `ALL` (default) / list | `preferred_hygienist_id IN (...)` |
| RECALL PROCEDURE CODES `ALL` (default) | Every recall code; `none` lines (No Recall Date) are kept only under `ALL` [I] |
| RECALL PROCEDURE CODES list | `procedure_code IN (...)`; vendor advice: anchor codes (D1110, D1120) |
| SCHEDULED/NOT SCHEDULED `ALL` (default) | Both; scheduled lines show date, time, `Prdr` |
| SCHEDULED/NOT SCHEDULED `Scheduled` | `is_scheduled = true` (a live future appointment from today carries that code) |
| SCHEDULED/NOT SCHEDULED `Not Scheduled` | `is_scheduled = false` - the working list |
| Age Range ticked 0 / 999 (default), narrowed, unticked | As in Procedural Recall; reference date = office-local today |
| Include Inactive Patients unticked (default) / ticked | `patient_is_active` and the starred footer note; ticked removes both |
| (hidden legacy rule) | `NOT account_send_collections`; recall rows with status `inactive` never print |

Dependency rules: `date_from`, `date_to` enabled when `recall_date_mode == recall_date_range` (inferred, filter card 9.6;
disabled value = default today / today, so No Recall Date runs are cached once); `age_from`, `age_to` enabled when
`age_range_enabled == true` (inferred); rules `recall_reports.r01.d01`, `recall_reports.r01.d02` apply.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `exclude_sent_to_collection` | `boolean` | `true` | Family rule |
| `overdue_band` | `enum_multi` (same key and values as `worklists.recall_due`, 06 section 6.6: 0-30, 31-90, 91-180, over 180 days overdue) | empty = no restriction | Days overdue = office-local today - `due_date`; only lines past due |
| `exclude_patients_with_any_future_appointment` | `boolean` (NEW, 04) | `false` | Drops lines with `has_any_future_appointment` - removes quirk (1) for callers who want only patients with no appointment at all |
| `collapse_code_family` | `boolean` (NEW, 04) | `false` | Treats the members of one code group (`prophy` D1110 / D1120, `exam_recare` D0120 / D0145) as one recall: the latest completion of any member sets the due date and a booked line of any member schedules it - removes the stale-code quirk |
| `not_contacted_within` | `integer` days (06 key; needs DASH-28) | empty | Drops patients with a logged recall outreach in the last n days |
| `include_patient_balance` | `boolean` (shared, 3.4) | `false` (no legacy control on this report; shared default `true` not used so the legacy columns stay unchanged) | Adds the patient balance from the canonical ledger layer |
| `show_remaining_benefits` | `boolean` (NEW, 04) | `false` | Adds `Ind Max Rem` of the primary dental coverage (`rpt_benefit_usage()`, P2) - "benefits left this year" for the call script |
| `group_by` | `enum`: `none` (office band only), `preferred_hygienist`, `preferred_provider`, `procedure_code` | `none` | Hygienist call lists with a count per band |
| `sort_by` | `enum`: `patient_last_name`, `due_date`, `chart_no` | `patient_last_name` [I] | Order of patients inside the band |
| Saved views | saved view | - | "Overdue, not scheduled" (`date_preset` custom `-24 months` .. `yesterday`, `not_scheduled`); "Due next month" (`next_month`, `not_scheduled`) for postcards |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_recall_due(:tenant_id, :office_local_today, :office_ids, :include_no_recall)` (all columns of data card 2.24); `rpt_patient_dim` (`chart_no`, names, `patient_type_codes`, `phone`, `cell_phone`, `dob`, consent flags); `rpt_patient_activity` (`first_visit_date`, `last_visit_date`); `rpt_insurance_coverage` (primary dental slot: `carrier_name` where `tier = 'primary'`, `category = 'dental'`, one row per patient through `LATERAL ... LIMIT 1`); `rpt_provider_dim`; `rpt_benefit_usage()` for the enhancement |
| Date basis | `recall_due_date` (fixed) |
| Office / provider | Patient home office; preferred provider (with derived fallback) and hygienist |
| Filters | `recall_date_mode` + dates -> `due_date BETWEEN` or `due_date IS NULL`; `scheduled_status` -> `is_scheduled`; `recall_procedure_codes` -> `procedure_code IN` (and `none` lines only under `all`); patient type, age, inactive, collection as the family rules; `recall_status <> 'inactive'` always |
| Availability | Coverage matrix: **READY** (derived). Interval units to verify (data card section 6 #22, warning `recall_interval_units_unverified`); `No Recall Date` also lists patients without any recall; maintained rows SCHEMA(41). `Carrier (Primary)`: today's coverage, migrated tiers right only after the slot repair (data card 2.21) |
| Migrated history | Every migrated recall is derived: due = last completed charge of the code + code interval. Patients whose recall lived only in the legacy RECALLS grid (manually set due dates) are not reproduced; booked lines missing on migrated appointments make such recalls `Not Scheduled` |

### Output

One block `main`, grain (patient, recall code), patient line as group header in PDF.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name_chart` | Patient Name (Chart#) | `text` | `phi_identified` | - (patient line) |
| `patient_id` | Pat ID | `id` | `phi_identified` | count_distinct per band and grand total (line `Patients`, enhancement) |
| `patient_type_codes` | Type | `text` | `phi_identified` | - |
| `primary_carrier_name` | Carrier (Primary) | `text` | `phi_identified` | - |
| `preferred_provider_short_id`, `preferred_hygienist_short_id` | Pref Prdr, Pref Hyg | `text` | `aggregate` | - (`*` = derived provider) |
| `phone` | Phone# | `text` | `phi_identified` | - |
| `first_visit_date`, `last_visit_date` | First Visit, Last Visit | `date` | `phi_identified` | - |
| `procedure_code` | Code | `text` | `phi_identified` | count (`Total Recalls for, {office_name}`; `Grand Total Recalls`) |
| `due_date` | Recall Due | `date` | `phi_identified` | - (`null_display` blank) |
| `scheduled_date`, `scheduled_time` | Scheduled Date, Time | `date`, `time` | `phi_identified` | count of non-null `scheduled_date` (`Total Scheduled Recalls`) |
| `scheduled_provider_short_id` | Prdr | `text` | `aggregate` | - |
| `days_overdue` | Days Overdue | `integer` | `phi_identified` | max per band (enhancement, default hidden) |
| `recall_status` | Status | `enum` | `phi_identified` | enhancement (`overdue`, `due`, `not_due`, `scheduled`, `no_due_date`) |
| `patient_balance` | Pat Balance | `money` | `financial_patient` | enhancement, no total |
| `ind_max_remaining` | Ind Max Rem | `money` | `financial_patient` | enhancement, no total |
| hidden: `row_id`, `office_id`, `source`, `scheduled_appointment_id`, `preferred_provider_id`, `preferred_hygienist_id`, `account_id`, `patient_last_name` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office (always); optional `group_by` level; level `patient` (header = patient line). Sort per
`sort_by`, then `due_date`, code. Page break `none` / `office` / `group` (layout). Summary cards: `Recalls` (count),
`Scheduled` (count of `scheduled_date`), `Patients` (count_distinct). `reconciles_with`: with `date_to = yesterday`, an
open `date_from`, `scheduled_status = not_scheduled` and the metric's code group, count_distinct `patient_id` =
`recall_overdue_patients` (05 section 5.5); with today .. today + 30 added, = `recall_due_unscheduled_patients`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar of recall lines by `overdue_band` and scheduled / not scheduled |
| Patient name | `record` patient -> patient overview |
| Code | `record` patient recall screen (route_key `patient_recalls`) |
| Scheduled Date | `record` appointment -> Scheduler on the appointment |
| Band / office count | `rows` of this report filtered to the band |
| Hygienist band | `report` `recall.scheduled_recall_report` with `preferred_hygienist_ids = [hygienist]`, next 30 days |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Book recall | row `navigate` | Scheduler booking hand-off with patient, preferred hygienist and the row's code(s) seeded as booked lines |
| Recall text / e-mail | bulk `send_sms` / `send_email` | Message type `recall`; consent exclusions counted; one message per patient |
| Postcards, labels, letters | bulk `postcards` / `labels` / `letters` | Hand-off to the correspondence features (PD-15) |
| Log outcome, assign | row / bulk `create_task` (worklist follow-up after DASH-28) | |
| Edit recall | row `navigate` | Clear a stale due date or make the recall inactive |
| Open as worklist | `navigate` to `worklists.recall_due` with the same office, codes and range | Live paging and follow-ups live there (06 section 6.6) |
| Export selection | bulk `export_selection` | Export right |

Doubles as a worklist: yes - its print counterpart is `worklists.recall_due`; this report stays a snapshot list.

### Export and print

PDF `banded_table` with patient-line group header (RPT-RECALL-15), portrait, office bands, count lines, criteria echo
footer with `* Excludes Inactive Patients`. XLSX: sheet `Recall Due`, one row per code line, patient columns repeated,
`chart_no` as its own column (not inside the name), criteria sheet. CSV: main block (mail-merge use). Background: above
the escalation threshold.

### Open questions

| # | Question |
|---|---|
| Q1 | Meaning of `No Recall Date` (patients with no recall at all, or recall codes without a due date) and whether the dates grey out |
| Q2 | Totals of the printed report (page 2 of the sample was not seen) |
| Q3 | Whether `Scheduled` counts an appointment booked today or only after today |
| Q4 | Whether recall rows marked inactive and patients with a cleared due date ever print |
| Q5 | Primary carrier source: dental primary only, or medical when no dental coverage |

## Post-Op Report - `recall.post_op_report`

Recall Reports, screenshot `4.PNG` - P3 - S - right family `recall` - cost_class instant - legacy output confidence DOCUMENTED (sample 2020)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Clinical staff, assistants | Daily, for the previous day | Post-operative check-in calls to patients who had flagged procedures (extractions, implants, endodontics, perio surgery) |
| Provider | On demand | Own post-op follow-ups by transaction provider |

### Legacy output

Printed title `Post-Op Report` (DOCUMENTED, sample 2020; no `Office :` band in that sample).

| Element | Content |
|---|---|
| Group | `Provider - <Last, First> <short id> : <title>` (transaction provider) |
| Columns, in order | `Patient Name` · `Pat ID` · `HomePhone` · `WorkPhone` · `CellPhone` · `Referral` · `Procedure` -> `Date` · `Code` · `Description` · `Amount` |
| Totals | `Total Patients : n` (per provider band [I: placement not stated]) |
| Footer | `Procedure Date From` / `Thru`, `Providers`, `Exclude Pat Type`, `* Excludes Inactive Patients` |

Population fixed by the code flag `Post-Op` in Procedure Code Setup; nothing prints until codes are flagged. `Referral` =
the patient's referral source [unverified]. `Amount` = posted fee of the line (PD-1 parity: `charged_fee`), positive for
charges; a negative migrated line prints with a minus sign. One row per post-op procedure line; a patient with two
flagged lines prints two rows and counts once in `Total Patients`.

### Parameters - legacy parity

<!-- PARITY:recall_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot. Rows unchanged |
| OFFICE/GROUP `Office` (default) / `Office Group` | `office_ids` / `office_group_id` on the office of service `rpt_charges.office_id` |
| PROCEDURE DATE RANGE Start / End (default today / today) | `rpt_charges.service_date BETWEEN :date_from AND :date_to` |
| EXCLUDE PATIENT TYPE `None` (default) / list | Family rule |
| TRANSACTION PROVIDER `ALL` (default) / list | `rpt_charges.provider_id IN (...)`; one band per provider |
| Include Inactive Patients unticked (default) / ticked | Active patients only and the starred footer note / all patients without the note |
| (fixed population, no control) | `rpt_procedure_code_dim.is_post_op = true` |
| (hidden legacy rule) | `exclude_sent_to_collection = true` (stated for all recall reports; to confirm here, F1) |

Dependency rules: none beyond the family rules `recall_reports.r01.d01`, `recall_reports.r01.d02`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `exclude_sent_to_collection` | `boolean` | `true` | Family rule |
| `procedure_codes` | `entity_multi` (option source limited to `is_post_op` codes) | `all` | Narrow to some post-op codes (for example implants only) |
| `include_hygienist_lines` | `boolean` (NEW, 04) | `false` | Also attributes a line to `rpt_charges.hygienist_id` (app era) so a hygienist's perio surgery follow-ups appear under the hygienist |
| `not_contacted_within` | `integer` days (06 key; needs DASH-28) | empty | Hides patients whose follow-up call was already logged |
| `show_next_appointment` | `boolean` | `false` | Adds `next_appointment_date` (post-op visit booked?) |
| `sort_by` | `enum`: `patient_last_name`, `service_date` | `patient_last_name` [I] | Row order inside the provider band |
| Saved view "Yesterday's post-op calls - my offices" | saved view | - | `date_preset = yesterday`, `office_ids = @my_offices` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_charges` (`charge_id`, `patient_id`, `account_id`, `office_id`, `provider_id`, `hygienist_id`, `service_date`, `procedure_code`, `charged_fee`); `rpt_procedure_code_dim` (`is_post_op`, `description`); `rpt_patient_dim` (names, `phone`, `work_phone`, `cell_phone`, `referral_source_name`, `referred_by_raw`, `patient_type_codes`, `is_active`); `rpt_account_dim` (`send_collections`); `rpt_provider_dim`; `rpt_patient_activity` (`next_appointment_date`, enhancement) |
| Date basis | `service_date` (fixed) |
| Office / provider | Office of service; treating provider (`provider_role = treating`) |
| Referral | `coalesce(referral_source_name, referred_by_raw)` (free text on app patients until DATA-40) |
| Availability | Coverage matrix: **READY**; returns rows once the office flags its post-op codes (`procedure_codes.is_post_op` exists and is false on every code - setup, not schema; RPT-RECALL-08 warns) |
| Migrated history | Works for migrated charges once codes are flagged (the flag is read at run time, not stamped on the charge) |

### Output

One block `main`, grain charge line.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name` | Patient Name | `text` | `phi_identified` | - |
| `patient_id` | Pat ID | `id` | `phi_identified` | count_distinct (label `Total Patients`) per provider and grand total |
| `home_phone`, `work_phone`, `cell_phone` | HomePhone, WorkPhone, CellPhone | `text` | `phi_identified` | - |
| `referral_label` | Referral | `text` | `phi_identified` | - |
| `service_date` | Date | `date` | `phi_identified` | - (column group `Procedure`) |
| `procedure_code` | Code | `text` | `phi_identified` | - |
| `procedure_description` | Description | `text` | `phi_identified` | - |
| `amount` | Amount | `money` (`negative: minus`) | `financial_patient` | none (legacy prints no money total) |
| `next_appointment_date` | Next Appt | `date` | `phi_identified` | enhancement |
| group key `provider_label` | `Provider - {last}, {first} {short_id} : {title}` | `text` | `provider_comp` (security card 5.2 rule 3; F7 proposes `aggregate`) | subtotal `Total Patients` |
| hidden: `charge_id` (`row_id_column`), `provider_id`, `office_id`, `account_id`, `patient_last_name` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office when multi-office; level provider. Sort per `sort_by`, then `service_date`, `charge_id`.
Page break `none` / `group` (per provider, layout enhancement). Summary cards: `Patients` (count_distinct), `Procedures`
(count). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a call list |
| Patient name | `record` patient -> patient overview |
| Date / Code | `record` ledger entry -> patient ledger (ledger right) |
| Provider total | `rows` filtered to the provider |
| Code | `report` `recall.procedural_recall_report` with `procedure_codes = [code]` and the same dates and offices |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Call outcome / follow-up task | row / bulk `create_task` | Logged against the patient; feeds `not_contacted_within` after DASH-28 |
| Post-op check text | bulk `send_sms` | Message type `post_op_check` (NEW for the SMS feature); consent exclusions |
| Open patient / progress notes | row `navigate` | Chart for the call note |
| Export selection | bulk `export_selection` | Export right |

Doubles as a worklist: yes, daily call list (snapshot); scheduled delivery of the "yesterday" view at 07:00 office time
with a login-gated link (PD-12).

### Export and print

PDF `banded_table`, landscape (eleven columns), provider bands, `Total Patients` per band and grand total, criteria echo
footer. XLSX: sheet `Post-Op`, one typed row per line, provider as a column, criteria sheet. CSV: main block. Background:
never needed.

### Open questions

| # | Question |
|---|---|
| Q1 | Placement of `Total Patients` (per provider and / or grand) |
| Q2 | What `Referral` prints (referral source name, referral type, or referring provider) |
| Q3 | Whether `Amount` is the posted fee or the UCR fee |
| Q4 | Whether one patient with two post-op lines prints two rows or one row with a procedure sub-list |

<!-- WORK-ITEMS -->
| RPT-RECALL-10 | Definition `recall.procedural_recall_report`: provider and code levels, `procedure_codes` over every code, med-alert lateral, phones cell, totals, escalation rule | P3 | M | RPT-RECALL-01, DATA-06, DATA-19, DATA-52, ENG-11, ENG-23 | Fixture: two patients with D7210 under one provider print `Total Recalls 3` / `Total Patients With Recalls 2` when one patient had it twice; a caller without `clinical` gets the rows without `Med. Alerts`; a Send-to-Collection account is absent by default and present when unticked |
| RPT-RECALL-11 | Procedural Recall enhancements: `procedure_category_codes`, `exclude_patients_with_future_appointment`, `group_by` variants, tooth / surface, actions (task, text, letter) | P3 | S | RPT-RECALL-10, RPT-RECALL-05 | With `group_by = code` the per-code distinct patient counts equal the provider-level counts summed over providers minus patients seen by two providers; ticking the future-appointment filter drops a booked fixture patient |
| RPT-RECALL-12 | Definition `recall.scheduled_recall_report` on `rpt_recall_due()` with the scheduled-range arguments, qualifying rule, `show_unscheduled_codes`, appointment provider / operatory / unconfirmed filters | P3 | M | RPT-RECALL-01, RPT-RECALL-02, RPT-RECALL-15, ENG-59 | Fixture: D1110 booked in range and D0274 unbooked print as two code lines, `Total Recalls 2`, `Total Scheduled Recalls 1`; a patient booked in range without the code on the appointment is absent |
| RPT-RECALL-13 | Definition `recall.recall_due_report`: both `recall_date_mode` branches, `scheduled_status`, primary carrier lateral, totals, `reconciles_with` the two recall metrics | P3 | L | RPT-RECALL-01, RPT-RECALL-02, RPT-RECALL-15, DATA-21, ENG-59 | Default today / today lists only lines due today; `No Recall Date` lists a patient without any recall-code history once with `Code : (none)` and disables the dates; `Not Scheduled` drops a line whose code is booked tomorrow and keeps a line whose patient is booked without the code; metric reconciliation passes on the fixture |
| RPT-RECALL-14 | Recall Due enhancements: `overdue_band`, `collapse_code_family`, `exclude_patients_with_any_future_appointment`, `include_patient_balance`, `show_remaining_benefits`, `group_by`, `sort_by`, booking hand-off with seeded codes, postcards / labels hand-off, worklist link | P3 | M | RPT-RECALL-13, RPT-RECALL-05, DATA-32, MET-03, DASH-34 | With `collapse_code_family` a patient with D1120 completed 2 years ago and D1110 completed 5 months ago is one line due in 1 month; booking from the row with the seeded code makes the line `Scheduled` on re-run |
| RPT-RECALL-15 | Request to 02 and implementation: group header printing declared hidden columns of the group's first row (`header_columns[]`) for the patient line + code lines layout in PDF and on screen | P3 | S | ENG-11, ENG-23, UX-17 | Scheduled Recall and Recall Due PDFs print the patient line once and its code lines beneath; XLSX repeats the patient columns on every row; no merged cells |
| RPT-RECALL-16 | Definition `recall.post_op_report`: `is_post_op` population, provider band with `Total Patients`, referral label, amount, setup-readiness warning, data-class decision of F7 | P3 | S | RPT-RECALL-01, RPT-RECALL-08, DATA-04, DATA-06 | Fixture: D7140 flagged post-op completed yesterday by two patients under one provider prints `Total Patients 2`; an unflagged D7140 run returns zero rows with `post_op_codes_not_flagged`; `amount` absent for a caller without `financial_patient` |
| RPT-RECALL-17 | Post-Op call-list actions and scheduled "yesterday" view: `create_task` outcome, `send_sms` type `post_op_check`, `not_contacted_within` once DASH-28 exists, schedule at 07:00 office time | P3 | S | RPT-RECALL-16, ENG-43, ENG-44, ENG-49, DASH-28 | A logged call hides the patient with `not_contacted_within = 2`; the scheduled delivery carries only a login-gated link |
<!-- /WORK-ITEMS -->
