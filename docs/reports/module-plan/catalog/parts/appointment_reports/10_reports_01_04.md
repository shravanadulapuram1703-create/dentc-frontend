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

<!-- PARITY:appointment_reports.r01 -->

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
| OTHER OPTIONS > Include Off Call List (`include_off_call_list`) | `false` = entries a user took off the call list are left out; `true` = they are listed (Call List; same rule on the history lists, INFERRED). Inert until the off-list state exists (DATA-17 extension). Disabled for `confirmation_call_list` |
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
| `call_list` | `(f.add_to_call_list OR ('missed' IN appointment_statuses AND status_class = 'no_show') OR ('cancelled' IN appointment_statuses AND status_class = 'cancelled'))` AND NOT replaced AND (off-list allowed by `include_off_call_list`). Replaced (interim, INFERRED): `EXISTS` a live appointment of the same patient that is not cancelled or missed and is dated after the broken one; after DATA-17: created after the cancel / missed event (`cancelled_at`, `missed_at`). Off-list: NEW `appointments.call_list_removed_at`, `call_list_removed_by` (extension of DATA-17, owner 03) |
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
| `scheduled_fee` | Charges | `money` | `financial_patient` | `sum` -> `Total : <sum>` per date band, office and grand |
| `patient_balance` | Curr Bal | `money` | `financial_patient` | `none`; `visible_when ["truthy","include_patient_balance"]` |
| `notes` | Appt Notes : | `text` | `phi_identified` | sub-line |
| `cancellation_reason_label` | Cancellation Reason : | `text` | `phi_identified` | sub-line, `cancelled_list` only |
| `cancellation_note` | Cancellation Note : | `text` | `phi_identified` | sub-line, `cancelled_list` only |

Sub-lines are a PDF rendering hint `pdf.placement = sub_line` (NEW, owner 02 section 7.2 `banded_table`); on screen they
open as an expandable row detail; in XLSX / CSV they are ordinary columns.

`confirmation_call_list`: `start_time`, `duration_minutes`, `status_label` (Status, `enum`, `phi_identified`: Scheduled,
Confirmed, Un-Confirmed, Left Message, In Office, Unresolved from `status_norm`), `provider_short_id`, `operatory_name` (Op,
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
| `patient_name` + `patient_id` | Patient Name/ID (+ `Bal:` line = `patient_balance`, `financial_patient`) | `text` | `phi_identified` | `count` per office, date, grand |
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
| Summary cards | `appointments_listed` (count of the block; reconciles with `appointments_cancelled` on `cancelled_list`, `appointments_no_show` on `missed_list`, `unconfirmed_appointments` on `confirmation_call_list` with `confirmation_statuses = [scheduled, unconfirmed]` and a future range); `scheduled_fee_total` (`financial_practice`, cancelled and missed lists: value of broken appointments) |

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
| 3 | What Include Off Call List does on `cancelled_list` and `missed_list` (history lists) | Take an entry off the list, run both formats |
| 4 | `#Cancel` / `#Missed` window (all time, the range, last 12 months) and `Lst Pymt` source (patient payments only?) | Compare with a patient's appointment history and ledger |
| 5 | Does a SORT BY other than Appointment Date drop the date band | Print Cancelled List sorted by Patient Last Name |
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
`Grand Total : n`. Quirks kept: a same-day non-visit code (broken-appointment fee, `Z` code) does not make the visit kept;
a visit posted on another date than the appointment date leaves the appointment on the list [unverified].

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` (`output_format`) | File format only |
| OFFICE/GROUP `Office` / `Office Group` + picker (`office_scope`) | Appointment office filter; default working office |
| PROVIDER `ALL` / list (`provider_ids`) | Appointment provider filter |
| DATE RANGE Start / End (`date_from`, `date_to`; default today) | `appointment_date BETWEEN`, capped at the office's local today (a future appointment cannot be missed) |
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
| Population (shared missed rule, extended) | Family base AND `NOT f.has_charge_same_day` AND ( `f.status_class = 'past_unresolved'` OR ( `f.appointment_date = f.office_local_today` AND `f.status_class IN ('scheduled','unconfirmed','confirmed','in_office')` ) ). The second branch makes the legacy default (today / today, run at end of day) return today's unposted appointments; the header's rule (`past_unresolved` only, date before today) would make every default run empty - see Open questions and parity concerns |
| Excluded | `cancelled`, `no_show` (already marked), `completed` (checked out or posted); block-outs; deleted; archived |
| Date basis | `appointment_date`; `date_to` is capped at `office_local_today` per office |
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
| `scheduled_fee` | Charges | `money` | `financial_patient` | `sum` per band, office, grand (value at risk) |
| `patient_balance` | Curr Bal | `money` | `financial_patient` | `none`; `visible_when ["truthy","include_patient_balance"]` |

| Item | Rule |
|---|---|
| Grouping | `fixed_outer` office -> `appointment_date` band; `grand_total` `Grand Total : n` |
| Sort | `default_sort` `appointment_date`, `start_time`, `patient_last_name`, `appointment_id` (no legacy SORT BY); screen re-sort on `provider_short_id`, `patient_name`, `scheduled_fee` |
| Summary cards | `unresolved_count` (block count; `reconciles_with` `unresolved_past_appointments` for ranges ending before today), `unresolved_value` (sum `scheduled_fee`, `financial_practice`) |

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
| 1 | Does the report include today's appointments (end-of-day use) or only earlier dates? | Run at end of day with an unposted appointment of today |
| 2 | Are checked-in / in-operatory appointments without a posting listed? | Check in a patient, post nothing, run |
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

<!-- PARITY:appointment_reports.r03 -->

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
| `placeholder_kind` | Kind (enhancement, `default_visible: false`) | `enum` | `aggregate` | - |
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

<!-- PARITY:appointment_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT TYPE `Appointment List` (`report_type = appointment_list`, default) | Every lab case whose appointment falls in the range |
| `Not Sent` (`not_sent`) | Lab cases with no sent date and not received (`lab_status = 'not_sent'`) |
| `Not Received` (`not_received`) | Lab cases sent and not received (`lab_status IN ('sent','overdue')`, the backend `not_received` filter); band by sent date |
| `Due Date` (`due_date`) | Lab cases whose due date equals DUE DATE |
| PRINT FORMAT `PDF` (default) / `Excel` (`output_format`) | File format only |
| OFFICE/GROUP `Office` / `Office Group` + picker (`office_scope`) | `rpt_lab_cases.office_id` (appointment office) |
| PROVIDER `ALL` / list (`provider_ids`) | `rpt_lab_cases.provider_id` (appointment provider) |
| DUE DATE (`due_date`, default today, greyed unless `due_date`) | `lab_due_on = :due_date` with `report_type = due_date`; otherwise disabled and ignored |
| LAB `ALL` / list (`lab_ids`) | `lab_vendor_id IN (...)`; `all` keeps cases without a lab (band `Lab : (none)`) |
| APPOINTMENT DATE RANGE Start / End (`date_from`, `date_to`, default today) | `appointment_date BETWEEN` of the appointment carrying the case (see Open questions for `due_date`) |
| EXCLUDE PATIENT TYPE `None` / list (`exclude_patient_type_codes`) | Drops patients of the selected types; untyped kept |
| EXCLUDE RESP. PARTY TYPE `None` / list (`exclude_resp_party_type_codes`) | Drops patients whose account type is selected; NULL kept (SCHEMA(53)) |

Dependency rules: `due_date` enabled only when `report_type = due_date` (inferred; seen greyed with `appointment_list`, and
showing a date of unreadable state with `not_received`); `office_scope` group mode (d03); favorites (d04).

### Parameters - enhancements

| Key | Type | Types | Default | Effect |
|---|---|---|---|---|
| `only_overdue` (NEW, owner 04 section 3.7) | `boolean` | `not_received` | `false` | `lab_status = 'overdue'` (due date passed, not received) |
| `only_missing_for_visit` (NEW, owner 04) | `boolean` | all | `false` | `is_missing_for_visit`: the case is not back for the appointment that needs it |
| `lab_short_notice` filter (NEW, owner 04) | `boolean` | all | `false` | Only cases flagged short notice |
| `date_range` presets and tokens | `date_range` | all | `today` | Saved view "Not received - next 2 days" (`not_received`, `today` / `today+2d`), the vendor-documented routine |
| `lab_ids` multi-select with labs of the selected offices first | `entity_multi` | all | `all` | Per-office lab assignment (`labs.office_id`) preferred, never exclusive |
| `page_break_by` | `enum` `none`, `office`, `lab` (layout) | all | `none` | One page per lab (fax or e-mail to the lab) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_lab_cases` (lc), `rpt_appointment_facts` (start time, status, base flags), `rpt_appointment_procedures` (descriptions, fees), `rpt_patient_dim`, `rpt_account_dim`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `labs` (name, phone; DATA-45, NEW registration, owner 03) |
| Base | Family base population; a case exists only as lab fields on one appointment (`has_lab`); an appointment without them never appears |
| Per type | `appointment_list`: no status predicate. `not_sent`: `lc.lab_sent_on IS NULL AND lc.lab_received_on IS NULL`. `not_received`: `lc.lab_sent_on IS NOT NULL AND lc.lab_received_on IS NULL`. `due_date`: `lc.lab_due_on = :due_date` (received cases included, `Lab Recvd` printed) |
| `lab_status` | `derive_lab_status` (`app/services/lab_tracking_service.py`): `received`, `overdue` (sent, due before the office's today), `sent`, `not_sent`; the dataset equals it (DATA-23 acceptance) |
| Date bases | `appointment_date` for the range; `lab_due_on` for DUE DATE; `lab_sent_on` only as a band |
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
| `phones` | Phone# | `text` | `phi_identified` | - |
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
| 1 | With `Due Date`: does APPOINTMENT DATE RANGE still apply, and are received cases listed? This section proposes the due date alone | Switch REPORT TYPE, run with a range that excludes the appointment |
| 2 | Is DUE DATE enabled with `Not Received` (a date is visible in the vendor capture) | Switch REPORT TYPE (family question 4) |
| 3 | Printed titles and bands of `Appointment List`, `Not Sent`, `Due Date` | Print each once |
| 4 | Does `Not Sent` mean "lab ticked, no sent date" or does it need a procedure flagged Requires Lab | Book a Requires Lab code without the lab block |
| 5 | Does the LAB picker follow the per-office lab assignment (family question 11) | Open the picker with two offices |
| 6 | `Charges` on a case appointment with several booked lines: sum or first line | Print a two-line appointment |

<!-- WORK-ITEMS -->
| RPT-APPT-10 | Appointment List definition: six `report_type` formats with blocks, columns, sub-line hint, `title_templates`, `enabled_when` rules d01 / d02, four sort options, office -> date banding, campaign created-date banding, summary cards | P3 | L | RPT-APPT-01, RPT-APPT-02, RPT-APPT-03, DATA-16, ENG-11, ENG-23 | FLT-20 default run equals the legacy defaults; fixture day produces the expected rows per format; `cancelled_list` totals equal `appointments_cancelled` and the Charges sum; a disabled `sort_by` on `confirmation_call_list` cannot change the order |
| RPT-APPT-11 | Call List population: call-list flag plus the two Status boxes, replaced test (interim, then event-based), off-list state `call_list_removed_at` / `_by` (DATA-17 extension), `appointment_length` once its values are known | P3 | M | DATA-17, RPT-APPT-04, RPT-APPT-10 | A cancel with the call-list tick appears; booking a later appointment removes it; taking it off the list hides it unless `include_off_call_list`; the Scheduler Cancel dialog sends reason, note and flag (fixture through the real endpoint) |
| RPT-APPT-12 | Campaign cancellation format: cancel source `campaign` from events, interim reason predicate, primary / secondary carrier with phone, campaign name / id / touch point, cancelled date-time in office time | P3 | M | DATA-17, DATA-21, RPT-APPT-04, RPT-APPT-10 | An SMS-decline fixture appears with its campaign and touch point; a staff cancel does not; the interim rule is echoed until DATA-17 is live |
| RPT-APPT-13 | Patient-level derived columns shared by r01 / r02 / r04: `phones`, `appointment_reason`, `procedure_description`, `cancel_count`, `missed_count`, `last_payment_amount` | P3 | S | DATA-06, DATA-16, RPT-APPT-03 | Values equal hand-computed fixtures; a credit payment prints positive in `Lst Pymt`; an appointment without booked lines prints empty Charges, not 0.00 |
| RPT-APPT-14 | Appointment List row actions: confirm, left message, take off / restore call list, schedule replacement, bulk confirmation text with consent exclusions | P3 | M | RPT-APPT-07, RPT-APPT-11, DASH-31, DASH-33 | Confirming 50 selected rows sets each confirmed through `scheduler_service.update_status`; opted-out patients are excluded and counted; every action is audited with the run id |
| RPT-APPT-15 | Missed Appointments Not Marked As Missed definition with the extended rule (past unresolved, plus today's unposted appointments), `date_to` capped at office today, `unresolved_kinds` enhancement | P3 | S | DATA-16, RPT-APPT-01, RPT-APPT-13 | Default run at end of day lists today's unposted appointment; a same-day non-visit fee leaves it listed; a visit charge removes it; a range ending yesterday equals `unresolved_past_appointments` |
| RPT-APPT-16 | Missed-not-marked actions: Mark missed (row, bulk with confirmation), Post visit route key `patient_transactions`, link to `worklists.unresolved_appointments` | P3 | S | RPT-APPT-07, RPT-APPT-15, DASH-33, UX-22 | Bulk mark-missed of 20 rows is idempotent on retry; the re-run no longer lists them and `appointments_no_show` rises by 20 |
| RPT-APPT-17 | New Patients via Appointments definition: placeholder and patientless population, interim rule with availability warning, switch to `registration_status` when DATA-44 lands, `placeholder_kinds` and `provider_ids` enhancements | P3 | S | DATA-16, DATA-44, RPT-APPT-01 | A Quick Save booking appears; completing the record removes it; a patientless appointment prints `Pat ID` 0 and its notes; the interim warning disappears once DATA-44 is applied |
| RPT-APPT-18 | Registration hand-off: `patient_edit` route key (wizard in edit mode), registration-request bulk message through the intake feature, `worklists.incomplete_new_patients` proposal to 06 | P3 | S | RPT-APPT-17, UX-22, DASH-31 | Clicking Complete registration opens the wizard on that patient; a bulk request skips patients without phone or e-mail and reports the count |
| RPT-APPT-19 | Lab Report definition: four `report_type` variants, office -> lab -> sent-date banding, `due_date` rule, `labs` passthrough for lab name and phone, count totals with legacy labels | P3 | M | DATA-23, RPT-APPT-01, RPT-APPT-02, RPT-APPT-13 | `not_received` fixture matches the documented layout; per-type row sets equal `list_lab_cases` filters of `lab_tracking_service` for the same office and range; cases without a lab group under `Lab : (none)` |
| RPT-APPT-20 | Lab Report enhancements and actions: `only_overdue`, `only_missing_for_visit`, short-notice filter, mark sent / received through `apply_lab_rules`, lab-subtotal drill to `appointment.lab_cost_report`, saved view "Not received - next 2 days" | P3 | S | RPT-APPT-19, RPT-APPT-07, ENG-30 | Mark received on a case with a due date before its sent date returns the 422 per row and changes nothing; the lab drill total equals the clicked subtotal |
| RPT-APPT-21 | Live legacy check of the report-specific questions of r01-r04 (confirmation population, call-list base, `#Cancel` window, today's rows on r02, cancelled placeholders, Lab Report Due Date behaviour) and update of this section and the decisions file | P3 | S | RPT-APPT-09 | Each question is answered with a capture reference; `build_parity.py` prints PARITY VALID after any decision change |
<!-- /WORK-ITEMS -->
