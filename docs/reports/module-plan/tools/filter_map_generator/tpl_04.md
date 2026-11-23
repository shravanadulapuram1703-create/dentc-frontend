## 8. Output and layout parameters

Seven keys carry every legacy output and layout section. The table lists each legacy signature with its options.

{{T_LAYOUT}}

| Key | `role` (02) | Rules |
|---|---|---|
| `output_format` | `output`; `query` on four reports | `pdf`, `xlsx`, added `csv`. The result is always produced for the screen; PRINT / PREVIEW is a run with `render_output = true` that also renders this format (02 section 5.3, open decision 11 there). The format never changes the rows (AD-5, AD-6). Exception: on 835 Denial Report, Outstanding Claims, Aging Report and Aging Report by Home Office a legacy rule makes a `query` parameter depend on the format (9.6, 9.5); there `output_format` is declared with `role: query`, so the rule is evaluated by the pipeline and changing the format runs the report again |
| `report_format` | `query` | Row grain of the same population: `detail`, `summary`, `employee_total_only`. Absorbs REPORT FORMAT (Detail / Summary), REPORT TYPE (Summary / Detail) and SUMMARY/DETAIL |
| `report_type` | `query` | Variant of a report family: other population, columns and title. Absorbs REPORT TYPE of Lab Report, the hidden REPORT FORMAT TO PRINT of Appointment List, PROGRESS NOTES TO PRINT, TREATMENT PLAN/RECALL and REPORT FORMAT Account Ledger / Patient Ledger. Never a date basis: REPORT TYPE of Lab Cost Report is `date_basis` (7.2) |
| `report_by` | `query` | Dimension or basis the report is organised by. Absorbs REPORT BY, PRODUCTION BY, ANALYSIS BY. A `<NOUN> BY` section without a None option is `report_by`. On My Daily Journal the value also selects whose lines are listed (9.5) |
| `group_by` | `query` | One grouping level with headers and subtotals. Absorbs GROUP BY, COLLECTION BY (it has None and the Page Break twin), the Group By radio of Special Transaction Report and the checkboxes GROUP BY PROVIDER, Group By Office, Group By Zip Code (members). On Collection Report the value `code` is more than a level: it selects another row grain and column set (one row per code collected against; vendor documentation), so that catalog entry declares one result block per `group_by` value. Further grouping levels in the grid are view state (07), not parameters |
| `sort_by` | `query` | Row order inside the innermost group. Options per report. Clicking a column header on screen re-sorts the snapshot and does not change the parameter |
| `page_break_by` | `layout` | New PDF page per value: `none`, `group`, `date`, `provider`, `user`, `patient`. The Page Break checkbox is the member `group`: break on the `group_by` dimension (legacy label then reads "Page Break by Provider"). Ignored for `xlsx`, `csv` and the screen; changing it reuses the snapshot |

Other switches (`include_patient_balance`, `show_ar`, `print_office_address`, `itemize_prices`, `patient_identifier`, the six
statement messages, ...) are ordinary booleans, enums or texts. Their `role` is `query` when the builder needs the value (extra
columns or blocks) and `layout` when only the renderer does; the catalog entry of the report decides.

---

## 9. Dependencies

### 9.1 Expression form

Stored form: the JSON arrays of 02 section 3.2, evaluated by `app/reports/params/expr.py` and its TypeScript twin (ENG-04).
Operands are value keys. This document and the parity files (`enabled_when` in `catalog/*.parity.json`) use an equivalent string
notation; `signature_map.json` carries both for every rule (`enabled_when` or `when`, and `expr`).

```
expr     := and_expr { "or" and_expr }
and_expr := unary { "and" unary }
unary    := "not" unary | "(" expr ")" | "true" | "false" | "unknown" | "ctx." fact | cmp
cmp      := value_key ("==" | "!=" | ">" | ">=" | "<" | "<=") literal
          | value_key ("in" | "not in") "[" literal { "," literal } "]"
          | value_key "contains" literal
          | value_key "is empty" | value_key "is not empty"
literal  := snake_case word | number | "true" | "false"
```

| String notation | Stored form |
|---|---|
| `k == v`, `k != v`, `k > n`, `k >= n`, `k < n`, `k <= n` | `["eq", k, v]`, `["ne", k, v]`, `["gt", k, n]`, `["gte", k, n]`, `["lt", k, n]`, `["lte", k, n]` |
| `k == true`, `k == false` | `["truthy", k]`, `["falsy", k]` |
| `k in [a, b]`, `k not in [a, b]` | `["in", k, ["a", "b"]]`, `["not_in", k, ["a", "b"]]` |
| `k is empty`, `k is not empty` | `["empty", k]`, `["not_empty", k]` (`"all"` is not empty) |
| `x and y`, `x or y`, `not x` | `["and", x, y]`, `["or", x, y]`, `["not", x]` |
| `ctx.multi_office`, `ctx.provider_restricted`, `ctx.user_restricted` | `["ctx", "multi_office"]`, `["ctx", "provider_restricted"]`, `["ctx", "user_restricted"]` (the third fact is requested together with `scope.user_restriction`, 08 UR-1) |
| `k contains v` | `["contains", k, v]` (addition 1) |
| `true`, `false` | `true`, `false` (addition 2) |
| `ctx.feature.<flag>` | `["ctx", "feature.<flag>"]` (addition 3) |
| `unknown` | `["unknown"]` (addition 4) |

Additions to the grammar of 02, requested from ENG-04 (FLT-05 delivers the vectors and the TypeScript side):

| # | Addition | Why |
|---|---|---|
| 1 | `["contains", <value_key>, <literal>]`: true when the list value holds the literal or the value is `"all"` | `in` tests a scalar against a literal list; CHECK TYPE depends on one member of the list `payment_types` |
| 2 | The JSON literals `true` and `false` as expressions | Unconditional `forced_when` (locks of 6.4, restrictions of My Reports), hidden parameters (`visible_when: false`) and display-only controls (`enabled_when: false`) |
| 3 | `ctx` facts `feature.<flag>` for organisation feature flags | Controls that exist only when a feature is switched on (Statements) |
| 4 | `["unknown"]`: evaluates as true. The definition lint (ENG-18, FLT-27) refuses a definition with `status = active` that still contains it | A rule nobody has observed must neither disable a control nor be forgotten (9.2) |

Every expression used by this document ({{N_EXPR}} distinct rules):

{{T_EXPR}}

### 9.2 Where expressions attach

Field names of 02 section 3.2; `default_when`, `label_when` and the option-level `visible_when` are additions (13.1).

| Field | On | Effect |
|---|---|---|
| `enabled_when` | parameter | False: the control is greyed and the server replaces the value by `disabled_value` (default: the `default`) before hashing and execution. The form keeps what the user entered, so re-enabling restores it (legacy greyed controls keep showing their value) |
| `enabled_when` | option of an `enum` or `enum_multi` | False: the option is greyed; a stored value that becomes disabled falls back to the default |
| `visible_when` | parameter, or option | False: not rendered; the value is replaced as above (an option: not offered) |
| `required_when` | parameter | True: a missing value is 422 `parameter_required`. Not checked while the parameter is disabled or hidden |
| `forced_when[]: {when, value}` | parameter | Forces the value while the condition holds (REPORT FORMAT on 835 Denial Report with Excel). The form shows the forced value and greys the control - a forced `enum` shows its other options greyed. For a parameter with several value keys `value` is an object of value keys (`{"office_ids": {"token": "working_office"}}`). A different value sent is replaced, not rejected, and reported in `warnings[]` |
| `default_when[]: {when, value}` | parameter | Sets the value once when the condition becomes true; the user may change it (Daily Audit ticks Page Break when grouped by provider). Form-side only: the server never applies it |
| `label_when[]: {when, label}` | parameter or option | Changes the label (Account Balance Over becomes Patient Balance Over) |

| Rule | Detail |
|---|---|
| An unobserved state never removes a filter | `enabled_when` is false only (a) in a state that a capture or vendor documentation shows disabled, or (b) where the driving option itself says that the control does not apply: No Recall Date, "as of today", a date range type that names the other range, an unticked gate (Age Range, Include User in Filters). Every other state nobody saw leaves the control enabled: a wrongly disabled control removes a legacy filter, a wrongly enabled one keeps its neutral default (`all`, `none`, unticked). The tables of 9.3 to 9.6 name those states, and FLT-23 confirms each |
| `unknown` | A control that was captured greyed and whose driver is not known carries `enabled_when: unknown`: it stays enabled, and the lint flags the definition until FLT-23 answers it or the product owner signs a rule off. `false` is reserved for locks and display-only fields |
| Evaluation order | Rules run after scope resolution (13.2), so `ctx` facts exist, and in topological order of the dependency graph, each on the already replaced values. Deposit Slip: Check unticked -> `group_batch_checks` is replaced by `false` -> `batch_check_grouping` is disabled. A forced value wins over a disabled or hidden state |
| `disabled_value` | Stated where the default is not neutral: a greyed `entity_single` whose default is `first_option` (`compare_fee_schedule_id`) declares `null`; greyed range boxes declare `null`; the display-only office scope of Referral Source List declares `{"office_ids": "all"}`; the two hidden parameters of My Daily Journal declare `"all"` (9.5) |
| One source of truth | The validate endpoint returns the disabled value keys in `disabled[]`; the form greys exactly those after each change. It evaluates the same expressions locally for immediate feedback and takes the `ctx` facts from `ctx{}` of the last validate response (13.2) |
| Never an error | A value sent for a disabled, hidden or forced parameter is replaced, so saved views survive definition changes |
| Acyclic | The dependency graph must be acyclic; the definition lint (ENG-18) rejects a cycle |

Evidence vocabulary of 9.3 to 9.7: `shown` = visible in our captures; `documented` = stated or shown in vendor documentation;
`inferred` = deduced from labels and layout; `unknown` = no evidence, confirm on the live tool; `policy` = not a legacy
behaviour: a restriction rule of `08_security_compliance.md`. The tables show the string
notation; the stored form of every expression is in the table of 9.1 and in `signature_map.json`.

### 9.3 The 53 controls captured greyed out

Totals: {{T_GREYED_COUNTS}}. The same rules are in `signature_map.json > enabled_when`, keyed by control id, with
`captured: greyed`; `tools/make_parity_skeleton.py` copies the string into the parity files.

{{T_GREYED}}

`false` means locked or display-only: a lock declared in the definition (6.4) or a read-only `display`. `unknown` means the
control is left enabled until its rule is read on the live tool.

### 9.4 Options greyed inside an enabled group

Not counted in the 53: the group is enabled, one option is not. {{N_OPT_GREYED}} options on {{N_OPT_CONTROLS}} controls, carried in
`signature_map.json > option_enabled_when` (control id -> option value -> rule). Because the control itself is enabled, the
parity tools do not ask for these rules yet; FLT-22 makes `make_parity_skeleton.py` copy them and `validate_parity.py` require
them, and records `disabled_options[]` on the nine controls of the inventory.

{{T_OPT_GREYED}}

### 9.5 Dependencies the default-state captures do not show

Rules other than `enabled_when`, taken from vendor documentation and from the restrictions the legacy tool applies without a
control. {{N_RULES}} rules with the fields of 9.2; `signature_map.json > rules` holds one entry per report, the table lists rules that
differ only by report in one row. `option_visible_when` is `visible_when` on the option named in the Value column; a
`disabled_value` row states the value used while the parameter is disabled or hidden. Parameters that have no control in our
inventory are specified in 9.7.

{{T_RULES}}

Three rules make a `query` parameter depend on `output_format`: GROUP BY on Outstanding Claims (9.6), REPORT FORMAT on 835
Denial Report, and the bucket `over_120_plus` of the two Aging reports, which changes the buckets of the export (Over 120 /
150 / 180 / 270 / 365). That is why `output_format` has `role: query` on these four reports (section 8).

Vendor-documented behaviour that is not a parameter rule:

| Report | Trigger | Effect | Handled by |
|---|---|---|---|
| 835 Denial Report | Tenant enablement | The report is listed only for organisations that asked for it | report availability (02, 08), not a parameter |
| Patient List - New Patient | REPORT BY value | Date section and grouping follow the value (the default Appointment uses APPOINTMENT DATE RANGE) | capture each state; the date basis follows `report_by` |
| Ledger Report, Walkout Report, Super Bill, Audit Trail | Started from the patient toolbar print menu | A dialog with extra options replaces the criteria screen | the dialog options of 9.7; the entry point is owned by 07 (UX-29) |
| Every report | Opened from a favorite | ADD TO MY FAVORITES reads UPDATE MY FAVORITES | saved-view behaviour (02 section 8.2, 07) |

### 9.6 Rules on controls captured enabled

The default-state capture cannot show a rule that only switches a control off in another state. {{N_ENABLED_RULES}} such controls carry
a rule ({{T_ENABLED_COUNTS}}); they are in `signature_map.json > enabled_when` with `captured: enabled`, so the skeleton tool
pre-fills them like the greyed ones.

{{T_ENABLED_RULES}}

Deliberately without a rule: the day list `exclude_statement_sent_within_days` of the Statements screen was captured enabled while
its checkbox is unticked, so the checkbox does not disable it; the value simply does not apply while the checkbox is off (11.5).

### 9.7 Controls our captures lack, and hidden parameters

{{N_VPARAMS}} controls are known from vendor documentation only. They enter the control index through `tools/apply_supplement.py` as
`.xNN` controls and are mapped in the catalog parity file with the keys below; a key that already exists in section 15 keeps
its meaning (02 field `legacy_note`).

{{T_VPARAMS}}

{{N_HIDDEN}} hidden parameters have no legacy control at all: the legacy tool applies the restriction itself. They are declared with the
`visible_when` and `forced_when` rules of 9.5, and are part of `params`, of the audit record and of the criteria echo.

Which definition restricts whom is declared in 08 section 4.2 (table of the definitions that restrict) and section 4.3; the rules
of 9.5 are the parameter side of those declarations:

| Restriction declared by the definition | Parameter rule | Reports |
|---|---|---|
| User, `self_always` | `user_ids` hidden and forced to `current_user` for every caller, privileged roles included. No provider link is needed | My Reports: Time Clock Report, Appointment Detail by User, Daily Journal while `report_by == user` |
| Provider, `self_unless_privileged` (PD-11) | `provider_ids` forced to `current_user_report_provider` while `ctx.provider_restricted`; without a link 403 `report_provider_not_linked`. A caller the definition exempts is not forced: a hidden parameter becomes a picker (default the own link, else `all`), a legacy picker stays a picker | My Reports: Production Report (hidden), Missing Progress Notes (legacy PROVIDER picker), Daily Journal under every `report_by` option other than `user` (hidden) |
| User, `self_unless_privileged` | `user_ids` forced to `current_user` while `ctx.user_restricted`: a caller without the data class `payroll_time` | Management: Time Clock Report (legacy USER picker) |

The scope step sets `ctx.provider_restricted` and `ctx.user_restricted` from `scope.provider_restriction` and
`scope.user_restriction` of the definition (02 section 3.1; the second field is requested by 08) and applies the same value to
the dataset handle, so the parameter rule and the row filter cannot disagree. A forced control that the legacy screen shows
stays visible and read-only with the forced value (9.2).

{{T_HIDDEN}}

---

