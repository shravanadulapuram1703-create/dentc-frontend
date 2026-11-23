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
| `Payment` | Ledger balance zero; with the setup option "unpaid balance of the selected appointment", an unpaid procedure of that appointment also fails | `payment`: patient balance not positive; with `include_unpaid_balance` also no open charge of that appointment date | Kept. Balance is the current balance at run time (legacy behaviour): an old row turns to cross when the patient owes today |
| `Email`, `Cell Phone` | Value on file, or a bypass reason recorded | `email`, `cell_phone`: value on file | Bypass reason does not exist in DentC (gap, open question 3) |
| `Eligibility` | Primary eligibility `Eligible`; `Not Eligible`, `Unknown` or expired fail | `eligibility`: primary dental slot `elig_status_class = 'verified'` | Kept, including the quirk that a later-expired stamp turns history to cross |
| `Medical History` | Present within the setup frequency | `medical_history`: latest completion inside the frequency window ending on the appointment date | Kept |
| `HIPAA`, `Consent 1-4` | Form on file within its frequency (`Every Visit`, `Every Year`, `Every Two Years`, `Every Calendar Year`) | `hipaa`, `consent_form_1` .. `consent_form_4` with the windows of data card 2.31 (`ONCE` added) | Kept; consent columns need the template mapping (DATA-54) |
| `Progress Notes` | A progress note on the appointment date | `progress_note`: non-struck note, same office, same date | Kept |
| `Ledger Posting` | A ledger entry dated the appointment date | `ledger_posting`: `has_charge_same_day` (visit-code charge) | Kept; posting on a later date fails (legacy quirk) |
| `Next Appt` | A later appointment in the same office | `next_appointment`: later live appointment, same office | Kept; needs the catalog item of RPT-APPT-42 |

Quirks kept: every check reads only data of the appointment's own office (OID), even on a multi-office run (shared rules).
Quirk fixed: one title spelling (`SmartAssist`) in header and footer.

### Parameters - legacy parity

<!-- PARITY:appointment_reports.r05 -->

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
| APPOINTMENT DATE RANGE Start Date / End Date (default `today` / `today`) | `appointment_date BETWEEN :date_from AND :date_to`, office-local, inclusive. A future range returns rows only with Include Missed Appointments (no future appointment is completed) |
| OTHER OPTIONS Include Missed Appointments unticked (default) | Population = `status_class = 'completed'` (checked out or posted: went from check-in through check-out, or has posted procedures) |
| Include Missed Appointments ticked | Adds every not-cancelled row that is not completed: `no_show`, `past_unresolved`, `in_office`, `confirmed`, `unconfirmed`, `scheduled` - future appointments included (the pre-visit use) |
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
| `group_by` (shared key) | `enum`: `none`, `provider`, `checked_out_by_user` (NEW value) | `none` | Adds a provider or check-out-user level under the office band with its own count and percentage row (legacy prints office only) |
| `date_range` presets | token pair `tomorrow` / `tomorrow` (custom), `this_week`, `last_week`, `month_to_date`, `last_month` | `today` | Saved views "Tomorrow's checklist" (`include_missed_appointments = true`, `only_incomplete_appointments = true`) and "Last month's score" (`summary`) |
| `compare_to` (filter card 12, P4) | `enum` | `none` | `summary` only: a prior-period percentage column per check and a delta |
| `operatory_ids` (shared key) | `entity_multi` | `all` | Restrict to chairs (hygiene vs restorative rooms) |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_smart_assist_checks(p_tenant_id, p_office_ids, p_date_from, p_date_to)` (one row per appointment, 13 check columns each `pass` / `fail` / `not_enabled`, `checked_in_by_user_id`, `checked_out_by_user_id`), joined on `appointment_id` to `rpt_appointment_facts` (flags, `status_class`, `provider_id`, `operatory_id`); `rpt_provider_dim.short_id`; `rpt_patient_dim` (`first_name`, `last_name`, `chart_no`); `rpt_user_dim.user_label` through `'u:' || checked_in_by_user_id` / `checked_out_by_user_id`; `rpt_office_dim.office_name` |
| Base filter | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`; status predicate from the two OTHER OPTIONS (parity table) |
| Date basis | `appointment_date` (fixed, `date_basis` = `appointment_date`) |
| Office attribution | `appointment` (`rpt_appointment_facts.office_id`); the function receives the resolved office list as `p_office_ids` |
| Provider attribution | `appointment` (`rpt_appointment_facts.provider_id`); `scope.provider_restriction = none` |
| Office setup | `office_smart_assist_items` per office: `is_enabled`, `frequency`, `include_unpaid_balance`, `consent_template_id` (DATA-54). An item not enabled, or a consent item without a template, returns `not_enabled` and prints `N/A`; the run lists such consent items in an `availability[]` notice |
| Rating | READY (coverage 47): consents, medical-history completion and eligibility stamps are APP; consent columns SCHEMA(54); `Checked In By / Out By` SCHEMA(17) |
| `next_appointment` | Computed by the function (data card 2.31) but `SMART_ASSIST_CATALOG` (`office_setup_service.py` L314-337) has no `next_appointment` item, so no office can enable it and the column would always print `N/A`: RPT-APPT-42 adds the item (NEW, owner 03 DATA-54) |
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
| `appointment_status` | Status (enhancement, `default_visible = false`) | enum (`status_class` labels) | `phi_identified` | none |
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
| 5 | Exact population of "missed": does an `in_office` (checked in, not out) row appear without the tick? Parity reads "not through check-out" as missed | Run a day with a patient still in the chair |
| 6 | Is `Payment` evaluated on the current balance or as of the appointment date? | Run an old date for a patient whose balance changed since |

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

<!-- PARITY:appointment_reports.r06 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output`; rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` | `office_ids = [working office]` on `rpt_appointment_facts.office_id` (appointment office) |
| OFFICE/GROUP `Office` with several offices / `all` | One `Office :` band per office with its own vendor groups and office total |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office |
| DATE RANGE Start Date / End Date (default `today` / `today`) | `appointment_date BETWEEN :date_from AND :date_to`, office-local, inclusive (basis INFERRED, 04 7.2 row 4; the alternative reading - confirmation date - is the enhancement `date_basis = confirmed_date`) |
| VENDORS `ALL` (default) | Every vendor: rows with a vendor confirmation event, whatever the vendor |
| VENDORS selected vendors | `vendor_codes`: only confirmations whose `appointment_events.vendor` is in the list; one `Vendor :` group per selected vendor that has rows |
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
| Datasets | `rpt_appointment_facts` (`appointment_date`, `start_time`, `operatory_id`, `provider_id`, `patient_id`, `status_class`, `procedure_label`, `confirmed_on`, `confirmed_via`), passthrough `appointment_events` (NEW in DATA-17: `event_type`, `source`, `vendor`, `occurred_at`, `actor_user_id`), `rpt_appointment_procedures` (codes), `rpt_patient_dim` (`first_name`, `last_name`, `chart_no`, `cell_phone`, `phone`), `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories` (name) |
| Population | Live appointments (`NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`) in the range with at least one event `event_type = 'confirmed' AND source = 'vendor'` (`EXISTS`); the printed vendor and `Confirmed On` come from the latest such event (`LEFT JOIN LATERAL ... ORDER BY occurred_at DESC LIMIT 1`), so an appointment appears once. An appointment confirmed by two vendors is listed under the latest one (INFERRED) |
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
| `appointment_status` | Status | enum | `phi_identified` | none |
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

<!-- PARITY:appointment_reports.r07 -->

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
| `group_by` (shared key) | `enum`: `none`, `provider`, `operatory` (NEW value) | `none` | Adds a level under the office band with count and flow statistics per group |
| `min_time_waiting_minutes` (NEW, report-specific) | `integer`, `validation.min = 0` | blank (no predicate) | Only rows whose `Time Waiting` is at least n minutes: the late-seating exception list |
| `only_with_time_stamps` (NEW) | `boolean` | `false` | `true` drops rows without any flow stamp (unrecorded flow); `false` keeps them so recording gaps are visible |
| `show_flow_statistics` (NEW) | `boolean`, `role: query` | `false` | Adds block `flow_statistics` (`placement = report_end`): count, median and 90th percentile of the three durations per office and provider |
| `compare_to` (filter card 12, P4) | `enum` | `none` | Prior-period median beside each statistic |
| Date presets | `last_week`, `last_month`, `last_30_days` | `today` | Saved view "Last month flow by provider" (`group_by = provider`, `show_flow_statistics = true`) |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_appointment_facts` (`appointment_date`, `start_time`, `duration_minutes`, `provider_id`, `operatory_id`, `patient_id`, `status_class`, `checked_in_on`, `checked_out_on`, `posted_on`; after DATA-17 `available_on`, `seated_on` exposed by the view - NEW columns of the dataset, owner 03), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories` |
| Stamp mapping | `In Reception` = `checked_in_on` (statuses `in_reception`, `arrived`, `checked_in`); `Available Time` = `available_on` (DATA-17); `In Operatory` = `seated_on` (DATA-17); `Check Out Time` = `checked_out_on`; `Posted` = `posted_on IS NOT NULL` (Yes / No). Stamps are the latest value written (overwritten, never cleared): a status set twice prints the second time; `appointment_events` is not read row by row |
| Scheduled time | `(appointment_date + start_time)` as office-local wall time; stamps converted from UTC to the office zone before subtracting (`format.tz = office`) |
| Durations | `difference(seated_on_local, scheduled_at)`, `difference(seated_on, checked_in_on)`, `difference(checked_out_on, seated_on)` in minutes, `null` when either stamp is missing (`null_display` empty, never `0:00`) |
| Population | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND status_class NOT IN ('cancelled', 'no_show')` (INFERRED: the legacy population is not documented; cancelled and missed appointments carry no flow) |
| Date basis / attribution | `appointment_date`; office `appointment`; provider `appointment` |
| Rating | SCHEMA(17) (coverage 49): only check-in and check-out stamps exist today; `Available`, `In Operatory` and all three durations need DATA-17 |
| Migrated history | No stamp at all on migrated rows (data card 4.2): rows print with empty stamp cells. App-era rows before DATA-17 have `In Reception`, `Check Out Time`, `Posted` only. `availability[]` codes `flow_stamps_app_only` and `flow_stamps_before_events` (NEW, 03) returned when the range touches either period |

### Output

Block `time_stamps`, grouping `fixed_outer` office (+ optional `group_by` level), `grand_total.label = Grand Total`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | none |
| `start_time` | Appt Time | time | `phi_identified` | none |
| `patient_name` | Patient | text | `phi_identified` (key column) | `count` -> `Total for, <office> : n` / `Grand Total : n` |
| `chart_no` | Pat ID | text | `phi_identified` | none |
| `provider_short_id` | Provider | text | `aggregate` | none |
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
| PDF | `banded_table`, letter portrait allowed (13 columns -> `auto` picks landscape), `repeat_header`, `criteria_echo = footer` (`Date From` / `Thru`, `Offices`, `Providers`, "Times in office local time") |
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

<!-- PARITY:appointment_reports.r08 -->

| Legacy option | Effect on the result |
|---|---|
| APPOINTMENT TYPE `Regular` (default) | `appointment_set = regular`: `NOT is_legacy_archive` |
| APPOINTMENT TYPE `Archived` | `appointment_set = archived`: only the migrated archive partition (`is_legacy_archive`); app-era appointments are never archived; deleted rows excluded under both (meaning unverified, open question 3) |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`csv` added); `role: output` |
| APPOINT NOW Only AppointNow Appointments unticked (default) | No booking-source predicate; `appointnow_source` disabled (value `both`) |
| Only AppointNow Appointments ticked | Only online bookings (`booking_source IN ('appointnow', 'appointnow_api')`, or `booking_request_id IS NOT NULL` for rows before DATA-17); title `Appointment Detail (For Only AppointNow Appointments)`; enables `appointnow_source`; disables `user_ids` (value `all`) and `group_by` (value `provider`); groups Office -> source (`User : Appoint Now` / `User : Appoint Now API`) -> Provider -> day band (rule `d01`) |
| APPOINT NOW `Both` (default, greyed until ticked) | Both sources |
| `Appoint Now` | `booking_source = 'appointnow'` (DentC public booking page and staff-approved requests) |
| `Appoint Now API` | `booking_source = 'appointnow_api'` (third parties through an API): SCHEMA(17); DentC has no such API, so the result is empty with notice `appointnow_api_not_available` (NEW) |
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
| Include Patient Home Office unticked (proposed default) / ticked | Column `Home Office` absent / present (`patient_home_office_id` -> office name); no filter effect (reading to confirm, open question 4) |
| OTHER OPTIONS third row `[?]` | Superseded: the same control as Include Patient Home Office (`x01`) |
| CANCELLATION REASON `ALL` (default, greyed) | No predicate |
| CANCELLATION REASON selected | Applies to cancelled rows only: `status_class <> 'cancelled' OR cancellation_reason IN (...)`; nothing matches before DATA-17 (no reason persisted, none migrated) |
| Footer actions | `CLEAR CRITERIA` frontend; `PRINT / PREVIEW` run; `ADD TO MY FAVORITES` saved view |

Dependency rules: `d01` (AppointNow tick enables `appointnow_source`, disables `user_ids` and `group_by`); option `user`
of `page_break_by` greyed while `group_by = provider` (proposed `enabled_when ["eq", "group_by", "user"]`, see
parity concerns); `cancellation_reason_codes` `enabled_when include_cancelled_appointments == true` (inferred).

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
| Datasets | `rpt_appointment_facts` (`appointment_date`, `start_time`, `duration_minutes`, `status_class`, `operatory_id`, `provider_id`, `patient_id`, `patient_home_office_id`, `is_patientless`, `is_placeholder_patient`, `notes`, `cancellation_reason`, `cancellation_note`, `booking_source`, `booking_request_id`, `created_date`, `created_by_user_id`, `lead_days`, `procedure_label`, `scheduled_fee`), `rpt_appointment_procedures` (`procedure_code`, `tooth`, `surface`, joined to `rpt_procedure_code_dim` for the description), `rpt_patient_dim` (`first_name`, `last_name`, `chart_no`, `phone`, `cell_phone`, `work_phone`, `preferred_provider_id`), `rpt_insurance_coverage` (dental `tier` primary / secondary: `carrier_name`, `carrier_phone`), `rpt_ledger_entries` (patient balance, RPT-APPT-03), `rpt_user_dim`, `rpt_provider_dim`, `rpt_office_dim`, passthrough `operatories`; `booking_requests` passthrough for the AppointNow note and pre-DATA-17 link |
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
| `appointment_status` | Appt Status | enum (`status_class` labels; legacy wording `Missed` for `no_show`) | `phi_identified` | none |
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

<!-- PARITY:appointment_reports.r09 -->

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
| `group_by` (shared key, with `summary`) | `enum`: `lab` (default), `provider`, `month`, `lab_dds` | `lab` | The grouping values of the existing endpoint (`vendor`, `provider`, `month`, `dds`; `office` is the fixed band) |
| `include_turnaround` (NEW) | `boolean` | `false` | Adds `Turnaround (days)` (`turnaround_days`) and `Days Late` (`days_late`), averages per lab |
| `compare_to` (filter card 12, P4) | `enum` | `none` | `summary`: prior-period lab cost per lab |
| Date presets | `last_month`, `month_to_date`, `this_quarter` | `today` | Saved view "Lab cost last month" (`date_basis = lab_received_date`, `last_month`) |

### Data

| Item | Detail |
|---|---|
| Datasets | `rpt_lab_cases` (`appointment_id`, `office_id`, `provider_id`, `patient_id`, `appointment_date`, `lab_vendor_id`, `lab_dds`, `lab_cost`, `lab_sent_on`, `lab_due_on`, `lab_received_on`, `lab_status`, `turnaround_days`, `days_late`), `rpt_appointment_facts` (`start_time`, `scheduled_fee`, `line_count`, `procedure_label`, `is_block`, `is_deleted`, `is_legacy_archive`), `rpt_appointment_procedures` + `rpt_procedure_code_dim` (description), `rpt_patient_dim` (name, `patient_type_codes`, `account_id`), `rpt_account_dim.resp_party_type`, `rpt_provider_dim`, passthrough `labs` (`name`, phone) |
| Population | Non-deleted, non-block, `NOT is_legacy_archive` appointments with `has_lab` (a case exists only as lab fields on the appointment; legacy rule). All appointment statuses kept, cancelled included (a case sent for a cancelled visit still costs; INFERRED, open question 3) |
| Date basis | `date_basis` parameter (data card 4.1: lab case = appointment date, `lab_sent_on`, `lab_due_on`, `lab_received_on`, all office-local dates) |
| Attribution | Office `appointment`; provider `appointment` (`rpt_lab_cases.provider_id`) |
| Builder | SQL builder on `rpt_lab_cases` (DATA-23); the existing `GET /appointments/lab-cases/cost-report` (`lab_tracking_service.lab_cost_report`, groups in Python, no detail rows) serves only the `summary` enhancement as an adapter until the builder replaces it, and is secured by ENG-16 (it takes `office_id` with a tenant check only) |
| Rating | READY (coverage 51); `exclude_resp_party_type_codes` SCHEMA(53) |
| Migrated history | 18 migrated lab cases, 14 of them in the archive partition: practically no history. Lab vendor, DDS and short notice are app-era; migrated cases print `Lab : (no lab)` where the vendor is empty |

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
`sum`), `lab_cost_pct` (`ratio(lab_cost_total, charges_total)`, `financial_practice`), `avg_turnaround_days`
(`weighted_avg`, `aggregate`).

Sort: detail `appointment_date`, `start_time`, `patient_last_name`; `row_id_column = appointment_id`. Page break: none in
the legacy; enhancement `page_break_by = group` (one lab per page, for sending to the lab). Summary cards: Cases, Lab cost,
Charges, Cases without cost; `reconciles_with` `lab_cost_amount` (lab cost total, appointment basis) and
`lab_turnaround_days` (with `include_turnaround`).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar chart lab cost per lab (summary; top 10), optional line of monthly lab cost with `group_by = month` |
| Lab subtotal | `report` `appointment.lab_report` with `lab_ids = [<lab>]`, `office_ids` and the range copied (`report_type = appointment_list`) |
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

<!-- WORK-ITEMS -->
| RPT-APPT-40 | `appointment.smartassist_report_card` definition: detail block over `rpt_smart_assist_checks()`, status population from the two OTHER OPTIONS, office band with percentage rows (`ratio` of hidden pass / applicable counters), title templates, check glyphs | P3 | M | DATA-54, DATA-16, DATA-17, ENG-11, ENG-23, ENG-59, RPT-APPT-01, RPT-APPT-06 | Fixture office with 3 enabled items and 2 disabled: disabled columns print `N/A`; a completed appointment without a note fails `progress_note`; a future appointment appears only with Include Missed; a cancelled one only with Include Cancelled; office % = pass / applicable from unrounded counters; a note in another office still fails |
| RPT-APPT-41 | SmartAssist `summary` format, `failed_check_codes`, `only_incomplete_appointments`, `group_by` provider, percentage drill to detail, fix-it record drills per check, task and message actions | P3 | S | RPT-APPT-40, ENG-30, UX-22, UX-39 | Clicking the Eligibility % of an office opens the detail with only failing rows of that office; summary office row equals the detail percentage row; a fail cell of `next_appointment` opens the Scheduler booking hand-off |
| RPT-APPT-42 | SmartAssist catalog item `next_appointment` (NEW in `SMART_ASSIST_CATALOG` and the office SmartAssist setup grid), default enabled state to be confirmed | P3 | S | DATA-54 | Enabling the item in setup turns the `Next Appt` column from `N/A` to pass / fail; existing office setups migrate without losing their item states |
| RPT-APPT-45 | `appointment.appointments_confirmed_via_vendors` definition: population from `appointment_events` (`confirmed`, `source = vendor`), latest vendor event per appointment, office -> vendor groups, `vendor_confirmation_app_only` availability | P3 | M | DATA-17, RPT-APPT-02, RPT-APPT-04, RPT-APPT-05, ENG-11 | Fixture: two vendor confirmations by different vendors on one appointment list it once under the later vendor; a staff confirmation is not listed by default; a range before DATA-17 go-live returns the warning; `vendor_codes` restricts groups |
| RPT-APPT-46 | Vendors report enhancements: `confirmation_sources` (vendor / sms / appointnow / staff), `date_basis = confirmed_date` (NEW value, 04 7.3), `confirmation_lead_hours`, "confirmed then broken" card | P3 | S | RPT-APPT-45, FLT-04 | An SMS-reply confirmation appears only with `sms` selected; `confirmed_date` places an evening confirmation on the office-local date; the card count equals the rows with `cancelled` / `no_show` |
| RPT-APPT-50 | `appointment.appointment_time_stamps` definition: stamp mapping (`checked_in_on`, `available_on`, `seated_on`, `checked_out_on`, `posted_on`), signed Hr:Min durations with null on missing stamps, office band, availability codes for both eras | P3 | M | DATA-17, DATA-16, RPT-APPT-04, RPT-APPT-05, ENG-11 | Fixture seated 10 min after the scheduled time prints `0:10` waiting; seated early prints `-0:05`; a missing seat stamp leaves all three durations empty (not `0:00`); stamps print in the office zone |
| RPT-APPT-51 | Time Stamps enhancements: `flow_statistics` block (count, median, p90 per office and provider), `min_time_waiting_minutes`, `only_with_time_stamps`, `group_by` operatory, hour-of-day chart; NEW flow metrics registered with 05 | P3 | S | RPT-APPT-50, MET-13 | Median of a 5-row fixture equals the hand value; the metric for the same parameters equals the block median (`reconciles_with`); the threshold filter keeps only rows at or above n minutes |
| RPT-APPT-52 | Scheduler flow statuses: verify that `In Reception`, `Available`, `In Operatory`, `Checked Out` are settable and stamp `checked_in_on`, `available_on`, `seated_on`, `checked_out_on` through DATA-17 (frontend status menu plus backend write path) | P3 | S | DATA-17 | Setting each status from the Scheduler writes the matching stamp and one `appointment_events` row; the Time Stamps report shows all four times for that appointment |
| RPT-APPT-55 | `appointment.appointment_detail` definition: variants A and C on one block (group level provider / user, basis-date day band, `visible_when` columns), procedures sub-lines, carriers, balance, phones, home office, cancellation reason rule, archive set, page breaks, title templates | P3 | L | DATA-16, DATA-21, RPT-APPT-01, RPT-APPT-02, RPT-APPT-03, RPT-APPT-05, ENG-11, ENG-23, ENG-27 | Golden fixture (two offices, two providers, three days, a cancelled, a missed and a placeholder appointment): default run lists the missed and not the cancelled; counts per day, provider, office and grand total equal the row counts; `created_date` basis lists only app-era rows and prints `Appt Date`; `page_break_by = date` breaks per day in the PDF |
| RPT-APPT-56 | Appointment Detail AppointNow variant: rule `d01`, booking-source level `User : Appoint Now` -> provider -> day, AppointNow note in `Notes`, `appoint_now_api` notice, drill to the booking request | P3 | S | RPT-APPT-55, DATA-17 | A booking approved from the AppointNow inbox appears under `User : Appoint Now`; ticking the box disables User and Group By and changes the title; `appoint_now_api` returns the notice, never an error |
| RPT-APPT-57 | Appointment Detail enhancements: `appointment_statuses`, `procedure_codes`, `include_scheduled_fee`, `include_lead_days`, `new_patients_only`, saved-view presets with relative tokens, reminder / postcard / task bulk actions with consent exclusions | P3 | S | RPT-APPT-55, RPT-APPT-07, UX-19, UX-39 | "Tomorrow's schedule with phones" view resolves to the next office-local day; a bulk SMS skips `no_auto_sms` and patientless rows and reports the excluded count; `Charges` sums equal `Σ scheduled_fee` of the listed rows |
| RPT-APPT-60 | `appointment.lab_cost_report` definition: SQL builder on `rpt_lab_cases`, four date bases from REPORT TYPE, office -> lab (with phone) groups, `Charges` and `Lab Cost` sums on every count line, exclude filters, `lab_received_basis_excluded` notice | P3 | S | DATA-23, DATA-53, RPT-APPT-01, RPT-APPT-02, ENG-11, ENG-23 | Fixture month with cases sent, due and received on different days: each basis returns the hand-listed cases; sums per lab, office and grand total equal row sums; Exclude Lab Received drops received cases; the received-basis combination returns the notice |
| RPT-APPT-61 | Lab Cost Report summary enhancement (`report_format = summary`, `group_by` lab / provider / month / lab_dds) over the existing `lab_cost_report` service as adapter, then replaced by the SQL builder; office-scope fix of the existing endpoint; Lab Tracking page linked to the engine report | P3 | S | RPT-APPT-60, ENG-16, ENG-35 | Summary totals equal the detail grand totals for the same parameters; the old endpoint rejects an office outside the caller's scope; `LabTrackingPage` "Cost Report" opens the engine report |
| RPT-APPT-62 | Lab Cost Report enhancements: `lab_statuses`, `only_missing_lab_cost`, `include_turnaround`, lab subtotal drill to `appointment.lab_report`, task action, `lab_cost_amount` / `lab_turnaround_days` reconciliation | P3 | S | RPT-APPT-60, RPT-APPT-08, MET-18 | Drill from a lab subtotal opens Lab Report with that lab and range; `only_missing_lab_cost` lists received cases with no cost; average turnaround equals `lab_turnaround_days` for the same parameters |
<!-- /WORK-ITEMS -->
