# Recall Reports - report specifications

Recall and post-treatment follow-up lists: who had a procedure completed (Procedural Recall, Post-Op), whose recall is
already booked (Scheduled Recall) and who is due or overdue and not yet booked (Recall Due). Hub home: Clinical › Recall,
route `/reports/c/recall` (brief section 1, 07 section 2). Default phase P3; all four reports ship in P3 (Recall Due and
Scheduled Recall with `rpt_recall_due()`, DATA-41).

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `recall.procedural_recall_report` | Procedural Recall Report | Patients with chosen procedure codes completed in a date range, by transaction provider and code, with phones and medical alerts | P3 | M | READY (`Med. Alerts`: `rpt_patient_alerts`, DATA-52) | DOCUMENTED (sample c. 2019) |
| `recall.scheduled_recall_report` | Scheduled Recall Report | Recall codes already booked on a future appointment in a scheduled-date range, per patient, with date, time and provider | P3 | M | READY (derived recall; exact scheduling needs booked lines, app era in practice: migrated bookings via interim rule until RPT-RECALL-09; maintained rows SCHEMA(41)) | DOCUMENTED (sample 2026) |
| `recall.recall_due_report` | Recall Due Report | Recall codes due in a due-date range (or without a due date), scheduled / not scheduled, per patient - the recall call list | P3 | L | READY (derived; interval units to verify, data card section 6 #22; migrated bookings via interim rule until RPT-RECALL-09; maintained rows SCHEMA(41)) | DOCUMENTED (sample 2022; totals not seen) |
| `recall.post_op_report` | Post-Op Report | Patients with procedures flagged Post-Op completed in a date range, by transaction provider, for follow-up calls | P3 | S | READY (empty until the office flags its post-op codes: `procedure_codes.is_post_op` is false on every code; setup, not schema) | DOCUMENTED (sample 2020) |

Size covers the definition, its builder, tests and the layout checklist, not the shared data work (DATA-41, DATA-52).

## Shared rules

### Two populations

| Population | Reports | Grain | Source |
|---|---|---|---|
| Completed procedures | r01 Procedural Recall, r04 Post-Op | one posted charge line (`rpt_charges`) | live charges, both eras (`service_date` was migrated for every charge) |
| Recall items | r02 Scheduled Recall, r03 Recall Due | (patient, recall code), printed as a patient line plus one `Code :` line per code | `rpt_recall_due(p_tenant_id, p_as_of, p_office_ids, p_include_no_recall)` (data card 2.24): maintained `patient_recalls` rows (app era, 0 migrated) merged with rows derived from procedure history and `rpt_procedure_code_dim.recall_interval_span` |

Legacy rules kept on both recall-item reports (research section 5, supplement corrections): a recall is evaluated per
code (two of three codes booked = the patient still lists for the third); a recall counts as scheduled only when a live
future appointment carries **that code** on a booked line (`scheduled_basis = 'exact'`, `is_scheduled`); another future
appointment does not make it scheduled (`has_any_future_appointment` is offered only as an enhancement column). The
function's `scheduled_date`, `scheduled_time`, `scheduled_provider_id` and `scheduled_appointment_id` are
`coalesce(exact, any)` (03 section 2.24), so both reports declare them as masked expressions
(`CASE WHEN scheduled_basis = 'exact' THEN scheduled_date END`, the same for the other three); counts and drills read
the masked columns, never the raw ones. The
hand-typed `patient_recalls.scheduled_date` is never printed. Stale-code quirk kept by default: a patient who moved from
D1120 to D1110 has two rows; the code-family enhancement (`collapse_code_family`) is opt-in.

### Shared parameters and defaults (from the parity file; sections do not repeat them)

| Parameter | Type | Reports | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 4 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | all 4 | `working_office` (legacy `108` = working office) | Office -> `office_ids`, Office Group -> `office_group_id` (legacy default of the group picker `ALL`). Attribution: office of service `rpt_charges.office_id` (r01, r04); patient home office `rpt_recall_due().office_id` = `patients.home_office_id` (r02, r03) |
| `date_range` (`date_from`, `date_to`) | `date_range` | all 4 | `today` / `today` | Fixed basis per report, no `date_basis` parameter: `service_date` (r01, r04: completion date `Proc. Date`), `scheduled_date` (r02), `recall_due_date` (r03, enabled only while `recall_date_mode = recall_date_range`) |
| `exclude_patient_type_codes` | `entity_multi` | all 4 | `none` | Exclude, `lookup:definitions:patient_type`; patients without a type kept; source row `no_type_defined` drops untyped patients. Footer echo `Exclude Pat Type` |
| `transaction_provider_ids` | `entity_multi` | r01, r04 | `all` | `provider_role = treating`: `rpt_charges.provider_id`; also the first group level |
| `preferred_provider_ids`, `preferred_hygienist_ids` | `entity_multi` | r02, r03 | `all` One patient-level value on every code line: `preferred_provider_id` = `coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id)` (data card 5.2), flagged `preferred_provider_source` (`patient` / `derived`; deviation from filter card 3.2, which has no fallback: request to 04 and, for the 2.24 per-code fallback, to 03 in RPT-RECALL-02) / `preferred_hygienist_id` = `rpt_patient_dim.preferred_hygienist_id` (no fallback, not migrated; availability `preferred_hygienist_not_migrated`) |
| `procedure_codes` | `entity_multi` | r01 | `all` | Any procedure code (override of the shared `recall_procedure_codes`; legacy label RECALL PROCEDURE CODES kept) |
| `recall_procedure_codes` | `entity_multi` | r02, r03 | `all` | Codes with a recall interval or a maintained recall row; `all` = every recall code |
| `age` (`age_range_enabled`, `age_from`, `age_to`) | `number_range` | r01, r02, r03 | gate on, `0` - `999` | `age_from` / `age_to` enabled when `age_range_enabled == true` (inferred, filter card 9.6); 0 / 999 are open bounds; a narrowed bound drops patients without `dob`. Age in whole years at the run's reference date (office-local today) |
| `include_inactive_patients` | `boolean` | all 4 | `false` | `false` = `patient_is_active` only and the footer prints `* Excludes Inactive Patients`; `true` drops the predicate and the note |
| `recall_date_mode` | `enum` | r03 | `recall_date_range` | `no_recall_date` = `due_date IS NULL` (with `p_include_no_recall = true`) and disables the dates |
| `scheduled_status` | `enum` | r03 | `all` | `scheduled` / `not_scheduled` on `is_scheduled` |

Footer actions on every report: CLEAR CRITERIA -> reset to defaults (frontend), PRINT / PREVIEW -> `print`, ADD TO MY
FAVORITES -> `saved_view` (favorite saved view; label UPDATE MY FAVORITES once one exists, rule `recall_reports.r01.d02`).
Office / Office Group picker rule `recall_reports.r01.d01` applies to all four screens.

### Hidden population rule: Send to Collection

The legacy tool drops accounts flagged Send to Collection from the recall reports without a control (research section
5; confirmed for Procedural Recall, stated for all four - to confirm on r02-r04). DentC declares the shared parameter
`exclude_sent_to_collection` (`boolean`, filter card 3.4) with default **`true`** on all four reports (legacy behaviour),
rendered under OTHER OPTIONS as an enhancement so the rule is visible, echoed and part of the cache key. Predicate:
`NOT coalesce(rpt_account_dim.send_collections, false)` on the patient's current account (r01, r04) or
`NOT account_send_collections` (r02, r03). Unticking it is the only deviation from the legacy population.

### Date bases, attribution, scope

| Topic | Rule |
|---|---|
| Date basis | All bases are office-local `DATE` columns, inclusive both ends (AD-9). `service_date` = `rpt_charges.service_date` (`DOSDATE`, else `TRANDATE` on migrated rows); `scheduled_date` = `rpt_recall_due().scheduled_date` with `scheduled_basis = 'exact'`; `recall_due_date` = `rpt_recall_due().due_date`. `p_as_of` = the office-local today of the run (`rpt_office_dim.local_today`; a multi-office run uses each office's own today, grouped by time zone) |
| Office | r01, r04: office of service (data card 5.1). r02, r03: patient home office, because the recall belongs to the patient and the function scopes by `p_office_ids` on `home_office_id`. Home office is a badge elsewhere; on these two reports it is the legacy `Office :` band [I: the legacy band office is not documented]. NULL office = "Unassigned office" (5.1 rule 3) |
| Provider | `scope.provider_attribution`: `treating` (r01, r04), `preferred` (r02, r03). `scope.provider_restriction = none` (not My Reports, PD-11). Printed `Prdr` on code lines = `scheduled_provider_id` (the appointment provider of the booked appointment) |
| Account | `rpt_patient_dim.account_id` (current account, data card 5.3) for the Send-to-Collection test |
| Freshness | `live` (views and functions over OLTP tables) |
| Migrated history | r01 and r04: complete for charges that were migrated (data card 2.9: 87,585 skipped source charges are missing until DATA-57; the run prints the completeness caveat `charges_incomplete_migrated`); archived legacy charges (`is_archived`, loaded from `Ledger_archive.txt`) are included only when `rpt_tenant_flags.include_legacy_archive` is set (data card live filter), so an old date range misses archived procedures the legacy tool printed, and `First Visit` (r01, r02, r03) can be later than in legacy for long-standing patients (data card 2.19). r02, r03: every migrated recall is `derived` (no recall rows were migrated); booked lines exist for 6 % of migrated appointments, so the pre-booked legacy recall schedule is missing until the backfill RPT-RECALL-09 lands (interim rule below). `availability[]` entries: `recall_derived_from_history`, `recall_interval_units_unverified` (until check #22 passes), `preferred_provider_not_migrated`, `preferred_hygienist_not_migrated`, `recall_booking_lines_missing_migrated`, `legacy_archive_excluded` (NEW: printed on r01, r04 when the archive flag is off and archived charges (`rpt_charges_all.is_archived`) exist with `service_date >= date_from`; on r01, r02, r03 also as a footnote to `First Visit`) |
| Migrated bookings (interim) | Until RPT-RECALL-09: a code line of a patient whose next live future appointment is a migrated appointment with no booked lines (`rpt_appointment_facts.era = 'migrated'` and `line_count = 0`) counts as scheduled on that appointment (`scheduled_basis = 'any'` accepted for that case only), prints its date, time and provider with the marker `*` and the entry `recall_booking_lines_missing_migrated`. App-era appointments keep the exact-code rule. Without the interim rule the default Recall Due working list would ask staff to call patients already booked in the legacy tool |

### Page furniture

Legacy (research 3.1): line 1 organisation name, line 2 printed title (not the menu name: `Procedural Recall - Provider`,
`Scheduled Recall Due`, `Recall Due`, `Post-Op Report`), `Office : <office name>` band (absent on the c. 2019 and 2020
samples of r01 and r04), footer criteria echo (`Procedure Date From` / `Thru`, `Offices`, `Providers`, `Exclude Pat Type`,
`* Excludes Inactive Patients`), the title again, `Printed : <date time>`, `PlanetDDS (c) 2003 - <year>`, `Page : n of m`.
DentC: `title_templates` give the legacy printed title; `pdf.criteria_echo = footer`, `repeat_header = true`, letterhead
of the working office, `fixed_outer` office level `when ["ctx", "multi_office"]` (single-office runs print one band, as
the 2022 / 2026 samples do), `xlsx.criteria_sheet = true`. The vendor footer line is replaced by the DentC product line;
`Printed :` uses office-local time (legacy prints Pacific server time - deliberately fixed).

### Rights and data classes

| Item | Rule |
|---|---|
| Right family | `recall`: `reports_recall_reports_screen_view_only` (run, view, drill, private views) / `reports_recall_reports_screen_full_control` (also print and PDF; XLSX and CSV need `reports_export_data_files` in addition). No per-report override (security card 2.3) |
| Key columns | `patient_name`, `patient_id` (`phi_identified`): a caller without `phi_identified` is refused (403 `data_class_denied`); every report of the family is a patient list |
| `phi_identified` | patient id, chart no, name, patient type codes, phones, first / last visit, procedure date, procedure code and description, recall code, due date, scheduled date and time, primary carrier name on a patient row, referral source (r04) |
| `clinical` | `med_alerts` (r01, `rpt_patient_alerts`): not a key column, so it is dropped for a caller without the class and the row stays (02 section 3.3; security card 5.2 rule 5) |
| `financial_patient` | `amount` (r04, `rpt_charges.charged_fee`); `patient_balance`, `ind_max_remaining` (r03 enhancements). Money columns are never key columns (rule 5): a caller without the class gets the list without them |
| `aggregate` | provider short id / name and title on r01, r02, r03 (operational label, no money), the provider group key of r04 (see below), office name, counts |
| `provider_comp` | Not used by a default run. r04: the provider band stays `aggregate` because `amount` is `financial_patient`, is hidden unless the caller holds that class, and no provider money total is printed; this needs an exception to rule 3, requested from 08 (F7). Until 08 grants it, `amount` sits behind the column switch `show_amount` (`boolean`, NEW, 04 section 12; `visible_when show_amount`; default `true`, forced to `false` at validation for a caller without `financial_patient`), so the block that caller receives has no money column and rule 3 does not apply. r03: with `include_patient_balance` or `show_remaining_benefits` on, the `preferred_provider` / `preferred_hygienist` levels of `group_by` are refused (validation 422) rather than reclassified, so the band never becomes `provider_comp` |
| Drill to records | `record` targets need `phi_identified` plus the target feature right (patient chart, Scheduler, ledger) and pass `assert_patient_visible()` |

### Family-wide enhancements (on top of filter card section 12)

| Enhancement | Key / type | Reports | Detail |
|---|---|---|---|
| Send-to-Collection switch | `exclude_sent_to_collection` (`boolean`, default `true`) | all 4 | Makes the hidden legacy rule visible; default keeps the legacy population |
| Recall code presets | saved code sets from `rpt_code_groups` (`recall_default`, `prophy`, `perio_maintenance`, `exam_recare`) in the `recall_procedure_codes` / `procedure_codes` picker | r01, r02, r03 | Filter card 12 "Code picker extras" (FLT-25); the vendor advises anchor codes for Recall Due |
| Outreach bulk actions | `send_sms`, `send_email`, `postcards`, `letters`, `labels`, `create_task` (02 section 3.10) | r01, r03, r04 | Consent exclusions from `rpt_patient_dim.no_auto_sms`, `no_auto_email`, `no_correspondence`, `sms_opt_out_at`; one message per patient (deduplicated over code lines) |
| Book recall | row `navigate`, route_key `scheduler_booking` (`openSchedulerForBooking`), with the patient, the preferred hygienist and the recall code(s) of the row seeded as booked lines, so the booking satisfies the exact-code rule. The hand-off takes `patient_id` and `plan_item_ids` today (07 section 5.5): NEW request to 07 for the parameters `procedure_codes[]` and `provider_id`, seeded as booked lines (dependency of RPT-RECALL-05) | r03 (and r02: reschedule) | Never a bare navigate to `/scheduler` |
| Saved views with relative dates | e.g. Recall Due "Due next month, not scheduled" (`date_preset = next_month`, `scheduled_status = not_scheduled`); Post-Op "Yesterday" (`date_preset = yesterday`) | all 4 | Server-side views (ENG-28); schedulable (no patient-context token) |
| Dashboard and worklist links | `dashboards.hygiene_recall` tiles and `worklists.recall_due` print counterpart | r01, r02, r03 | Metric drills of 05 section 5.5 open these reports (RPT-RECALL-07) |

### Family-wide open questions

| # | Question | Where to check |
|---|---|---|
| F1 | Send-to-Collection exclusion on Scheduled Recall, Recall Due and Post-Op (documented for Procedural Recall only) | run each report on the live tool for a patient whose account is flagged |
| F2 | Which office the `Office :` band and the OFFICE/GROUP filter use on r02 / r03: patient home office (assumed) or the office of the scheduled appointment / last visit | live tool, patient with home office A booked in office B |
| F3 | Content of the SELECT dialogs (transaction / preferred provider, hygienist, recall codes, patient types): inactive rows, short id or name, whether r02's code list is limited to recallable codes | live dialogs |
| F4 | What the From / To boxes do when Age Range is unticked (greyed assumed) | live screen |
| F5 | Recall interval unit vocabulary migrated from `RECALLUNIT` (month / year, `+1 day` option of the legacy RECALLS grid) | data card section 6 #22 on the client database; one patient compared on the live tool |
| F6 | Excel output layout of all four reports (none seen) | export once on the live tool |
| F7 | Request to 08: exception to security card 5.2 rule 3 for a provider label on a per-patient list whose only money is `financial_patient` and which prints no provider money total (Post-Op band). Buildable default meanwhile: band `aggregate`, `amount` behind `show_amount` (rights table above) | 08_security_compliance.md owner |
| F8 | Can the legacy preferred provider / hygienist and the booked lines of migrated future appointments be backfilled from the source data (NEW requests to 03: preferred provider / hygienist columns; RPT-RECALL-09 for booked lines)? Until then the interim rules above apply | 03_data_foundation.md owner; source extract |

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

<!-- PARITY:recall_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROCEDURE DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = service_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PROCEDURE DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = service_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| TRANSACTION PROVIDER | (no label) (picker) | shown: ALL | `transaction_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| RECALL PROCEDURE CODES | (no label) (picker) | shown: ALL | `procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Override of the shared mapping (recall_procedure_codes). On this report the legacy picker is NOT limited to recallable codes: any procedure code can be chosen (vendor documentation, confirmed), and ALL = every completed procedure code. That is the shared parameter procedure_codes (option source procedure_codes, include, all = no predicate) with the legacy label RECALL PROCEDURE CODES kept as the field label. Filter: rpt_charges.procedure_code IN (:procedure_codes). Legacy SELECT dual-list dialog becomes a searchable multi-select with category tree and code ranges (filter_card 12). Confirm on the live tool whether inactive codes are listed. |
| OTHER OPTIONS | Age Range (checkbox) | **checked** | `age_range_enabled` | number_range | - | `true` | replicated | Gate of the age range: the From / To boxes apply only when ticked. |
| OTHER OPTIONS | From (number_input) | shown: 0 | `age_from` | number_range | - | `0` | replicated | Enabled when: age_range_enabled == true (inferred). Lower age bound in years, inclusive; 0 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | To (number_input) | shown: 999 | `age_to` | number_range | - | `999` | replicated | Enabled when: age_range_enabled == true (inferred). Upper age bound in years, inclusive; 999 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| OFFICE/GROUP = Office Group | The SELECT picker chooses office groups defined in setup instead of offices; with Office it chooses one or more offices. Cross-cutting statement of the document for the Appointment, Recall and Referral criteria screens - recorded once here (Procedural Recall Report); it applies to every report of this category that has the Office / Office Group radios. | office_scope: the mode radio decides which value key is set. Mode office -> office_ids (picker lists the offices the caller may read; default token working_office; my_offices and all added). Mode office_group -> office_group_id (picker lists Setup office groups; legacy default ALL = all office groups the caller may read). Exactly one key is sent; switching the mode clears the other selection. Same rule on all four recall reports (recall_reports.r02-r04 have the same radio). |
| A favorite has already been saved for the report (the legacy tool keeps one saved version per report) | The action button ADD TO MY FAVORITES reads UPDATE MY FAVORITES. Cross-cutting statement of the document for the Appointment, Recall and Referral criteria screens - recorded once here (Procedural Recall Report); it applies to every report of this category. Whether the relabel shows only when the screen is opened from My Favorites is not stated. | Legacy one-favorite-per-report is replaced by server-side saved views: ADD TO MY FAVORITES saves a view (params with tokens, definition_version) and marks it favorite; when the caller already has a favorite view of this report_key the button reads UPDATE MY FAVORITES and overwrites that view after a confirm. Further views are allowed (enhancement). Applies to all four recall reports. |
<!-- PARITY:recall_reports.r01:END -->

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
| `exclude_patients_with_any_future_appointment` | `boolean` (NEW, 04; one key for r01 and r03) | `false` | Ticked: drops patients who hold a live future appointment (`rpt_patient_activity.next_appointment_date IS NOT NULL`; on r03 the equivalent `rpt_recall_due().has_any_future_appointment`) - the follow-up list of patients not yet back on the schedule |
| `group_by` | `enum` (NEW values, 04: `provider_code` (legacy), `code_provider`; shared values `code`, `provider`) | `provider_code` | `code` gives the "patients per procedure code" count list across providers; legacy run = `provider_code` |
| `show_tooth_surface` | `boolean` (NEW, 04 section 12, column switch, `role: query`) | `false` | Adds `tooth`, `surface` columns (implant / extraction site follow-up) |
| `show_next_appointment` | `boolean` (NEW, 04 section 12, column switch, `role: query`) | `false` | Adds `next_appointment_date` |
| Saved view "Yesterday's surgery follow-up" | saved view | - | `date_preset = yesterday`, `procedure_category_codes` = oral surgery and implant categories |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_charges` (`charge_id`, `patient_id`, `account_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `surface`, `is_void`); `rpt_procedure_code_dim` (`code_category`); `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `middle_initial`, `patient_type_codes`, `phone`, `work_phone`, `cell_phone`, `dob`, `is_active`); `rpt_patient_activity` (`first_visit_date`, `next_appointment_date`); `rpt_patient_alerts` (`alert_label`, `is_active`; aggregated per patient with `string_agg` in a lateral, never joined row-wise); `rpt_account_dim` (`send_collections`); `rpt_provider_dim` (last, first, short id, title) |
| Date basis | `service_date` (fixed, `date_basis` declared on the definition) |
| Office / provider | Office of service; treating provider `rpt_charges.provider_id` (`provider_role = treating`) |
| Filters | `office_scope` -> `office_id IN`; dates -> `service_date BETWEEN`; `transaction_provider_ids` -> `provider_id IN`; `procedure_codes` -> `procedure_code IN`; `exclude_patient_type_codes` -> `NOT (patient_type_codes && :list)`; age -> computed from `dob`; `include_inactive_patients` -> `is_active`; `exclude_sent_to_collection` -> `NOT coalesce(send_collections, false)` |
| Grouping | provider -> code from the row keys (`provider_id`, `procedure_code`) |
| First Visit | `rpt_patient_activity.first_visit_date` (view over visit-code charges, both eras; depends on the DATA-04 visit-code flags and the archive policy; DATA-19 only maintains the patient column) |
| Availability | Coverage matrix: **READY**. `Med. Alerts` needs `rpt_patient_alerts` (DATA-52, P1). Charges are live rows only (`is_void` excluded) |
| Migrated history | Complete for migrated live charges; the 87,585 skipped source charges are missing until DATA-57 (caveat `charges_incomplete_migrated`); archived legacy charges are included only when `rpt_tenant_flags.include_legacy_archive` is set (availability `legacy_archive_excluded`), which also makes `First Visit` later than in legacy for long-standing patients. Medical alerts: 46,680 migrated rows, current state only (an alert added after the procedure prints too, as in the legacy tool) |

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

Doubles as a worklist: partly - with `exclude_patients_with_any_future_appointment` it is a follow-up list; no live mode.

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

<!-- PARITY:recall_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| SCHEDULED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range on the date of the booked appointment that carries the recall code, not the due date (vendor documentation). Evaluated range-aware: rpt_recall_due() is called with p_scheduled_from = date_from, p_scheduled_to = date_to (RPT-RECALL-02), so scheduled_basis = 'exact' and is_scheduled are computed against the requested range, past dates included; the printed scheduled_date is masked to CASE WHEN scheduled_basis = 'exact' THEN scheduled_date END. Fixed date_basis scheduled_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| SCHEDULED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range on the date of the booked appointment that carries the recall code, not the due date (vendor documentation). Evaluated range-aware: rpt_recall_due() is called with p_scheduled_from = date_from, p_scheduled_to = date_to (RPT-RECALL-02), so scheduled_basis = 'exact' and is_scheduled are computed against the requested range, past dates included; the printed scheduled_date is masked to CASE WHEN scheduled_basis = 'exact' THEN scheduled_date END. Fixed date_basis scheduled_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| PREFERRED PROVIDER | (no label) (picker) | shown: ALL | `preferred_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Include on the patient's preferred provider (Patient Information; printed Pref Prdr). One patient-level value, the same on every code line of the patient: coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id) (data card 5.2 attribution rule), flagged preferred_provider_source = patient / derived; the derived value prints with the marker '*'. This deviates from the shared dictionary row of preferred_provider_ids (filter card 3.2: no fallback, migrated patients match only under all) because preferred providers were not migrated; requests: 03 (RPT-RECALL-02) to change the 2.24 per-code fallback to this per-patient column, 04 to record the derived fallback in the dictionary row. all = no predicate. Legacy SELECT dialog becomes a searchable multi-select (roster-first, never scoped by providers.office_id); dialog content never captured - confirm list source and inactive rows on the live tool. |
| PREFERRED HYGIENIST | (no label) (picker) | shown: ALL | `preferred_hygienist_ids` | entity_multi | - | `all` | replicated_enhanced | Include on the patient's preferred hygienist (column Pref Hyg): rpt_patient_dim.preferred_hygienist_id (exposed as rpt_recall_due().preferred_hygienist_id). Not migrated and no fallback (shared dictionary rule): a narrowed selection matches only patients edited in the app and the run prints the availability entry preferred_hygienist_not_migrated; all = no predicate, patients without a hygienist kept. Picker lists hygienists first. Dialog content never captured - confirm list source and inactive rows on the live tool. |
| RECALL PROCEDURE CODES | (no label) (picker) | shown: ALL | `recall_procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = every recall code (no predicate). Applied to rpt_recall_due().procedure_code. Option source procedure_codes restricted to codes with a recall interval (rpt_procedure_code_dim.recall_interval_span IS NOT NULL) or a maintained patient_recalls row. Whether the legacy list on this report is limited to recallable codes is not documented (only Recall Due states it) - confirm on the live tool, together with inactive codes. |
| OTHER OPTIONS | Age Range (checkbox) | **checked** | `age_range_enabled` | number_range | - | `true` | replicated | Gate of the age range: the From / To boxes apply only when ticked. |
| OTHER OPTIONS | From (number_input) | shown: 0 | `age_from` | number_range | - | `0` | replicated | Enabled when: age_range_enabled == true (inferred). Lower age bound in years, inclusive; 0 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | To (number_input) | shown: 999 | `age_to` | number_range | - | `999` | replicated | Enabled when: age_range_enabled == true (inferred). Upper age bound in years, inclusive; 999 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:recall_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot. Rows unchanged |
| OFFICE/GROUP `Office` (default: working office) | `office_ids` -> `p_office_ids` of `rpt_recall_due()`: patients whose home office is in the set; `Office :` band per home office |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group |
| SCHEDULED DATE RANGE Start / End (default today / today) | Code lines whose exact booked appointment date (`scheduled_date`, `scheduled_basis = 'exact'`) is in the range; not the due date |
| EXCLUDE PATIENT TYPE `None` (default) / list | As family rule: patients with a selected type dropped |
| PREFERRED PROVIDER `ALL` (default) / list | `preferred_provider_id IN (...)` on the patient-level value (patient column, else `last_visit_provider_id`); keeps or drops all code lines of a patient together |
| PREFERRED HYGIENIST `ALL` (default) / list | `preferred_hygienist_id IN (...)`; NULL hygienists match only `ALL` (migrated patients: `preferred_hygienist_not_migrated`) |
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
| `show_overdue_at_booking` | `boolean` (NEW, 04 section 12, column switch, `role: query`) | `false` | Adds `days_booked_after_due` = masked `scheduled_date - due_date` (positive = booked late) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_recall_due()` called with `p_as_of` = office-local today, `p_office_ids` = resolved offices, `p_include_no_recall = false`, plus the scheduled-range arguments requested in RPT-RECALL-02 (`p_scheduled_from = date_from`, `p_scheduled_to = date_to`): with them, `scheduled_basis` and `is_scheduled` are computed against the requested range instead of `>= p_as_of`, so past ranges return booked lines too; `rpt_appointment_facts` (`is_confirmed`, `operatory_id`) for the enhancements; `rpt_patient_dim`, `rpt_patient_activity` (`first_visit_date`, `last_visit_date`), `rpt_provider_dim` (short ids of preferred provider, hygienist, appointment provider) |
| Date basis | `scheduled_date` (fixed) |
| Office / provider | Patient home office (`rpt_recall_due().office_id`); preferred provider / hygienist; `Prdr` = `scheduled_provider_id` |
| Qualifying rule | Patient has a code line whose booked line with that code falls in `date_from .. date_to` (`scheduled_basis = 'exact'` evaluated inside the requested range, plus the migrated-booking interim rule of the shared section); code lines printed = all lines of the patient within `recall_procedure_codes` and `recall_status <> 'inactive'` (or only the qualifying ones when `show_unscheduled_codes = false`) |
| Filters | `exclude_patient_type_codes`, age, `include_inactive_patients` (`patient_is_active`), `exclude_sent_to_collection` (`account_send_collections`), preferred provider / hygienist on the function columns |
| Availability | Coverage matrix: **READY** (derived). Exact scheduling needs booked lines: app-era appointments in practice (6 % of migrated appointments have lines). Preferred provider / hygienist are not migrated (patient-level derived provider fallback; hygienist none, `preferred_hygienist_not_migrated`). Maintained recall rows: SCHEMA(41) / DATA-41 |
| Migrated history | A recall booked on a migrated appointment without booked lines would not print under the exact-code rule; until the backfill RPT-RECALL-09 the interim rule of the shared section prints it, marked `*` (`availability` entry `recall_booking_lines_missing_migrated`); due dates of migrated patients are derived from procedure history and the code interval (units unverified until check #22) |

### Output

One block `main`, grain (patient, recall code); PDF prints the patient columns once as the patient line.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name` | Patient Name | `text` | `phi_identified` | - (patient line) |
| `patient_id` | Pat ID | `id` | `phi_identified` | count_distinct per office and grand total (enhancement line `Patients`) |
| `chart_no` | Chart # | `text` | `phi_identified` | - |
| `patient_type_codes` | Type | `text` | `phi_identified` | - |
| `preferred_provider_short_id` | Pref Prdr | `text` | `aggregate` | - (patient-level value, identical on every code line; suffix `*` when `preferred_provider_source = derived`) |
| `preferred_hygienist_short_id` | Pref Hyg | `text` | `aggregate` | - |
| `phone` | Phone# | `text` | `phi_identified` | - (home phone, else cell [I]) |
| `first_visit_date`, `last_visit_date` | First Visit, Last Visit | `date` | `phi_identified` | - |
| `procedure_code` | Code | `text` | `phi_identified` | count (label `Total Recalls for, {office_name}` / `Grand Total Recalls`) |
| `due_date` | Recall Due | `date` | `phi_identified` | - |
| `scheduled_date` | Scheduled Date | `date` | `phi_identified` | expression `CASE WHEN scheduled_basis = 'exact' THEN scheduled_date END` (interim migrated rule adds its `*` lines); count of rows with `is_scheduled AND scheduled_date BETWEEN :date_from AND :date_to` (label `Total Scheduled Recalls` / `Grand Total Scheduled Recalls`) |
| `scheduled_time` | Time | `time` | `phi_identified` | - (masked the same way) |
| `scheduled_provider_short_id` | Prdr | `text` | `aggregate` | - (short id of the masked `scheduled_provider_id`) |
| `days_booked_after_due` | Days Late | `integer` | `phi_identified` | enhancement |
| hidden: `row_id` (`patient_id:procedure_code`), `scheduled_appointment_id`, `office_id`, `preferred_provider_id`, `preferred_hygienist_id`, `scheduled_provider_id`, `source`, `patient_last_name` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office (always printed, as in the sample); level `patient` (`key_columns = [patient_id]`, header =
patient line, no subtotal). Sort: per `sort_by`, then code. Page break: `none` / `office` (layout, enhancement). Summary
cards: `Recalls` (count), `Scheduled recalls` (same rule as `Total Scheduled Recalls`), `Patients` (count_distinct). Related metric
(not a reconciliation): `hygiene_pre_appointment_pct`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Column chart of scheduled recalls per week of `scheduled_date` |
| Patient name | `record` patient -> patient overview |
| Scheduled Date | `record` appointment, masked `scheduled_appointment_id` (`CASE WHEN scheduled_basis = 'exact' THEN scheduled_appointment_id END`) -> Scheduler opened on that appointment (route_key `appointment`); no drill on a blank cell |
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
| Q6 | Row order of patients inside the office band (legacy default; `patient_last_name` assumed) |

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

<!-- PARITY:recall_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| RECALL DATE RANGE | (no label) (radio_group) | **Recall Date Range** / No Recall Date | `recall_date_mode` | enum | Recall Date Range -> `recall_date_range`, No Recall Date -> `no_recall_date` | `recall_date_range` | replicated | Recall Date Range = range on rpt_recall_due().due_date (future range = upcoming, past range = overdue; vendor documentation). No Recall Date = due_date IS NULL: app recall rows with a blank due date plus one row per patient who has no recall at all (rpt_recall_due p_include_no_recall = true, procedure_code NULL); date_from / date_to are disabled and reset to their default. The No Recall Date meaning is the vendor reading [unverified] and its state was not captured - confirm on the live tool what it lists (patients with no recall row at all, or only recall rows without a due date) and whether the dates grey out. |
| RECALL DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Enabled when: recall_date_mode == recall_date_range (inferred). Primary date range. This legacy section fixes date_basis = recall_due_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| RECALL DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Enabled when: recall_date_mode == recall_date_range (inferred). Primary date range. This legacy section fixes date_basis = recall_due_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| PREFERRED PROVIDER | (no label) (picker) | shown: ALL | `preferred_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Include on the patient's preferred provider (Patient Information; printed Pref Prdr). One patient-level value, the same on every code line of the patient: coalesce(rpt_patient_dim.preferred_provider_id, rpt_patient_activity.last_visit_provider_id) (data card 5.2 attribution rule), flagged preferred_provider_source = patient / derived; the derived value prints with the marker '*'. This deviates from the shared dictionary row of preferred_provider_ids (filter card 3.2: no fallback, migrated patients match only under all) because preferred providers were not migrated; requests: 03 (RPT-RECALL-02) to change the 2.24 per-code fallback to this per-patient column, 04 to record the derived fallback in the dictionary row. all = no predicate. Legacy SELECT dialog becomes a searchable multi-select (roster-first, never scoped by providers.office_id); dialog content never captured - confirm list source and inactive rows on the live tool. |
| PREFERRED HYGIENIST | (no label) (picker) | shown: ALL | `preferred_hygienist_ids` | entity_multi | - | `all` | replicated_enhanced | Include on the patient's preferred hygienist (column Pref Hyg): rpt_patient_dim.preferred_hygienist_id (exposed as rpt_recall_due().preferred_hygienist_id). Not migrated and no fallback (shared dictionary rule): a narrowed selection matches only patients edited in the app and the run prints the availability entry preferred_hygienist_not_migrated; all = no predicate, patients without a hygienist kept. Picker lists hygienists first. Dialog content never captured - confirm list source and inactive rows on the live tool. |
| RECALL PROCEDURE CODES | (no label) (picker) | shown: ALL | `recall_procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = every recallable code (vendor documentation, confirmed). Applied to rpt_recall_due().procedure_code. Option source procedure_codes restricted to recall codes (recall_interval_span IS NOT NULL or a maintained patient_recalls row). Vendor advice: choose anchor codes only (adult / child prophylaxis); the saved code set recall_default of rpt_code_groups is offered as a preset. Confirm inactive codes on the live tool. |
| SCHEDULED/NOT SCHEDULED | (no label) (radio_group) | **ALL** / Scheduled / Not Scheduled | `scheduled_status` | enum | ALL -> `all`, Scheduled -> `scheduled`, Not Scheduled -> `not_scheduled` | `all` | replicated | - |
| OTHER OPTIONS | Age Range (checkbox) | **checked** | `age_range_enabled` | number_range | - | `true` | replicated | Gate of the age range: the From / To boxes apply only when ticked. |
| OTHER OPTIONS | From (number_input) | shown: 0 | `age_from` | number_range | - | `0` | replicated | Enabled when: age_range_enabled == true (inferred). Lower age bound in years, inclusive; 0 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | To (number_input) | shown: 999 | `age_to` | number_range | - | `999` | replicated | Enabled when: age_range_enabled == true (inferred). Upper age bound in years, inclusive; 999 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:recall_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot. Rows unchanged |
| OFFICE/GROUP `Office` (default) / `Office Group` | `p_office_ids` of `rpt_recall_due()` = patients whose home office is in the resolved set; band per home office |
| RECALL DATE RANGE `Recall Date Range` (default) with Start / End today | Code lines with `due_date BETWEEN :date_from AND :date_to` (future range = upcoming, past range = overdue); dates enabled |
| RECALL DATE RANGE `No Recall Date` | `due_date IS NULL`: maintained recall rows without a due date plus one `none` line per patient who has no recall at all (`p_include_no_recall = true`; printed `Code : (none)`); dates disabled [unverified meaning, to confirm] |
| EXCLUDE PATIENT TYPE `None` (default) / list | Family rule |
| PREFERRED PROVIDER `ALL` (default) / list | `preferred_provider_id IN (...)` on the patient-level value (patient column, else `last_visit_provider_id`); all code lines of a patient kept or dropped together |
| PREFERRED HYGIENIST `ALL` (default) / list | `preferred_hygienist_id IN (...)`; NULL matches only `ALL` (`preferred_hygienist_not_migrated`) |
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
| `exclude_patients_with_any_future_appointment` | `boolean` (NEW, 04; same key as r01) | `false` | Drops patients who hold a live future appointment (`has_any_future_appointment`, equivalent to `rpt_patient_activity.next_appointment_date IS NOT NULL`) - removes quirk (1) for callers who want only patients with no appointment at all |
| `collapse_code_family` | `boolean` (NEW, 04) | `false` | Treats the members of one code group (`prophy` D1110 / D1120, `exam_recare` D0120 / D0145) as one recall: the latest completion of any member sets the due date and a booked line of any member schedules it - removes the stale-code quirk |
| `not_contacted_within` | `lookback_days` (06 key, 06 section 6.2; needs DASH-28) | empty | Drops patients with a logged recall outreach in the last n days |
| `include_patient_balance` | `boolean` (shared, 3.4) | `false` (no legacy control on this report; shared default `true` not used so the legacy columns stay unchanged) | Adds `patient_balance` = `SUM(rpt_ledger_entries.amount)` per `patient_id` with entry date up to the office-local today (data card 2.12). Not combinable with a provider level of `group_by` (see below) |
| `show_remaining_benefits` | `boolean` (NEW, 04) | `false` | Adds `Ind Max Rem` of the primary dental coverage (`rpt_benefit_usage()`, P2) - "benefits left this year" for the call script. Not combinable with a provider level of `group_by` |
| `group_by` | `enum`: `none` (office band only), `preferred_hygienist` (NEW, 04), `preferred_provider` (NEW, 04), `code` | `none` | Hygienist call lists with a count per band. With `include_patient_balance` or `show_remaining_benefits` on, `preferred_hygienist` / `preferred_provider` are refused at validation (a provider group key beside money would be `provider_comp`, security card 5.2 rule 3) |
| `sort_by` | `enum`: `patient_last_name`, `due_date`, `chart_no` | `patient_last_name` [I] | Order of patients inside the band |
| Saved views | saved view | - | "Overdue, not scheduled" (`date_preset` custom `-24 months` .. `yesterday`, `not_scheduled`); "Due next month" (`next_month`, `not_scheduled`) for postcards |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_recall_due(:tenant_id, :office_local_today, :office_ids, :include_no_recall)` (all columns of data card 2.24); `rpt_patient_dim` (`chart_no`, names, `patient_type_codes`, `phone`, `cell_phone`, `dob`, consent flags); `rpt_patient_activity` (`first_visit_date`, `last_visit_date`); `rpt_insurance_coverage` (primary dental slot: `carrier_name` where `tier = 'primary'`, `category = 'dental'`, one row per patient through `LATERAL ... LIMIT 1`); `rpt_provider_dim`; `rpt_benefit_usage()` for the enhancement |
| Date basis | `recall_due_date` (fixed) |
| Office / provider | Patient home office; preferred provider (patient-level, derived fallback `rpt_patient_activity.last_visit_provider_id`) and hygienist (no fallback) |
| Filters | `recall_date_mode` + dates -> `due_date BETWEEN` or `due_date IS NULL`; `scheduled_status` -> `is_scheduled`; `recall_procedure_codes` -> `procedure_code IN` (and `none` lines only under `all`); patient type, age, inactive, collection as the family rules; `recall_status <> 'inactive'` always |
| Availability | Coverage matrix: **READY** (derived). Interval units to verify (data card section 6 #22, warning `recall_interval_units_unverified`); `No Recall Date` also lists patients without any recall; maintained rows SCHEMA(41). `Carrier (Primary)`: today's coverage, migrated tiers right only after the slot repair (data card 2.21) |
| Migrated history | Every migrated recall is derived: due = last completed charge of the code + code interval. Patients whose recall lived only in the legacy RECALLS grid (manually set due dates) are not reproduced; booked lines are missing on 94 % of migrated appointments: until the backfill RPT-RECALL-09 the interim rule of the shared section counts a recall as `Scheduled` (marked `*`) when the patient's next live appointment is a migrated one without lines, so the default working list does not ask staff to call patients already booked in the legacy tool |

### Output

One block `main`, grain (patient, recall code), patient line as group header in PDF.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name_chart` | Patient Name (Chart#) | `text` | `phi_identified` | - (patient line) |
| `patient_id` | Pat ID | `id` | `phi_identified` | count_distinct per band and grand total (line `Patients`, enhancement) |
| `patient_type_codes` | Type | `text` | `phi_identified` | - |
| `primary_carrier_name` | Carrier (Primary) | `text` | `phi_identified` | - |
| `preferred_provider_short_id`, `preferred_hygienist_short_id` | Pref Prdr, Pref Hyg | `text` | `aggregate` | - (patient-level, identical on every code line; `*` = derived provider) |
| `phone` | Phone# | `text` | `phi_identified` | - (`coalesce(rpt_patient_dim.phone, cell_phone)`: home phone, else cell [I]) |
| `first_visit_date`, `last_visit_date` | First Visit, Last Visit | `date` | `phi_identified` | - |
| `procedure_code` | Code | `text` | `phi_identified` | count (`Total Recalls for, {office_name}`; `Grand Total Recalls`) |
| `due_date` | Recall Due | `date` | `phi_identified` | - (`null_display` blank) |
| `scheduled_date`, `scheduled_time` | Scheduled Date, Time | `date`, `time` | `phi_identified` | expressions `CASE WHEN scheduled_basis = 'exact' THEN scheduled_date END` / `... scheduled_time END` (plus the `*` lines of the migrated interim rule); count of rows with `is_scheduled` (`Total Scheduled Recalls`) |
| `scheduled_provider_short_id` | Prdr | `text` | `aggregate` | - (short id of the masked `scheduled_provider_id`) |
| `days_overdue` | Days Overdue | `integer` | `phi_identified` | max per band (enhancement, default hidden) |
| `recall_status` | Status | `enum` | `phi_identified` | enhancement (`overdue`, `due`, `not_due`, `scheduled`, `no_due_date`) |
| `patient_balance` | Pat Balance | `money` | `financial_patient` | enhancement (`rpt_ledger_entries`), no total |
| `ind_max_remaining` | Ind Max Rem | `money` | `financial_patient` | enhancement, no total |
| hidden: `row_id`, `office_id`, `source`, `scheduled_appointment_id`, `preferred_provider_id`, `preferred_hygienist_id`, `account_id`, `patient_last_name` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office (always); optional `group_by` level; level `patient` (header = patient line). Sort per
`sort_by`, then `due_date`, code. Page break `none` / `office` / `group` (layout). Summary cards: `Recalls` (count),
`Scheduled` (same rule as `Total Scheduled Recalls`), `Patients` (count_distinct). No `reconciles_with`: the report is
evaluated per code (legacy rule), the metrics `recall_overdue_patients` and `recall_due_unscheduled_patients` use one
state `RH` per patient (05 section 5.0.1), so a patient with D1110 booked and D0120 overdue is listed here but is
`scheduled` in the metric. Both are related metrics only; their drills open this report with the metric's code group,
`scheduled_status = not_scheduled` and `date_preset` custom `-100y .. yesterday` (overdue) or `-100y .. today + 30`
(due), and the drill panel itemises the difference (07 section 5.5).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar of recall lines by `overdue_band` and scheduled / not scheduled |
| Patient name | `record` patient -> patient overview |
| Code | `record` patient recall screen (route_key `patient_recalls`) |
| Scheduled Date | `record` appointment, masked `scheduled_appointment_id` -> Scheduler on the appointment (route_key `appointment`); no drill on a blank cell |
| Band / office count | `rows` of this report filtered to the band |
| Hygienist band | `report` `recall.scheduled_recall_report` with `preferred_hygienist_ids = [hygienist]`, next 30 days |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Book recall | row `navigate` | route_key `scheduler_booking` with patient, preferred hygienist and the row's code(s) seeded as booked lines (NEW hand-off parameters `procedure_codes[]`, `provider_id`, request to 07) |
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
| Q1 | Meaning of `No Recall Date` (patients with no recall at all, or recall codes without a due date) and whether the dates grey out; with a code list selected, does `No Recall Date` still list patients who have no recall at all (assumed: only under `ALL`) |
| Q2 | Totals of the printed report (page 2 of the sample was not seen) |
| Q3 | Whether `Scheduled` counts an appointment booked today or only after today |
| Q4 | Whether recall rows marked inactive and patients with a cleared due date ever print |
| Q5 | Primary carrier source: dental primary only, or medical when no dental coverage |
| Q6 | Row order of patients inside the band (legacy default; `patient_last_name` assumed) |
| Q7 | Which phone `Phone#` prints (home, cell, or the preferred contact) |

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

<!-- PARITY:recall_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROCEDURE DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = service_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PROCEDURE DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = service_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. Dialog content was never captured - confirm on the live tool. Vendor documentation describes this option as an include filter on Special Transaction Report - confirm. |
| TRANSACTION PROVIDER | (no label) (picker) | shown: ALL | `transaction_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | false = active patients only, and the footer prints '* Excludes Inactive Patients' (vendor sample); true removes the predicate and the starred note. Independent of this box the report drops accounts flagged Send to Collection (rpt_account_dim.send_collections), a rule the research states for all recall reports - to confirm for Post-Op on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:recall_reports.r04:END -->

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
| `not_contacted_within` | `lookback_days` (06 key, 06 section 6.2; needs DASH-28) | empty | Hides patients whose follow-up call was already logged |
| `show_next_appointment` | `boolean` (NEW, 04 section 12, column switch, `role: query`) | `false` | Adds `next_appointment_date` (post-op visit booked?) |
| `show_amount` | `boolean` (NEW, 04 section 12, column switch) | `true`; forced `false` for a caller without `financial_patient` | Shows `amount`; keeps the default block free of money for clinical staff so the provider band stays `aggregate` (rights table, F7) |
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
| Migrated history | Works for migrated live charges once codes are flagged (the flag is read at run time, not stamped on the charge); archived legacy charges only when `rpt_tenant_flags.include_legacy_archive` is set (availability `legacy_archive_excluded`); 87,585 skipped source charges missing until DATA-57 (`charges_incomplete_migrated`) |

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
| `amount` | Amount | `money` (`negative: minus`) | `financial_patient` | none (legacy prints no money total); `visible_when show_amount` |
| `next_appointment_date` | Next Appt | `date` | `phi_identified` | enhancement |
| group key `provider_label` | `Provider - {last}, {first} {short_id} : {title}` | `text` | `aggregate` (no provider money total; `amount` behind `show_amount`; rule 3 exception requested from 08, F7) | subtotal `Total Patients` |
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
| Q5 | Row order of patients inside the provider band (legacy default; `patient_last_name` assumed) |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-RECALL-01 | Recall family scaffolding: shared parameter declarations, `scope` attributions (`treating`, `preferred`; office of service / home office), hidden-rule parameter `exclude_sent_to_collection` (default true), `availability[]` entries, `title_templates`, criteria echo, right family `recall`, legacy names and actions | P3 | S | ENG-03, ENG-18, FLT-01, FLT-27, SEC-03 | Lint passes for the four definitions with every `legacy_control_ids` entry of `catalog/parity/recall_reports.parity.json`; a View Only holder runs and cannot print; a caller without `phi_identified` gets 403 `data_class_denied`; a default run excludes a fixture account flagged Send to Collection |
| RPT-RECALL-02 | Request to 03 (DATA-41): `rpt_recall_due()` additions - argument `p_scheduled_from` / `p_scheduled_to` (booked lines inside a scheduled-date range, past dates included; when passed, `scheduled_basis` and `is_scheduled` are computed against that range instead of `>= p_as_of`), `preferred_provider_id` fallback changed from the per-code last charge provider to the per-patient `rpt_patient_activity.last_visit_provider_id` with output `preferred_provider_source` (`patient` / `derived`), `interval_unit`, `has_any_future_appointment` kept; unit mapping of check #22. Request to 04: record the derived fallback in the dictionary row of `preferred_provider_ids` | P3 | M | DATA-41, DATA-16, DATA-04 | Fixture: a recall code booked on an appointment 10 days ahead is `is_scheduled` with that date, time and appointment provider; a patient booked without the code is not scheduled; with a past scheduled range a code booked and completed last month is `exact` in range; a yearly interval adds 12 months; two code lines of one migrated patient carry the same derived provider, flagged `derived` |
| RPT-RECALL-03 | Option sources: `recall_procedure_codes` (codes with `recall_interval_span` or a maintained recall row), `procedure_codes` with category tree and code-group presets, `definitions:patient_type` with `no_type_defined`, preferred-hygienist list hygienists first | P3 | S | FLT-09, FLT-25, DATA-04 | Options for `recall_procedure_codes` return only recall codes of the fixture; `no_type_defined` drops untyped patients; preset `recall_default` expands to its six codes |
| RPT-RECALL-04 | Recall fixture set on the PostgreSQL test tier: three offices (two time zones), patients with derived and maintained recalls, stale child / adult prophylaxis codes, booked and unbooked future appointments, inactive patient, Send-to-Collection account, post-op flagged code, medical alerts | P3 | M | ENG-17, DATA-41, DATA-52 | Golden outputs of the four definitions are stable; each assumption of the open questions has one fixture row that shows its effect |
| RPT-RECALL-05 | Outreach and booking actions for the family: bulk `send_sms` / `send_email` (message type `recall`), `postcards`, `letters`, `labels`, `create_task`; row `navigate` to the Scheduler booking hand-off with recall codes seeded, to the patient's recall screen and chart | P3 | M | ENG-49, DASH-31, UX-22, SEC-36, NEW request to 07 (`scheduler_booking` parameters `procedure_codes[]`, `provider_id`) | Selection resolves from the snapshot; one message per patient across code lines; consent exclusions counted; a booking made from r03 with the seeded code makes the row `Scheduled` on re-run |
| RPT-RECALL-06 | Live legacy confirmation checklist for the family (F1-F8 and the per-report questions, including No Recall Date with a code list selected and how a legacy-booked recall prints before the booked-line backfill) and decisions-file update | P3 | S | FLT-23 | Every question has a recorded answer; the go-live risk of migrated bookings (RPT-RECALL-09 or the interim rule) is signed off by the product owner; `build_parity.py` re-run prints PARITY VALID; changed assumptions bump `definition_version` |
| RPT-RECALL-07 | Hygiene and recall dashboard and worklist bindings: drills of `recall_overdue_patients`, `recall_due_unscheduled_patients`, `recare_active_pct` open `recall.recall_due_report`; `worklists.recall_due` print counterpart; related-metric drill params (no `reconciles_with`: per-code report versus per-patient `RH`) | P3 | S | DASH-23, DASH-34, MET-14, ENG-30 | The drill from `recall_overdue_patients` opens the report with the metric's code group, `not_scheduled` and `date_preset` custom `-100y .. yesterday`; on a fixture where each patient has one recall code the distinct patients equal the metric; a fixture patient with D1110 booked and D0120 overdue is listed by the report, not counted by the metric, and itemised in the drill panel |
| RPT-RECALL-08 | Post-op setup readiness: warning `post_op_codes_not_flagged` when no code in scope has `is_post_op`; link to Procedure Code Setup; readiness line in `management.report_access_readiness` | P3 | S | DATA-04, SEC-12 | With no flagged code the run returns zero rows and the warning naming the setup screen; after flagging one code the warning disappears |
| RPT-RECALL-09 | Request to 03 (owner of DATA-16): backfill `appointment_procedures` for migrated appointments dated on or after the cut-over from the legacy appointment detail rows; interim rule (migrated appointment without lines counts as scheduled, `*`, `recall_booking_lines_missing_migrated`) in `rpt_recall_due()` until it lands | P3 | M | DATA-16, DATA-41 | Fixture: a migrated future appointment without lines makes the patient's due code `Scheduled` with `*` before the backfill and `exact` after it; an app-era appointment without the code still leaves it `Not Scheduled` |
| RPT-RECALL-10 | Definition `recall.procedural_recall_report`: provider and code levels, `procedure_codes` over every code, med-alert lateral, phones cell, totals, escalation rule | P3 | M | RPT-RECALL-01, DATA-06, DATA-19, DATA-52, ENG-11, ENG-23 | Fixture: two patients with D7210 under one provider print `Total Recalls 3` / `Total Patients With Recalls 2` when one patient had it twice; a caller without `clinical` gets the rows without `Med. Alerts`; a Send-to-Collection account is absent by default and present when unticked |
| RPT-RECALL-11 | Procedural Recall enhancements: `procedure_category_codes`, `exclude_patients_with_any_future_appointment`, `group_by` variants, tooth / surface, actions (task, text, letter) | P3 | S | RPT-RECALL-10, RPT-RECALL-05 | With `group_by = code` the per-code distinct patient counts equal the provider-level counts summed over providers minus patients seen by two providers; ticking the future-appointment filter drops a booked fixture patient |
| RPT-RECALL-12 | Definition `recall.scheduled_recall_report` on `rpt_recall_due()` with the scheduled-range arguments, qualifying rule, `show_unscheduled_codes`, appointment provider / operatory / unconfirmed filters | P3 | M | RPT-RECALL-01, RPT-RECALL-02, RPT-RECALL-15, ENG-59 | Fixture: D1110 booked in range and D0274 unbooked print as two code lines, `Total Recalls 2`, `Total Scheduled Recalls 1`; a patient booked in range without the code on the appointment is absent; an unbooked code of a qualifying patient who also holds an app-era appointment without that code prints blank Scheduled Date / Time / Prdr and is not counted in `Total Scheduled Recalls` |
| RPT-RECALL-13 | Definition `recall.recall_due_report`: both `recall_date_mode` branches, `scheduled_status`, primary carrier lateral, masked schedule columns, totals | P3 | L | RPT-RECALL-01, RPT-RECALL-02, RPT-RECALL-15, DATA-21, ENG-59 | Default today / today lists only lines due today; `No Recall Date` lists a patient without any recall-code history once with `Code : (none)` and disables the dates; `Not Scheduled` drops a line whose code is booked tomorrow and keeps a line whose patient is booked without the code, with blank Scheduled Date / Time / Prdr and not counted in `Total Scheduled Recalls`; `Pref Prdr` is the same on every code line of a patient |
| RPT-RECALL-14 | Recall Due enhancements: `overdue_band`, `collapse_code_family`, `exclude_patients_with_any_future_appointment`, `include_patient_balance`, `show_remaining_benefits`, `group_by`, `sort_by`, booking hand-off with seeded codes, postcards / labels hand-off, worklist link | P3 | M | RPT-RECALL-13, RPT-RECALL-05, DATA-32, MET-03, DASH-34 | With `collapse_code_family` a patient with D1120 completed 2 years ago and D1110 completed 5 months ago is one line due in 1 month; booking from the row with the seeded code makes the line `Scheduled` on re-run |
| RPT-RECALL-15 | Request to 02 and implementation: group header printing declared hidden columns of the group's first row (`header_columns[]`) for the patient line + code lines layout in PDF and on screen | P3 | S | ENG-11, ENG-23, UX-17 | Scheduled Recall and Recall Due PDFs print the patient line once and its code lines beneath; XLSX repeats the patient columns on every row; no merged cells |
| RPT-RECALL-16 | Definition `recall.post_op_report`: `is_post_op` population, provider band with `Total Patients`, referral label, amount, setup-readiness warning, data-class decision of F7 | P3 | S | RPT-RECALL-01, RPT-RECALL-08, DATA-04, DATA-06 | Fixture: D7140 flagged post-op completed yesterday by two patients under one provider prints `Total Patients 2`; an unflagged D7140 run returns zero rows with `post_op_codes_not_flagged`; a caller with the right family but without `provider_comp` and `financial_patient` runs the default report and gets the provider bands without `amount` |
| RPT-RECALL-17 | Post-Op call-list actions and scheduled "yesterday" view: `create_task` outcome, `send_sms` type `post_op_check`, `not_contacted_within` once DASH-28 exists, schedule at 07:00 office time | P3 | S | RPT-RECALL-16, ENG-43, ENG-44, ENG-49, DASH-28 | A logged call hides the patient with `not_contacted_within = 2`; the scheduled delivery carries only a login-gated link |

<!-- ASSEMBLED from catalog/parts/recall_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
