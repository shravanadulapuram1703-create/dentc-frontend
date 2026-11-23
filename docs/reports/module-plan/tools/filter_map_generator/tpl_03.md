## 6. Office scope

### 6.1 One parameter, four value keys, no state by absence

The legacy OFFICE/GROUP section (92 reports; LOCATION on one more) is one parameter `office_scope` of type `office_scope`. It
contributes the three value keys named by the brief and by 02 - `office_ids`, `office_group_id`, `all_offices` - and a fourth,
`office_group_ids`. In the form the radio is `office_scope.mode` and the picker is `office_scope.selection`; that pair is form
state and is never sent as such. Every state of the form has an explicit value. A missing key is never a state: it means "use
the definition default", for the form, a saved view, a schedule, a URL and an API caller alike (13.2 action 2).

| `mode` | `selection` | Meaning | `params` sent | Saved view: `office_policy`, `office_scope` (02 section 8.2) |
|---|---|---|---|---|
| `office` | `working_office` | The office the user is working in. Legacy default (box shows the office id, 108 in the captures) | `office_ids: {"token": "working_office"}` | `follow_working_office` |
| `office` | `[108, 112]` | The listed offices (vendor documentation: one or more offices the user can access) | `office_ids: [108, 112]` | `fixed`, `{office_ids: [108, 112]}` |
| `office` | `all` | Legacy `ALL`: every office the caller may read - the tenant for a caller with the view-all right, the allowed offices otherwise. Never an error | `office_ids: "all"` | `fixed`, `{office_ids: "all"}` |
| `office` | `my_offices` | The caller's assigned offices plus the working office (enhancement) | `office_ids: {"token": "my_offices"}` | `assigned_offices` |
| `office_group` | `[4]` | The offices of one office group | `office_group_id: 4` | `fixed`, `{office_group_id: 4}` |
| `office_group` | `[4, 7]` | The union of the offices of several groups | `office_group_ids: [4, 7]` | `fixed`, `{office_group_ids: [4, 7]}` |
| `office_group` | `all` | Every office group: the offices that belong to a group; in a tenant without groups, every office the caller may read (vendor documentation). The default when Office Group is chosen | `office_group_id: "all"` | `fixed`, `{office_group_id: "all"}` |
| - | - | Strict tenant-wide read for API callers, analytics endpoints and drill links. Never sent by the form | `all_offices: true` | `fixed`, `{all_offices: true}` |

| Rule | Detail |
|---|---|
| Exactly one key | More than one of the four keys: 422 `invalid_parameter`, reason `conflicting_office_keys` |
| Absent keys | The parameter takes its definition default (`{"token": "working_office"}` on 91 of 92 reports). Nothing is encoded by absence |
| `"all"` versus `all_offices: true` | `office_ids: "all"` is the legacy ALL: it resolves to what the caller may read and cannot fail for a caller who may read any office. `all_offices: true` keeps the platform meaning [V `require_all_offices`]: tenant-wide, or 403 `office_not_assigned` |
| Several groups | `office_group_ids` resolves to the union of `office_group_office_ids(group)` [V] of each group, intersected with the caller's allowed offices; the criteria echo prints the group names. An office belongs to at most one group (`offices.office_group_id` [V]) |
| `all` in group mode | Offices whose `office_group_id` is set, intersected with the allowed offices; all allowed offices when the tenant defines no group. An office that belongs to no group is not part of a group run [I - the legacy dialog was not captured, 11.2] |
| `my_offices` | Offered to every caller who has assignments; for a caller with the view-all right it narrows the run to their own offices |
| Saved views | `assigned_offices` is the stored form of the token `my_offices`; every other value is `fixed` with the value key as stored, `"all"` included. A view never widens access: `"all"` resolves for whoever opens it |
| Legacy favorites pinned to an office | A saved view that stores the token `working_office` follows the working office (`follow_working_office`); one that stores ids is `fixed` |
| Resolved form | `office_ids: [ids]`, or `null` for a tenant-wide run (02 section 4.1), stored on the run beside the request keys of `params_input` |

### 6.2 Resolution

Who may read which office is the engine office rule of 02 section 4.1 (`app/reports/scope.py`, NEW, ENG-07) and 08 section
4.1; this section fixes how each value of 6.1 resolves against it. The platform resolver is not used: it treats a caller
without any `user_offices` row, and every caller while `OFFICE_SCOPE_ENFORCED` is off, as tenant-wide [V
`OfficeScope.unrestricted()` in `app/services/office_scope_service.py`], which 02 and 08 do not accept for bulk PHI and
financial output. Reused from the platform [V]: `OfficeScope.assigned_ids`, `office_group_office_ids`. Report SQL only ever
sees the resolved office list. "View-all right" below is short for a report-unrestricted caller.

| Caller | Allowed offices |
|---|---|
| Report-unrestricted, as 08 S-3 defines it: a full-access role, or a strict holder of `office_scope_view_all_offices`. The scheduling alias of that code does not count (open decision 13) | Every office of the tenant |
| Has office assignments | The assigned offices |
| No assignment and not report-unrestricted | None: a run that needs an office set is 403 `office_not_assigned` with `details.reason = "no_office_assignment"` (08 S-4). `REPORT_UNGATED_OFFICE_ACCESS` (default off, 02 section 4.1) restores the platform rule for a client whose assignments are not set up yet |

The handler of this document (FLT-03) needs two results of that rule: the allowed office set and the report-unrestricted flag.

| `params` | Resolved | Check |
|---|---|---|
| `office_ids: {"token": "working_office"}` | `[working_office_id]` | `working_office_id` of the request body must lie in the allowed set (403 `office_not_assigned`); missing: 422 `parameter_required` |
| `office_ids: {"token": "my_offices"}` | Assigned offices plus the working office | Empty: 403 `office_not_assigned` |
| `office_ids: [108, 112]` | The list | Each id must be in the allowed set: 403 `office_not_assigned` with `details.office_id`, `details.assigned_office_ids` |
| `office_ids: "all"` | Caller with the view-all right: tenant-wide (`null`). Otherwise the allowed set | Never 403 for a caller who may read an office |
| `office_group_id: 4`, `office_group_ids: [4, 7]` | Offices of the group or groups, intersected with the allowed set | Empty result: 403 `office_not_assigned`, never an empty report |
| `office_group_id: "all"` | Offices that belong to a group, intersected with the allowed set; the allowed set when the tenant has no group | As above |
| `all_offices: true` | Tenant-wide | View-all right required, else 403 `office_not_assigned` |

The resolved office list is printed in the criteria echo. Rows without an office (the "Unassigned office" member of 03 section
5.1) belong to tenant-wide runs only. The analytics endpoints and drill links of 02 keep passing `all_offices`, `office_ids`
(repeated keys) and `office_group_id` as query parameters, as `OfficeScopeDep` reads them [V]; the engine applies the same
allowed-set rule to them.

### 6.3 Defaults

| Item | Rule |
|---|---|
| Default | `office_ids = {"token": "working_office"}` on 91 of 92 reports; `office_ids = "all"` on 835 Denial Report (the report's normal opening state per vendor documentation). A restricted caller who opens that report gets their allowed offices, not an error |
| Working office | Read from `useOfficeScope().office_id` [V] and sent as `working_office_id` with every run, validate, options and saved-view resolve request; never parsed from the `OFF-<id>` string and never taken from the `X-Office-ID` header |
| Mode switch | Changing the mode resets the selection: `working_office` for `office`, `all` for `office_group` |
| Office list | `useOfficeOptions()` [V]; permitted offices first, the others listed disabled with the reason |
| Group list | `listOfficeGroups` [V generated client]; NEW shared hook `useOfficeGroups`; a group without a permitted office is listed disabled |
| Context facts | Scope resolution sets `ctx.multi_office` (the resolved set holds more than one office) and `ctx.provider_restricted`. It runs before the dependency rules (13.2), so the two Group By Office checkboxes can depend on it (9.3). The form never computes these facts: the validate response returns them in `ctx{}` together with `disabled[]` (13.2) |

### 6.4 Reports where the scope is locked

Locks are fields of the parameter in the report definition (`validation.allowed_modes`, an unconditional `forced_when`), not
dependencies. `forced_when` attaches to the parameter `office_scope`; its `value` is an object of value keys and replaces all
four keys at once.

{{T_LOCKS}}

### 6.5 Reports without an office control

{{N_NO_OFFICE}} of the 118 reports show no office section. The definition still declares how the run is scoped (`scope.office_mode`
of 02): `none` on 18 of them, `optional` with a hidden scope on the three fee-schedule lists, `required` on Statements. 08 S-10
allows `none` for organisation-level catalogs and single-patient definitions; it still counts the three fee-schedule lists and
Referral Source List among the catalogs (open decision 10). The three referral management reports are not in this list: they
carry `referred_from_office_scope` and / or `referred_to_office_scope` instead.

{{T_NO_OFFICE}}

Catalog rule. A hidden scope of an office-pinned catalog defaults to `all`; the builder keeps the rows whose office is in the
resolved set plus the rows without an office (`include_global` of the platform [V `resolve_list_office_filter`, `kind =
"catalog"`]). The option sources `fee_schedules` and `referral_sources` apply the same rule, so a picker never lists a row that
the Setup screen hides from the caller. Referral Source List is the same case with a visible, display-only control (6.4):
`referrals` is registered with `office_scope=_CATALOG` as well [V `app/api/v1/registry.py`].

### 6.6 Rights

| Concern | Rule | Source |
|---|---|---|
| Office outside the caller's allowed set | 403 `office_not_assigned` with `details.office_id`, `details.assigned_office_ids` | 02 section 4.1 |
| Tenant-wide read | Needs the view-all right (08 S-3). A caller without any assignment is not tenant-wide: refused (08 S-4), unless `REPORT_UNGATED_OFFICE_ACCESS` is switched on for the client (02) | 02 section 4.1 and decision 13 of its section 18.2; 08 section 4.1 |
| Office Group mode and multi-office runs | No extra right: the 13 `reports_group_reports_*` codes are deactivated and office assignments govern (08 S-5 and decision 3 of its section 13.2). A group is intersected with the allowed offices | open decision 3 |
| Narrowing of the modes | `validation.allowed_modes` of the definition served to a caller is narrowed from the office scope only (08 section 13.3): Office Group is dropped when no group holds an office the caller may read. No right removes a mode | 08 |
| Frontend | Uses `allowed_office_ids` and `can_view_all_offices` of `useOfficeScope()` [V] for display only; the permitted modes and offices come from the server, because the frontend role-token match differs from the server role set [V analysis] | - |
| Existing roll-ups | `/reports/summary`, `/trends`, `/accounts-receivable`, `/aging`, `/insurance-verification-summary` take a bare `office_id` and no scope dependency [V analysis]; ENG-16 moves them behind the engine rule in P0 | brief section 6 |

### 6.7 More than one office scope on a report

`referred_from_office_scope` and `referred_to_office_scope` have the same type and the same translation; their value keys carry the
prefix (`referred_from_office_ids`, `referred_from_office_group_id`, `referred_from_office_group_ids`,
`referred_from_all_offices`, and the `referred_to_` twins). A definition marks the `office_scope`-typed parameter that feeds the
scope resolution of 6.2 with `security_scope: true` (addition, 13.1). An unmarked one is a plain filter: `all` adds no
predicate, and listed offices or groups must still be ones the caller may read (08 S-2).

| Report | Security scope | Other scope |
|---|---|---|
| External Outgoing Referral Management | `referred_from_office_scope` | - |
| External Incoming Referral Management | `referred_to_office_scope` | - |
| Internal Referral Management | Neither parameter: 08 S-13 makes a row readable when its referred-from **or** its referred-to office is in the caller's allowed set, so a receiving office reads the referrals addressed to it. The scoped handle applies that two-column rule (requested by 08 from 02 and 03) | Both are filters inside that set: `referred_from_office_scope` (default `working_office`; it also gives the reference time zone of 7.5) and `referred_to_office_scope` (default `all`) |

### 6.8 Gaps in today's code

| Gap | Evidence |
|---|---|
| `ReadScopeMode` is `office` / `my_offices` / `all`; no group mode, no arbitrary office set | [V] `src/features/office-scope/useReadScope.ts` |
| No shared `useOfficeGroups` hook; three screens call `listOfficeGroups` directly | [V analysis] |
| The platform scope dependency accepts one `office_group_id` and has no value `"all"` for `office_ids`; `listOfficeGroups` filters by `search` only | [V] `get_office_scope`, `openapi.json` |
| `OfficeScopeParam` does not exist; the existing report filter panel offers one office | [V analysis] |

---

## 7. Dates

### 7.1 Model

| Element | Rule |
|---|---|
| Primary range | Parameter `date_range`; value keys `date_from`, `date_to`, `date_preset`. At most one per report. It is the report period: presets, comparison and drill links act on it |
| Date basis | Every report states it (AD-9): the parameter `date_basis` where the legacy screen has a basis radio (10 reports), `date_basis_set` on Insurance Plan List, otherwise `date_basis` of the report definition (02 section 3.1) with the fixed value of 7.2 |
| Secondary ranges | Named ranges on another date, value keys `K_from`, `K_to`, `K_preset`: the attribute ranges `ortho_start_date`, `first_visit_date`, `ortho_first_visit_date`, `ortho_last_visit_date` and `last_visit_date` (optional, blank = no restriction) and `appointment_created_date` (applies when `date_range_type` selects it). Several can coexist with the primary range |
| Single dates | `report_date`, `billing_date`, `due_date`, `statement_date`, `statement_sent_date` |
| Value | `K_preset` holds a preset name of 7.4 and the server fills `K_from` / `K_to`; with `custom` (or no preset) each side holds an ISO date `YYYY-MM-DD` or a relative token. Typed and displayed as `MM/DD/YYYY`; a relative token is typed as text (`today-30d`), which is why the control is a parsing text input and not the native date input (13.4) |
| Bounds | Inclusive on both ends |
| Legacy default | Both boxes show the capture date: the definition default is `{"date_preset": "today"}`; the parity default of each box is the token `today` |

### 7.2 Every legacy date section

{{T_DATES}}

The Statements screen row `Statement Date` maps to `statement_date` as well; its captured default is one day before the capture
date, so the default rule is unconfirmed (section 11.5).

**Fixed basis of the {{N_FIXED}} reports whose DATE RANGE has no basis control.** A parity report keeps the basis of the legacy
report. PD-8 (service date for operational dashboards) applies to dashboards and new analytics, not to parity definitions.
Evidence: {{FIXED_EV}}. Every inferred row is an item of FLT-23 (11.5).

{{T_FIXED_BASIS}}

### 7.3 Date basis vocabulary

Values name the office-local `DATE` column of the dataset (`date_columns{date_basis: column}` of 02 section 4.2; 03 section 4.1).
A value means the same thing in a `date_basis` parameter and in a fixed `date_basis` of a definition.

| Value | Meaning | Legacy wording | Data caveat |
|---|---|---|---|
| `transaction_date` | Ledger date of the line (posting date) | Transaction Date | Vendor sources disagree whether it is the entered date or an editable ledger date |
| `service_date` | Date of service | Service Date, DOS Date, PROCEDURE DATE RANGE | - |
| `created_date` | Entry time stamp of the row, as office-local date. One value for every entity: on appointment datasets it is the creation date of the appointment | Created Date, Created On Date, CREATED DATE RANGE, CREATED ON DATE RANGE | Migrated rows carry the migration time as `created_at`, migrated appointments carry none; reliable for rows created in the app only |
| `payment_date` | Date the payment applies to | Payment Date, By Payment Date | - |
| `appointment_date` | Appointment date | Appointment Date, APPOINTMENT DATE RANGE; All on Lab Cost Report (to confirm) | - |
| `lab_sent_date`, `lab_due_date`, `lab_received_date` | Date the lab case was sent, is due, was received (`lab_sent_on`, `lab_due_on`, `lab_received_on` of 03) | Sent Date, Due Date, Received Date (radio REPORT TYPE of Lab Cost Report) | The existing endpoint calls the same choice `date_basis` with `sent`, `due`, `received` [V `GetLabCostReportDateBasis`] |
| `file_received_date` | Date the 835 file was received | By File Received on Date | No remittance file entity today |
| `diagnosed_date` | Diagnosed date of the planned procedure | DIAGNOSED DATE RANGE | Treatment-plan history is app-era only |
| `referral_date`, `referred_out_date` | Date of the referral case; date the patient was referred out | REFERRAL DATE RANGE, REFERRED OUT DATE RANGE | No referral-case entity today |
| `scheduled_date`, `recall_due_date` | Date of the scheduled recall appointment; recall due date | SCHEDULED DATE RANGE, RECALL DATE RANGE | Recall has no migrated rows |
| `ortho_visit_date` | Date of an Ortho Treatment Card entry | VISIT DATE; PATIENT FIRST VISIT and PATIENT LAST VISIT on the two ortho reports | No ortho visit log today |
| `plan_setup_date` | Date the payment plan was set up | PLAN SETUP DATE RANGE | - |
| `holiday_date` | Provider or office holiday date | LAST VISIT DATE RANGE (mislabel on Provider Holidays); DATE RANGE of Office Holidays | - |
| `anniversary_date` | Plan anniversary date | ANNIVERSARY DATE RANGE | - |
| `modified_date` | Date of the last change | Modified On (`date_basis_set`); DATE RANGE of Audit Trail | Legacy string stamps on plans |
| `work_date` | Office-local date of the clock-in | DATE RANGE of the two Time Clock reports | Legacy punches are wall-clock values (03) |
| `claim_printed_date` | Date a claim was printed | DATE RANGE of Claims Printed | Prints are not recorded today (NEW) |
| `all` | No date restriction. Used by Claims Not Created only and never reused for another meaning | ALL | - |
| `deposit_date` | Deposit date | none (AD-9; needs the deposit entity of PD-9) | NEW |

`appointment_created_date` is not a basis value. It is the key of the secondary range of DPS Eligibility Report and a value of
`date_range_type`; that range reads the `created_date` column of the appointment dataset.

### 7.4 Relative tokens and presets

```
token  := anchor { ("+" | "-") integer unit }
anchor := today | yesterday | tomorrow
        | start_of_<period> | end_of_<period>
        | start_of_last_<period> | end_of_last_<period>
        | start_of_next_<period> | end_of_next_<period>
period := week | month | quarter | year
unit   := d | w | m | y
```

Offsets apply left to right; month and year arithmetic clamps to the last day of the month. Examples: `today`, `today-30d`,
`start_of_month`, `end_of_last_month`, `start_of_next_month+1y-1d`.

| Week start | Rule |
|---|---|
| Default: `week_start: iso` | The week starts on Monday: the week of `rpt_dates.week_start` (03 section 2.1), of the period rule of 03 section 4.3 and of `reportRange.ts` [V]. It is not an organisation setting, so presets and the weekly columns of the datasets always agree |
| `week_start: payroll` on a definition | The token resolver reads the organisation's payroll week, `time_clock_settings.week_start_day` (one row per tenant, default `sunday` [V `app/db/models/staff.py`]) for `start_of_week`, `end_of_week` and their `last_` / `next_` forms. The two Time Clock reports declare it - `timeClockModel.ts` hard-codes Sunday today [V] - so their presets keep their dates |

Naming rule of the presets: `<period>_to_date` ends today, `this_<period>` is the whole current period, `last_<period>` the
whole previous one.

| Preset (value of `K_preset`) | `K_from` | `K_to` |
|---|---|---|
| `today` (legacy default) | `today` | `today` |
| `yesterday` | `yesterday` | `yesterday` |
| `week_to_date` / `this_week` / `last_week` | `start_of_week` / `start_of_week` / `start_of_last_week` | `today` / `end_of_week` / `end_of_last_week` |
| `last_2_weeks` | `start_of_last_week-1w` | `end_of_last_week` |
| `month_to_date` / `this_month` / `last_month` | `start_of_month` / `start_of_month` / `start_of_last_month` | `today` / `end_of_month` / `end_of_last_month` |
| `quarter_to_date` / `this_quarter` / `last_quarter` | `start_of_quarter` / `start_of_quarter` / `start_of_last_quarter` | `today` / `end_of_quarter` / `end_of_last_quarter` |
| `year_to_date` / `this_year` / `last_year` | `start_of_year` / `start_of_year` / `start_of_last_year` | `today` / `end_of_year` / `end_of_last_year` |
| `last_7_days`, `last_30_days`, `last_90_days` | `today-6d`, `today-29d`, `today-89d` | `today` |
| `trailing_12_months` | `start_of_month-11m` | `today` |
| `upcoming_benefit_year` (legacy default of Benefits Used/Unused) | `start_of_next_month` | `start_of_next_month+1y-1d` |
| `custom` | ISO date or token | ISO date or token |

A preset is only a named pair of tokens; every legacy range default is a preset, so 02 can store a view as `date_preset` alone.
`custom` with ISO dates is a fixed range (02 section 8.2); `custom` with tokens is a relative range and needs the token resolver of
FLT-04 in `resolve` as well. Every preset except `custom` is an enhancement beside the two legacy boxes.

One implementation replaces the two existing preset sets. They use the same names for different ranges, so each existing preset
is renamed by this table and no stored selection changes its dates (ENG-20 for the six existing reports, ENG-34 for the Time
Clock report):

| Existing preset [V] | Its range today | New preset |
|---|---|---|
| `RangePreset` `today`, `yesterday` (`src/components/reports/lib/reportRange.ts`) | the day | `today`, `yesterday` |
| `RangePreset` `this_week` | Monday to today | `week_to_date` |
| `RangePreset` `this_month`, `this_quarter`, `this_year` | first day of the period to today | `month_to_date`, `quarter_to_date`, `year_to_date` |
| `RangePreset` `custom` | two dates | `custom` |
| `PeriodKey` `today` (`src/features/time-clock/timeClockModel.ts`) | the day | `today` |
| `PeriodKey` `this_week` | Sunday to Saturday of the current week | `this_week` on the payroll week |
| `PeriodKey` `last_week` | the previous Sunday to Saturday | `last_week` on the payroll week |
| `PeriodKey` `last_2_weeks` | the two whole weeks before the current one | `last_2_weeks` on the payroll week |
| `PeriodKey` `this_month`, `last_month` | the whole month | `this_month`, `last_month` |
| `PeriodKey` `custom` | two dates | `custom` |

### 7.5 "Today" and time zones

| Rule | Detail |
|---|---|
| Reference time zone | 02 section 4.7: (1) the zone shared by every office of the resolved office set - always the case for a single-office run, whatever the working office is; (2) for a set that spans zones, the zone of the working office (for a schedule: its `time_zone`) plus the run warning `mixed_time_zones`; (3) `DEFAULT_TIMEZONE` when no office is in scope. A user working in an Eastern office who runs a Pacific office at 00:30 Eastern gets the Pacific date (AD-9). Backend helper `office_today(tz_name)` [V `app/core/datetimes.py`]; `OfficeOption.timezone` on the frontend [V] |
| Who resolves | The server, once per run, after the office scope is resolved (13.2); the reference zone and the reference date are stored on the run. The validate endpoint returns the resolved dates so the form shows real dates beside presets and tokens. The browser helper `todayIsoDate()` uses the viewer's clock [V] and is not used |
| Several offices | One resolved range for the whole run, applied to each row's own office-local date (02 section 4.7). `03_data_foundation.md` section 4.3 words it as each office's own today; the two differ only when the offices span time zones (open decision 4) |
| Time stamp bases | A basis is always an office-local `DATE` column of the dataset (02 section 4.2); builders contain no time-zone arithmetic. How the column is derived from naive-UTC time stamps [V analysis] is owned by 03 |
| Legacy difference | The legacy tool stores time stamps in Pacific server time (vendor documentation); created-date results of offices in other zones can differ by design |
| Echo | Every output prints the basis, the resolved dates and the time zone |

### 7.6 Validation

| Rule | HTTP code, `error.code` (reason) |
|---|---|
| Unparseable date, token or preset name | 422 `invalid_parameter` (`invalid_date`) |
| `K_from` after `K_to` | 422 `invalid_date_range` (`range_order`) |
| Range longer than `validation.max_span_days` of the definition | 422 `range_too_large` (code already used by the time-clock report [V]) |
| Required range missing | 422 `parameter_required` |
| Disabled date (`enabled_when` false) | Replaced by `disabled_value`, not an error; a date is not required while it is disabled |

---

