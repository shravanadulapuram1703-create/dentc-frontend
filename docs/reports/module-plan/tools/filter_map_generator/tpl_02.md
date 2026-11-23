## 3. The shared parameter dictionary

The {{N_SHARED}} parameters used by more than one report. The other {{N_SINGLE}} are listed with their signatures in section 15 and are
specified by the category catalog that owns the report. "Replaces" lists every legacy spelling as `SECTION > label (controls)`.
Backend application names logical fields; the dataset column behind each field is owned by `03_data_foundation.md`. Columns named
here were verified in the analysis documents or in 03. The last column is the source key of `options_source = lookup:<source_key>`
(13.3).

{{T_DICT}}

Rules that hold for every row:

| Rule | Detail |
|---|---|
| `all` and `none` | Stored as tokens; the resolver turns `all` into "no predicate" and `none` into an empty list |
| Full and empty checkbox groups | Declared per parameter (2.5); the generic predicate never decides it |
| Rows without a value | `semantics.null_policy` (2.5): kept by an exclude filter, by `all` and by a full selection declared `no_predicate`; dropped by a strict include subset |
| Booleans and enums over the same dimension | The literal legacy control is kept: `include_inactive_patients` (checkbox, 8 reports) and `patient_status` (radio, 2 reports) are two keys; the engine normalises both to one predicate, and a report declares only one of them |
| Open bounds | `AAAAA` / `ZZZZZ` on name ranges, `0` / `999` on the age range and blank boxes add no predicate, so the legacy default never drops a row for a missing name or birth date |
| `role` (02) | `output_format` is `output` (section 8 names four reports where it is `query`); `page_break_by` and other print-only switches are `layout` (changing them reuses the snapshot); everything that reaches the builder, `group_by`, `sort_by`, `report_format` and column switches included, is `query`. "Layout only" in the Semantics column means: no effect on the row population |
| Restrictions without a legacy control | The legacy tool restricts My Reports to the logged-in user or the linked provider, and a statement run to one office, without showing a control. Each is a parameter with a forced value (9.5, 9.7), hidden where the legacy screen has no control, so the restriction is part of `params`, of the cache key, of the audit record and of the criteria echo. Which definition restricts whom is declared in 08 section 4.2: a `self_always` restriction is an unconditional force; a `self_unless_privileged` one follows `ctx.provider_restricted` / `ctx.user_restricted`, and a caller it exempts (PD-11) gets a picker |
| Patient-identifying parameters | `patient_id`, `patient_ids`, `account_id` and the two name ranges may be set only by a caller who holds the data class `phi_identified`; otherwise 403 `data_class_denied` at validation (08 section 5.2). Their option sources carry the same class (13.3) |
| Data gaps | Where the backend column says "no ... today" the parameter is declared and validated, and the report is blocked or degraded as its catalog entry states |

### 3.10 Parameters limited by migrated data

The parameter exists for parity on every report; the filter is only meaningful for rows created in the app, or needs data that
does not exist yet. Facts from `analysis/be_data_*.md`; the repair or the new entity is owned by `03_data_foundation.md`.

| Parameter or value | Limit | Works for |
|---|---|---|
| `date_basis = created_date` on money and list datasets, CREATED / CREATED ON DATE RANGE | Migrated rows carry the migration time stamp as `created_at` | Rows created in the app (migrated money rows only after the created-date backfill) |
| `date_basis = created_date` on appointment datasets (Appointment Detail, Appointment Detail by User); `appointment_created_date_from` / `_to` and `date_range_type = appointment_created_date` on DPS Eligibility Report | Migrated appointments have no creation date or creating user | Appointments created in the app |
| `user_ids` | Migrated ledger rows carry the entering user only as a legacy login string; migrated appointments carry none | Rows created in the app; migrated rows match only under `all` |
| `preferred_provider_ids`, `preferred_hygienist_ids` | Preferred provider and hygienist were not migrated | Patients edited in the app |
| `payment_types`, `payment_codes`, `payment_adjustment_codes` | Legacy payment and adjustment codes were collapsed to four payment methods during migration | App-era payments and adjustments, until the codes are re-imported |
| `carrier_ids` on payment reports | Legacy insurance payments carry no carrier or claim link | Claim-level reports; app-era remittances |
| `claim_sent_types` | The submission channel is not stored per claim | Only the full selection (no predicate) returns rows today |
| `cancellation_reason_codes` | The Scheduler does not persist the reason; migrated appointments have none | Nothing today |
| `date_basis = diagnosed_date` | Migrated treatment plans were derived from appointment details and carry no dates | Plans created in the app |
| `recall_procedure_codes`, `recall_date_mode`, basis `recall_due_date` | No recall rows were migrated and no recall engine exists | Derived recall (procedure history plus the recall interval of the code) |
| `ortho_start_date`, `ortho_first_visit_date`, `ortho_last_visit_date`, `ortho_status_codes`, basis `ortho_visit_date` | No ortho contract was migrated; no status vocabulary and no Ortho Treatment Card (visit log) exist | Contracts created in the app; statuses and visits are NEW |
| `first_visit_date`, `last_visit_date` (9.7) | `patients.first_visit` / `last_visit` are never written | Derived from completed procedures |
| `patient_status`, `include_inactive_patients` | Inactive and deleted patients share one flag | Active versus not active |
| Referral management parameters (`referred_*`, `referral_statuses`, `contact_statuses`, `referral_completion`) | No referral-case entity exists | NEW |
| `include_only_bill_to_insurance`, `production_type_ids`, `procedure_code_types` | No bill-to-insurance flag, no production-type link, no code-type column | NEW |
| `claim_printed_date` (fixed basis of Claims Printed) | Claim prints are not recorded | NEW |

---

## 4. Section-by-section mapping

One row per legacy section title, ordered by number of reports. A key written `key.{a, b}` stands for the members `key.a`, `key.b`.
`(superseded)` marks buttons replaced by a mechanism inside the control, `(definition action)` the two criteria-area buttons.
The column shows the effective mapping of the controls (signature mapping plus `control_overrides`); the per-signature detail is
in `signature_map.json`.

{{T_SECTIONS}}

Sections that appear on a screen without any captured control: `GROUP BY` on Internal Referral Management (header visible, controls hidden).

---

## 5. Entity pickers

Vendor documentation shows the legacy `SELECT` dialog for offices and procedure codes: an `INCLUDE ALL` checkbox, a search text with
`CLEAR SEARCH`, a sort choice, a dual list moved with `>>` / `<<` (Ctrl+click for several), `APPLY` / `CANCEL`. With `INCLUDE ALL`
ticked the lists are disabled and the criteria box shows `ALL`. No dialog was captured in our own screenshots
(49 picker signatures, {{N_PICK_CONTROLS}} controls).

{{T_PICKERS}}

Picker rules:

| Rule | Detail |
|---|---|
| Value | `"all"`, `"none"` or a list of values: integer ids for most id-keyed entities, string ids for providers (`providers.id` is a string [V]), codes for code-keyed sources (`*_codes`, `procedure_codes`), typed strings where one source mixes entities (`plan:<id>`, `payment:<code>`) |
| Two surfaces, one component | Chip box with a searchable popover for quick picks; "Select..." opens the full dialog built on the existing transfer list `DualListPicker` [V] with Include all, search and sort - the legacy dialog |
| Providers | Roster of the selected offices first (from `listProviders` with `office_ids` [V]), every other provider below; never scoped by `providers.office_id`; label `Name (ID)` through the provider directory [V] |
| Office dependence | `operatories`, `labs` and the provider roster declare `depends_on: [office_ids, office_group_id, office_group_ids, all_offices]` and are re-queried when the office scope changes; a selected value that leaves the list is kept and flagged |
| Inactive rows | Listed behind an "Include inactive" switch; historical reports must be able to select inactive providers, users and carriers |
| Search sources | `patients`, `accounts`, `insurance_plans_and_subtypes` (about 31k plans), `carriers`, `employers`, `referral_sources`: typeahead only, never preloaded; `validation.max_items` 500 |
| Enumerable sources | Every other source is served complete and has no cap below its own size, so "all but a few" is a legal list (about 1,100 procedure codes [V analysis]; `IN` lists above 1,000 values are bound as one array, 02 section 4.3). No exclusion form is added: the legacy dialog has none and the full list expresses it |
| Labels | Resolved from values by `POST /reports/definitions/{report_key}/options/{param_key}/resolve` (13.3), in one call for any list size; saved views and URLs carry values only |
| Stale values | A value from a saved view that no longer exists or is not permitted is shown as "(not available)"; `POST /reports/saved-views/{id}/resolve` drops it and lists it in `notices[]` (`reference_removed`, `scope_reduced`; 02 section 8.2); a run request that still carries it fails with `unknown_reference` |
| Legacy single-select dropdowns | With `control: dropdown` the parameter renders as a select while its value is `all` or one entry - the legacy look. The entry "Select several..." at the end of the list opens the picker dialog; once the value holds more than one entry the control renders as the chip box of every other `entity_multi` |

---

