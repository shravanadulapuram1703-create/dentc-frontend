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
| `appointment.appointment_list` | Appointment List | Family of six appointment lists chosen by `report_type`: confirmation calls, call list, pull charts, cancelled, cancelled from automated campaigns, missed | P3 | L | READY (default `confirmation_call_list`); `call_list` and `cancelled_from_automated_campaigns` SCHEMA(17); `exclude_resp_party_type_codes` SCHEMA(53) | DOCUMENTED for `cancelled_list` and `cancelled_from_automated_campaigns`; PARTIALLY DOCUMENTED for `call_list`, `missed_list`; INFERRED for `confirmation_call_list`, `pull_chart_list` |
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
| `cancellation_reason_codes` (`entity_multi`, `lookup:cancellation_reasons`) | r01, r08 | `all` | Include on the reason of cancelled rows only; greyed in every captured state. Nothing to match before DATA-17 (reason not persisted, none migrated) |
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
| Status | Only `status_class` of 03 3.2 (`cancelled`, `no_show`, `completed`, `past_unresolved`, `in_office`, `confirmed`, `unconfirmed`, `scheduled`); never `status_raw`. Legacy Missed = `no_show`; "broken" = cancelled or no_show |
| Missed rule (r02) | `status_class = 'past_unresolved' AND NOT has_charge_same_day`, appointment date before the office's local today. A same-day non-visit fee code does not make the visit kept (legacy rule, 03 2.15) |
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
| Footer | `pdf.criteria_echo = footer`: legacy echo labels (`From Appt Date` / `Thru`, `From Created Date`, `Appt Date From`, `Date From`, `Offices`, `Providers`, `Operatories`, `Users`, `Labs`, `Exclude Pat Type`, `Ex Resp Party Type`), then title, `Printed : <office-local date time>`, `Page : n of m` (ENG-23). The vendor copyright line is not reproduced |
| PDF | `banded_table`, letter, `repeat_header`; landscape for r01, r05, r08 (wide), portrait allowed for r02, r03, r07 |
| XLSX / CSV | Flat typed sheet, one sheet per block, criteria sheet; no merged title cells (no legacy Excel sample exists for this family) |

### Rights and data classes

| Item | Value |
|---|---|
| Right family | `appointment`: `reports_appointment_reports_screen_view_only` (run, view on screen) / `reports_appointment_reports_screen_full_control` (also print, PDF, schedule); XLSX and CSV additionally `reports_export_data_files` (security card 2.1, 2.3). No per-report override |
| Metric family | `scheduling` (summary cards, dashboard drills) |
| `phi_identified` | Patient name, `Pat ID`, chart number, phones, e-mail, appointment date / time / status, procedure codes and descriptions, appointment notes, cancellation reason and note, campaign name, SmartAssist pass / fail cells, time stamps on a patient row; hidden `patient_id` and `appointment_id` |
| `financial_patient` | `Charges`, `Curr Bal`, `Bal:`, `Lst Pymt`, `Lab Cost` and their subtotals (rows carry a patient key) |
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
| 4 | Which Lab Report types enable DUE DATE (parity uses `report_type == due_date`, narrower than 04 9.3 row 10) and whether APPOINTMENT DATE RANGE still applies with Due Date | Switch REPORT TYPE |
| 5 | What REPORT TYPE = All matches on Lab Cost Report (parity: `appointment_date`) and what Exclude Lab Received drops | Run with a case received outside the range |
| 6 | Default and effect of Include Patient Home Office (printed column or office-filter widening) | Tick it and compare outputs |
| 7 | Meaning of APPOINTMENT TYPE = Archived | Run Archived on an archived patient |
| 8 | Output layouts of r02, r03, r06; SmartAssist `summary`; four Appointment List formats; three Lab Report types | Print each once with sample data |
| 9 | Date basis of r06 (appointment or confirmation date) and how a vendor confirmation is stored | Confirm an appointment through a vendor and run the report |
| 10 | Whether the PAGE BREAK BY `user` option becomes selectable with GROUP BY = User, and whether Include Cancelled Appointments unlocks CANCELLATION REASON | Toggle both controls |
| 11 | Whether the Lab picker follows the 2026-11 per-office lab assignment | Open the picker with two offices |
| 12 | Whether the UPDATE MY FAVORITES relabel holds on every screen of the family | Save a favorite and reopen |

<!-- WORK-ITEMS -->
| RPT-APPT-01 | Family base module `app/reports/definitions/appointment/_common.py`: shared parameter declarations, base population filter, `fixed_outer` office band, count-total templates, footer echo labels, `legacy_names` aliases (old menu names of research section 8) | P3 | M | DATA-16, ENG-03, ENG-11, ENG-23, FLT-01, FLT-03 | Lint passes for the nine definitions; FLT-20 default-run test reproduces every legacy default of the parity file; a deleted, a block-out and an archived fixture appointment never appear in a Regular run |
| RPT-APPT-02 | Option sources of the family: `operatories`, `labs`, `cancellation_reasons`, `confirmation_vendors` (NEW), static `appointment_lengths` (pending option values), `definitions:patient_type`, `definitions:resp_party_type` | P3 | M | FLT-06, FLT-09, DATA-17, DATA-53 | Each source returns active and inactive rows with labels; `operatories` prefers the selected offices without excluding others; an unknown value is 422 |
| RPT-APPT-03 | Patient balance and last payment columns from the canonical ledger for `include_patient_balance` | P3 | S | DATA-06 | `Curr Bal` of fixture patients equals the on-screen patient balance (R-02); credit balances print negative; the column is absent when the parameter is false |
| RPT-APPT-04 | Event-backed variants: `call_list`, `cancelled_from_automated_campaigns`, `appoint_now_api`, cancellation reasons, r06 and r07 read `appointment_events` and the DATA-17 stamps, with `availability[]` entries for migrated history | P3 | M | DATA-17, RPT-APPT-01 | A cancel, a campaign cancel, a vendor confirmation and a seat-to-checkout sequence on fixtures each appear in the right report; a migrated-only range returns the availability warning, never a silent empty list |
| RPT-APPT-05 | Time-zone and created-date rules: office-local stamps and created date, echo note on the Pacific-time difference, created-date availability on migrated rows | P3 | S | DATA-16, FLT-04, FLT-18 | An appointment created 23:30 office time lands on that office date; the echo prints "Times in office local time"; r08 with `date_basis = created_date` over migrated rows returns the warning |
| RPT-APPT-06 | Rights and data classes of the family: `appointment` family codes, column classes of the shared-rules table, patient manifest, export second key | P3 | S | SEC-03, SEC-07, ENG-14 | View Only caller runs but cannot print or export; a caller without `phi_identified` gets 403 `data_class_denied`; without `financial_patient` money columns are dropped from screen, PDF and XLSX; every run writes a manifest |
| RPT-APPT-07 | Drill and actions: appointment and patient record drills, Scheduler hand-off, bulk SMS / e-mail / letters / postcards / task with consent exclusions on the contact lists, links to the worklists | P3 | M | ENG-30, UX-22, UX-39, DASH-31, DASH-33 | Drill from a row opens the appointment in the Scheduler; a bulk SMS from the cancelled list excludes opted-out patients and reports the count; the action is audited |
| RPT-APPT-08 | Summary cards and metric reconciliation tests (`reconciles_with`) for the counts and lab sums listed in the shared rules | P3 | S | MET-05, MET-13, MET-18, ENG-11 | For the fixture period every card equals its block total and the named metric for the same parameters |
| RPT-APPT-09 | Live legacy verification of the family's open questions 1-12 and update of the decisions file and parity tables | P3 | M | FLT-23 | Every `unknown_legacy` and inferred rule of the parity file is confirmed or corrected; `build_parity.py` prints PARITY VALID after the update |
<!-- /WORK-ITEMS -->
