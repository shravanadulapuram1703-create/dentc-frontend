# My Reports - report specifications

Self-service variants of five legacy reports, restricted to the caller's own entries (user restriction) or to the provider linked to the caller through `users.report_access_provider_id` (provider restriction, PD-11).
New home: hub group **My Reports** at `/reports/c/my_reports` (brief section 1; 07 IA-6: the name keeps its legacy meaning, personal collections are called Library). Default phase **P1** for all five reports.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `my_reports.daily_journal` | Daily Journal | The caller's own ledger entries (or the linked provider's lines) for a day or range, with the Est. Pat. / Est. Ins. summary block | P1 | M | READY (the user on history: REPAIR(10)) | PARTIALLY DOCUMENTED (layout = Daily Journal - Detail; REPORT BY values not seen) |
| `my_reports.time_clock_report` | Time Clock Report | The caller's own punches, daily totals and overtime for a range | P1 | M | READY | DOCUMENTED (Detail); Summary and Employee Total Only from vendor text |
| `my_reports.missing_progress_notes` | Missing Progress Notes | Appointments in the range that have no progress note, filtered by appointment provider; the provider's note-completion worklist | P1 | S | READY (exact note-to-appointment link: SCHEMA(18)) | INFERRED |
| `my_reports.appointment_detail_by_user` | Appointment Detail by User | Appointments the caller entered, with patient, provider, carrier, procedures and notes | P1 | L | APP (creating user and created date exist for app-era appointments only) | PARTIALLY DOCUMENTED (parent Appointment Detail layout seen; by-user grouping inferred) |
| `my_reports.production_report` | Production Report | Production of the linked provider by code, provider or category, with production adjustments and an optional compare-fee column | P1 | M | READY (compare column needs `rpt_fee_schedule_fees`, DATA-51; adjustments and duration on history: REPAIR(12), REPAIR(10)) | DOCUMENTED by reference to Daily Reports Production Report (Code, Provider); Category INFERRED |

## Shared rules

**Derived definitions.** Each My Reports definition is registered through `derive()` of 02 section 2 (definition registry): it reuses
the builder, columns and blocks of its parent family and adds the restriction, the narrower criteria and its own legacy alias.

| My Reports definition | Parent definition (catalog) | Parent phase | Consequence |
|---|---|---|---|
| `my_reports.daily_journal` | `daily.daily_journal` (`catalog/daily_reports.md`) | P1 | Detail format only; no REPORT FORMAT, GROUP BY, Provider or User picker |
| `my_reports.time_clock_report` | `management.time_clock_report` (`catalog/management_reports.md`) | P2 | This definition ships first: it owns the `python_builder` adapter (ENG-34) that the Management copy reuses in P2 |
| `my_reports.missing_progress_notes` | `daily.progress_notes` with `report_type = missing` | P1 | Same population and note test (`rpt_appointment_note_audit()`), different provider attribution: appointment provider here (`p_provider_ids`, inferred), the patient's preferred provider there (`preferred_provider_ids` on `rpt_patient_dim.preferred_provider_id`, applied after the function). The builder takes `scope.provider_attribution` as a parameter, so one builder serves both; the forced restriction filters the appointment provider |
| `my_reports.appointment_detail_by_user` | `appointment.appointment_detail` (`catalog/appointment_reports.md`) | P3 | This definition ships first: it owns the appointment-detail builder (RPT-MY-16) that the parent reuses in P3 |
| `my_reports.production_report` | `daily.production_report` | P1 | `report_by` Code / Provider / Category only (no Carrier); Summary grain only; no GROUP BY, Page Break, Include Z-Codes |

**Restrictions** (08 section 4.2 and filter card 9.7; lint UR-4: every option of the discriminator carries at least one self restriction).

| Report | Restriction | Hidden / forced parameter | Exempt caller (PR-3: `REPORT_FULL_ACCESS_ROLES` or `reports_view_all_providers`) |
|---|---|---|---|
| `my_reports.daily_journal` | `report_by = user`: user `self_always`; any other `report_by` value: provider `self_unless_privileged` | `user_ids` forced to `current_user` (hidden); `provider_ids` forced to `current_user_report_provider` (hidden) | User mode: none (`self_always`). Provider mode: `provider_ids` becomes a picker, default own link, else `all` |
| `my_reports.time_clock_report` | user `self_always` | `user_ids` forced to `current_user` (hidden) | none |
| `my_reports.missing_progress_notes` | provider `self_unless_privileged` | legacy PROVIDER picker forced to `current_user_report_provider` and read-only; no link: 403 `report_provider_not_linked` (deviation from the legacy default ALL, open question 3) | keeps the picker, default `all` (legacy) |
| `my_reports.appointment_detail_by_user` | user `self_always` | `user_ids` forced to `current_user` (hidden), applied to `rpt_appointment_facts.created_by_user_id` | none |
| `my_reports.production_report` | provider `self_unless_privileged` | `provider_ids` forced to `current_user_report_provider` (hidden); `corresponding_provider_id` display | `provider_ids` picker in place of the display box, default own link, else `all` (08 open decision 13) |

Without a provider link a forced provider restriction refuses validate and run with 403 `report_provider_not_linked`; the
message reproduces the legacy text that no Corresponding Provider is set. A forced value is part of `params`, `scope_hash`
(`scope_user_ids`, `scope_provider_ids`), the audit record and the criteria echo (filter card 3.9 rule "Restrictions
without a legacy control"). V-5 of 08 governs who may open a stored run: a restricted viewer opens only runs whose
`scope_user_ids` / `scope_provider_ids` equal the own id or link. Because of UR-3 every definition with a user restriction is
`cacheable = false` until `report_runs.scope_user_ids` exists; the time-clock definition (python builder) stays uncacheable.

**Shared parameters and defaults** (same keys on all five reports; legacy defaults kept).

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `output_format` | `enum` `pdf` / `xlsx` / `csv` | `pdf` | `role: output`; PRINT / PREVIEW always shows the screen result first; `csv` is an enhancement |
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | `working_office` (legacy `108` = the office the user was working in) | Office = offices the caller can access; Office Group = groups from Setup > Office Groups. Office membership is enforced (S-rules of 08 section 4.1); a restriction never widens the office set |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | `today` / `today`, office-local (AD-9) | Inclusive both ends; presets and relative tokens (filter card 12) |

**Datasets, date bases and attribution.**

| Report | Datasets | Date basis | Office attribution | Provider attribution | User attribution |
|---|---|---|---|---|---|
| Daily Journal | `rpt_ledger_entries`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_user_dim`, `rpt_transaction_code_dim`, `rpt_procedure_code_dim` | `transaction_date` (default) / `created_date` | transaction office `rpt_ledger_entries.office_id` (office of service for charges) | line provider `rpt_ledger_entries.provider_id` (legacy `Prdr`) | poster `rpt_ledger_entries.user_key` |
| Time Clock Report | `rpt_time_clock` through `time_clock_service.build_report` | `work_date` (office-local date of clock-in) | office of the punch `time_clock_entries.office_id` (NULL on legacy rows) | none | employee `time_clock_entries.user_id` |
| Missing Progress Notes | `rpt_appointment_note_audit()`, `rpt_patient_dim`, `rpt_provider_dim` | `appointment_date` (fixed) | appointment office | appointment provider `rpt_appointment_facts.provider_id` | none |
| Appointment Detail by User | `rpt_appointment_facts`, `rpt_appointment_procedures`, `rpt_patient_dim`, `rpt_insurance_coverage`, `rpt_ledger_entries` (balance), `rpt_provider_dim`, `rpt_user_dim` | `appointment_date` (default) / `created_date` | appointment office | appointment provider (filter); preferred provider (column) | creator `rpt_appointment_facts.created_by_user_id` |
| Production Report | `rpt_charges`, `rpt_ledger_entries` (production adjustments), `rpt_procedure_code_dim`, `rpt_provider_dim`, `rpt_fee_schedule_fees` | `transaction_date` (posting date; equals `service_date` until DATA-13) | office of service `rpt_charges.office_id` | treating provider `rpt_charges.provider_id` | none |

**Sign conventions** (financial reports). Charges positive; payments negative; adjustments carry their signed A/R effect
(`rpt_ledger_entries.amount`). The legacy column of a row is `journal_column` (`charges`, `payment`, `adjust`); production
adjustments print in `Charges` by design; contract-billing charges print in `Adjust` (data card 2.12). Money is display-final,
quantised `ROUND_HALF_UP` to 2 decimals, negatives with a minus sign as in the legacy samples.

**Page furniture** (research section 3.1, kept). Header: practice-group (organisation) name, printed title (derived from the
criteria by `title_templates[]`), `Office : <office name>` band as the outer group when several offices are in scope. Footer
(`criteria_echo = footer`): `From` / `Thru` (or `From Appt Date` / `Thru` on the appointment reports; research 3.1 also
documents a `Transaction From` / `Transaction Thru` variant without naming its reports), `Offices`, `Providers`,
`Users`, `Codes`, `Operatories`, `FeeID` and starred option notes as each report lists them; the forced restriction is echoed
as `Users : <caller label>` or `Providers : <linked provider label>`; `Printed : <office-local date time>`;
`Page : n of m`. The legacy vendor copyright line is replaced by the organisation name and the DentC product line. Every
run warning from `availability[]` is printed in the criteria block.

**Rights and data classes.** Right family `my_reports`: `reports_my_reports_view` (run, view) / `reports_my_reports_full_control`
(also print, PDF; XLSX and CSV also need `reports_export_data_files`) - 08 section 2.2, PD-10. Data classes from 08 section 5.1:
patient identity and service facts `phi_identified`; money on a patient row `financial_patient`; money aggregated beyond one
account `financial_practice`; a provider row dimension with money `provider_comp`; the posting user label `aggregate` (rule 12);
pay and overtime rates `payroll_wage`. PR-6: while a provider self restriction is active, `provider_comp` and
`financial_practice` are satisfied for that run (the amounts are the provider's own); `financial_patient` and every other
class still need their grant. Own time-clock punches are always visible to the caller (`payroll_time` exemption of 08 5.1).
Two rules are requested from 08 (NEW, owner `08_security_compliance.md`): **UR-5** (section 4.3) - while a `self_always`
user restriction is active, `financial_practice` is satisfied for that run, because every total is the caller's own entries
(Daily Journal summary blocks); **own-row wage exemption** (section 5.1) - under the `self_always` user restriction of
`my_reports.time_clock_report`, `payroll_wage` is satisfied for the caller's own card (own rates, own pay). Until 08 decides,
the outputs below record the resulting column or block drop as a deliberate deviation.

**Family-wide enhancements** (additive; untouched defaults reproduce the legacy run).

| Enhancement | Parameter / feature | Detail |
|---|---|---|
| Relative-date saved views | `date_preset` (`today`, `yesterday`, `week_to_date`, `month_to_date`, `previous_month`) | A provider saves "My production - month to date" once; the favorite re-resolves each time (ENG-28, UX-19) |
| Restriction banner | UX-29 | The runner states "Limited to your entries" or "Limited to <linked provider>"; an unlinked caller sees the reason and the Setup > Security > Users field before running |
| Exempt-caller picker | `provider_ids` (`ProviderParam`) | Shown only to PR-3 exempt callers on the provider-restricted reports, never to restricted callers |
| My Dashboard links | `dashboards.my` (06) | Tiles drill into `my_reports.production_report`, `my_reports.missing_progress_notes`, `my_reports.daily_journal` with the tile's period |

**Family-wide open questions.**

| # | Question | Check on the live legacy tool / decision owner |
|---|---|---|
| F-1 | Do the Office / Office Group semantics, the SELECT dialogs and the `UPDATE MY FAVORITES` relabel documented on Daily Reports apply unchanged to the five My Reports screens? | Live tool, FLT-23 |
| F-2 | PD-11 versus literal parity for privileged callers (exempt picker on Production Report and on the provider mode of Daily Journal) | Product owner, 08 open decision 13 |
| F-3 | The pre-2021 list had eight My Reports (Daily Journal by User - Detail, by User (created date) - Detail, Appointment Detail by User, Time Clock Report; Daily Journal By Provider Detail, Production By Codes, Production By Provider, Production By Category). They are covered by criteria of the current five and are kept only as search aliases (`legacy_names[]`), not as separate reports | Decision recorded here |

## Daily Journal - `my_reports.daily_journal`

My Reports, screenshot `1.PNG` - P1 - M - right family `my_reports` (`reports_my_reports_view` / `reports_my_reports_full_control`) - cost_class interactive - legacy output confidence PARTIALLY DOCUMENTED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front-desk and billing users | End of day, before leaving | Check every charge, payment and adjustment they keyed today: right patient, right code, right amount, nothing posted twice |
| Office manager reviewing one user | On demand (the user runs it, or a manager signs in as exempt caller on the parent `daily.daily_journal`) | "Is this user entering what they should?" (vendor end-of-day list) |
| Provider (provider mode, if confirmed) | End of day | Lines posted under the linked provider: charges that were not performed by them, missing services |

The Created Date basis is the documented way to catch back-dated entries keyed today with an older transaction date (old
report `Daily Journal by User - Detail (by created date)`).

### Legacy output

Layout = Daily Reports Daily Journal, **Detail** format (research A2, DOCUMENTED from 2022 / 2024 samples); that this
screen prints the Detail layout is PARTIALLY DOCUMENTED (B1: no REPORT FORMAT on the screen, "presumably the Detail layout
of A2 for one user or one provider").

Printed title: `Daily Journal - Detail` (parent title; whether the My Reports copy prints a by-user title is not documented).

Detail columns, in order:

| # | Legacy header | Content |
|---|---|---|
| 1 | `Pat ID/ Chart #` | Patient ID or chart number (PRINT option) |
| 2 | `Patient Name` | |
| 3 | `Prdr` | Provider short id of the ledger line |
| 4 | `Code` | Procedure code, or payment / adjustment code |
| 5 | `Description` | Code description |
| 6 | `Th` | Tooth |
| 7 | `Surf` | Surface |
| 8 | `UCR` | UCR fee of the procedure; 0.00 on payments and adjustments |
| 9 | `Charges` | Services and production adjustments, signed |
| 10 | `Payment` | Payments, negative |
| 11 | `Adjust` | Other adjustments, signed; contract-billing debits print here with a positive amount |
| 12 | `User` | User who entered the line |

Bands: `Office : <name>` -> `Transaction Date: <date>` -> lines -> `Total for, <date>` (UCR, Charges, Payment, Adjust) ->
`Total for Office : <name>` -> `Summary for <office>` -> `Grand Total :` -> `Grand Total Summary :`.

Summary block (`Summary for <office>`, `Grand Total Summary :`): columns `Est. Pat.` | `Est. Ins.` | `Total`; sections
`Charges` (line `Services` plus one line per production adjustment code, then `Total Charges :`), `Payments` (one line per
payment code, `Total Payments :`), `Adjustments` (one line per adjustment code, `Total Adjustments :`). Charges are split into
the estimated patient and insurance portions; payments fall in the patient or insurance column by payer.

Observed quirks kept: production adjustments print in `Charges` (expected legacy behaviour). Observed but not reproduced yet:
an ortho contract charge can print as two lines suffixed `- Patient` and `- Pri Ins.`, each with its own amount and entering
user (research A2, ortho contract billing). `rpt_ledger_entries` has one charge leg per `patient_procedures` row, so the
split is not produced until a contract-billing fixture (`rpt_charges.is_contract_billing`) shows how the app stores the two
portions (open question 7). Deliberate deviation (until 08 decides UR-5): in the default User mode a caller without
`financial_practice` receives the lines without `Summary for <office>` and `Grand Total Summary :` (see Output, class note).

### Parameters - legacy parity

<!-- PARITY:my_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT BY | (no label) (dropdown) | shown: User | `report_by` | enum | User -> `user` | `user` | unknown_legacy | On My Daily Journal REPORT BY selects WHOSE lines are listed, not a grouping: User = lines entered by the logged-in user (forces user_ids to current_user). Candidate value Provider -> provider (unverified: lines of the provider linked to the user, forcing provider_ids to current_user_report_provider for a restricted caller); the definition declares it for the UR-4 lint, but the form does not offer it until RPT-MY-04 reads the list on the live tool (captured collapsed). Any further value read there is added with its own restriction. Differs from the shared mapping: same collapsed REPORT BY dropdown as four patient-list reports (sig0196), different list and a restriction meaning. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | (no label) (radio_group) | **Transaction Date** / Created Date | `date_basis` | enum | Transaction Date -> `transaction_date`, Created Date -> `created_date` | `transaction_date` | replicated | - |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PATIENT TYPE | (no label) (radio_group) | **Both** / General / Ortho | `patient_type` | enum | Both -> `both`, General -> `general`, Ortho -> `ortho` | `both` | replicated | Ortho-patient flag, not the user-defined patient types of INCLUDE / EXCLUDE PATIENT TYPE. |
| TRANSACTION TYPES | Services (checkbox) | **checked** | `transaction_types.services` | enum_multi | - | `true` | replicated | - |
| TRANSACTION TYPES | Payments (checkbox) | **checked** | `transaction_types.payments` | enum_multi | - | `true` | replicated | - |
| TRANSACTION TYPES | Adjustments (checkbox) | **checked** | `transaction_types.adjustments` | enum_multi | - | `true` | replicated | - |
| PRINT | (no label) (radio_group) | **Patient ID** / Patient Chart# | `patient_identifier` | enum | Patient ID -> `patient_id`, Patient Chart# -> `chart_no` | `patient_id` | replicated | - |
| OTHER OPTIONS | Show Datewise Distribution (checkbox) | **unchecked** | `show_datewise_summary` | boolean | - | `false` | replicated | Same option as Show Datewise Summary (vendor documentation). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `user_ids` | forced_when | report_by == user | {"token": "current_user"} | documented - My Reports limits a user to their own activity: User = lines entered by the logged-in user (user restriction self_always). |
| `user_ids` | visible_when | false | - | shown - No control on the legacy screen. |
| `user_ids` | disabled_value | true | all | inferred - Applies under every option other than User, where the provider force restricts the run instead. |
| `provider_ids` | forced_when | report_by != user and ctx.provider_restricted | {"token": "current_user_report_provider"} | inferred - Every other option of the unread REPORT BY list is treated as a provider-type value, so no option runs without a restriction; without a link the run is refused (403 report_provider_not_linked). |
| `provider_ids` | visible_when | report_by != user and not ctx.provider_restricted | - | policy - No control on the legacy screen. A caller the definition exempts (PD-11) gets the picker, default the own link, else all. |
| `provider_ids` | disabled_value | true | all | inferred - Applies while REPORT BY = User. |
<!-- PARITY:my_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT BY `User` (default) | Lists only the lines whose poster is the caller: hidden `user_ids` forced to `current_user`, predicate `user_key = 'u:<caller id>'` only (migrated lines that carry only a legacy login are never selected, see Data). `provider_ids` takes its disabled value `all` |
| REPORT BY other values (list captured collapsed) | Presumably `Provider` = lines of the linked provider (pre-2021 `Daily Journal By Provider Detail`), unverified. The definition declares the candidate option `provider` (parity note: declared for the UR-4 lint, not offered in the form until RPT-MY-04 reads the list): `provider_ids` forced to `current_user_report_provider` for a restricted caller (403 `report_provider_not_linked` without a link), predicate `rpt_ledger_entries.provider_id IN (...)`; `user_ids` takes `all`. Any further value read on the live tool is added as an option with its own restriction (UR-4) |
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot (`pdf` / `xlsx`; `csv` added). Rows unchanged |
| OFFICE/GROUP `Office` (default, working office) | `office_ids`: one `Office :` band per office, office subtotals and summary block per office, grand totals when more than one office |
| OFFICE/GROUP `Office Group` | `office_group_id`: every office of the group, banded per office as above |
| DATE RANGE `Transaction Date` (default) | Selects and bands lines by `rpt_ledger_entries.transaction_date`; band header `Transaction Date: <date>` |
| DATE RANGE `Created Date` | Selects and bands lines by `created_date` (entry date in the office's time zone); band header `Created Date: <date>` (INFERRED: only `Transaction Date:` is documented, open question 6); catches back-dated entries |
| Start Date / End Date | Inclusive range on the chosen basis; default today / today |
| PATIENT TYPE `Both` (default) | No predicate |
| PATIENT TYPE `General` | Patients with `rpt_patient_dim.is_ortho_patient = false` (rule of data card 3.5: General = not Ortho; exact legacy rule unverified, research A2, open question 8) |
| PATIENT TYPE `Ortho` | Patients with `is_ortho_patient = true`: ortho tag **or** an active `ortho_plans` contract (data card 3.5; whether the contract alone counts is open decision O-3 of 03) |
| TRANSACTION TYPES `Services` | Includes charge legs (`entry_type = 'charge'`, contract-billing charges included) |
| TRANSACTION TYPES `Payments` | Includes `patient_payment` and `insurance_payment` legs |
| TRANSACTION TYPES `Adjustments` | Includes `adjustment`, `refund`, `transfer`, `opening_balance` legs, production adjustments included |
| All three ticked (default) | No predicate (`semantics.full_selection = no_predicate`); at least one box required |
| Unticking a box | Removes that class from the lines, the date and office subtotals and the summary block (vendor: "day's production = Detail with only Services") |
| PRINT `Patient ID` (default) | First column shows `patient_id` |
| PRINT `Patient Chart#` | First column shows `chart_no` (inferred from the shared header `Pat ID/ Chart #`) |
| Show Datewise Distribution unticked (default) | No recap block |
| Show Datewise Distribution ticked | Adds the per-day recap block `datewise_summary` at report end (same option as Show Datewise Summary of the parent, research B1) |

Dependency rules: none on the screen. Hidden rules (filter card 9.5): `user_ids` forced while `report_by = user`, disabled
value `all` otherwise; `provider_ids` forced while `report_by != user` and `ctx.provider_restricted`, visible only to an exempt
caller in provider mode.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range` | `today` | `yesterday` for the morning re-check, `week_to_date` for a weekly self-audit saved view |
| `show_entry_timestamp` | `boolean` NEW | `false` | Adds column `created_at` (office-local datetime of entry) next to `user_label`; shows when each line was keyed |
| `only_backdated` | `boolean` NEW | `false` | Keeps lines whose `created_date` is more than `backdated_threshold_days` (05 setting of `backdated_entries_count`) after `transaction_date`; meaningful from DATA-13; greyed for ranges before the migrated-through date |
| `code_search` | `text` NEW (`validation.max_length` 20) | empty | Quick filter on `code` prefix inside the snapshot (no new run): finds every `D2391` keyed today |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (live legs), `rpt_patient_dim` (name, `chart_no`, `is_ortho_patient`), `rpt_provider_dim` (`short_id`), `rpt_user_dim` (`user_label`), `rpt_transaction_code_dim` (payment / adjustment description), `rpt_procedure_code_dim` (procedure description); tooth and surface from `rpt_charges` through `source_id` of the `chg` leg |
| Line columns | `entry_id`, `entry_type`, `journal_column`, `code`, `code_kind`, `amount`, `office_fee` (UCR), `est_patient`, `est_insurance`, `payer`, `transaction_date`, `created_date`, `created_at_utc`, `office_id`, `provider_id`, `patient_id`, `user_key` |
| Column binding | `charges` = `amount` where `journal_column = 'charges'`; `payment` = `amount` where `'payment'`; `adjust` = `amount` where `'adjust'`; `ucr` = `office_fee` on charge legs, 0.00 elsewhere |
| Summary block | Charges section: charge legs (line `Services`, `est_patient` / `est_insurance` / `amount`) plus one line per production-adjustment code (`journal_column = 'charges'` and not a charge leg); Payments: one line per payment code, column by `payer` (`patient` -> Est. Pat., `insurance` -> Est. Ins.); Adjustments: one line per code of `journal_column = 'adjust'` |
| Date basis | `transaction_date` (PD-8) or `created_date` (`posting_date` after DATA-13); per-office UTC bounds for created-date ranges (data card 4.3) |
| Office | transaction office `rpt_ledger_entries.office_id` (office of service on charges); NULL office rows = "Unassigned office", excluded for office-restricted callers (data card 5.1 rule 3) |
| Provider | line provider `rpt_ledger_entries.provider_id` (legacy `Prdr`); provider mode filters this column |
| User | `user_key` of the leg (`'u:' + created_by`, else `'l:' + legacy login`); the forced filter is `user_key = 'u:<caller id>'` only. `rpt_legacy_logins` (`tenant_id`, `login_key`, `login`) holds only legacy logins without a `users` row and maps none of them to a user, and filter card 3 matches login-only rows only under `all`, so migrated lines of the caller are never selected. A mapping would need `rpt_legacy_logins.user_id` (NEW, nullable, set by an admin mapping step; owner 03_data_foundation.md under DATA-10), listed as an optional dependency of RPT-MY-10 |
| Rating | READY (coverage matrix #114); the user on history: REPAIR(10) |
| Availability warnings (`availability[]`) | `user_history_unmapped`: migrated lines carry only a legacy login string and are never selected by the forced user filter; the caller's migrated entries are absent (until the NEW `rpt_legacy_logins.user_id` mapping exists). `created_date_migrated`: migrated money rows hold the load timestamp until the created-at restore of DATA-10 (check #2); Created Date ranges before the migrated-through date are greyed. `migrated_codes`: migrated payments and adjustments resolve to system alias codes and `unclassified_adjustment` until DATA-12 - every migrated adjustment prints in `Adjust`, never in `Charges`. `completeness_gap`: R-21 caveat until DATA-57 |
| Cannot be produced for history | The caller's own migrated entries (login string only, no user mapping); the created time of migrated rows without restore; the legacy split of a migrated adjustment into Production / Collection |

### Output

Detail block `lines` (main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `pat_id_chart_no` | Pat ID/ Chart # | text | `phi_identified` | label |
| `patient_name` | Patient Name | text | `phi_identified` | none |
| `provider_short_id` | Prdr | text | `aggregate` | none |
| `code` | Code | text | `phi_identified` | none |
| `description` | Description | text | `phi_identified` | none |
| `tooth` | Th | text | `phi_identified` | none |
| `surface` | Surf | text | `phi_identified` | none |
| `ucr` | UCR | money | `financial_patient` | sum per date, office, grand |
| `charges` | Charges | money | `financial_patient` | sum per date, office, grand |
| `payment` | Payment | money | `financial_patient` | sum per date, office, grand |
| `adjust` | Adjust | money | `financial_patient` | sum per date, office, grand |
| `user_label` | User | text | `aggregate` | none |
| `created_at` (enh.) | Entered | datetime (tz office) | `aggregate` | none; `visible_when show_entry_timestamp` |
| `entry_id`, `patient_id`, `office_id`, `office_name`, `band_date`, `patient_sort_name` | hidden | id / date / text | `phi_identified` (`patient_id`, sort name), `aggregate` | row id `entry_id`; `patient_id` carries `entity = patient` |

Group levels: fixed outer `office` (always printed, as in the samples) with `subtotal_label_template` `Total for Office : {office_name}`;
level `band_date` with header `{date_basis_label}: {band_date}` and subtotal `Total for, {band_date}`. Grand total label
`Grand Total :`. Default sort inside a date: `patient_sort_name`, `patient_id`, then `entry_id` (legacy line order not
documented). No `sort_by`, no page break parameter (none on the legacy screen); PDF keeps one office per page when several
offices are in scope (`page_break_allowed` on `office`, legacy behaviour unconfirmed).

Block `office_summary` (placement `after_group` of `office`) and `grand_summary` (placement `report_end`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `section` | (section) | enum `charges` / `payments` / `adjustments` | `aggregate` | group key; subtotal labels `Total Charges :`, `Total Payments :`, `Total Adjustments :` |
| `line_label` | (line) | text | `aggregate` | `Services` or code description |
| `est_pat` | Est. Pat. | money | `financial_practice` | sum per section |
| `est_ins` | Est. Ins. | money | `financial_practice` | sum per section |
| `total` | Total | money | `financial_practice` | sum per section |

Block `datewise_summary` (placement `report_end`, `visible_when show_datewise_summary`; layout INFERRED): `band_date` | `ucr` |
`charges` | `payment` | `adjust` | `net` (= `charges + payment + adjust`), one row per date of the range that has lines, grand
total row. Classes `financial_practice`.

Class note: the summary blocks are practice-level money. PR-6 satisfies `financial_practice` only while a provider
restriction is active (provider mode). In the default User mode the requested UR-5 (shared rules) would satisfy it for the
caller's own entries; until 08 adopts UR-5, a caller without `financial_practice` (the typical front-desk or billing profile,
which holds `financial_patient` only) receives the lines without the two summary blocks - a deliberate deviation recorded
under Legacy output (open question 4). Summary cards: `charges` total, `payment` total, `adjust` total, line count (block totals of
`lines`). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Click on a patient name | `record` patient account ledger (`route_key = patient_ledger`, `right_code` of the ledger feature, needs `phi_identified`) |
| Click on a line | `record` the ledger entry in the patient's Transactions screen (`route_key = patient_transaction`, entry id from `entry_id`) |
| Click on a summary code line | `rows`: same report, `lines` block filtered to that `code` and section |
| Click on a date subtotal | `rows`: same report with `date_from = date_to = band_date` |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient | row | `navigate` | Patient shell, Overview tab |
| Correct entry | row | `navigate` | Patient Transactions screen at the line; the edit itself stays a ledger-feature right |
| Export selection | bulk | `export_selection` | Full Control + `reports_export_data_files` |

Worklist: no; it is a self-check list. The legacy footer actions map to `run`, `frontend` (CLEAR CRITERIA) and `saved_view`
(ADD TO MY FAVORITES).

### Export and print

| Output | Rule |
|---|---|
| PDF | `layout = journal` (ENG-24), landscape (12 columns), repeating column header, office and date bands, summary blocks in the print stream after each office and at the end, footer criteria echo: `Offices`, `Users : <caller>` or `Providers : <linked provider>`, `Patient Type`, `Transaction Types`, `* Show Datewise Distribution` when ticked, `Printed :`, `Page : n of m`; date labels `From` / `Thru` (documented furniture); the label under the Created Date basis is INFERRED (open question 6) |
| XLSX | Sheet `lines` (one typed row per line, band values as columns `office_name`, `band_date`; no merged cells, no total rows), sheet `summary` (office, section, line, est_pat, est_ins, total), sheet `datewise` when ticked, sheet `criteria` |
| CSV | Main block `lines`; header block with criteria when `include_header_block` |
| Background | Not expected: one user's or one provider's lines for a day; `escalate_when` range over 92 days |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Values of the REPORT BY dropdown other than `User`; does `Provider` exist and does it list the linked provider's lines? | Live tool (RPT-MY-04) |
| 2 | Printed title of this copy (`Daily Journal - Detail` or a by-user title) and whether the summary block prints | Live tool |
| 3 | Does `Patient Chart#` change only the first column; is Show Datewise Distribution the same recap as Show Datewise Summary and what are its columns? | Live tool |
| 4 | Adopt UR-5 (a `self_always` user restriction satisfies `financial_practice` for the summary of the caller's own entries, as PR-6 does for a provider restriction)? Until then the summary blocks are dropped for callers without the class | 08 section 4.3 (product decision); blocks RPT-MY-10 acceptance wording |
| 5 | Do production adjustments disappear when only Services is ticked (our rule), and do contract-billing charges count as Services? | Live tool |
| 6 | Printed band header and footer date labels under the Created Date basis (`Created Date: <date>` and the footer label are inferred) | Live tool (RPT-MY-04) |
| 7 | How the ortho contract charge split into `- Patient` / `- Pri Ins.` lines is stored and posted, so that the journal can reproduce it | Contract-billing fixture; live tool |
| 8 | Exact PATIENT TYPE rule: ortho tag only, or also an active ortho contract (data card 3.5, decision O-3 of 03)? | Live tool; 03 |

## Time Clock Report - `my_reports.time_clock_report`

My Reports, screenshot `2.PNG` - P1 - M - right family `my_reports` - cost_class interactive - legacy output confidence DOCUMENTED (Detail; Summary and Employee Total Only from vendor text)

### Purpose

Every user with a time-clock card checks their own punches and hours for a pay period before payroll closes: missing
clock-outs, wrong days, overtime. The Management Reports copy (`management.time_clock_report`, user picker) serves the
manager; this copy is always the caller's own card (vendor: "own hours only"). Premium-subscription feature in the legacy tool.

### Legacy output

| `REPORT FORMAT` | Output | Confidence |
|---|---|---|
| `Detail` (default) | One row per in / out pair; columns `Employee` (Last,First), `Over time Type` (`Daily` or weekly), `Hourly Rate`, `Over time Rate`, `In`, `In Office`, `Out`, `Out Office`, `Total Hrs:Mins` (hh:mm of the pair), `Total Hours` (decimal). Bands: employee -> day -> `Total:` per employee per day -> `Grand Total:`. Footer `From` / `Thru`, `Users`, `* Detail Report` and the note that weekly overtime is not considered in this format | DOCUMENTED (2020 sample) |
| `Summary` | One line per user per day, overtime computed from the user's time-clock setting | Text only; columns INFERRED |
| `Employee Total Only` (older text "Total") | One line per employee for the whole range | Text only; columns INFERRED |

Setup behind the figures: per user `Time Clock Pay Rate`, `Time Clock Overtime Method` (`D` = hours over 8 a day, `W` = hours
over 40 a week), `Time Clock Overtime Rate`. Quirk ([conflict] research B2): the vendor says the office of a punch is not
tracked, yet the Detail prints `In Office` / `Out Office` (blank in the sample) and the screen has an office filter and
Group By Office. We keep the columns and fill them from `time_clock_entries.office_id` (one office per entry, so `In Office`
and `Out Office` show the same value).

### Parameters - legacy parity

<!-- PARITY:my_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary / Employee Total Only | `report_format` | enum | Detail -> `detail`, Summary -> `summary`, Employee Total Only -> `employee_total_only` | `detail` | replicated | - |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| OTHER OPTIONS | Group By Office (checkbox) | **unchecked** - greyed out | `group_by.office` | enum | - | `false` | replicated | Enabled when: ctx.multi_office (inferred). Ticked sets group_by = office (one section per office of the punch, with per-office totals). Greyed in the capture with one office in Office mode; enabled_when ctx.multi_office is inferred (vendor text does not state the rule). Vendor documentation says the office of a punch is not tracked, yet the Detail output has In Office / Out Office columns: punches with office_id NULL (legacy rows) group under 'Unassigned office'. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `user_ids` | forced_when | true | {"token": "current_user"} | documented - Own card only: the report prints hourly and overtime rates (user restriction self_always). |
| `user_ids` | visible_when | false | - | shown - No control on the legacy screen. |
<!-- PARITY:my_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `punches`: one row per entry with clock-in, clock-out and hours; Detail note printed |
| REPORT FORMAT `Summary` | Block `days`: one row per work day of the caller, regular / overtime / total hours |
| REPORT FORMAT `Employee Total Only` | Block `employees`: one row for the caller for the range |
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot; `csv` added |
| OFFICE/GROUP `Office` (default) / `Office Group` + picker | Resolved office list passed to `build_report`; punches of other offices are left out |
| Start Date / End Date | Range on `work_date` (office-local date of clock-in), default today / today. NEW limit (not legacy): the span may not reach 366 days (`build_report` raises when `(date_to - date_from).days >= MAX_REPORT_DAYS`, 422 `range_too_large`); the legacy limit is unknown (open question 5) |
| Group By Office unticked (default) | No office band |
| Group By Office ticked | `group_by = office`: outer band per office of the punch with office subtotals. Enabled when more than one office is in scope (`ctx.multi_office`, inferred - greyed in the capture with one office) |

Dependency rules: Group By Office `enabled_when ctx.multi_office` (inferred). Hidden: `user_ids` forced to `current_user`
for every caller (`self_always`), never visible.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range`; NEW presets `current_pay_period`, `previous_pay_period` (owner 04 section 7.4, resolved from `time_clock_settings` / `time_clock_periods`) | `today` | The natural saved view "previous pay period" |
| `show_issues` | `boolean` NEW | `false` | Adds column `issues` (`open`, `missing_clock_out`, `clock_out_before_clock_in`, `auto_closed`, `long_shift` from `build_report`) and a summary card with the count; lets the user ask for a correction before the period locks |
| `include_breaks` | `boolean` NEW | `false` | Lists unpaid break / lunch entries in Detail and adds `break_hours` to Summary and Employee Total Only (paid hours unchanged) |

### Data

| Item | Rule |
|---|---|
| Source | `python_builder` (02 section 4.2, whitelist) over `time_clock_service.build_report(db, tenant_id, caller, None, date_from=<date_from>, date_to=<date_to>, user_ids=[<caller>], office_ids=<resolved list>, include_wages=<wage rule, see Output class note>, include_entries=<report_format == detail>)`. Today's signature is `build_report(db, tenant_id, caller, scope, *, date_from, date_to, user_id=None, office_id=None, overtime_method=None, include_wages=False, include_entries=True)` (L1324-1328). `office_ids` and `user_ids` (list) are the NEW keywords 02 section 14 asks to add, one keyword set shared with `management.time_clock_report` (ENG-34); `user_id` stays as an alias of a one-element `user_ids`. Today the service resolves its own scope from `OfficeScope` / one `office_id` and skips the office filter for own rows - the adapter must pass the list. `build_report` raises 403 when `include_wages` is set and `caller.can_view_wages` is false, so the adapter computes the wage flag itself |
| Analytics twin | `rpt_time_clock` (`entry_id`, `user_id`, `office_id`, `clock_in`, `clock_out`, `total_hours`, `work_date`, `entry_type`, `is_paid`, `source`, `clock_basis`, `is_edited`, `auto_closed`, `is_open`, `era`) is used only for R6 / reconciliation: hours by user and day must equal the builder (DATA-23) |
| Overtime | Computed by `split_overtime` with `effective_rules(practice, user config)`; weekly overtime looks back 7 days before `date_from`. Never re-implemented in SQL |
| Date basis | `work_date` = office-local date of `clock_in`; `clock_basis = wall_clock` legacy rows are read as local time |
| Office | punch office `time_clock_entries.office_id`; NULL on legacy rows. Proposal (open question 3): the caller's own NULL-office punches are included and banded as "Unassigned office" |
| User | `time_clock_entries.user_id = caller`; `scope_user_ids = [caller]` stored on the run (UR-2, UR-3) |
| Rating | READY (coverage matrix #115) |
| Availability warnings | `legacy_wall_clock`: 31,756 migrated punches are wall-clock rows; `auto_closed_zero`: 856 auto-closed legacy rows count 0 hours; `office_unknown_legacy`: legacy punches without office |
| Cannot be produced for history | Planned shifts (none in either era); office of legacy punches where the source had none |

### Output

Detail block `punches` (`report_format = detail`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `employee_name` | Employee | text (`Last,First`) | `aggregate` | group key |
| `overtime_type` | Over time Type | enum `daily` / `weekly` / `none` (labels `Daily`, `Weekly`, `None`) | `payroll_time` | none |
| `hourly_rate` | Hourly Rate | money | `payroll_wage` | none |
| `overtime_rate` | Over time Rate | decimal (multiplier, 2 places) | `payroll_wage` | none |
| `clock_in` | In | datetime (tz office) | `payroll_time` | none |
| `in_office` | In Office | text | `aggregate` | none |
| `clock_out` | Out | datetime (tz office) | `payroll_time` | none; null_display blank for open entries |
| `out_office` | Out Office | text | `aggregate` | none |
| `total_hrs_mins` | Total Hrs:Mins | duration (`unit: hh_mm`) | `payroll_time` | sum per day and grand |
| `total_hours` | Total Hours | decimal (2) | `payroll_time` | sum per day (`Total:`) and grand (`Grand Total:`) |
| `issues` (enh.) | Issues | text | `payroll_time` | none; `visible_when show_issues` |
| `entry_id`, `user_id`, `office_id`, `work_date` | hidden | id / date | `payroll_time` | row id `entry_id` |

Group levels: optional outer `office` (`group_by = office`), then `employee_name` (single member: the caller), then
`work_date` with subtotal `Total:`; grand total `Grand Total:`. Sort: `clock_in`, `entry_id`. Detail trailer note:
"Weekly overtime is not considered in this format."

Summary block `days` (`report_format = summary`, columns INFERRED from "one line per user per day"):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `employee_name` | Employee | text | `aggregate` | group key |
| `work_date` | Date | date | `payroll_time` | none |
| `regular_hours` | Regular Hours | decimal (2) | `payroll_time` | sum per employee, grand |
| `overtime_hours` | Over time Hours | decimal (2) | `payroll_time` | sum per employee, grand |
| `total_hours` | Total Hours | decimal (2) | `payroll_time` | sum per employee, grand |
| `break_hours` (enh.) | Break Hours | decimal (2) | `payroll_time` | sum; `visible_when include_breaks` |

Employee block `employees` (`report_format = employee_total_only`, columns INFERRED): `employee_name`, `days_worked`
(integer), `regular_hours`, `overtime_hours`, `total_hours`; with `payroll_wage` also `regular_pay`, `overtime_pay`,
`total_pay` (money, `payroll_wage`, from `build_report` totals). Grand total row.

Group By Office in Summary and Employee Total Only: the day (or range) row is split by punch office; hours are the punch
hours of that office; overtime is computed once per user-day across offices (unchanged `build_report` result) and attributed
to the office of the punch during which the threshold was crossed. This attribution is a proposal (open question 2).

Class note: own punches are always visible (08 5.1 `payroll_time` exemption, `scope_user_ids = [caller]`). `hourly_rate`,
`overtime_rate` and pay columns are `payroll_wage`. The legacy Detail prints the caller's own rates, so the requested own-row
wage exemption (shared rules) would keep them for every caller: the adapter then passes `include_wages = true` for the own
card because the `self_always` restriction is active, which needs `build_report` to accept the engine's decision instead of
`caller.can_view_wages` (02 section 14, with the `user_ids` keyword). Until 08 adopts the exemption, a caller without
`payroll_wage` (every role outside `REPORT_FULL_ACCESS_ROLES`) receives Detail without `Hourly Rate` and `Over time Rate`
and Employee Total Only without pay columns - a deliberate deviation from the legacy default output (open question 1). Summary cards: `total_hours`, `overtime_hours`, count of days worked, issue
count (`show_issues`). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Optional bar chart of `total_hours` per `work_date` (regular and overtime stacked) on Summary |
| Click on a day subtotal (Summary row) | `rows`: same report, `report_format = detail`, `date_from = date_to = work_date` |
| Click on a punch | `record` Time Clock screen at that entry (`route_key = time_clock_entry`); the correction request follows the screen's own rights (`utilities_time_clock_editor_*` for edits) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Request correction | row | `navigate` | Opens the own Time Clock card at the entry, where a correction is requested; the report never edits punches |
| Export selection | bulk | `export_selection` | Full Control + export right |

Worklist: no. Footer actions: `run`, `frontend`, `saved_view`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape for Detail (10 columns), portrait for Summary and Employee Total Only; footer `From` / `Thru`, `Offices`, `Users : <caller>`, `* Detail Report` / `* Summary Report` / `* Employee Total Only`, the Detail overtime note, `Printed :`, `Page : n of m` |
| XLSX | One sheet per format block, typed cells (`clock_in` / `clock_out` as datetimes, hours as numbers, `total_hrs_mins` as a duration cell), no merged cells, criteria sheet |
| CSV | Main block of the chosen format |
| Background | Not needed (one user, at most 366 days) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Adopt the own-row exemption of `payroll_wage` under the `self_always` restriction of this report (the legacy Detail prints the caller's own `Hourly Rate` and `Over time Rate`)? Until then the columns are dropped for callers without `payroll_wage` | 08 section 5.1 (product decision); blocks RPT-MY-13 acceptance |
| 2 | When is Group By Office enabled, and how does the legacy tool split hours and overtime by office in Summary and Employee Total Only? | Live tool |
| 3 | Are the caller's own legacy punches without an office included under an office filter? (Proposal: yes, as "Unassigned office") | 03 / 08 |
| 4 | Column lists of Summary and Employee Total Only | Live tool |
| 5 | Does the legacy report limit the date span? The 366-day maximum is a new limit of `build_report` | Live tool; product owner |

## Missing Progress Notes - `my_reports.missing_progress_notes`

My Reports, screenshot `3.PNG` - P1 - S - right family `my_reports` - cost_class instant - legacy output confidence INFERRED

### Purpose

Providers and assistants run it at the end of each day (and the next morning) to find appointments that still have no
progress note, and write the notes before they lock (a note is editable only on the day it was entered, in the office where
it was entered). It is the single-test equivalent of Daily Audit with `PATIENT HAS` = Appointment and `BUT MISSING` =
Progress Notes, and the My Reports copy of Progress Notes > `Missing`. It doubles as a worklist. A provider-restricted caller needs `users.report_access_provider_id`:
without the link the run is refused (403 `report_provider_not_linked`), so an assistant without a provider link runs it only
as a PR-3 exempt caller or after a link is set (deviation from the legacy default ALL, open question 3).

### Legacy output

No vendor description or sample exists (INFERRED, research B3). Reconstruction:

| Element | Inferred content |
|---|---|
| Title | `Missing Progress Notes` |
| Rows | One row per appointment in the range: date / time, patient ID and name, provider, appointment status, note-present indicator |
| Population | Default: only appointments without a note; `ALL`: every appointment with its note status |
| Totals | Count per date and overall |
| Footer | Shared furniture: `From Appt Date` / `Thru`, `Offices`, `Providers`, `Printed :`, `Page : n of m` |

Quirk kept: the screen shows a `Provider` picker defaulting to ALL inside My Reports, so the own-data restriction is not
visible in the criteria; we keep the picker and force it for restricted callers. Deliberate deviation (policy, pending open
question 3): the legacy default ALL is not available to a restricted caller, and a restricted caller without a provider link
is refused.

### Parameters - legacy parity

<!-- PARITY:my_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this report = appointment provider (rpt_appointment_facts.provider_id, the p_provider_ids argument of rpt_appointment_note_audit) - inferred: the Progress Notes > Missing copy filters the patient's preferred provider (preferred_provider_ids), and no vendor text states which provider this picker filters (confirm on the live tool, RPT-MY-04). Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. For a provider-restricted caller the value is forced to current_user_report_provider and the picker is shown read-only (shared rule, 08 section 4.2); a restricted caller without users.report_access_provider_id is refused with 403 report_provider_not_linked (PR-5) - a deliberate deviation from the legacy default ALL, pending the live-tool check of how the legacy tool restricts this report. An exempt caller (PR-3) keeps the picker with default all. Dialog content was never captured. |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. Basis appointment_date unless the section carries a basis radio (Appointment Detail by User). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Basis appointment_date unless the section carries a basis radio. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENTS TO INCLUDE | (no label) (radio_group) | **Only with Missing Progress Notes** / ALL | `appointments_to_include` | enum | Only with Missing Progress Notes -> `only_missing_progress_notes`, ALL -> `all` | `only_missing_progress_notes` | replicated | Enabled on this report (it is the Missing variant of Daily Progress Notes, where the same section is greyed under Detail). only_missing_progress_notes = appointments with no non-struck-off note of the patient in the appointment office on the appointment date (has_progress_note = false); all = every live appointment in the range with its note status column. Meaning of ALL is inferred from the label: confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `provider_ids` | forced_when | ctx.provider_restricted | {"token": "current_user_report_provider"} | policy - The legacy PROVIDER picker (default ALL) is forced to the link and shown read-only for a provider-restricted caller; an exempt caller keeps the picker. How the legacy tool restricts this report is not documented (11.5). |
<!-- PARITY:my_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot; `csv` added |
| OFFICE/GROUP `Office` (default) / `Office Group` + picker | `p_office_ids` of `rpt_appointment_note_audit()`; one office band per office |
| PROVIDER `ALL` (default) | Exempt caller: no provider predicate. Restricted caller: forced to the linked provider, picker read-only |
| PROVIDER selected providers | `p_provider_ids`: appointments whose appointment provider is in the list |
| APPOINTMENT DATE RANGE Start Date / End Date | Inclusive range on `appointment_date`, default today / today |
| APPOINTMENTS TO INCLUDE `Only with Missing Progress Notes` (default) | Keeps rows with `has_progress_note = false` |
| APPOINTMENTS TO INCLUDE `ALL` | Keeps every appointment the function returns (cancelled and missed appointments are excluded under both options); column `Note` shows Yes / No (meaning of ALL inferred) |

Dependency rules: `provider_ids` forced to `current_user_report_provider` while `ctx.provider_restricted` (shown read-only
with the linked provider); without a link 403 `report_provider_not_linked` on validate and run, no `report_runs` row
(PR-5; covered by RPT-MY-02). No greyed controls.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range` | `today` | `yesterday` for the morning catch-up; `week_to_date` before the weekly chart audit |
| `include_unsigned_notes` | `boolean` NEW | `false` | With `only_missing_progress_notes`, also keeps appointments whose notes are all unsigned (`has_signed_note = false`); exact for app-era notes only (every migrated note is unsigned) |
| `exclude_future_appointments` | `boolean` NEW | `false` | Drops appointments whose start time is later than now (office-local), so today's run lists only visits that already happened |
| `group_by` | `enum` `none` / `provider` NEW (exempt callers only, `visible_when not ctx.provider_restricted`) | `none` | Section per appointment provider with counts, for an office manager who is exempt |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_appointment_note_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to, p_provider_ids)` returning `appointment_id`, `patient_id`, `office_id`, `provider_id`, `appointment_date`, `start_time`, `status_class`, `has_progress_note`, `has_signed_note`, `has_ledger_transaction` (DATA-18); joined to `rpt_patient_dim` (`patient_id`, `chart_no`, names) and `rpt_provider_dim` (`provider_name`, `short_id`) |
| Population | Appointments not a block, not deleted, with a patient, `status_class NOT IN ('cancelled', 'no_show')` under both APPOINTMENTS TO INCLUDE options; legacy-archive appointments are always excluded (the function hard-codes `NOT f.is_legacy_archive` and reads no tenant flag) |
| Note test | A non-struck-off note of the same patient, same office, `note_date = appointment_date`; after DATA-18 the note's `appointment_id` is preferred. Until then two appointments of one patient on one day share one note test |
| Date basis | `appointment_date` (fixed; office-local) |
| Office / provider | appointment office; appointment provider `rpt_appointment_facts.provider_id` (inferred; the Daily Progress Notes picker filters the preferred provider, open question 5) |
| Rating | READY (coverage matrix #116): by the appointment's provider; exact note-to-appointment link SCHEMA(18) |
| Availability warnings | `note_link_by_day`: note matched by patient, office and day until DATA-18; `migrated_notes_unsigned`: the unsigned enhancement is meaningless for history; `archive_policy`: legacy-archive appointments are always excluded |
| Cannot be produced for history | Which of two same-day appointments a migrated note belongs to; the note author of migrated notes |

### Output

Block `appointments` (main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | group key |
| `start_time` | Time | time | `phi_identified` | none |
| `patient_display_id` | Pat ID | text (`patient_id`; `chart_no` in the row details) | `phi_identified` | none |
| `patient_name` | Patient Name | text | `phi_identified` | count per date (`Total for, {appointment_date} : n`), grand count `Total Appointments : n` |
| `provider_label` | Provider | text (`Name (short_id)`) | `aggregate` | none |
| `status_label` | Appt Status | enum (`status_class` labels) | `phi_identified` | none |
| `has_progress_note` | Note | boolean (Yes / No) | `phi_identified` | count of No in the grand total; `visible_when appointments_to_include == all` |
| `has_signed_note` (enh.) | Signed | boolean | `phi_identified` | none; default hidden, column chooser |
| `has_ledger_transaction` (enh.) | Ledger Transaction | boolean | `phi_identified` | none; default hidden |
| `appointment_id`, `patient_id`, `office_id`, `provider_id` | hidden | id | `phi_identified` (`patient_id`), `aggregate` | row id `appointment_id`; `patient_id` `entity = patient` |

Group levels: fixed outer `office` when `ctx.multi_office`; optional `provider` (enhancement); `appointment_date` with count
subtotal. Default sort: `appointment_date`, `start_time`, `provider_label`, `patient_name`, `appointment_id`. Summary cards:
appointments listed, appointments without a note (metric `missing_progress_notes_count`, `reconciles_with` on the default
run). `empty_when`: `no_detail_rows`; the empty state reads "All appointments in the range have a progress note".

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Click on a row | `record` patient Progress Notes screen (`route_key = patient_progress_notes`, `/patient/:id/progress-notes`, date of service = `appointment_date`); needs `phi_identified` and the progress-notes feature right |
| Click on the time | `record` the appointment in the Scheduler (`route_key = scheduler_appointment`) |
| Summary card "without a note" | `rows`: same report, `appointments_to_include = only_missing_progress_notes` |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Write note | row | `navigate` | Progress Notes of the patient with the appointment's date of service pre-selected |
| Remind assistant | bulk | `create_task` | Task per selected appointment to the user the caller picks ("note missing for <date> <time>"); handler of the task feature (PD-15) |
| Export selection | bulk | `export_selection` | |

Worklist: yes. The report is the snapshot form; `worklists.unsigned_progress_notes` (06) is the live sibling for unsigned
notes and links here for missing ones.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (6 to 7 columns); footer `From Appt Date` / `Thru`, `Offices`, `Providers`, `* Only with Missing Progress Notes` or `* ALL`, `Printed :`, `Page : n of m` |
| XLSX | One sheet `appointments`, typed date / time / boolean cells, criteria sheet |
| CSV | Main block |
| Background | Never (one provider, short range; `escalate_when` range over 92 days) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Printed columns, title, totals and sort of the legacy output | Live tool (RPT-MY-04) |
| 2 | Does `ALL` list every appointment with a note indicator? | Live tool |
| 3 | How does the legacy tool restrict this report: can a linked provider pick other providers, and can a user without a provider link (assistant) run it with ALL? Blocker for P1 acceptance of the forced restriction | Live tool (RPT-MY-04) |
| 4 | Are cancelled and missed appointments excluded (our rule), and are today's not-yet-seen appointments listed? | Live tool |
| 5 | Does the PROVIDER picker of this copy filter the appointment provider (assumed) or the patient's preferred provider, as Progress Notes > Missing does? | Live tool (RPT-MY-04) |

## Appointment Detail by User - `my_reports.appointment_detail_by_user`

My Reports, screenshot `4.PNG` - P1 - L - right family `my_reports` - cost_class interactive - legacy output confidence PARTIALLY DOCUMENTED

### Purpose

Confirms that a user is entering appointments. The documented use: hygienists who book the next recall visit at the date of
service run it with `Created On Date` = today to see every appointment they booked; schedulers check the day's bookings and
call back with the phone numbers printed (Include Patient Phone Number is ticked by default). Run daily or on demand by the
user who booked.

### Legacy output

Parent `Appointment Detail` (Appointment Reports), 2026 sample (research B4, DOCUMENTED); the by-user variant is INFERRED
(the parent GROUP BY `User`, limited to the logged-in user as creator).

| Legacy header | Content |
|---|---|
| `Time / Len (min)` | Start time, length in minutes |
| `Appt Status` | e.g. Scheduled |
| `Operatory` | |
| `Patient / Pat ID [Chart#]` | Name, ID, chart number in brackets, and a `Bal :` amount |
| `Pref Provider` | Patient's preferred provider |
| `Carrier` | `P :` and `S :` carrier with phone |
| `Procedure (Code Th Surf Descr)` | Procedures on the appointment |
| `Notes` | Appointment notes |

Parent bands (counts): `Office : <name>` -> `Provider : <name> : <ID>` -> day header (long date) -> rows -> `Total for, <date> :` ->
`Total for, <provider> :` -> `Total for, <office> :` -> `Grand Total :`. Footer `From Appt Date` / `Thru`, `Offices`,
`Providers`, `Operatories`, `Users`. Printed title of the parent: `Appointment Detail`.

This report (INFERRED): the provider band is replaced by `User : <caller label>` (one member), the appointment provider becomes
a column, the phone numbers are added under the patient when Include Patient Phone Number is ticked. Parent-only criteria
(`GROUP BY`, `PAGE BREAK BY`, `APPOINTMENT TYPE` Regular / Archived, `Only AppointNow Appointments`, `Include Patient Home
Office`, `CANCELLATION REASON`) are absent from this screen in our capture.

### Parameters - legacy parity

<!-- PARITY:my_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this report = appointment provider (rpt_appointment_facts.provider_id): the parent Appointment Detail groups by the appointment provider and prints the preferred provider in its own column (inferred; no vendor statement for the picker). Filter inside the forced user restriction (appointments created by the logged-in user). Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| APPOINTMENT DATE RANGE | (no label) (radio_group) | **Appointment Date** / Created On Date | `date_basis` | enum | Appointment Date -> `appointment_date`, Created On Date -> `created_date` | `appointment_date` | replicated | - |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. Basis appointment_date unless the section carries a basis radio (Appointment Detail by User). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Basis appointment_date unless the section carries a basis radio. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| OPERATORY | Operatory (picker) | shown: ALL | `operatory_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| OTHER OPTIONS | Include Cancelled Appointments (checkbox) | **checked** | `include_cancelled_appointments` | boolean | - | `true` | replicated | true = cancelled appointments (status_class cancelled) are listed as well; missed appointments (no_show) are always listed whatever the value (vendor documentation of the parent report). Default ticked here, unticked on the parent Appointment Detail. |
| OTHER OPTIONS | Include Patient Phone Number (checkbox) | **checked** | `include_patient_phone_number` | boolean | - | `true` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `user_ids` | forced_when | true | {"token": "current_user"} | documented - Appointments entered by the logged-in user (user restriction self_always). |
| `user_ids` | visible_when | false | - | shown - No control on the legacy screen. |
<!-- PARITY:my_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot; `csv` added |
| OFFICE/GROUP `Office` (default) / `Office Group` + picker | Appointment office in the resolved list; office band per office |
| PROVIDER `ALL` (default) / selection | Appointment provider `rpt_appointment_facts.provider_id IN (...)`; a filter inside the caller's own appointments |
| APPOINTMENT DATE RANGE `Appointment Date` (default) | Appointments that take place in the range (`appointment_date`); day header = appointment date |
| APPOINTMENT DATE RANGE `Created On Date` | Appointments created in the range (`created_date`, office-local); day header = created date; rows still show the appointment date in the row details |
| Start Date / End Date | Inclusive range on the chosen basis, default today / today |
| OPERATORY `ALL` (default) / selection | `operatory_id IN (...)` |
| Include Cancelled Appointments ticked (default) | Cancelled appointments are listed with status `Cancelled` |
| Include Cancelled Appointments unticked | Cancelled appointments are left out; missed (no-show) appointments are always listed |
| Include Patient Phone Number ticked (default) | Adds `home_phone` (= `rpt_patient_dim.phone`), `cell_phone`, `work_phone` under the patient; the three-number layout is INFERRED (research: "adds phone numbers", open question 6) |
| Include Patient Phone Number unticked | Phone columns absent |

Dependency rules: none on the screen. Hidden: `user_ids` forced to `current_user` (`self_always`), applied to the creating
user of the appointment.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range` | `today` | Saved view "booked by me today" = basis `created_date` + `today` |
| `appointment_date_window` | `date_range` NEW (`appointment_window_from`, `appointment_window_to`) | open | With basis `created_date`, keeps only bookings whose appointment falls in that window ("recall visits I booked today for the next 6 months") |
| `only_recall_bookings` | `boolean` NEW | `false` | Keeps appointments with a booked line in code group `recall_default` (data card 2.5); the hygienist recall-booking check |
| `include_scheduled_fee` | `boolean` NEW | `false` | Adds `scheduled_fee` per appointment and a total (class `financial_patient` per row) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_appointment_facts` (`appointment_id`, `office_id`, `provider_id`, `operatory_id`, `patient_id`, `appointment_date`, `start_time`, `duration_minutes`, `status_class`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`, `notes`, `created_date`, `created_by_user_id`, `scheduled_fee`); `rpt_appointment_procedures` (`procedure_code`, `tooth`, `surface`) with `rpt_procedure_code_dim.description`; `rpt_patient_dim` (names, `chart_no`, `phone`, `cell_phone`, `work_phone`, `preferred_provider_id`); `rpt_insurance_coverage` current dental slots, tier primary and secondary (`carrier_name`, `carrier_phone`), as stored today, for every appointment in the range, past ones included; `rpt_ledger_entries` (patient balance `SUM(amount)` by `patient_id`, after DATA-07); `rpt_provider_dim`; `operatory_label` (NEW column of `rpt_appointment_facts`, the operatory name joined from `operatories`; added under DATA-16, owner 03 section 2.15 - the `operatories` list dataset of DATA-45 is P3) |
| Population | Not a block, not deleted, not in the legacy archive; `status_class <> 'cancelled'` unless `include_cancelled_appointments`; `no_show` always kept; patientless appointments listed with a blank patient |
| User | `created_by_user_id = caller` |
| Date basis | `appointment_date` or `created_date` (app rows only) |
| Office / provider | appointment office; filter on the appointment provider; `Pref Provider` column from `rpt_patient_dim.preferred_provider_id` |
| Rating | APP (coverage matrix #117): migrated appointments carry no creating user and no created date, so they can never appear |
| Availability warnings | `app_era_only`: appointments before the tenant's go-live date have no creator; `preferred_provider_not_migrated`: `Pref Provider` blank for migrated patients; `coverage_current`: carriers are the patient's current coverage as stored today, also on past appointments (a slot has no dates of its own, data card 2.21) |
| Cannot be produced for history | Any appointment created in the legacy tool; who changed or rescheduled an appointment (needs DATA-17 events); the carrier at the time of a past appointment |

### Output

Block `appointments` (main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `start_time` | Time | time | `phi_identified` | none |
| `duration_minutes` | Len (min) | integer | `phi_identified` | none (PDF prints `Time / Len (min)` in one cell) |
| `status_label` | Appt Status | enum | `phi_identified` | none |
| `operatory_label` | Operatory | text | `aggregate` | none |
| `patient_name` | Patient | text | `phi_identified` | count per day, user, office, grand |
| `patient_id_chart` | Pat ID [Chart#] | text | `phi_identified` | none |
| `patient_balance` | Bal : | money | `financial_patient` | none |
| `home_phone` (`rpt_patient_dim.phone`), `cell_phone`, `work_phone` | Home / Cell / Work (INFERRED) | text | `phi_identified` | none; `visible_when include_patient_phone_number` |
| `appointment_provider_label` | Provider | text | `aggregate` | none |
| `preferred_provider_label` | Pref Provider | text | `aggregate` | none |
| `primary_carrier` | Carrier P : | text (name and phone) | `phi_identified` | none |
| `secondary_carrier` | Carrier S : | text (name and phone) | `phi_identified` | none |
| `procedures` | Procedure (Code Th Surf Descr) | text (one line per booked code) | `phi_identified` | none |
| `notes` | Notes | text | `phi_identified` | none |
| `scheduled_fee` (enh.) | Sched. Fee | money | `financial_patient` | sum; `visible_when include_scheduled_fee` |
| `appointment_id`, `patient_id`, `office_id`, `band_date`, `created_date`, `appointment_date` | hidden | id / date | `phi_identified` (`patient_id`, dates), `aggregate` | row id `appointment_id` |

Group levels: fixed outer `office`; `user` (`User : {user_label}`, single member); `band_date` (long date of the chosen basis)
with subtotal `Total for, {band_date} : n`; subtotals `Total for, {user_label} : n`, `Total for, {office_name} : n`; grand
total `Grand Total : n`. Default sort inside a day: `start_time`, `operatory_label`, `appointment_id`. Summary cards:
appointments, cancelled (when included), no-shows. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Click on a row | `record` appointment in the Scheduler (`route_key = scheduler_appointment`, opens the day with the appointment selected) |
| Click on the patient | `record` patient shell (`route_key = patient_overview`) |
| Click on `Bal :` | `record` patient account ledger (needs `financial_patient` and the ledger right) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open appointment | row | `navigate` | Scheduler hand-off (never bare navigation; the Scheduler booking hand-off rules apply) |
| Send confirmation text | bulk | `send_sms` | Selected patients with SMS consent (`requires: sms_consent`, exclusions counted from `no_auto_sms`, `sms_opt_out_at`); SMS feature handler |
| Letters | bulk | `letters` | Hand-off to the letters batch (PD-15) |
| Export selection | bulk | `export_selection` | |

Worklist: no (a booking log); the call-back use is served by the phone columns and the SMS action.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (8 legacy columns plus phones); multi-line cells for procedures, carriers and notes; footer `From Appt Date` / `Thru` (documented; the label under the Created On Date basis is INFERRED, open question 7), `Offices`, `Providers`, `Operatories`, `Users : <caller>`, `* Include Cancelled Appointments`, `* Include Patient Phone Number`, `Printed :`, `Page : n of m` |
| XLSX | One flat sheet: one row per appointment; procedures joined with `; `; carriers split into name and phone columns; criteria sheet |
| CSV | Main block |
| Background | `escalate_when` range over 92 days |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Grouping of this copy: User band (our reading) or the parent's Provider band? Printed title? | Live tool (RPT-MY-04) |
| 2 | Which provider does the PROVIDER picker filter (appointment provider assumed) and what does OPERATORY list? | Live tool |
| 3 | Are the parent-only criteria absent in every state of this screen? | Live tool |
| 4 | Does `Bal :` show the patient balance or the account balance? | Live tool |
| 5 | Does "by User" mean the creator of the appointment (assumed) or the last user who changed it? | Live tool |
| 6 | Which phone numbers does Include Patient Phone Number print (home, cell, work), and where (under the patient or in a column)? | Live tool (RPT-MY-04) |
| 7 | Printed day header and footer date labels under the Created On Date basis | Live tool (RPT-MY-04) |

## Production Report - `my_reports.production_report`

My Reports, screenshot `5.PNG` - P1 - M - right family `my_reports` - cost_class interactive - legacy output confidence DOCUMENTED by reference (Code, Provider); Category INFERRED

### Purpose

A dentist or hygienist reviews only their own production: daily for providers paid on production, monthly for the mix of
codes rendered, and with Include UCR + a compare fee schedule to price their work at a "provider pay" schedule. Office
managers use `daily.production_report`; this copy never shows another provider's numbers to a restricted caller.

### Legacy output

Same layouts as Daily Reports Production Report (research A3, samples 2010 / 2016 / 2022 / 2023); restriction from B5.

| `PRODUCTION BY` | Printed title | Columns, left to right | Bands and totals | Confidence |
|---|---|---|---|---|
| `Code` (default) | `Production by Codes` | `Code`, `Description`, `#Perf`, `Charges $`, [compare-fee column when Include UCR], `Avg $`, `Total Dur. (Units)`, `Avg. Dur. (Units)`, `Eff. Rate $`, `Per %` | `Office : <name>` -> code rows -> `Total for, <office> [ <OID> ] :` -> `Total Production Adjustments :` (one line per adjustment code) | DOCUMENTED |
| `Provider` | `Production by Provider` | `Provider`, `ShortID`, `#Perf`, `Charges $`, compare-fee column (headed with the fee schedule name), `Avg $`, `Total Dur. (Units)`, `Avg. Dur. (Units)`, `Eff. Rate $`, `Per %` | One row per provider (one row: the linked provider) -> `Total :` | DOCUMENTED |
| `Category` | `Production by Category` (inferred) | `Category`, then the metric columns as above (inferred) | Category rows -> office total -> production adjustments (inferred) | INFERRED |

Column definitions: `#Perf` = count of procedures; `Total Dur.` = sum of duration units; `Avg. Dur.` = `Total Dur.` / `#Perf`;
`Eff. Rate $` = `Charges` / `Total Dur.`; `Avg $` = `Charges` / `#Perf`; `Per %` = row charges / charges of its group; compare
fee = count x fee of the Fee Schedule To Compare; footer `FeeID` and `* Includes UCR`.

Deliberate fixes: (1) `Eff. Rate $` on a row with zero duration prints the charge amount in the legacy tool; we print an empty
cell (`null_display` `-`) because the ratio is undefined; (2) the total-row `Eff. Rate $` is accumulated and meaningless in
by-code samples; we compute every ratio of a total row from the totals (`ratio(charges, total_duration)`). Kept: production
adjustments listed under the totals, `Per %` of a group.

### Parameters - legacy parity

<!-- PARITY:my_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| CORRESPONDING PROVIDER | (no label) (text_input) | (empty) - greyed out | `corresponding_provider_id` | display | - | `current_user_report_provider` | replicated | Enabled when: false. Read-only display of the provider linked to the logged-in user (Report Access Provider); the value comes from validate (display_source caller_report_provider). The run itself is limited by the hidden forced provider_ids. Empty when the user has no link: the run is refused. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PRODUCTION BY | (no label) (radio_group) | **Code** / Provider / Category | `report_by` | enum | Code -> `code`, Provider -> `provider`, Category -> `category` | `code` | replicated | PRODUCTION BY selects the report variant. |
| CODES | (no label) (picker) | shown: ALL | `procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. One capture (Treatment Plan Detail) shows an empty box: treated as no restriction - confirm. |
| OTHER OPTIONS | Include UCR (checkbox) | **unchecked** | `include_ucr` | boolean | - | `false` | replicated | - |
| FEE SCHEDULE TO COMPARE | Fee Schedule (dropdown) | shown: CIGNA PPO HAMILTON ( 128 ) - greyed out | `compare_fee_schedule_id` | entity_single | - | `first_option` | unknown_legacy | Enabled when: include_ucr == true (inferred). Row label Fee Schedule inside FEE SCHEDULE TO COMPARE. Same parameter as Fee Schedule To Compare, same unconfirmed default rule (candidate first_option). Greyed until Include UCR is ticked. List captured collapsed. |
| FEE SCHEDULE TO COMPARE | (no label) (other) | (empty) | `compare_fee_schedule_id` | entity_single | - | - | help_text | Info icon after the Fee Schedule label; tooltip text not visible - capture it on the live tool and keep it as help text. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| CORRESPONDING PROVIDER is empty (the logged-in user has no Report Access Provider) | running the report (PRINT / PREVIEW) fails with the Corresponding Provider error | Provider restriction self_unless_privileged: for a provider-restricted caller provider_ids is forced to the token current_user_report_provider and corresponding_provider_id (display, enabled_when false) shows the linked provider. When the caller has no users.report_access_provider_id the validate call returns the display empty and both validate and PRINT / PREVIEW answer 403 report_provider_not_linked with the legacy message that no Corresponding Provider is set; no run row is created. A caller exempt by PR-3 is not refused: provider_ids becomes visible as a picker in place of the display box (visible_when not ctx.provider_restricted), default the own link, else all (08 open decision 13). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `provider_ids` | forced_when | ctx.provider_restricted | {"token": "current_user_report_provider"} | documented - Effect of scope.provider_restriction, applied by the scope step, so the definition carries no second rule. Without a link the run is refused (403 report_provider_not_linked), as in the legacy tool. |
| `provider_ids` | visible_when | not ctx.provider_restricted | - | policy - No control on the legacy screen. A caller the definition exempts (PD-11) gets the picker in place of the CORRESPONDING PROVIDER box, default the own link, else all. |
| `compare_fee_schedule_id` | required_when | include_ucr == true | - | inferred - The compare column needs a schedule. |
<!-- PARITY:my_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot; `csv` added |
| OFFICE/GROUP `Office` (default) / `Office Group` + picker | Office of service in the resolved list; `Office :` band and total per office |
| CORRESPONDING PROVIDER (display) | Shows `Name (short_id)` of `users.report_access_provider_id`; never editable; empty = no link, run refused with 403 `report_provider_not_linked` |
| Start Date / End Date | Inclusive range on the posting date (`rpt_charges.transaction_date`, equal to `service_date` until DATA-13) and on the adjustment `transaction_date`; default today / today |
| PRODUCTION BY `Code` (default) | Row dimension `procedure_code`; title `Production by Codes` |
| PRODUCTION BY `Provider` | Row dimension provider; title `Production by Provider` |
| PRODUCTION BY `Category` | Row dimension `code_category`; title `Production by Category` |
| CODES `ALL` (default) / selection | `procedure_code IN (...)` on the charges (production adjustments are not code-filtered: they carry payment / adjustment codes) |
| Include UCR unticked (default) | No compare column; Fee Schedule disabled |
| Include UCR ticked | Enables Fee Schedule; adds the compare-fee column after `Charges $`, headed with the schedule name; footer `FeeID : <id>` and `* Includes UCR` |
| Fee Schedule (greyed, captured default `CIGNA PPO HAMILTON ( 128 )`, tenant data) | `compare_fee_schedule_id`: the schedule whose fees price the compare column; required while Include UCR is ticked; default candidate `first_option` until the live rule is read |
| Fee Schedule info icon | Help text of the parameter (tooltip text to capture on the live tool) |

Dependency rules: `compare_fee_schedule_id` `enabled_when include_ucr == true` (inferred) and `required_when include_ucr ==
true`; `provider_ids` forced to `current_user_report_provider` while `ctx.provider_restricted`, visible only to an exempt
caller (picker replaces the display box); rule d01: no link -> 403 `report_provider_not_linked` on validate and run.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range` | `today` | Saved views "my production - month to date", "previous month" |
| `provider_credit` | `enum` NEW `treating` / `hygienist` | `treating` | `hygienist` credits lines by `rpt_charges.hygienist_id` (app era only) instead of the treating provider: a hygienist sees the hygiene work done under a dentist's appointment. The restriction then filters `hygienist_id` |
| `compare_to` | `enum` (filter card 12, FLT-26) `none` / `previous_period` / `previous_year` | `none` | Adds `charges_compare` and `charges_change_pct` per row; P4 |
| `show_net_production` | `boolean` NEW | `false` | Adds a key-value block at report end: charges total, production adjustments total, net production (= sum, PD-1; the analytics vendor's reconciliation) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_charges` (`charge_id`, `office_id`, `provider_id`, `hygienist_id`, `transaction_date`, `service_date`, `procedure_code`, `code_category`, `charged_fee`, `office_fee`, `duration_minutes`, `is_production`); `rpt_procedure_code_dim` (`description`, `code_category`); `rpt_provider_dim` (`provider_name`, `short_id`); `rpt_ledger_entries` for production adjustments (`entry_type IN ('adjustment', 'refund')` and `journal_column = 'charges'`, i.e. legacy Sub Type Production; `code`, `amount`, `provider_id`, `office_id`, `transaction_date`); `rpt_transaction_code_dim` (adjustment description); `rpt_fee_schedule_fees` (`fee_schedule_id`, `fee_schedule_name`, `procedure_code`, `effective_date`, `effective_to`, `schedule_fee`) |
| Row filter | Same production filter as `daily.production_report` (completed, posted, live production charges; the parent catalog owns the exact rule) |
| Measures | `perf_count = count(*)`; `charges = SUM(charged_fee)` (posted fee, PD-1); `total_duration = SUM(duration_minutes)` (legacy "Dur. (Units)"); `compare_fee = SUM(schedule_fee in force on service_date)` per line (count x fee when the fee is constant; DATA-51 acceptance) |
| Date basis | posting date `transaction_date` (legacy: the posting date decides the period) |
| Office | office of service `rpt_charges.office_id` (PD-6) |
| Provider | treating provider `rpt_charges.provider_id` (PD-7); restriction filters this column (or `hygienist_id` with `provider_credit = hygienist`). Production adjustments are restricted on `rpt_ledger_entries.provider_id`; rows with NULL `provider_id` are excluded from a provider-restricted run (and from a run with a `provider_ids` selection) and counted in the availability warning `adjustment_without_provider` (NEW, list owned by 03) |
| Rating | READY (coverage matrix #118); production-adjustment list on history REPAIR(12); duration units on history REPAIR(10); compare column needs `rpt_fee_schedule_fees` (DATA-51, P1). Matrix #118 omits the two REPAIR items of the parent row #3: reported to the coverage-matrix owner |
| Availability warnings | `migrated_adjustment_unclassified`: every migrated adjustment is `unclassified_adjustment` / `txn_side = unknown` until DATA-12, so the production-adjustment list is empty for migrated periods; `duration_history`: duration units on history need REPAIR(10); `completeness_gap`: skipped migrated charges (DATA-57, R-21); `hygienist_app_era`: `provider_credit = hygienist` finds no migrated lines; `adjustment_without_provider` (NEW): production adjustments without a provider, left out of a provider-filtered run, with their count |
| Cannot be produced for history | Production adjustments of migrated periods before DATA-12; hygienist credit for migrated lines |

### Output

Block `production` (main), columns per `report_by` variant:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` (code) | Code | text | `aggregate` | group label |
| `description` (code) | Description | text | `aggregate` | none |
| `provider_name` (provider) | Provider | text | `provider_comp` | key column |
| `short_id` (provider) | ShortID | text | `provider_comp` | none |
| `code_category` (category) | Category | text | `aggregate` | key column |
| `perf_count` | #Perf | integer | `aggregate` (`provider_comp` in the provider variant) | sum |
| `charges` | Charges $ | money | `financial_practice` (`provider_comp` in the provider variant) | sum |
| `compare_fee` | `{compare_fee_schedule_name}` | money | `financial_practice` (`provider_comp` in the provider variant) | sum; `visible_when include_ucr` |
| `avg_charge` | Avg $ | money | derived | `ratio(charges, perf_count)` on rows and totals |
| `total_duration` | Total Dur. (Units) | integer | `aggregate` (`provider_comp` in the provider variant) | sum |
| `avg_duration` | Avg. Dur. (Units) | decimal (2) | derived | `ratio(total_duration, perf_count)` |
| `eff_rate` | Eff. Rate $ | money | derived | `ratio(charges, total_duration)`, empty when the duration is 0 |
| `pct_of_group` | Per % | percent (2) | derived | `share_of_parent(charges)`; total row 100 % of its group, office total row share of the grand total |
| `office_id`, `provider_id` | hidden | id | `aggregate` | group keys |

Group levels: fixed outer `office` (`Office : {office_name}`, subtotal `Total for, {office_name} [ {office_id} ] :`); grand total
`Grand Total :` when several offices; provider variant total label `Total :`. Sort: code variant by `procedure_code`; provider
variant by `provider_name`; category variant by the category order of `rpt_procedure_code_dim` (ADA order, `Medical`, `Account`).

Block `production_adjustments` (placement `after_group` of `office` and `report_end`, title `Total Production Adjustments :`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `adjustment_code` | Code | text | `aggregate` | none |
| `adjustment_description` | Description | text | `aggregate` | none |
| `adjustment_count` | Count | integer | `aggregate` | sum |
| `adjustment_amount` | Amount | money (signed) | `financial_practice` | sum, label `Total Production Adjustments :` |

Block `net_production` (enhancement, `key_value`, report end): `charges_total`, `production_adjustments_total`,
`net_production` (`reconciles_with` metric `net_production` for the same parameters). Summary cards: `charges` total,
`perf_count` total, `adjustment_amount` total. Metric links: `charged_production`, `production_adjustments`, `net_production`,
`procedure_count` (05 section 5.1, 5.9). Class note: under the provider restriction PR-6 satisfies `financial_practice` and
`provider_comp`; an exempt caller needs both classes. `empty_when`: `total_is_zero` on `charges` with no adjustment rows.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Horizontal bar of `charges` by row (top 15 codes or categories), lazy chart view (UX-24) |
| Click on a code, category or provider row | `rows`: drill-only format `procedure_lines` of this report (NEW, not offered in the form): `service_date`, `transaction_date`, patient name and id, `procedure_code`, `tooth`, `surface`, `charged_fee`, `duration_minutes`, filtered to the clicked key and the same parameters; needs `phi_identified` and `financial_patient` |
| Click on an adjustment line | `rows`: drill-only format `adjustment_lines` (date, patient, code, amount, user) for that code |
| Click on a procedure line | `record` patient Transactions screen at the charge |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Export selection | bulk | `export_selection` | |
| Open patient (drill formats only) | row | `navigate` | Patient shell |

Worklist: no. Footer actions: `run`, `frontend`, `saved_view`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (10 to 11 columns), office bands, adjustment list after each office and at the end; footer `From` / `Thru`, `Offices`, `Providers : <linked provider>`, `Codes`, `FeeID` and `* Includes UCR` when ticked, `Printed :`, `Page : n of m` |
| XLSX | Sheet `production` (one typed row per code / provider / category with `office_name` as a column; no total rows), sheet `production_adjustments`, criteria sheet |
| CSV | Main block |
| Background | Not expected for one provider; `escalate_when` range over 366 days |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Does ticking Include UCR unlock the Fee Schedule dropdown here; what is its default rule and value list; what does the info icon say? | Live tool (RPT-MY-04) |
| 2 | Do the criteria change with PRODUCTION BY = Provider / Category (CODES replaced as on the Daily copy)? | Live tool |
| 3 | Layout and title of `Production by Category` | Live tool |
| 4 | Are Z-codes included (no Include Z-Codes on this screen)? | Live tool |
| 5 | PD-11: exempt callers get a provider picker (current design) or the report stays `self_always`? | Product owner, 08 open decision 13 |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-MY-01 | `derive()` helper and the five derived My Reports definitions skeleton: legacy names and aliases (F-3), restriction declarations (`scope.provider_restriction`, `scope.user_restriction`), category `my_reports`, right family | P1 | M | ENG-03, ENG-05, SEC-06, FLT-17 | The lint passes UR-4 for every `report_by` option of all five definitions; `GET /reports/catalog` lists five `my_reports.*` entries with the legacy names; searching "Production By Codes" or "Daily Journal by User" finds the matching definition |
| RPT-MY-02 | Corresponding Provider resolution: display source `caller_report_provider`, 403 `report_provider_not_linked` with the legacy message, readiness listing (f) of 08 for users of `my_reports.*` without a link | P1 | S | FLT-02, SEC-06, SEC-12 | A provider-restricted user without `report_access_provider_id` gets 403 on validate and run of Production Report, Missing Progress Notes and the provider mode of Daily Journal and no `report_runs` row; the readiness report (f) lists that user for all three; a linked user sees the provider label in CORRESPONDING PROVIDER |
| RPT-MY-03 | Hub group My Reports: classic SELECT REPORT list in legacy order, restriction banner, exempt-caller picker rendering | P1 | S | UX-05, UX-06, UX-07, UX-29 | `/reports/c/my_reports` shows the five reports in legacy order; a restricted caller never sees a provider or user picker except the read-only PROVIDER box on Missing Progress Notes; an exempt caller sees `provider_ids` on Production Report |
| RPT-MY-04 | Live legacy verification of the My Reports criteria and outputs: REPORT BY list, PRINT option effect, Show Datewise Distribution, Group By Office rule, Missing Progress Notes output, Appointment Detail by User grouping, Fee Schedule default and tooltip, Category layout | P1 | S | FLT-23 | Every open question of this document marked "live tool" has an answer with a screenshot reference; the decisions file and the definitions are updated and `build_parity.py` prints PARITY VALID |
| RPT-MY-05 | Family parity and restriction tests: legacy default run per report, restricted caller sees only own rows, stored-run viewing (V-5), forced values in the criteria echo | P1 | M | FLT-20, SEC-06, ENG-17 | For each report the default `params` equal the parity defaults; two users with equal parameters get different `scope_hash` and neither can open the other's run; the PDF footer prints `Users :` or `Providers :` with the forced value |
| RPT-MY-06 | Criteria echo formatting of the forced restriction and of the starred option notes of the family | P1 | S | FLT-18, ENG-23 | Footer of each report matches the furniture table of the shared rules; `Printed :` is office-local |
| RPT-MY-10 | `my_reports.daily_journal` definition: derived from `daily.daily_journal` Detail, `report_by` user (and candidate provider) with forced restrictions, `patient_identifier`, `patient_type`, `transaction_types`, `date_basis`, journal layout and summary blocks | P1 | M | DATA-06, DATA-10, ENG-24, RPT-MY-01; optional: NEW `rpt_legacy_logins.user_id` mapping (03, DATA-10) | Default run for a test user lists exactly the legs whose `user_key` is `u:<user id>` (fixture with two users posting on one day; a migrated login-only leg is not listed); a caller holding `financial_practice` gets both summary blocks, a caller with `financial_patient` only gets them if 08 adopts UR-5 and otherwise gets the lines without them; Created Date run lists a back-dated payment keyed today; unticking Payments removes payment lines and the Payments section; summary `Total` equals the sum of the three line columns per office |
| RPT-MY-11 | Datewise Distribution block and the enhancement switches `show_entry_timestamp`, `only_backdated` | P1 | S | RPT-MY-10, DATA-13 | With the box ticked over a 3-day range the recap has 3 rows whose totals equal the date subtotals; `only_backdated` is greyed for ranges before the migrated-through date |
| RPT-MY-12 | `my_reports.time_clock_report` python-builder adapter over `build_report` (resolved office list keyword, own user forced, three formats, Group By Office, Detail note) | P1 | M | ENG-34, DATA-23, SEC-19 | Engine output equals `GET /reports/time-clock` for the same user and range in all three formats; a caller holding `payroll_time` still gets only the own card; `scope_user_ids = [caller]` is stored on the run; a range of 366 days or more is 422 `range_too_large` (new limit) |
| RPT-MY-13 | Wage columns and own-rate visibility on the time clock: `hourly_rate`, `overtime_rate`, pay totals gated by `payroll_wage` or by the own-row rule decided by 08 | P1 | S | SEC-07, RPT-MY-12; 08 decision on the own-row wage exemption | If 08 adopts the exemption: every caller gets the own `Hourly Rate` / `Over time Rate` in Detail and the adapter sends `include_wages = true` for the own card only; if not: a caller without `payroll_wage` gets Detail without the two rate columns and `include_wages` is never sent for that caller |
| RPT-MY-14 | `my_reports.missing_progress_notes` definition on `rpt_appointment_note_audit()`: forced provider for restricted callers, ALL / only-missing, count subtotals, empty "all clear" state | P1 | S | DATA-18, DATA-16, RPT-MY-01, RPT-MY-02 | Accepted for P1 only after RPT-MY-04 answers open question 3 (restriction) and 5 (provider role). Fixture: two appointments of one provider, one with a note on its day -> default run lists one row; ALL lists two with Note Yes / No; a restricted caller who picks another provider still gets only the linked provider's rows; count equals metric `missing_progress_notes_count` |
| RPT-MY-15 | Missing Progress Notes as a worklist: drill and row action to the patient Progress Notes with the date of service, Scheduler link, bulk task to an assistant | P1 | S | ENG-30, UX-22, RPT-MY-14 | Clicking a row opens `/patient/:id/progress-notes` with the appointment date selected; after the note is saved a re-run no longer lists the appointment |
| RPT-MY-16 | Appointment-detail builder owned here (reused by `appointment.appointment_detail` in P3) and the definition `my_reports.appointment_detail_by_user`: creator restriction, both date bases, operatory and provider filters, cancelled and phone options, carriers, procedures, balance | P1 | L | DATA-16 (incl. NEW `operatory_label`), DATA-21, DATA-07, RPT-MY-01 | Fixture: appointments created by two users -> each user sees only their own; Created On Date = today lists an appointment booked today for next month; unticking Include Cancelled drops cancelled rows but keeps a no-show; phone columns follow the checkbox; the builder runs unchanged under the parent definition with GROUP BY Provider; the Operatory column prints `operatory_label` |
| RPT-MY-17 | `my_reports.production_report` definition: derived from `daily.production_report`, `report_by` code / provider / category, production-adjustment block, compare column on `rpt_fee_schedule_fees`, ratios from totals, Corresponding Provider display, exempt picker | P1 | M | DATA-06, DATA-51, RPT-MY-01, RPT-MY-02 | For a linked provider the code-variant totals equal `daily.production_report` with `provider_ids = [link]` and the same range; compare column equals count x fee in force per service date for a schedule with two dated entries; zero-duration row shows an empty Eff. Rate; a production adjustment with NULL provider is absent from a restricted run and counted in `adjustment_without_provider`; unlinked caller 403 |
| RPT-MY-18 | Production drill formats `procedure_lines` and `adjustment_lines`, and the enhancements `provider_credit`, `show_net_production` | P1 | S | RPT-MY-17, ENG-30 | Drill from a code row returns lines whose `charged_fee` sum equals the row's `Charges $`; `show_net_production` equals metric `net_production` for the same parameters; `provider_credit = hygienist` lists only app-era lines with that hygienist |

<!-- ASSEMBLED from catalog/parts/my_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
