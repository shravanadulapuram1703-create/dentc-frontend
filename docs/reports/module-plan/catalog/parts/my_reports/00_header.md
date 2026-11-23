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
| `my_reports.production_report` | Production Report | Production of the linked provider by code, provider or category, with production adjustments and an optional compare-fee column | P1 | M | READY (compare column needs `rpt_fee_schedule_fees`, DATA-51) | DOCUMENTED by reference to Daily Reports Production Report (Code, Provider); Category INFERRED |

## Shared rules

**Derived definitions.** Each My Reports definition is registered through `derive()` of 02 section 2 (definition registry): it reuses
the builder, columns and blocks of its parent family and adds the restriction, the narrower criteria and its own legacy alias.

| My Reports definition | Parent definition (catalog) | Parent phase | Consequence |
|---|---|---|---|
| `my_reports.daily_journal` | `daily.daily_journal` (`catalog/daily_reports.md`) | P1 | Detail format only; no REPORT FORMAT, GROUP BY, Provider or User picker |
| `my_reports.time_clock_report` | `management.time_clock_report` (`catalog/management_reports.md`) | P2 | This definition ships first: it owns the `python_builder` adapter (ENG-34) that the Management copy reuses in P2 |
| `my_reports.missing_progress_notes` | `daily.progress_notes` with `report_type = missing` | P1 | Same block as the Missing variant; the shared builder is written once |
| `my_reports.appointment_detail_by_user` | `appointment.appointment_detail` (`catalog/appointment_reports.md`) | P3 | This definition ships first: it owns the appointment-detail builder (RPT-MY-16) that the parent reuses in P3 |
| `my_reports.production_report` | `daily.production_report` | P1 | `report_by` Code / Provider / Category only (no Carrier); Summary grain only; no GROUP BY, Page Break, Include Z-Codes |

**Restrictions** (08 section 4.2 and filter card 9.7; lint UR-4: every option of the discriminator carries at least one self restriction).

| Report | Restriction | Hidden / forced parameter | Exempt caller (PR-3: `REPORT_FULL_ACCESS_ROLES` or `reports_view_all_providers`) |
|---|---|---|---|
| `my_reports.daily_journal` | `report_by = user`: user `self_always`; any other `report_by` value: provider `self_unless_privileged` | `user_ids` forced to `current_user` (hidden); `provider_ids` forced to `current_user_report_provider` (hidden) | User mode: none (`self_always`). Provider mode: `provider_ids` becomes a picker, default own link, else `all` |
| `my_reports.time_clock_report` | user `self_always` | `user_ids` forced to `current_user` (hidden) | none |
| `my_reports.missing_progress_notes` | provider `self_unless_privileged` | legacy PROVIDER picker forced to `current_user_report_provider` and read-only | keeps the picker, default `all` (legacy) |
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
(`criteria_echo = footer`): `From` / `Thru` (or `From Appt Date` on Appointment Detail by User), `Offices`, `Providers`,
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

<!-- WORK-ITEMS -->
| RPT-MY-01 | `derive()` helper and the five derived My Reports definitions skeleton: legacy names and aliases (F-3), restriction declarations (`scope.provider_restriction`, `scope.user_restriction`), category `my_reports`, right family | P1 | M | ENG-03, ENG-05, SEC-06, FLT-17 | The lint passes UR-4 for every `report_by` option of all five definitions; `GET /reports/catalog` lists five `my_reports.*` entries with the legacy names; searching "Production By Codes" or "Daily Journal by User" finds the matching definition |
| RPT-MY-02 | Corresponding Provider resolution: display source `caller_report_provider`, 403 `report_provider_not_linked` with the legacy message, readiness listing (f) of 08 for users of `my_reports.*` without a link | P1 | S | FLT-02, SEC-06, SEC-12 | A user without `report_access_provider_id` gets 403 on validate and run of Production Report and of the provider mode of Daily Journal and no `report_runs` row; the readiness report lists that user; a linked user sees the provider label in CORRESPONDING PROVIDER |
| RPT-MY-03 | Hub group My Reports: classic SELECT REPORT list in legacy order, restriction banner, exempt-caller picker rendering | P1 | S | UX-05, UX-06, UX-07, UX-29 | `/reports/c/my_reports` shows the five reports in legacy order; a restricted caller never sees a provider or user picker except the read-only PROVIDER box on Missing Progress Notes; an exempt caller sees `provider_ids` on Production Report |
| RPT-MY-04 | Live legacy verification of the My Reports criteria and outputs: REPORT BY list, PRINT option effect, Show Datewise Distribution, Group By Office rule, Missing Progress Notes output, Appointment Detail by User grouping, Fee Schedule default and tooltip, Category layout | P1 | S | FLT-23 | Every open question of this document marked "live tool" has an answer with a screenshot reference; the decisions file and the definitions are updated and `build_parity.py` prints PARITY VALID |
| RPT-MY-05 | Family parity and restriction tests: legacy default run per report, restricted caller sees only own rows, stored-run viewing (V-5), forced values in the criteria echo | P1 | M | FLT-20, SEC-06, ENG-17 | For each report the default `params` equal the parity defaults; two users with equal parameters get different `scope_hash` and neither can open the other's run; the PDF footer prints `Users :` or `Providers :` with the forced value |
| RPT-MY-06 | Criteria echo formatting of the forced restriction and of the starred option notes of the family | P1 | S | FLT-18, ENG-23 | Footer of each report matches the furniture table of the shared rules; `Printed :` is office-local |
<!-- /WORK-ITEMS -->
