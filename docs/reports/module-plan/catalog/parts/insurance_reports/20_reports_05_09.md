## DPS Eligibility Report - `insurance.dps_eligibility_report`

Insurance Reports, screenshot 5.PNG - P2 - M - any of `reports_insurance_reports_screen_view_only` (family `insurance`), `appointments_dps_ins_verification_reports` (override, security card 2.3) - interactive - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front desk, insurance coordinator | Daily, one to three working days ahead of the schedule | See the appointments that need an insurance verification, the ones already sent to the verification service and the answers that came back, so every insured patient is verified before the visit `[I]`; feature `[D]` `[R26]` `[R27]` |
| Front desk | Daily, for newly booked appointments | With `Appointment Created Date`: the appointments booked today (any visit date), which need a first verification request |
| Office manager | Weekly | Audit of requests left `On Hold` (the service does not work them) and of insured appointments never verified |

DPS = Denticon Practice Services, the vendor's outsourced verification service: a `DPS Ins. Verification` request is made per
appointment on the `Subscriber / Insurance Verification` form (appointment date and time, patient, member id, DOB, phone,
e-mail, provider; per primary and secondary coverage the subscriber, id, DOB, `Patient Is Subscriber`, carrier name and
address, `Verify Type`, employer, group number; an `On Hold` tick; `Submit`), answered in 24-48 hours `[D]` `[S]` `[R26]`.
DentC has no outsourced service: the DentC request is an `eligibility_verifications` row with `method = 'service'` and
`status = 'requested'` written by the request action of RPT-INS-41; verifications done by staff are `method = 'manual'`.

### Legacy output

Confidence: **INFERRED** for every element - the report itself is described nowhere (research section 4, DPS Eligibility Report).

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `DPS Eligibility Report` (menu name; not seen) | header page furniture |
| Office band | `Office : <name>` per office | family furniture |
| Grain | One row per appointment and coverage slot (primary, secondary); per-coverage grain `[unverified]` | research grain; the request form carries primary and secondary |
| Columns, in order | `Appt Date` - `Time` - `Created On` - `Provider` - `Patient` - `Chart #` - `DOB` - `Phone` - `Ty` - `Carrier` - `Subscriber` - `Sub DOB` - `Sub ID` - `Group #` - `Employer` - `Verify Type` - `On Hold` - `Status` | research reconstruction (verification form `[R26]`) |
| Grouping | Appointment date band `Appointment Date : <date>` with a count | proposal |
| Totals | `Total Appointments [ n ]` per date and for the report | proposal |
| Footer echo | `Date Range Type`, `Appt From`, `Thru`, `Created From`, `Thru`, `Providers`, `On Hold`, `Include patients with no insurance`, then title, `Printed : <date time>`, `Page : n of m` | family furniture; labels proposed |

No money is printed. Quirk kept from the data, not from the legacy tool: one eligibility stamp per subscriber marks every
dependant (data card 2.21), so two children of one subscriber print the same `Status` and `Last Verified`.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r05 -->

| Legacy option | Effect on the result |
|---|---|
| DPS ELIGIBILITY `On Hold` unticked (default) | No predicate on the hold flag: every appointment in range (insured, plus uninsured when the last option is ticked), with or without a request |
| DPS ELIGIBILITY `On Hold` ticked | Only appointment slots whose latest verification request has `is_on_hold = true` (`eligibility_verifications`, DATA-34; meaning inferred, supplement correction "likely"). Before DATA-34 holds no row: zero rows plus notice `needs_eligibility_history` |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Appointment office `rpt_appointment_facts.office_id` in the resolved set; one `Office :` band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / `rpt_appointment_facts.provider_id IN (...)` (`provider_role = appointment`) |
| DATE RANGE TYPE `Appointment Date` (default) | `appointment_date BETWEEN date_from AND date_to`; the created range is greyed and ignored (`disabled_value`) |
| DATE RANGE TYPE `Appointment Created Date` | `created_date BETWEEN appointment_created_date_from AND appointment_created_date_to` on rows with `created_at_reliable`; the appointment range is greyed and ignored. Migrated appointments never match (no created date) |
| DATE RANGE TYPE `Both` | Both ranges apply, combined with AND (inferred: "applies both"; OR is the alternative, open question 2) |
| APPOINTMENT DATE RANGE Start / End (today / today) | Inclusive office-local appointment dates; `enabled_when date_range_type != appointment_created_date` |
| APPOINTMENT CREATED DATE RANGE Start / End (today / today, greyed) | Inclusive office-local created dates (timestamp bounds per office time zone, data card 4.3); `enabled_when date_range_type != appointment_date`; `required_when` the same |
| OTHER OPTIONS `Include patients with no insurance` unticked (default) | Only appointments of patients holding an active dental slot today (`rpt_insurance_coverage`, `category = 'dental'`) |
| `Include patients with no insurance` ticked | Adds one row per appointment of a patient without an active slot; coverage columns blank, `Status` = `No Insurance` |
| Population rule (no control) | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`, `NOT is_patientless`; cancelled and no-show appointments excluded (`status_class NOT IN ('cancelled', 'no_show')`, proposal - legacy rule unknown, open question 3) |

Dependency rules: DATE RANGE TYPE enables exactly the range(s) it names (rules of the parity file, inferred from the
greyed capture); no other captured rule.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_preset` values `tomorrow`, `next_2_working_days`, `next_7_days` | `date_range` presets (FLT-04) | `today` | The daily "verify ahead" window | Same presets as `worklists.eligibility_verification` |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked (`no_predicate`) | Only primary or only secondary slots | `quaternary` never matches; tertiary only where a slot exists |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the slot | Legacy screen has no carrier criterion |
| `eligibility_states` | NEW `enum_multi`: `verified`, `not_eligible`, `unknown`, `expired`, `no_insurance` (owner 04) | full selection, `no_predicate` | E.g. only `unknown` + `expired` = the work still to do. `expired` = `verified` with `elig_verified_on` older than the organisation setting `eligibility_valid_days` before the appointment (05 section 3 setting 35) | Same states as the worklist filter "verification state" |
| `request_states` | NEW `enum_multi`: `not_requested`, `requested`, `answered`, `error` (owner 04) | full selection | Filters on the latest `eligibility_verifications` row of the slot | Empty until DATA-34 data exists |
| `sort_by` | `enum` (shared 3.9) | `appointment_date_time` | `appointment_date_time`, `provider_appointment`, `patient_last_name`, `days_since_verified_desc` | Legacy order unknown |
| Saved view "Verify tomorrow" | saved view | - | `date_preset = tomorrow`, `eligibility_states = [unknown, not_eligible, expired]` | Daily pre-visit list |
| Saved view "Booked today" | saved view | - | `date_range_type = appointment_created_date`, created range `today` | New bookings needing a first request |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_appointment_facts`, `rpt_insurance_coverage`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_user_dim`, `eligibility_verifications` (passthrough, DATA-34) |
| Columns used | appointments: `appointment_id`, `office_id`, `provider_id`, `patient_id`, `appointment_date`, `start_time`, `created_date`, `created_at_reliable`, `status_class`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`; coverage: `slot_id`, `category`, `tier`, `carrier_id`, `carrier_name`, `carrier_phone`, `group_number`, `employer_name`, `subscriber_id`, `sub_member_id`, `subscriber_name`, `subscriber_dob`, `relationship`, `elig_status_class`, `elig_verified_on`, `elig_verified_by`; patient: `first_name`, `last_name`, `chart_no`, `dob`, `phone`, `cell_phone`; verifications (latest row per appointment and slot, `LEFT JOIN LATERAL ... ORDER BY checked_at DESC LIMIT 1`, matched on `appointment_id` and `subscriber_id`, else on `subscriber_id` alone within 30 days before the appointment): `method`, `verify_type`, `is_on_hold`, `status`, `payer_name`, `error_text`, `checked_at`, `checked_by` |
| Join | appointment x today's dental slots of the patient (`LEFT JOIN` when `include_patients_with_no_insurance`); never multiplies beyond one row per slot |
| Date basis | `appointment_date` and / or appointment `created_date`, chosen by `date_range_type` (header) |
| Office attribution | appointment office |
| Provider attribution | appointment provider |
| Coverage rating | **READY** on the current stamp (coverage matrix #34); history of requests and answers, `Verify Type` and `On Hold`: **SCHEMA(34)** |
| Availability entries | `eligibility_current_stamp_only` (until DATA-34: status is the subscriber's current stamp, no request columns); `needs_eligibility_history` (On Hold ticked or `request_states` narrowed before DATA-34 rows exist); `appointment_created_date_app_only` (created range: migrated appointments never match) |
| Not reproducible | which appointments were verified before a past visit (one overwritable stamp per subscriber, no history before DATA-34); coverage on the appointment date (slots carry no dates: coverage is today's); every migrated subscriber is `unknown` (data card 2.21), so at go-live nearly every insured appointment shows `Unknown` |

### Output

Report format: one (`standard`). Block `appointments` (table, `row_id_column = row_key` = `appointment_id || ':' || coalesce(slot_id, 0)`).
Levels: office band (`multi_office`) -> appointment date `Appointment Date : {appointment_date}`, subtotal
`Total Appointments [ {appointment_count} ]`; grand total `Total Appointments [ {appointment_count} ]` (count of distinct
`appointment_id`, so a two-slot appointment counts once).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `row_key`, `appointment_id`, `patient_id`, `subscriber_id` | - | id, hidden | phi_identified | row id, drill and action keys |
| `appointment_date` | Appt Date | date | phi_identified | group key of the date level |
| `start_time` | Time | time | phi_identified | none |
| `created_date` | Created On | date | phi_identified | none (blank on migrated rows) |
| `provider_name` | Provider | text | aggregate | none |
| `patient_name` | Patient | text | phi_identified | key column; `count_distinct appointment_id` |
| `chart_no` | Chart # | text | phi_identified | none |
| `dob` | DOB | date | phi_identified | none |
| `phone` | Phone | text | phi_identified | none (cell, else home) |
| `tier_letter` | Ty | text | aggregate | none (`P`, `S`, `T`) |
| `carrier_name` | Carrier | text | aggregate | none |
| `carrier_phone` | Carrier Ph | text, `default_visible: false` | aggregate | none |
| `subscriber_name` | Subscriber | text | phi_identified | none |
| `subscriber_dob` | Sub DOB | date | phi_sensitive | none |
| `sub_member_id` | Sub ID | text | phi_sensitive | none |
| `group_number` | Group # | text | phi_sensitive | none |
| `employer_name` | Employer | text, `default_visible: false` | phi_sensitive | none |
| `verify_type` | Verify Type | text | aggregate | none (DATA-34; blank before) |
| `is_on_hold` | On Hold | boolean | aggregate | count of true |
| `request_status` | Request | enum | aggregate | none (`Not requested`, `Requested`, `Answered`, `Error`) |
| `elig_status` | Status | enum | aggregate | count per value in the report-end block (`Eligible`, `Not Eligible`, `Unknown`, `Expired`, `No Insurance`) |
| `elig_verified_on` | Last Verified | datetime (`tz: office`) | phi_identified | none |
| `elig_verified_by` | Verified By | text | aggregate | none (user label, `Auto_RTE` for the sweep) |
| `days_to_appointment` | Days | integer, `default_visible: false` | aggregate | none |
| `payer_message` | Payer Message | text, `default_visible: false` | phi_identified | none (free text, security card 5.2 rule 4) |

Block `status_summary` (`key_value`, placement `report_end`): count of appointment slots per `elig_status` and the count
with `is_on_hold`. Sort: `sort_by` inside the date band; tie-breaker `row_key`. Page break: office band;
`page_break_by = date` (value of the shared 3.9 vocabulary) for one page per appointment day. Summary cards: `Appointments`,
`Unverified` (`unknown` + `not_eligible` + `expired`), `On hold`, `Requested, no answer`. No metric reconciles exactly:
`eligibility_verified_pct` (P3) uses its own window and validity rule; test RPT-INS-40 checks that a run with the
worklist's window and `coverage_orders = [primary]` gives the same verified share. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bars per appointment day: slots by `elig_status` (next 7 days view); none on a one-day run |
| Status bar segment | `kind rows`: the run filtered to that day and status |
| `Patient` | patient shell (`route_key patient_overview`), `phi_identified` |
| `Appt Date` / `Time` | `kind record`, entity appointment, `route_key scheduler_appointment` (Scheduler opened on the day with the appointment selected), right of the Scheduler screen |
| `Carrier` / `Sub ID` | `kind record`, entity coverage slot, `route_key patient_insurance` (the slot's plan screen), right of the patient insurance screen |
| Summary card `Unverified` | `kind report` `worklists.eligibility_verification` with the same `office_scope` and appointment range |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Update status (verified / not eligible with a note) | row | `custom:verify_eligibility` -> `POST /insurance-subscribers/{subscriber_id}/verify-eligibility` (handler of 06 section 6.3) | patient insurance feature right | P3 (ENG-49); P2 = open the coverage screen |
| Request verification (writes `eligibility_verifications`, `method = 'service'`, `status = 'requested'`, verify type, on-hold flag) | row and bulk | `custom:request_verification` (RPT-INS-41) | `appointments_dps_ins_verification_reports` | P3 (ENG-49) |
| Request updated insurance from the patient | bulk | `send_sms` / `send_email` (template "please bring your current insurance card"), consent exclusions counted | messaging right | P3 (DASH-31) |
| Open appointment | row | drill `scheduler_appointment` | Scheduler right | P2 |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: the live, actionable version is `worklists.eligibility_verification` (06 section 6.3); the report is
the printable audit list with request history.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (18 columns), office and date bands, `status_summary` at report end, footer echo as Legacy output; `Sub ID` and `Sub DOB` dropped for a caller without `phi_sensitive` |
| XLSX | Sheet `appointments`: flat typed columns plus `Office`, `Office Name`, `Appointment Id`; `Phone` split into `Home Phone`, `Cell Phone`; criteria sheet |
| CSV | Main block |
| Background | Not needed (one office-day is tens of rows); `escalate_when` all offices and a range over 31 days |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Printed title, column list, grouping and totals (no vendor source) | Proposal of Legacy output |
| 2 | DATE RANGE TYPE `Both`: both ranges (AND) or either (OR)? | AND |
| 3 | Are cancelled, missed and block-out appointments listed? | Excluded |
| 4 | One row per appointment or per appointment and coverage? | Per appointment and slot |
| 5 | `On Hold` ticked: only held requests, or held requests added to the list? | Only held requests |
| 6 | Does the legacy report list appointments without any DPS request, or only appointments with a request? | All appointments in range (the request columns show `Not requested`) |
| 7 | Header item RPT-INS-06 says both eligibility reports "run empty" before DATA-34; coverage matrix #34 rates this report READY on the current stamp | READY: rows from the current stamp, request columns empty, notice `eligibility_current_stamp_only` |

## Capitation Payment - `insurance.capitation_payment`

Insurance Reports, screenshot 6.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - instant - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Managed-care (DHMO) office, billing | Month end, after the carriers' monthly capitation cheques arrive | List the capitation payments received per carrier and period, check that every contracted carrier paid, and hand the figures to accounting `[D]` `[R9]` |
| Office manager | Month end, with Capitation Utilization | Compare what each managed-care carrier paid with the value of the services done for its members (enhancement) |

Source data in the legacy tool `[S]` `[D]` `[R37]`: `Transactions > Capitation Payment` with carrier (shown with its capitation
fee schedule), `Use Payment Code Of` (e.g. `CAP PYMT`), `Use Adjustment Code Of` (e.g. `ADJ ON - Capitation Adjustment`),
`Date`, `Amount`, `Check #`, `Bank #`, `EOB #`, `Notes`; each payment posts a payment line and an offsetting adjustment
line on the pseudo-account `Account, Capitation`.

### Legacy output

Confidence: purpose and source data **PARTIALLY DOCUMENTED**; layout **INFERRED** (research section 4, Capitation Payment).

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `Capitation Payment` (menu name; not seen) | header page furniture |
| Office band | `Office : <name>` per office | family furniture |
| Carrier band | `Carrier : <name>` | research reconstruction |
| Columns, in order | `Date` - `Carrier` - `Payment Code` - `Description` - `Check #` - `Bank #` - `EOB #` - `Amount` - `User` | research reconstruction `[I]`, entry screen `[R37]` |
| Subtotal | `Total for <carrier> [ n ] :` with payment count and `Amount` | research ("subtotal per carrier") |
| Grand total | `Grand Total [ n ] :` | research ("grand total") |
| Footer echo | `From`, `Thru`, `Offices`, `Carriers`, then title, `Printed`, `Page : n of m` | family furniture |

Sign convention: `Amount` prints positive (money received); the offsetting adjustment leg is never listed (header money
rules). Comparable consulted for shape only: SoftDent `Capitation Collections Summary` `[X7]`.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r06 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | `capitation_payments.office_id` (office where the payment was applied) in the resolved set; one `Office :` band per office |
| DATE RANGE Start / End (today / today) | Fixed basis `payment_date` (inferred): `payment_date BETWEEN date_from AND date_to`, inclusive |
| CARRIER `ALL` (default) / a selection | No predicate / `capitation_payments.carrier_id IN (...)`. Option source `carriers`; whether the legacy dialog lists only carriers with a capitation fee schedule is open (question 2) |
| Population rule (no control) | `NOT is_void`; payment leg only (one row per `capitation_payments` row) |

Dependency rules: none captured. No PROVIDER section exists on the screen.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `group_by` | `enum` (shared 3.9), options `carrier` (legacy band), `carrier_month` (NEW value) | `carrier` | `carrier_month` adds a payment-month level under the carrier with a subtotal per month | A 12-month range then reads as a carrier x month payment history |
| `include_voided` | NEW `boolean` (owner 04) | `false` | Lists voided payments with `Void` = yes, `void_reason`, excluded from totals | Audit of reversed cheques |
| `include_utilization_comparison` | NEW `boolean` (owner 04) | `false` | Adds per carrier subtotal `Value of Services` (office-fee value of procedures done for the carrier's prepaid members in the same range, the Office Default total of `insurance.capitation_utilization`) and `Paid / Value` | Same population rule as Capitation Utilization (RPT-INS-12, RPT-INS-14); P3 with `capitation_utilization_pct` |
| `date_preset` values `last_month`, `last_12_months`, `year_to_date` | `date_range` presets | `today` | Month-end and annual views | - |
| Saved view "Last month by carrier" | saved view | - | `date_preset = last_month` | Month-end hand-off to accounting |

### Data

| Topic | Rule |
|---|---|
| Datasets | `capitation_payments` (passthrough, DATA-38), `rpt_transaction_code_dim` (code descriptions), `rpt_user_dim` (`created_by`), `rpt_office_dim`; carriers through the `carriers` catalog passthrough. The `cap` legs of `rpt_payments` (`txn_class = 'capitation_payment'`) carry the same money and are the reconciliation target, not a second source |
| Columns used | `id`, `office_id`, `carrier_id`, `fee_schedule_id`, `payment_date`, `amount`, `payment_code`, `adjustment_code`, `check_number`, `bank_number`, `eob_number`, `provider_id`, `notes`, `posted_at`, `posting_date`, `created_by`, `is_void`, `voided_at`, `void_reason` |
| Date basis | `payment_date` (inferred, header); `posting_date` is printed only (`Posted On`) |
| Office attribution | office where the payment was applied (`capitation_payments.office_id`) |
| Provider attribution | none (carrier-level payment, no patient); `provider_id` is stored and printable, never filtered by the legacy screen |
| Coverage rating | **SCHEMA(38)** (coverage matrix #35): a carrier-level payment has no patient and no table today; **APP** afterwards |
| Prerequisite outside the report | a capture screen that writes `capitation_payments` (RPT-INS-44); until it exists the report is listed with notice `needs_capitation_entry` and runs empty |
| Not reproducible | legacy capitation payments: none were loaded into a carrier-level entity; whether the legacy LEDGER export holds them as rows of the pseudo-account `Account, Capitation` is unknown (open question 4) |
| Reconciliation | sum of `Amount` = `-sum(amount)` of `rpt_payments` rows with `txn_class = 'capitation_payment'` for the same offices and `payment_date` range (R-02 untouched: the `cap` / `capa` pair nets to zero) |

### Output

Report format: one (`standard`). Block `payments` (table, `row_id_column = capitation_payment_id`). Levels: office band
(`multi_office`) -> carrier `Carrier : {carrier_name}`, subtotal `Total for {carrier_name} [ {row_count} ] :` -> [month
`{payment_month}` with subtotal when `group_by = carrier_month`]; grand total `Grand Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `carrier_id` | - | id, hidden | aggregate | group keys |
| `capitation_payment_id` | - | id, hidden | aggregate | row id |
| `payment_date` | Date | date | aggregate | none |
| `carrier_name` | Carrier | text | aggregate | group label |
| `fee_schedule_name` | Capitation Fee Schedule | text, `default_visible: false` | aggregate | none |
| `payment_code` | Payment Code | text | aggregate | none |
| `payment_code_description` | Description | text | aggregate | none |
| `adjustment_code` | Adj. Code | text, `default_visible: false` | aggregate | none |
| `check_number` | Check # | text | payment_instrument | none |
| `bank_number` | Bank # | text | payment_instrument | none |
| `eob_number` | EOB # | text | payment_instrument | none |
| `amount` | Amount | money | financial_practice | sum (void rows excluded) |
| `created_by` | User | text | aggregate | none |
| `posted_on` | Posted On | date, `default_visible: false` | aggregate | none |
| `provider_name` | Provider | text, `default_visible: false` | aggregate | none |
| `notes` | Notes | text, `default_visible: false` | phi_identified | none (free text, rule 4) |
| `is_void`, `void_reason` | Void, Void Reason | boolean, text, `visible_when ["truthy","include_voided"]` | aggregate | count of void rows |
| `value_of_services` | Value of Services | money, subtotal-only, `visible_when ["truthy","include_utilization_comparison"]` | financial_practice | carrier subtotal and grand total only |
| `paid_to_value_pct` | Paid / Value | percent, computed `ratio(amount, value_of_services)` | financial_practice | carrier and grand level |

Sort: `payment_date`, then `check_number`; tie-breaker `capitation_payment_id`. Page break: office band;
`page_break_by = group` breaks per carrier. Summary cards: `Capitation received` (sum `amount`), `Payments` (count),
`Carriers paid` (count distinct `carrier_id`). `reconciles_with`: none in the metric registry (no capitation-received
metric exists; NEW metric `capitation_payments_amount` proposed to 05). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `amount` per carrier; with `carrier_month` a line per carrier over the months (missing month = no payment, shown as a gap) |
| Carrier subtotal | `kind rows` |
| `Value of Services` | `kind report` `insurance.capitation_utilization` with `carrier_ids = [carrier]`, the same `office_scope` and dates, `report_format = summary` |
| Row | `kind record`, entity capitation payment, `route_key capitation_payment_entry` (NEW screen of RPT-INS-44), right `transactions_transaction_entry_screen_full_control` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open payment (edit or void there) | row | drill `capitation_payment_entry` | transaction entry right | P2 |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (9 default columns), office and carrier bands, footer echo; `Check #`, `Bank #`, `EOB #` dropped for a caller without `payment_instrument` |
| XLSX | Sheet `payments`: flat typed rows with `Office`, `Office Name`, `Carrier`, `Payment Month`; criteria sheet |
| CSV | Main block |
| Background | Never (one row per carrier per month) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, order and totals (no vendor sample) | Proposal of Legacy output |
| 2 | Does the CARRIER dialog list every carrier or only carriers with a capitation fee schedule? | Every carrier (family question 4) |
| 3 | Date basis: payment date or posting date? | `payment_date` |
| 4 | Did the legacy export contain capitation payments as ledger rows of `Account, Capitation`, and should they be loaded into `capitation_payments` (NEW repair, owner 03)? | Not loaded; the report is APP |
| 5 | Are voided capitation payments listed (struck through) on the legacy report? | Not listed (enhancement `include_voided`) |

## Benefits Used/Unused - `insurance.benefits_used_unused`

Insurance Reports, screenshot 7.PNG - P2 (Recall mode P3) - L - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive (background over a 12-month range across offices) - DOCUMENTED (both modes, 2011-2012 samples)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Treatment coordinator, front office | Before the benefit rollover: November-December for calendar-year plans, monthly for non-calendar plans | Find patients whose annual maximum is not used up before their plan anniversary and who have planned treatment (or are due for recall), call or write them, and book the work before the benefits reset `[D]` `[R6]` |
| Office manager | Quarterly | Size the unscheduled treatment that is still covered by this year's benefits |

### Legacy output

Confidence: **DOCUMENTED** for both modes (vendor samples 2011-2012 `[S]` `[R6]`; current layout may have changed).

| Element | Treatment Plan mode | Recall mode |
|---|---|---|
| Printed title | `Benefits Used/Unused Report - Treatment Plan` | `Benefits Used/Unused Report - Recall` |
| Grain | One block per patient per treatment-plan ID, one line per coverage | One block per patient per recall item, one line per coverage |
| Column groups, in order | `Patient Name` (with `Chart # :` underneath) - `Phones` (`(H)`, `(C)`, `(W)`) - `Treat Pln`: `ID`, `Charges` - `Carrier` (prefixed `P :` / `S :`) - `Anni Dt` - `Fam Max` - `Fam Max Rem` - `Ind Max` - `Ind Max Rem` - `Fam Ded` - `Fam Ded Rem` - `Ind Ded` - `Ind Ded Rem` | `Patient Name` - `Chart#` (own column) - `Phones` - `Recall`: `Date`, `Code`, `Reason` - `Carrier` - `Anni Dt` - the same eight benefit columns |
| Coverage lines | Primary and secondary print as two lines of the block | same |
| Grouping and totals | None on either sample | None |
| Footer echo | `Anni Date From`, `Thru`, `Ex Resp. Type`, `Providers`, then title, `Printed`, `Page : n of m` | 2011 sample adds `Recall Date From / Thru`, `Max Over`, `Recall Codes` |

Quirks kept: `99999.00` is an unlimited plan, not a balance (flagged `unlimited`, excluded from totals); `Ind Max Rem`
already nets posted procedures with estimated insurance, not only paid claims `[D]` `[R38]`; remaining amounts are only as
good as the benefit reset (`[R13]` `[R39]`; DentC recomputes from claims of the benefit year, data card 2.21). Quirk fixed:
the 2011 header typos `Fax Max Rem` / `Ins Max Rem` print as `Fam Max Rem` / `Ind Max Rem` (2023 wording).

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r07 -->

| Legacy option | Effect on the result |
|---|---|
| TREATMENT PLAN/RECALL `Treatment Plan` (default) | Population = patients with at least one pending treatment-plan item (`rpt_treatment_item_facts.is_pending`) whose dental slot has its next anniversary in range; one block per patient and `plan_id`; title `... - Treatment Plan` |
| TREATMENT PLAN/RECALL `Recall` | Population = patients with a recall row due (`rpt_recall_due()`, `recall_status IN ('due', 'overdue')`, P3) and a slot with its next anniversary in range; one block per patient and recall code; title `... - Recall`; shows the three Recall criteria (vendor-doc). Until P3 the option is listed with notice `recall_mode_p3` and runs empty |
| Recall Date From / Thru (vendor-doc, `recall_date`, Recall mode only) | `rpt_recall_due.due_date BETWEEN recall_date_from AND recall_date_to`; default unknown, proposed `today` .. `date_to` of the anniversary range (inferred) |
| Max Over (vendor-doc, `max_over`, Recall mode only) | `max_remaining_effective > max_over` on at least one coverage line of the patient (inferred from the echo label; control type and default unknown, proposed `0.00`) |
| Recall Codes (vendor-doc, `recall_procedure_codes`, Recall mode only) | `all` = every recall code / `procedure_code IN (...)` on the recall row |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet one row per coverage line; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Patient home office `rpt_patient_dim.home_office_id` in the resolved set (header, proposed); band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / Treatment Plan: at least one pending item of the block with `rpt_treatment_item_facts.provider_id IN (...)`, and `Charges` sums only those items; Recall: `rpt_recall_due.preferred_provider_id IN (...)` (both proposed, family question 2) |
| ANNIVERSARY DATE RANGE Start (first day of next month) / End (one year later minus a day) | Fixed basis `anniversary_date` = next benefit rollover of the slot = `rpt_benefit_usage.benefit_year_end + 1` as of the office-local today; coverage line kept when that date is in range; a block is printed when at least one of its lines is kept. Help text `(* UPCOMING BENEFIT ROLLOVER PERIOD.)` |
| EXCLUDE RESPONSIBLE PARTY TYPE `None` (default) / a selection | Nothing excluded / patients whose account's `rpt_account_dim.resp_party_type` is selected are dropped; accounts without a type are kept (`null_policy keep`); echo `Ex Resp. Type` |
| Population rule (no control) | Active patients only (`rpt_patient_dim.is_active`, proposed); dental slots only; at least one coverage line with remaining maximum > 0 or unlimited (`[D]` purpose "still have benefits", the exact rule is unverified) |

Dependency rules: `recall_date`, `max_over`, `recall_procedure_codes` `visible_when report_type == recall` (vendor-doc,
inferred; the Recall state of the screen was never captured).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `benefits_remaining_min` | NEW `decimal` (key used by `worklists.unscheduled_treatment`, owner 04) | `"0.00"` | Keeps patients whose `Ind Max Rem` on some line is at least the value | The Treatment Plan twin of `max_over` |
| `acceptance_state` | `enum` (key used by 06 section 6.5, owner 04): `any`, `accepted_only`, `not_accepted` | `any` | `accepted_only` = items with `exclusive_status = 'accepted'` only | Accepted but unscheduled work is the best call list |
| `has_future_appointment` | NEW `enum` `any` / `yes` / `no` (owner 04) | `any` | `no` keeps patients without any live future appointment (`rpt_appointment_facts`) | Avoids calling patients already booked |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked | Primary only, secondary only | - |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the slot | - |
| `sort_by` | `enum` (shared 3.9) | `patient_last_name` | `patient_last_name`, `remaining_desc` (largest `Ind Max Rem` first), `anniversary_date`, `charges_desc` | Legacy order unknown (samples alphabetical `[I]`) |
| Column `est_insurance_pending` | column | hidden | Sum of `insurance_estimate` of the pending items of the block | Shows how much of the remaining maximum the plan would use |
| Saved view "Year-end calendar plans" | saved view | - | `date_from = next 01-01`, `date_to = next 01-01` | Calendar-year rollovers only |
| Saved view `Benefits Used/Unused - Recall` | saved view (header) | - | `report_type = recall` | From P3 |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_benefit_usage()` (as of office-local today), `rpt_insurance_coverage`, `rpt_treatment_item_facts`, `rpt_recall_due()` (Recall), `rpt_patient_dim`, `rpt_account_dim`, `rpt_procedure_code_dim` (recall reason), `rpt_appointment_facts` (enhancement) |
| Columns used | benefit usage: `slot_id`, `patient_id`, `tier`, `carrier_id`, `benefit_year_start`, `benefit_year_end`, `individual_max`, `max_remaining_effective`, `max_remaining_source`, `individual_deductible`, `deductible_remaining_effective`, `deductible_remaining_source`, `family_max`, `family_max_remaining_stored`, `family_deductible`, `family_ded_remaining_stored`, `slot_written_on`; coverage: `carrier_name`, `category`; items: `plan_id`, `item_id`, `provider_id`, `fee`, `insurance_estimate`, `is_pending`, `exclusive_status`, `era`; recall: `procedure_code`, `due_date`, `recall_status`, `preferred_provider_id`; patient: `first_name`, `last_name`, `chart_no`, `phone`, `cell_phone`, `work_phone`, `home_office_id`, `account_id`, `is_active`; account: `resp_party_type` |
| Benefit columns | `Ind Max`, `Ind Ded`, `Fam Max`, `Fam Ded` = plan limits; `Ind Max Rem` = `max_remaining_effective`; `Ind Ded Rem` = `deductible_remaining_effective`; `Fam Max Rem`, `Fam Ded Rem` = stored snapshots per subscriber, printed with `slot_written_on` (data card 2.21) |
| `Charges` | Treatment Plan: `sum(fee)` of the pending items of the `plan_id` (inferred: "total charges of that plan ID"; open question 2) |
| Date basis | `anniversary_date` (header) |
| Office attribution | patient home office (proposed, header) |
| Provider attribution | treating provider of the planned item (Treatment Plan), preferred provider (Recall) - proposed |
| Coverage rating | **REPAIR(32)** (coverage matrix #36): plan limits and slot tiers right only after the source-field backfill; family columns are stored snapshots; pending treatment **APP** (migrated plans are 674 dateless headers); Recall mode `rpt_recall_due()` (P3, DATA-41 for maintained rows); EXCLUDE RESPONSIBLE PARTY TYPE **SCHEMA(53)** (until DATA-53 self-guarantor accounts carry no type and are never excluded) |
| Availability entries | `benefit_limits_unrepaired` (before DATA-32 checks pass), `family_remaining_stored`, `resp_party_type_partial` (before DATA-53), `recall_mode_p3` |
| Not reproducible | remaining benefits as of a past date for migrated years (no deductible was applied to any migrated row; `Ind Ded Rem` is the stored or plan value for history); anniversaries of plans whose `anniversary_month` is 0 before the backfill (line printed with `Anni Dt` blank and excluded from the range filter, counted in the notice) |

### Output

Report formats: the `report_type` values select the block; there is no `report_format` control.

Block `tp_benefits` (`report_type = treatment_plan`; table, `row_id_column = row_key` = `patient_id:plan_id:slot_id`).
Levels: office band (`multi_office`) -> patient-plan block (key `patient_id`, `plan_id`; header row carries patient,
phones, plan id and charges on the first coverage line, later lines blank in those cells). No subtotals (legacy); grand
total enabled (proposal).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `row_key`, `patient_id`, `slot_id` | - | id, hidden | phi_identified | row id, drill and action keys |
| `patient_name` | Patient Name | text | phi_identified | key column; grand `count_distinct patient_id` |
| `chart_no` | Chart # | text (PDF: second line under the name) | phi_identified | none |
| `phones` | Phones | text (`(H) ... (C) ... (W) ...`) | phi_identified | none |
| `plan_id` | ID | text | phi_identified | group key of the block |
| `plan_charges` | Charges | money | financial_patient | printed once per block; grand total sums each block once |
| `est_insurance_pending` | Est. Ins | money, `default_visible: false` | financial_patient | as `plan_charges` |
| `tier_carrier` | Carrier | text (`P : <carrier>`, `S : <carrier>`) | aggregate | none |
| `anniversary_date` | Anni Dt | date | aggregate | none |
| `family_max` | Fam Max | money | financial_patient | none |
| `family_max_remaining` | Fam Max Rem | money (tooltip `as of {slot_written_on}`) | financial_patient | none |
| `individual_max` | Ind Max | money | financial_patient | none |
| `individual_max_remaining` | Ind Max Rem | money | financial_patient | grand sum excluding `is_unlimited` rows |
| `family_deductible` | Fam Ded | money | financial_patient | none |
| `family_ded_remaining` | Fam Ded Rem | money | financial_patient | none |
| `individual_deductible` | Ind Ded | money | financial_patient | none |
| `individual_ded_remaining` | Ind Ded Rem | money | financial_patient | none |
| `is_unlimited` | Unlimited | boolean (`individual_max >= 99999`) | aggregate | count |
| `max_remaining_source` | Rem. Source | enum, `default_visible: false` (`claims`, `stored`, `plan`) | aggregate | none |
| `family_written_on` | Fam Rem As Of | date, `default_visible: false` | aggregate | none |

Block `recall_benefits` (`report_type = recall`): the same columns with `plan_id`, `plan_charges` and
`est_insurance_pending` replaced by `recall_due_date` (Date, phi_identified), `recall_code` (Code, phi_identified),
`recall_reason` (Reason = description of the recall code, aggregate; legacy meaning unverified), and `chart_no` as its
own column; block key `patient_id`, `recall_code`.

Sort: `sort_by` (blocks), coverage lines by tier; tie-breaker `row_key`. Page break: office band;
`page_break_by = patient` (value of the shared 3.9 vocabulary) for one block per page. Summary cards: `Patients` (count distinct),
`Remaining maximum` (sum `individual_max_remaining`, unlimited excluded), `Unlimited plans` (count), `Planned charges`
(Treatment Plan). `reconciles_with`: `individual_max_remaining` grand total = `benefits_remaining_amount` (P3; the card
is shown when the metric ships, header) for `report_type = treatment_plan`, all providers, default anniversary range.
`empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `Remaining maximum` by anniversary month of the range (12 bars) - where the money expires first |
| Month bar | `kind rows` filtered to that anniversary month |
| `Patient Name` | patient shell (`route_key patient_overview`), `phi_identified` |
| `ID` / `Charges` | `kind record`, entity treatment plan, `route_key patient_treatment_plan` (the plan opened), right of the treatment-plan screen |
| `Carrier` / benefit cells | `kind record`, entity coverage slot, `route_key patient_insurance`, right of the patient insurance screen |
| Recall `Date` / `Code` | `kind record`, `route_key patient_recall`, right of the recall screen (P3) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Schedule the plan items | row | `navigate` booking hand-off (`openSchedulerForBooking` with the block's pending items preselected) | Scheduler right | P2 |
| Print proposal | row | `navigate` `treatment_plan.treatment_plan_proposal` with the patient in context | `treatment_plan` family | P2 |
| "Use your benefits before {anniversary_date}" message | bulk | `send_sms` / `send_email` with consent exclusions counted (`no_correspondence`, `no_auto_sms`, `sms_opt_out_at`) | messaging right | P3 (DASH-31) |
| Letters | bulk | `letters` (benefit-reminder letter template) | letters right (PD-15) | P3 |
| Create follow-up tasks | bulk | `create_task` (type `benefits_expiring`, NEW, owner 06) | task feature right | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: the live counterpart is `worklists.unscheduled_treatment` with "benefit year ends within N
months"; the report keeps the legacy anniversary-range form.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (14 columns), block layout with the patient cells on the first coverage line, name and `Chart # :` stacked, footer echo `Anni Date From`, `Thru`, `Ex Resp. Type`, `Providers` (Recall adds `Recall Date From`, `Thru`, `Max Over`, `Recall Codes`) |
| XLSX | Sheet per mode: one row per coverage line, patient and plan columns repeated on every line (no merged cells), `Phones` split into `Home Phone`, `Cell Phone`, `Work Phone`, `Unlimited` and `Fam Rem As Of` as columns; criteria sheet |
| CSV | Main block |
| Background | `escalate_when` all offices or more than 3 offices with a range over 6 months (header: 12-month range across offices) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Capture the Recall state of the screen: are `Recall Date From / Thru`, `Max Over`, `Recall Codes` still controls, their types and defaults? | Vendor-doc parameters, visible in Recall mode, defaults proposed |
| 2 | `Charges` = pending items only, or every item of the plan id? Are accepted / diagnosed / hold items all counted? | Pending items, every exclusive status |
| 3 | Is a patient with nothing remaining (Ind Max Rem 0) listed? | Not listed unless unlimited |
| 4 | Which provider does PROVIDER filter? | Item provider (Treatment Plan), preferred provider (Recall) |
| 5 | Are inactive patients listed? | Active only |
| 6 | Office attribution: patient home office or plan office? | Home office (DATA-39 adds the item office in P3) |
| 7 | Recall `Reason` column content | Recall code description |
| 8 | Is the anniversary range compared with the next rollover or with the stored plan anniversary date? | Next rollover (`benefit_year_end + 1`) |

## Outstanding Claims - `insurance.outstanding_claims`

Insurance Reports, screenshot 8.PNG - P2 - L - `reports_insurance_reports_screen_view_only` (family `insurance`); CREATE TASK needs the task feature right - interactive (background over all offices) - DOCUMENTED (2023 PDF, Excel c. 2015)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff | Month end on the default date (vendor cadence `[D]` `[R13]`), and weekly for follow-up | List every claim sent and not yet recorded as paid, banded by carrier with its phone so one call covers several claims, aged on the estimated insurance; create follow-up tasks from the list `[D]` `[R3]` `[R10]` `[R18]` |
| Billing staff | Weekly | `Pre-Authorization`: pre-authorisations sent and not answered |
| Office manager | Month end | Insurance receivable by age band; claims over 90 days |

Vendor statement kept: the total is **not** comparable with Aging estimated insurance - it omits secondary claims not yet
created and procedures with no claim `[D]` `[R10]`.

### Legacy output

Confidence: **DOCUMENTED** (PDF printed 6/3/2023 `[S]` `[R10]`; Excel c. 2015 read from a low-resolution image, spellings approximate `[S]` `[R4]`). Internal names `NewOutstandingClaims` (PDF), sheet `GrpXlsClaimsAge` (Excel).

| Element | PDF | Evidence |
|---|---|---|
| Header | Organisation, `Outstanding Claims`, `Office : <name>`, band `Dental Claims` (a `Medical Claims` band presumed) | `[S]`; medical band `[I]` |
| Carrier band | `Carrier : <name>   Ph : <phone>` | `[S]` |
| Columns, in order | `Claim Sent / DOS` - `Patient Name / DOB` - `Subscriber Name / DOB` - `Chart #` - `Claim #` - `Ty` - `UCR` - `Claim $` - `Est. Ins` - `Curr` - `Over30` - `Over 60` - `Over 90` - `Over 120` - `Total` | `[S]` |
| Extra lines per claim | `Group: <no>` under the patient, `Sub ID: <id>` under the subscriber, `Created By: <user>` at the right | `[S]` |
| Ageing | The bucket columns carry `Est. Ins`; `Total` = `Est. Ins` (1,822.00 claim, 1,500.00 estimate -> `Over 120` 1,500.00, `Total` 1,500.00); a 0.00-estimate claim is listed with zero buckets | `[S]` |
| Subtotals | `Total for <carrier> [ n ] :` (header); grand total not on the sample's first page | header; `[unverified]` |
| GROUP BY Provider | A provider level (the former `Outstanding Claim Report for Provider`) | `[D]` `[R18]`; layout `[I]` |
| Footer echo | `Report Date`, `Offices`, `Providers`, `Carriers`, `Claim Sent Type : EClaim and Paper`, `Claim Amt Over/Equal`, title, `Printed`, `PlanetDDS (c) 2003 - 2023`, `Page : 1 of 42` | `[S]` |

| Element | Excel (flat, one row per claim, 25 columns) |
|---|---|
| Columns, in order | `Office` - `Carrier Name` - `Carrier Phone` - `Provider` - `Patient` - `Pat ID` - `Pat DOB` - `Subscriber` - `Sub DOB` - `Sub ID` - `Group #` - `DOS` - `Claim Sent` - `Claim #` - `UCR` - `Claim$` - `Est Ins` - `Recv Amt` - `Curr` - `Over30` - `Over60` - `Over90` - `Over120` - `Total` - `Claim Note` |
| Row 1 | Organisation, `User ID : <user>`, title (moved to the criteria sheet: no merged title cells) |
| `Claim Note` | Latest office-defined claim status with timestamp and user `[D]` `[R17]` |

Sign conventions: every amount positive. Quirks kept: buckets age `Est. Ins`, not the claim amount (reconciliation rule 2
of the research); `Ty` prints the coverage order; `UCR` and `Claim $` can differ. Quirk stated, not fixed: the age basis
cannot be read from the sample; we age from the date sent (`age_date_sent`), as comparables do `[X3]`, and print the basis
in the criteria echo.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r08 -->

| Legacy option | Effect on the result |
|---|---|
| CLAIM/PRE-AUTH `Claims` (default) | `NOT is_preauth`; title `Outstanding Claims` |
| CLAIM/PRE-AUTH `Pre-Authorization` | `is_preauth` with `status_class = 'sent'`; title `Outstanding Pre-Authorizations` (proposal; legacy title unseen); the former `Pre-Auth Outstanding Claims`. Money never combined with claims |
| CLAIM TYPE `Both` (default) / `Dental` / `Medical` | No predicate, `Dental Claims` then `Medical Claims` band / `category = 'dental'` / `'medical'` (meaning inferred, family question 3) |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Claim office `rpt_claim_facts.office_id` in the resolved set; `Office :` band per office; Excel `Office` column |
| PROVIDER `ALL` (default) / a selection | No predicate / `coalesce(treating_provider_id, billing_provider_id) IN (...)`; footer `Providers` |
| REPORT DATE (today) | As of the end of that office-local day: population and amounts as of the date, age = `report_date - age_date_sent`. Today: `rpt_claim_facts`. A past date: `rpt_claim_facts_as_of()` (DATA-31); until it exists a past date is refused with 422 `as_of_unavailable` (NEW code, owner 02) and the notice `outstanding_as_of_today_only`. A future date shifts the ageing only (proposal) |
| CLAIM AMOUNT OVER OR EQUAL TO (0.00) | `billed_amount >= value` (`Claim $`); footer `Claim Amt Over/Equal` |
| CARRIER `ALL` (default) / a selection | No predicate / claim carrier `IN (...)`; footer `Carriers` |
| CLAIM SENT TYPE `EClaim` + `Paper` (both ticked, default) | Full selection: no predicate (claims without a recorded channel kept); footer `Claim Sent Type : EClaim and Paper` |
| CLAIM SENT TYPE one box | `sent_method IN (...)`; claims without a channel dropped; meaningful only with DATA-21 (SCHEMA(21)), notice `claim_channel_not_recorded` before |
| OTHER OPTIONS `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120` (all ticked, default) | Always a predicate on the claim's age bucket: `current` 0-30 days, `over_30` 31-60, `over_60` 61-90, `over_90` 91-120, `over_120` more than 120, from `age_date_sent` to `report_date`. A claim is listed when its bucket is ticked, whatever its amount (a 0.00-estimate claim of a ticked bucket is listed with zeros). Unticked buckets also print as empty columns (proposal) |
| PRINT FORMAT `PDF` (default) | Banded PDF layout above; `role: query` on this report |
| PRINT FORMAT `Excel` | Flat 25-column workbook; GROUP BY greyed and forced to `none` (rule d01); `csv` behaves like `xlsx` |
| GROUP BY `None` (default) | Category band -> carrier band only |
| GROUP BY `Provider` | Outer provider level `Provider : <name>` above the carrier band, with `Total for provider - <name> [ n ] :` (level position inferred); legacy alias `Outstanding Claim Report for Provider` |
| CREATE TASK (footer action) | Bulk action `create_tasks` of RPT-INS-07 over the run's snapshot (confirmation states the claim count; one follow-up per claim, type `outstanding_claim` or `outstanding_pre_auth`) |
| Population rule (no control) | `status_class IN ('sent', 'partially_paid')` and `outstanding_quality <> 'unknown'`; `void`, `deleted` never listed; rows with `outstanding_quality = 'unknown'` counted in the notice `claims_unconfirmed_excluded` (header quality caveats) |

Dependency rules: `group_by` `enabled_when ["ne", "output_format", "xlsx"]` (and not `csv`), `disabled_value none`
(documented, rule d01).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `aged_amount_basis` | NEW `enum` `estimate` / `remaining` (owner 04) | `estimate` (legacy) | `remaining`: bucket columns and `Total` carry `outstanding_amount` (estimate less insurance received); reconciles with `outstanding_claims_amount` | Research section 9: "billed vs estimated toggle"; partial payments make the two differ |
| `include_unconfirmed_claims` | NEW `boolean` (owner 04) | `false` | Lists the `outstanding_quality = 'unknown'` migrated claims flagged `Unconfirmed`, excluded from every total | Migration clean-up list until REPAIR(32) |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked | Primary only / secondary only | Secondary claims are the ones most often forgotten |
| `sort_by` | `enum` (shared 3.9) | `claim_sent_date` | `claim_sent_date` (oldest first), `patient_last_name`, `est_ins_desc`, `age_desc` | Legacy row order unknown |
| `page_break_by` | `enum` (shared 3.9) member `group` | `none` | New page per provider (with GROUP BY) or per carrier | Carrier-per-page printouts for phone follow-up |
| Columns `days_outstanding`, `last_payment_date`, `submission_count`, `sent_method`, `last_follow_up` | columns, `default_visible: false` | - | Age in days, last insurance payment, re-submissions, channel, latest follow-up outcome (DASH-28) | Research section 9: "last follow-up status inline" |
| Saved views (header) | saved views | - | `Outstanding Claims - Excel`, `Outstanding Claim Report for Provider`, `Pre-Auth Outstanding Claims` | - |
| Saved view "Over 90 days" | saved view | - | `aging_buckets = [over_90, over_120]`, `sort_by = est_ins_desc` | Month-end escalation list |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts` (today) / `rpt_claim_facts_as_of()` (past date, DATA-31), `rpt_patient_dim`, `rpt_user_dim` (`Created By`), `rpt_provider_dim`, `rpt_office_dim`; `worklist_followups` passthrough (DASH-28) for `last_follow_up` |
| Columns used | `claim_id`, `claim_number`, `claim_family_no`, `patient_id`, `office_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `tier`, `category`, `is_preauth`, `status_class`, `submitted_date`, `age_date_sent`, `service_from`, `last_payment_date`, `created_by_user_id`, `treating_provider_id`, `billing_provider_id`, `billed_amount`, `ucr_amount`, `expected_amount`, `expected_basis`, `paid_amount`, `outstanding_amount`, `outstanding_quality`, `sent_method`, `submission_count`, `subscriber_name`, `subscriber_dob`, `sub_member_id`, `group_number`, `claim_note`; patient `first_name`, `last_name`, `dob`, `chart_no` |
| Family amounts | `Claim $` and `UCR` totals add a claim family once (`billed_amount_once` and NEW `ucr_amount_once`, rule of Claims List); `Est. Ins`, `Recv Amt`, buckets per tier, additive |
| `Est. Ins` | `expected_amount`; rows with `expected_basis <> 'estimate'` flagged and counted in the notice `estimate_basis_billed` (header quality caveats); `none` prints 0.00 and stays listed |
| `Recv Amt` | `paid_amount` (insurance received so far on the claim, as of the report date) |
| Date basis | `report_date` as of; ageing on `age_date_sent` (header) |
| Office attribution | claim office |
| Provider attribution | claim provider: treating, else billing (06 section 6.7) |
| Coverage rating | **REPAIR(32)** (coverage matrix #37): a migrated claim counts only while submitted or pending, and closed claims may sit in `draft` until the legacy codes are confirmed; estimate on history REPAIR(10); past Report Date SCHEMA(31), exact only from the start of DATA-25 capture |
| Availability entries | `outstanding_as_of_today_only` (before DATA-31), `claim_status_current_basis` (past date before DATA-25 capture: `status_basis = 'current'`), `claims_unconfirmed_excluded`, `claim_channel_not_recorded` (one sent-type box before DATA-21), `estimate_basis_billed` |
| Not reproducible | the outstanding list of a past date before claim status history exists; `Created By` of migrated claims (blank); estimates of migrated secondary claims (`expected_basis = 'none'`) |

### Output

Report format: one (`standard`), two output shapes chosen by `output_format` (role `query`).

Block `claims` (table, `row_id_column = claim_id`). Levels (PDF and screen): office band (`multi_office`) -> [provider
`Provider : {provider_name}`, subtotal `Total for provider - {provider_name} [ {row_count} ] :`, when `group_by =
provider`] -> category `Dental Claims` / `Medical Claims` (subtotal `Total Dental Claims [ {row_count} ] :`) -> carrier
`Carrier : {carrier_name}   Ph : {carrier_phone}`, subtotal `Total for {carrier_name} [ {row_count} ] :`; grand total
`Grand Total [ {row_count} ] :`. With `xlsx` / `csv` the levels are dropped and every row carries the band values.

| key | label | type | data_class | total / subtotal rule | PDF / XLSX |
|---|---|---|---|---|---|
| `office_id`, `carrier_id`, `category` | - | id / enum, hidden | aggregate | group keys | - |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` | - |
| `claim_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys | - |
| `office_name` | Office | text | aggregate | none | XLSX col 1 |
| `carrier_name` | Carrier Name | text | aggregate | none | band / XLSX col 2 |
| `carrier_phone` | Carrier Phone | text | aggregate | none | band / XLSX col 3 |
| `provider_name` | Provider | text | aggregate | none | band when grouped / XLSX col 4 |
| `patient_name` | Patient | text | phi_identified | key column; `count` | PDF `Patient Name / DOB` line 1 / XLSX col 5 |
| `patient_ref` | Pat ID | text | phi_identified | none | XLSX col 6 |
| `patient_dob` | Pat DOB | date | phi_identified | none | PDF line 2 / XLSX col 7 |
| `subscriber_name` | Subscriber | text | phi_identified | none | PDF `Subscriber Name / DOB` line 1 / XLSX col 8 |
| `subscriber_dob` | Sub DOB | date | phi_sensitive | none | PDF line 2 / XLSX col 9 |
| `sub_member_id` | Sub ID | text | phi_sensitive | none | PDF `Sub ID:` sub-line / XLSX col 10 |
| `group_number` | Group # | text | phi_sensitive | none | PDF `Group:` sub-line / XLSX col 11 |
| `service_from` | DOS | date | phi_identified | none | PDF `Claim Sent / DOS` line 2 / XLSX col 12 |
| `claim_sent_date` | Claim Sent | date (`age_date_sent`) | phi_identified | none | PDF line 1 / XLSX col 13 |
| `chart_no` | Chart # | text | phi_identified | none | PDF only |
| `claim_number` | Claim # | text, drill `claim_record` | phi_identified | none | both, XLSX col 14 |
| `tier_letter` | Ty | text | aggregate | none | PDF only (`P`, `S`, `T`) |
| `ucr_amount` | UCR | money | financial_patient | sum of `ucr_amount_once` | both, XLSX col 15 |
| `claim_amount` | Claim $ | money | financial_patient | sum of `billed_amount_once` | both, XLSX col 16 |
| `est_ins` | Est. Ins | money | financial_patient | sum | both, XLSX col 17 |
| `recv_amt` | Recv Amt | money | financial_patient | sum | XLSX col 18 (screen `default_visible: false`) |
| `aged_current` | Curr | money | financial_patient | sum | both, XLSX col 19 |
| `aged_over_30` | Over30 | money | financial_patient | sum | both, XLSX col 20 |
| `aged_over_60` | Over 60 | money | financial_patient | sum | both, XLSX col 21 (`Over60`) |
| `aged_over_90` | Over 90 | money | financial_patient | sum | both, XLSX col 22 (`Over90`) |
| `aged_over_120` | Over 120 | money | financial_patient | sum | both, XLSX col 23 (`Over120`) |
| `aged_total` | Total | money | financial_patient | sum (= sum of the five buckets) | both, XLSX col 24 |
| `claim_note` | Claim Note | text | phi_identified | none (free text) | XLSX col 25 |
| `created_by` | Created By | text | aggregate | none | PDF sub-line at the right |
| `quality_flag` | Unconfirmed / Est. basis | enum | aggregate | count | screen and XLSX when flagged rows exist |

Bucket rule: each claim's aged amount (`est_ins`, or `outstanding_amount` with `aged_amount_basis = remaining`) is put in
exactly one bucket column by age; the other four are 0.00. Sort: `sort_by` inside the carrier band; tie-breaker
`claim_id`. Page break: office band; `page_break_by = group`. Summary cards: `Outstanding` (grand `aged_total`), `Claims`
(count), `Over 90 %` (`(aged_over_90 + aged_over_120) / aged_total`), `Oldest (days)`. `reconciles_with`: count =
`outstanding_claims_count`; `Over 90 %` = `claims_over_90_pct`; grand `aged_total` with `aged_amount_basis = remaining`
= `outstanding_claims_amount` (all tiers, default criteria, report date today) - with the default `estimate` basis the
two are equal only when no listed claim carries a payment (open question 1). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked horizontal bars: `aged_total` per carrier (top 10, rest as `Other`), segments by bucket |
| Carrier bar or carrier subtotal | `kind rows` filtered to the carrier |
| Bucket cell of a subtotal | `kind rows` filtered to the carrier and bucket |
| `Claim #` | `claim_record` (`route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only`) |
| `Patient` | patient shell (`route_key patient_overview`), `phi_identified` |
| Carrier band label | `kind report` `dashboards.insurance_rcm` filtered to the carrier (carrier scorecard: days to pay, denial rate) |
| Summary card `Outstanding` | `kind report` `worklists.outstanding_claims` with the same `office_scope`, `carrier_ids`, `claim_kind` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| CREATE TASK (`create_tasks`, legacy footer button) | bulk (`all` or selection) | `create_task` | task feature right (RPT-INS-07) | P2 (pulled from P3, family question 6) |
| Open claim (resubmit, close, mark denied there) | row | drill `claim_record` | claim screen right | P2 |
| Claim status history | row | `navigate` `GET /insurance-claims/{claim_id}/status-history` view in the claim screen | claim screen right | P2 |
| Log carrier contact | row | `custom:log_outcome` (06 section 6.7) | `worklists_followup_manage` | P3 (DASH-28) |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: yes for printing and task creation; the live queue is `worklists.outstanding_claims` (06 section
6.7, DASH-35).

### Export and print

| Output | Rule |
|---|---|
| PDF | Report-specific layout key `outstanding_claims` on the banded renderer: landscape, two-line stacked cells (`Claim Sent / DOS`, `Patient Name / DOB`, `Subscriber Name / DOB`), sub-lines `Group:`, `Sub ID:`, `Created By:` (NEW renderer feature `sub_lines`, owner 02), category, carrier and provider bands, footer echo with the age basis `Aged from: Date Sent` |
| XLSX | One sheet, the legacy 25 columns in legacy order with typed cells (dates as dates, money as numbers), frozen header, autofilter; organisation, user and title on the criteria sheet; no grand-total row in the data sheet (totals on the criteria sheet) |
| CSV | The same 25 columns |
| Background | `escalate_when` all offices or more than 5 offices (header); a month-end schedule preset (header) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | On a partially paid claim, does `Total` / the buckets carry `Est. Ins` or the remaining estimate (`Est. Ins - Recv Amt`)? The sample shows only unpaid claims | `Est. Ins` (documented sample); `aged_amount_basis = remaining` as the enhancement; the header acceptance of RPT-INS-02 ("grand total equals `outstanding_claims_amount`" and "buckets sum to Total = Est. Ins") holds together only for unpaid claims |
| 2 | Age basis: date sent or date of service? | Date sent |
| 3 | Does a past Report Date reconstruct the list as of that day or only shift the ageing? | Reconstruct (DATA-31); refused until then |
| 4 | Are carrier and grand totals printed? Is there a `Medical Claims` band? | Both printed; band per category |
| 5 | Position of the provider level with GROUP BY Provider (outside or inside the carrier band) | Outside |
| 6 | Printed title for `Pre-Authorization` | `Outstanding Pre-Authorizations` |
| 7 | Do unticked buckets drop their columns or only their claims? | Only their claims |
| 8 | Is a sent claim with no sent date (`age_date_sent` NULL) listed, and in which bucket? | Listed in `Current`, flagged |

## Claims Not Created - `insurance.claims_not_created`

Insurance Reports, screenshot 9.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive (background with `date_basis = all`) - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff, front office | End of day, for today's date of service; or once per day of service at the end of the week (vendor cadence `[D]` `[R11]` `[R12]` `[R21]`) | Find posted procedures that should be on a claim but are not, per coverage tier, so the claims get created and sent the same day |
| Billing lead | Weekly, `ALL` | Standing check that no procedure stays unbilled, including held procedures and secondary claims that were never created after the primary closed |

Funnel position: after Unbilled Report Due to No Insurance and Procedures on Hold, before Claims Created Not Sent
(research section 1 item 2). Held procedures (`Hold Claim` ticked) appear here too `[D]` `[R11]`.

### Legacy output

Confidence: purpose, cadence and the held-procedure rule **PARTIALLY DOCUMENTED**; layout **INFERRED** (basis: Open
Dental `Procedures Not Billed to Insurance` `[X2]`, Dentrix `Procedures Not Attached to Insurance` and `Secondary Ins
Claims Not Created` `[X14]`).

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `Claims Not Created` (menu name; not seen) | header page furniture |
| Office band | `Office : <name>` | family furniture |
| Coverage band | `Primary` / `Secondary` / `Tertiary` / `Quaternary` (one per ticked CLAIM TYPE box) | the CLAIM TYPE ticks fold the tier cases into one report `[C]` `[I]` |
| Columns, in order | `Patient` - `Chart #` - `DOS` - `Tran Date` - `Code` - `Description` - `Th` - `Surf` - `Provider` - `Fee` - `Est. Ins` - `Bill` - `Ty` - `Carrier` | research reconstruction |
| Subtotals | Per coverage band: count, `Fee`, `Est. Ins` | proposal |
| Grand total | Count, `Fee`, `Est. Ins` | proposal |
| Footer echo | `Report Date : ALL` or `DOS Date : <date>` / `Transaction Date : <date>`, `Offices`, `Claim Type : Primary, Secondary, Tertiary, Quaternary`, title, `Printed`, `Page` | family furniture |

`Bill` prints the legacy billing value: `D` (one plan), `DD` (primary and secondary), `DDD`, red `H` when held `[D]`
`[R2]` `[R11]`. Money positive. Rule kept from the legacy tool: a secondary line exists only when the procedure carries
`DD` and the primary claim is closed `[D]` `[R19]`, so one procedure appears in at most one band (the primary band needs
no primary claim, the secondary band needs a closed one).

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r09 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Office of service `rpt_unclaimed_charge_tiers.office_id` in the resolved set; band per office |
| REPORT DATE radio `ALL` (default) | No date predicate: every unclaimed billable procedure; `report_date` greyed (`enabled_when date_basis != all`) and ignored |
| REPORT DATE radio `DOS Date` | `service_date = report_date` (single day) |
| REPORT DATE radio `Transaction Date` | `transaction_date = report_date` (single day); equals `service_date` until DATA-13, so both options select the same rows and the notice `transaction_date_equals_service_date` is printed (SCHEMA(13)) |
| Report Date (today, greyed under ALL) | The single day, office-local; enabled under DOS Date / Transaction Date |
| CLAIM TYPE `Primary` (ticked) | Tier `primary` lines: billable charge (`bill_tier <> 'none'`) of a patient with a primary dental slot today and no primary claim (`NOT has_claim`) |
| CLAIM TYPE `Secondary` (ticked) | Tier `secondary` lines: additionally `is_primary_closed` and `bill_tier IN ('secondary', 'tertiary')` |
| CLAIM TYPE `Tertiary` (ticked) | Tier `tertiary` lines: additionally `is_primary_closed` and `bill_tier = 'tertiary'` (proposal: the secondary claim closed is not required, data card rule names only the primary) |
| CLAIM TYPE `Quaternary` (ticked) | No quaternary slot exists in DentC: adds no rows, no error (kept for parity) |
| CLAIM TYPE all four ticked (default) | Full selection = `no_predicate` on the tier (filter card 2.5); at least one box required |
| Population rule (no control) | `rpt_unclaimed_charge_tiers WHERE NOT has_claim` (`is_production`, `bill_tier <> 'none'`, dental slots); held procedures included (`hold_claim`, Bill `H`); live charges only |

Dependency rules: `report_date` `enabled_when ["ne", "date_basis", "all"]` (inferred from the greyed capture),
`disabled_value today`.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_preset` for `report_date` with a range mode | NEW `date_range` `unclaimed_service_range` (`unclaimed_service_range_from` / `_to`, owner 04), `visible_when date_basis != all` | absent (single day) | A week of service days in one run instead of one run per day (vendor end-of-week routine) | The single-day legacy form stays the default |
| `service_date_floor` | NEW `date` (owner 04) | none | With `ALL`: ignores procedures served before the date (e.g. the go-live date) | Keeps the `ALL` run to actionable work |
| `provider_ids` | `entity_multi` (shared 3.2), `provider_role = treating` | `all` | `rpt_charges.provider_id IN (...)` | - |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the slot of the tier line | - |
| `include_held` | NEW `boolean` (owner 04) | `true` (legacy) | `false` drops held procedures (they are on Procedures on Hold) | - |
| `group_by` | `enum` (shared 3.9) `none` / `provider` / `carrier` / NEW `patient` | `none` | Level inside the coverage band with subtotals | One claim per patient and visit is how claims are made |
| `sort_by` | `enum` (shared 3.9) | `patient_last_name` | `patient_last_name`, `service_date` (oldest first), `fee_desc` | Legacy order unknown |
| Column `days_since_service` | column, shown | - | `local_today - service_date`; red when over the carrier's timely-filing limit | Filing limit per carrier is NEW (not stored), owner 03; until then fixed 90 days, organisation setting |
| Saved view "Today's services" | saved view | - | `date_basis = service_date`, `report_date = today` | End-of-day run |
| Saved view "Secondary claims to create" | saved view | - | `coverage_orders = [secondary]` | Primary EOB posted, secondary never created |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_unclaimed_charge_tiers`, `rpt_charges` (description, tooth, surface, `era`, `created_date`), `rpt_insurance_coverage` (carrier name and phone of the tier slot), `rpt_patient_dim`, `rpt_procedure_code_dim`, `rpt_provider_dim` |
| Columns used | `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `transaction_date`, `procedure_code`, `charged_fee`, `bill_tier`, `bill_tier_source`, `hold_claim`, `tier`, `ins_plan_id`, `carrier_id`, `est_for_tier`, `has_claim`, `tier_claim_id`, `is_primary_closed`; charges: `tooth`, `surface`, `era`; code: `description` |
| Date basis | `all` / `service_date` / `transaction_date`, single day (header) |
| Office attribution | office of service |
| Provider attribution | treating provider (`rpt_charges.provider_id`) |
| Coverage rating | **APP** (coverage matrix #38): the bill tier of app charges is derived until SCHEMA(33); history needs REPAIR(10) for claim links (migrated `claim_id` is NULL until check #3 of 03 section 6) and REPAIR(12) for the `DD` / `DDD` depth; DOS vs Transaction date SCHEMA(13); coverage is today's |
| Migrated rows | until DATA-10 check #3 has run for the tenant, migrated charges carry no claim link and would all read "not created": the builder adds `era = 'app'` and prints notice `migrated_claim_links_missing`; after the check, migrated charges are included. Until DATA-12 every migrated `D...` billing order is `primary`, so no migrated charge reaches the secondary or tertiary band (notice `bill_depth_lost`) |
| Coverage today | a patient insured today but not on the service date is listed; a patient whose plan ended is not (slots have no dates, data card 2.21); notice `coverage_is_current` |
| Availability entries | `derived_bill_tier` (before DATA-33), `transaction_date_equals_service_date` (before DATA-13), `migrated_claim_links_missing`, `bill_depth_lost`, `coverage_is_current` |
| Not reproducible | what was unclaimed on a past day (no claim status or coverage history); the billing depth of migrated charges before DATA-12 |

### Output

Report format: one (`standard`). Block `unclaimed` (table, `row_id_column = row_key` = `charge_id:tier`). Levels: office
band (`multi_office`) -> coverage `{tier_label} Claims Not Created`, subtotal `Total {tier_label} [ {row_count} ] :` ->
[`group_by` level: provider (`provider_comp` key), carrier `Carrier : {carrier_name}   Ph : {carrier_phone}`, or patient
`{patient_name}`, each with subtotal]; grand total `Grand Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `tier`, `carrier_id` | - | id / enum, hidden | aggregate | group keys |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` |
| `row_key`, `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys (`group_by = patient` key, rule 7) |
| `patient_name` | Patient | text | phi_identified | key column; `count` |
| `chart_no` | Chart # | text | phi_identified | none |
| `service_date` | DOS | date | phi_identified | none |
| `transaction_date` | Tran Date | date, `default_visible: false` (shown when `date_basis = transaction_date`) | phi_identified | none |
| `procedure_code` | Code | text | phi_identified | none |
| `description` | Description | text | aggregate | none |
| `tooth`, `surface` | Th, Surf | text | phi_identified | none |
| `provider_name` | Provider | text | aggregate | none |
| `fee` | Fee | money (`charged_fee`) | financial_patient | sum |
| `est_ins` | Est. Ins | money (`est_for_tier`) | financial_patient | sum |
| `bill_value` | Bill | text (`D`, `DD`, `DDD`, `H`) | aggregate | count of `H` |
| `tier_letter` | Ty | text | aggregate | none |
| `carrier_name` | Carrier | text | aggregate | none |
| `days_since_service` | Days | integer | aggregate | `max` per band |
| `bill_tier_source` | Bill Source | enum, `default_visible: false` (`stored`, `derived`) | aggregate | count of `derived` |

Sort: `sort_by` inside the innermost level; tie-breaker `row_key`. Page break: office band; `page_break_by = group`.
Summary cards: `Unbilled (primary)` (primary band `fee`), `Procedures`, `Held`, `Oldest (days)`. `reconciles_with`:
primary-band `fee` total = `unbilled_production_amount` (header, MET-11) for `date_basis = all` and `service_date` runs.
Because a charge appears in at most one band, the grand `Fee` total is not double-counted. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `fee` by `days_since_service` band (`0-1`, `2-7`, `8-30`, `31-90`, `over 90`), stacked by tier |
| Age bar | `kind rows` filtered to the band |
| Row | `kind record`, entity charge, `route_key patient_ledger` (charge highlighted), `right_code transactions_patient_ledger_screen_full_control` |
| `Patient` | patient shell (`route_key patient_overview`), `phi_identified` |
| `Bill` = `H` | `kind report` `insurance.procedures_on_hold` with the same `office_scope` (funnel link) |
| Footer link "Next stage" | `kind report` `insurance.claims_created_not_sent` with the same `office_scope` (header funnel links) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open ledger (create the claim there) | row | drill `patient_ledger` | ledger screen right | P2 |
| Create claim for the patient's lines of the day | row and bulk | `custom:create_claim` -> claim creation of the billing service with the snapshot's charge ids of one patient, tier and service date | claim screen full-control right | P3 (ENG-49) |
| Release hold | bulk | `custom:release_hold` (RPT-INS-19) | transaction-entry right | P3 |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: the live queue is stage `not_created` of `worklists.unbilled_procedures` (06); the report stays the
end-of-day printout.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (14 columns), office, coverage and optional group bands, `Bill = H` printed red, footer echo as Legacy output |
| XLSX | Sheet `unclaimed`: flat typed rows with `Office`, `Office Name`, `Coverage`, `Carrier Phone`, `Bill Source`; criteria sheet |
| CSV | Main block |
| Background | `escalate_when date_basis = all` (header); single-day runs inline |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, grouping, totals and printed title (no vendor source) | Proposal of Legacy output |
| 2 | Under `ALL`, is there an implicit age cut-off (e.g. only the last year)? | None (enhancement `service_date_floor`) |
| 3 | Tertiary line rule: is the secondary claim's closure also required? | Primary closed only |
| 4 | Are non-dental (medical) claims considered? | Dental slots only (data card view) |
| 5 | Are procedures with a zero fee or a non-billable code listed? | `is_production` charges only, zero fee included |
| 6 | Are DOS Date and Transaction Date single days in the legacy tool, or ranges ending on the date? | Single day (supplement correction, single-day use documented) |

<!-- WORK-ITEMS -->
| RPT-INS-40 | DPS Eligibility Report definition: appointment x slot grain, `date_range_type` with the two ranges (AND for `both`), `include_patients_with_no_insurance`, current-stamp status columns, date bands with distinct-appointment counts, `status_summary` block, eligibility-state enhancement and saved views | P2 | M | RPT-INS-06, DATA-16, DATA-21, ENG-11, ENG-23, ENG-27, FLT-04 | Default run lists today's live appointments of insured patients in the working office, one row per slot; `appointment_created_date` alone never returns a migrated appointment; a two-slot appointment counts once in the subtotal; with the worklist's window and `coverage_orders = [primary]` the verified share equals `eligibility_verified_pct` on the fixture |
| RPT-INS-41 | Verification request capture for DentC (the DPS request): "Request verification" action on the appointment window and in the report writing `eligibility_verifications` (`method = 'service'`, `status = 'requested'`, `verify_type`, `is_on_hold`, `tier`, `subscriber_id`); answer entry closes the request; report columns Verify Type, On Hold, Request and the `eligibility_on_hold` / `request_states` filters read it (handed to 03 and the insurance feature) | P2 | M | DATA-34, RPT-INS-40, ENG-49 | A request made on an appointment appears as `Requested` with its verify type; ticking On Hold on the report lists exactly the held requests; answering the request moves it to `Answered` and updates the subscriber stamp; before any row exists On Hold returns zero rows with `needs_eligibility_history` |
| RPT-INS-42 | DPS Eligibility actions: update status (`custom:verify_eligibility`), bulk "request updated insurance" text / e-mail with consent exclusions, drill to `worklists.eligibility_verification` | P3 | S | RPT-INS-40, ENG-49, DASH-31 | Updating a row's status writes one verification and the row shows the new status on the next run; opted-out patients are counted and skipped; the drill opens the worklist with the same offices and window |
| RPT-INS-43 | Capitation Payment definition: `capitation_payments` population on `payment_date`, carrier band with count and grand total, `payment_instrument` columns, `include_voided`, `group_by = carrier_month`, reconciliation with the `cap` legs of `rpt_payments` | P2 | M | RPT-INS-04, DATA-38, ENG-11, ENG-23, ENG-27 | A payment entered once appears once with carrier subtotal and grand total; a voided payment is absent unless `include_voided`, and then excluded from totals; the grand total equals `-sum(amount)` of `rpt_payments` `txn_class = 'capitation_payment'` for the same offices and dates |
| RPT-INS-44 | Capitation payment entry screen (legacy `Transactions > Capitation Payment`): carrier with capitation fee schedule, payment and adjustment code, date, amount, check / bank / EOB numbers, notes, void with reason; writes `capitation_payments` through the DATA-38 writer (handed to the transactions feature) | P2 | M | DATA-38, DATA-03 | Saving a payment writes one row and two ledger legs that net to zero; the payment shows in Collection Report under tender `capitation` and on Capitation Payment; void keeps the row with `is_void` and removes it from both |
| RPT-INS-45 | Capitation Payment utilisation comparison: `include_utilization_comparison` subtotal columns `Value of Services` and `Paid / Value`, drill to Capitation Utilization Summary, NEW metric `capitation_payments_amount` proposed to 05 | P3 | S | RPT-INS-43, RPT-INS-12, RPT-INS-13, RPT-INS-14 | `Value of Services` per carrier equals the Office Default carrier total of `insurance.capitation_utilization` for the same offices and dates; `Paid / Value` equals `capitation_utilization_pct` when member co-pays are zero on the fixture |
| RPT-INS-46 | Benefits Used/Unused Treatment Plan mode: pending-item population per patient and plan id, next-rollover anniversary filter, eight benefit columns from `rpt_benefit_usage()` with stored family snapshots and `slot_written_on`, unlimited flag, home-office attribution, `exclude_resp_party_type_codes`, block layout and flat XLSX | P2 | L | RPT-INS-05, DATA-32, DATA-53, DATA-56, ENG-11, ENG-23, ENG-27 | Default range resolves to the first day of next month through one year later minus a day; a slot rolling over this month is not listed; `Ind Max Rem` equals `rpt_benefit_usage().max_remaining_effective`; a `99999` plan is flagged and excluded from the remaining total; an account of an excluded type drops all its patients, an account without a type is kept |
| RPT-INS-47 | Benefits Used/Unused Recall mode: `rpt_recall_due()` population, `recall_date`, `max_over`, `recall_procedure_codes` visible only in Recall mode, `recall_benefits` block, title `... - Recall`, live capture of the Recall screen state (FLT-23) | P3 | M | RPT-INS-46, DATA-41, FLT-23 | Recall mode lists only patients with a due recall in the recall range and a rollover in the anniversary range; `max_over = 100.00` drops patients whose remaining maximum is 100.00 or less on every line; before P3 the option shows `recall_mode_p3` and runs empty |
| RPT-INS-48 | Benefits Used/Unused enhancements and outreach: `benefits_remaining_min`, `acceptance_state`, `has_future_appointment`, `sort_by`, anniversary-month chart, schedule hand-off, proposal print, bulk benefit-reminder text / e-mail / letters, follow-up tasks | P3 | M | RPT-INS-46, ENG-49, DASH-28, DASH-31 | With `has_future_appointment = no` a patient with any live future appointment is absent; the schedule hand-off opens the Scheduler with the block's pending items preselected; a bulk message skips and counts opted-out patients; untouched defaults reproduce RPT-INS-46 output |
| RPT-INS-49 | Outstanding Claims report specifics: category and carrier bands with phone, stacked PDF cells and `Group:` / `Sub ID:` / `Created By:` sub-lines (NEW renderer `sub_lines`), legacy 25-column flat XLSX / CSV, pre-authorisation title, family-once `Claim $` / `UCR` totals, age-bucket predicate independent of amount, quality notices | P2 | M | RPT-INS-02, DATA-21, DATA-32, ENG-23, ENG-27 | PDF of the fixture matches the 2023 column order; XLSX has exactly the 25 legacy columns in order with typed cells; a 0.00-estimate claim of a ticked bucket is listed with zeros; unticking `Over 120` removes only those claims; a primary + secondary family adds `Claim $` once |
| RPT-INS-50 | Outstanding Claims for a past Report Date: switch the builder to `rpt_claim_facts_as_of()`, `status_basis` notice before DATA-25 capture, 422 `as_of_unavailable` until the function exists | P2 | S | RPT-INS-49, DATA-31, DATA-25 | A claim paid yesterday is listed for a report date of two days ago with the remittance of that date excluded from `Recv Amt`; before DATA-31 a past date is refused with the code and notice; a date before history capture prints `claim_status_current_basis` |
| RPT-INS-51 | Outstanding Claims enhancements: `aged_amount_basis`, `include_unconfirmed_claims`, `coverage_orders`, `sort_by`, optional columns (days, last payment, submissions, channel, last follow-up), carrier aging chart, drills to the worklist and the insurance dashboard | P2 | S | RPT-INS-49, MET-11, DASH-14 | With `aged_amount_basis = remaining` the grand Total equals `outstanding_claims_amount`; count equals `outstanding_claims_count`; `Over 90 %` equals `claims_over_90_pct`; unconfirmed migrated claims appear only with the flag on and never in totals |
| RPT-INS-52 | Claims Not Created definition: `rpt_unclaimed_charge_tiers` population per ticked tier (secondary and tertiary depth and primary-closed rules, quaternary empty), `date_basis` radio with single `report_date`, coverage bands with subtotals, `Bill` value with `H`, `era = 'app'` guard until DATA-10 check #3, availability notices | P2 | M | RPT-INS-03, DATA-21, DATA-10, DATA-12, DATA-13, DATA-33, ENG-11, ENG-23, ENG-27 | A held unclaimed procedure appears with `Bill = H`; a charge whose primary claim exists but is open is in no band; after the primary closes a `DD` charge appears in the secondary band only; primary-band Fee equals `unbilled_production_amount`; Transaction Date and DOS Date return the same rows with the SCHEMA(13) notice before DATA-13 |
| RPT-INS-53 | Claims Not Created enhancements: `unclaimed_service_range`, `service_date_floor`, `provider_ids`, `carrier_ids`, `include_held`, `group_by` (provider / carrier / patient), `days_since_service` with the organisation filing-limit setting, saved views | P2 | S | RPT-INS-52, FLT-02, ENG-28 | A Monday-Friday range returns the union of the five single-day runs; `include_held = false` removes exactly the rows listed on Procedures on Hold; untouched defaults reproduce RPT-INS-52 output |
| RPT-INS-54 | Create claim from Claims Not Created: bulk `custom:create_claim` grouping the snapshot's charge ids by patient, tier and service date, through the billing service (no client-sent ids) | P3 | M | RPT-INS-52, ENG-49 | Selecting three lines of one patient and day creates one claim with three lines; rerunning the action for the same run creates nothing; a charge claimed since the snapshot is skipped and reported |
<!-- /WORK-ITEMS -->
