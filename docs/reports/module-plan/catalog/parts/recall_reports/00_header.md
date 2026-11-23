# Recall Reports - report specifications

Recall and post-treatment follow-up lists: who had a procedure completed (Procedural Recall, Post-Op), whose recall is
already booked (Scheduled Recall) and who is due or overdue and not yet booked (Recall Due). Hub home: Clinical › Recall,
route `/reports/c/recall` (brief section 1, 07 section 2). Default phase P3; all four reports ship in P3 (Recall Due and
Scheduled Recall with `rpt_recall_due()`, DATA-41).

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `recall.procedural_recall_report` | Procedural Recall Report | Patients with chosen procedure codes completed in a date range, by transaction provider and code, with phones and medical alerts | P3 | M | READY (`Med. Alerts`: `rpt_patient_alerts`, DATA-52) | DOCUMENTED (sample c. 2019) |
| `recall.scheduled_recall_report` | Scheduled Recall Report | Recall codes already booked on a future appointment in a scheduled-date range, per patient, with date, time and provider | P3 | M | READY (derived recall; exact scheduling needs booked lines, app era in practice; maintained rows SCHEMA(41)) | DOCUMENTED (sample 2026) |
| `recall.recall_due_report` | Recall Due Report | Recall codes due in a due-date range (or without a due date), scheduled / not scheduled, per patient - the recall call list | P3 | L | READY (derived; interval units to verify, data card section 6 #22; maintained rows SCHEMA(41)) | DOCUMENTED (sample 2022; totals not seen) |
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
| `preferred_provider_ids`, `preferred_hygienist_ids` | `entity_multi` | r02, r03 | `all` | `rpt_recall_due().preferred_provider_id` (patient column, falling back to the provider of the last completed charge of the code) / `preferred_hygienist_id` (patient column, no fallback, not migrated) |
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
| Migrated history | r01 and r04: complete for charges that were migrated (data card 2.9: 87,585 skipped source charges are missing until DATA-57; the run prints the completeness caveat `charges_incomplete_migrated`). r02, r03: every migrated recall is `derived` (no recall rows were migrated); booked lines exist for 6 % of migrated appointments, so a recall booked before go-live shows as not scheduled unless the appointment was edited in DentC. `availability[]` entries: `recall_derived_from_history`, `recall_interval_units_unverified` (until check #22 passes), `preferred_provider_not_migrated` |

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
| `clinical` | `med_alerts` (r01, `rpt_patient_alerts`, rule 4 of security card 5.2): dropped for a caller without the class, the row stays |
| `financial_patient` | `amount` (r04, `rpt_charges.charged_fee`) |
| `aggregate` | provider short id / name and title on r01, r02, r03 (operational label, no money), office name, counts |
| `provider_comp` | provider group key of r04 (rule 3: a provider group key in a block with a money column); see open question F7 |
| Drill to records | `record` targets need `phi_identified` plus the target feature right (patient chart, Scheduler, ledger) and pass `assert_patient_visible()` |

### Family-wide enhancements (on top of filter card section 12)

| Enhancement | Key / type | Reports | Detail |
|---|---|---|---|
| Send-to-Collection switch | `exclude_sent_to_collection` (`boolean`, default `true`) | all 4 | Makes the hidden legacy rule visible; default keeps the legacy population |
| Recall code presets | saved code sets from `rpt_code_groups` (`recall_default`, `prophy`, `perio_maintenance`, `exam_recare`) in the `recall_procedure_codes` / `procedure_codes` picker | r01, r02, r03 | Filter card 12 "Code picker extras" (FLT-25); the vendor advises anchor codes for Recall Due |
| Outreach bulk actions | `send_sms`, `send_email`, `postcards`, `letters`, `labels`, `create_task` (02 section 3.10) | r01, r03, r04 | Consent exclusions from `rpt_patient_dim.no_auto_sms`, `no_auto_email`, `no_correspondence`, `sms_opt_out_at`; one message per patient (deduplicated over code lines) |
| Book recall | row `navigate` to the Scheduler booking hand-off (`openSchedulerForBooking`) with the patient, preferred hygienist and the recall code(s) of the row seeded as booked lines, so the booking satisfies the exact-code rule | r03 (and r02: reschedule) | Never a bare navigate to `/scheduler` |
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
| F7 | Product / 08: on Post-Op the provider band beside `Amount` makes the band key `provider_comp` (rule 3), which would refuse the run for clinical staff without that class; proposal: classify the band `aggregate` and keep `amount` `financial_patient` (no provider money total is printed) | 08_security_compliance.md owner |

<!-- WORK-ITEMS -->
| RPT-RECALL-01 | Recall family scaffolding: shared parameter declarations, `scope` attributions (`treating`, `preferred`; office of service / home office), hidden-rule parameter `exclude_sent_to_collection` (default true), `availability[]` entries, `title_templates`, criteria echo, right family `recall`, legacy names and actions | P3 | S | ENG-03, ENG-18, FLT-01, FLT-27, SEC-03 | Lint passes for the four definitions with every `legacy_control_ids` entry of `catalog/parity/recall_reports.parity.json`; a View Only holder runs and cannot print; a caller without `phi_identified` gets 403 `data_class_denied`; a default run excludes a fixture account flagged Send to Collection |
| RPT-RECALL-02 | Request to 03 (DATA-41): `rpt_recall_due()` additions - argument `p_scheduled_from` / `p_scheduled_to` (booked lines inside a scheduled-date range, past dates included), output `preferred_provider_source` (`patient` / `derived`), `interval_unit`, `has_any_future_appointment` kept; unit mapping of check #22 | P3 | M | DATA-41, DATA-16, DATA-04 | Fixture: a recall code booked on an appointment 10 days ahead is `is_scheduled` with that date, time and appointment provider; a patient booked without the code is not scheduled; a yearly interval adds 12 months; the derived provider is flagged |
| RPT-RECALL-03 | Option sources: `recall_procedure_codes` (codes with `recall_interval_span` or a maintained recall row), `procedure_codes` with category tree and code-group presets, `definitions:patient_type` with `no_type_defined`, preferred-hygienist list hygienists first | P3 | S | FLT-09, FLT-25, DATA-04 | Options for `recall_procedure_codes` return only recall codes of the fixture; `no_type_defined` drops untyped patients; preset `recall_default` expands to its six codes |
| RPT-RECALL-04 | Recall fixture set on the PostgreSQL test tier: three offices (two time zones), patients with derived and maintained recalls, stale child / adult prophylaxis codes, booked and unbooked future appointments, inactive patient, Send-to-Collection account, post-op flagged code, medical alerts | P3 | M | ENG-17, DATA-41, DATA-52 | Golden outputs of the four definitions are stable; each assumption of the open questions has one fixture row that shows its effect |
| RPT-RECALL-05 | Outreach and booking actions for the family: bulk `send_sms` / `send_email` (message type `recall`), `postcards`, `letters`, `labels`, `create_task`; row `navigate` to the Scheduler booking hand-off with recall codes seeded, to the patient's recall screen and chart | P3 | M | ENG-49, DASH-31, UX-22, SEC-36 | Selection resolves from the snapshot; one message per patient across code lines; consent exclusions counted; a booking made from r03 with the seeded code makes the row `Scheduled` on re-run |
| RPT-RECALL-06 | Live legacy confirmation checklist for the family (F1-F6 and the per-report questions) and decisions-file update | P3 | S | FLT-23 | Every question has a recorded answer; `build_parity.py` re-run prints PARITY VALID; changed assumptions bump `definition_version` |
| RPT-RECALL-07 | Hygiene and recall dashboard and worklist bindings: drills of `recall_overdue_patients`, `recall_due_unscheduled_patients`, `recare_active_pct` open `recall.recall_due_report`; `worklists.recall_due` print counterpart; `reconciles_with` tests | P3 | S | DASH-23, DASH-34, MET-14, ENG-30 | On the fixture, distinct patients of `recall.recall_due_report` with a past range up to yesterday, `scheduled_status = not_scheduled` and the dashboard's code group equal `recall_overdue_patients` |
| RPT-RECALL-08 | Post-op setup readiness: warning `post_op_codes_not_flagged` when no code in scope has `is_post_op`; link to Procedure Code Setup; readiness line in `management.report_access_readiness` | P3 | S | DATA-04, SEC-12 | With no flagged code the run returns zero rows and the warning naming the setup screen; after flagging one code the warning disappears |
<!-- /WORK-ITEMS -->
