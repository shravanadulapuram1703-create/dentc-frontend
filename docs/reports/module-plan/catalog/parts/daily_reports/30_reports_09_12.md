## Production Analysis Report - `daily.production_analysis_report`

Daily Reports, screenshot 9.PNG - P1 - M - `reports_daily_reports_screen_view_only` (family `daily`) - interactive - DOCUMENTED (columns defined in vendor text, no sample image; layout of the sections INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Owner, office manager | Month end, quarter end, on demand | Production mix per provider: which ADA categories (diagnostic, preventive, restorative, ...) each provider produces and what share of the office's production in that category the provider carries (associate mix, hygiene versus doctor balance, referral-out decisions) |
| Owner, treatment coordinator | Before fee or network negotiations | Carrier analysis: how many patients of each carrier were seen, how many claims were created, and average production and insurance collection per patient of that carrier (payer mix, PPO participation decisions) |
| Regional manager | On demand, office group | Compare the category mix of offices of one group (office band per office) |

### Legacy output

Confidence: **DOCUMENTED** for the column lists and their definitions [P31]; the section layout (provider sections with one row
per category) is INFERRED [unverified]; no totals row is documented [P31].

`ANALYSIS BY = Category` (title proposal `Production Analysis by Category`; the printed title is not documented):

| # | Column | Definition [P31] |
|---|---|---|
| 1 | `Category` | ADA category of the procedure code (Setup > Procedure Codes) |
| 2 | `Provider $` | The provider's gross production in the category |
| 3 | `Practice Group $` | The office's gross production in the category |
| 4 | `Prov. Prod/ Total Prov. Prod. (%)` | Category share of the provider's total production |
| 5 | `Prov. Prod/ Prac. Grp Prod. (%)` | Provider's share of the office's production in that category |

`ANALYSIS BY = Carrier` (title proposal `Production Analysis by Carrier`):

| # | Column | Definition [P31] |
|---|---|---|
| 1 | `Carrier` | Insurance carrier |
| 2 | `# Patient` | Patients attached to the carrier who were seen in the range |
| 3 | `# of Claims` | Claims created for the carrier in the range |
| 4 | `Avg. Production per Pat` | Carrier gross production ÷ `# Patient` |
| 5 | `Avg. Collection per Pat` | Carrier gross collection ÷ `# Patient` |

"Gross production" in the legacy vocabulary is the posted fee (metric `charged_production`, PD-1); parity columns show
`charged_fee`, never UCR. Sign: production is positive; a migrated negative charge line (data_card 2.9) is summed with its
sign. Quirk kept as a label, fixed in meaning: the column is named `Practice Group $` but defined at office level [P31];
we keep the label and define the denominator per office band, and add a separate all-offices section for a multi-office run
(Output). Quirk fixed: percentage totals are true ratios of unrounded components (family rule).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r09 -->

| Legacy option | Effect on the result |
|---|---|
| ANALYSIS BY `Category` (default) | `report_by = category`: report format `category` (provider sections x category rows, block `category_mix`); enables CATEGORY, greys CARRIER |
| ANALYSIS BY `Carrier` | `report_by = carrier`: report format `carrier` (one row per carrier, block `carrier_mix`); enables CARRIER, greys CATEGORY (inferred) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only (`role: output`); `csv` added. Excel = flat typed sheet of the active block |
| OFFICE/GROUP `Office` (default, picker = working office) | Charges whose office of service (`rpt_charges.office_id`) is in the list; `Practice Group $` and both % use that office's production as denominator |
| OFFICE/GROUP `Office Group` (picker default ALL) | Every office of the chosen groups; one `Office : <name>` band per office (multi-office) plus the section `All selected offices`, where `Practice Group $` is the sum over the selected offices |
| PROVIDER `ALL` (default) / list | Category: provider sections only for the selected treating providers (`rpt_charges.provider_id`); `Practice Group $` stays office-wide (all providers), so the second % still answers "share of the office". Carrier: restricts production, `# Patient` (patients seen by a selected provider, `rpt_provider_visits`), `# of Claims` (`rpt_claim_facts.treating_provider_id`) and collections (credited provider `rpt_payments.provider_id`) - per-measure roles are a proposal (Open questions 3) |
| DATE RANGE Start / End (default today / today, office-local) | Fixed basis `service_date` for production and `# Patient`; claim created date for `# of Claims`; transaction date for collections (Data) |
| CATEGORY `ALL` (default) / list | `procedure_category_codes`: only charges whose `code_category` is selected; denominators are computed over the same category set. Uncategorised codes are kept only under `all` (row `Uncategorised`) |
| CARRIER `ALL` (default) / list (greyed while Category) | `carrier_ids`: only carrier rows of the selected carriers; `No insurance` and `Carrier not recorded` rows appear only under `all`. Disabled value `all` while `report_by = category` |

Dependency rules: CATEGORY `enabled_when ["eq","report_by","category"]` (inferred from the capture: active with Category);
CARRIER `enabled_when ["eq","report_by","carrier"]` (inferred: greyed with Category, filter_card 9.3 row 23). A disabled
picker is reset to `all` before hashing (engine_card 3.2). No other rule.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_range` presets `month_to_date`, `last_month`, `quarter_to_date`, `year_to_date` | `date_range` preset | `today` unchanged | Mix analysis is a period question; presets avoid typing month ends | filter_card 12 |
| `compare_to` (`none`, `previous_period`, `previous_year`) | `enum` (FLT-26, P4) | `none` | Adds `provider_amount_prior` and `share_change_pct` (percentage points) beside each category row; carrier variant adds prior `# Patient` and prior average production | `supports_comparison: true` on this definition; legacy columns unchanged |
| `show_zero_categories` | `boolean` NEW | `false` | Category rows where the office produced but the provider did not (`Provider $` = 0) are printed, so the mix of every provider has the same rows | Owner: this catalog |
| `production_basis` | `enum` NEW (`charged`, `office_fee`) | `charged` | `office_fee` swaps `Provider $` / `Practice Group $` to UCR (`office_fee`, metric `gross_production`) for fee-independent mix comparison across PPO-heavy offices | PD-1; title gains `* UCR basis` |
| `credit_hygienist` | `boolean` NEW | `false` | Category: when a charge carries `hygienist_id` (app era), the hygienist's section receives the line instead of the treating provider | PD-7; data_card 5.2 hygienist row; owner `05_metric_catalog.md` setting |
| `show_carrier_patients` | `boolean` NEW | `false` | Carrier: adds block `carrier_patients` after each carrier row: patient, visits, production, insurance collected | Class `phi_identified` / `financial_patient`; feeds bulk actions |
| `sort_by` | `enum` (shared 3.9), options NEW | `category` | Category: `category` (label order), `provider_amount_desc`; Carrier: `carrier`, `patients_desc`, `avg_production_desc` | Legacy has no sort control |
| Saved view "Provider mix - last month" | saved view | - | `date_preset = last_month`, `report_by = category`, `office_ids = @working_office` | Schedulable monthly (PD-12 link delivery) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges`, `rpt_procedure_code_dim` (`code_category`, `description`), `rpt_provider_dim` (`provider_name`, `short_id`), `rpt_visits` / `rpt_provider_visits` (seen patients), `rpt_claim_facts`, `rpt_payments`, `rpt_insurance_coverage` (carrier fallback), `rpt_office_dim` |
| Rows (both formats) | live `rpt_charges` with `is_production` (contract-billing `non_production_charge` excluded), `service_date BETWEEN :date_from AND :date_to`, `office_id IN (:office_ids)` |
| Category measures | `provider_amount` = `SUM(charged_fee)` per (office, provider, `code_category`); `office_amount` = `SUM(charged_fee)` per (office, `code_category`) over all providers; `pct_of_provider_total` = `provider_amount / SUM(provider_amount) over the provider's categories in scope`; `pct_of_office_category` = `provider_amount / office_amount`. Both `computed` with zero-denominator guard |
| Category domain | `procedure_category_codes` binds `rpt_procedure_code_dim.code_category` (12 ADA labels plus `Medical`, `Account`, data_card 2.5); whether this equals the 14-label legacy SEARCH CODE list is family open question 7 |
| Carrier attribution of a charge | `carrier_key = coalesce(rpt_charges.primary_carrier_id` (stamped at posting, DATA-33, P2) `, carrier_id of the patient's active dental slot with tier primary today` (`rpt_insurance_coverage`)`)`; NULL = `No insurance`. Until DATA-33 the carrier is today's coverage, not the coverage on the service date (availability code NEW `carrier_from_current_coverage`, owned by 03) |
| `# Patient` | `COUNT(DISTINCT patient_id)` of `rpt_visits` rows (visit-code charge) in range whose visit charges carry the carrier; with `provider_ids` from `rpt_provider_visits`. Depends on the visit-code flags (DATA-04) |
| `# of Claims` | `COUNT(DISTINCT claim_id)` of `rpt_claim_facts` with `carrier_id` = carrier, `NOT is_preauth`, `status_class NOT IN ('deleted','void')`, created date in range. Created date = office-local `created_at_utc` where `created_at_reliable`; migrated claims have no created date (data_card 2.20), so `submitted_date` stands in, with availability code NEW `claim_created_date_proxy` - REPAIR(10) per coverage matrix |
| Collections per carrier | `SUM(-amount)` of `rpt_payments` with `payer` insurance, `carrier_id` = carrier, `transaction_date` in range. Carrier on payments exists only for app remittance legs (`rpay`) and after DATA-33: **APP**. Insurance payments without a carrier are one row `Carrier not recorded` (only under `carrier_ids = all`), so the block total equals metric `insurance_collections` |
| Averages | `avg_production_per_patient = carrier_production / patient_count`, `avg_collection_per_patient = carrier_collections / patient_count`; `computed`, guard → NULL (`null_display` `-`) when `# Patient` = 0 |
| Date basis | fixed `service_date` (definition `date_basis`); carrier measures name their own basis in the column `description` (concern recorded in Open questions 4) |
| Office attribution | office of service (`rpt_charges.office_id`); claims: claim office; payments: transaction office |
| Provider attribution | treating provider `rpt_charges.provider_id` (PD-7); `credit_hygienist` switches to `hygienist_id` where recorded |
| Availability | Category: **READY** (coverage matrix 11.1 row 9). Carrier: REPAIR(10) (claim dates, coverage slots of history), SCHEMA(33) (payer on the charge), collection per carrier **APP** |
| Migrated history | the skipped migrated charges (DATA-57) lower production of migrated periods (completeness caveat); migrated insurance payments carry no carrier and fall in `Carrier not recorded`; migrated coverage tiers are wrong until the slot repair (data_card 2.21) |

### Output

Report formats: `category` (default) and `carrier`, selected by `report_by` (`forced` none). `title_templates`:
`report_by == category` → `Production Analysis by Category`; `carrier` → `Production Analysis by Carrier` (titles are a
proposal, Open questions 1).

`category_mix` (format `category`, shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | `fixed_outer` band key when multi-office |
| `provider_id` | - | id, hidden | provider_comp | group key level `provider` |
| `provider_name` | Provider | text | provider_comp | group header `Provider : {provider_name} ({short_id})`; key column |
| `row_id` | - | text, hidden | aggregate | `office_id:provider_id:category_code` |
| `category_code` | - | text, hidden | aggregate | sort key |
| `category_label` | Category | text | aggregate | subtotal label `Total for {provider_name}` |
| `provider_amount` | Provider $ | money | provider_comp | sum per provider, per office |
| `office_amount` | Practice Group $ | money | financial_practice | sum per provider (= office total over the provider's categories) |
| `pct_of_provider_total` | Prov. Prod/ Total Prov. Prod. (%) | percent (computed `share_of_parent(provider_amount)`) | provider_comp (derived) | subtotal 100 % |
| `pct_of_office_category` | Prov. Prod/ Prac. Grp Prod. (%) | percent (computed `ratio(provider_amount, office_amount)`) | provider_comp (derived) | subtotal = ratio of subtotals |
| `provider_amount_prior`, `share_change_pct` | Prior Provider $, Change (pts) | money, percent; `visible_when ["ne","compare_to","none"]` | provider_comp | sum / ratio |

Grouping: `fixed_outer` office band (`["ctx","multi_office"]`) → level `provider` (subtotal on, additive to the legacy
output); grand total off (a sum over providers is the office total, printed by `office_category_totals`). Block
`office_category_totals` (placement `after_group` of the office band; shape `table`): `category_label`, `office_amount`,
`office_share_pct` (`share_of_parent`), class `financial_practice`; a final `All selected offices` copy when multi-office.

`carrier_mix` (format `carrier`, shape `table`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | band key when multi-office |
| `carrier_id` | - | id, hidden | aggregate | row key, drill |
| `carrier_name` | Carrier | text | aggregate | key column; `null_display` `No insurance` / `Carrier not recorded` |
| `patient_count` | # Patient | integer | aggregate | `count_distinct` over the office (a patient with two carriers counts once in the total) |
| `claim_count` | # of Claims | integer | aggregate | sum |
| `carrier_production` | Production | money, hidden by default (`default_visible false`) | financial_practice | sum; numerator of the average |
| `avg_production_per_patient` | Avg. Production per Pat | money (computed `ratio(carrier_production, patient_count)`) | financial_practice | ratio of totals |
| `carrier_collections` | Collections | money, `default_visible false` | financial_practice | sum (= `insurance_collections`) |
| `avg_collection_per_patient` | Avg. Collection per Pat | money (computed `ratio(carrier_collections, patient_count)`) | financial_practice | ratio of totals |

`carrier_patients` (`visible_when ["truthy","show_carrier_patients"]`, placement `after_group`): `patient_id` (hidden),
`patient_name` (phi_identified, entity patient), `visit_count`, `production`, `insurance_collected` (financial_patient).

Sort: `category_mix` provider last name, then `category_label` (or `provider_amount` desc); `carrier_mix` carrier name
(enhancement options above). Page break: none legacy; the office band starts a new page in PDF. Summary cards (block totals):
category format - office production (`office_amount` total, `reconciles_with` `charged_production`), number of providers;
carrier format - patients seen, claims created, insurance collections (`reconciles_with` `insurance_collections`). Metric
`category_production_share_pct` (P2) is the governed twin of the second % column. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Chart: category format - stacked 100 % bar per provider (`category_label` stacks, value `provider_amount`, `top_n` 8 plus
`Other`); carrier format - horizontal bar of `avg_production_per_patient` per carrier with `patient_count` as label.

| Click | Target |
|---|---|
| Category row (`provider_amount`) | `kind = report`, `daily.special_transaction_report`: `date_basis = service_date`, `date_from`/`date_to` copied, `office_ids = {group: office_id}`, `provider_ids = [{column: provider_id}]`, `code_scope_mode = category`, `code_scope_selection = [{column: category_code}]`, `payment_adjustment_codes = none`, `group_by = code` - the procedure lines that sum to the cell |
| `office_amount` | Same target without `provider_ids` |
| Provider subtotal | `daily.production_report` with `report_by = provider`, `report_format = detail`, `provider_ids = [provider_id]`, date range and office copied |
| Carrier `# of Claims` | `kind = report`, Insurance Claims List (key owned by `catalog/insurance_reports.md`), `carrier_ids = [carrier_id]`, date range copied |
| Carrier `# Patient` | `kind = rows` of block `carrier_patients` (sets `show_carrier_patients = true`, `carrier_ids = [carrier_id]`) |
| Patient row of `carrier_patients` | `kind = record`, patient ledger (`phi_identified`, ledger feature right) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Export selection | bulk | `export_selection` | Selected rows of either block (ENG-49, P3) |
| Open patient ledger | row (`carrier_patients`) | `navigate` | |
| Letter / postcard to carrier patients | bulk (`carrier_patients`) | `letters` | e.g. network-change notice to patients of one carrier; owning correspondence feature (PD-15), consent exclusions `no_correspondence` |

Not a worklist: an analysis, not a queue.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (five columns); header practice-group name, variant title, `From / Thru`; office band per office, `All selected offices` section last; footer criteria echo (Offices, Providers, Categories or Carriers, `* UCR basis` when on), `Printed :`, `Page : n of m`; availability notes (carrier from current coverage, claim created proxy, collections APP) in the criteria block |
| XLSX | One sheet per block (`category_mix` or `carrier_mix`, `office_category_totals`, `carrier_patients` when on), `criteria` sheet; percentages as numeric percent cells |
| CSV | Main block of the active format |
| Background | Not needed for a month; year ranges of a large group escalate to `background` once ENG-38 exists (P2) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Printed titles, section layout (provider sections assumed), any totals rows | Print both variants once (RPT-DAILY-09) |
| 2 | Does ANALYSIS BY = Carrier enable CARRIER and grey CATEGORY (supplement unresolved r09) | Switch the radio on the criteria screen |
| 3 | Carrier variant: what PROVIDER filters (production, patients, claims, collections) | Run Carrier with one provider |
| 4 | "Carrier gross collection": insurance payments of the carrier (assumed) or all collections of its patients | Compare one carrier row with a ledger total |
| 5 | Denominator of the first %: provider total over selected categories (assumed) or over all categories | Run with one category picked |
| 6 | With an office group: is `Practice Group $` the group total (legacy label) or each office (vendor text) | Run Office Group with two offices |
| 7 | Is a patient "attached to the carrier" by primary coverage only, or by any coverage tier | Patient with secondary coverage only |

## Daily Audit - `daily.daily_audit`

Daily Reports, screenshot 10.PNG - P1 - M - `reports_daily_reports_screen_view_only` (family `daily`) - interactive - DOCUMENTED (options and columns in vendor text, no sample image)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office | End of day | Every scheduled patient has a ledger transaction, and no appointment that did not happen is left unresolved (research A10 [P2][T2]) |
| Assistants and providers | End of day, sorted or grouped by provider | Write and sign the missing progress notes of the day; offices that do not sign notes ignore the last column |
| DSO / office manager | Every morning for the previous day | Exception review across offices; the success state is an empty report |

### Legacy output

Confidence: **DOCUMENTED** (columns and options in text [P32][P33]); no sample image, so column order follows the article.
One row per patient-office-day that fails at least one ticked test (exception list). Columns [P32]:

| # | Column | Content |
|---|---|---|
| 1 | `Appt Date` | Appointment date (blank when no appointment that day) |
| 2 | `Tran Date` | Ledger transaction date (blank when none) |
| 3 | `PN DOS Date` | Progress-note date of service (blank when none) |
| 4 | `Pat ID` | Patient id |
| 5 | `Name` | Patient name |
| 6 | `Last Visit` | Last appointment date |
| 7 | `Pat Type` | Patient types on file, abbreviated |
| 8 | `Provider` | Provider, abbreviated (vendor conflict: preferred provider or provider on the transaction date) |
| 9 | `Ledger Transaction` | ✓ / X - a ledger transaction exists for the scheduled procedures |
| 10 | `Appt` | ✓ / X - an appointment exists in the same office on the same day as the ledger entry |
| 11 | `PN` | ✓ / X - a progress note was added in the same office on the same day |
| 12 | `PN With Sig` | ✓ / X - the note was signed in the same office on the same day |

Grouping: `Office : <name>` band (multi-office); with GROUP BY Provider one section per provider, page break per provider.
Totals: none documented; we add a count per group and per office. Quirks kept: only procedure codes flagged `Visit Code`
count as a ledger transaction [P33] (a posted non-visit code still shows X); matching is same office and same day [P32].
Success state: an empty report [P32] - rendered as an explicit "all clear" state (family rule).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r10 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` (default ALL) | `p_office_ids` of `rpt_visit_audit()`: the office of the appointment, charge and note (one office per row); office band per office when multi-office |
| PROVIDER `ALL` (default) / list | `p_provider_ids`: keeps a patient-office-day when a selected provider is on one of its appointments or visit-code charges (`appointment_provider_ids`, `charge_provider_ids`); the four tests stay whole-day, so a day worked by a hygienist and a dentist shows in both lists and never a false "missing appointment" |
| DATE RANGE Start / End (default today / today) | `visit_date` (the date of the PATIENT HAS record: appointment date, ledger transaction date or note DOS; same day by construction) between the bounds, office-local |
| PATIENT HAS `ALL` (default) | Population = patient-office-days with an appointment OR a ledger transaction OR a note |
| PATIENT HAS `Appointment` | Population = days with `has_appointment` |
| PATIENT HAS `Transaction in Ledger` | Population = days with `has_ledger_transaction` (visit-code charge) |
| PATIENT HAS `Progress Notes` | Population = days with `has_progress_note` |
| BUT MISSING `Appointment` (ticked) | Row prints when `NOT has_appointment` |
| BUT MISSING `Transaction in Ledger` (ticked) | Row prints when `NOT has_ledger_transaction` |
| BUT MISSING `Progress Notes` (ticked) | Row prints when `NOT has_progress_note` |
| BUT MISSING `Progress Notes with Signature` (ticked) | Row prints when `NOT has_signed_note` (a day without any note also fails this test) |
| BUT MISSING combination | `missing_items` is a predicate (filter_card 2.5): row prints when ANY ticked item is missing; at least one box (`min_items 1`). A test equal to the PATIENT HAS choice can never fail (e.g. Appointment / Appointment) and adds nothing |
| SORT BY `Date` (default) | `visit_date` (the date of the PATIENT HAS type; with ALL the appointment date, which is the same day), then last name |
| SORT BY `Patient Lastname` | Last name, first name, within each office band |
| SORT BY `Provider` | First provider short id of the row (appointment providers, then charge providers), then date |
| GROUP BY `None` (default) | Flat list per office |
| GROUP BY `Provider` | One section per provider from the distinct union of `appointment_provider_ids` and `charge_provider_ids` (`note_provider_ids` when the day has neither); a row appears under each of its providers; subtotal count per provider |
| GROUP BY `Page Break` (greyed while None) | `page_break_by = group`: new PDF page per provider section |

Dependency rules: `page_break_by` member `group` `enabled_when ["eq","group_by","provider"]`, and `default_when` the same
condition sets it to `group` (rule d01, ticked automatically; whether the legacy locks it is to be confirmed). Rule d02:
office scope mode switches the picker source (`lookup:offices` / `lookup:office_groups`, default `working_office` / `all`).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_range` presets `yesterday`, NEW token `previous_office_day` | preset / token | `today` unchanged | The documented morning routine (previous day) without typing; `previous_office_day` skips closed days (`rpt_office_calendar_days()`, DATA-55) | Token owned by `04_filter_framework.md` 7.4 |
| `include_resolved_appointments` | `boolean` NEW | `false` | `true` also counts cancelled and no-show appointments as "has appointment" (default: only appointments that were or should have been kept, Data) | Owner: `03_data_foundation.md` (`rpt_visit_audit()` argument) |
| `show_preferred_provider` | `boolean` NEW | `false` | Adds column `Pref Prov` (`rpt_patient_dim.preferred_provider_id`) beside `Provider`, settling the vendor conflict visibly | NULL on migrated patients |
| `show_scheduled_codes` | `boolean` NEW | `false` | Adds `Appt Codes` (booked codes of the day, `rpt_appointment_procedures`) and `Posted Codes` (all codes posted that day, visit and non-visit) so the X on `Ledger Transaction` is explained when a non-visit code was posted | Class `phi_identified` |
| Saved views | saved view | - | "Yesterday - unsigned notes by provider" (`date_preset = yesterday`, `missing_items = [progress_notes, progress_notes_with_signature]`, `group_by = provider`); "Scheduled but not posted" (`patient_has = appointment`, `missing_items = [ledger_transaction]`); "No signature check" (three boxes, for offices that do not sign notes) | Schedulable daily with `skip_if_empty` |
| Worklist twin | worklist | - | The provider's own exceptions under `my_reports` rights (Unsigned progress notes worklist, security_card 2.3) | Owned by `06_dashboards.md` |

### Data

| Topic | Rule |
|---|---|
| Dataset | `rpt_visit_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to, p_provider_ids)` (data_card 2.17): one row per (`patient_id`, `office_id`, `visit_date`) with `has_appointment`, `has_ledger_transaction`, `has_progress_note`, `has_signed_note`, `appointment_provider_ids`, `charge_provider_ids`, `note_provider_ids`, `appointment_count`, `procedure_count`, `charged_production` |
| Joined | `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `patient_type_codes`, `preferred_provider_id`), `rpt_patient_activity` (`last_appointment_date`, `last_visit_date`), `rpt_provider_dim` (`short_id`) |
| Population | `patient_has`: `all` → `has_appointment OR has_ledger_transaction OR has_progress_note`; otherwise the one flag |
| Exception predicate | OR over the ticked `missing_items` of `NOT <flag>` |
| Appointment side | live appointments (`NOT is_block AND NOT is_deleted`, archive per tenant policy) with `status_class NOT IN ('cancelled','no_show')` - a resolved broken appointment needs no transaction; `past_unresolved` and `completed` count. The status rule is NEW for the function (owned by 03); `include_resolved_appointments` lifts it |
| Ledger side | live visit-code charges (`is_visit_code`, DATA-04) of the patient, office and day. Until the office reviews the flags (DATA-04 default rule) the test follows the shipped default; availability code NEW `visit_code_flags_unreviewed` when `rpt_data_quality` reports the flags unreviewed |
| Note side | `rpt_progress_note_facts` not deleted, `note_date` = day, same office; signed = `is_signed` |
| Dates | `appt_date` = `visit_date` when `has_appointment`; `tran_date` = `visit_date` when `has_ledger_transaction`; `pn_dos_date` = `visit_date` when `has_progress_note`; otherwise NULL (`null_display` blank) |
| `Last Visit` | `rpt_patient_activity.last_appointment_date` (legacy "last appointment date"), current state, not relative to the audited day (Open questions 3) |
| Office / provider attribution | office of the record (same office, same day); provider arrays as above (vendor conflict, family open question 2) |
| Availability | **READY** (coverage matrix 11.1 row 10); signed-note test **APP**: every migrated note is unsigned (data_card 2.18), so with the default boxes every migrated day with a note prints `PN With Sig` X - availability code NEW `signature_test_app_only` on runs that touch migrated dates |
| Migrated history | migrated notes have no author: `note_provider_ids` empty; a note belongs to patient and date only until DATA-18, so two appointments of one patient on one day share the note test; archived appointments follow the tenant policy |

### Output

Report format: one (`standard`). Block `exceptions` (shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | band key |
| `row_id` | - | text, hidden | phi_identified | `patient_id:office_id:visit_date` |
| `group_provider_id` | - | id, hidden; active only with `group_by = provider` | aggregate | group key; header `Provider : {provider_name}` |
| `visit_date` | - | date, hidden | phi_identified | sort key `date` |
| `appt_date` | Appt Date | date | phi_identified | none |
| `tran_date` | Tran Date | date | phi_identified | none |
| `pn_dos_date` | PN DOS Date | date | phi_identified | none |
| `patient_id` | - | id, hidden | phi_identified | drill, manifest |
| `chart_no` | Pat ID | text | phi_identified | none |
| `patient_name` | Name | text, entity patient | phi_identified | key column; `count` per group, office, grand |
| `patient_last_name` | - | text, hidden | phi_identified | sort key |
| `last_visit` | Last Visit | date | phi_identified | none |
| `pat_type` | Pat Type | text | phi_identified | none (comma-separated codes) |
| `provider_short_ids` | Provider | text | aggregate | none (comma-separated) |
| `preferred_provider_short_id` | Pref Prov | text, `visible_when ["truthy","show_preferred_provider"]` | aggregate | none |
| `has_ledger_transaction` | Ledger Transaction | boolean (✓ / X) | phi_identified | count of X |
| `has_appointment` | Appt | boolean | phi_identified | count of X |
| `has_progress_note` | PN | boolean | phi_identified | count of X |
| `has_signed_note` | PN With Sig | boolean | phi_identified | count of X |
| `appointment_id` | - | id, hidden | phi_identified | drill (first appointment of the day) |
| `appt_codes`, `posted_codes` | Appt Codes, Posted Codes | text, `visible_when ["truthy","show_scheduled_codes"]` | phi_identified | none |

No `clinical` column: only presence of a note and a signature (security_card 5.2 rule 11). Grouping: `fixed_outer` office
band → optional level `provider` (`group_by` option `provider`, `page_break_allowed`); subtotal `Total for {provider_name}`
= row count and the four X counts; grand total off when single office. Sort options: `date` (`visit_date`,
`patient_last_name`, `row_id`), `patient_last_name` (`patient_last_name`, first name, `visit_date`), `provider`
(`provider_short_ids`, `visit_date`). Page break: `group` (provider). Summary cards (block totals): exceptions (row count,
metric `daily_audit_exceptions_count`), missing appointment, missing ledger transaction, missing note, unsigned (count of X
per column; the last relates to `unsigned_progress_notes_count`). `empty_when`: `no_detail_rows` → all-clear state.

### Visuals and drill-through

Chart: none - an exception list. The summary cards act as quick filters on the snapshot.

| Click | Target |
|---|---|
| Patient name | `kind = record`, patient overview (`phi_identified`, patient feature right) |
| `Ledger Transaction` X | `kind = record`, patient ledger at `visit_date` (ledger feature right) |
| `Appt` X / `Appt Date` | `kind = record`, appointment (`appointment_id`) in the Scheduler; X on a day without appointment opens the Scheduler on that day and office |
| `PN` / `PN With Sig` X | `kind = record`, patient progress notes at `visit_date` (progress-notes feature right) |
| Summary card | Same report, snapshot quick filter on the column (no new run) |
| Provider subtotal | `daily.progress_notes` (`report_type` Unsigned, provider and date range copied) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient / ledger / appointment / notes | row | `navigate` | As drills |
| Create task "complete visit record" | bulk | `create_task` | Assigned to the row's provider (or a chosen user); task text names the missing items and the date; handler of the tasks feature (P3) |
| Message provider | bulk | `custom:internal_message` NEW | One user-to-user message per provider listing the patients with missing or unsigned notes (Messaging feature handler; owner of the handler key `02_architecture.md`) |
| Export selection | bulk | `export_selection` | ENG-49 |

Doubles as a worklist: yes. With the snapshot, a fixed row stays until re-run; the worklist twin (`06_dashboards.md`) uses
`paging_mode = live` so a signed note drops out.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (12 columns); header practice-group name, `Daily Audit`, `From / Thru`; office band; provider section with page break when grouped; ✓ / X glyphs from the vendored font; footer criteria echo (Patient Has, But Missing, Providers, Offices), `Printed :`, `Page : n of m`; empty run prints "No exceptions found for the selected criteria" |
| XLSX | Sheet `exceptions` with booleans as `TRUE` / `FALSE`, provider as a column (no section rows), `criteria` sheet |
| CSV | `exceptions` |
| Background | Not needed (one row per patient-day) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Provider meaning: preferred provider or provider on the transaction date (vendor conflict); our arrays answer "who worked the day" | Run with one provider on a day worked by two providers |
| 2 | Page Break: can the user untick it under GROUP BY Provider | Toggle on the criteria screen |
| 3 | `Last Visit`: last appointment overall or before the audited day | Audit a past day for a patient seen since |
| 4 | Transaction in Ledger: Visit Code flag only, or Visit Code and Ledger Code (vendor texts differ) | Post a ledger-only code on an appointment day |
| 5 | Do cancelled / missed appointments count as "has appointment" (we exclude them) | Cancel an appointment and run the day |
| 6 | Column order and ✓ / X rendering | One printout |

## Claims Printed - `daily.claims_printed`

Daily Reports, screenshot 11.PNG - P1 - S - `reports_daily_reports_screen_view_only` (family `daily`) - instant - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff | End of day | Confirm that the paper claims printed today went out, and that each printed claim was then marked sent (printing alone does not mark a claim sent, research A11 [P38]) [unverified] |
| Office manager | Weekly | Paper volume per carrier: candidates for moving to electronic submission |
| Auditor | On demand | Who printed which claim when (PHI disclosure trail of paper claims) |

### Legacy output

Confidence: **INFERRED**. No vendor description exists (research A11); the report appears in no old-name source. The
layout below follows Denticon's own `Claims Listing` (Insurance Reports > Claims List, 2011 sample [P39·img]) and must be
confirmed with one live printout (RPT-DAILY work item below) before the columns are frozen.

| Format | Inferred layout |
|---|---|
| Detail | `Carrier : <name>  Ph : <phone>` header → one line per printed claim → `Total for <carrier> [ <count> ] :` with amount sums |
| Summary | One line per carrier: carrier, number of claims, claim amount, estimated insurance [unverified] |

Detail columns (Claims Listing model): `Chart #` (with an `ORTHO` marker), `Patient / Subscriber`, `Patient - Subscriber DOB`,
`Sub ID`, `Claim #`, `Claim Sent - DOS`, `Claim Amt`, `Est. Ins`, `Recv. Amt.`, `Rem. Amt.`, `Status`. We add `Printed`
(date and time of the print) because it is the report's date basis. Footer of the model: `From` / `Thru`, `Carrier`,
`Provider`. Sign: claim amounts positive; `Rem. Amt.` = expected minus received.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r11 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Format `detail`: block `printed_claims`, one row per printed claim, grouped by carrier |
| REPORT FORMAT `Summary` | Format `summary`: block `carrier_summary`, one row per carrier (counts and amounts of the same claims) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` (ALL) | Claim office (`rpt_claim_facts.office_id`) in the resolved list; office band when multi-office |
| PROVIDER `ALL` (default) / list | Billing provider of the claim (`rpt_claim_facts.billing_provider_id`), INFERRED (treating provider is the alternative, Open questions 2) |
| DATE RANGE Start / End (default today / today) | Fixed basis `claim_printed_date` (NEW, DATA-21): claims with at least one print event whose office-local date is in the range |
| CARRIER `ALL` (default) / list | `carrier_ids` on `rpt_claim_facts.carrier_id` |

Dependency rules: none on the legacy screen (no greyed control). Office scope rule d02 of the family applies.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `only_not_marked_sent` | `boolean` NEW | `false` | Keeps claims whose `status_class = 'unsent'` after the print: the "printed but never marked sent" worklist | Owner: this catalog |
| `show_each_print` | `boolean` NEW | `false` | One row per print event instead of per claim (reprints visible, with `Printed By`) | `Printed By` is class `user_activity` |
| `include_preauthorizations` | `boolean` NEW | `true` | `false` drops printed pre-authorisations (`is_preauth`); column `Type` shows Claim / Pre-auth | Legacy screen has no control; `true` keeps the inferred legacy population. Not the shared `claim_kind` (single choice, default `claims`) |
| `user_ids` | `entity_multi` (shared 3.2) | `all` | Prints made by the selected users (`claim_print_events.printed_by_user_id`) | App-era only by construction |
| `date_range` presets `yesterday`, `this_week` | preset | `today` | Weekly paper review | |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts` (`claim_id`, `claim_number`, `claim_family_no`, `patient_id`, `office_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `tier`, `is_preauth`, `status_class`, `submitted_date`, `service_from`, `service_to`, `billing_provider_id`, `treating_provider_id`, `billed_amount`, `expected_amount`, `paid_amount`, `outstanding_amount`, `outstanding_quality`, `subscriber_id`, `subscriber_name`, `subscriber_dob`, `print_count`, `last_printed_at`, `sent_method`), `claim_print_events` (NEW, DATA-21: `claim_id`, `printed_at`, `printed_by_user_id`, `office_id`, `channel` (`ada_direct`, `batch_paper`, `preview`), `form_version`), `rpt_patient_dim` (`chart_no`, names, `dob`, `is_ortho_patient`) |
| Row filter | claims with an `EXISTS` print event in range (`(printed_at AT TIME ZONE 'UTC' AT TIME ZONE office tz)::date BETWEEN :date_from AND :date_to`), `status_class <> 'deleted'`; preview-only events excluded (a print preview is not a print) |
| E-claims | Only paper prints are events; a claim sent electronically appears only if it was also printed (copy for the office) - inferred |
| Date basis | fixed `claim_printed_date` (NEW; filter_card 3.10: claim prints are not recorded today) |
| Office / provider attribution | claim office; billing provider of the claim (inferred) |
| Money | `billed_amount` (Claim Amt), `expected_amount` (Est. Ins), `paid_amount` (Recv. Amt.), `outstanding_amount` (Rem. Amt.; blank when `outstanding_quality = 'unknown'`). Per-tier columns, so a secondary claim prints its own expected amount. `billed_amount` describes the lines of the whole claim family (data_card 2.20 Family rule): when a primary and its secondary are both printed in the range, the carrier totals count `billed_amount` once per `claim_family_no` and carrier |
| Availability | **SCHEMA(21)** (coverage matrix 11.1 row 11): prints are not recorded today. The frontend prints the ADA form client-side (`src/features/claims/ada/AdaClaimPrintModal.tsx`) and keeps a print log only in `localStorage` (`dentc:claim_print_log:v1:<claim_id>`, `appendClaimPrintLog` in `src/features/claims/ada/adaLocalStores.ts`), which the server cannot read. After DATA-21 the report is **APP**: no print before the capture start exists; availability code NEW `claim_prints_not_recorded_before` (with the capture start date) on ranges that start earlier |
| Migrated history | no migrated claim has a print event; `print_count` is 0 on every migrated claim |

### Output

Report formats `detail` (default) and `summary`. `title_templates`: `Claims Printed - Detail` / `Claims Printed - Summary`
(proposal).

`printed_claims` (format `detail`, shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | band key |
| `carrier_id` | - | id, hidden | aggregate | group key; header `Carrier : {carrier_name}  Ph : {carrier_phone}` |
| `row_id` | - | text, hidden | phi_identified | `claim_id` (or `claim_id:event_id` with `show_each_print`) |
| `patient_id`, `claim_id` | - | id, hidden | phi_identified | drill, manifest |
| `chart_no` | Chart # | text | phi_identified | none; suffix `ORTHO` when `is_ortho_patient` |
| `patient_subscriber` | Patient / Subscriber | text, entity patient | phi_identified | key column; subtotal label `Total for {carrier_name} [ {count} ] :` |
| `patient_subscriber_dob` | Patient - Subscriber DOB | text | phi_identified | none |
| `subscriber_id` | Sub ID | text | phi_sensitive | none (dropped for a caller without the class) |
| `claim_number` | Claim # | text | phi_identified | `count` |
| `tier` | Tier | enum | aggregate | none (added: primary / secondary ...) |
| `sent_dos` | Claim Sent - DOS | text | phi_identified | none (`submitted_date` and `service_from`) |
| `printed_at` | Printed | datetime (`tz: office`) | phi_identified | none; latest print in range |
| `printed_by` | Printed By | text, `visible_when ["truthy","show_each_print"]` | user_activity | none |
| `billed_amount` | Claim Amt | money | financial_patient | sum per carrier, office, grand |
| `expected_amount` | Est. Ins | money | financial_patient | sum |
| `paid_amount` | Recv. Amt. | money | financial_patient | sum |
| `outstanding_amount` | Rem. Amt. | money | financial_patient | sum (unknown-quality rows excluded and counted) |
| `status_label` | Status | enum | aggregate | none |

`carrier_summary` (format `summary`): `carrier_name` "Carrier" (aggregate, key), `claim_count` "# Claims" (integer, sum),
`print_count` "# Prints" (integer, sum), `billed_amount` "Claim Amt", `expected_amount` "Est. Ins" (money,
`financial_practice`, sum); grand total.

Grouping: office band → carrier level (detail). Sort inside a carrier: patient last name, `claim_number`, `row_id` (no
legacy SORT BY). Page break: none legacy. Summary cards (block totals): claims printed, claims printed and still unsent,
claim amount printed. No metric key covers prints (a governed count would be NEW in `05_metric_catalog.md`). `empty_when`:
`no_detail_rows` → all-clear state ("No paper claims printed in the range").

### Visuals and drill-through

Chart: none - a list (summary format: bar of claims per carrier when more than three carriers).

| Click | Target |
|---|---|
| Claim # / row | `kind = record`, claim detail (`route_key claim`, claim feature right, `phi_identified`) |
| Patient | `kind = record`, patient insurance screen |
| Summary carrier row | `kind = rows`: format `detail`, `carrier_ids = [carrier_id]` |
| Card "printed and still unsent" | Same report with `only_not_marked_sent = true` |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open claim | row | `navigate` | |
| Mark as sent | bulk | `custom:claims_mark_sent` NEW | Calls the claims feature's send-status update for the selected unsent claims (legacy `Update as Sent` of Outstanding Paper Claims, research A11 [P38]); needs the claim edit right; idempotent per `(run_id, action_key, claim_id)` |
| Reprint | row | `navigate` | Opens the ADA print modal for the claim (records a new print event) |
| Export selection | bulk | `export_selection` | |

Doubles as a worklist with `only_not_marked_sent`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; header practice-group name, title per format, `From / Thru`; carrier band with phone; footer criteria echo (Offices, Providers, Carriers), `Printed :`, `Page : n of m`; `claim_prints_not_recorded_before` note in the criteria block |
| XLSX | `printed_claims` or `carrier_summary`, carrier as a column, `criteria` sheet |
| CSV | Active block |
| Background | Not needed |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Real layout, columns and Summary content (whole report INFERRED) | Obtain one printout of each format |
| 2 | PROVIDER: billing or treating provider | Claim whose billing and treating providers differ |
| 3 | Date basis: printed, created or sent date | Print an old claim today and run today |
| 4 | Are e-claims and pre-authorisations included | Run a day with one e-claim and one printed pre-auth |
| 5 | Does a batch print (Outstanding Paper Claims) and a single-claim print both count | Print one claim each way |
| 6 | Product decision: is a print preview a print (we exclude previews) | Product owner |

## Special Transaction Report - `daily.special_transaction_report`

Daily Reports, screenshot 12.PNG (plus vendor-documented Sort By row) - P1 - L - `reports_daily_reports_screen_view_only` (family `daily`) - interactive (background above `max_rows_inline` once ENG-38 exists, P2) - DOCUMENTED (PDF and Excel samples, 2025)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Management | As needed (research A12 [P2]) | Count procedures for fee negotiation (codes by provider, carrier plan); clinical-mix questions such as an exam code charged to ages 0-3 or sealants done today |
| Billing | On demand | Find every account that received a finance charge on a date (adjustment code); find payments of one patient for an HSA / FSA receipt in Excel [P36][P37] |
| Office manager | Daily / weekly | Postings by user or by transaction provider for a chosen code set |

### Legacy output

Confidence: **DOCUMENTED** [P36·img][P37·img]; group totals, the meaning of `PRIM` / `SEC` and the Amount dropdown values are
unverified. Title `Special Transaction Report`.

PDF: criteria block at the **top** (`Patient Name Range`, `Date Range`, `Providers`, `Payment/Adjust`, `Procedure Codes`,
`Excluded Pat Types`, `Group By`), then `Office: <name>`, then a group header per Group By value (e.g. `Code: <code> -
<description>`), then:

| # | Column | Content |
|---|---|---|
| 1 | `Date` | Transaction or service date (per the date-basis radio) |
| 2 | `Patient ID` | |
| 3 | `Patient Name` | |
| 4 | `Pat Type` | User-defined patient types, comma-separated |
| 5 | `Tran Prdr` | Transaction provider |
| 6 | `UCR` | Office fee |
| 7 | `PRIM`, `SEC` | Primary / secondary insurance portions [unverified meaning] |
| 8 | `AMOUNT` | Transaction amount |

Excel (flat, one row per transaction): `Office Name`, `Code` (code - description), `Date`, `Patient ID`, `Patient Name`,
`Pat Type`, `Transaction Provider`, `UCR`, `PRIM`, `SEC`, `AMOUNT`, with the group value repeated as a column.

Kept: criteria echo at the top; one flat Excel row per transaction. Added (not documented): group subtotals (count, UCR,
PRIM, SEC, AMOUNT) and an office total. Sign: `AMOUNT` = `rpt_ledger_entries.amount` (charges positive, payments negative,
adjustments with their sign); the legacy sign of payment rows is unverified (Open questions 4). `PRIM` / `SEC` are the
insurance estimates at posting on procedure rows (proposal), blank on payment and adjustment rows.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r12 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; Excel = the flat layout above (group value as column); `csv` added |
| OFFICE/GROUP `Office` (default) / `Office Group` (ALL) | Transaction office (`rpt_ledger_entries.office_id`); Office Group reproduces the old group-level report; office band per office |
| PROVIDER/USER Provider `ALL` (default) / list | Transaction provider of the line (`rpt_ledger_entries.provider_id`: treating provider on charges, credited provider on payments, adjustment provider) |
| PROVIDER/USER User `ALL` (default) / list | Poster of the line (`user_key`); migrated rows match only under `all` |
| DATE RANGE `Transaction Date` (default) | `transaction_date` between the bounds (ledger date; family open question 1) |
| DATE RANGE `Service Date` | `service_date_effective` between the bounds (charges: date of service; adjustments and payments: date of the linked charge, else transaction date). On charges both bases select the same rows until DATA-13 |
| DATE RANGE Start / End (default today / today) | Inclusive, office-local |
| PATIENT NAME RANGE Start `AAAAA` / End `ZZZZZ` (defaults) | Sort name `Last, First` range with the prefix rule; sentinel bounds add no predicate; same name twice = one patient. SEARCH buttons superseded by the lookup in each box |
| EXCLUDE PATIENT TYPE `None` (default) / list | Patients holding any selected user-defined type are dropped (`NOT` overlap with `patient_type_codes`; patients without a type kept). Vendor text calls it an include filter (conflict, Open questions 2) |
| PAYMENT/ADJ CODES `None` (default) | No payment or adjustment rows |
| PAYMENT/ADJ CODES `ALL` / list (`NONE` button resets to None) | Adds payment legs and adjustment legs (adjustments, refunds) whose code is selected (`payment_adjustment_codes`, values `kind:code`) |
| INSURANCE PLANS/SUB TYPES `ALL` (default) / list | `plan:<id>` keeps patients with an active coverage slot of that plan; `subtype:medical` / `subtype:dental` keeps patients with a slot of that `reporting_subtype`; a list is OR. `all` = no predicate (uninsured patients kept). Today's coverage until DATA-33 |
| CODE/CATEGORY `Code` (default) | The picker lists procedure codes (`lookup:procedure_codes`) |
| CODE/CATEGORY `Category` | The picker lists ADA categories (`lookup:procedure_categories`); procedure rows by `code_category` |
| CODE/CATEGORY picker `ALL` (default) / list / `NONE` button | `all` = every procedure row; list = those codes or categories; `none` = no procedure rows |
| OTHER OPTIONS Age Range unticked (default) / ticked | Gate of the age filter; unticked = no age predicate |
| Age From `0` / To `999` (defaults, greyed until ticked) | Inclusive age in whole years at the run's reference date; `0` / `999` are open bounds; a narrowed bound drops patients without a birth date |
| Amount `All Amount` (default) / other operators | `All Amount` = no predicate; the other values are not captured (unknown_legacy); proposal: `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal`, `equal`, compared with the absolute value of `AMOUNT` |
| Amount value (default 0.00, greyed while All Amount) | Comparison value; required when the operator is not `all` |
| Group By `Code` (default) | Group per code: header `Code: {code} - {description}` (procedure, payment or adjustment code) |
| Group By `Username` | Group per poster: `Username: {user_label}` |
| Group By `Insurance Plan` | Group per primary plan of the line (Data): `Insurance Plan: {carrier_name} - {group_number}`; `No insurance` group |
| Group By `Transaction Provider` | Group per line provider: `Transaction Provider: {provider_name}` |
| Sort By `Patient LastName` / `Patient ID` / `Date` (VENDOR-DOC row; default not documented, parity default `patient_last_name`) | Order inside each group; `Date` = the column of the chosen date basis |

Dependency rules: d01 - `code_scope_mode` switches the source of `code_scope_selection` and resets it to `all`; `none`
stays allowed in both modes. Age `From` / `To` `enabled_when ["truthy","age_range_enabled"]` (inferred). `amount_value`
`enabled_when` and `required_when ["ne","amount_operator","all"]` (inferred). d02 (UPDATE MY FAVORITES) is the hub's saved
view behaviour. When both `code_scope_selection` and `payment_adjustment_codes` are `none` the run is valid and empty; the
form shows the hint "Select procedure codes or payment / adjustment codes" (legacy behaviour unconfirmed).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `age_basis` | `enum` NEW (`run_date`, `row_date`) | `run_date` | `row_date` computes age on the line's date (the "exam code to ages 0-3" question asks the age at service) | Owner: `04_filter_framework.md` (age reference) |
| Code picker extras | FLT-25 (P3) | `all` | Code ranges (`D1351`, `D0100-D0999`), saved code sets ("Sealants", "Exams") | Default unchanged |
| `show_code_count_summary` | `boolean` NEW | `false` | Adds block `code_counts` (per code: count, patients, UCR, AMOUNT) at the report end - the fee-negotiation count without reading the detail | Class `financial_practice` |
| `include_voided` | `boolean` NEW | `false` | Reads `rpt_ledger_entries_all` and adds column `Voided` | Class `user_activity` on the flag; for audit of deleted postings |
| `compare_to` | `enum` (FLT-26, P4) | `none` | Adds prior-period count and AMOUNT to `code_counts` | |
| Saved views | saved view | - | "Finance charges yesterday" (`payment_adjustment_codes = [adjustment:<finance charge code>]`, `code_scope_selection = none`, `date_preset = yesterday`, `group_by = code`); "Sealants today, ages 6-14" (category Preventive or code set, age gate on); "One patient's payments this year" (same name twice, payment codes ALL, `date_preset = year_to_date`) | The patient view cannot be shared organisation-wide (filter_card 12, SH-1) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (rows), `rpt_charges` (`est_ins_primary`, `est_ins_secondary`, `primary_ins_plan_id` after DATA-33), `rpt_patient_dim` (`chart_no`, names, `dob`, `patient_type_codes`), `rpt_insurance_coverage` (`ins_plan_id`, `carrier_name`, `group_number`, `reporting_subtype`, `tier`, `category`), `rpt_procedure_code_dim` (`description`, `code_category`), `rpt_transaction_code_dim` (payment / adjustment descriptions), `rpt_provider_dim`, `rpt_user_dim` (`user_label`) |
| Row sets | procedure rows: `entry_type = 'charge'` filtered by `code_scope`; payment / adjustment rows: `code_kind IN ('payment','adjustment','system')` and `kind:code` in `payment_adjustment_codes`. Transfers and opening balances are selectable only by their code; capitation legs (no patient) are excluded (no patient attributes to test) |
| Filters | office (`office_id`), `provider_id`, `user_key`, date column per `date_basis`, name range on `upper(last_name || ', ' || first_name)`, `NOT (patient_type_codes && :exclude)`, coverage `EXISTS` on `rpt_insurance_coverage`, age from `dob`, amount on `abs(amount)` |
| Insurance plan of a line (grouping) | charges: `primary_ins_plan_id` (DATA-33, P2), else the patient's active dental primary slot today; payments: `ins_plan_id` (DATA-33) else the same fallback; NULL = `No insurance`. Availability code NEW `plan_from_current_coverage` until DATA-33 |
| Columns used | `entry_id`, `entry_type`, `code`, `code_kind`, `amount`, `office_fee`, `transaction_date`, `service_date_effective`, `office_id`, `provider_id`, `patient_id`, `user_key`, `procedure_id`, `claim_id`, `is_void` (with `include_voided`) |
| Date basis | `date_basis` parameter: `transaction_date` (default) / `service_date` |
| Office / provider / user attribution | transaction office; transaction provider (Tran Prdr); poster `user_key` |
| Availability | **READY** (coverage matrix 11.1 row 12). Payment / adjustment codes on history: REPAIR(12) - migrated payments carry only the tender aliases `CASH`, `CHECK`, `CARD`, `ACH` and adjustments `unclassified`, so a specific code finds app-era rows only (code `migrated_adjustments_unclassified` and NEW `migrated_payment_codes_aliased`); Service vs Transaction date on charges: SCHEMA(13); insurance-plan grouping on today's coverage until SCHEMA(33) |
| Migrated history | user is a legacy login string (matches only `all`; `Username` groups by that string); charges skipped by the migration (DATA-57) are absent |

### Output

Report format: one (`standard`); the group-by value selects the group level. Block `transactions` (shape `table`,
`row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | band key `Office: {office_name}` |
| `office_name` | Office Name | text, `export {pdf: false}` | aggregate | none (Excel and CSV column) |
| `group_key`, `group_label` | Code / Username / Insurance Plan / Transaction Provider (label per `group_by`) | text; hidden in PDF (printed as group header), a column in XLSX / CSV | aggregate | group key; subtotal `Total for {group_label} :` |
| `row_id` | - | text, hidden | phi_identified | `entry_id` |
| `row_date` | Date | date | phi_identified | none |
| `patient_id` | Patient ID | id, entity patient | phi_identified | none; sort key `patient_id` |
| `patient_last_name` | - | text, hidden | phi_identified | sort key |
| `patient_name` | Patient Name | text | phi_identified | key column; `count` per group |
| `pat_type` | Pat Type | text | phi_identified | none |
| `code`, `code_description` | Code (Excel: `code - description`) | text | phi_identified | none (in PDF the group header carries it when grouped by code) |
| `tran_provider` | Tran Prdr (Excel: Transaction Provider) | text | aggregate | none |
| `user_label` | User | text, `default_visible false` | aggregate | none (rule 12) |
| `ucr` | UCR | money | financial_patient | sum per group, office, grand |
| `prim` | PRIM | money | financial_patient | sum |
| `sec` | SEC | money | financial_patient | sum |
| `amount` | AMOUNT | money | financial_patient | sum |
| `is_voided` | Voided | boolean, `visible_when ["truthy","include_voided"]` | user_activity | count |

`code_counts` (visible with `show_code_count_summary`, placement `report_end`): `code` (aggregate, key), `description`,
`line_count`, `patient_count` (`count_distinct`), `ucr`, `amount` (money `financial_practice`).

Grouping: `fixed_outer` office band (always printed, as in the sample) → level from `group_by` (`code`, `user`,
`insurance_plan`, `transaction_provider`); subtotal per group, office total, grand total when multi-office. Sort options
(`sort_by`): `patient_last_name` (last name, first name, `row_date`, `row_id`), `patient_id` (`patient_id`, `row_date`,
`row_id`), `date` (`row_date`, last name, `row_id`). Page break: none legacy (enhancement: `page_break_by = group`, shared
member, default `none`). Summary cards (block totals): lines, patients, AMOUNT, UCR. `reconciles_with`: none (a filtered
finder); test: with `code_scope_selection = all`, `payment_adjustment_codes = none` and default options, `SUM(amount)` equals
`SUM(charged_fee)` of `rpt_charges` for the same office, providers and transaction dates. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Chart: none by default (a finder); with `show_code_count_summary` a bar of `line_count` per code (`top_n` 15).

| Click | Target |
|---|---|
| Patient ID / name | `kind = record`, patient ledger at `row_date` (`phi_identified`, ledger feature right) |
| Row | `kind = record`, ledger entry (`entry_id`) |
| Code group subtotal (procedure code) | `daily.production_report`, `report_by = code`, same date range, office and providers (production context of the code) |
| `code_counts` row | `kind = rows`: same report filtered to the code |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row | `navigate` | |
| Patient payment receipt | bulk (payment rows of one patient) | `custom:payment_receipt` NEW | One PDF receipt listing the selected payments (HSA / FSA use case [P37]); handler owned by the ledger feature; P3 |
| Letter / postcard / SMS to listed patients | bulk | `letters`, `postcards`, `send_sms` | e.g. recall or follow-up of all patients with a code (sealant program); consent exclusions `no_correspondence`, `no_auto_sms`, `sms_opt_out_at`; distinct patients |
| Create task | bulk | `create_task` | Correct a posting found wrong (code, provider) |
| Export selection | bulk | `export_selection` | |

Not a standing worklist; a saved view becomes a recurring list (e.g. daily finance charges).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; `criteria_echo = header` (Patient Name Range, Date Range with basis, Providers, Users, Payment/Adjust, Procedure Codes or Categories, Excluded Pat Types, Insurance Plans/Sub Types, Age Range, Amount, Group By, Sort By); office band; group headers; `Printed :`, `Page : n of m` in the footer |
| XLSX | One flat sheet `transactions` in the legacy Excel column order (`Office Name`, group value column, `Date`, `Patient ID`, `Patient Name`, `Pat Type`, `Transaction Provider`, `UCR`, `PRIM`, `SEC`, `AMOUNT`), typed cells, no subtotal rows (totals are left to the user's formulas or the `code_counts` sheet), `criteria` sheet |
| CSV | `transactions`, same column order |
| Background | Year ranges with all codes over several offices exceed `max_rows_inline`; escalate to `background` (ENG-38, P2) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Values of the Amount dropdown and whether the comparison uses the signed or absolute amount | Expand the dropdown; run `> 100` with payments selected |
| 2 | EXCLUDE PATIENT TYPE: exclude (label, footer `Excluded Pat Types`) or include (vendor article) | Pick one type and compare row counts |
| 3 | Meaning of `PRIM` / `SEC` on procedure rows (estimate) and on payment rows | Compare a sample row with the ledger |
| 4 | Sign of payment and credit-adjustment rows in `AMOUNT` | Run with one payment code |
| 5 | Group totals and office totals: printed or not | One multi-page printout |
| 6 | Default of the Sort By row; whether Age From / To unlock with the checkbox | Open the criteria screen |
| 7 | Age reference date (run date, end date or line date) | Patient whose birthday falls inside the range |
| 8 | Is the Category list of CODE/CATEGORY the 14 SEARCH CODE categories | Open the picker in Category mode |
| 9 | INSURANCE PLANS/SUB TYPES dialog: list source, tiers considered, inactive plans | Open the dialog |

<!-- WORK-ITEMS -->
| RPT-DAILY-70 | Production Analysis Report definition: formats `category` / `carrier`, blocks `category_mix`, `office_category_totals`, `carrier_mix`, `carrier_patients`; denominators office-wide; enabled rules of CATEGORY / CARRIER; drills to Special Transaction Report | P1 | M | DATA-04, DATA-06, DATA-18, DATA-21, ENG-11, ENG-30, RPT-DAILY-01, RPT-DAILY-02 | On the fixture month the `office_amount` total of the category format equals `charged_production` (service basis) for the office; each provider's first % sums to 100.00 %; a provider filter leaves `Practice Group $` unchanged; clicking a category cell opens Special Transaction rows whose AMOUNT sum equals the cell |
| RPT-DAILY-71 | Carrier attribution of the Production Analysis carrier format: carrier of a charge (DATA-33 stamp, else today's primary dental slot), claims-created date with submitted-date proxy, `Carrier not recorded` row, availability codes `carrier_from_current_coverage`, `claim_created_date_proxy` | P1 | S | DATA-21, DATA-33, RPT-DAILY-04 | Fixture: a patient seen twice with one carrier counts once; the carrier block's collections total equals `insurance_collections`; a migrated claim is counted by its sent date and the run prints the proxy warning |
| RPT-DAILY-72 | Daily Audit definition on `rpt_visit_audit()`: population, OR-of-ticked exception predicate, provider arrays for filter and GROUP BY, auto page break, ✓ / X columns, all-clear state, availability codes `signature_test_app_only`, `visit_code_flags_unreviewed` | P1 | M | DATA-04, DATA-16, DATA-18, ENG-11, RPT-DAILY-08 | Every PATIENT HAS x BUT MISSING combination of the DATA-18 fixture returns the expected rows; a day worked by a hygienist and a dentist appears under both providers with all four flags whole-day; a posted non-visit code leaves `Ledger Transaction` = X; an empty run renders all clear and counts as empty for `skip_if_empty` |
| RPT-DAILY-73 | Appointment status rule of the audit (cancelled and no-show excluded unless `include_resolved_appointments`) agreed with 03 and implemented as a `rpt_visit_audit()` argument | P1 | S | DATA-18 | A cancelled appointment without posting produces no row by default and one row with the option on |
| RPT-DAILY-74 | Daily Audit worklist actions: open patient / ledger / appointment / notes drills, bulk `create_task` and NEW `custom:internal_message` to the row providers | P3 | M | ENG-49, SEC-36, RPT-DAILY-72 | Selecting 5 rows of two providers sends two messages that list exactly those patients; a caller without `phi_identified` receives no patient drill |
| RPT-DAILY-75 | Claims Printed definition: formats `detail` / `summary`, carrier band and `Total for <carrier> [ n ] :`, `only_not_marked_sent`, `show_each_print`, availability code `claim_prints_not_recorded_before` | P1 | S | DATA-21, ENG-11, RPT-DAILY-01 | After printing three claims of two carriers on the fixture, Detail lists three rows under two carrier bands with correct counts; Summary shows the same totals; a range before the capture start prints the warning; `Sub ID` is dropped for a caller without `phi_sensitive` |
| RPT-DAILY-76 | Server-side claim print capture from the frontend: ADA direct print (`AdaClaimPrintModal.tsx`) and batch paper print post a print event to the DATA-21 endpoint through the generated client; the `localStorage` print log (`dentc:claim_print_log:v1:*`) becomes a read-once fallback and is retired | P1 | S | DATA-21 | Printing a claim from the modal creates one `claim_print_events` row with user, office and channel; a preview creates none; the claim's `print_count` and `last_printed_at` update; no new `localStorage` print-log key is written |
| RPT-DAILY-77 | Bulk action `custom:claims_mark_sent` from Claims Printed, delegating to the claims feature's send-status update | P2 | S | ENG-49, SEC-36, RPT-DAILY-75 | Marking two unsent printed claims sets them `sent` once (idempotent on re-click) and an `only_not_marked_sent` re-run no longer lists them |
| RPT-DAILY-78 | Freeze the Claims Printed and Production Analysis layouts against live legacy printouts (Claims Printed INFERRED; Production Analysis section layout and titles) | P1 | S | FLT-23, RPT-DAILY-09 | A printout of each format is recorded with a screenshot reference; column lists, titles and totals updated or a written waiver per difference |
| RPT-DAILY-79 | Special Transaction Report definition: procedure and payment / adjustment row sets with None / ALL semantics, all OTHER OPTIONS filters, four group-by levels with subtotals, vendor-doc Sort By, header criteria echo, flat legacy Excel order, availability codes for migrated codes and current coverage | P1 | L | DATA-03, DATA-06, DATA-12, DATA-13, DATA-21, FLT-07, ENG-11, ENG-23, ENG-27, RPT-DAILY-02 | Default run on the fixture day equals all charges of the day (`SUM(amount)` = `SUM(charged_fee)`) and no payments; adding one payment code adds exactly those payment legs; same name twice returns one patient; age gate 0-3 drops patients without DOB only when narrowed; each group-by value yields the documented header and subtotals |
| RPT-DAILY-80 | Option sources and unknown controls of the Special Transaction Report: `insurance_plans_and_subtypes` (typed `plan:<id>` / `subtype:<value>`), `payment_adjustment_codes` (`kind:code`, system aliases included), Amount operator list confirmed on the live tool | P1 | S | FLT-06, FLT-07, FLT-23 | The pickers list plans with carrier and group number, the two subtypes, and every payment / adjustment code including `CASH`, `CHECK`, `CARD`, `ACH`, `unclassified`; `build_parity.py` shows no `unknown_legacy` left for r12 or a written waiver |
| RPT-DAILY-81 | Special Transaction enhancements: `code_counts` block, `age_basis`, `include_voided`, saved-view seeds (finance charges yesterday, sealants by age, one patient's payments) | P1 | S | RPT-DAILY-79, ENG-28 | `code_counts` totals equal the detail totals; `age_basis = row_date` changes membership of a patient whose birthday is inside the range; voided rows appear only with the option and the `user_activity` class |
| RPT-DAILY-82 | Bulk action `custom:payment_receipt` (per-patient payment receipt PDF from selected Special Transaction payment rows) | P3 | M | ENG-49, ENG-25, SEC-36, RPT-DAILY-79 | Selecting three payments of one patient produces one receipt PDF with those payments and their total; a selection spanning two patients is refused with a message |
<!-- /WORK-ITEMS -->
