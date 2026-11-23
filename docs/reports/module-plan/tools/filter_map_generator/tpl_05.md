## 10. Defaults, Clear Criteria, required parameters, validation and error messages

### 10.1 Defaults

| Topic | Rule |
|---|---|
| Source | The `default` of each parameter in the report definition equals the legacy default (`default` of the parity file; `default_map` of the signature map turns captured values into tokens, `control_overrides` gives the default of an overridden control directly). A deliberate difference needs `default_differs_reason` (02) |
| Precedence when a report opens | 1. values in the URL; 2. the saved view or favorite being opened; 3. definition defaults |
| Absent keys | A value key that is absent from a URL, a saved view, a schedule or an API request takes its definition default (13.2 action 2). Absence is never a state of its own: the office keys follow the same rule (6.1) |
| Last-used values | Never applied silently (it would break "same default"). Offered as "Restore last run" |
| Context defaults | `working_office`, `my_offices`, `current_user` and `current_user_report_provider` resolve from the caller and `working_office_id`; `current_patient`, `current_patient_name`, `current_account` and `current_responsible_party_name` from `context.patient_id` (2.3). Without the context the token resolves to empty and a required parameter reports `parameter_required` |
| Tenant-data defaults | `first_option` is resolved by the server against the option source in display order, after the `depends_on` filters. It is a definition default only where the legacy rule is documented; unconfirmed rules are `unknown_legacy` with `first_option` as the candidate (11.1) |
| Captured values that are not defaults | Office id `108` is the working office; a patient or account name in a box is the patient in context; a fee schedule name is tenant data. None of these literals is stored |
| Legacy defaults are legal values | Every legacy default passes validation with a working office and, for the Ledger reports, a patient in context (FLT-20). The generator of the map asserts it for every checkbox group (2.5) |

### 10.2 Clear Criteria

`CLEAR CRITERIA` exists on 117 of the 118 screens (not on Statements). It resets every parameter of the report to its definition
default, including `output_format` and the office scope; it does not empty the form. It also discards the "modified" state of an
open saved view. The Statements screen gets the same action as an enhancement.

### 10.3 Required parameters

| Parameter | Required when | Reason |
|---|---|---|
| `office_scope` | Always where `scope.office_mode = required`; the default supplies `working_office` | A run whose office scope cannot be resolved is refused: 422 `parameter_required` without a working office, 403 `office_not_assigned` without an allowed office |
| `date_range` (`date_preset`, or `date_from` and `date_to`) | Always for the primary range, unless the definition marks it optional or a rule disables it | Unbounded scans of the fact tables are not allowed (30 s statement limit) |
| Attribute ranges (`ortho_start_date`, `first_visit_date`, `ortho_first_visit_date`, `ortho_last_visit_date`, `last_visit_date`) | Never | Blank means no restriction |
| `appointment_created_date` | `date_range_type != appointment_date` | The range applies only then |
| `report_date` | Always, except while disabled (`date_basis = all` on Claims Not Created) | Single-date reports |
| `billing_date`, `statement_date`, `statement_sent_date` | Always | Single-date reports |
| `account_id` | Always on Account Allocation; `report_type == account_ledger` on Ledger Report | The report is per account |
| `patient_id` | Always on Patient's Notes; `report_type == patient_ledger` on Ledger Report | The run is one chart. There is no `all` and no list |
| `fee_schedule_id` | Always on Procedure Codes by Fee Schedule | The report prints the fees of one schedule |
| `output_format`, `report_format`, `report_type`, `report_by`, `sort_by`, `group_by`, `page_break_by` | Always (they have a default) | - |
| `enum_multi` groups | `validation.min_items` of 2.5: one value, or none for `appointment_statuses`, `ortho_plan_parts`, `date_basis_set` | An empty group either selects nothing or has the meaning 2.5 gives it |
| `compare_fee_schedule_id` | `include_ucr == true` | The compare column needs a schedule |
| `amount_value` | `amount_operator != all` | - |
| Restriction parameters (`user_ids`, `provider_ids` of 9.7) | Not a user input while forced | A provider-restricted run without a linked provider is refused: 403 `report_provider_not_linked`. The user-restricted reports need no provider link |

### 10.4 Validation and messages

Validation runs in the form (same rules, for immediate feedback) and always on the server. `error.code` is the code of 02 section
4.1; the finer `reason` is carried per field. Messages use the parameter label.

| HTTP, `error.code` | `reason` | Condition | Message |
|---|---|---|---|
| 422 `unknown_parameter` | - | Value key not declared by the report | "Unknown parameter {value_key}." |
| 422 `parameter_required` | - | Required value missing (`required`, `required_when`), or a context token without its context (no working office, no patient in context) | "{label} is required." |
| 422 `invalid_parameter` | `invalid_option` | Value is not a declared option | "{value} is not a valid choice for {label}." |
| 422 `invalid_parameter` | `invalid_date` | Not a date, token or preset | "{label} must be a date (MM/DD/YYYY)." |
| 422 `invalid_parameter` | `invalid_number` | Not a number, or outside `validation.min` / `max` | "{label} must be a number between {min} and {max}." |
| 422 `invalid_parameter` | `range_order` | Start after end on a number or text range | "{label}: the start must not be after the end." |
| 422 `invalid_parameter` | `min_items` | Fewer values than `validation.min_items` | "Select at least one {label}." |
| 422 `invalid_parameter` | `max_items` | More values than `validation.max_items` on a search source | "{label}: select at most {max_items} values or choose All." |
| 422 `invalid_parameter` | `conflicting_office_keys` | More than one office key | "Choose offices or an office group, not both." |
| 422 `invalid_date_range` | `range_order` | Start date after end date | "{label}: the start must not be after the end." |
| 422 `range_too_large` | - | Range longer than `validation.max_span_days` | "{label} is limited to {max_span_days} days for this report." |
| 422 `unknown_reference` | - | Value unknown to the option source, or not permitted | "{label}: {count} selected value(s) are no longer available." |
| 403 `office_not_assigned` | - | Office outside the allowed set; office group with no permitted office; `all_offices` without the view-all right; caller without any allowed office | "You are not assigned to {office}." |
| 403 `report_provider_not_linked` | - | Provider-restricted run without a linked provider | "No Corresponding Provider is set for your user." |
| 403 `patient_not_in_office` | - | `patient_id`, `account_id` or the patient in context is a chart the caller may not open (08 S-10) | Owned by `08_security_compliance.md` |
| 403 `data_class_denied`, `permission_denied` | - | Data class or report right missing | Owned by `08_security_compliance.md` |
| no error | `value_disabled`, `value_forced` (in `warnings[]`) | Value sent for a disabled, hidden or forced parameter | Replaced; the form shows nothing |

### 10.5 Error shape

The existing envelope `{ "error": { "code", "message", "details" } }` [V `app/schemas/common.py`] is kept. `details.errors[]` has
the item shape of `errors[]` returned by `POST /reports/definitions/{report_key}/validate` (02 section 13 row 3, shape fixed here);
`error.code` is the code of the first entry.

```json
{ "error": { "code": "invalid_date_range", "message": "2 criteria need attention.",
  "details": { "errors": [
    { "param": "date_range", "value_key": "date_to", "code": "invalid_date_range", "reason": "range_order",
      "message": "Date range: the start must not be after the end." },
    { "param": "transaction_types", "value_key": "transaction_types", "code": "invalid_parameter", "reason": "min_items",
      "message": "Select at least one Transaction types." } ] } } }
```

HTTP 422 for parameter errors; 403 keeps `office_not_assigned` and `permission_denied` exactly as today. The form maps
`details.errors[].param` to the control and shows the message inline; the global error toast is suppressed for these codes.

---

## 11. Unknowns to confirm on the live legacy tool

Every row is an item of work item FLT-23. After the check, `legacy/*.json`, the control index, `signatures.json` and
`signature_map.json` are regenerated.

### 11.1 Collapsed dropdown lists (23 signatures)

No dropdown was captured open. "Lookup" lists are tenant data, so parity means the same option source, not a fixed list; "static"
lists are part of the legacy tool and stay `unknown_legacy` until read. A default rule that is only inferred is `unknown_legacy`
as well; the rule of FINANCIAL DISCLOSURE is documented and stays `replicated`.

{{T_DROPDOWNS}}

`REPORT BY` (sig0196) is one collapsed dropdown signature on five reports with five different lists. Three lists are known from
vendor screenshots and are mapped per control (15.4); the values enter the control index as `vendor_doc_options` through
`tools/apply_supplement.py`, and `validate_parity.py` then refuses `unknown_legacy` for those three controls.

{{T_REPORT_BY}}

### 11.2 Picker dialogs never captured (49 signatures, {{N_PICK_CONTROLS}} controls)

The entity behind each picker is in section 5. Vendor documentation shows three dialogs (offices, procedure codes, treatment plan
statuses); every other dialog must be opened once.

| To record per dialog | Why |
|---|---|
| Dialog title, list columns, sort options | Confirms the entity (decisive for `INSURANCE PLANS/SUB TYPES`, `VENDORS`, `ORTHO STATUS`, `EXCLUDE REASON CODE`, `REFERRED TO`, `REFERRED FROM`; the full list of `PRINT NOTES`) |
| Whether inactive rows are listed | "Include inactive" behaviour of the option source |
| Whether the list follows the selected offices | Provider, operatory, lab and user lists |
| Single or multiple selection | The `PATIENT` and `RESPONSIBLE PARTY` boxes; the Office Group dialog |
| What the box shows after a selection (ids, codes, names, count) | Criteria echo on the output |
| Office Group mode on any report | Never captured: picker content, default (`ALL` per vendor documentation), whether several groups can be picked, whether `ALL` covers offices that belong to no group |
| Value lists that do not exist in DentC | Ortho statuses, confirmation vendors, 835 reason codes, cancellation reasons (system and office-defined), appointment lengths |
| Responsible-party type list | Vendor documentation names `CA - Cash`, `CC - Collections`, `IN - Indemnity`, `OO - PPO`; the seeded DentC list is `CA`, `CO`, `DI`, `IN`, `ST`, `WO` and is marked provisional in the backend seeder [V] |

### 11.3 Unreadable entries (4 controls)

{{T_UNREADABLE}}

### 11.4 Screens cut off by the screenshot (11 reports)

{{T_TRUNC}}

### 11.5 States, defaults and controls that the captures cannot show

One state per report was captured. Sections 9.5 to 9.7 list the dependencies and absent controls already known from vendor
documentation; the rest is open:

| Item | Report(s) | To confirm |
|---|---|---|
| Other states of variant selectors | Appointment List (4 list types), Lab Report (3), Progress Notes (Unsigned), Benefits Used/Unused (Recall), Ledger Report (Patient Ledger), Production Report (Category, Carrier), Patient List - New Patient (4 other values), Patient List - Grouped By (11), Responsible Party List (3) | Which controls appear, disappear, unlock or change label. Until then every unobserved state leaves the controls enabled (9.2) |
| Other states of switches | PLAN TYPE = Ortho, AGING BY = Patient AR, No Recall Date, DATE RANGE TYPE = Appointment Created Date / Both, GROUP BY not None, Include UCR ticked, Age Range unticked on the recall reports, Office Group mode on the Time Clock reports | Enabled sets and labels |
| The three `unknown` rules | Daily Journal (`Show AR`), Insurance Plan List (Start Date / End Date greyed although Modified On is ticked), Statements (`PAPER STATEMENT SENT`) | What enables each; for PAPER STATEMENT SENT also what it does |
| `Email` / `Both` greyed | Responsible Party - Statements Sent | What enables them (two `unknown` option rules) |
| Fixed date basis | The inferred rows of 7.2 | Which date the range filters |
| REPORT TYPE = All | Lab Cost Report | Which date the range is matched against (assumed: appointment date) |
| REPORT BY | My Daily Journal | The value list, and what each value restricts (assumed: User = own entries; every other value is treated as provider-type until read) |
| Own-data restriction | My Reports Missing Progress Notes | How the legacy tool restricts the report while the Provider picker shows ALL. Until then the picker is forced to the linked provider for a provider-restricted caller (9.5, evidence `policy`) |
| Appointments of whom | My Reports Appointment Detail by User | Whether "by User" is the creating user |
| Patient box | Patient's Notes | Whether it is pre-filled from the patient in context (captured empty); whether it holds exactly one patient |
| REPORT FORMAT = Patient Ledger | Ledger Report | The panel: patient selector in place of the responsible party |
| Pre-fill of name ranges | Walkout Report, Super Bill | Whether the box holds `Last, First`; on Walkout Report whether it is the patient or the guarantor (test with a dependent) |
| Name range comparison | Every name range | What SEARCH writes into the box; whether `C` as End Name includes names starting with C; whether the same person in both boxes returns exactly that person |
| `No Recall Date` | Recall Due Report | Whether it lists patients without a recall due date (assumed) |
| Two ortho ranges | Ortho Report | Both ranges default to today: combined with AND; whether a patient without an ortho start date is listed |
| Empty checkbox groups | Appointment List (Status with Call List), Payment Plan Charges (Ortho parts with PLAN TYPE = Ortho), Insurance Plan List (neither box, both boxes) | What an empty group prints; whether both date boxes mean created or modified |
| Payments without a category | Allocation Detail | Whether a payment code without a tender category prints when all six boxes are ticked (assumed: yes) |
| Behaviour of All in a status grid | External referral reports | Whether ticking a status unticks All |
| Single day or as-of | Claims Not Created | That the Report Date is one day on the chosen date (vendor documentation) and not an as-of date |
| Fee schedule list | Capitation Utilization | Why its default differs from the Production Reports: list restricted to capitation schedules, or another default rule |
| Empty `CODES` box | Treatment Plan Detail | Whether empty means all codes or a code is required |
| Day list of "within last [n] days" | Statements | Whether it is really enabled while the checkbox is unticked |
| `Statement Date` default | Statements | Captured one day before the capture date |
| Statement message boxes | Statements | Why the six boxes were not rendered in our capture (setting, permission or state); position of the `Remaining Characters` counter |
| Third OTHER OPTIONS row | Treatment Plan Proposal | Label, type and default |
| `GROUP BY` controls | Internal Referral Management | Options and default |
| Rows below the status grid | External Outgoing Referral Management | Whether Exclude Deleted Referrals and GROUP BY follow |
| Default of `Include Patient Home Office` | Appointment Detail | Checked or unchecked |
| Tooltips of the three info icons | Routing Slip, My Reports Production Report, Statements | Text (the Routing Slip text is known from vendor documentation) |
| `EXCLUDE PATIENT TYPE` | Special Transaction Report and the 16 others | Exclude (label) or include (vendor article) |
| Age range and missing birth dates | Recall reports, Special Transaction Report | Whether a narrowed range lists patients without a birth date (the default 0 - 999 never drops them) |
| `None` payment type | Deposit Slip | Confirmed by vendor documentation as "type field is blank"; verify the list of such codes |

### 11.6 Signatures not mapped

None. sig0103 (`INSURANCE PLANS/SUB TYPES`, Special Transaction Report) is mapped to the single parameter
`insurance_plan_selection` with status `unknown_legacy` until its dialog is read (11.2).

### 11.7 Open decisions and requests

No decision of the brief is challenged. Each item states the default this document uses.

| # | Decision | Default used here | Owner |
|---|---|---|---|
| 1 | `EXCLUDE PATIENT TYPE`: exclude (label, and the printed footer echo `ExPatType`) or include (one vendor article) | Exclude on all 17 reports | Product owner, after the live check |
| 2 | Office Group: whether the legacy dialog selects several groups, and whether `ALL` covers offices without a group | Several groups are accepted (`office_group_ids`); `all` = the offices that belong to a group, every readable office when the tenant has no group | Product owner, after the live check |
| 3 | Does Office Group mode, or a multi-office run, need one of the 13 `reports_group_reports_*` rights | No: the default of 08 (decision 3 of its section 13.2) - the codes are deactivated and office assignments govern. `validation.allowed_modes` is narrowed from the office scope only | `08_security_compliance.md`, product owner |
| 4 | "Today" when the selected offices span time zones: one range in the reference zone with the warning `mixed_time_zones` (02 section 4.7) or each office's own today (03 section 4.3) | One range per run, as 02 | Product owner; 02 and 03 must state the same rule |
| 5 | Name ranges: prefix comparison on the sort name `Last, First`; visible sentinels `AAAAA` / `ZZZZZ` | Prefix rule; sentinels kept (literal parity) and treated as open bounds | Product owner, after the live check |
| 6 | A narrowed age range and a missing birth date | Patient excluded; the open bounds 0 and 999 never exclude | Product owner, after the live check |
| 7 | Options endpoint for every lookup parameter (here) or only for sources without an existing list endpoint (02 section 13 row 4) | Every lookup parameter, gated by the report right; this also serves the user list (id and label only) to callers without Security Users rights, which 08 section 5.2 accepts | 02 |
| 8 | Ortho rule behind `patient_type` (legacy: the Ortho Patient checkbox of the patient record, per vendor documentation) | Owned by 03 (candidates: `patients.patient_type`, code `OR` in `patients.patient_types`) | `03_data_foundation.md` |
| 9 | Signatures counted as `unknown_legacy` until read: collapsed static lists, unconfirmed default rules, the plan / sub type picker | Yes: {{N_UNK}} signatures, {{N_UNK_C}} controls stay open in the parity matrix | Program lead |
| 10 | Fee schedules and referral sources are office-pinned catalogs in DentC [V] but organisation-wide in the legacy tool; 08 S-10 still lists the three fee-schedule reports and Referral Source List as `office_mode = none` | `optional` with the catalog rule (6.5): the caller's readable offices plus rows without an office, so a report never lists a row that the Setup screen hides from the caller | `08_security_compliance.md` |
| 11 | `output_format` with `role: query` on four reports, which makes a format change run the report again | Literal behaviour kept | Product owner |
| 12 | Patient box of Patient's Notes: empty default (as captured) or the patient in context | Empty; the patient in context is the first suggestion | Product owner, after the live check |
| 13 | Who is report-unrestricted: 02 section 4.1 reuses `OfficeScope.can_view_all()`, which accepts the scheduling alias of `office_scope_view_all_offices` [V]; 08 S-3 counts only full-access roles and strict holders of that right | The rule of 08 S-3. This document needs only the two results: the allowed office set and the report-unrestricted flag | 02 and 08 must state the same rule |
| 14 | Patient context of a report opened from the Reports hub while a patient is active in the session: sent, as the legacy screens pre-fill from the loaded patient, or sent only from the patient shell (07 section 4.7) | As 07: only from the patient shell. From the hub the Ledger reports open with an empty, required account | 07, product owner |
| 15 | PAPER STATEMENT SENT: what the legacy button does and what enables it. Its row caption Print Reports suggests a report of paper statements sent; 02 section 5.9 treats it as a bulk action over the snapshot of a statement run | One definition action `paper_statement_sent` with `enabled_when: unknown`; kind and target are filled after the live check (2.4) | Product owner, after the live check; 02 |
| 16 | Callers whom a `self_unless_privileged` definition exempts (PD-11: privileged roles are unrestricted) on My Reports Production Report and on the provider-type options of My Daily Journal: the legacy screens show no provider control to anyone | The hidden `provider_ids` becomes a picker for an exempt caller, default the own link, else `all` (08 section 4.2). Restricted callers never see it | `08_security_compliance.md`, product owner |

Requests to other documents (none changes a decision of the brief):

| # | To | Request | Section here |
|---|---|---|---|
| 1 | 02 (ENG-06) | Resolve the office scope inside the parameter step, before dependency rules and date tokens; 02 section 4.1 lists parameters (step 3) before scope (step 4) | 13.2 |
| 2 | 02 (ENG-06, section 13 rows 3, 5, 29) | Request field `context{patient_id}` on run, validate and saved-view resolve (also request A-1 of 07) | 2.3 |
| 3 | 02 (section 13 row 3) | `display{}` and `ctx{}` (the facts used: `multi_office`, `provider_restricted`, `user_restricted`, `feature.<flag>`; request A-2 of 07) in the validate response | 2.4, 13.2 |
| 4 | 02 (ENG-07, section 8.2) | Value key `office_group_ids`; the value `"all"` for `office_ids` and `office_group_id`; `office_policy = assigned_offices` resolves to the token `my_offices` instead of absent keys | 6.1 |
| 5 | 02 (section 3.10) | Actions with `scope: criteria` and `enabled_when` | 2.4 |
| 6 | 02 (section 3.1) | Definition field `week_start` (`iso`, `payroll`); the context fact `ctx.user_restricted`, set from the field `scope.user_restriction` that 08 requests (UR-1, UR-3) | 7.4, 9.1, 9.7 |
| 7 | 02 (ENG-03, ENG-04) | The `Parameter` additions of 13.1 and the four expression additions of 9.1 | 9.1, 13.1 |
| 8 | 02 (section 13 row 4) | Label resolution route `POST .../options/{param_key}/resolve`; option fields `sub_label`, `is_active`, `disabled_reason` | 13.3 |
| 9 | 03 | Dataset date columns for the bases of 7.3 that are new (`lab_*_date`, `ortho_visit_date`, `work_date`, `claim_printed_date`); guarantor sort name on `rpt_account_dim`; a response model for `GET /provider-specialties` (backend) | 7.3, 3.4, 5 |
| 10 | 06, 07, 08 | Use the final names of the header table: token `working_office`, `account_id` with source `accounts`, {{N_TYPES}} types with `ActionParam` for definition actions, `week_to_date`, explicit office values instead of absent keys, `office_mode = none` on 18 reports | header, 6.1, 6.5, 7.4 |

---

