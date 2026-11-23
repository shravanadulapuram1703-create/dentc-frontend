# Management Reports - report specifications

Control reports for the office manager and the owner: contract instalments due for posting, copays left uncollected at the desk, the audit trail of changed and deleted records, and staff hours from the time clock. They support end-of-day, pay-period and as-needed review rather than daily production accounting.
New home: hub group **Management** at `/reports/c/management` (brief section 1; category key `management`), with the Audit Trail also reachable from the patient Print launcher (UX-29) and the Time Clock Report from `/time-clock/report` ("Open in Reports", 07). Default phase **P2** for all four reports.

## Overview

Legacy order of the SELECT REPORT list (control index `legacy/index/management_reports.controls.json`): r01 Payment Plan Charges, r02 Uncollected Copay, r03 Audit Trail, r04 Time Clock Report.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `management.payment_plan_charges` | Payment Plan Charges | Regular or ortho contract instalments due on a billing date, before they are posted to ledgers and claims | P2 | M | APP (no contract was migrated; dataset `rpt_contract_installments` needs DATA-37) | INFERRED (workflow documented, printed layout not) |
| `management.uncollected_copay` | Uncollected Copay | Patients on the schedule of a date range who still owe a patient balance, with last payment and financial notes, for the end-of-day desk check | P2 | M | READY (patient portion is derived on history, k13) | PARTIALLY DOCUMENTED (purpose, last payment, Financial Notes documented; other columns and Summary INFERRED) |
| `management.audit_trail` | Audit Trail | Who changed or deleted which record when, with original and updated date and amounts, by module and action type | P2 | L | APP (nothing predates the migration; Close out SCHEMA(29); Reschedule and Cut / Copy-Paste SCHEMA(17); charge before / after and Pat / Ins amounts SCHEMA(14)) | DOCUMENTED (2017 and 2023 vendor samples); dropdown values not documented |
| `management.time_clock_report` | Time Clock Report | Punches, daily totals and overtime of all or selected employees for a pay period, for payroll | P2 | M | READY (legacy punches are wall-clock values, handled) | DOCUMENTED (Detail, 2020 sample); Summary and Employee Total Only PARTIALLY DOCUMENTED |

## Shared rules

**Family identity.** Four definitions, category `management`, `kind = standard`, `paging_mode = snapshot`,
`side_effects = none` (no report of this family writes business rows; the posting of instalments stays in the contract
feature). `legacy_names[]` carry the legacy and pre-2021 menu names (research 2.8): `Payment Plan Charges`,
`Regular Payment Plan Charges Report`; `Uncollected Copay`, `Uncollected Copay Report`, `Uncollected Co-Pay Report`;
`Audit Trail`, `Audit Trail Report`; `Time Clock Report`. Old vendor articles place Aging, Income Allocation and
Production reports under "Management Reports": those names are aliases of the `monthly.*` and `daily.*` definitions, not
of this family (catalog `monthly_reports.md`), and the hub search resolves them there.

**Shared parameters and defaults** (legacy defaults kept; the generated parity tables are authoritative).

| Parameter (value keys) | Type | Reports | Default | Rule |
|---|---|---|---|---|
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | all four | `working_office` (legacy `108` = the office the user worked in) | Office = offices the caller can access; Office Group = groups from Setup > Office Groups. Office membership is enforced (08 S-rules); `all` = every office the caller may read. The office column differs per report (attribution table below) |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | r02, r03, r04 | `today` / `today`, office-local (AD-9) | Inclusive both ends; presets and relative tokens (filter card 12). r01 has the single date `billing_date` instead (default `today`) |
| `output_format` | `enum` `pdf` / `xlsx` / `csv` | r01, r02 (legacy PRINT FORMAT) | `pdf` | `role: output`; PRINT / PREVIEW always shows the screen result first; `csv` is an enhancement. r03 and r04 have no PRINT FORMAT section (as captured): they render the screen result and export through the export dialog (legacy viewer `Export to: Excel / Word`); the definition carries `output_format` as a hidden parameter with default `pdf` and no legacy control |
| `report_format` | `enum` | r02 (`detail`, `summary`), r04 (`detail`, `summary`, `employee_total_only`) | `detail` | Row grain of the same population |
| `user_ids` | `entity_multi` | r03 (actor of the change), r04 (employee) | `all` | Include; `all` = no restriction. The user role differs per report; on r04 forced to `current_user` for a caller without `payroll_time` |

**Datasets, date bases and attribution.**

| Report | Datasets | Date basis (fixed) | Office attribution | Provider attribution | User attribution |
|---|---|---|---|---|---|
| Payment Plan Charges | `rpt_contract_installments`, `rpt_payment_plan_contracts`, `rpt_patient_dim`, `rpt_account_dim`, `rpt_provider_dim`, `rpt_charges` (posted state) | `due_date` of the instalment (legacy Billing Date) | contract office `rpt_contract_installments.office_id` | ortho contract provider `rpt_contract_installments.provider_id`; regular plans have none (column shows the patient's preferred provider, `rpt_patient_dim.preferred_provider_id`) | none |
| Uncollected Copay | `rpt_appointment_facts`, `rpt_charges`, `rpt_payments`, `rpt_ledger_entries`, `rpt_ar_open_items()`, `rpt_account_dim`, `rpt_patient_dim`, `rpt_provider_dim` | `appointment_date` | appointment office `rpt_appointment_facts.office_id` | appointment provider `rpt_appointment_facts.provider_id` | none |
| Audit Trail | `rpt_audit_events`, `rpt_patient_dim`, `rpt_user_dim`, `rpt_office_dim` | `occurred_date` (updated date) | office of the change `rpt_audit_events.office_id` (NULL on PRINT rows and office-less setup changes) | none | actor `rpt_audit_events.user_id` |
| Time Clock Report | `time_clock_service.build_report` through the `python_builder` (02 section 4.2); `rpt_time_clock` for reconciliation only | `work_date` (office-local date of `clock_in`) | punch office `time_clock_entries.office_id` (NULL on legacy rows) | none | employee `time_clock_entries.user_id` |

A NULL office (Audit Trail PRINT rows, legacy punches) is the member "Unassigned office": included for callers who may read
all offices, excluded for office-restricted callers (data card 5.1 rule 3). The provider's home office is never an
attribution.

**Sign conventions.** Money is display-final, quantised `ROUND_HALF_UP` to 2 decimals, negatives with a leading minus and
no currency symbol (legacy samples, research 2.2). Payments print negative where a ledger amount is shown (Audit Trail
`Tran Amt.` of a payment or credit adjustment); balances and amounts owed print positive (Uncollected Copay balances,
instalment amounts). Hours print as decimal hours (2 places) and as `hh:mm`.

**Page furniture** (research 2.2, kept). Header: organisation name, printed title (`title_templates[]`: the legacy title,
plus `- Summary` / `- Employee Total Only` per format), `Office : <office name>` band as the outer group when several
offices are in scope (`fixed_outer` with `when ["ctx", "multi_office"]`; not on Audit Trail, whose legacy output is one
chronological list). Footer (`criteria_echo = footer`): `From` / `Thru` (Billing Date on r01), `Office(s)`, `User : ALL`
or the selected labels, `Audit Type : ALL`, `Module Type : ALL` (r03), report-specific starred notes (`* Detail Report`,
`* Weekly Overtime calculations are not considered for this report` on r04 Detail), `Printed : <office-local date time>`,
`By : <user>`, `Page : n of m`. The vendor copyright line is replaced by the organisation name and the DentC product line.
Every run warning from `availability[]` prints in the criteria block.

**Rights and data classes.** Right family `management`: `reports_management_reports_screen_view_only` (run, view) /
`reports_management_reports_screen_full_control` (also print, PDF; XLSX and CSV also need `reports_export_data_files`), 08
section 2.3, PD-10. Per-report overrides (08 2.3): `management.audit_trail` needs the key class `user_activity`
(default grant: full-access roles only until the administrator decides the segregation conflicts, 08 R-15);
`management.time_clock_report` has the user restriction `self_unless_privileged` with exempting class `payroll_time`, and
wage columns and `include_wages` need `payroll_wage`. Classes (08 5.1): patient identity, appointment and service facts,
financial notes `phi_identified`; money on a patient, account or contract row `financial_patient`; office or day totals
`financial_practice`; a provider label on a schedule or contract row `aggregate`; audit rows, the actor and the description
of a change `user_activity`; punches and hours of other users `payroll_time`; rates and pay `payroll_wage`.

**Cost and caching.** r01, r02, r04 are `interactive`; r03 is `interactive` and escalates to `background` when the range
exceeds 31 days or `office_ids = all` with more than one office (`escalate_when`, 02 4.9). `cacheable = false` on r03 (audit
content, one-off review) and r04 (user restriction, UR-3); r01 and r02 opt in with a 300 s TTL keyed on the data-version
markers of their datasets. `schedulable`: true for all four (r03 from the hub panel only; the patient-dialog entry is not
schedulable because it defaults to a patient-context token).

**Family-wide enhancements** (additive; untouched defaults reproduce the legacy run).

| Enhancement | Parameter / feature | Detail |
|---|---|---|
| Relative-date saved views | `date_preset` (`today`, `yesterday`, `week_to_date`, `last_week`, `month_to_date`, `last_month`, filter card 7.4; r04 declares `week_start: payroll`) and the NEW presets `current_pay_period`, `previous_pay_period` (r04; owner 04 section 7.4, same request as `my_reports.time_clock_report`) | "Yesterday's uncollected copays", "Audit trail - last week", "Hours - previous pay period" saved once and re-resolved per run (ENG-28, UX-19) |
| Scheduled delivery | `report_schedules` (02) | r02 every office day after close, r03 weekly to the owner (link only, PD-12), r04 at pay-period end; r01 each morning before posting |
| Multi-office band | `fixed_outer` office level | Office band and office subtotals when `ctx.multi_office`, on r01, r02, r04 |
| Dashboard drills | 06 tiles | `uncollected_copay_amount`, `otc_collection_pct` -> r02; `voided_entries_count`, `backdated_entries_count` -> r03; `clocked_hours` -> r04; `ortho_installments_unposted_amount` -> r01 |

**Family-wide open questions.**

| # | Question | Check on the live legacy tool / decision owner |
|---|---|---|
| F-1 | Contents of the OFFICE/GROUP > SELECT dialog (and its Office Group variant) and of the User > SELECT dialog (r03, r04): inactive users listed? sort order? | Live tool, FLT-23 |
| F-2 | Do multi-office runs repeat the report per office (Office band) on r01, r02 and r04 as on the other categories? | Live tool |
| F-3 | Default grant of `user_activity` (Audit Trail) to the office-manager groups that also post transactions (segregation conflict) | Product owner, 08 R-15 / SEC-30 |

<!-- WORK-ITEMS -->
| RPT-MGMT-01 | Management family skeleton: four definitions with report keys, legacy names and pre-2021 aliases, category `management`, right family `management`, `legacy_actions[]` (CLEAR CRITERIA, PRINT / PREVIEW, ADD TO MY FAVORITES), hidden `output_format` on r03 / r04, title templates, criteria echo, `availability[]` codes | P2 | S | ENG-03, ENG-05, ENG-18, SEC-03 | `GET /reports/catalog` lists the four `management.*` entries in legacy order with their aliases; a search for "Regular Payment Plan Charges Report" finds r01; definition lint passes against `catalog/parity/management_reports.parity.json` |
| RPT-MGMT-02 | Hub category page and classic frame for Management: SELECT REPORT list in legacy order, section layout per screenshot (r02 REPORT FORMAT and PRINT FORMAT side by side; r03 / r04 OFFICE/GROUP and USER side by side) | P2 | S | UX-05, UX-06, RPT-MGMT-01 | The classic frame renders each criteria panel with the same sections, order and defaults as the legacy screenshots; FLT-20 parity default test passes for all 32 controls |
| RPT-MGMT-03 | Family security profile: `management` family checks, `user_activity` key class on r03, user restriction and `payroll_time` / `payroll_wage` on r04, office rule for NULL-office rows ("Unassigned office") | P2 | M | SEC-05, SEC-06, SEC-07, SEC-19, SEC-30 | Security suite: a View Only holder runs but cannot print or export; a caller without `user_activity` gets 403 on r03; an office-restricted caller never receives NULL-office rows; a caller without `payroll_time` receives only own punches with `scope_user_ids = [caller]` |
| RPT-MGMT-04 | Family availability warnings and era notes: `contracts_app_era_only` (r01), `patient_portion_derived` (r02), `audit_since_go_live`, `close_out_not_recorded`, `appointment_moves_not_recorded`, `charge_before_after_missing` (r03, each cleared by its DATA item), `legacy_wall_clock`, `auto_closed_zero`, `office_unknown_legacy` (r04) | P2 | S | DATA-02, RPT-MGMT-01 | Each warning appears on screen and in the PDF criteria block exactly when its condition holds on the fixture tenant and disappears when the readiness flag of its DATA item is set |
<!-- /WORK-ITEMS -->
