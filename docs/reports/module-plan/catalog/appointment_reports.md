# Appointment Reports - report specifications

Operational appointment lists of the legacy Appointment Reports menu (9 reports, 93 legacy controls, 2 of them from vendor
documentation): confirmation, call, pull-chart, cancellation and missed lists, schedule clean-up, new-patient placeholders,
lab cases and lab cost, the SmartAssist checklist, vendor confirmations, patient-flow time stamps and the general
appointment listing. Hub area **Scheduling** (brief section 1), category key `appointment`, category page
`/reports/c/appointment` (07). Default phase **P3**; no report of the family needs another phase (every DATA item the
coverage matrix names lands in P1 or P3).

## Overview

Legacy order. Size: S up to 2 days, M up to 1 week, L up to 2 weeks (brief section 4). Availability = rating of the default
run in `coverage_matrix.md` 11.1 (rows 43a-51); options that need more are named in the last column of that table and in
each report section. Confidence = research rating in `research/legacy_report_outputs_appointment_recall_referral.md` section 2.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `appointment.appointment_list` | Appointment List | Family of six appointment lists chosen by `report_type`: confirmation calls, call list, pull charts, cancelled, cancelled from automated campaigns, missed | P3 | L | READY (default `confirmation_call_list`); `call_list` and `cancelled_from_automated_campaigns` SCHEMA(17); `cancellation_reason_codes` SCHEMA(17); `include_off_call_list` SCHEMA(NEW `appointments.call_list_removed_at`, owner 03); `exclude_resp_party_type_codes` SCHEMA(53) | DOCUMENTED for `cancelled_list` and `cancelled_from_automated_campaigns`; PARTIALLY DOCUMENTED for `call_list`, `missed_list`; INFERRED for `confirmation_call_list`, `pull_chart_list` |
| `appointment.missed_appointments_not_marked_as_missed` | Missed Appointments Not Marked As Missed | Past appointments with no same-day visit-code charge whose status was never set to Missed (schedule-ledger clean-up) | P3 | S | READY; `exclude_resp_party_type_codes` SCHEMA(53) | INFERRED (no vendor output; layout assumed to follow Appointment Cancellation List) |
| `appointment.new_patients_via_appointments` | New Patients via Appointments | Appointments booked for quick-save placeholder patients or without a patient record, so registration is finished before the visit | P3 | S | SCHEMA(44) (interim placeholder rule of 03 2.7 over-counts until `registration_status` exists) | PARTIALLY DOCUMENTED (purpose); layout INFERRED |
| `appointment.lab_report` | Lab Report | Appointments carrying a lab case, four variants by `report_type`: all, not sent, sent not received, due date | P3 | M | READY; `exclude_resp_party_type_codes` SCHEMA(53) | DOCUMENTED for `not_received`; PARTIALLY DOCUMENTED for the other three |
| `appointment.smartassist_report_card` | SmartAssist Report Card | Per-appointment compliance checklist against the office's SmartAssist setup, with a completion percentage row | P3 | M | READY; consent columns SCHEMA(54); `Checked In By / Out By` SCHEMA(17); consent, medical-history and eligibility checks APP | DOCUMENTED (`detail`); INFERRED (`summary`) |
| `appointment.appointments_confirmed_via_vendors` | Appointments Confirmed Via Vendors | Appointments whose confirmation was written back by a third-party vendor, per vendor | P3 | M | SCHEMA(17) (no vendor or confirmation channel stored in either era; `confirmation_vendors` source NEW) | INFERRED |
| `appointment.appointment_time_stamps` | Appointment Time Stamps | Patient flow per appointment: reception, available, operatory and check-out times with three durations | P3 | M | SCHEMA(17) (only check-in and check-out stamps exist; `Available`, `In Operatory` and the durations need events) | DOCUMENTED (columns, vendor text); page layout not seen |
| `appointment.appointment_detail` | Appointment Detail | General appointment listing: day schedule, monthly counts, appointments created by a user or on a date, AppointNow bookings | P3 | L | READY; Created On Date and User APP; `only_appointnow_appointments` APP; `appoint_now_api` and the cancellation reason SCHEMA(17) | DOCUMENTED (samples 2013, 2023, 2026) |
| `appointment.lab_cost_report` | Lab Cost Report | Lab cases of a period with charges and lab cost per lab, on a selectable lab date basis | P3 | S | READY (existing lab cost endpoint is the first adapter); `exclude_resp_party_type_codes` SCHEMA(53) | DOCUMENTED (samples 2022, 2024) |

## Shared rules

### Shared parameters and defaults

Every key is a parameter of `filter_card.md` section 3 or a report key of the parity file; values are the legacy defaults
(AD-8). Exactly as in `catalog/parity/appointment_reports.parity.json` (PARITY VALID, 93 controls).

| Parameter (type) | Reports | Default | Family rule |
|---|---|---|---|
| `output_format` (`enum`: `pdf`, `xlsx`, added `csv`) | all 9 | `pdf` | `role: output`; never changes the rows. On Appointment List the section sits above the captured area (vendor documentation, `appointment_reports.r01.x01`); its legacy default is not stated and `pdf` is the default of the other eight |
| `office_scope` (`office_scope`) | all 9 | `working_office` (mode `office`) | Mode `office_group` fills `office_group_id` / `office_group_ids` (rule `appointment_reports.r01.d03`, valid for the whole family). Applied to the appointment office |
| `provider_ids` (`entity_multi`, `lookup:providers`) | r01, r02, r04, r05, r07, r08, r09 | `all` | Role `appointment`: `rpt_appointment_facts.provider_id` (`rpt_lab_cases.provider_id` on r04, r09). Roster-first, never scoped by `providers.office_id`. r03 and r06 have no provider control |
| `date_range` (`date_range`: `date_from`, `date_to`, `date_preset`) | all 9 | `today` / `today` (office-local, AD-9) | Basis fixed to `appointment_date` (04 7.2) except r08 (`date_basis`: `appointment_date` / `created_date`) and r09 (`date_basis`: `appointment_date` / `lab_sent_date` / `lab_due_date` / `lab_received_date`, legacy title REPORT TYPE). r02, r03, r06, r07: basis inferred (04 7.2 rows 2-5) |
| `exclude_patient_type_codes` (`entity_multi`, `definitions:patient_type`) | r01, r02, r04, r09 | `none` | Exclude; patients without a type kept; `no_type_defined` drops untyped patients. Greyed on r01 with `confirmation_call_list` |
| `exclude_resp_party_type_codes` (`entity_multi`, `definitions:resp_party_type`) | r01, r02, r04, r09 | `none` | Exclude on `rpt_account_dim.resp_party_type` of the patient's current account; rows without a type kept. Empty for self-guarantor accounts until DATA-53 (SCHEMA(53)): the run returns the availability warning |
| `include_patient_balance` (`boolean`) | r01 (Include Patient Balance), r02 (Show Patient Balance) | `true` | `role: query` (adds the balance column). Printed `Curr Bal` / `Bal:` |
| `include_cancelled_appointments` (`boolean`) | r05, r08 | `false` | `false` = cancelled appointments left out; missed ones stay in (r08) |
| `operatory_ids` (`entity_multi`, `lookup:operatories`) | r01, r08 | `all` | Include on `rpt_appointment_facts.operatory_id` |
| `cancellation_reason_codes` (`entity_multi`, `lookup:cancellation_reasons`) | r01, r08 | `all` | Include on the reason of cancelled rows only. r01: greyed with `confirmation_call_list` (our capture), enabled with `cancelled_list` (vendor screenshot, d02); r08: greyed while Include Cancelled Appointments is unticked. Nothing to match before DATA-17 (reason not persisted, none migrated) |
| `lab_ids` (`entity_multi`, `lookup:labs`) | r04, r09 | `all` | Include on `rpt_lab_cases.lab_vendor_id`; also the first group level under the office |
| `report_type` / `report_format` (`enum`) | r01, r04 (`report_type`); r05 (`report_format`) | `confirmation_call_list`, `appointment_list`, `detail` | `report_type` selects population, columns and printed title (`title_templates`); `report_format` selects the grain |

Parameters of one report only (`appointment_statuses`, `appointment_length`, `include_off_call_list`, `sort_by`, `due_date`,
`include_missed_appointments`, `vendor_codes`, `appointment_set`, `only_appointnow_appointments`, `appointnow_source`,
`user_ids`, `group_by`, `page_break_by`, `include_patient_phone_number`, `include_patient_home_office`,
`exclude_lab_received`) are specified in their report section.

### Datasets, population and status

| Rule | Detail |
|---|---|
| Datasets | `rpt_appointment_facts` (all reports), `rpt_appointment_procedures` (procedure column of r01, r08; descriptions on r04, r09), `rpt_patient_dim`, `rpt_account_dim`, `rpt_ledger_entries` (balance), `rpt_lab_cases` (r04, r09), `rpt_smart_assist_checks()` (r05), `rpt_user_dim` (r05, r08), `rpt_insurance_coverage` (Carrier column of r01 campaign format and r08), `rpt_office_dim`, `rpt_provider_dim`; `appointment_events` (passthrough, NEW in DATA-17) for r01 `call_list` / `cancelled_from_automated_campaigns`, r06, r07 |
| Base population | `NOT is_block AND NOT is_deleted`; `NOT is_legacy_archive` unless `appointment_set = archived` (r08). Deleted appointments never appear on any report of the family (legacy rule, `appointment_reports.r01` correction) - the same in DentC. The tenant `legacy_archive_policy` does not apply: the family has its own Archived option |
| Status | Predicates use only `status_class` of 03 3.2 (`cancelled`, `no_show`, `completed`, `past_unresolved`, `in_office`, `confirmed`, `unconfirmed`, `scheduled`); never `status_raw`. Legacy Missed = `no_show`; "broken" = cancelled or no_show. The printed status label (`Appt Status` r08, `Status` r01, r05, r06) is `status_norm` in legacy wording: `scheduled` / `rescheduled` Scheduled, `confirmed` Confirmed, `unconfirmed` Un-Confirmed, `left_message` Left Message, `in_reception` / `arrived` / `checked_in` In Reception, `available` Available, `in_operatory` / `in_chair` In Operatory, `checked_out` / `completed` Checked Out, `missed` / `no_show` Missed, `cancelled` Cancelled; `status_class` stays a hidden column for filters, counts and cards. The "never `status_raw`" rule covers predicates, not this label |
| Missed rule (r02) | `NOT has_charge_same_day AND status_class NOT IN ('cancelled','no_show')` on appointments that are over: appointment date before the office's local today, or today with the scheduled end passed (today branch: product decision, INFERRED; r02 Data). `completed` rows without a visit charge stay listed (legacy rule b). A same-day non-visit fee code does not make the visit kept (legacy rule, 03 2.15) |
| Lab cases (r04, r09) | A case exists only as lab fields on one appointment (`has_lab`); an appointment without them never appears (legacy rule). 18 migrated cases, 14 in the archive partition |
| Placeholders (r03) | `is_patientless OR is_placeholder_patient`; a placeholder drops off once linked to a completed patient record (DATA-44) |

### Date bases and time

| Rule | Detail |
|---|---|
| Appointment date | `rpt_appointment_facts.appointment_date`: office-local calendar date as entered |
| Created date (r08) | `created_date` = UTC `created_at` converted to the office time zone (03 4.3). Migrated appointments have no creation date or user: `availability[]` code `appointment_created_date_app_only` (NEW, 03) is returned as a run warning and printed |
| Time stamps (r05, r07, r08, r01 campaign format) | Printed in the office time zone (`format.tz = office`). Legacy printed Pacific server time with no conversion (research 3.3): a deliberate difference, stated in the criteria echo as "Times in office local time" |
| "Today" | Office-local per office; a multi-office run across zones uses each office's own today (AD-9) |

### Office and provider attribution

| Attribution | Column | Reports |
|---|---|---|
| Office | Appointment office `rpt_appointment_facts.office_id` (`scope.office_attribution = appointment`) | all 9 |
| Patient home office | `rpt_appointment_facts.patient_home_office_id`, printed only with `include_patient_home_office` | r08 |
| Provider | Appointment provider `rpt_appointment_facts.provider_id` (one provider per appointment) | r01, r02, r04, r05, r07, r08, r09 |
| User | Creating user `created_by_user_id` -> `rpt_user_dim.user_key`; migrated rows match only `user_ids = all` | r08 |
| Provider restriction | `scope.provider_restriction = none` for the whole family (PD-11 applies to My Reports, which holds the restricted Appointment Detail by User) | all 9 |
| SmartAssist checks | Read only the data of the appointment's office (progress note, posting, next appointment), as the legacy tool does, even when several offices are selected | r05 |

### Money and signs

Money is shown only where the legacy layout prints it: `Charges` (= `scheduled_fee` of the appointment's booked lines,
reading unverified), `Curr Bal` / `Bal:` (patient balance from the canonical ledger, PD-2: positive = owed, credit negative),
`Lst Pymt` (last payment as a positive amount, 03 3.1 sign rule applied), `Lab Cost` (positive, `0.00` printed where not
entered, as in the legacy samples). Totals: count lines on every report; sums only of `Charges` (Cancelled List,
Lab Cost Report) and `Lab Cost` (Lab Cost Report). Scheduled fees are snapshots, never re-priced; migrated appointments
mostly have no booked lines (10,125 lines for 176,453 appointments), so historical `Charges` print empty, not `0.00`.

### Page furniture

| Element | Rule (legacy samples `[P11·img][P13·img][P26·img][P6·img]`) |
|---|---|
| Header | Organisation name, printed title from `title_templates` (the title is not the menu name: e.g. `Appointment Cancellation List`, `Lab Sent Not Received Appointments`, `SmartAssist Report Card - Detail`, `Appointment Detail (For Only AppointNow Appointments)`) |
| Outer group | `Office : <office name>` band: `grouping.fixed_outer` on every block, always applied (the legacy prints it on single-office runs too) |
| Count totals | Templates `Total for, <group> : n`, `Total Appointments for lab, <lab> : n`, `Total for Office, <office> : n`, `Grand Total : n` / `Grand Total Appointments : n` (`subtotal_label_template`, `grand_total.label`) |
| Footer | `pdf.criteria_echo = footer`: legacy echo labels (`From Appt Date` / `Thru`, `From Created Date`, `Appt Date From`, `Date From`, `From` / `Thru` (r05, documented), `Vendors` (r06, INFERRED), `Offices`, `Providers`, `Operatories`, `Users`, `Labs`, `Exclude Pat Type`, `Ex Resp Party Type`), then title, `Printed : <office-local date time>`, `Page : n of m` (ENG-23). The vendor copyright line is not reproduced |
| PDF | `banded_table`, letter, `repeat_header`; landscape for r01, r05, r08 (wide), portrait allowed for r02, r03, r07 |
| XLSX / CSV | Flat typed sheet, one sheet per block, criteria sheet; no merged title cells (no legacy Excel sample exists for this family) |

### Rights and data classes

| Item | Value |
|---|---|
| Right family | `appointment`: `reports_appointment_reports_screen_view_only` (run, view on screen) / `reports_appointment_reports_screen_full_control` (also print, PDF, schedule); XLSX and CSV additionally `reports_export_data_files` (security card 2.1, 2.3). No per-report override |
| Metric family | `scheduling` (summary cards, dashboard drills) |
| `phi_identified` | Patient name, `Pat ID`, chart number, phones, e-mail, appointment date / time / status, procedure codes and descriptions, appointment notes, cancellation reason and note, campaign name, SmartAssist pass / fail cells, time stamps on a patient row; hidden `patient_id` and `appointment_id` |
| `financial_patient` | `Charges`, `Curr Bal`, `Bal:`, `Lst Pymt`, `Lab Cost` and their subtotals (rows carry a patient key); summary cards that total these columns derive the class (never declared) |
| `financial_practice` | Lab Cost Report `summary` enhancement block: `lab_cost_total`, `charges_total`, `lab_cost_pct` (rows carry no patient key). Granted through `report_data_financial_practice` only with the daily, monthly, management, insurance or referral family (security card 2.3): an appointment-only caller gets the summary block without these columns (dropped, not refused) |
| `aggregate` | Office, provider and operatory labels, user label (operational, rule 12), lab and vendor names, carrier name, counts and SmartAssist percentages |
| Key columns | Patient name on every list (r01-r09): a caller without `phi_identified` cannot run the family (403 `data_class_denied`); without `financial_patient` the lists run without money columns |
| Audit | Every run, print and export audited with parameters, row count and patient manifest (AD-7, ENG-14) |

### Family-wide enhancements (additive; the default run is the legacy run)

| Enhancement | Detail |
|---|---|
| Filter enhancements | filter card section 12: date presets and tokens, multi-select pickers, `my_offices`, criteria chips, saved views, URL state, `csv` |
| Drill-through | `record` drill to the appointment (Scheduler hand-off, UX-22) and to the patient (`phi_identified`); summary counts drill to `rows` |
| Row and bulk actions | `send_sms`, `send_email`, `letters`, `postcards`, `create_task` on the contact lists (r01 all formats, r02, r03), with consent exclusions (`no_auto_sms`, `no_correspondence`); handlers owned by the features (PD-15) |
| Worklists | Live counterparts (DASH-33, DASH-34): `confirmation_call_list` -> `worklists.unconfirmed_appointments`; `call_list` -> `worklists.broken_appointments`; `pull_chart_list` -> `worklists.todays_patients`; r02 -> `worklists.unresolved_appointments` (row actions Mark missed / Post). The printed report stays for parity |
| Summary cards and reconciliation | Card values are block totals; `reconciles_with` the metrics `appointments_cancelled` (cancelled list), `appointments_no_show` (missed list), `unresolved_past_appointments` (r02), `appointments_scheduled` (r08, `include_cancelled_appointments = true`), `appointments_created` (r08, `created_date` basis), `lab_cost_amount` and `lab_turnaround_days` (r09) |
| Flow statistics (r07) | Median and 90th percentile of the three durations per provider and office: NEW metrics (owner `05_metric_catalog.md` 5.4), available only for appointments with DATA-17 events |
| Cost class | `interactive` for all nine; `escalate_when` (server) raises r05 and r08 to `background` above a 31-day span (proposal, owner 02 4.9) |

### Family-wide open questions

| # | Question | Check on the live legacy tool |
|---|---|---|
| 1 | Enabled criteria of Appointment List for `call_list`, `pull_chart_list`, `cancelled_from_automated_campaigns`, `missed_list`; SORT BY and Include Patient Balance with `cancelled_list` | Select each format and record the greyed set |
| 2 | Values of APPOINTMENT TYPE > Length other than Any (`appointment_length` stays `unknown_legacy`) | Expand the dropdown |
| 3 | Default of PRINT FORMAT on Appointment List | Read the hidden top section |
| 4 | Which Lab Report types enable DUE DATE (parity uses `report_type == due_date`, narrower than 04 9.3 row 10) and whether APPOINTMENT DATE RANGE is ignored with Due Date (parity disables it) | Switch REPORT TYPE |
| 5 | What REPORT TYPE = All matches on Lab Cost Report (parity: `appointment_date`) and what Exclude Lab Received drops | Run with a case received outside the range |
| 6 | Default and effect of Include Patient Home Office (printed column or office-filter widening) | Tick it and compare outputs |
| 7 | Meaning of APPOINTMENT TYPE = Archived | Run Archived on an archived patient |
| 8 | Output layouts of r02, r03, r06; r07 page layout (patient / provider columns, grouping, totals); SmartAssist `summary`; four Appointment List formats; three Lab Report types | Print each once with sample data |
| 9 | Date basis of r06 (appointment or confirmation date) and how a vendor confirmation is stored | Confirm an appointment through a vendor and run the report |
| 10 | Whether the PAGE BREAK BY `user` option becomes selectable with GROUP BY = User, and whether Include Cancelled Appointments unlocks CANCELLATION REASON | Toggle both controls |
| 11 | Whether the Lab picker follows the 2026-11 per-office lab assignment | Open the picker with two offices |
| 12 | Whether the UPDATE MY FAVORITES relabel holds on every screen of the family | Save a favorite and reopen |

## Appointment List - `appointment.appointment_list`

Appointment Reports, screenshot `1.PNG` (state `Confirmation Call List`, clipped at the top) - P3 - L - `appointment` family (`reports_appointment_reports_screen_view_only` / `_full_control`) - interactive - DOCUMENTED (`cancelled_list`, `cancelled_from_automated_campaigns`); PARTIALLY DOCUMENTED (`call_list`, `missed_list`); INFERRED (`confirmation_call_list`, `pull_chart_list`)

### Purpose

| `report_type` | Who | When | Task it supports |
|---|---|---|---|
| `confirmation_call_list` | Front desk | Afternoon before the day, or for a range ahead | Call or text every booked patient to confirm; mark Confirmed / Left Message |
| `call_list` | Front desk, scheduling coordinator | Daily | Reschedule missed and cancelled appointments that still have no replacement (the work list) |
| `pull_chart_list` | Front desk, clinical assistant | When preparing the next day | Pull charts / prepare records for the patients of the day |
| `cancelled_list` | Front desk, office manager | Daily, weekly | Cancellation history with reason and note; win patients back; cancellation trend |
| `cancelled_from_automated_campaigns` | Front desk | Daily (the legacy tool gives no other notice of a patient self-cancellation) | Catch appointments the patient cancelled by replying to an automated campaign message |
| `missed_list` | Front desk, office manager | Daily, weekly | History of appointments marked missed; broken-appointment follow-up and fees |

Legacy and older names kept as `legacy_names[]`: `Appointment List`, `Appointment Call List`, `Appointment Pull Chart List`,
`Appt Cancellation List`, `Appointment Cancellation List`, `Missed Appointment List`,
`Appointment Cancellation Report From Denticon Patient Communication`, `Appointment Cancellation Report From Denticon Patient Engagement`,
`Cancelled From Denticon Patient Engagement` (research section 8).

### Legacy output

One appointment per row in every format. Printed title per format (`title_templates`, first match wins):

| `report_type` | Printed title | Confidence |
|---|---|---|
| `confirmation_call_list` | `Confirmation Call List` | INFERRED (no sample; radio label used) |
| `call_list` | `Appointment Call List` | INFERRED (old menu name) |
| `pull_chart_list` | `Appointment Pull Chart List` | INFERRED (old menu name) |
| `cancelled_list` | `Appointment Cancellation List` | DOCUMENTED (sample 2024, internal name `NewDailyApptCancLst`) |
| `cancelled_from_automated_campaigns` | `Appointment Cancellation Report From Automated Campaigns` | PARTIALLY DOCUMENTED: the 2023 sample prints `... From Denticon Patient Engagement`; the rename of the title along with the radio (2023 -> 2024) is presumed, not seen |
| `missed_list` | `Missed Appointment List` | INFERRED (old menu name) |

**`cancelled_list` (DOCUMENTED).** `Office : <office>` -> band `Appointment Date: <Weekday, Month d, yyyy>`. Columns in order:
`Time` · `Len` · `Prdr` · `Chart #` · `Patient Name` · `Phones` (`(H):` `(W):` `(C):`) · `Lst Pymt` · `#Cancel` · `Appt Reason` ·
`Charges` · `Curr Bal`. Three sub-lines under each row: `Appt Notes :`, `Cancellation Reason : <description>`,
`Cancellation Note : <text>`. Totals: `Total Number of Appointments Cancelled : n` and `Total : <sum of Charges>`. Readings of
`Lst Pymt` (last payment amount), `#Cancel` (cancellations of the patient) and `Appt Reason` (booked procedures) are the
researchers' [unverified].

**`cancelled_from_automated_campaigns` (DOCUMENTED, sample 2023).** Bands `Created Date: <date>` -> `Office: <office>` (the
only format whose office band is not the outer one). Columns: `Appt Date/Time` (second line `OP: <operatory>`) · `Prdr` ·
`Patient Name/ID` (second line `Bal:` when Include Patient Balance) · `Cell#/Email` · `Carrier` (`P :` / `S :` with carrier
phone) · `Procedure (Codes)` · `Notes` (appointment notes, then `Cancellation Reason :`) · `Campaign Name(ID) Touch Point` ·
`Cancelled Date/Time`. Totals `Total for Office, <office> : n`, `Total for, <date> : n`, `Grand Total : n`. Quirk kept:
`Created Date` matches neither appointment nor cancellation date in the sample and is presumed the appointment's creation
date [unverified].

**Inferred layouts (no vendor sample).**

| Format | Proposed layout (source of the inference) |
|---|---|
| `confirmation_call_list` | Office -> appointment date band; `Time` · `Len` · `Status` · `Prdr` · `Op` · `Chart #` · `Patient Name` · `Phones` · `Appt Reason` · `Curr Bal`; count total (Dentrix Enterprise Daily Appointment List, SoftDent Confirmation List) |
| `call_list` | Office -> appointment date band; `Status` · `Appt. Info` (date, time, length) · `Prdr` · `Op` · `Chart #` · `Patient Name` · `Phones` · `Procedures` · `Prod. $` · `Notes` · `Curr Bal`; count total (Scheduler Call List screen grid) |
| `pull_chart_list` | Office -> appointment date band; `Time` · `Prdr` · `Op` · `Chart #` · `Patient Name` · `Curr Bal`; count total (SoftDent Appointment List) |
| `missed_list` | Cancellation-list frame with `#Missed` in place of `#Cancel` and no cancellation sub-lines; `Total Number of Appointments Missed : n`, `Total : <sum of Charges>` [unverified] |

Signs: `Curr Bal` / `Bal:` positive = owed, credit negative (PD-2); `Lst Pymt` positive; `Charges` = scheduled fee of the
booked lines, empty (not `0.00`) where an appointment has no booked lines (most migrated appointments). Deliberate fixes:
time stamps in office time (legacy printed Pacific server time, shared rules); deleted appointments never listed (same as legacy).

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| [?] | (no label) (radio_group) | **Confirmation Call List** / Call List / Pull Chart List / Cancelled List / Cancelled From Automated Campaigns / Missed List | `report_type` | enum | Confirmation Call List -> `confirmation_call_list`, Call List -> `call_list`, Pull Chart List -> `pull_chart_list`, Cancelled List -> `cancelled_list`, Cancelled From Automated Campaigns -> `cancelled_from_automated_campaigns`, Missed List -> `missed_list` | `confirmation_call_list` | replicated | Legacy section title is REPORT FORMAT TO PRINT (clipped above our capture; read from vendor screenshots). Selects the list variant: population, columns and printed title (Cancelled List prints Appointment Cancellation List). Fifth option was labelled Cancelled From Denticon Patient Engagement until 2023: kept as a search alias (legacy_names), not as an option. Only the Confirmation Call List (our capture) and Cancelled List (vendor screenshot) states are known; capture Call List, Pull Chart List, Cancelled From Automated Campaigns and Missed List on the live tool - they drive the nine greyed controls. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Provider role (line, appointment, preferred) is declared per report. Role appointment on this report: the appointment provider; roster-first list, never scoped by providers.office_id. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None - greyed out | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Enabled when: report_type != confirmation_call_list. Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Patients without a type are kept; no_type_defined drops them. |
| EXCLUDE RESP. PARTY TYPE | (no label) (picker) | shown: None - greyed out | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Enabled when: report_type != confirmation_call_list. Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. |
| CANCELLATION REASON | (no label) (picker) | shown: ALL - greyed out | `cancellation_reason_codes` | entity_multi | - | `all` | replicated_enhanced | Enabled when: report_type != confirmation_call_list. Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Greyed with confirmation_call_list (our capture); enabled with cancelled_list (vendor screenshot, d02). Applies to cancelled rows only; states for call_list, pull_chart_list, cancelled_from_automated_campaigns and missed_list never captured (catalog family question 1). |
| OPERATORY | Operatory (picker) | shown: ALL - greyed out | `operatory_ids` | entity_multi | - | `all` | replicated_enhanced | Enabled when: report_type not in [confirmation_call_list, cancelled_list]. Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| APPOINTMENT TYPE | Length (dropdown) | shown: Any - greyed out | `appointment_length` | enum | - | `any` | unknown_legacy | Enabled when: report_type not in [confirmation_call_list, cancelled_list]. Static dropdown captured collapsed: only the default is known. Expand the list on the live tool and record every option. Expected: Any plus appointment lengths. |
| APPOINTMENT TYPE | Missed (checkbox) | **unchecked** - greyed out | `appointment_statuses.missed` | enum_multi | - | `false` | replicated | Enabled when: report_type not in [confirmation_call_list, cancelled_list]. Row label Status. Member of the appointment status checkbox pair. |
| APPOINTMENT TYPE | Cancelled (checkbox) | **unchecked** - greyed out | `appointment_statuses.cancelled` | enum_multi | - | `false` | replicated | Enabled when: report_type not in [confirmation_call_list, cancelled_list]. Row label Status. Member of the appointment status checkbox pair. |
| OTHER OPTIONS | Include Off Call List (checkbox) | **unchecked** - greyed out | `include_off_call_list` | boolean | - | `false` | replicated | Enabled when: report_type != confirmation_call_list. |
| OTHER OPTIONS | Include Patient Balance (checkbox) | **checked** | `include_patient_balance` | boolean | - | `true` | replicated | Same parameter as Show Patient Balance. |
| SORT BY | (no label) (radio_group) | **Appointment Date** / Provider (Last Name) – Appointment Date / Patient Chart# / Patient Last Name - greyed out | `sort_by` | enum | Appointment Date -> `appointment_date`, Provider (Last Name) – Appointment Date -> `provider_last_name_appointment_date`, Patient Chart# -> `patient_chart_no`, Patient Last Name -> `patient_last_name` | `appointment_date` | replicated | Enabled when: report_type != confirmation_call_list. Rule inferred: disabled with confirmation_call_list (captured); enabled for the other formats is presumed, the cancelled_list state is not stated (family question 1). Row order inside the innermost band. |
| PRINT FORMAT | (no label) (radio_group) † | PDF / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | VENDOR-DOC: PRINT FORMAT section above the list-type radios, outside our capture. Shared vendor-doc parameter of 04 (output_format, PDF -> pdf, Excel -> xlsx, default pdf). The legacy default is not stated for this report; pdf is the captured default of the other eight reports of the category - confirm on the live tool. Enhanced with csv; role output (never changes the rows). |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| REPORT FORMAT TO PRINT = Confirmation Call List (the state of our capture) | Of the filter criteria only the office (OFFICE/GROUP), PROVIDER, the DATE RANGE dates and Include Patient Balance are enabled. Everything else is greyed - the EXCLUDE PATIENT TYPE, EXCLUDE RESP. PARTY TYPE, CANCELLATION REASON and OPERATORY pickers, the Length dropdown, the Status checkboxes Missed / Cancelled, Include Off Call List and all four SORT BY radios (the greyed set recorded in our capture). | report_type = confirmation_call_list: only office_scope, provider_ids, date_range (date_from / date_to) and include_patient_balance are enabled. exclude_patient_type_codes, exclude_resp_party_type_codes, cancellation_reason_codes, include_off_call_list and sort_by are disabled by enabled_when report_type != confirmation_call_list; operatory_ids, appointment_length and appointment_statuses by enabled_when report_type not in [confirmation_call_list, cancelled_list]. A disabled parameter is replaced by its disabled_value (= its default: none, none, all, false, appointment_date, all, any, []) before hashing and execution, so it cannot change the rows. |
| REPORT FORMAT TO PRINT = Cancelled List | EXCLUDE PATIENT TYPE, EXCLUDE RESP. PARTY TYPE, CANCELLATION REASON and Include Off Call List become enabled; OPERATORY and the Status checkboxes (Missed / Cancelled) stay disabled and Length appears disabled. The states of SORT BY and Include Patient Balance in this mode are not stated. | report_type = cancelled_list: exclude_patient_type_codes, exclude_resp_party_type_codes, cancellation_reason_codes and include_off_call_list are enabled (enabled_when report_type != confirmation_call_list); operatory_ids, appointment_length and appointment_statuses stay disabled (enabled_when report_type not in [confirmation_call_list, cancelled_list]). sort_by is enabled (inferred rule report_type != confirmation_call_list) and include_patient_balance has no rule (always enabled); both states are unconfirmed for this format and are open questions of the catalog entry. |
| OFFICE/GROUP = Office Group | The SELECT picker chooses office groups defined in setup instead of offices; with Office it chooses one or more offices. Cross-cutting statement of the document for the Appointment, Recall and Referral criteria screens - recorded once here (Appointment List); it applies to every report of this category that has the Office / Office Group radios. | office_scope: mode office (legacy Office) fills office_ids - default token working_office, also an office id list, my_offices or all; mode office_group (legacy Office Group) fills office_group_id or office_group_ids from lookup:office_groups, default all. Exactly one value key is set. The same rule holds on all nine reports of the category; the resolved office list filters the appointment office (rpt_appointment_facts.office_id / rpt_lab_cases.office_id). |
| A favorite has already been saved for the report (the legacy tool keeps one saved version per report) | The action button ADD TO MY FAVORITES reads UPDATE MY FAVORITES. Cross-cutting statement of the document for the Appointment, Recall and Referral criteria screens - recorded once here (Appointment List); it applies to every report of this category. Whether the relabel shows only when the screen is opened from My Favorites is not stated. | No relabel rule: ADD TO MY FAVORITES maps to saved_view (server-side saved view plus favorite, report_saved_views). Several views per report are allowed; when the runner was opened from a saved view the action reads Update saved view and overwrites that view. Applies to all nine reports of the category. |
<!-- PARITY:appointment_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` (`output_format` `pdf` / `xlsx`, + `csv`) | File rendered from the snapshot; rows unchanged |
| REPORT FORMAT TO PRINT `Confirmation Call List` (`report_type = confirmation_call_list`, default) | Live appointments of the range that are not cancelled, missed or completed (`status_class IN ('scheduled','unconfirmed','confirmed','in_office','past_unresolved')`); prints `Status` |
| `Call List` (`call_list`) | Call-list population (Data): flagged on the call list, plus missed / cancelled per the Status boxes; drops replaced and off-list entries |
| `Pull Chart List` (`pull_chart_list`) | Live appointments of the range, cancelled and missed excluded; chart-number oriented columns |
| `Cancelled List` (`cancelled_list`) | `status_class = 'cancelled'`, whether or not replaced (history); reason and note sub-lines |
| `Cancelled From Automated Campaigns` (`cancelled_from_automated_campaigns`) | Cancelled appointments whose cancel source is an automated campaign (events, DATA-17); campaign layout |
| `Missed List` (`missed_list`) | `status_class = 'no_show'`, whether or not replaced (history) |
| OFFICE/GROUP `Office` / `Office Group` + picker (`office_scope`) | Resolved office list filters `rpt_appointment_facts.office_id`; default the working office |
| PROVIDER `ALL` / list (`provider_ids`) | `rpt_appointment_facts.provider_id IN (...)`; `all` = no predicate |
| DATE RANGE Start / End (`date_from`, `date_to`) | `appointment_date BETWEEN` (inclusive, office-local); default today / today |
| EXCLUDE PATIENT TYPE `None` / list (`exclude_patient_type_codes`) | Drops patients having any selected type; untyped patients kept; `no_type_defined` drops untyped. Disabled for `confirmation_call_list` |
| EXCLUDE RESP. PARTY TYPE `None` / list (`exclude_resp_party_type_codes`) | Drops patients whose current account has a selected type; NULL type kept (SCHEMA(53) warning). Disabled for `confirmation_call_list` |
| CANCELLATION REASON `ALL` / list (`cancellation_reason_codes`) | Restricts cancelled rows to the chosen reasons; non-cancelled rows untouched. Disabled for `confirmation_call_list`. Nothing to match before DATA-17 |
| OPERATORY `ALL` / list (`operatory_ids`) | `operatory_id IN (...)`. Disabled for `confirmation_call_list`, `cancelled_list` |
| APPOINTMENT TYPE > Length `Any` / other values unknown (`appointment_length`) | `Any` = no predicate; other values filter `duration_minutes` (values `unknown_legacy`). Disabled for `confirmation_call_list`, `cancelled_list` |
| APPOINTMENT TYPE > Status `Missed` (`appointment_statuses` member `missed`) | Ticked: adds missed appointments not replaced to the Call List even when not flagged. Default unticked |
| APPOINTMENT TYPE > Status `Cancelled` (`appointment_statuses` member `cancelled`) | Ticked: adds cancelled appointments not replaced to the Call List even when not flagged. Default unticked. Both boxes disabled for `confirmation_call_list`, `cancelled_list` |
| OTHER OPTIONS > Include Off Call List (`include_off_call_list`) | `call_list`: `false` = entries taken off the call list are left out, `true` = they are listed. `cancelled_list`, `missed_list`: no predicate; the box is enabled (d02) but its effect is unknown - the history lists ignore off-list state (research 3.3). Inert until the off-list state exists (DATA-17 extension). Disabled for `confirmation_call_list` |
| OTHER OPTIONS > Include Patient Balance (`include_patient_balance`, default ticked) | Adds `Curr Bal` (`Bal:` on the campaign format); `false` drops the column, rows unchanged |
| SORT BY `Appointment Date` / `Provider (Last Name) – Appointment Date` / `Patient Chart#` / `Patient Last Name` (`sort_by`) | Row order inside the innermost band (keys in Output). Disabled (= `appointment_date`) for `confirmation_call_list` |

Dependency rules (all `enabled_when` on `report_type`; a disabled parameter runs with its default):

| Rule | Source |
|---|---|
| `confirmation_call_list`: only `office_scope`, `provider_ids`, `date_range`, `include_patient_balance` enabled | d01, captured |
| `cancelled_list`: exclude pickers, `cancellation_reason_codes`, `include_off_call_list` enabled; `operatory_ids`, `appointment_length`, `appointment_statuses` disabled | d02, vendor screenshot |
| `sort_by` enabled for every format except `confirmation_call_list` | inferred |
| `call_list`, `pull_chart_list`, `cancelled_from_automated_campaigns`, `missed_list`: every control enabled | inferred (states never captured, family question 1) |
| `office_scope` mode `office_group` switches the picker to office groups | d03 |
| ADD TO MY FAVORITES -> saved view; several views allowed (no UPDATE relabel) | d04 |

### Parameters - enhancements

| Key | Type | Formats | Default | Effect |
|---|---|---|---|---|
| `confirmation_statuses` (NEW, owner 04 section 3.7) | `enum_multi` `scheduled`, `unconfirmed`, `confirmed`; full selection `no_predicate` | `confirmation_call_list` | all three (= legacy) | Narrow the call sheet to the patients still to reach (`scheduled` + `unconfirmed`, left-message included in `unconfirmed`) |
| `only_contactable` (NEW, owner 04) | `boolean` | all | `false` | Drops patients with `no_correspondence`, or with no phone and no e-mail; the dropped count is printed in the criteria echo |
| `days_since_broken` (NEW, owner 04) | `number_range` `integer` | `call_list` | open bounds | Age of the broken appointment in days (`office_local_today - appointment_date`); separates fresh cancellations from stale ones |
| `page_break_by` | `enum` `none`, `office`, `date` (role `layout`) | all | `none` | New PDF page per office or per appointment date (one sheet per office in XLSX) |
| `date_range` presets and tokens | `date_range` | all | `today` | Saved views: "Tomorrow's confirmations" (`custom` `tomorrow` / `tomorrow`), "Next 3 days" (`today+1d` / `today+3d`), "Cancellations last 7 days" (`last_7_days`) |
| `compare_to` (filter card 12, P4) | `enum` | `cancelled_list`, `missed_list` | `none` | Summary card shows the count of the previous period / previous year beside the current count; rows unchanged |
| `provider_ids`, `operatory_ids` multi-select | `entity_multi` | all | `all` | Roster-first provider list (`<ProviderOptionGroups>`), operatories of the selected offices first |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_appointment_facts` (f), `rpt_appointment_procedures` (booked codes, descriptions), `rpt_patient_dim` (name, chart, phones, e-mail, types, consent flags), `rpt_account_dim` (`resp_party_type`), `rpt_ledger_entries` (balance, last payment), `rpt_provider_dim` (`short_id`, `last_name`), `rpt_office_dim`, `rpt_insurance_coverage` (campaign Carrier), passthrough `operatories` and `campaigns` (DATA-45; NEW registrations, owner 03), `appointment_events` (DATA-17) |
| Base | Family base population (header): `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive` |
| Date basis | `appointment_date` for every format (fixed `date_basis`), office-local |
| Office / provider | Appointment office `f.office_id`; appointment provider `f.provider_id`; `scope.provider_restriction = none` |
| `confirmation_call_list` | `status_class IN ('scheduled','unconfirmed','confirmed','in_office','past_unresolved')` (INFERRED: completed, cancelled, missed out) |
| `pull_chart_list` | `status_class NOT IN ('cancelled','no_show')` |
| `cancelled_list` / `missed_list` | `status_class = 'cancelled'` / `'no_show'`; replacement not tested |
| `call_list` | `(f.add_to_call_list OR ('missed' IN appointment_statuses AND status_class = 'no_show') OR ('cancelled' IN appointment_statuses AND status_class = 'cancelled'))` AND NOT replaced AND (`:include_off_call_list OR f.call_list_removed_at IS NULL`; this predicate exists on `call_list` only, the history lists never test off-list state). Replaced (interim, INFERRED): `EXISTS` a live appointment of the same patient that is not cancelled or missed and is dated after the broken one; after DATA-17: created after the cancel / missed event (`cancelled_at`, `missed_at`). Off-list: NEW `appointments.call_list_removed_at`, `call_list_removed_by`, exposed as NEW `rpt_appointment_facts.call_list_removed_at` (extension of DATA-17, owner 03; not yet in the DATA-17 scope of `data_work_items.md`: requested through RPT-APPT-11) |
| `cancelled_from_automated_campaigns` | `status_class = 'cancelled' AND` cancel event `source = 'campaign'` (`appointment_events`, DATA-17). Interim before DATA-17: `cancellation_reason IN ('Patient declined via SMS', 'Automated cancellation')` (the only writers today, analysis `be_data_scheduling.md` section 1.4), labelled in the echo. Band `created_date` (03 4.3, app era only) |
| `cancellation_reason_codes` | `status_class <> 'cancelled' OR f.cancellation_reason IN (...)` once reasons are a definitions group (DATA-17); free text today |
| `appointment_length` | `duration_minutes` predicate per option; values `unknown_legacy` (family question 2) |
| Exclusions | `NOT (pd.patient_type_codes && :exclude_patient_type_codes)`; `ad.resp_party_type IS NULL OR ad.resp_party_type NOT IN (...)` through `pd.account_id` |
| Derived columns | `patient_balance` = `SUM(le.amount)` of the patient (canonical ledger, RPT-APPT-03); `last_payment_amount` = `-amount` of the latest `rpt_ledger_entries` leg with `entry_type = 'patient_payment'` (reading INFERRED); `cancel_count` / `missed_count` = live appointments of the patient with `status_class = 'cancelled'` / `'no_show'`, all dates (window INFERRED); `appointment_reason` = booked codes `string_agg(procedure_code, ', ' ORDER BY appointment_procedure_id)`, else `procedure_label`; `phones` = `(H): phone (W): work_phone (C): cell_phone` |
| Campaign columns | Carrier = primary / secondary `rpt_insurance_coverage` slots of the patient today (carrier name and phone); campaign name and id from `campaigns` by `f.campaign_code`; touch point and cancelled date/time from the cancel event (DATA-17) |
| Availability (coverage 43a-43f) | Default `confirmation_call_list` READY; `pull_chart_list`, `cancelled_list`, `missed_list` READY; `call_list` SCHEMA(17) (flag not sent by the Scheduler, replaced needs events); `cancelled_from_automated_campaigns` SCHEMA(17); `cancellation_reason_codes` SCHEMA(17); `exclude_resp_party_type_codes` SCHEMA(53); balance needs DATA-06 |
| Migrated history | No cancellation reasons, notes, call-list flags, cancel sources, creation dates or campaign events (`availability[]` codes `appointment_cancel_reason_app_only`, `appointment_call_list_app_only`, `appointment_cancel_source_app_only`, NEW, 03); `Charges` mostly empty (10,125 lines for 176,453 appointments); a migrated cancellation count is the count of migrated cancelled rows only |

### Output

Shared hidden columns of every format: `appointment_id` (`id`, `phi_identified`, row id), `patient_id` (`id`, `phi_identified`,
`entity = patient`), `office_id` (`aggregate`), `provider_last_name`, `patient_last_name`, `patient_first_name` (sort keys,
`aggregate` / `phi_identified`).

`cancelled_list` and `missed_list` (block `main`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `start_time` | Time | `time` | `phi_identified` | - |
| `duration_minutes` | Len | `integer` | `phi_identified` | - |
| `provider_short_id` | Prdr | `text` | `aggregate` | - |
| `chart_no` | Chart # | `text` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key column) | `count` -> `Total Number of Appointments Cancelled : n` / `... Missed : n` |
| `phones` | Phones | `text` | `phi_identified` | - |
| `last_payment_amount` | Lst Pymt | `money` | `financial_patient` | `none` |
| `cancel_count` / `missed_count` | #Cancel / #Missed | `integer` | `phi_identified` | `none` |
| `appointment_reason` | Appt Reason | `text` | `phi_identified` | - |
| `scheduled_fee` | Charges | `money` | `financial_patient` | `sum` -> `Total : <sum>` beside the count line; levels per date band, office and grand [unverified: the sample shows one `Total :` line, open question 5] |
| `patient_balance` | Curr Bal | `money` | `financial_patient` | `none`; `visible_when ["truthy","include_patient_balance"]` |
| `notes` | Appt Notes : | `text` | `phi_identified` | sub-line |
| `cancellation_reason_label` | Cancellation Reason : | `text` | `phi_identified` | sub-line, `cancelled_list` only |
| `cancellation_note` | Cancellation Note : | `text` | `phi_identified` | sub-line, `cancelled_list` only |

Sub-lines are a PDF rendering hint `pdf.placement = sub_line` (NEW, owner 02 section 7.2 `banded_table`); on screen they
open as an expandable row detail; in XLSX / CSV they are ordinary columns.

`confirmation_call_list`: `start_time`, `duration_minutes`, `status_label` (Status, `enum`, `phi_identified`: `status_norm` in
legacy wording - Scheduled, Confirmed, Un-Confirmed, Left Message, In Reception, Available, In Operatory - shared rules), `provider_short_id`, `operatory_name` (Op,
`aggregate`), `chart_no`, `patient_name`, `phones`, `appointment_reason`, `patient_balance` (Curr Bal); count total.
`pull_chart_list`: `start_time`, `provider_short_id`, `operatory_name`, `chart_no`, `patient_name`, `patient_balance`;
count total. `call_list`: `status_label`, `appointment_info` (Appt. Info: date, time, length; `text`, `phi_identified`),
`provider_short_id`, `operatory_name`, `chart_no`, `patient_name`, `phones`, `appointment_reason` (Procedures),
`scheduled_fee` (Prod. $, `sum`), `notes`, `patient_balance`; count total.

`cancelled_from_automated_campaigns`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_datetime` + `operatory_name` | Appt Date/Time (`OP:` line) | `datetime` (tz office) | `phi_identified` | - |
| `provider_short_id` | Prdr | `text` | `aggregate` | - |
| `patient_name` + `patient_id` | Patient Name/ID | `text` | `phi_identified` | `count` per office, date, grand |
| `patient_balance` | `Bal:` (second line of Patient Name/ID, `pdf.placement = sub_line`) | `money` | `financial_patient` | `none`; `visible_when ["truthy","include_patient_balance"]` |
| `cell_phone_email` | Cell#/Email | `text` | `phi_identified` | - |
| `carrier_lines` | Carrier (`P :` / `S :` + phone) | `text` | `phi_identified` (carrier on a patient row) | - |
| `procedure_codes_text` | Procedure (Codes) | `text` | `phi_identified` | - |
| `notes_with_reason` | Notes | `text` | `phi_identified` | - |
| `campaign_touch_point` | Campaign Name(ID) Touch Point | `text` | `phi_identified` | - |
| `cancelled_at` | Cancelled Date/Time | `datetime` (tz office) | `phi_identified` | - |

| Item | Rule |
|---|---|
| Grouping | `fixed_outer` office (`Office : {office_name}`) -> `appointment_date` band `Appointment Date: {appointment_date:EEEE, MMMM d, yyyy}` with count (and Charges) subtotal; campaign format: `created_date` (`Created Date: {created_date}`) -> office, totals `Total for Office, {office_name} : n`, `Total for, {created_date} : n`, `Grand Total : n` |
| Sort options | `appointment_date` = `appointment_date`, `start_time`, `patient_last_name`; `provider_last_name_appointment_date` = `provider_last_name`, `appointment_date`, `start_time`; `patient_chart_no` = `chart_no`, `appointment_date`, `start_time`; `patient_last_name` = `patient_last_name`, `patient_first_name`, `appointment_date`; tie-breaker `appointment_id`. With a sort other than `appointment_date` the date band is dropped (rows of the range in one office block) [INFERRED] |
| Page breaks | `page_break_by` enhancement only (legacy: none) |
| Summary cards | `appointments_listed` (count of the block; reconciles with `appointments_cancelled` on `cancelled_list`, `appointments_no_show` on `missed_list`, `unconfirmed_appointments` on `confirmation_call_list` with `confirmation_statuses = [scheduled, unconfirmed]` and a future range); `scheduled_fee_total` (block total of `scheduled_fee`, class derived `financial_patient`; cancelled and missed lists: value of broken appointments) |

### Visuals and drill-through

| Format | Chart | Drill |
|---|---|---|
| `confirmation_call_list` | Donut of `status_label` counts (share confirmed) | Row -> `appointment` record (Scheduler hand-off); patient name -> `patient_overview` |
| `cancelled_list` | Bar of counts by `cancellation_reason_label` (after DATA-17), by `provider_short_id` otherwise | Reason bar -> `rows` of the same run filtered to the reason; `Curr Bal` -> `patient_account_ledger` (`right_code` of the ledger feature) |
| `missed_list` | Bar of counts by provider | Provider bar -> `rows`; `#Missed` -> `patient_overview` |
| `call_list`, `pull_chart_list`, campaign | none - a list | Row -> appointment; patient -> `patient_overview` |

### Actions

| Action | Scope | Kind | Formats | Rule |
|---|---|---|---|---|
| Open appointment | row | `navigate` (`appointment`) | all | Scheduler on that appointment (UX-22) |
| Open patient | row | `navigate` (`patient_overview`) | all | `phi_identified` |
| Confirm | row, bulk | `custom:confirm_appointment` | `confirmation_call_list` | Sets status Confirmed through `scheduler_service.update_status` (as DASH-33); right `appointments` edit feature right; idempotent per appointment |
| Left message | row | `custom:left_message` | `confirmation_call_list` | Sets status Left Message (unconfirmed) |
| Schedule replacement | row | `navigate` (`scheduler_booking`, patient) | `call_list`, `cancelled_list`, `missed_list`, campaign | `openSchedulerForBooking`; after DATA-17 the booking resolves the call-list row |
| Take off call list / restore | row | `custom:call_list_remove` | `call_list` | Writes `call_list_removed_at` (DATA-17 extension); absent from the served definition until the column exists |
| Text / e-mail | bulk | `send_sms`, `send_email` | all | Confirmation template on the confirmation list, "please call to reschedule" on the broken lists; excludes `no_auto_sms` / `no_auto_email` / `no_correspondence` and counts the exclusions (DASH-31) |
| Letters / postcards | bulk | `letters`, `postcards` | `cancelled_list`, `missed_list`, `call_list` | Broken-appointment letter (correspondence feature, PD-15) |
| Create task | row, bulk | `create_task` | all | Follow-up call task assigned to a user |
| Export selection | bulk | `export_selection` | all | Needs the export right |

Worklist counterparts (header): `worklists.unconfirmed_appointments`, `worklists.broken_appointments`, `worklists.todays_patients`.
The report itself is a printable worklist for `confirmation_call_list` and `call_list` (snapshot, not live).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter landscape, `repeat_header`; header organisation name + printed title; `Office :` band; footer criteria echo (`From Appt Date` / `Thru`, `Offices`, `Providers`, `Operatories`, `Exclude Pat Type`, `Ex Resp Party Type`, `Cancellation Reasons`, list type), `Times in office local time`, `Printed : <office-local date time>`, `Page : n of m`; sub-lines under the row |
| XLSX | One sheet per run (one per office with `page_break_by = office`), flat typed columns, sub-lines as columns, phone lines split into `home_phone`, `work_phone`, `cell_phone`; criteria sheet; no merged cells |
| CSV | Main block, formula guard |
| Background | Not expected (`interactive`); a range above 31 days with all offices is estimated before the run (filter card 12) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Population of `confirmation_call_list`: are completed, checked-in and past-unresolved appointments listed? Printed title and columns | Print one day with mixed statuses |
| 2 | Call List base: is the list "flagged on call list" plus the two Status boxes, or every missed / cancelled not replaced? With both boxes unticked (legacy default), is the list empty? | Run Call List with the boxes off and on |
| 3 | Confirm whether Include Off Call List changes anything on `cancelled_list` and `missed_list` (parity: no predicate there) | Take an entry off the list, run both formats with the box on and off |
| 4 | `#Cancel` / `#Missed` window (all time, the range, last 12 months) and `Lst Pymt` source (patient payments only?) | Compare with a patient's appointment history and ledger |
| 5 | Does a SORT BY other than Appointment Date drop the date band; at which levels do the count and `Total :` lines print (date band, office, grand) | Print Cancelled List over two days and two offices, sorted by Patient Last Name and by date |
| 6 | Current printed title of the campaign format and its Created Date meaning | Print the format with a known appointment |
| 7 | Product: campaign format keeps its created-date outer band, an exception to the shared `fixed_outer` office band of the header | Product owner; this section keeps the legacy order |
| 8 | Product: interim campaign-cancel predicate on the two reason strings until DATA-17 | Product owner (recommended: ship with the labelled interim rule) |

## Missed Appointments Not Marked As Missed - `appointment.missed_appointments_not_marked_as_missed`

Appointment Reports, screenshot `2.PNG` (default state, nothing greyed) - P3 - S - `appointment` family - interactive - INFERRED

### Purpose

Front office or office manager at the end of the day or week reconciles the schedule with the ledger: every appointment of
the range for which no visit-code procedure was posted on its date and that was never marked Missed nor cancelled. For each
row staff either post the visit (it was kept), mark it Missed (broken-appointment follow-up, fee), or correct the status.
It feeds clean missed-appointment statistics (`appointments_no_show`) and pairs with the Daily Audit "scheduled but missing
a ledger transaction" view.

### Legacy output

No vendor article, sample or training page shows the output (INFERRED). The legacy rule (research section 3.3): an
appointment is missed when (a) marked Missed, (b) no completed visit-code procedure was posted for its date, or (c) missed
and rescheduled; this report lists class (b) minus (a).

Proposed layout (the `Appointment Cancellation List` frame, research section 4; comparable Open Dental Broken Appointments
Report): title `Missed Appointments Not Marked As Missed` (menu name, INFERRED); `Office : <office>` -> band
`Appointment Date: <Weekday, Month d, yyyy>`; columns `Time` · `Len` · `Prdr` · `Chart #` · `Patient Name` · `Phones` ·
`Appt Reason` · `Charges` · `Curr Bal` (with Show Patient Balance); totals `Total for, <date> : n`, `Total for Office, <office> : n`,
`Grand Total : n` (count totals only, as the research's inferred layout; no `Charges` sum). Quirks kept: a same-day
non-visit code (broken-appointment fee, `Z` code) does not make the visit kept, also when it was posted through the
appointment (checked out or posted with non-visit codes only: the row stays listed); a visit posted on another date than
the appointment date leaves the appointment on the list [unverified].

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Provider role (line, appointment, preferred) is declared per report. Role appointment on this report: the appointment provider; roster-first list, never scoped by providers.office_id. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Range on rpt_appointment_facts.appointment_date (fixed basis), office-local; capped at the office-local now: past dates plus, on today, only appointments whose scheduled end (start_time + duration_minutes) has passed (product decision, INFERRED - the legacy treatment of today is open question 1 of the catalog entry). Without the today branch the legacy default run (today / today, end of day) would always be empty. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end, capped at the office-local now (same rule as Start Date). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Patients without a type are kept; no_type_defined drops them. |
| EXCLUDE RESP. PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. |
| OTHER OPTIONS | Show Patient Balance (checkbox) | **checked** | `include_patient_balance` | boolean | - | `true` | replicated | Same parameter as Include Patient Balance. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` (`output_format`) | File format only |
| OFFICE/GROUP `Office` / `Office Group` + picker (`office_scope`) | Appointment office filter; default working office |
| PROVIDER `ALL` / list (`provider_ids`) | Appointment provider filter |
| DATE RANGE Start / End (`date_from`, `date_to`; default today) | `appointment_date BETWEEN`, capped at the office-local now: earlier dates, and on today only appointments whose scheduled end has passed (a future appointment cannot be missed; today branch is a product decision, INFERRED) |
| EXCLUDE PATIENT TYPE `None` / list (`exclude_patient_type_codes`) | Drops patients of the selected types; untyped kept |
| EXCLUDE RESP. PARTY TYPE `None` / list (`exclude_resp_party_type_codes`) | Drops patients whose account type is selected; NULL kept (SCHEMA(53)) |
| OTHER OPTIONS > Show Patient Balance (`include_patient_balance`, default ticked) | Adds `Curr Bal`; rows unchanged |

Dependency rules: none on the screen (nothing greyed); `office_scope` group mode per d03; favorites per d04.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `unresolved_kinds` (NEW, owner 04 section 3.7) | `enum_multi` `never_arrived`, `arrived_not_posted`; full selection `no_predicate` | both | `arrived_not_posted` = a check-in stamp or an in-office status exists (`checked_in_on` or `status_norm` in the arrival set) but no visit posted: a posting omission, not a missed visit. Separates the two clean-up tasks |
| `has_booked_procedures` (NEW, owner 04) | `boolean` tri-state as `enum` `any`, `yes`, `no` | `any` | Find appointments whose posting can be prefilled from booked lines |
| `date_range` presets | `date_range` | `today` | Saved views "Yesterday" (`yesterday`), "Last week" (`last_week`), "Month to date" |
| `compare_to` (P4) | `enum` | `none` | Count against the previous period on the summary card |
| `page_break_by` | `enum` `none`, `office`, `provider` (layout) | `none` | One page per provider for hand-out to each operatory team |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_appointment_facts` (f), `rpt_appointment_procedures`, `rpt_patient_dim`, `rpt_account_dim`, `rpt_ledger_entries` (balance), `rpt_provider_dim`, `rpt_office_dim` |
| Population (shared missed rule) | Family base AND `NOT f.has_charge_same_day` AND `f.status_class NOT IN ('cancelled','no_show')` AND ( `f.appointment_date < f.office_local_today` OR ( `f.appointment_date = f.office_local_today` AND `f.start_time + f.duration_minutes * interval '1 minute' <= <office-local now>` ) ). Earlier dates therefore take `past_unresolved` and `completed`; `completed` rows (checked out with nothing posted, or posted with non-visit codes only) stay listed because legacy rule (b) tests the visit-code posting, not the check-out. Today branch: product decision, INFERRED - it keeps the legacy default (today / today, end of day) from being always empty without listing a morning run's whole schedule (open question 1) |
| Excluded | `cancelled`, `no_show` (already marked); any appointment with a same-day visit charge; today's appointments not yet over; block-outs; deleted; archived |
| Flag to 03 (data card 2.15) | `is_kept` and `status_class` disagree on a `completed` row without a visit charge (kept by status, missed by the visit-code rule); 03 should state which one `unresolved_past_appointments` follows |
| Date basis | `appointment_date`; the range is capped at the office-local now per office (population rule) |
| Office / provider | Appointment office; appointment provider |
| Kept test | `has_charge_same_day` = a live visit-code charge (`rpt_procedure_code_dim` visit-code flag) of the patient on `appointment_date` in the appointment's office (03 2.15; legacy rule) |
| Availability | READY (coverage 44); `exclude_resp_party_type_codes` SCHEMA(53); `unresolved_kinds = arrived_not_posted` is APP (arrival stamps do not exist on migrated rows) |
| Migrated history | A kept migrated visit that was never checked out is listed unless a same-day visit charge exists; a migrated appointment in an unknown source office may sit in the wrong office (03 2.15) - the list for migrated periods is therefore long and noisy, and the echo prints `Migrated appointments: status not maintained` when the range touches the migrated period |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_id`, `patient_id` | (hidden) | `id` | `phi_identified` | row id; `entity = patient` |
| `start_time` | Time | `time` | `phi_identified` | - |
| `duration_minutes` | Len | `integer` | `phi_identified` | - |
| `provider_short_id` | Prdr | `text` | `aggregate` | - |
| `chart_no` | Chart # | `text` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key column) | `count` per date band (`Total for, {appointment_date} : n`), office, grand |
| `phones` | Phones | `text` | `phi_identified` | - |
| `appointment_reason` | Appt Reason | `text` | `phi_identified` | - |
| `status_label` | Status (enhancement, `default_visible: false`) | `enum` | `phi_identified` | - |
| `unresolved_kind` | Kind (enhancement, `default_visible: false`) | `enum` | `phi_identified` | - |
| `scheduled_fee` | Charges | `money` | `financial_patient` | `none` (parity layout: count totals only; the value at risk is the summary card `unresolved_value`, enhancement, INFERRED) |
| `patient_balance` | Curr Bal | `money` | `financial_patient` | `none`; `visible_when ["truthy","include_patient_balance"]` |

| Item | Rule |
|---|---|
| Grouping | `fixed_outer` office -> `appointment_date` band; `grand_total` `Grand Total : n` |
| Sort | `default_sort` `appointment_date`, `start_time`, `patient_last_name`, `appointment_id` (no legacy SORT BY); screen re-sort on `provider_short_id`, `patient_name`, `scheduled_fee` |
| Summary cards | `unresolved_count` (block count; `reconciles_with` `unresolved_past_appointments` on the `past_unresolved` rows of ranges ending before today - `completed` rows without a visit charge are the documented difference until 03 settles the flag above), `unresolved_value` (block total of `scheduled_fee`, enhancement; class derived `financial_patient`) |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar of counts by provider (who leaves visits unposted) |
| Row | `appointment` record (Scheduler hand-off) |
| Patient name | `patient_overview` |
| Provider bar / office subtotal | `rows` of the same run filtered to the provider / office |
| Summary card `unresolved_count` | `worklists.unresolved_appointments` with the same office scope and range |

### Actions

| Action | Scope | Kind | Rule |
|---|---|---|---|
| Mark missed | row, bulk (confirm "Mark n appointments as missed?") | `custom:mark_missed` | `scheduler_service.update_status` status Missed; feature right of appointment edit; idempotent per appointment; removed rows are struck through on screen until re-run |
| Post visit | row | `navigate` `patient_transactions` (NEW route key, owner 07: `/patient/:patientId/transaction` with the appointment's booked lines) | Opens Transactions Entry for the patient and date |
| Open appointment | row | `navigate` (`appointment`) | Correct a wrong status |
| Text / e-mail "we missed you" | bulk | `send_sms`, `send_email` | Only rows marked missed in this session or `unresolved_kind = never_arrived`; consent exclusions counted |
| Create task | row, bulk | `create_task` | Assign the clean-up to a user |

The live counterpart is `worklists.unresolved_appointments` (header); this report is its printable snapshot.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter portrait (landscape when `include_patient_balance` and phones exceed the width: `orientation = auto`), repeat header, footer echo `From Appt Date` / `Thru`, `Offices`, `Providers`, `Exclude Pat Type`, `Ex Resp Party Type`, printed date, `Page : n of m` |
| XLSX | One flat sheet, phones split into three columns, criteria sheet |
| CSV | Main block |
| Background | No (`interactive`) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Does the report include today's appointments (end-of-day use) or only earlier dates? Product: list today's appointments only once their scheduled end has passed (this section), all of today's, or none | Run at end of day with an unposted appointment of today; product owner |
| 2 | Are checked-in / in-operatory appointments without a posting listed? Is a checked-out appointment, or one posted only with non-visit codes, listed (this section: yes)? | Check in a patient, post nothing, run; check out a second one and post only a `Z` code, run |
| 3 | Output layout, title, totals | Print one page (family question 8) |
| 4 | Is a visit posted on another date than the appointment treated as missed? | Post the visit the next day, run |
| 5 | Is the visit-code test office-specific (visit charged in another office the same day) | Two-office fixture |

## New Patients via Appointments - `appointment.new_patients_via_appointments`

Appointment Reports, screenshot `3.PNG` (default state) - P3 - S - `appointment` family - interactive - PARTIALLY DOCUMENTED (purpose); layout INFERRED

### Purpose

Front office, weekly and in the end-of-day routine: find appointments booked for a new patient through Quick Save (a
placeholder not yet completed into a patient record, red `N` on the legacy schedule) or booked without any patient
record, so that registration, insurance capture and forms are finished before the visit. A row drops off once the
placeholder is linked to / completed into a full patient record. Old name `New Patient Thru Appointment`, also listed
under Lists > Patient List.

### Legacy output

Layout INFERRED (no sample). In-family evidence: Appointment Detail prints placeholders with the typed name, `Pat ID` 0 and
an empty balance. Proposed: title `New Patients via Appointments`; `Office : <office>` -> band
`Appointment Date: <Weekday, Month d, yyyy>`; columns `Time` · `Len` · `Op` · `Prdr` · `Patient Name` · `Pat ID` · `Phone` ·
`Appt Reason` · `Appt Notes`; totals `Total for Office, <office> : n`, `Grand Total : n`. No money columns (no balance exists for a
placeholder). Comparable: Dentrix Enterprise New Patient List (totals "non-patients" with an appointment).

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` (`output_format`) | File format only |
| OFFICE/GROUP `Office` / `Office Group` + picker (`office_scope`) | Appointment office filter; default working office |
| DATE RANGE Start / End (`date_from`, `date_to`; default today) | `appointment_date BETWEEN` (basis INFERRED: the date of the placeholder appointment) |

No provider control (all providers always). Dependency rules: `office_scope` group mode (d03); favorites (d04).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `provider_ids` (enhancement; the legacy screen has none) | `entity_multi` `lookup:providers` | `all` | Hygiene coordinator lists only hygiene new-patient visits |
| `placeholder_kinds` (NEW, owner 04 section 3.7) | `enum_multi` `placeholder_patient`, `patientless`; full selection `no_predicate` | both | Separate Quick Save placeholders (completable) from appointments without any record (to link) |
| `include_new_patient_flag` (NEW, owner 04) | `boolean` | `false` | Also lists appointments flagged `is_new_patient` whose patient record is complete (first-visit preparation; APP) |
| `date_range` presets and tokens | `date_range` | `today` | Saved views "Next 7 days" (`today` / `today+6d`), "This week" (`this_week`) |
| `page_break_by` | `enum` `none`, `office` (layout) | `none` | One page per office |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_appointment_facts` (f), `rpt_patient_dim` (pd), `rpt_appointment_procedures`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories` |
| Population | Family base AND (`f.is_patientless OR f.is_placeholder_patient`) AND `f.status_class <> 'cancelled'` (INFERRED: a cancelled placeholder needs no registration; family question 8) |
| Placeholder rule | After DATA-44: `patients.registration_status = 'placeholder'`. Interim [I] (03 2.7): app patient row with no address line, no visit and no coverage slot - over-counts patients registered with name and phone only; the run returns `availability[]` `placeholder_rule_interim` (NEW, 03) and the echo prints it |
| Date basis | `appointment_date` (fixed) |
| Office / provider | Appointment office; appointment provider (enhancement filter only) |
| Name and phone | Placeholder patient: `pd.first_name`, `pd.last_name`, `pd.cell_phone` / `pd.phone`, `Pat ID` = `patient_id`. Patientless appointment: no typed-name column exists on `appointments` (verified `app/db/models/scheduling.py`); prints `(no patient record)`, `Pat ID` `0`, and the appointment `notes`, as the legacy Appointment Detail does |
| Availability | SCHEMA(44) (coverage 45); `include_new_patient_flag` APP (`is_new_patient` false on every migrated row) |
| Migrated history | Migrated placeholders cannot be told from registered patients (the interim rule only matches app rows); migrated appointments without a patient (`Pat ID` 0) list as patientless; typed names of those rows were not migrated [I] |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_id`, `patient_id` | (hidden) | `id` | `phi_identified` | row id; `entity = patient` when not null |
| `start_time` | Time | `time` | `phi_identified` | - |
| `duration_minutes` | Len | `integer` | `phi_identified` | - |
| `operatory_name` | Op | `text` | `aggregate` | - |
| `provider_short_id` | Prdr | `text` | `aggregate` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key column) | `count` per office (`Total for Office, {office_name} : n`) and grand |
| `patient_id_display` | Pat ID | `text` | `phi_identified` | `0` for patientless |
| `contact_phone` | Phone | `text` | `phi_identified` | - |
| `appointment_reason` | Appt Reason | `text` | `phi_identified` | - |
| `notes` | Appt Notes | `text` | `phi_identified` | - |
| `placeholder_kind` | Kind (enhancement, `default_visible: false`) | `enum` | `phi_identified` (status fact on a patient row) | - |
| `days_until_appointment` | Days Until (enhancement, `default_visible: false`) | `integer` | `phi_identified` | - |
| `created_date` | Booked On (enhancement, `default_visible: false`; app era) | `date` | `phi_identified` | - |

| Item | Rule |
|---|---|
| Grouping | `fixed_outer` office -> `appointment_date` band (count subtotal) |
| Sort | `default_sort` `appointment_date`, `start_time`, `appointment_id` |
| Summary cards | `placeholder_appointments` (block count), `patientless_appointments` (count where `placeholder_kind = patientless`) |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Row | `appointment` record (Scheduler hand-off: link or complete the patient there) |
| Patient name (placeholder patient) | `patient_overview` |
| Summary card | `rows` of the same run filtered to the kind |

### Actions

| Action | Scope | Kind | Rule |
|---|---|---|---|
| Complete registration | row | `navigate` `patient_edit` (NEW route key, owner 07: the Add New Patient wizard in edit mode for `patient_id`) | Placeholder patients only; patient-edit feature right |
| Link existing patient | row | `navigate` (`appointment`) | Patientless rows; the Scheduler's existing-patient match does the link |
| Send registration request | bulk | `send_sms`, `send_email` (registration-form template of the intake feature, PD-15) | Placeholder patients with a phone or e-mail; consent exclusions counted |
| Create task | row, bulk | `create_task` | Assign the registration call |
| Export selection | bulk | `export_selection` | Export right |

Worklist: proposed `worklists.incomplete_new_patients` (NEW, owner 06 section 6): the same population live, resolved when the
record is completed.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter portrait, repeat header, footer echo `From Appt Date` / `Thru`, `Offices`, the interim-rule note, printed date, `Page : n of m` |
| XLSX | One flat sheet, criteria sheet |
| CSV | Main block |
| Background | No |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Is DATE RANGE matched on the placeholder appointment's date (not stated) | Book a placeholder for next week, run this week and next week |
| 2 | Output columns and totals (does it print the operatory, phone, notes) | Print one page |
| 3 | Are cancelled placeholder appointments listed | Cancel a placeholder, run |
| 4 | Does the legacy count include online-registration pending patients or only Quick Save placeholders | Compare with Online Registered Patients |
| 5 | Product: is the interim placeholder rule acceptable until DATA-44 or is the report held | Product owner (recommended: ship with the labelled interim rule) |
| 6 | Product: accept `(no patient record)` for patientless appointments, or add NEW `appointments.placeholder_name` (typed name, owner 03, extension of DATA-44 or DATA-17) so the row prints the typed name as the legacy does | Product owner; RPT-APPT-17 carries both outcomes |

## Lab Report - `appointment.lab_report`

Appointment Reports, screenshot `4.PNG` (state REPORT TYPE = `Appointment List`) - P3 - M - `appointment` family - interactive - DOCUMENTED (`not_received`); PARTIALLY DOCUMENTED (`appointment_list`, `not_sent`, `due_date`)

### Purpose

Back office and clinical staff, daily: make sure no patient is seated without the lab case. Typical use is `Not Received`
for appointments two days ahead, then call the lab or reschedule; `Not Sent` finds cases still waiting to be shipped;
`Due Date` lists the cases due back on one day; `Appointment List` is the full list of lab cases in a period. Office
manager uses it at end of day for lab follow-up.

Legacy and older names (`legacy_names[]`): `Lab Report`, `Appointment List – Lab`, `Lab Required Not Sent Appointment List`,
`Lab Sent Not Received Appointment List`, `Appointment List - Lab due date`.

### Legacy output

| `report_type` | Printed title | Third band | Confidence |
|---|---|---|---|
| `appointment_list` | `Appointment List - Lab` | none | INFERRED (old name) |
| `not_sent` | `Lab Required Not Sent Appointments` | none | INFERRED (old name) |
| `not_received` | `Lab Sent Not Received Appointments` | `Lab Sent on : <Month d, yyyy>` | DOCUMENTED (sample 2022) |
| `due_date` | `Appointment List - Lab Due Date` | none (one due date) | INFERRED (old name) |

**`not_received` (DOCUMENTED).** `Office : <office>` -> `Lab : <lab name>   Phone# : <lab phone>` -> `Lab Sent on : <date>`.
Columns `Appt Date` · `Time` · `Provider` · `Patient Name` · `Phone#` (`(H)` `(C)` `(W)`) · `Description` · `Lab Sent` ·
`Lab Due` · `Charges`. Totals `Total Appointments for lab, <lab> : n`; `Total Appointment for, <office> : n` (legacy spelling
kept); `Grand Total Appointments : n`. Footer echo `Appt Date From` / `Thru`, `Offices`, `Providers`, `Exclude Pat Type`,
`Ex Resp Party Type`, `Labs`. `Description` = the appointment's procedure description, `Charges` = its fee (readings
[unverified]). The other three types are assumed to use the same frame and columns, `appointment_list` and `due_date` adding
`Lab Recvd` (INFERRED). No money total is printed (count totals only).

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT TYPE | (no label) (radio_group) | **Appointment List** / Not Sent / Not Received / Due Date | `report_type` | enum | Appointment List -> `appointment_list`, Not Sent -> `not_sent`, Not Received -> `not_received`, Due Date -> `due_date` | `appointment_list` | replicated | Selects the report variant. Only the Appointment List state was captured. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Provider role (line, appointment, preferred) is declared per report. Role appointment on this report: the appointment provider; roster-first list, never scoped by providers.office_id. |
| DUE DATE | Due Date (date_input) | shown: 11/21/2026 - greyed out | `due_date` | date | - | `today` | replicated_enhanced | Enabled when: report_type == due_date. Rule inferred (greyed with Appointment List in our capture). Override of 04 9.3 row 10 (report_type != appointment_list, inferred): the research notes (Lab Report, criteria table) infer the box is disabled unless REPORT TYPE = Due Date, and the old menu report Appointment List - Lab due date is the only documented use of a due date; no source gives the box a meaning for Not Sent or Not Received (the Not Received vendor screenshot shows a date in the box but its state is unreadable, and a greyed box also shows a date). Narrower rule chosen so that an undefined filter never reaches the builder; aligning 04 9.3 row 10 and the 04 DUE DATE row is part of RPT-APPT-21. Single date on rpt_lab_cases.lab_due_on (equality, the cases due on that day - unverified); APPOINTMENT DATE RANGE is disabled with Due Date (r04.s07 rule). Confirm on the live tool which report types enable it. |
| LAB | Lab (picker) | shown: ALL | `lab_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Enabled when: report_type != due_date. Range on the date of the appointment that carries the lab case (rpt_lab_cases.appointment_date), office-local. Disabled with REPORT TYPE = Due Date (inferred): that type lists the cases due on DUE DATE whatever their appointment date, and the disabled range (disabled_value = the default) is not applied by the due_date branch. Confirm on the live tool (Lab Report open question 1). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Enabled when: report_type != due_date. Inclusive end of the appointment-date range. Disabled with REPORT TYPE = Due Date (inferred): that type lists the cases due on DUE DATE whatever their appointment date, and the disabled range (disabled_value = the default) is not applied by the due_date branch. Confirm on the live tool (Lab Report open question 1). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Patients without a type are kept; no_type_defined drops them. |
| EXCLUDE RESP. PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT TYPE `Appointment List` (`report_type = appointment_list`, default) | Every lab case whose appointment falls in the range |
| `Not Sent` (`not_sent`) | Lab cases with no sent date and not received (`lab_status = 'not_sent'`) |
| `Not Received` (`not_received`) | Lab cases sent and not received (`lab_status IN ('sent','overdue')`, the backend `not_received` filter); band by sent date |
| `Due Date` (`due_date`) | Lab cases whose due date equals DUE DATE |
| PRINT FORMAT `PDF` (default) / `Excel` (`output_format`) | File format only |
| OFFICE/GROUP `Office` / `Office Group` + picker (`office_scope`) | `rpt_lab_cases.office_id` (appointment office) |
| PROVIDER `ALL` / list (`provider_ids`) | `rpt_lab_cases.provider_id` (appointment provider) |
| DUE DATE (`due_date`, default today, greyed unless `due_date`) | `lab_due_on = :due_date` with `report_type = due_date` (the appointment-date range is then disabled and not applied); otherwise disabled and ignored |
| LAB `ALL` / list (`lab_ids`) | `lab_vendor_id IN (...)`; `all` keeps cases without a lab (band `Lab : (none)`) |
| APPOINTMENT DATE RANGE Start / End (`date_from`, `date_to`, default today) | `appointment_date BETWEEN` of the appointment carrying the case, for `appointment_list`, `not_sent`, `not_received`; disabled with `due_date` (`enabled_when report_type != due_date`, inferred: the due date alone selects the cases; open question 1) |
| EXCLUDE PATIENT TYPE `None` / list (`exclude_patient_type_codes`) | Drops patients of the selected types; untyped kept |
| EXCLUDE RESP. PARTY TYPE `None` / list (`exclude_resp_party_type_codes`) | Drops patients whose account type is selected; NULL kept (SCHEMA(53)) |

Dependency rules: `due_date` enabled only when `report_type = due_date` (inferred; seen greyed with `appointment_list`, and
showing a date of unreadable state with `not_received`); `date_from` / `date_to` enabled only when `report_type != due_date`
(inferred, the mirror rule; disabled value = the default, not applied); `office_scope` group mode (d03); favorites (d04).

### Parameters - enhancements

| Key | Type | Types | Default | Effect |
|---|---|---|---|---|
| `only_overdue` (NEW, owner 04 section 3.7) | `boolean` | `not_received` | `false` | `lab_status = 'overdue'` (due date passed, not received) |
| `only_missing_for_visit` (NEW, owner 04) | `boolean` | all | `false` | `is_missing_for_visit`: the case is not back for the appointment that needs it |
| `only_short_notice` (NEW, owner 04 section 3.7) | `boolean` | all | `false` | `lc.lab_short_notice = true`: only cases flagged short notice |
| `date_range` presets and tokens | `date_range` | all | `today` | Saved view "Not received - next 2 days" (`not_received`, `today` / `today+2d`), the vendor-documented routine |
| `lab_ids` multi-select with labs of the selected offices first | `entity_multi` | all | `all` | Per-office lab assignment (`labs.office_id`) preferred, never exclusive |
| `page_break_by` | `enum` `none`, `office`, `lab` (layout) | all | `none` | One page per lab (fax or e-mail to the lab) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_lab_cases` (lc), `rpt_appointment_facts` (start time, status, base flags), `rpt_appointment_procedures` (descriptions, fees), `rpt_patient_dim`, `rpt_account_dim`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `labs` (name, phone; DATA-45, NEW registration, owner 03) |
| Base | Family base population; a case exists only as lab fields on one appointment (`has_lab`); an appointment without them never appears. No appointment-status predicate: cases on cancelled and missed appointments are listed, as `lab_tracking_service._base_stmt` does (legacy unknown, open question 7) |
| Per type | `appointment_list`: no lab-status predicate. `not_sent`: `lc.lab_sent_on IS NULL AND lc.lab_received_on IS NULL`. `not_received`: `lc.lab_sent_on IS NOT NULL AND lc.lab_received_on IS NULL`. These three AND `lc.appointment_date BETWEEN :date_from AND :date_to`. `due_date`: `lc.lab_due_on = :due_date` only, no appointment-date predicate (range disabled; received cases included, `Lab Recvd` printed) |
| `lab_status` | `derive_lab_status` (`app/services/lab_tracking_service.py`): `received`, `overdue` (sent, due before the office's today), `sent`, `not_sent`; the dataset equals it (DATA-23 acceptance) |
| Date bases | `appointment_date` for the range (types other than `due_date`); `lab_due_on` for DUE DATE; `lab_sent_on` only as a band |
| Office / provider | Appointment office and appointment provider (`rpt_lab_cases.office_id`, `.provider_id`) |
| Description / Charges | `string_agg(description, '; ')` and `sum(scheduled_fee)` of the booked lines; fallback `procedure_label`; empty when no lines |
| Availability | READY (coverage 46); `exclude_resp_party_type_codes` SCHEMA(53) |
| Migrated history | 18 migrated lab cases, 14 of them in the archive partition (excluded by the base rule); vendor, DDS and short notice are app-era, so migrated cases fall in `Lab : (none)` |

### Output

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_id`, `patient_id` | (hidden) | `id` | `phi_identified` | row id; `entity = patient` |
| `appointment_date` | Appt Date | `date` | `phi_identified` | - |
| `start_time` | Time | `time` | `phi_identified` | - |
| `provider_name` | Provider | `text` | `aggregate` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` (key column) | `count` per lab (`Total Appointments for lab, {lab_name} : n`), office (`Total Appointment for, {office_name} : n`), grand (`Grand Total Appointments : n`) |
| `phones_hcw` | Phone# (NEW derived column of this report: `(H) phone (C) cell_phone (W) work_phone`, the documented legacy order, unlike the shared `phones`) | `text` | `phi_identified` | - |
| `procedure_description` | Description | `text` | `phi_identified` | - |
| `lab_sent_on` | Lab Sent | `date` | `phi_identified` | - |
| `lab_due_on` | Lab Due | `date` | `phi_identified` | - |
| `lab_received_on` | Lab Recvd | `date` | `phi_identified` | `visible_when ["in","report_type",["appointment_list","due_date"]]` |
| `scheduled_fee` | Charges | `money` | `financial_patient` | `none` (legacy prints no money total) |
| `lab_status_label` | Status (enhancement, `default_visible: false`) | `enum` | `phi_identified` | - |
| `days_late` | Days Late (enhancement, `default_visible: false`) | `integer` | `phi_identified` | - |
| `lab_dds` | DDS (enhancement, `default_visible: false`) | `text` | `phi_identified` | - |

| Item | Rule |
|---|---|
| Grouping | `fixed_outer` office -> lab (`Lab : {lab_name}   Phone# : {lab_phone}`, `label_columns` from `labs`) -> `not_received` only: `lab_sent_on` band `Lab Sent on : {lab_sent_on:MMMM d, yyyy}` |
| Sort | `default_sort` `appointment_date`, `start_time`, `patient_last_name`, `appointment_id` within the innermost band |
| Summary cards | `lab_cases_listed` (block count), `lab_cases_overdue` (count `lab_status = 'overdue'`); on `appointment_list`, `reconciles_with` the case count behind `lab_turnaround_days` (received cases) |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar per lab: `sent` / `overdue` / `not_sent` / `received` counts (types `appointment_list`, `not_received`) |
| Row | `appointment` record (Scheduler hand-off; the lab block is on the appointment) |
| Patient name | `patient_overview` |
| Lab subtotal | `appointment.lab_cost_report` with `param_map` `lab_ids` <- `{group: lab_vendor_id}`, `office_ids` <- `{group: office_id}`, `date_from` / `date_to` <- `{param}`, `date_basis` <- `{literal: appointment_date}` |
| Office subtotal / summary card | `rows` of the same run filtered to the office or status |

### Actions

| Action | Scope | Kind | Rule |
|---|---|---|---|
| Mark received | row, bulk (confirm) | `custom:lab_mark_received` | Writes `lab_received_on = office today` through the appointment write path (`apply_lab_rules`, 422 `lab_date_order` surfaced per row); appointment-edit feature right |
| Mark sent | row | `custom:lab_mark_sent` | `not_sent` type; writes `lab_sent_on` |
| Open appointment | row | `navigate` (`appointment`) | Reschedule when the case is late |
| Call lab | row, bulk | `create_task` | Task "call <lab>" with the case list; lab phone in the task text |
| Text / e-mail patient | bulk | `send_sms`, `send_email` | "Your case is not ready, please call to reschedule"; consent exclusions counted |
| Export selection | bulk | `export_selection` | Export right |

Worklist counterpart: `worklists.lab_cases_due` (06, DASH-33) for `not_received` with a look-ahead window.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter portrait (landscape with Lab Recvd), repeat header, lab band with phone, footer echo `Appt Date From` / `Thru`, `Due Date` (type `due_date`), `Offices`, `Providers`, `Exclude Pat Type`, `Ex Resp Party Type`, `Labs`, printed date, `Page : n of m` |
| XLSX | One flat sheet (one per lab with `page_break_by = lab`), lab name and phone as columns, criteria sheet |
| CSV | Main block |
| Background | No |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Confirm whether APPOINTMENT DATE RANGE is ignored with `Due Date` (parity: disabled, the due date alone) and whether received cases are listed | Switch REPORT TYPE, run with a range that excludes the appointment |
| 2 | Is DUE DATE enabled with `Not Received` (a date is visible in the vendor capture) | Switch REPORT TYPE (family question 4) |
| 3 | Printed titles and bands of `Appointment List`, `Not Sent`, `Due Date` | Print each once |
| 4 | Does `Not Sent` mean "lab ticked, no sent date" or does it need a procedure flagged Requires Lab | Book a Requires Lab code without the lab block |
| 5 | Does the LAB picker follow the per-office lab assignment (family question 11) | Open the picker with two offices |
| 6 | `Charges` on a case appointment with several booked lines: sum or first line | Print a two-line appointment |
| 7 | Are cases on cancelled or missed appointments listed (this section: yes, no status predicate) | Cancel an appointment carrying a sent case, run `Not Received` |

## SmartAssist Report Card - `appointment.smartassist_report_card`

Appointment Reports, screenshot `5.PNG` - P3 - M - right family `appointment` (`reports_appointment_reports_screen_view_only` / `reports_appointment_reports_screen_full_control`) - cost_class interactive (escalates to background above a 31-day span, shared rules) - legacy output confidence DOCUMENTED (`detail`, samples 2021, 2022, 2024); INFERRED (`summary`)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front desk, office manager | The afternoon before the clinic day (range = tomorrow) | What must still be collected per patient: payment, e-mail, cell phone, eligibility, medical history, HIPAA and consent forms |
| Office manager | Daily close (range = today) | What was missed today: progress notes not written, visits not posted, patients leaving without a next appointment |
| Office manager, regional manager | Weekly / month end (`summary` or the percentage rows) | Checklist compliance per office and provider; where training or process changes are needed |

### Legacy output

Printed title `SmartAssist Report Card - Detail` (internal report name `SmartAssistRptCardD`); the footer of one sample spells
it `Smart Assist Report Card - Detail` [P20·img].

| Element | Legacy content | Confidence |
|---|---|---|
| Header | Organisation name, title, `Office : <office name>` (underlined) | DOCUMENTED |
| Group levels | `Office : <office>` only; rows are not grouped by provider in the samples | DOCUMENTED |
| Columns, in order | `Provider Short ID` · `Appt Date/ Time` · `Checked In By/ Out By` (two user names stacked) · `Pat Name/ Pat ID` · `Payment` · `Email` · `Cell Phone` · `Eligibility` · `Medical History` · `HIPAA` · `Consent 1` · `Consent 2` · `Consent 3` · `Consent 4` · `Progress Notes` · `Ledger Posting` · `Next Appt` | DOCUMENTED |
| Cell values | check = complete; cross = action still required; `N/A` = item not enabled in the office's SmartAssist setup | DOCUMENTED |
| Office total | `Total appointments for office, <office> : n` plus one completion percentage per check column (`N/A` where the item is not enabled) | DOCUMENTED |
| Grand total | `Grand Total appointments : n` with the same percentage row | DOCUMENTED |
| Footer | `From` / `Thru`, `Offices`, `Providers`; title, `Printed :`, `Page : n of m` | DOCUMENTED |
| Row order | By appointment date and time in the samples | INFERRED (not stated) |
| Percentage denominator | Not stated: all appointments of the group, or only those where the item applies | INFERRED |
| `Summary` format | Not seen in any vendor material; presumably the percentage rows only, per office (and provider) | INFERRED |

Check definitions (legacy, [P17]) and what we keep:

| Column | Legacy "complete" rule | DentC rule (`rpt_smart_assist_checks()`, data card 2.31) | Kept / fixed |
|---|---|---|---|
| `Payment` | Ledger balance zero; with the setup option "unpaid balance of the selected appointment", an unpaid procedure of that appointment also fails | `payment`: `patient_balance = 0` (parity rule of this report; data card 2.31 reads "not positive", which would pass a credit balance - 03 to align DATA-54); with `include_unpaid_balance` also no open charge of that appointment date | Kept. Balance is the current balance at run time (legacy behaviour): an old row turns to cross when the patient owes today; a credit balance fails as in the legacy text (open question 6) |
| `Email`, `Cell Phone` | Value on file, or a bypass reason recorded | `email`, `cell_phone`: value on file | Bypass reason does not exist in DentC (gap, open question 3) |
| `Eligibility` | Primary eligibility `Eligible`; `Not Eligible`, `Unknown` or expired fail | `eligibility`: primary dental slot `elig_status_class = 'verified'` | Kept, including the quirk that a later-expired stamp turns history to cross |
| `Medical History` | Present within the setup frequency | `medical_history`: latest completion inside the frequency window ending on the appointment date | Kept |
| `HIPAA`, `Consent 1-4` | Form on file within its frequency (`Every Visit`, `Every Year`, `Every Two Years`, `Every Calendar Year`) | `hipaa`, `consent_form_1` .. `consent_form_4` with the windows of data card 2.31 (`ONCE` added) | Kept; consent columns need the template mapping (DATA-54) |
| `Progress Notes` | A progress note on the appointment date | `progress_note`: non-struck note, same office, same date | Kept |
| `Ledger Posting` | A ledger entry dated the appointment date | `ledger_posting`: `EXISTS` a `rpt_ledger_entries` row of the patient with `office_id` = the appointment office and `transaction_date = appointment_date`, any `entry_type` (a payment or a non-visit-code charge passes); data card 2.31 reads `has_charge_same_day`, narrower - 03 to amend 2.31 / DATA-54 | Kept; posting on a later date fails (legacy quirk); whether a payment-only day passes on the live tool is open question 6 |
| `Next Appt` | A later appointment in the same office | `next_appointment`: later live appointment, same office | Kept; needs the catalog item of RPT-APPT-42 |

Quirks kept: every check reads only data of the appointment's own office (OID), even on a multi-office run (shared rules).
Quirk fixed: one title spelling (`SmartAssist`) in header and footer.

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail = one row per appointment (block card_detail, title SmartAssist Report Card - Detail, DOCUMENTED); Summary = percentage rows per office and provider without patient rows (block card_summary, title SmartAssist Report Card - Summary, layout INFERRED: not seen in vendor material). Nothing greyed in the capture; whether Summary greys any control is unknown (catalog open question 1). |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Provider role (line, appointment, preferred) is declared per report. Role appointment on this report: the appointment provider; roster-first list, never scoped by providers.office_id. |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Range on rpt_appointment_facts.appointment_date (fixed basis), office-local. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the appointment-date range. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| OTHER OPTIONS | Include Missed Appointments (checkbox) | **unchecked** | `include_missed_appointments` | boolean | - | `false` | replicated | Unticked (default): population = status_class = 'completed' OR (status_class = 'past_unresolved' AND is_kept) - checked in through checked out, or posted procedures (on migrated rows the same-day visit charge). Ticked: adds every other not-cancelled row (no_show, past_unresolved not kept, in_office, confirmed, unconfirmed, scheduled), future appointments included. Cancelled rows depend on Include Cancelled Appointments only. Whether an in_office row needs the tick is unverified (catalog open question 5). |
| OTHER OPTIONS | Include Cancelled Appointments (checkbox) | **unchecked** | `include_cancelled_appointments` | boolean | - | `false` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | `report_format = detail`: one row per appointment, block `card_detail`, title `SmartAssist Report Card - Detail` |
| REPORT FORMAT `Summary` | `report_format = summary`: no patient rows; one row per office and provider with the appointment count and the completion percentage per check, block `card_summary`, title `SmartAssist Report Card - Summary` (layout INFERRED) |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output`, rows unchanged; the result is always shown on screen first |
| OFFICE/GROUP `Office` (default) with picker `108` (working office) | `office_ids = [working office]`: appointments whose `rpt_appointment_facts.office_id` is in the set; the checks of each row read only that row's office |
| OFFICE/GROUP `Office` with several offices / `all` | One `Office :` band per office, office totals with their own percentage rows, grand total over all bands |
| OFFICE/GROUP `Office Group` | `office_group_id`: the offices of the group, banded per office |
| PROVIDER `ALL` (default) | No predicate |
| PROVIDER selected providers | `rpt_appointment_facts.provider_id IN (:provider_ids)` (appointment provider); percentages are computed over the filtered rows |
| APPOINTMENT DATE RANGE Start Date / End Date (default `today` / `today`) | `appointment_date BETWEEN :date_from AND :date_to`, office-local, inclusive. A future range returns rows only with Include Missed Appointments (no future appointment is kept) |
| OTHER OPTIONS Include Missed Appointments unticked (default) | Population = `status_class = 'completed' OR (status_class = 'past_unresolved' AND is_kept)`: went from check-in through check-out, or has posted procedures - on migrated history (no check-out or posting stamp) the same-day visit charge behind `is_kept` (data card 2.15 era caveats) |
| Include Missed Appointments ticked | Adds every other not-cancelled row: `no_show`, `past_unresolved` not kept, `in_office`, `confirmed`, `unconfirmed`, `scheduled` - future appointments included (the pre-visit use) |
| OTHER OPTIONS Include Cancelled Appointments unticked (default) | `status_class = 'cancelled'` rows left out |
| Include Cancelled Appointments ticked | Adds `cancelled` rows; their checks are evaluated like any other row |
| Footer actions | `CLEAR CRITERIA` -> frontend reset to defaults; `PRINT / PREVIEW` -> run with `render_output`; `ADD TO MY FAVORITES` -> saved view + favorite |

Dependency rules: none captured (nothing greyed in `5.PNG`). Whether `Summary` greys any control is unknown (open
question 1). The two OTHER OPTIONS combine additively: both ticked = every live appointment of the range.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `failed_check_codes` (NEW, report-specific) | `enum_multi` of the 13 item codes (`payment`, `email`, `cell_phone`, `eligibility`, `medical_history`, `hipaa`, `consent_form_1` .. `consent_form_4`, `progress_note`, `ledger_posting`, `next_appointment`), `accepts_all` | `all` | `all` = no predicate. A list = only rows that fail at least one listed check. Target of the percentage drill; turns the card into a to-do list |
| `only_incomplete_appointments` (NEW) | `boolean` | `false` | `true` = rows with at least one `fail` cell only (pre-visit worklist) |
| `group_by` (shared key) | `enum`: `none`, `provider`, `checked_out_by_user` (NEW value, owner 04) | `none` | Adds a provider or check-out-user level under the office band with its own count and percentage row (legacy prints office only) |
| `date_range` presets | token pair `tomorrow` / `tomorrow` (custom), `this_week`, `last_week`, `month_to_date`, `last_month` | `today` | Saved views "Tomorrow's checklist" (`include_missed_appointments = true`, `only_incomplete_appointments = true`) and "Last month's score" (`summary`) |
| `compare_to` (filter card 12, P4) | `enum` | `none` | `summary` only: a prior-period percentage column per check and a delta |
| `operatory_ids` (shared key) | `entity_multi` | `all` | Restrict to chairs (hygiene vs restorative rooms) |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_smart_assist_checks(p_tenant_id, p_office_ids, p_date_from, p_date_to)` (signature proposed, not in data card 2.31; one row per appointment, 13 check columns each `pass` / `fail` / `not_enabled`, plus NEW output columns `checked_in_by_user_id`, `checked_out_by_user_id` - owner 03, DATA-54, read from `appointments.checked_in_by` / `checked_out_by` of DATA-17), joined on `appointment_id` to `rpt_appointment_facts` (flags, `status_class`, `provider_id`, `operatory_id`); `rpt_provider_dim.short_id`; `rpt_patient_dim` (`first_name`, `last_name`, `chart_no`); `rpt_user_dim.user_label` through `'u:' || checked_in_by_user_id` / `checked_out_by_user_id`; `rpt_office_dim.office_name` |
| Base filter | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`; status predicate from the two OTHER OPTIONS: default `status_class = 'completed' OR (status_class = 'past_unresolved' AND is_kept)`; Include Missed adds the other non-cancelled classes; Include Cancelled adds `cancelled` |
| Date basis | `appointment_date` (fixed, `date_basis` = `appointment_date`) |
| Office attribution | `appointment` (`rpt_appointment_facts.office_id`); the function receives the resolved office list as `p_office_ids` |
| Provider attribution | `appointment` (`rpt_appointment_facts.provider_id`); `scope.provider_restriction = none` |
| Office setup | `office_smart_assist_items` per office: `is_enabled`, `frequency`, `include_unpaid_balance`, `consent_template_id` (DATA-54). An item not enabled, or a consent item without a template, returns `not_enabled` and prints `N/A`; the run lists such consent items in an `availability[]` notice |
| Rating | READY (coverage 47): consents, medical-history completion and eligibility stamps are APP; consent columns SCHEMA(54); `Checked In By / Out By` SCHEMA(17) |
| `next_appointment` | Computed by the function (data card 2.31) but `SMART_ASSIST_CATALOG` (`office_setup_service.py` L314-339) has no `next_appointment` item, so no office can enable it and the column would always print `N/A`: RPT-APPT-42 adds the item (NEW, owner 03 DATA-54) |
| Migrated history | Every migrated appointment fails `eligibility` (all migrated stamps are `unknown`), `medical_history`, `hipaa` (unless `hipaa_agreement` was migrated) and the consents by construction; `Checked In By / Out By` is empty for all rows before DATA-17 and forever for migrated rows; `ledger_posting` and `progress_note` are exact in both eras. `availability[]` code `smart_assist_history_app_only` (NEW, 03): printed when the range touches migrated appointments |
| Completion % | Per check `ratio(pass_count, applicable_count)` with hidden integer columns `<check>_pass` (1 when `pass`) and `<check>_applicable` (1 when `pass` or `fail`); `N/A` when `applicable_count = 0`. Denominator excludes `not_enabled` rows (legacy unknown, open question 2) |

### Output

Block `card_detail` (`report_format = detail`), grouping `fixed_outer` office, `grand_total.label = Grand Total appointments`,
office `subtotal_label_template = Total appointments for office, {office_name}`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_short_id` | Provider Short ID | text | `aggregate` | `label` |
| `appointment_date` | Appt Date | date | `phi_identified` | none |
| `start_time` | Time (second line of `Appt Date/ Time`) | time | `phi_identified` | none |
| `checked_in_by_label` | Checked In By | text | `aggregate` (operational user label, security rule 12) | none; empty before DATA-17 |
| `checked_out_by_label` | Out By | text | `aggregate` | none |
| `patient_name` | Pat Name | text | `phi_identified` (key column) | `count` -> `Total appointments for office, <office> : n` |
| `chart_no` | Pat ID | text | `phi_identified` | none |
| `payment` | Payment | enum (`pass` ✓, `fail` ✗, `not_enabled` N/A) | `phi_identified` | `ratio(payment_pass, payment_applicable)` as percent, 0 decimals (open question 2) |
| `email`, `cell_phone`, `eligibility`, `medical_history`, `hipaa`, `consent_form_1`, `consent_form_2`, `consent_form_3`, `consent_form_4`, `progress_note`, `ledger_posting`, `next_appointment` | Email, Cell Phone, Eligibility, Medical History, HIPAA, Consent 1, Consent 2, Consent 3, Consent 4, Progress Notes, Ledger Posting, Next Appt | enum (as `payment`) | `phi_identified` | same `ratio` rule per column |
| `appointment_status` | Status (enhancement, `default_visible = false`) | enum (`status_norm` in legacy wording, shared rules) | `phi_identified` | none |
| hidden: `appointment_id`, `patient_id`, `office_id`, `provider_id`, `status_class`, 26 `<check>_pass` / `<check>_applicable` integers | - | id / integer | `phi_identified` (ids), `aggregate` (counters) | `sum` of the counters feeds the ratios |

Block `card_summary` (`report_format = summary`, INFERRED layout): grouping `fixed_outer` office, rows = providers.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_short_id`, `provider_name` | Provider Short ID, Provider | text | `aggregate` (key column) | `label` |
| `appointment_count` | Appointments | integer | `aggregate` | `sum` per office and grand total |
| `<check>_pct` x 13 | Payment ... Next Appt | percent | `aggregate` | `ratio` of summed counters (never an average of percentages) |
| `incomplete_appointment_count` | Appointments with an open item (enhancement) | integer | `aggregate` | `sum` |

Sort: detail `default_sort` = `appointment_date`, `start_time`, `provider_short_id`, `patient_last_name` (hidden),
`row_id_column = appointment_id`; screen re-sort allowed on every visible column. Summary: provider short id. Page break:
none in the legacy; `page_break_by` enhancement `office` (layout). Summary cards (both formats): Appointments (block total),
Fully complete appointments (rows without `fail`), lowest-scoring check (label + percent). No metric key exists for the
checklist: NEW `smart_assist_completion_pct` (owner `05_metric_catalog.md` 5.12 Front office) for the dashboard tile;
the card values are block totals of the run.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (summary) | Horizontal bar chart: completion % per check, one bar per item (`charts[] kind = bar`, category = check, value = percent); with `compare_to` a paired bar |
| Chart (detail, optional) | none - the grid itself is the visual |
| Percentage cell of an office or provider total | `rows`: same report, `report_format = detail`, `failed_check_codes = [<check>]`, group key copied (`office_ids`, `provider_ids`) |
| Summary row | `rows`: detail of that provider and office |
| `patient_name` | `record` patient overview (`phi_identified`; route `patient_overview`) |
| `appointment_date` / `start_time` | `record` appointment in the Scheduler (UX-22) |
| `fail` cell | `record` to the screen that fixes it: `payment` -> patient ledger (`right_code` of the ledger feature); `email`, `cell_phone` -> patient demographics edit; `eligibility` -> patient insurance; `medical_history` -> medical history tab; `hipaa`, `consent_form_n` -> letters / consent of the patient; `progress_note` -> progress notes; `ledger_posting` -> transactions entry of the appointment date; `next_appointment` -> Scheduler booking hand-off (`openSchedulerForBooking`) |

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open patient, open appointment | row | `navigate` | As the drills |
| Book next appointment | row | `navigate` (Scheduler hand-off) | Offered when `next_appointment = fail` |
| Ask patient to update contact details / complete forms | row, bulk | `send_sms`, `send_email` | Rows failing `email`, `cell_phone`, `medical_history`, `hipaa`, `consent_form_n`; exclusions `no_auto_sms`, `no_auto_email`, `no_correspondence`; handler of the messaging feature (PD-15) |
| Create follow-up task | row, bulk | `create_task` | One task per selected row naming the failed checks; assignee chosen in the dialog |
| Export selection | bulk | `export_selection` | - |

Worklist: the detail format with `only_incomplete_appointments = true` and a tomorrow range is a printable worklist; a live
counterpart `worklists.smart_assist_open_items` is proposed (NEW, owner `06_dashboards.md` worklists).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter landscape (17 columns), `repeat_header`, `criteria_echo = footer` (`From` / `Thru`, `Offices`, `Providers`), check glyphs from the vendored Unicode font (ENG-23), `N/A` text; percentage row printed under each office and the grand total |
| XLSX | One sheet per block; check cells as text `Complete` / `Missing` / `N/A` (filterable), percentages as typed percent cells in total rows; criteria sheet; no merged cells |
| CSV | Main block only, same text values |
| Background | Above a 31-day span (`escalate_when`); a month for a 10-office group is the typical background run |

### Open questions

| # | Question | How to settle |
|---|---|---|
| 1 | Layout of `Summary` and whether it greys any criterion | Print `Summary` on the live tool |
| 2 | Percentage denominator (all rows or applicable rows) and its decimals | Run a day where one item is enabled mid-period, compare the printed % |
| 3 | Legacy bypass reason for e-mail and cell phone: does a bypass count as complete? DentC stores no bypass (product decision: add `contact_bypass_reason` NEW on patients, or accept the difference) | Live tool + product owner |
| 4 | Is `Next Appt` configurable in the legacy SmartAssist setup or always on? | Open the legacy SmartAssist setup |
| 5 | Exact population of "missed": does an `in_office` (checked in, not out) row appear without the tick? Is a visit with posted procedures but never checked out listed without the tick (parity: yes, through `is_kept`)? | Run a day with a patient still in the chair and one posted without check-out |
| 6 | Is `Payment` evaluated on the current balance or as of the appointment date? Does a credit balance pass `Payment`? Does a payment-only or non-visit-code posting pass `Ledger Posting`? | Run an old date for a patient whose balance changed since; a patient in credit; a day with only a payment posted |

## Appointments Confirmed Via Vendors - `appointment.appointments_confirmed_via_vendors`

Appointment Reports, screenshot `6.PNG` - P3 - M - right family `appointment` (`reports_appointment_reports_screen_view_only` / `reports_appointment_reports_screen_full_control`) - cost_class interactive - legacy output confidence INFERRED (no vendor article, sample or training page)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Office manager | Weekly, on demand | Audit what a third-party confirmation service wrote back: which appointments it confirmed, when, for which office |
| Administrator | When evaluating or switching a reminder vendor | Volume of confirmations per vendor; whether a vendor confirms appointments that later no-show |
| Front desk | Morning of the day | Appointments already confirmed by the vendor, so they need no call (complement of the confirmation call list) |

### Legacy output

No output was found (research section 4, [L1][P34]). The report exists since at least 2022 [P26·img]. Vendors are enabled
per office under `Setup > Offices > Vendor API Settings (New)` [P34]. The layout below is INFERRED from the in-family
campaign cancellation template [P7·img] and must be confirmed.

| Element | Proposed content | Confidence |
|---|---|---|
| Title | `Appointments Confirmed Via Vendors` (the menu name; the real printed title is unknown) | INFERRED |
| Group levels | `Office : <office>` -> `Vendor : <vendor name>` | INFERRED |
| Columns, in order | `Appt Date` · `Time` · `Operatory` · `Provider` · `Patient Name / Pat ID` · `Phone` · `Procedures` · `Confirmed On` · `Status` | INFERRED |
| Totals | `Total for, <vendor> : n`, `Total for, <office> : n`, `Grand Total : n` (family count templates) | INFERRED |
| Footer | `Date From` / `Thru`, `Offices`, `Vendors` | INFERRED |

Signs: no money. Quirk to fix: legacy confirmation stamps are Pacific server time [P33]; `Confirmed On` prints office
local time (shared rules).

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Basis inferred: rpt_appointment_facts.appointment_date (04 7.2 row 4); the alternative reading, the confirmation date, is offered as the enhancement date_basis = confirmed_date (NEW value of 04 7.3). Confirm on the live tool (catalog open question 2). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end; basis inferred as Start Date. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| VENDORS | Vendors (picker) | shown: ALL | `vendor_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Vendor = third-party service that confirmed the appointment; no such entity exists yet (new lookup). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r06:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output`; rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` | `office_ids = [working office]` on `rpt_appointment_facts.office_id` (appointment office) |
| OFFICE/GROUP `Office` with several offices / `all` | One `Office :` band per office with its own vendor groups and office total |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office |
| DATE RANGE Start Date / End Date (default `today` / `today`) | `appointment_date BETWEEN :date_from AND :date_to`, office-local, inclusive (basis INFERRED, 04 7.2 row 4; the alternative reading - confirmation date - is the enhancement `date_basis = confirmed_date`) |
| VENDORS `ALL` (default) | Every vendor: rows with a vendor confirmation event, whatever the vendor |
| VENDORS selected vendors | `vendor_codes`: applied to the latest vendor confirmation event of the appointment (the one printed), so the row and its `Vendor :` group always agree; one group per selected vendor that has rows |
| Footer actions | `CLEAR CRITERIA` frontend; `PRINT / PREVIEW` run; `ADD TO MY FAVORITES` saved view |

Dependency rules: none (nothing greyed in `6.PNG`; no provider control - the definition has no `provider_ids` and
`scope.provider_restriction = none`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `confirmation_sources` (NEW, report-specific) | `enum_multi`: `vendor`, `sms`, `appointnow`, `staff` (values of `appointment_events.source`) | `["vendor"]` (the legacy population) | Widens the report to every confirmation channel, so the DentC SMS-reply confirmations (Twilio, `source = sms`) and staff phone confirmations can be compared with vendor ones; `vendor_codes` applies only to `vendor` rows; the group level becomes `Source / Vendor` |
| `date_basis` (shared key) | `enum`: `appointment_date` (default, legacy), `confirmed_date` (NEW value, owner 04 7.3) | `appointment_date` | `confirmed_date` = office-local date of the confirmation event (`occurred_at`), for "what did the vendor do yesterday" |
| `provider_ids` (shared key, enhancement only) | `entity_multi` | `all` | Appointment provider filter the legacy screen lacks |
| `appointment_statuses` (key of `appointment.appointment_list`) | `enum_multi` of `status_class` | `all` | E.g. only `no_show` / `cancelled`: confirmed appointments that still broke (vendor quality) |
| Date presets | `yesterday`, `last_7_days`, `last_month` | `today` | Saved view "Vendor confirmations last month by vendor" |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_appointment_facts` (`appointment_date`, `start_time`, `operatory_id`, `provider_id`, `patient_id`, `status_class`, `procedure_label`, `confirmed_on`), passthrough `appointment_events` (NEW in DATA-17: `event_type`, `source`, `vendor`, `occurred_at`, `actor_user_id`), `rpt_appointment_procedures` (codes), `rpt_patient_dim` (`first_name`, `last_name`, `chart_no`, `cell_phone`, `phone`), `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories` (name) |
| Population | Live appointments (`NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`) in the range with at least one event `event_type = 'confirmed' AND source = 'vendor'` (`EXISTS`); the printed vendor and `Confirmed On` come from the latest such event (`LEFT JOIN LATERAL ... ORDER BY occurred_at DESC LIMIT 1`), so an appointment appears once. An appointment confirmed by two vendors is listed under the latest one (INFERRED); `vendor_codes` filters that latest event, not any event |
| Status | Current `status_class` printed, never filtered by default: a vendor-confirmed appointment later cancelled stays listed (INFERRED; open question 2) |
| Date basis | `appointment_date` (default); enhancement `confirmed_date` = `(occurred_at AT TIME ZONE 'UTC' AT TIME ZONE office.timezone)::date` with the per-office UTC bounds of data card 4.3 |
| Office / provider attribution | `appointment` / `appointment` |
| Option source | `lookup:confirmation_vendors` (NEW, FLT-09): until a vendor-integration registry exists (NEW entity, owner 03), the distinct `appointment_events.vendor` codes of the tenant, labelled by the code; inactive vendors kept |
| Rating | SCHEMA(17) (coverage 48): no vendor or confirmation channel is stored in either era. DentC has no vendor API today, so even after DATA-17 the default run (`source = vendor`) is empty until an integration writes `source = 'vendor'` with a `vendor` code; `confirmed_on` without an event cannot be attributed to a vendor |
| Migrated history | None, ever: migrated appointments carry no confirmation stamp or channel. `availability[]` code `vendor_confirmation_app_only` (NEW, 03): returned and printed whenever the range starts before the DATA-17 go-live date |

### Output

Block `vendor_confirmations`, grouping `fixed_outer` office -> level `vendor` (`header_template = Vendor : {vendor_label}`,
`subtotal_label_template = Total for, {vendor_label}`), `grand_total.label = Grand Total`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | none |
| `start_time` | Time | time | `phi_identified` | none |
| `operatory_name` | Operatory | text | `aggregate` | none |
| `provider_short_id` | Provider | text | `aggregate` | none |
| `patient_name` | Patient Name | text | `phi_identified` (key column) | `count` -> `Total for, <vendor> : n`, `Total for, <office> : n`, `Grand Total : n` |
| `chart_no` | Pat ID | text | `phi_identified` | none |
| `patient_phone` | Phone | text | `phi_identified` | none (cell, else home) |
| `procedures` | Procedures | text | `phi_identified` | none (`code` list of the booked lines, else `procedure_label`) |
| `vendor_label` | Vendor | text | `aggregate` | group key (hidden in the band layout, visible in XLSX) |
| `confirmed_at` | Confirmed On | datetime (`tz = office`) | `phi_identified` | none |
| `appointment_status` | Status | enum (`status_norm` in legacy wording, shared rules) | `phi_identified` | none |
| `confirmation_lead_hours` | Hours before appt (enhancement, `default_visible = false`) | decimal | `phi_identified` | `avg` per vendor (aggregate in totals) |
| hidden: `appointment_id`, `patient_id`, `office_id`, `vendor_code`, `patient_last_name` | - | id / text | `phi_identified` / `aggregate` | - |

Sort: `appointment_date`, `start_time`, `patient_last_name`; `row_id_column = appointment_id`. Page break: none in the
legacy; enhancement `page_break_by = group` (per vendor). Summary cards: Vendor confirmations (grand total), Vendors (count
distinct), Confirmed then broken (rows with `status_class IN ('cancelled', 'no_show')`). Related metric
`reminder_confirmation_rate_pct` (DentC SMS reminders only; it does not cover vendors).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar per day: confirmations per vendor (with `confirmation_sources`: per channel) |
| Vendor subtotal | `rows`: same report filtered to that vendor (`vendor_codes = [<code>]`) |
| Row | `record` appointment in the Scheduler; patient name -> patient overview |
| "Confirmed then broken" card | `rows` with `appointment_statuses = ["cancelled", "no_show"]` |

### Actions

| Action | Scope | Kind |
|---|---|---|
| Open appointment, open patient | row | `navigate` |
| Export selection | bulk | `export_selection` |

Not a worklist (an audit list). No messaging actions: these patients have already confirmed.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter portrait (9 columns) or `auto`, `repeat_header`, `criteria_echo = footer` (`Date From` / `Thru`, `Offices`, `Vendors`), "Times in office local time" note |
| XLSX | One flat sheet with `office_name` and `vendor_label` as columns, typed date / time cells; criteria sheet |
| CSV | Same columns |
| Background | Not expected (one row per confirmed appointment) |

### Open questions

| # | Question | How to settle |
|---|---|---|
| 1 | Printed title, columns, grouping and totals (whole layout INFERRED) | Print the report on the live tool with a vendor-confirmed appointment |
| 2 | Is the range the appointment date or the confirmation date; are later-cancelled appointments listed | Confirm through a vendor, cancel, run both ranges |
| 3 | What the VENDORS picker lists (the vendors enabled per office under Vendor API Settings?) and whether disabled vendors stay listed | Open the picker on the live tool |
| 4 | Product: which DentC integrations count as "vendor" (none exist today); should SMS-reply confirmations be in the default population | Product owner; the parity default keeps vendor only |

## Appointment Time Stamps - `appointment.appointment_time_stamps`

Appointment Reports, screenshot `7.PNG` - P3 - M - right family `appointment` (`reports_appointment_reports_screen_view_only` / `reports_appointment_reports_screen_full_control`) - cost_class interactive - legacy output confidence DOCUMENTED (columns in vendor text [P16]); page layout, grouping and totals not seen (INFERRED)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Office manager | Weekly, after a complaint about waiting | Patient flow: how late patients are seated against their scheduled time, time from reception to chair, chair time |
| Owner, regional manager | Monthly | Which providers and hours run late; chair-time against booked duration (schedule template tuning) |
| Front desk lead | Daily | Whether staff record the flow statuses at all (empty stamps = process gap) |

### Legacy output

| Element | Legacy content | Confidence |
|---|---|---|
| Title | `Appointment Time Stamps` | INFERRED (menu name) |
| Columns, in order | `Appt Date` · `Appt Time` · `In Reception` · `Available Time` · `In Operatory` · `Check Out Time` · `Time Waiting (Hr:Min)` · `Reception to Operatory (Hr:Min)` · `Operatory to Checkout (Hr:Min)` · `Posted` | DOCUMENTED [P16] |
| Patient and provider columns | Presumably present (not in the vendor field table) | INFERRED |
| Group levels | `Office : <office>` (family pattern) | INFERRED |
| Totals | Count lines (family pattern); no averages or medians documented | INFERRED |

Definitions kept: `Time Waiting` = scheduled appointment time -> `In Operatory` (lateness of seating, not lobby wait: early
arrivals shorten it, late patients lengthen it); `Reception to Operatory` = `In Reception` -> `In Operatory`;
`Operatory to Checkout` = `In Operatory` -> `Checked Out`; `Posted` = procedures posted. Quirk fixed: legacy stamps are
Pacific server time [P33]; DentC prints office local time. A negative `Time Waiting` (seated before the scheduled time)
prints with a minus sign (`-0:05`); the legacy rendering of that case is unknown.

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Provider role (line, appointment, preferred) is declared per report. Role appointment on this report: the appointment provider; roster-first list, never scoped by providers.office_id. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r07:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output`; rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` | `office_ids = [working office]` on the appointment office |
| OFFICE/GROUP `Office` with several offices / `all` | One `Office :` band per office with its own count total |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office |
| PROVIDER `ALL` (default) | No predicate |
| PROVIDER selected providers | `rpt_appointment_facts.provider_id IN (:provider_ids)` |
| DATE RANGE Start Date / End Date (default `today` / `today`) | `appointment_date BETWEEN :date_from AND :date_to`, office-local, inclusive (basis INFERRED, 04 7.2 row 5) |
| Footer actions | `CLEAR CRITERIA` frontend; `PRINT / PREVIEW` run; `ADD TO MY FAVORITES` saved view |

Dependency rules: none (nothing greyed in `7.PNG`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `operatory_ids` (shared key) | `entity_multi` | `all` | Restrict to chairs |
| `group_by` (shared key) | `enum`: `none`, `provider`, `operatory` (NEW value, owner 04) | `none` | Adds a level under the office band with count and flow statistics per group |
| `min_time_waiting_minutes` (NEW, report-specific) | `integer`, `validation.min = 0` | blank (no predicate) | Only rows whose `Time Waiting` is at least n minutes: the late-seating exception list |
| `only_with_time_stamps` (NEW) | `boolean` | `false` | `true` drops rows without any flow stamp (unrecorded flow); `false` keeps them so recording gaps are visible |
| `show_flow_statistics` (NEW) | `boolean`, `role: query` | `false` | Adds block `flow_statistics` (`placement = report_end`): count, median and 90th percentile of the three durations per office and provider |
| `compare_to` (filter card 12, P4) | `enum` | `none` | Prior-period median beside each statistic |
| Date presets | `last_week`, `last_month`, `last_30_days` | `today` | Saved view "Last month flow by provider" (`group_by = provider`, `show_flow_statistics = true`) |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_appointment_facts` (`appointment_date`, `start_time`, `duration_minutes`, `provider_id`, `operatory_id`, `patient_id`, `status_class`, `checked_in_on`, `checked_out_on`, `posted_on`; after DATA-17 `available_on`, `seated_on` exposed by the view - NEW columns of the dataset, owner 03), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories` |
| Stamp mapping | `In Reception` = `checked_in_on` (statuses `in_reception`, `arrived`, `checked_in` only: DATA-17 / RPT-APPT-52 must not stamp it on `available` or `in_operatory`; when `checked_in_on = seated_on` the patient went straight to the chair, `In Reception` prints empty and `Reception to Operatory` is null); `Available Time` = `available_on` (DATA-17); `In Operatory` = `seated_on` (DATA-17); `Check Out Time` = `checked_out_on`; `Posted` = `is_posted` = `posted_on IS NOT NULL OR has_charge_same_day` (Yes / No; `posted_on` is app-era only, the same-day visit charge covers migrated history). Stamps are the latest value written (overwritten, never cleared): a status set twice prints the second time; `appointment_events` is not read row by row |
| Scheduled time | `(appointment_date + start_time)` as office-local wall time; stamps converted from UTC to the office zone before subtracting (`format.tz = office`) |
| Durations | `difference(seated_on_local, scheduled_at)`, `difference(seated_on, checked_in_on)`, `difference(checked_out_on, seated_on)` in minutes, `null` when either stamp is missing (`null_display` empty, never `0:00`) |
| Population | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND status_class NOT IN ('cancelled', 'no_show')` (INFERRED: the legacy population is not documented; cancelled and missed appointments carry no flow) |
| Date basis / attribution | `appointment_date`; office `appointment`; provider `appointment` |
| Rating | SCHEMA(17) (coverage 49): only check-in and check-out stamps exist today; `Available`, `In Operatory` and all three durations need DATA-17 |
| Migrated history | No stamp at all on migrated rows (data card 4.2): rows print with empty stamp cells; `Posted` prints Yes when a same-day visit charge exists (`has_charge_same_day`), else No. App-era rows before DATA-17 have `In Reception`, `Check Out Time`, `Posted` only. `availability[]` codes `flow_stamps_app_only` and `flow_stamps_before_events` (NEW, 03) returned when the range touches either period |

### Output

Block `time_stamps`, grouping `fixed_outer` office (+ optional `group_by` level), `grand_total.label = Grand Total`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | none |
| `start_time` | Appt Time | time | `phi_identified` | none |
| `patient_name` | Patient (INFERRED, confirm: open question 1) | text | `phi_identified` (key column) | `count` -> `Total for, <office> : n` / `Grand Total : n` (INFERRED) |
| `chart_no` | Pat ID (INFERRED, confirm: open question 1) | text | `phi_identified` | none |
| `provider_short_id` | Provider (INFERRED, confirm: open question 1) | text | `aggregate` | none |
| `in_reception_at` | In Reception | time (`tz = office`) | `phi_identified` | `count` of non-empty (stamp coverage, enhancement row) |
| `available_at` | Available Time | time | `phi_identified` | same |
| `in_operatory_at` | In Operatory | time | `phi_identified` | same |
| `checked_out_at` | Check Out Time | time | `phi_identified` | same |
| `time_waiting_minutes` | Time Waiting (Hr:Min) | duration (`unit = minutes`, rendered `H:MM`, signed) | `phi_identified` | `avg` per group (legacy prints none; enhancement row, `aggregate`) |
| `reception_to_operatory_minutes` | Reception to Operatory (Hr:Min) | duration | `phi_identified` | `avg` (enhancement) |
| `operatory_to_checkout_minutes` | Operatory to Checkout (Hr:Min) | duration | `phi_identified` | `avg` (enhancement) |
| `is_posted` | Posted | boolean (Yes / No) | `phi_identified` | `count` of Yes |
| `booked_minutes` | Booked (min) (enhancement, `default_visible = false`) | integer | `phi_identified` | `sum` |
| hidden: `appointment_id`, `patient_id`, `office_id`, `provider_id`, `operatory_id`, `patient_last_name` | - | id / text | `phi_identified` / `aggregate` | - |

Block `flow_statistics` (with `show_flow_statistics`, `placement = report_end`): rows = office x provider; columns
`appointment_count`, `stamped_count`, and for each of the three durations `median_minutes`, `p90_minutes` (all
`aggregate`). Percentiles are computed by the builder (`percentile_cont`), not by the banding step; NEW metrics
`flow_time_waiting_minutes`, `flow_reception_to_operatory_minutes`, `flow_operatory_to_checkout_minutes` (owner
`05_metric_catalog.md` 5.4, availability G(17)) reconcile with the medians (`reconciles_with`).

Sort: `appointment_date`, `start_time`, `patient_last_name`; `row_id_column = appointment_id`; screen re-sort on every
duration column (worst first). Page break: none in the legacy; `page_break_by = office` enhancement. Summary cards:
Appointments, Median time waiting, Median chair time (`operatory_to_checkout`), Share of appointments with a full set of
stamps.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar chart of median `Time Waiting` by scheduled hour of day (category = hour of `start_time`), one series per provider (top 6); hint `kind = bar` on `flow_statistics` |
| Provider row of `flow_statistics` | `rows`: detail of that provider and office, sorted by `time_waiting_minutes` descending |
| Row | `record` appointment in the Scheduler; patient name -> patient overview |

### Actions

| Action | Scope | Kind |
|---|---|---|
| Open appointment, open patient | row | `navigate` |
| Export selection | bulk | `export_selection` |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter portrait allowed (13 columns -> `auto` picks landscape), `repeat_header`, `criteria_echo = footer` (`Date From` / `Thru`, `Offices`, `Providers` - labels INFERRED from the family pattern, confirm: open question 1; "Times in office local time") |
| XLSX | Flat sheet; stamps as typed time cells, durations as numeric minutes with an `[h]:mm` number format; statistics block on its own sheet |
| CSV | Main block; durations in minutes |
| Background | Not expected below a month for one office; follows the 31-day family proposal otherwise |

### Open questions

| # | Question | How to settle |
|---|---|---|
| 1 | Page layout: patient and provider columns, grouping, totals | Print the report on the live tool |
| 2 | Population: are cancelled / missed appointments and appointments without stamps listed | Same run on a day with a no-show |
| 3 | How the legacy prints a negative `Time Waiting` and a missing stamp | Seat a patient early on the test tenant |
| 4 | Does the DentC Scheduler offer the `Available` and `In Operatory` statuses at all (DATA-17 must stamp them) | Check the status menu; otherwise the two columns stay empty in DentC |

## Appointment Detail - `appointment.appointment_detail`

Appointment Reports, screenshot `8.PNG` (bottom clipped; completed by vendor screenshots) - P3 - L - right family `appointment` (`reports_appointment_reports_screen_view_only` / `reports_appointment_reports_screen_full_control`) - cost_class interactive (escalates to background above a 31-day span) - legacy output confidence DOCUMENTED (samples 2013, 2023, 2026)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front desk, providers | Every afternoon (range = tomorrow), with phone numbers | Printed schedule per provider; providers call their patients |
| Office manager | Month end (`include_cancelled_appointments` as needed) | Count of appointments scheduled in the month, missed included |
| Office manager | Weekly, by `Created On Date` and `GROUP BY` User | Who booked what: user accountability, recall visits pre-booked at the date of service |
| Office manager | On demand, `Only AppointNow Appointments` | Online bookings received and booked |

Old names kept as aliases: `Appointment Details Report`, `Appointment Detail By User` (research section 8); the restricted
`Appointment Detail by User` of My Reports is a separate definition (`my_reports` catalog).

### Legacy output

| Variant | Printed title | Group order | Columns, in order | Source |
|---|---|---|---|---|
| A: appointment date, `GROUP BY` Provider (default) | `Appointment Detail` | `Office : <office>` -> `Provider : <name> : <short id>` -> day band `<Weekday, Month d, yyyy>` | `Time / Len (min)` · `Appt Status` · `Operatory` · `Patient / Pat ID [Chart#]` (with `Bal :`) · `Pref Provider` · `Carrier` (`P :` / `S :` with carrier phone) · `Procedure (Code Th Surf Descr)` · `Notes` | 2026 [P11·img] DOCUMENTED |
| B: `Only AppointNow Appointments` | `Appointment Detail (For Only AppointNow Appointments)` | `Office` -> `User : Appoint Now` -> `Provider` -> day band | as A; `Notes` carry the patient's AppointNow note | 2023 [P14·img] DOCUMENTED |
| C: `Created On Date`, grouped by user (older layout) | `Appointment Detail` | `User : <user>` -> `Created Date : <date>` -> `Office : <office>` | `Appt Date` · `Appt Time` · `Len (min)` · `Op` · `Prdr` · `Chart#` · `Patient` (with `Bal:`) · `Phone #` (`(H)` `(C)` `(W)`) · `Carrier` · `Procedure ( Code Th Surf Descr )` · `Notes` | 2013 [P13·img] DOCUMENTED |

Totals (counts only): `Total for, <date> : n`, `Total for, <provider or user> : n`, `Total for, <office> : n` (older
`Total for Office, <office> : n`), `Grand Total : n`. Footer: `From Appt Date` / `Thru` (or `From Created Date`),
`Offices`, `Providers`, `Operatories`, `Users`.

Our layout for every combination (one rule, current 2026 style): `Office` band -> first level per `group_by` (or the
AppointNow source level) -> day band of the **basis date** (appointment date, or `Created Date : <date>`). With
`date_basis = created_date` the row also prints `Appt Date` (as in layout C). Layout C's user-outermost order is not
reproduced (the office band is `fixed_outer` for the family); it is a documented difference.

Quirks: the balance always prints in the patient cell (kept, `financial_patient`); new-patient placeholders print `Pat ID`
0 (fixed: empty `Pat ID` and the marker `NP`); deleted appointments never appear (kept); created dates were Pacific time
(fixed: office-local, shared rules).

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| APPOINTMENT TYPE | (no label) (radio_group) | **Regular** / Archived | `appointment_set` | enum | Regular -> `regular`, Archived -> `archived` | `regular` | replicated | Regular = live appointments (NOT is_legacy_archive); Archived = the migrated legacy archive partition (rpt_appointment_facts.is_legacy_archive, loaded from APPTH_ARCHIVE). On app rows appointments.is_archived means deleted, never archived (03 3.6): deleted appointments are excluded under both options, as in the legacy tool. Archived returns migrated history only; app-era appointments are never archived. Meaning of Archived in the legacy tool is unverified (research 10 #5) - confirm. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| APPOINT NOW | Only AppointNow Appointments (checkbox) | **unchecked** | `only_appointnow_appointments` | boolean | - | `false` | replicated | - |
| APPOINT NOW | (no label) (radio_group) | **Both** / Appoint Now / Appoint Now API - greyed out | `appointnow_source` | enum | Both -> `both`, Appoint Now -> `appoint_now`, Appoint Now API -> `appoint_now_api` | `both` | replicated | Enabled when: only_appointnow_appointments == true. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER/USER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| PROVIDER/USER | User (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Enabled when: only_appointnow_appointments == false. User role = the user who created the appointment (rpt_appointment_facts.created_by_user_id -> rpt_user_dim.user_key); vendor documentation: the report reviews the appointments created by a user. Migrated appointments carry no creating user and match only under all (APP). AppointNow bookings belong to the system user shown as Appoint Now (legacy login _APPOINTNOWPAT_): whether the legacy picker lists it is unknown. Disabled while only_appointnow_appointments is true (vendor screenshot). |
| DATE RANGE | (no label) (radio_group) | **Appointment Date** / Created On Date | `date_basis` | enum | Appointment Date -> `appointment_date`, Created On Date -> `created_date` | `appointment_date` | replicated | - |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| OPERATORY | Operatory (picker) | shown: ALL | `operatory_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| GROUP BY | (no label) (radio_group) | **Provider** / User | `group_by` | enum | Provider -> `provider`, User -> `user` | `provider` | replicated | Enabled when: only_appointnow_appointments == false. |
| PAGE BREAK BY | (no label) (radio_group) | **None** / Date / Provider / User | `page_break_by` | enum | None -> `none`, Date -> `date`, Provider -> `provider`, User -> `user` | `none` | replicated | Option rules: user enabled when group_by == user. The User option is greyed while GROUP BY = Provider. |
| OTHER OPTIONS | Include Cancelled Appointments (checkbox) | **unchecked** | `include_cancelled_appointments` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Patient Phone Number (checkbox) | **unchecked** | `include_patient_phone_number` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | [?] (other) | (empty) | `include_patient_home_office` | boolean | - | - | superseded | Clipped third row of OTHER OPTIONS in our capture. Vendor screenshots identify it as the checkbox Include Patient Home Office, recorded as appointment_reports.r08.x01 and mapped there (one control, not two). This placeholder row adds no parameter of its own. |
| CANCELLATION REASON | (no label) (picker) | shown: ALL - greyed out | `cancellation_reason_codes` | entity_multi | - | `all` | replicated_enhanced | Enabled when: include_cancelled_appointments == true. Rule inferred: greyed while Include Cancelled Appointments is unticked in our capture; the unlock was not observed (catalog open question 5). Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Applies to cancelled rows only. |
| OTHER OPTIONS | Include Patient Home Office (checkbox) † | **unchecked** | `include_patient_home_office` | boolean | - | `false` | replicated | VENDOR-DOC: third OTHER OPTIONS row of Appointment Detail (vendor screenshots 2023, 2026). Legacy default not documented: the definition uses false (unticked, like the two other rows of the column) until confirmed. Meaning unverified: read as a layout switch that prints the patient's home office (rpt_appointment_facts.patient_home_office_id -> rpt_office_dim.office_name) beside the appointment office; the alternative reading - widen the office filter to patients whose home office is selected - must be ruled out on the live tool. Role query (adds a column). Default differs: legacy default not documented (vendor screenshots); unticked like the other OTHER OPTIONS rows, confirm on the live tool |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| Only AppointNow Appointments is ticked | The three radios Both / Appoint Now / Appoint Now API become enabled; the User picker and both GROUP BY radios (Provider / User) are disabled. | only_appointnow_appointments = true enables appointnow_source (enabled_when only_appointnow_appointments == true; otherwise disabled_value both) and disables user_ids and group_by (enabled_when only_appointnow_appointments == false; disabled values all and provider). The printed title becomes Appointment Detail (For Only AppointNow Appointments) through title_templates, and the main block groups Office -> User Appoint Now -> Provider -> day band as in the legacy sample. The AppointNow block takes its level list from only_appointnow_appointments, never from group_by: it ignores the (disabled) group_by value. |
<!-- PARITY:appointment_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| APPOINTMENT TYPE `Regular` (default) | `appointment_set = regular`: `NOT is_legacy_archive` |
| APPOINTMENT TYPE `Archived` | `appointment_set = archived`: only the migrated archive partition (`is_legacy_archive`); app-era appointments are never archived; deleted rows excluded under both (meaning unverified, open question 3) |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output` |
| APPOINT NOW Only AppointNow Appointments unticked (default) | No booking-source predicate; `appointnow_source` disabled (value `both`) |
| Only AppointNow Appointments ticked | Only online bookings (`booking_source IN ('appointnow', 'appointnow_api')`, or `booking_request_id IS NOT NULL` for rows before DATA-17); title `Appointment Detail (For Only AppointNow Appointments)`; enables `appointnow_source`; disables `user_ids` (value `all`) and `group_by` (value `provider`); groups Office -> source (`User : Appoint Now` / `User : Appoint Now API`) -> Provider -> day band (rule `d01`) |
| APPOINT NOW `Both` (default, greyed until ticked) | Both sources |
| `Appoint Now` | `booking_source = 'appointnow' OR (booking_source IS NULL AND booking_request_id IS NOT NULL)` (DentC public booking page and staff-approved requests; the second branch keeps pre-DATA-17 online bookings, which `Both` also lists) |
| `Appoint Now API` | `booking_source = 'appointnow_api'` only (third parties through an API): SCHEMA(17); DentC has no such API, so the result is empty with notice `appointnow_api_not_available` (NEW) |
| OFFICE/GROUP `Office` (default) with picker `108` | `office_ids = [working office]` on the appointment office |
| OFFICE/GROUP several offices / `all` / `Office Group` | One `Office :` band per office; `office_group_id` resolves to its offices |
| PROVIDER/USER Provider `ALL` (default) / selected | No predicate / `rpt_appointment_facts.provider_id IN (...)`; echoed `Providers` |
| PROVIDER/USER User `ALL` (default) / selected | No predicate / `created_by_user_id` -> `user_key IN (:user_ids)` (creating user); migrated rows match only `all`; echoed `Users`. Disabled while Only AppointNow is ticked |
| DATE RANGE `Appointment Date` (default) | `date_basis = appointment_date`: range on `appointment_date`; day band = appointment date; footer `From Appt Date` / `Thru` |
| DATE RANGE `Created On Date` | `date_basis = created_date`: range on the office-local creation date (UTC bounds per office, data card 4.3); day band `Created Date : <date>`; column `Appt Date` shown; footer `From Created Date`; migrated rows never match (warning `appointment_created_date_app_only`) |
| DATE RANGE Start Date / End Date (default `today` / `today`) | `date_from` / `date_to`, inclusive, office-local |
| OPERATORY `ALL` (default) / selected | No predicate / `operatory_id IN (...)`; echoed `Operatories` |
| GROUP BY `Provider` (default) | Level `Provider : {provider_name} : {short_id}` under the office, subtotal `Total for, <provider> : n` |
| GROUP BY `User` | Level `User : {user_label}` (creating user; migrated rows under `User : (not recorded)`), subtotal `Total for, <user> : n`. Disabled while Only AppointNow is ticked |
| PAGE BREAK BY `None` (default) | No forced page breaks (`role: layout`) |
| PAGE BREAK BY `Date` | New PDF page per day band |
| PAGE BREAK BY `Provider` | New page per provider group (with `group_by = user`: per provider value inside the run, applied on the provider attribute - INFERRED) |
| PAGE BREAK BY `User` | New page per user group; greyed while `group_by = provider` (captured); assumed selectable with `group_by = user` (open question 2) |
| OTHER OPTIONS Include Cancelled Appointments unticked (default) | `status_class <> 'cancelled'`; missed (`no_show`) rows stay in |
| Include Cancelled Appointments ticked | Cancelled rows added, `Appt Status` prints `Cancelled` and the reason (`cancellation_reason`) in `Notes`; enables CANCELLATION REASON (inferred) |
| Include Patient Phone Number unticked (default) / ticked | Column `Phone #` absent / present: `(H)` `phone`, `(C)` `cell_phone`, `(W)` `work_phone` |
| Include Patient Home Office unticked (default `false`; legacy default not documented, `default_differs_reason` recorded) / ticked | Column `Home Office` absent / present (`patient_home_office_id` -> office name); no filter effect (reading to confirm, open question 4) |
| OTHER OPTIONS third row `[?]` | Superseded: the same control as Include Patient Home Office (`x01`) |
| CANCELLATION REASON `ALL` (default, greyed) | No predicate |
| CANCELLATION REASON selected | Applies to cancelled rows only: `status_class <> 'cancelled' OR cancellation_reason IN (...)`; nothing matches before DATA-17 (no reason persisted, none migrated) |
| Footer actions | `CLEAR CRITERIA` frontend; `PRINT / PREVIEW` run; `ADD TO MY FAVORITES` saved view |

Dependency rules: `d01` (AppointNow tick enables `appointnow_source`, disables `user_ids` and `group_by`; the AppointNow
block takes its levels from `only_appointnow_appointments` and ignores the disabled `group_by` value); option `user` of
`page_break_by` enabled only when `group_by == user` (`option_enabled_when` in the parity file; the unlock is inferred and
whether `provider` greys with `group_by = user` is open question 2); `cancellation_reason_codes` `enabled_when
include_cancelled_appointments == true` (inferred).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `appointment_statuses` (key of `appointment.appointment_list`) | `enum_multi` of `status_class` | `all` | E.g. only `unconfirmed` for tomorrow: the call sheet |
| `procedure_codes` (shared key) | `entity_multi` | `all` | Appointments with at least one booked line in the codes (`EXISTS` on `rpt_appointment_procedures`) |
| `include_scheduled_fee` (NEW, report-specific) | `boolean` | `false` | Adds `Charges` (`scheduled_fee`, `financial_patient`) with sums per group: scheduled production per provider and day |
| `include_lead_days` (NEW) | `boolean` | `false` | Adds `Lead Days` (`lead_days` = appointment date - created date), app-era rows only; average per user group |
| `new_patients_only` (NEW) | `boolean` | `false` | `is_new_patient OR is_placeholder_patient OR is_patientless` (`is_new_patient` is false on migrated rows) |
| `group_by` second level (view state, 07) | - | - | Expand / collapse of provider and day bands on screen |
| Saved views (date tokens) | - | - | "Tomorrow's schedule with phones" (`custom` `tomorrow` / `tomorrow`, `include_patient_phone_number = true`, `page_break_by = provider`); "Month count" (`this_month`, `include_cancelled_appointments = true`); "Booked yesterday by user" (`created_date`, `yesterday`, `group_by = user`); "AppointNow this week" (`this_week`, AppointNow ticked) |
| `compare_to` (filter card 12, P4) | `enum` | `none` | Prior-period count per provider / user in the subtotal rows |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_appointment_facts` (`appointment_date`, `start_time`, `duration_minutes`, `status_class`, `status_norm`, `operatory_id`, `provider_id`, `patient_id`, `patient_home_office_id`, `is_patientless`, `is_placeholder_patient`, `notes`, `cancellation_reason`, `cancellation_note`, `booking_source`, `booking_request_id`, `created_date`, `created_by_user_id`, `lead_days`, `procedure_label`, `scheduled_fee`), `rpt_appointment_procedures` (`procedure_code`, `tooth`, `surface`, joined to `rpt_procedure_code_dim` for the description), `rpt_patient_dim` (`first_name`, `last_name`, `chart_no`, `phone`, `cell_phone`, `work_phone`, `preferred_provider_id`), `rpt_insurance_coverage` (dental `tier` primary / secondary: `carrier_name`, `carrier_phone`), `rpt_ledger_entries` (patient balance, RPT-APPT-03), `rpt_user_dim`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories`; `booking_requests` passthrough for the AppointNow note and pre-DATA-17 link |
| Base filter | `NOT is_block AND NOT is_deleted`; archive per `appointment_set` |
| Date basis | `date_basis` parameter: `appointment_date` (column) or `created_date` (per-office UTC bounds on `created_at_utc`, `created_at_reliable` required) |
| Attribution | Office `appointment`; provider `appointment`; user = creating user (data card 5.4); home office printed only |
| Carrier | Current coverage (today's slots), not the coverage on the appointment date (data card 2.21: no slot dates exist) |
| Procedures | One printed line per booked line `code tooth surface description`; when `line_count = 0`, `procedure_label`; migrated appointments mostly have no lines (10,125 lines for 176,453 appointments) |
| Rating | READY (coverage 50): Created On and User APP; Only AppointNow APP (`booking_requests` link); `Appoint Now API` SCHEMA(17); cancellation reason SCHEMA(17) |
| Migrated history | No created date, creating user, booking source, cancellation reason or preferred provider; `Pref Provider` empty; the archive partition is the only content of `Archived` |
| Volume | A month of a 10-office group is ~10-20k rows with procedure sub-lines: `escalate_when` > 31 days -> background |

### Output

Block `appointment_detail` (all variants; columns switch by `visible_when`). Grouping: `fixed_outer` office ->
level 1 `provider` | `user` | `booking_source` (AppointNow) -> [AppointNow: `provider`] -> `day` (basis date,
`header_template` `{weekday}, {month} {d}, {yyyy}` or `Created Date : {date}`), subtotals at every level
(`Total for, {label} : n`), `grand_total.label = Grand Total`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date (`visible_when date_basis == created_date`) | date | `phi_identified` | none |
| `start_time` | Time | time | `phi_identified` | none |
| `duration_minutes` | Len (min) | integer | `phi_identified` | none |
| `appointment_status` | Appt Status | enum (`status_norm` in legacy wording: Scheduled, Confirmed, Un-Confirmed, Left Message, In Reception, Available, In Operatory, Checked Out, Missed, Cancelled - shared rules; `status_class` hidden) | `phi_identified` | none |
| `operatory_name` | Operatory | text | `aggregate` | none |
| `provider_short_id` | Prdr (`visible_when group_by == user`) | text | `aggregate` | none |
| `patient_name` | Patient | text | `phi_identified` (key column) | `count` -> subtotal and grand total lines |
| `chart_no` | Pat ID [Chart#] | text | `phi_identified` | none (`NP` marker for placeholders) |
| `patient_balance` | Bal : | money (`negative = minus`) | `financial_patient` | none |
| `preferred_provider_short_id` | Pref Provider | text | `aggregate` | none |
| `primary_carrier` / `secondary_carrier` | Carrier (`P :` / `S :` + phone) | text | `aggregate` | none |
| `patient_phones` | Phone # (`visible_when include_patient_phone_number`) | text | `phi_identified` | none |
| `patient_home_office_name` | Home Office (`visible_when include_patient_home_office`) | text | `phi_identified` (on a patient row) | none |
| `procedures` | Procedure (Code Th Surf Descr) | text, multi-line | `phi_identified` | none |
| `notes` | Notes (appointment note; cancellation reason and note on cancelled rows; AppointNow note) | text | `phi_identified` | none |
| `scheduled_fee` | Charges (enhancement) | money | `financial_patient` | `sum` per level and grand total |
| `lead_days` | Lead Days (enhancement) | integer | `phi_identified` | `avg` per group |
| hidden: `appointment_id`, `patient_id`, `office_id`, `provider_id`, `user_key`, `booking_request_id`, `basis_date`, `patient_last_name` | - | id / date / text | `phi_identified` / `aggregate` | group keys and drills |

Sort inside the day band: `start_time`, `operatory_name`, `patient_last_name`; `row_id_column = appointment_id` (INFERRED
from the samples: schedule order). Page-break options: `none`, `date` (level `day`), `provider` (level `provider`),
`user` (level `user`). Summary cards: Appointments (grand total), Cancelled (with the tick), Missed (`no_show` count),
AppointNow bookings; `reconciles_with` `appointments_scheduled` (with `include_cancelled_appointments = true`,
appointment basis) and `appointments_created` (`created_date` basis).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked column per day: appointments by status class (or by provider); hint on the `day` level counts |
| Provider / user subtotal | `rows`: same report filtered to that provider (`provider_ids`) or user (`user_ids`) |
| Day subtotal | `rows`: `date_from = date_to = <day>` |
| Row time / status | `record` appointment in the Scheduler (UX-22) |
| Patient name | `record` patient overview |
| AppointNow row | `record` booking request in the AppointNow inbox (route key `booking_request`, NEW, owner 07) |
| `Bal :` | `record` patient ledger (`right_code` of the ledger feature, `financial_patient`) |

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open appointment, open patient | row | `navigate` | - |
| Send reminder | row, bulk | `send_sms`, `send_email` | For the "tomorrow" use; exclusions `no_auto_sms`, `no_auto_email`, `no_correspondence`, patientless rows; messaging feature handler (PD-15) |
| Postcard / letter | bulk | `postcards`, `letters` | Hand-off to the correspondence batch |
| Create task | row, bulk | `create_task` | E.g. "call patient" per selected row |
| Export selection | bulk | `export_selection` | - |

Not a worklist; the confirmation work is `appointment.appointment_list` / `worklists.unconfirmed_appointments`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter landscape, `repeat_header`, group bands per level, `page_break_by`, `criteria_echo = footer` with the basis-dependent date label; procedures wrap inside the cell |
| XLSX | One flat sheet: `office_name`, group label, basis date as columns, one row per appointment, procedures joined with `; `; optional second sheet `procedures` (one row per booked line, enhancement); criteria sheet |
| CSV | Main block, procedures joined |
| Background | Above 31 days (`escalate_when`); result follows the run tray |

### Open questions

| # | Question | How to settle |
|---|---|---|
| 1 | Layout with `GROUP BY User` and appointment-date basis in the current build (2013 layout put User outermost) | Print with User grouping on the live tool |
| 2 | Does PAGE BREAK BY `User` become selectable with GROUP BY = User; does `Provider` grey then | Toggle on the live tool |
| 3 | Meaning of APPOINTMENT TYPE `Archived` | Run Archived for an archived patient |
| 4 | Default and effect of Include Patient Home Office (column, or office-filter widening) | Tick it and compare |
| 5 | Does Include Cancelled Appointments unlock CANCELLATION REASON | Tick it |
| 6 | Does the legacy User picker list the AppointNow system user | Open the picker |
| 7 | Where the cancellation reason prints on cancelled rows (Notes or status cell) | Print with a cancelled appointment |

## Lab Cost Report - `appointment.lab_cost_report`

Appointment Reports, screenshot `9.PNG` - P3 - S - right family `appointment` (`reports_appointment_reports_screen_view_only` / `reports_appointment_reports_screen_full_control`) - cost_class interactive - legacy output confidence DOCUMENTED (samples 2022, 2024); meaning of REPORT TYPE `All` and of Exclude Lab Received INFERRED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Office manager, bookkeeper | Month end (vendor recommendation: REPORT TYPE `Received Date`) | Lab cost of the month per lab, to reconcile with the lab invoices |
| Office manager | On demand | Cases sent and not yet received with their expected cost |
| Owner | Quarterly | Lab cost against the procedure fees of the appointments (lab cost share) |

### Legacy output

Printed title `Lab Cost Report` (internal report name `LabCostReport`) [P22·img][P26·img].

| Element | Legacy content | Confidence |
|---|---|---|
| Group levels | `Office : <office>` -> `Lab : <lab name>   Phone# : <lab phone>` | DOCUMENTED |
| Columns, in order | `Appt Date` · `Time` · `Provider` · `Patient Name` · `Description` · `Charges` · `Lab Sent` · `Lab Due` · `Lab Recv` · `Lab Cost` | DOCUMENTED |
| Lab total | `Total Appointments for lab, <lab> : n` with sums of `Charges` and `Lab Cost` | DOCUMENTED |
| Office total | `Total Appointments for, <office> : n` with the two sums | DOCUMENTED |
| Grand total | `Grand Total Appointments : n` with the two sums | DOCUMENTED |
| Footer | `Date From` / `Thru`, `Offices`, `Providers`, `Exclude Pat Type`, `Ex Resp Party Type`, `Labs` | DOCUMENTED |
| `Charges` | The appointment's procedure fee, not a lab charge | INFERRED |

Signs and quirks: all money positive. `Lab Cost` may be entered only at receipt; an unentered cost prints `0.00` (the whole
2024 sample shows 0.00) - kept, so the sums stay additive. `Charges` = `scheduled_fee` of the booked lines; empty (not
`0.00`) when the appointment has no booked lines (shared money rule).

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r09:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT TYPE | (no label) (radio_group) | **All** / Sent Date / Due Date / Received Date | `date_basis` | enum | All -> `appointment_date`, Sent Date -> `lab_sent_date`, Due Date -> `lab_due_date`, Received Date -> `lab_received_date` | `appointment_date` | replicated | Legacy title REPORT TYPE, but the radio is the date basis of the APPOINTMENT DATE RANGE below it (vendor documentation; the section keeps its title whichever option is chosen). Sent Date / Due Date / Received Date -> rpt_lab_cases.lab_sent_on / lab_due_on / lab_received_on. All -> appointment_date is unverified (04 7.3, to confirm): the alternative reading - the range matches any of the four dates - must be checked on the live tool. The vendor recommends Received Date for the monthly lab cost run. Same choice as date_basis of the existing lab cost report endpoint (appointment / sent / due / received). If the live tool shows the any-of-four reading, the option value any_lab_date (NEW, owner 04 7.3) is reserved for it. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. Both options enabled on this report (nothing greyed in the capture); applied to the appointment office (rule d03). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Filters the appointment office (rpt_appointment_facts.office_id; rpt_lab_cases.office_id on the lab reports). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Provider role (line, appointment, preferred) is declared per report. Role appointment on this report: the appointment provider; roster-first list, never scoped by providers.office_id. |
| LAB | Lab (picker) | shown: ALL | `lab_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Basis chosen by REPORT TYPE (date_basis): appointment_date, lab_sent_on, lab_due_on or lab_received_on of rpt_lab_cases; the section keeps its legacy title APPOINTMENT DATE RANGE whatever the basis. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end; basis chosen by REPORT TYPE (date_basis). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Patients without a type are kept; no_type_defined drops them. |
| EXCLUDE RESP. PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. |
| OTHER OPTIONS | Exclude Lab Received (checkbox) | **unchecked** | `exclude_lab_received` | boolean | - | `false` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:appointment_reports.r09:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT TYPE `All` (default) | `date_basis = appointment_date`: range on `rpt_lab_cases.appointment_date` (unverified; alternative reading "any of the four dates" in open question 1) |
| REPORT TYPE `Sent Date` | `date_basis = lab_sent_date`: range on `lab_sent_on`; cases never sent drop out |
| REPORT TYPE `Due Date` | `date_basis = lab_due_date`: range on `lab_due_on` |
| REPORT TYPE `Received Date` | `date_basis = lab_received_date`: range on `lab_received_on` (the month-end cost run) |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output` |
| OFFICE/GROUP `Office` (default) with picker `108` | `office_ids = [working office]` on `rpt_lab_cases.office_id` (appointment office) |
| OFFICE/GROUP several offices / `all` / `Office Group` | One `Office :` band per office with its labs and office total |
| PROVIDER `ALL` (default) / selected | No predicate / `rpt_lab_cases.provider_id IN (...)` (appointment provider) |
| LAB `ALL` (default) / selected | No predicate / `lab_vendor_id IN (:lab_ids)`; cases without a lab print under `Lab : (no lab)` and drop out of a selection |
| APPOINTMENT DATE RANGE Start Date / End Date (default `today` / `today`) | `date_from` / `date_to`, inclusive, office-local, applied to the column chosen by REPORT TYPE; the section keeps its title whatever the basis |
| EXCLUDE PATIENT TYPE `None` (default) / selected | Nothing excluded / cases of patients having any selected type dropped; untyped patients kept; `no_type_defined` drops untyped patients |
| EXCLUDE RESP. PARTY TYPE `None` (default) / selected | Nothing excluded / cases whose patient's current account has a selected `resp_party_type` dropped; rows without a type kept; SCHEMA(53) warning until DATA-53 |
| OTHER OPTIONS Exclude Lab Received unticked (default) | Received and not received cases listed |
| Exclude Lab Received ticked | `lab_received_on IS NULL` (unverified). With `date_basis = lab_received_date` the result is empty by definition: the run returns notice `lab_received_basis_excluded` (NEW) instead of a silent empty list |
| Footer actions | `CLEAR CRITERIA` frontend; `PRINT / PREVIEW` run; `ADD TO MY FAVORITES` saved view |

Dependency rules: none captured (nothing greyed in `9.PNG`; no DUE DATE section, unlike Lab Report).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `lab_statuses` (NEW, report-specific) | `enum_multi`: `not_sent`, `sent`, `overdue`, `received` (`rpt_lab_cases.lab_status`, `derive_lab_status`) | `all` | E.g. `overdue` only: cases past due and not back |
| `only_missing_lab_cost` (NEW) | `boolean` | `false` | Received cases with `lab_cost` NULL or 0: the "enter the invoice amount" list before month end |
| `report_format` (shared key, enhancement) | `enum`: `detail` (default, legacy), `summary` | `detail` | `summary`: one row per office x `group_by` member with case count, lab cost, charges, lab cost %, average turnaround |
| `group_by` (shared key, with `summary`) | `enum`: `lab` (default), `provider`, `month`, `lab_dds` (`lab`, `month`, `lab_dds` NEW values, owner 04) | `lab` | The grouping values of the existing endpoint (`vendor`, `provider`, `month`, `dds`; `office` is the fixed band) |
| `include_turnaround` (NEW) | `boolean` | `false` | Adds `Turnaround (days)` (`turnaround_days`) and `Days Late` (`days_late`), averages per lab |
| `compare_to` (filter card 12, P4) | `enum` | `none` | `summary`: prior-period lab cost per lab |
| Date presets | `last_month`, `month_to_date`, `this_quarter` | `today` | Saved view "Lab cost last month" (`date_basis = lab_received_date`, `last_month`) |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_lab_cases` (`appointment_id`, `office_id`, `provider_id`, `patient_id`, `appointment_date`, `lab_vendor_id`, `lab_dds`, `lab_cost`, `lab_sent_on`, `lab_due_on`, `lab_received_on`, `lab_status`, `turnaround_days`, `days_late`), `rpt_appointment_facts` (`start_time`, `scheduled_fee`, `line_count`, `procedure_label`, `is_block`, `is_deleted`, `is_legacy_archive`), `rpt_appointment_procedures` + `rpt_procedure_code_dim` (description), `rpt_patient_dim` (name, `patient_type_codes`, `account_id`), `rpt_account_dim.resp_party_type`, `rpt_provider_dim`, passthrough `labs` (`name`, phone) |
| Population | Non-deleted, non-block, `NOT is_legacy_archive` appointments with `has_lab` (a case exists only as lab fields on the appointment; legacy rule). All appointment statuses kept, cancelled included (a case sent for a cancelled visit still costs; INFERRED, open question 3). The report has no APPOINTMENT TYPE control, so archived cases are never reported (open question 6) |
| Date basis | `date_basis` parameter (data card 4.1: lab case = appointment date, `lab_sent_on`, `lab_due_on`, `lab_received_on`, all office-local dates) |
| Attribution | Office `appointment`; provider `appointment` (`rpt_lab_cases.provider_id`) |
| Builder | SQL builder on `rpt_lab_cases` (DATA-23); the existing `GET /appointments/lab-cases/cost-report` (`lab_tracking_service.lab_cost_report`, groups in Python, no detail rows) serves only the `summary` enhancement as an adapter until the builder replaces it, and is secured by ENG-16 (it takes `office_id` with a tenant check only) |
| Rating | READY (coverage 51); `exclude_resp_party_type_codes` SCHEMA(53) |
| Migrated history | 18 migrated lab cases, 14 of them in the archive partition and excluded (`NOT is_legacy_archive`, the family Regular rule; r09 offers no Archived option): practically no history. Lab vendor, DDS and short notice are app-era; migrated cases print `Lab : (no lab)` where the vendor is empty |

### Output

Block `lab_cost_detail` (`report_format = detail`), grouping `fixed_outer` office -> level `lab`
(`header_template = Lab : {lab_name}   Phone# : {lab_phone}`, `subtotal_label_template = Total Appointments for lab,
{lab_name}`), office subtotal `Total Appointments for, {office_name}`, `grand_total.label = Grand Total Appointments`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | none |
| `start_time` | Time | time | `phi_identified` | none |
| `provider_short_id` | Provider | text | `aggregate` | none |
| `patient_name` | Patient Name | text | `phi_identified` (key column) | `count` -> the three count lines |
| `description` | Description | text (booked procedure descriptions joined, else `procedure_label`) | `phi_identified` | none |
| `charges` | Charges | money | `financial_patient` | `sum` per lab, office, grand total |
| `lab_sent_on` | Lab Sent | date | `phi_identified` | none |
| `lab_due_on` | Lab Due | date | `phi_identified` | none |
| `lab_received_on` | Lab Recv | date | `phi_identified` | none |
| `lab_cost` | Lab Cost | money (`0.00` when not entered) | `financial_patient` | `sum` per lab, office, grand total |
| `turnaround_days`, `days_late` | Turnaround (days), Days Late (enhancement) | integer | `phi_identified` | `avg` per lab |
| `lab_status` | Status (enhancement, `default_visible = false`) | enum | `phi_identified` | none |
| hidden: `appointment_id`, `patient_id`, `office_id`, `lab_vendor_id`, `lab_name`, `lab_phone`, `patient_last_name` | - | id / text | `phi_identified` / `aggregate` | group keys |

Block `lab_cost_summary` (`report_format = summary`): `fixed_outer` office, rows = `group_by` members; columns
`group_label` (`aggregate`), `case_count` (`aggregate`, `sum`), `lab_cost_total` and `charges_total` (`financial_practice`,
`sum`; dropped for a caller without the class, family Rights table), `lab_cost_pct` (`ratio(lab_cost_total, charges_total)`, `financial_practice`), `avg_turnaround_days`
(`weighted_avg`, `aggregate`).

Sort: detail `appointment_date`, `start_time`, `patient_last_name`; `row_id_column = appointment_id`. Page break: none in
the legacy; enhancement `page_break_by = group` (one lab per page, for sending to the lab). Summary cards: Cases, Lab cost,
Charges, Cases without cost; `reconciles_with` `lab_cost_amount` (lab cost total) and `lab_turnaround_days` (with
`include_turnaround`), both only when `date_basis = appointment_date` and the run uses the metric's status population
(the metric is appointment-dated and probably excludes cancelled appointments, which this report lists: INFERRED,
checked by RPT-APPT-62).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar chart lab cost per lab (summary; top 10), optional line of monthly lab cost with `group_by = month` |
| Lab subtotal | With `date_basis = appointment_date`: `report` `appointment.lab_report` with `lab_ids = [<lab>]`, `office_ids` and the range copied (`report_type = appointment_list`). With another basis: `rows` of the same report with `lab_ids = [<lab>]` (Lab Report filters on the appointment date, so its list would not reconcile with the subtotal) |
| Summary row | `rows`: detail of that member |
| Row | `record` the patient's Lab Tracking tab focused on the appointment (route key `patient_lab_case`, NEW, owner 07); patient name -> patient overview |

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open lab case, open patient | row | `navigate` | - |
| Create task "enter lab cost" | row, bulk | `create_task` | With `only_missing_lab_cost` |
| Export selection | bulk | `export_selection` | For the lab invoice reconciliation |

Not a worklist (the open-case worklist is the Lab Report `not_received` type).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, letter landscape (10 columns, two money columns), `repeat_header`, lab band with phone, money totals on every count line, `criteria_echo = footer` with the six legacy echo labels; replaces the client jsPDF `printLabCostReport` and the portrait `render_lab_cost_report_pdf` |
| XLSX | One flat sheet with `office_name`, `lab_name` columns, typed money and date cells, totals as formulas-free values in total rows; summary on its own sheet |
| CSV | Detail rows |
| Background | Not expected |

### Open questions

| # | Question | How to settle |
|---|---|---|
| 1 | What REPORT TYPE `All` matches (appointment date, or any of the four dates) | Run with a case received outside the appointment range |
| 2 | What Exclude Lab Received drops and how it combines with Received Date | Tick it with each REPORT TYPE |
| 3 | Are cases of cancelled appointments listed | Cancel an appointment with a received case |
| 4 | Does the LAB picker follow the 2026-11 per-office lab assignment (`labs.office_id`) | Open the picker with two offices |
| 5 | Is `Charges` the scheduled fee of the booked lines or the posted fees of that day | Compare a sample against the ledger |
| 6 | Does the legacy Lab Cost Report list cases of archived appointments (DentC excludes the archive partition) | Run a period covering an archived appointment with a case |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-APPT-01 | Family base module `app/reports/definitions/appointment/_common.py`: shared parameter declarations, base population filter, `fixed_outer` office band, count-total templates, footer echo labels, `legacy_names` aliases (old menu names of research section 8) | P3 | M | DATA-16, ENG-03, ENG-11, ENG-23, FLT-01, FLT-03 | Lint passes for the nine definitions; FLT-20 default-run test reproduces every legacy default of the parity file; a deleted, a block-out and an archived fixture appointment never appear in a Regular run |
| RPT-APPT-02 | Option sources of the family: `operatories`, `labs`, `cancellation_reasons`, `confirmation_vendors` (NEW), static `appointment_lengths` (pending option values), `definitions:patient_type`, `definitions:resp_party_type` | P3 | M | FLT-06, FLT-09, DATA-17, DATA-53 | Each source returns active and inactive rows with labels; `operatories` prefers the selected offices without excluding others; an unknown value is 422 |
| RPT-APPT-03 | Patient balance and last payment columns from the canonical ledger for `include_patient_balance` | P3 | S | DATA-06 | `Curr Bal` of fixture patients equals the on-screen patient balance (R-02); credit balances print negative; the column is absent when the parameter is false |
| RPT-APPT-04 | Event-backed variants: `call_list`, `cancelled_from_automated_campaigns`, `appoint_now_api`, cancellation reasons, r06 and r07 read `appointment_events` and the DATA-17 stamps, with `availability[]` entries for migrated history | P3 | M | DATA-17, RPT-APPT-01 | A cancel, a campaign cancel, a vendor confirmation and a seat-to-checkout sequence on fixtures each appear in the right report; a migrated-only range returns the availability warning, never a silent empty list |
| RPT-APPT-05 | Time-zone and created-date rules: office-local stamps and created date, echo note on the Pacific-time difference, created-date availability on migrated rows | P3 | S | DATA-16, FLT-04, FLT-18 | An appointment created 23:30 office time lands on that office date; the echo prints "Times in office local time"; r08 with `date_basis = created_date` over migrated rows returns the warning |
| RPT-APPT-06 | Rights and data classes of the family: `appointment` family codes, column classes of the shared-rules table, patient manifest, export second key | P3 | S | SEC-03, SEC-07, ENG-14 | View Only caller runs but cannot print or export; a caller without `phi_identified` gets 403 `data_class_denied`; without `financial_patient` money columns are dropped from screen, PDF and XLSX; every run writes a manifest |
| RPT-APPT-07 | Drill and actions: appointment and patient record drills, Scheduler hand-off, bulk SMS / e-mail / letters / postcards / task with consent exclusions on the contact lists, links to the worklists | P3 | M | ENG-30, UX-22, UX-39, DASH-31, DASH-33 | Drill from a row opens the appointment in the Scheduler; a bulk SMS from the cancelled list excludes opted-out patients and reports the count; the action is audited |
| RPT-APPT-08 | Summary cards and metric reconciliation tests (`reconciles_with`) for the counts and lab sums listed in the shared rules | P3 | S | MET-05, MET-13, MET-18, ENG-11 | For the fixture period every card equals its block total and the named metric for the same parameters |
| RPT-APPT-09 | Live legacy verification of the family's open questions 1-12 and update of the decisions file and parity tables | P3 | M | FLT-23 | Every `unknown_legacy` and inferred rule of the parity file is confirmed or corrected; `build_parity.py` prints PARITY VALID after the update |
| RPT-APPT-10 | Appointment List definition: six `report_type` formats with blocks, columns, sub-line hint, `title_templates`, `enabled_when` rules d01 / d02, four sort options, office -> date banding, campaign created-date banding, summary cards | P3 | L | RPT-APPT-01, RPT-APPT-02, RPT-APPT-03, DATA-16, ENG-11, ENG-23 | FLT-20 default run equals the legacy defaults; fixture day produces the expected rows per format; `cancelled_list` totals equal `appointments_cancelled` and the Charges sum; a disabled `sort_by` on `confirmation_call_list` cannot change the order |
| RPT-APPT-11 | Call List population: call-list flag plus the two Status boxes, replaced test (interim, then event-based), off-list state `call_list_removed_at` / `_by` (DATA-17 extension), `appointment_length` once its values are known | P3 | M | DATA-17, RPT-APPT-04, RPT-APPT-10 | A cancel with the call-list tick appears; booking a later appointment removes it; taking it off the list hides it unless `include_off_call_list`, while the same entry still prints on `cancelled_list` with the box unticked; the Scheduler Cancel dialog sends reason, note and flag (fixture through the real endpoint); 03 has added `call_list_removed_at` / `call_list_removed_by` to the DATA-17 scope in `data_work_items.md` |
| RPT-APPT-12 | Campaign cancellation format: cancel source `campaign` from events, interim reason predicate, primary / secondary carrier with phone, campaign name / id / touch point, cancelled date-time in office time | P3 | M | DATA-17, DATA-21, RPT-APPT-04, RPT-APPT-10 | An SMS-decline fixture appears with its campaign and touch point; a staff cancel does not; the interim rule is echoed until DATA-17 is live |
| RPT-APPT-13 | Patient-level derived columns shared by r01 / r02 / r04: `phones`, `phones_hcw` (Lab Report order), `appointment_reason`, `procedure_description`, `cancel_count`, `missed_count`, `last_payment_amount` | P3 | S | DATA-06, DATA-16, RPT-APPT-03 | Values equal hand-computed fixtures; `phones` prints `(H) (W) (C)` and `phones_hcw` `(H) (C) (W)` for the same patient; a credit payment prints positive in `Lst Pymt`; an appointment without booked lines prints empty Charges, not 0.00 |
| RPT-APPT-14 | Appointment List row actions: confirm, left message, take off / restore call list, schedule replacement, bulk confirmation text with consent exclusions | P3 | M | RPT-APPT-07, RPT-APPT-11, DASH-31, DASH-33 | Confirming 50 selected rows sets each confirmed through `scheduler_service.update_status`; opted-out patients are excluded and counted; every action is audited with the run id |
| RPT-APPT-15 | Missed Appointments Not Marked As Missed definition with the shared missed rule (earlier dates, plus today's appointments whose scheduled end has passed; `completed` rows without a visit charge kept), range capped at the office-local now, `unresolved_kinds` enhancement | P3 | S | DATA-16, RPT-APPT-01, RPT-APPT-13 | Default run at end of day lists today's unposted appointment, a run at 08:00 does not list a 15:00 appointment; a same-day non-visit fee leaves it listed; an appointment checked out and posted with only a `Z` code is listed; a visit charge removes it; the `past_unresolved` rows of a range ending yesterday equal `unresolved_past_appointments` |
| RPT-APPT-16 | Missed-not-marked actions: Mark missed (row, bulk with confirmation), Post visit route key `patient_transactions`, link to `worklists.unresolved_appointments` | P3 | S | RPT-APPT-07, RPT-APPT-15, DASH-33, UX-22 | Bulk mark-missed of 20 rows is idempotent on retry; the re-run no longer lists them and `appointments_no_show` rises by 20 |
| RPT-APPT-17 | New Patients via Appointments definition: placeholder and patientless population, interim rule with availability warning, switch to `registration_status` when DATA-44 lands, `placeholder_kinds` and `provider_ids` enhancements | P3 | S | DATA-16, DATA-44, RPT-APPT-01 | A Quick Save booking appears; completing the record removes it; a patientless appointment prints `Pat ID` 0 and its notes, with `(no patient record)` as name - or the typed name from NEW `appointments.placeholder_name` if the product owner chooses it (r03 open question 6, column requested from 03); the interim warning disappears once DATA-44 is applied |
| RPT-APPT-18 | Registration hand-off: `patient_edit` route key (wizard in edit mode), registration-request bulk message through the intake feature, `worklists.incomplete_new_patients` proposal to 06 | P3 | S | RPT-APPT-17, UX-22, DASH-31 | Clicking Complete registration opens the wizard on that patient; a bulk request skips patients without phone or e-mail and reports the count |
| RPT-APPT-19 | Lab Report definition: four `report_type` variants, office -> lab -> sent-date banding, `due_date` rule and its mirror (range disabled with `due_date`), `labs` passthrough for lab name and phone, count totals with legacy labels | P3 | M | DATA-23, RPT-APPT-01, RPT-APPT-02, RPT-APPT-13 | `not_received` fixture matches the documented layout; `due_date` lists a case due on DUE DATE whose appointment lies outside the range; a case on a cancelled appointment is listed; per-type row sets equal `list_lab_cases` filters of `lab_tracking_service` for the same office and range; cases without a lab group under `Lab : (none)` |
| RPT-APPT-20 | Lab Report enhancements and actions: `only_overdue`, `only_missing_for_visit`, `only_short_notice`, mark sent / received through `apply_lab_rules`, lab-subtotal drill to `appointment.lab_cost_report`, saved view "Not received - next 2 days" | P3 | S | RPT-APPT-19, RPT-APPT-07, ENG-30 | Mark received on a case with a due date before its sent date returns the 422 per row and changes nothing; the lab drill total equals the clicked subtotal |
| RPT-APPT-21 | Live legacy check of the report-specific questions of r01-r04 (confirmation population, call-list base, `#Cancel` window, today's rows on r02, cancelled placeholders, Lab Report Due Date behaviour) and update of this section and the decisions file; then update `04_filter_framework.md` 9.3 row 10 and its DUE DATE row to `report_type == due_date` (and the mirror range rule), or revert this report to the 04 rule if the live check contradicts it (owner `04_filter_framework.md`) | P3 | S | RPT-APPT-09 | Each question is answered with a capture reference; `build_parity.py` prints PARITY VALID after any decision change; 04 and this section state the same DUE DATE rule |
| RPT-APPT-22 | Live legacy check of the report-specific questions of r05-r09 (SmartAssist 1-6, Vendors 1-3, Time Stamps 1-4, Appointment Detail 1-7, Lab Cost 1-6) and update of the sections and the decisions file | P3 | S | RPT-APPT-09 | Each question is answered with a capture reference; the decisions file is updated; `build_parity.py` prints PARITY VALID |
| RPT-APPT-40 | `appointment.smartassist_report_card` definition: detail block over `rpt_smart_assist_checks()`, status population from the two OTHER OPTIONS, office band with percentage rows (`ratio` of hidden pass / applicable counters), title templates, check glyphs | P3 | M | DATA-54, DATA-16, DATA-17, ENG-11, ENG-23, ENG-59, RPT-APPT-01, RPT-APPT-06 | Fixture office with 3 enabled items and 2 disabled: disabled columns print `N/A`; a completed appointment without a note fails `progress_note`; a migrated kept visit (no check-out stamp, same-day visit charge) appears in the default run; a credit-balance patient fails `payment`; a day with only a payment posted passes `ledger_posting`; a future appointment appears only with Include Missed; a cancelled one only with Include Cancelled; office % = pass / applicable from unrounded counters; a note in another office still fails |
| RPT-APPT-41 | SmartAssist `summary` format, `failed_check_codes`, `only_incomplete_appointments`, `group_by` provider, percentage drill to detail, fix-it record drills per check, task and message actions | P3 | S | RPT-APPT-40, ENG-30, UX-22, UX-39 | Clicking the Eligibility % of an office opens the detail with only failing rows of that office; summary office row equals the detail percentage row; a fail cell of `next_appointment` opens the Scheduler booking hand-off |
| RPT-APPT-42 | SmartAssist catalog item `next_appointment` (NEW in `SMART_ASSIST_CATALOG` and the office SmartAssist setup grid), default enabled state to be confirmed | P3 | S | DATA-54 | Enabling the item in setup turns the `Next Appt` column from `N/A` to pass / fail; existing office setups migrate without losing their item states |
| RPT-APPT-45 | `appointment.appointments_confirmed_via_vendors` definition: population from `appointment_events` (`confirmed`, `source = vendor`), latest vendor event per appointment, office -> vendor groups, `vendor_confirmation_app_only` availability | P3 | M | DATA-17, RPT-APPT-02, RPT-APPT-04, RPT-APPT-05, ENG-11 | Fixture: two vendor confirmations by different vendors on one appointment list it once under the later vendor; a staff confirmation is not listed by default; a range before DATA-17 go-live returns the warning; `vendor_codes` restricts groups |
| RPT-APPT-46 | Vendors report enhancements: `confirmation_sources` (vendor / sms / appointnow / staff), `date_basis = confirmed_date` (NEW value, 04 7.3), `confirmation_lead_hours`, "confirmed then broken" card | P3 | S | RPT-APPT-45, FLT-04 | An SMS-reply confirmation appears only with `sms` selected; `confirmed_date` places an evening confirmation on the office-local date; the card count equals the rows with `cancelled` / `no_show` |
| RPT-APPT-50 | `appointment.appointment_time_stamps` definition: stamp mapping (`checked_in_on`, `available_on`, `seated_on`, `checked_out_on`, `posted_on`), signed Hr:Min durations with null on missing stamps, office band, availability codes for both eras | P3 | M | DATA-17, DATA-16, RPT-APPT-04, RPT-APPT-05, ENG-11 | Fixture seated 10 min after the scheduled time prints `0:10` waiting; seated early prints `-0:05`; a missing seat stamp leaves all three durations empty (not `0:00`); stamps print in the office zone; a migrated kept visit (same-day visit charge, no `posted_on`) prints `Posted = Yes` |
| RPT-APPT-51 | Time Stamps enhancements: `flow_statistics` block (count, median, p90 per office and provider), `min_time_waiting_minutes`, `only_with_time_stamps`, `group_by` operatory, hour-of-day chart; NEW flow metrics registered with 05 | P3 | S | RPT-APPT-50, MET-13 | Median of a 5-row fixture equals the hand value; the metric for the same parameters equals the block median (`reconciles_with`); the threshold filter keeps only rows at or above n minutes |
| RPT-APPT-52 | Scheduler flow statuses: verify that `In Reception`, `Available`, `In Operatory`, `Checked Out` are settable and stamp `checked_in_on`, `available_on`, `seated_on`, `checked_out_on` through DATA-17 (frontend status menu plus backend write path) | P3 | S | DATA-17 | Setting each status from the Scheduler writes the matching stamp and one `appointment_events` row; the Time Stamps report shows all four times for that appointment; `checked_in_on` is written only by In Reception / Arrived / Checked In - a patient set straight to In Operatory gets `seated_on` only and prints an empty `In Reception` |
| RPT-APPT-55 | `appointment.appointment_detail` definition: variants A and C on one block (group level provider / user, basis-date day band, `visible_when` columns), procedures sub-lines, carriers, balance, phones, home office, cancellation reason rule, archive set, page breaks, title templates | P3 | L | DATA-16, DATA-21, RPT-APPT-01, RPT-APPT-02, RPT-APPT-03, RPT-APPT-05, ENG-11, ENG-23, ENG-27 | Golden fixture (two offices, two providers, three days, a cancelled, a missed and a placeholder appointment): default run lists the missed and not the cancelled; counts per day, provider, office and grand total equal the row counts; `created_date` basis lists only app-era rows and prints `Appt Date`; `page_break_by = date` breaks per day in the PDF |
| RPT-APPT-56 | Appointment Detail AppointNow variant: rule `d01`, booking-source level `User : Appoint Now` -> provider -> day, AppointNow note in `Notes`, `appoint_now_api` notice, drill to the booking request | P3 | S | RPT-APPT-55, DATA-17 | A booking approved from the AppointNow inbox appears under `User : Appoint Now`; ticking the box disables User and Group By and changes the title; `appoint_now_api` returns the notice, never an error |
| RPT-APPT-57 | Appointment Detail enhancements: `appointment_statuses`, `procedure_codes`, `include_scheduled_fee`, `include_lead_days`, `new_patients_only`, saved-view presets with relative tokens, reminder / postcard / task bulk actions with consent exclusions | P3 | S | RPT-APPT-55, RPT-APPT-07, UX-19, UX-39 | "Tomorrow's schedule with phones" view resolves to the next office-local day; a bulk SMS skips `no_auto_sms` and patientless rows and reports the excluded count; `Charges` sums equal `Σ scheduled_fee` of the listed rows |
| RPT-APPT-60 | `appointment.lab_cost_report` definition: SQL builder on `rpt_lab_cases`, four date bases from REPORT TYPE, office -> lab (with phone) groups, `Charges` and `Lab Cost` sums on every count line, exclude filters, `lab_received_basis_excluded` notice | P3 | S | DATA-23, DATA-53, RPT-APPT-01, RPT-APPT-02, ENG-11, ENG-23 | Fixture month with cases sent, due and received on different days: each basis returns the hand-listed cases; sums per lab, office and grand total equal row sums; Exclude Lab Received drops received cases; the received-basis combination returns the notice |
| RPT-APPT-61 | Lab Cost Report summary enhancement (`report_format = summary`, `group_by` lab / provider / month / lab_dds) over the existing `lab_cost_report` service as adapter, then replaced by the SQL builder; office-scope fix of the existing endpoint; Lab Tracking page linked to the engine report | P3 | S | RPT-APPT-60, ENG-16, ENG-35 | Summary totals equal the detail grand totals for the same parameters; the old endpoint rejects an office outside the caller's scope; `LabTrackingPage` "Cost Report" opens the engine report |
| RPT-APPT-62 | Lab Cost Report enhancements: `lab_statuses`, `only_missing_lab_cost`, `include_turnaround`, lab subtotal drill to `appointment.lab_report`, task action, `lab_cost_amount` / `lab_turnaround_days` reconciliation | P3 | S | RPT-APPT-60, RPT-APPT-08, MET-18 | Drill from a lab subtotal opens Lab Report with that lab and range on the appointment basis and a `rows` drill on the other bases, each reconciling with the clicked subtotal; the metric reconciliation runs only on the appointment basis with the metric's status population; `only_missing_lab_cost` lists received cases with no cost; average turnaround equals `lab_turnaround_days` for the same parameters |

<!-- ASSEMBLED from catalog/parts/appointment_reports/ (00_header.md, 10_reports_01_04.md, 20_reports_05_09.md). Edit this document directly from now on. -->
