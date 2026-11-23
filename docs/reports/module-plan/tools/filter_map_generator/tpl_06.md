## 12. Enhancements every report gets

All additive (R5). A run with untouched defaults is the legacy run.

| Enhancement | Applies to | Detail | Parity guard | Phase |
|---|---|---|---|---|
| Date presets | every `date_range` | Preset list of 7.4 beside the two boxes | Default stays `today` | P0 |
| Relative tokens | every `date`, `date_range` | Stored in saved views and schedules; resolved per run | - | P0 |
| Multi-select | the lookup dropdowns that are single-select in the legacy tool, the patient box of Routing Slip and Audit Trail | Value becomes a list (section 5) | `all` default unchanged; never on `patient_id`, `account_id`, `fee_schedule_id` | P0 |
| Search, grouping, inactive switch in pickers | every `entity_multi`, `entity_single` | Typeahead; roster-first provider list; "Include inactive" | Same `all` / `none` meaning | P0 |
| Office choices | `office_scope` | `my_offices`; several office groups; `all` for every caller, resolved to what the caller may read | Default `working_office` | P0 |
| Criteria summary | every report | Non-default values as removable chips; the resolved criteria (`criteria_echo[]` of 02) printed on screen, PDF and XLSX | - | P1 |
| Saved filter sets | every report | Server-side saved views (`report_saved_views`, owned by 02) store `params` with presets and tokens, the office policy and the definition version. Legacy ADD TO MY FAVORITES = save view + favorite. A view that holds a patient-identifying value key cannot be shared organisation-wide (08 SH-1) | Opening the plain report still shows the defaults | P1 |
| URL state | every report | Value keys in the query string; lists as repeated keys; ids and codes only, never names; a context token as `@<name>`; the office state as exactly one office key (`office_ids=@working_office`, `office_ids=all`, `office_group_id=4`). The values of `text` and `text_range` parameters (name ranges, search text) are never written: they can hold a patient name, and URLs carry ids only (07 section 5.10, 08 T-9); a link opens with those keys at their defaults and the page names what was left out. Up to 50 values per key and 1,500 characters in all; a larger state stays in the tab (`sessionStorage`) under a draft id carried as `draft=<id>`, and is shared by saving it as a view | Absent keys take the default | P1 |
| Restore last run | every report | One click; never automatic | Defaults unchanged | P1 |
| Extra output format | `output_format` | `csv` with formula-injection guards (AD-6). The CSV exporter is the first one built (ENG-15, P0); `pdf` and `xlsx` follow in P1 (brief section 6) | Default `pdf` | P0 |
| Patient suggestion | `patient_id`, `patient_ids` | The patient in context is the first suggestion of the lookup | Never pre-filled where the legacy box is empty | P1 |
| Run estimate | interactive and background reports | Cost class and row estimate before a long run | - | P2 |
| Code picker extras | `procedure_codes`, `recall_procedure_codes` | Category tree, code ranges (`D2000-D2999`), saved code sets | `all` default unchanged | P3 |
| Comparison period | reports whose definition sets `supports_comparison` | `compare_to`: `none`, `previous_period`, `previous_year`, `custom` with `compare_date_from`, `compare_date_to` | Default `none`; legacy columns unchanged | P4 |

---

## 13. Backend parameter schema, lookup endpoints, frontend components

### 13.1 Parameter definition

The `Parameter` object of the report definition is owned by 02 section 3.2 (ENG-03). This section states how each field is used
by the filter framework and which fields are added.

| Field of 02 | Use here |
|---|---|
| `key` | Parameter key of section 15 |
| `type` | One of the {{N_TYPES}} types of section 2 |
| `value_keys[]` | Per type (2.1); listed per parameter in `signature_map.json > parameters` |
| `label`, `help_text` | Legacy label; legacy static text and tooltips (status `help_text`) |
| `section`, `order` | Legacy section title verbatim and the position on the legacy screen |
| `role` | `query`, `layout`, `output` (section 8) |
| `default`, `default_differs_reason` | 10.1; tokens of 2.3 |
| `options[]`: `value`, `label`, `legacy_label`, `enabled_when`, `description` | `enum`, `enum_multi`, the operator list of `amount_comparison`, the day list of `lookback_days` |
| `options_source`, `depends_on[]` | `lookup:<source_key>` (13.3); the value keys that narrow the list (`fee_schedule_effective_date` depends on `fee_schedule_id`) |
| `required`, `required_when` | 10.3 |
| `enabled_when`, `visible_when`, `disabled_value`, `forced_when[]` | 9.2 |
| `validation` | `min`, `max`, `max_items`, `max_span_days`, `pattern`, `max_length`, plus the additions below |
| `accepts_all`, `accepts_none` | `entity_multi`, `enum_multi` (grids with an All box), `scoped_selection` |
| `legacy_control_ids[]`, `legacy_note` | From the parity files; `legacy_note` for controls known only from vendor documentation and for hidden parameters (9.7) |

| Addition requested (ENG-03) | On | Meaning |
|---|---|---|
| `default_when[]`, `label_when[]` | parameter; `label_when` also on an option | 9.2 |
| `visible_when` | option | An option that exists only in some states (`over_120_plus` with Excel) |
| `validation.min_items` | `enum_multi` | Minimum number of ticked values: 1, or 0 where 2.5 says so |
| `semantics` | filter parameters | `{ mode, null_policy, full_selection }` with `mode` = `include` or `exclude`, `null_policy` = `drop` or `keep`, `full_selection` = `no_predicate` or `predicate` (2.5). Drives the generic predicate and the wording of the criteria echo |
| `validation.value_type` | `number_range` | `integer` or `decimal` |
| `validation.open_bounds` | `number_range`, `text_range` | Values that mean "no bound" and add no predicate (`0` / `999`, `AAAAA` / `ZZZZZ`) |
| `validation.allowed_modes` | `office_scope` | Subset of `office`, `office_group` (locks of 6.4, rights of 6.6) |
| `security_scope` | `office_scope` | The scope that feeds scope resolution on a report with a prefixed office scope (6.7) |
| `mode_sources{}` | `scoped_selection` | One `lookup:` source per mode |
| `provider_role` | parameters whose source is `providers` | `report` (the role is `scope.provider_attribution`) or a role of 3.2. The PD-11 restriction, drill-through mapping and the criteria echo use the role, so they cover every provider key, not only `provider_ids` |
| `display_source` | `display` | Name of the server function whose value validate returns in `display{}` (2.4) |
| `control` | any | Rendering hint for literal parity: `picker`, `dropdown`, `radio`, `checkbox_group` |
| `placement`, `advanced` | any | `header` for a checkbox inside the section bar; `advanced` for "More options" (final layout owned by 07) |
| `is_enhancement` | option | Option the legacy tool does not have (R5) |

Example:

```json
{ "key": "provider_ids", "type": "entity_multi", "value_keys": ["provider_ids"], "label": "Provider", "section": "PROVIDER",
  "order": 50, "role": "query", "required": false, "default": "all", "accepts_all": true,
  "options_source": "lookup:providers", "depends_on": ["office_ids", "office_group_id", "office_group_ids", "all_offices"],
  "provider_role": "report", "semantics": { "mode": "include", "null_policy": "drop" }, "control": "picker",
  "legacy_control_ids": ["{{EX_PROVIDER_CID}}"] }
```

### 13.2 Values through the pipeline

| Stage | Example | Stored |
|---|---|---|
| Form state (browser) | office scope `{ mode: office, selection: working_office }`, range preset `month_to_date`, checkbox states | - |
| Request body (run, validate) | `{ "working_office_id": 108, "context": { "patient_id": null }, "params": { "office_ids": {"token": "working_office"}, "date_preset": "month_to_date", "date_basis": "transaction_date", "provider_ids": "all", "transaction_types": ["services", "payments"], "report_format": "detail", "output_format": "pdf" } }` | `report_runs.params_input`, `working_office_id`; a saved view stores the same `params` without the office keys, plus `office_policy` (6.1) |
| Normalised and resolved | `{ "office_ids": [108], "date_preset": "month_to_date", "date_from": "2026-11-01", "date_to": "2026-11-21", "date_basis": "transaction_date", "provider_ids": "all", "transaction_types": ["services", "payments"], "report_format": "detail", "output_format": "pdf" }` | `report_runs.params`, the audit event and `criteria_echo` (AD-7) |

What the type handlers and rules of this document do inside the parameter and scope steps of 02 section 4.1 (one code path for
`validate`, inline runs, background runs, saved-view `resolve` and schedules). The order matters: dependency rules read context
facts that only scope resolution can set, and date tokens need the zone of the resolved offices.

| # | Action | Failure |
|---|---|---|
| 1 | Reject value keys the report does not declare | 422 `unknown_parameter` |
| 2 | Fill every missing value key from `default` (tokens kept). An absent office parameter takes its default like any other; more than one office key is an error | 422 `invalid_parameter` (`conflicting_office_keys`) |
| 3 | Parse each value with its type handler | 422 `invalid_parameter` (`invalid_option`, `invalid_date`, `invalid_number`) |
| 4 | Apply unconditional locks of the office scope; resolve the office tokens and the office scope against the caller's allowed set (6.2); set `ctx.multi_office`, `ctx.provider_restricted`, `ctx.user_restricted`, `ctx.feature.*` and the reference time zone (7.5) | 403 `office_not_assigned`; 422 `parameter_required` (no working office) |
| 5 | Evaluate `visible_when`, `enabled_when` and `forced_when` in topological order, each on the already replaced values; replace disabled and hidden values by `disabled_value`; apply forced values | never an error; listed in `disabled[]` and `warnings[]` |
| 6 | Resolve the remaining tokens: presets and date tokens in the reference zone, caller tokens, patient-context tokens after the chart-access check, `first_option`. The same chart check applies to a `patient_id` or `account_id` sent as a value | 422 `parameter_required` (a required context is missing); 403 `report_provider_not_linked`, `patient_not_in_office` |
| 7 | Check required values, ranges and selection sizes, skipping disabled and hidden parameters; normalise full selections and open bounds (2.5, 3) | 422 `parameter_required`, `invalid_date_range`, `range_too_large`, `invalid_parameter` (`range_order`, `min_items`, `max_items`) |
| 8 | Check references against the option source | 422 `unknown_reference` |
| 9 | Apply the data-class profile of the caller (hidden parameters of 02 section 3.2) | 403 `data_class_denied` |
| 10 | Return the resolved `params`, `disabled[]`, `warnings[]`, `display{}`, `ctx{}` (the facts of action 4), `criteria_echo[]` | - |

02 section 4.1 lists parameter validation (its step 3) before scope resolution (its step 4). Actions 4 to 6 need the scope
first, so this document asks 02 to resolve the scope inside the parameter step (11.7 request 1); nothing else in the pipeline
of 02 changes. The form never computes a `ctx` fact or a date token: it reads `ctx{}` and the resolved dates from the validate
response and evaluates the expressions on them.

| Building block | Status | Notes |
|---|---|---|
| `Parameter`, `Option` dataclasses and `ReportDefinitionRead` | NEW, ENG-03 | Exported through OpenAPI so Orval generates the types; additions of 13.1 |
| Pipeline `app/reports/params/pipeline.py` | NEW, ENG-06 | Hosts the type handlers "registered by the filter framework" (02 section 2); takes `working_office_id` and `context{patient_id}` |
| Type handlers, one per type of section 2 | NEW, FLT-01 | Parse, value keys, normalise, canonical form for hashing |
| Rules, reasons, context tokens, reference checks, display values | NEW, FLT-02 | Actions 5 to 8 and 10 above |
| Office scope resolution | NEW: engine office rule in `app/reports/scope.py` (ENG-07; 08 section 4.1); reuses `OfficeScope.assigned_ids`, `office_group_office_ids` [V `app/services/office_scope_service.py`] | FLT-03: the four value keys, `"all"`, tokens, group lists, locks, `ctx` facts, prefixed keys of a second scope |
| Office-local today | [V] `office_today`, `office_tz` in `app/core/datetimes.py` | NEW in FLT-04: token grammar, presets, week start |
| Expression evaluator `app/reports/params/expr.py` | NEW, ENG-04 | Additions and TypeScript twin in FLT-05 |
| Unknown-key rejection | [V] precedent `reject_unknown_query_params` in `app/api/deps.py` | Applied to the `params` object |
| Chart-access check for patient-context tokens and patient values | [V] `assert_patient_visible` (403 `patient_not_in_office`) and `patient_is_visible` in `app/services/office_scope_service.py`; the report-side wrapper is owned by 08 (S-10) | FLT-16 |
| Option source registry | NEW, FLT-06 | 13.3 |

### 13.3 Lookup endpoints (option sources)

One route serves the options of every lookup parameter: `GET /reports/definitions/{report_key}/options/{param_key}`
(02 section 13 row 4; NEW, ENG-05). The source behind a parameter is its `options_source = lookup:<source_key>`; the source keys
and their handlers are owned here (FLT-06). Routing every picker through it gives one paging, search, label-resolution and rights
rule (the report right), where the existing list endpoints differ.

| Part | 02 section 13 row 4 | Addition requested here |
|---|---|---|
| Query | `search`, the `depends_on` value keys, `after`, `size` | `include_inactive`; `mode` for a `scoped_selection`; `working_office_id`, so that an office token among the `depends_on` keys - written `@working_office`, `@my_offices` as in a URL - resolves on the server like in a run |
| Response | `{ options: [ { value, label, group } ], next_after }` | Option fields `sub_label`, `is_active`, `disabled_reason` (office not permitted) |
| Label resolution | - | NEW `POST .../options/{param_key}/resolve` with `{ values: [...] }` and the `depends_on` value keys in the body: returns exactly these rows, inactive ones included. A body, not repeated query keys, so a list of any size resolves in one call |
| Rights | Report right | A source never returns more than the caller may see through the report itself. A source carries `required_class` (08 sections 5.2 and 13.3): `patients` and `accounts` need `phi_identified` (403 `data_class_denied` without it) and list only charts the caller may open. `users` and `security_groups` return id and label only and need no class |

A source is delivered no later than the first report that needs it. "First needed by" is computed from the map and the phase of
each category (brief section 6); FLT-06 checks the same rule in code.

{{T_SOURCES}}

Candidate source not registered yet: `appointment_lengths` for APPOINTMENT TYPE > Length, a static list until its values are read
(11.1). Gaps of the existing list endpoints that the options route closes: `size` capped at 200 with no bulk label resolution
(`ids` exists only on carriers, employers, labs and patients [V]); the user list is guarded by the Security Users screen rights
[V]; `listFeeScheduleOptions` carries no `pricing_model` [V]; `GET /provider-specialties` has no response model [V
`openapi.json`].

### 13.4 Frontend component per parameter type

Folder `src/features/reports/params/` (07 section 9.1). Component names and props are the ones of 07 section 8.1; this section
fixes which component renders which type and what it is built on. All components are NEW; "Built on" names existing code that
was verified.

| Type | Component | Built on | Notes |
|---|---|---|---|
| any | `ParamForm` | precedent `UtilityParamsForm` / `ParamKind` (`src/components/utilities/**`) [V] - a 9-kind model, not reused | Renders a definition: sections in legacy order, two-column layout, "More options", Clear Criteria, criteria-area action buttons |
| `office_scope` | `OfficeScopeParam` | `useOfficeScope()`, `useOfficeOptions()` [V]; `listOfficeGroups` [V] | Mode toggle plus selection; permitted offices and groups first; emits exactly one of the four value keys |
| `entity_multi` | `EntityMultiParam` with `OptionPopover` (quick picks) and `EntityPickerDialog` (the legacy `SELECT` dialog) | `DualListPicker` (`src/components/setup/offices/DualListPicker.tsx`) [V] for the dialog; search functions of `src/components/setup/insurance/lookupService.ts` and `procedureCodeService.ts` [V] until the options route exists | Popover must be portalled: the existing `EntityPicker` dropdown is clipped by `overflow-hidden` parents [V analysis]. With `control: dropdown` it renders as a select until more than one value is chosen (section 5) |
| `entity_multi` with source `providers` | `ProviderParam` | `useProviderDirectory`, `ProviderOptionGroups` [V] | Prefer, never exclude |
| `entity_single` | `EntitySingleParam` | `EntityPicker` (`src/components/setup/insurance/EntityPicker.tsx`) [V]; `src/features/patients/patientLookup.ts` [V] | Patient and account search; offers the patient in context as the first suggestion |
| `scoped_selection` | `ScopedSelectionParam` | `EnumParam` + `EntityMultiParam` | - |
| `date`, `date_range` | `DateParam`, `DateRangeParam` | NEW text input with a parser for `MM/DD/YYYY`, `M/D/YY`, ISO dates and relative tokens (`dateTokens.ts`). Calendar button: the range calendar of `react-day-picker` 9 in a popover (installed, unused today [V `package.json`]; library decision and spike of 07 section 10), else the native picker of a visually hidden `<input type="date">` through `showPicker()`. `src/utils/datetime.ts` formatters [V] | A native date input alone (the baseline of 07) can neither guarantee `MM/DD/YYYY` nor hold a token, so the typed box is a text input in both frames. Presets; resolved dates beside presets and tokens; never `new Date("YYYY-MM-DD")`; no date library is added |
| `boolean`, `enum`, `enum_multi` | `BooleanParam`, `EnumParam`, `EnumMultiParam` | native inputs | Option-level disabling and hiding; All box as the scalar `all` |
| `integer`, `decimal`, `number_range` | `NumberParam`, `NumberRangeParam` | native inputs | Money as string with two decimals |
| `text`, `text_range` | `TextParam`, `TextRangeParam` | native inputs; lookup icon opens `EntitySingleParam` search and writes `Last, First` | - |
| `amount_comparison`, `lookback_days` | `AmountComparisonParam`, `LookbackDaysParam` | composed | - |
| `display` | `DisplayParam` | - | Shows `display{}` of the last validate response |
| definition action with `scope: criteria` | `ActionParam` | - | Not a parameter and not a type (2.4): `ParamForm` places the button where the legacy screen has it; props `action_key`, `label`, `onRun()` (07) |

| Shared module (NEW) | Purpose |
|---|---|
| `paramModel.ts` | Types generated from the backend schema plus pure helpers; snake_case value keys bound directly |
| `paramExpr.ts` | TypeScript twin of the expression evaluator (9.1); same vector file as the backend |
| `dateTokens.ts` | Token and preset resolution for display; replaces `RangePreset` and `PeriodKey` (table of 7.4) |
| `paramCodec.ts` | Form state to `params`, URL (tokens as `@name`, list limits, draft id, no `text` or `text_range` values) and saved-view serialisation (office policy included) |
| `useParamForm.ts`, `useParamOptions.ts` | Form state with dependencies and the debounced validate call, which carries `working_office_id` and `context{patient_id}`; TanStack Query wrapper over the generated options client |

House constraints that apply [V analysis]: global `!important` input styles need a class-qualified compact rule (the `tx-select`
approach); the app runs at `html{zoom:0.75}`, so measured geometry goes through `src/utils/uiZoom.ts`; services wrap the generated
Orval client after `npm run api:sync`; no raw axios.

---

