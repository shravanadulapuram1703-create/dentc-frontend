## 14. Work items

Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks. `ENG-nn`, `DATA-nn`, `UX-nn` and `SEC-nn` are work items of 02
(section 17), 03 (section 12), 07 (section 12) and 08 (section 12); "RPT" names the report catalogs. The definition schema,
the pipeline skeleton, the caller profile with the office rule and the Python expression evaluator are ENG-03, ENG-06, ENG-07
and ENG-04 and are not repeated here. The frames and the runner shell of 07 (UX-06, UX-07) are built on FLT-10 and FLT-15.

| ID | Title | Phase | Size | Depends on | Acceptance check |
|---|---|---|---|---|---|
| FLT-01 | Parameter type handlers for the {{N_TYPES}} types, registered with the engine pipeline | P0 | M | ENG-03 | Each type parses, normalises and lists its value keys; `enum_multi` honours `validation.min_items` and writes the canonical form of a full selection declared `no_predicate`; open bounds add no predicate; a definition with an unknown type or field, or a cyclic dependency, fails at registry load; the additions of 13.1 appear in `ReportDefinitionRead` in `openapi.json` |
| FLT-02 | Validation rules, tokens, display values and field-level reasons in the pipeline | P0 | M | FLT-01, FLT-03, FLT-04, ENG-04, ENG-06 | Actions 5 to 8 and 10 of 13.2 run in that order for validate, inline and background runs; one test per code and reason of 10.4; disabled and forced values are replaced, never rejected; a required parameter is not checked while disabled (Claims Not Created with `date_basis = all`); rules run on replaced values (Deposit Slip chain); a forced value wins over a hidden state; caller tokens and `first_option` resolve; validate returns `display{}` |
| FLT-03 | Office scope handler: four value keys, tokens, group lists, locks, second scope | P0 | M | FLT-01, ENG-07, SEC-05 | Every row of 6.2 resolves as specified through the office rule of report runs. Restricted-user fixture: 403 `office_not_assigned` for a foreign office and for `all_offices: true`; the allowed set for `"all"` and for `my_offices`; the definition default when no office key is sent. A caller without assignments is refused unless `REPORT_UNGATED_OFFICE_ACCESS` is on. Two groups resolve to the union of their offices; `all` in group mode leaves out offices without a group. Locks of 6.4 enforced; `ctx.multi_office` is set before any rule is evaluated |
| FLT-04 | Date token and preset engine (backend and TypeScript) | P0 | M | - | One golden vector file passes in pytest and vitest; every preset of 7.4 resolves; the ISO week and a definition with `week_start: payroll` (payroll week from `time_clock_settings`) are honoured; vector "working office Eastern, selected office Pacific, 00:30 Eastern" resolves `today` to the Pacific date; month arithmetic clamps; every row of the mapping table of 7.4 yields the dates of the existing preset |
| FLT-05 | Expression additions, string-notation converter and TypeScript evaluator | P0 | S | ENG-04 | `contains`, boolean literals, `ctx.feature.<flag>`, `ctx.user_restricted` and `unknown` are in the shared vectors; every expression of 9.1 converts and evaluates identically in Python and TypeScript |
| FLT-06 | Option source registry and handlers behind the options route | P0 | L | FLT-01, ENG-05, SEC-04, SEC-07 | The route serves {{SRC_FLT06}} with `search`, `after`, `size` and the resolve route; the user list works for a caller without Security Users rights and returns id and label only; `patients` and `accounts` refuse a caller without the class `phi_identified`; the provider roster of several offices comes from the `office_ids` filter; `fee_schedules` follows the catalog rule of 6.5; 1,100 values resolve to labels in one call. A check computed from the map fails when a source used by a report of phase N is registered in a later phase |
| FLT-07 | Payment and adjustment code sources | P0 | M | FLT-06, DATA-03 | {{SRC_FLT07}} return the legacy 18 payment and 46 adjustment codes with tender category and production / collection group from the server; `payment_adjustment_codes` lists both kinds with typed values; `payment_types` categories derive from them |
| FLT-08 | Option sources first needed by P2 reports | P2 | S | FLT-06, DATA-38 | {{SRC_FLT08}} served |
| FLT-09 | Option sources first needed by P3 reports | P3 | M | FLT-06, DATA-17, DATA-40, DATA-42 | {{SRC_FLT09}} served; `cancellation_reasons` seeded with the seven legacy values; `referral_sources` follows the catalog rule of 6.5 |
| FLT-10 | Parameter form shell `ParamForm` | P0 | L | ENG-05, ENG-19, UX-03, UX-04, UX-15 | Renders any definition fixture in legacy section order; Clear Criteria restores defaults; `errors[]` of validate show inline; correct at `html{zoom:0.75}` and with the messaging panel open |
| FLT-11 | `OfficeScopeParam` | P0 | M | FLT-03, FLT-10 | Office and Office Group modes, `working_office`, `all`, `my_offices`, one or several groups, locks, permitted-first lists; emits exactly one value key of 6.1; every request carries `working_office_id` |
| FLT-12 | `DateRangeParam` and `DateParam` | P0 | M | FLT-04, FLT-10, UX-02 | Presets; typed `MM/DD/YYYY` and relative tokens through the parser; calendar button; resolved dates shown beside presets; range errors inline |
| FLT-13 | `EntityMultiParam`, `EntitySingleParam`, `ProviderParam`, `EntityPickerDialog`, `OptionPopover` | P0 | L | FLT-06, FLT-10, UX-15 | `all` / `none` / list states; search; full dialog with Include all; roster-first provider list; stale values flagged; popover not clipped; a legacy dropdown renders as a select until several values are chosen; labels of any list size resolve through the resolve route |
| FLT-14 | Remaining components (boolean, enum, enum_multi, numbers, text, ranges, amount comparison, lookback, scoped selection, `DisplayParam`, `ActionParam`) | P0 | M | FLT-10 | Every type of section 2 has a component; All box as the scalar `all`; header-placed checkboxes; `DisplayParam` shows `display{}`; `ActionParam` draws a definition action with `scope: criteria` and follows its `enabled_when` |
| FLT-15 | Dependency behaviour in the form | P0 | S | FLT-05, FLT-10 | Enable, show, option-level disable and hide, `forced_when` (forced value shown, other options greyed), `default_when`, `label_when`; a re-enabled control restores its value; the greyed set equals `disabled[]` of validate; `ctx` facts are never computed in the browser |
| FLT-16 | Patient and account sources with context tokens | P1 | M | FLT-06, FLT-13, ENG-06 | The form sends `context{patient_id}` when the report is started from a patient; run, validate and saved-view resolve accept it and check chart access; Ledger reports open with the account of the patient in context and name ranges pre-filled with `Last, First`; the same name in both boxes lists that person; a saved view stores the token, not the patient; search by name, chart number and id |
| FLT-17 | User and provider restriction parameters | P1 | S | FLT-02, ENG-07, SEC-06 | One test per rule of 9.7. `self_always`: My Reports Time Clock Report lists only the caller's punches, Appointment Detail by User only appointments the caller created, Daily Journal with `report_by = user` only lines the caller entered - for an administrator as well. `self_unless_privileged`: a restricted caller gets Production Report and Missing Progress Notes for the linked provider only (403 `report_provider_not_linked` without a link) and the own card on the Management Time Clock Report; an exempt caller gets the picker, default the own link, else `all`. A front-desk user without a linked provider runs the three user-specific reports. A different `user_ids` or `provider_ids` sent by the client is replaced. No `report_by` option of My Daily Journal runs without a restriction. `corresponding_provider_id` displays the provider |
| FLT-18 | Criteria echo formatter per parameter type | P1 | S | FLT-02, ENG-23 | `criteria_echo[]` carries basis, dates, time zone, offices or office groups, providers with their role and option notes with labels resolved; hidden forced parameters are echoed; screen, PDF and XLSX print it |
| FLT-19 | URL state codec and saved-view serialisation | P1 | M | FLT-10, ENG-28 | Round trip for every type, including context tokens (`@name`), each of the four office keys and `"all"`; no names and no `text` or `text_range` value in a URL; presets and tokens preserved; lists above the limit move to a tab draft; form state maps to `office_policy`; unknown keys and stale values dropped with a notice |
| FLT-20 | Parity default tests | P1 | M | FLT-02, ENG-18, RPT | For each report, the definition defaults resolve to the defaults of its parity file, and the untouched form passes validation with a working office (and a patient in context where a context token is required); the test fails when a default drifts. Extended with each category in P2 and P3 |
| FLT-21 | Accessibility and keyboard coverage of the filter components | P1 | S | FLT-10 to FLT-15, UX-13 | axe (WCAG 2.2 AA) passes on the runner form; every control operable by keyboard; Playwright spec added |
| FLT-22 | Signature map tooling | P0 | M | - | The generator and the document builder are committed under `tools/`. `make_parity_skeleton.py` applies `control_overrides` and copies `option_enabled_when`. `validate_signature_map.py` rejects an override for an unknown control id, an override identical to its signature mapping and an expression that does not parse. `validate_parity.py` requires an option rule for each control of 9.4 (the inventory records `disabled_options[]` on those nine controls) and a rule other than `unknown` before a report is released. SIGMAP VALID, and PARITY VALID for all 16 categories |
| FLT-23 | Live legacy verification pass | P0 | M | Access to the legacy tool | Every row of section 11 is answered, the three `unknown` rules and the inferred date bases of 7.2 first; inventory, index, signatures and map are regenerated; each remaining `unknown_legacy` is signed off |
| FLT-24 | Run estimate before long runs | P2 | S | FLT-02, ENG-05 | Interactive and background reports show the cost class and a row estimate from validate before Run |
| FLT-25 | Code picker extras | P3 | M | FLT-13 | Category tree, code ranges and saved code sets resolve to a code list; `all` unchanged |
| FLT-26 | Comparison period | P4 | M | FLT-04, ENG-32 | `compare_to` and the custom range on opted-in reports; default `none` leaves the legacy output unchanged |
| FLT-27 | Filter-framework rules in the definition lint | P0 | S | ENG-18, FLT-01 | The lint fails on: an `unknown` expression in a definition with `status = active`; an `enum_multi` without `semantics.full_selection`; a provider parameter without `provider_role`; a required parameter whose default is a patient-context token on a schedulable definition; `scope.office_mode = none` on a definition whose dataset has an office column, unless a required `patient_id` justifies it; a hidden parameter that no rule forces or defaults |
| FLT-28 | Criteria-area actions and the finance-charge criteria | P1 | S | FLT-14, ENG-61 | FINANCE CHARGES opens `statements.finance_charges` with its five parameters; PAPER STATEMENT SENT is mapped to its action once FLT-23 has confirmed what it does; each legacy button is referenced by exactly one action and by no parameter |

---

## 15. Appendix

### 15.1 Canonical parameter keys and the signatures they absorb

{{N_PARAMS}} parameters contributing {{N_KEYS}} value keys, grouped as in section 3. "`param` values in the map" are the value keys
and members that legacy controls map to; value keys without a legacy control (`K_preset`, `all_offices`, `office_group_ids`)
appear only in the third column. Counts are per control, after `control_overrides`. Signature ids are the numeric part of
`sigNNNN`; a signature appears under every parameter that one of its controls maps to.

{{T_APPENDIX}}

The {{N_ACTIONS}} definition actions (2.4) are not parameters and are listed in `signature_map.json > actions`.

### 15.2 Counts by status

{{T_STATUS}}

Help-text signatures without a parameter (2): sig0344 (caption of the statement message boxes), sig0345 (statement dates reminder).

### 15.3 How the map is produced and checked

| Step | Command | Result |
|---|---|---|
| Generate | generator script holding the rules and tables, reading `legacy/index/signatures.json` and the control index. It asserts section, type and label of every signature id, so a shifted id fails the run; it also asserts that every legacy default of a checkbox group is a legal value, that every expression names declared value keys and that no parameter is mapped twice on one report. Kept outside the repository with the document builder until FLT-22 commits both under `tools/` | `legacy/index/signature_map.json` |
| Validate | `python -I tools/validate_signature_map.py legacy/index/signatures.json legacy/index/signature_map.json` | `SIGMAP VALID` |
| Apply | `python -I tools/make_parity_skeleton.py legacy/index catalog/skeleton` | One pre-filled parity file per category (signature mappings and `enabled_when`; the overrides of 15.4 and the option rules of 9.4 are applied by hand until FLT-22) |
| Prove | `python -I tools/validate_parity.py legacy/index/<category>.controls.json catalog/<category>.parity.json` | `PARITY VALID` per category once report keys, phases and actions are filled |

Blocks of `signature_map.json`:

| Block | Content | Read by |
|---|---|---|
| `meta` | Counts and the conventions for `param`, overrides, rules and tokens | people |
| `mappings[]` | One mapping per signature (358): status, `param`, `param_type`, `option_map`, `default_map`, notes | `validate_signature_map.py`, `make_parity_skeleton.py` |
| `control_overrides{}` | Mapping of one control that replaces the mapping of its signature (15.4) | category authors; the skeleton tool after FLT-22 |
| `enabled_when{}` | Enabling rule per control id with `captured` (`greyed` for 9.3, `enabled` for 9.6), string, stored form, evidence, unobserved states | `make_parity_skeleton.py` |
| `option_enabled_when{}` | Control id -> option value -> rule (9.4) | category authors; the tools after FLT-22 |
| `rules[]` | Visible, required, forced, default and label rules per report (9.5) | category authors |
| `parameters{}` | Every canonical parameter: type, value keys, signature ids, control and report counts, first phase, `options_source`, `provider_role`, `semantics` of checkbox groups | this document (sections 3, 2.5, 15.1) |
| `actions{}` | The criteria-area buttons that become definition actions | category authors |
| `vendor_doc_parameters[]` | Keys for controls that only vendor documentation shows and for hidden parameters (9.7) | category authors |
| `option_sources{}` | Source key -> parameters, reports and the first phase that needs it (13.3) | FLT-06 phase check |

### 15.4 Per-control mappings (`control_overrides`)

{{N_OVR}} controls of {{N_OVR_SIGS}} signatures mean something else than the other controls of their signature. The override replaces
`param`, `param_type`, `option_map`, status and notes for that one control and states its default directly.

{{T_OVERRIDES}}
