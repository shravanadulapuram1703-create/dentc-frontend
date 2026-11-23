## Referral Summary Report - `referral.referral_summary_report`

Referral Reports, screenshot `5.PNG` - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class interactive (escalates to background, see Data) - legacy output confidence DOCUMENTED (sample 2023; `#Ref` and `Referral #` meaning INFERRED)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Owner, office manager, marketing lead | Month end, quarter end, before a marketing budget review | Which referral types and sources bring patients and how much those patients produce and pay; where to thank, invest or stop spending |
| Office manager of a multi-office organisation | On demand, per office | Compare sources between offices (one `Office :` band per office) |
| Front desk lead | Monthly | Size of the `No Referral` bucket: patients registered with a type but without a source (data-entry quality) |

Vendor positioning: a marketing view, not an accounting report (research section 6, [P52]); figures are current-state
(shared rule "History limit").

### Legacy output

Printed title `Referral Summary` (internal report name `ReferralRefSumm`, positional arguments PGID; OID; `false`; start
date; end date; `ALL`). DOCUMENTED from the 2023 sample [P52·img].

| Element | Legacy content | Confidence |
|---|---|---|
| Header | Organisation name, `Referral Summary`, `Office : <office name>` (underlined) | DOCUMENTED |
| Group levels | `Office : <office>` -> `Referral Type : <type>` | DOCUMENTED |
| Columns, in order | `Referral` · `#Ref` · `Production` · `Collection` · `Avg Production` · `Referral #` (two-row header over `MTD` · `YTD` · `Last Year`) | DOCUMENTED |
| Rows | One per referral source inside its type; `No Referral` collects patients that have the type but no `Referred By` source | DOCUMENTED |
| Subtotals | `Total :` per referral type for `#Ref`, `Production`, `Collection`, `Avg Production`; nothing under the three `Referral #` columns | DOCUMENTED |
| Grand total | None printed | DOCUMENTED |
| Footer | Criteria echo (`From` / `Thru`, `Referral Types`), title, `Printed : <date time>`, copyright, `Page : n of m` | DOCUMENTED (family pattern) |
| Meaning of `#Ref` | Patients of the source referred in the period (a source with `#Ref` 0 still shows production: patients referred earlier) | INFERRED from the arithmetic |
| Meaning of `MTD` / `YTD` / `Last Year` | Referral counts of the source for the month and year to date and the previous calendar year | INFERRED (anchor date not documented) |
| Meaning of the third positional argument `false` | Unknown | not documented |

Arithmetic and quirks:

| Legacy behaviour | Our behaviour |
|---|---|
| `Avg Production` = `Production` / `#Ref`; equals `Production` when `#Ref` = 0 | Kept for `#Ref` > 0; empty cell when `#Ref` = 0 (shared sign rules; quirk not copied) |
| Type average = type production / type `#Ref` | Kept (`ratio` total, computed from unrounded sums) |
| One `Collection` total equals the signed net of rows printed unsigned [conflict] | Fixed: collection positive on rows and totals, total = sum of rows |
| Sources with `#Ref` 0 but production in the range are listed | Kept |
| No grand total | Kept on the legacy group levels; a `Grand Total :` row is added after the last type (family enhancement, shared rules) |
| No totals under `Referral #` | Kept (`total: none`); the XLSX sheet carries the row values only |
| With only the mandatory patient `Referral Type` filled, the report shows types only | Kept: such patients print under the source row `No Referral` |

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r05 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Run, preview on screen, PDF rendered from the snapshot (`output_format = pdf`, `role: output`); rows unchanged |
| PRINT FORMAT `Excel` | Same snapshot rendered as a flat typed XLSX sheet (`xlsx`); `csv` added. Rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` (working office) | `office_ids = [working office]`: patients whose current `rpt_patient_dim.home_office_id` is in the set; production limited to charges with `rpt_charges.office_id` in the set; collection limited to allocations whose `credit_office_id` is in the set; `#Ref` and `Referral #` count only those patients. One office: the page header prints `Office : <office name>` |
| OFFICE/GROUP `Office` with several offices / `all` | Union of the offices (`all` = every office the caller may read); one `Office :` band per home office with its own type subtotals (`fixed_outer` office, `["ctx", "multi_office"]`); money of a patient in office A served in office B is counted in neither band unless B is also selected (legacy "no cross-office data") |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office as above |
| PROCEDURE DATE RANGE Start Date / End Date (default `today` / `today`) | `date_from` / `date_to`, inclusive, office-local. Bounds (a) production: `rpt_charges.service_date`; (b) collection: allocations to those charges; (c) `#Ref`: `rpt_referral_facts.referral_date` of the patient. Does not bound `MTD` / `YTD` / `Last Year`, which are anchored on `date_to` (Data) |
| REFERRAL TYPE `ALL` (default) | No predicate: every type with at least one row prints, ordered by type label |
| REFERRAL TYPE one type | `referral_type_codes = [code]`: only patients whose own referral type (`source_type_label` of the `inbound_source` row) is that type; one `Referral Type :` group. A list of types is an enhancement (family) |

Dependency rules: `refferal_reports.r01.d01` (Office / Office Group mode decides the value key; switching resets the
selection to `working_office` / `all`) and `refferal_reports.r01.d02` (ADD TO MY FAVORITES / UPDATE MY FAVORITES). No
control is greyed, none shows or hides another. Footer actions: CLEAR CRITERIA -> defaults (frontend), PRINT / PREVIEW ->
`print`, ADD TO MY FAVORITES -> `saved_view`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `referred_from_ids` | `entity_multi` (`lookup:referral_sources`, direction referred-by, `max_items` 500) | `all` | Restrict to chosen sources (for example the ten doctors on a thank-you list). `all` keeps `No Referral` |
| `source_categories` | `enum_multi` NEW (owner 04): `doctor`, `patient`, `other`, `none`; `accepts_all` | `all` | Filter on `rpt_referral_facts.source_category` (`none` = `No Referral` bucket). Inferred until DATA-40 stores `referrals.source_category` (run warning) |
| `first_visit_date_from` / `first_visit_date_to` | `date_range` (key of r01) | empty | New-patient cohort: only patients whose `first_visit_date` falls in the range (Open Dental "new patients only" equivalent). Needs DATA-19 |
| `report_format` | `enum`: `summary` (default, legacy), `patient_detail` (NEW) | `summary` | `patient_detail` lists the patients behind each source row with the same figures; it is the `rows` drill target, so every source number reconciles to a list |
| `compare_to` | FLT-26 (`none`, `previous_period`, `previous_year`, `custom`) | `none` | Adds `ref_count_compare`, `production_compare`, `production_change_pct` per source and type (P4) |
| `sort_by` | `enum`: `referral_name` (default), `production_desc`, `ref_count_desc`, `avg_production_desc` | `referral_name` | Row order inside the type group |
| Saved view "Last month by source - my offices" | saved view | - | `date_preset = last_month`, `office_ids = @my_offices` |
| Saved view "Doctor referrals, year to date" | saved view | - | `date_preset = year_to_date`, `source_categories = [doctor]`, `sort_by = production_desc` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`referral_kind = 'inbound_source'`: `patient_id`, `office_id` = home office, `referral_source_id`, `source_name`, `source_type_label`, `source_category`, `referral_date`); `rpt_patient_dim` (`home_office_id`, `referral_type_raw`, `referred_by_raw`, `first_visit_date`); `rpt_charges` (`patient_id`, `office_id`, `service_date`, `charged_fee`, `is_production`, live rows); `rpt_payment_allocations` (`debit_entry_id`, `debit_patient_id`, `credit_ledger_bucket`, `credit_office_id`, `allocation_target`, `amount`); `rpt_office_dim` (`office_name`, `local_today`) |
| Grain | Office (home) x referral type x referral source. Source key = `referral_source_id`, else `name:<lower(btrim(source_name))>` for free text, else `none` (`No Referral`) |
| `#Ref` (`ref_count`) | Distinct patients of the source with `referral_date` between `date_from` and `date_to` [I]. `referral_date` = NEW `patients.referral_date` (DATA-40), else `first_visit_date` (DATA-19) |
| Production | `Σ rpt_charges.charged_fee` (posted fee, PD-1; `is_production`) of the source's patients, `service_date` in range, `office_id` in the office set |
| Collection | `Σ rpt_payment_allocations.amount` where `credit_ledger_bucket = 'collection'`, `allocation_target = 'production'`, `debit_entry_id` is one of the charges above, `credit_office_id` in the office set; refunds reverse their allocations inside the function, so the figure is net of refunds (PD-3). Positive. Derived allocations print "allocation derived (oldest first)" |
| `Avg Production` | `ratio(production, ref_count)`, zero-denominator guard |
| `MTD` / `YTD` / `Last Year` | Distinct patients of the source with `referral_date` in: first of the month of `date_to` .. `date_to`; 1 January of the year of `date_to` .. `date_to`; the whole previous calendar year of `date_to` [I, anchor to confirm] |
| Row presence | A source row prints when any of `ref_count`, production, collection, `MTD`, `YTD`, `Last Year` is non-zero [I] |
| Office attribution | `home_office` (patient's current home office) for the patient set and the band; money legs additionally restricted to the office set (shared rules) |
| Provider attribution | None |
| Parameter -> query | `office_scope` -> `rpt_referral_facts.office_id IN :offices` plus the two money-leg office predicates; `date_range` -> the three predicates of the PROCEDURE DATE RANGE row; `referral_type_codes` -> type code `IN`; `referred_from_ids` -> `referral_source_id IN`; `source_categories` -> `source_category IN`; `first_visit_date_*` -> `first_visit_date BETWEEN` |
| Availability | Coverage matrix row 60: **READY** as Referral Production List - migrated patients link to their source by legacy id; app patients hold free-text `referred_by` and match a source only by name until SCHEMA(40) (`patients.referral_source_id`); `MTD` / `YTD` / `Last Year` and `#Ref` need a referral date: NEW `patients.referral_date` (DATA-40), else the first visit date, REPAIR(19); first-visit enhancement REPAIR(19) |
| Migrated history | Current state only: a patient whose home office, type or source changed counts under the current values (warning `referral_current_state`). Migrated patients have no stored referral date: `#Ref` and the `Referral #` columns use their first visit date, so a patient referred long before the first visit is counted at the visit (warning `referral_date_from_first_visit`). Migrated charges are incomplete (DATA-57 caveat, printed on every financial run touching migrated periods) |
| Cost | `interactive`; `escalate_when` (server only): range over 366 days or more than 10 offices in the resolved set -> `background` (allocation join over many accounts) |
| Reconciliation | `reconciles_with`: block `main`, column `production` -> `referral_source_production` per source. Collection reconciles only if 05 defines the metric's collection leg on the same allocation join (open question 5) |

### Output

Format `summary` (legacy), block `main`, shape `table`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | `text` | `aggregate` | band label `Office : {office_name}` (fixed outer level, multi-office only) |
| `source_type_label` | Referral Type | `text` | `aggregate` | group header `Referral Type : {source_type_label}`, subtotal label `Total :` |
| `referral_source_label` | Referral | `text` | `phi_identified` (dimension label, rule 13 `deny` for patient / free-text sources; a caller without the class receives `source_type_label`) | `label` |
| `ref_count` | #Ref | `integer` | `aggregate` | `sum` per type, office, grand total |
| `production` | Production | `money` | `financial_practice` | `sum` |
| `collection` | Collection | `money` | `financial_practice` | `sum` |
| `avg_production` | Avg Production | `money` | `financial_practice` | `ratio(production, ref_count)` at every level; `null_display` empty |
| `ref_count_mtd` | MTD (header group `Referral #`) | `integer` | `aggregate` | `none` (legacy) |
| `ref_count_ytd` | YTD | `integer` | `aggregate` | `none` |
| `ref_count_last_year` | Last Year | `integer` | `aggregate` | `none` |
| `patient_share_pct` | % Patients | `percent` | `aggregate` | `share_of_parent(ref_count)`; default hidden (family enhancement) |
| `production_share_pct` | % Production | `percent` | `financial_practice` | `share_of_parent(production)`; default hidden |
| `ref_count_compare`, `production_compare`, `production_change_pct` | #Ref (compare), Production (compare), Change % | `integer`, `money`, `percent` | `aggregate`, `financial_practice`, `financial_practice` | `sum`, `sum`, `ratio`; `visible_when ["ne", "compare_to", "none"]` (P4) |
| hidden: `office_id`, `referral_type_code`, `referral_source_key`, `referral_source_id`, `source_category`, `row_id` | | `id` / `text` | `aggregate` (`referral_source_key` `phi_identified`) | - |

Format `patient_detail` (NEW), block `patients`: `office_name`, `source_type_label`, `referral_source_label`, `chart_no`
(Chart #), `patient_id` (Pat ID), `patient_name` (Patient Name), `referral_date` (Referral Date), `is_ref_in_range`
(Counted in #Ref, boolean), `production`, `collection`; patient columns `phi_identified`, money `financial_patient`;
subtotals per source and type equal the summary row (`sum`; `count` of `is_ref_in_range` true = `#Ref`).

| Topic | Rule |
|---|---|
| Group levels | Office (fixed outer, multi-office) -> Referral Type; `grand_total {enabled: true, label: "Grand Total :"}` |
| Sort | Types by `source_type_label`; sources by `sort_by` (default `referral_source_label` asc, `No Referral` last), tie-breaker `row_id` |
| Page break | `page_break_by` (layout, enhancement): `none` (default), `office`, `group` (new page per referral type) |
| Summary cards | `Referred patients` (`ref_count` grand total), `Production`, `Collection`, `Avg production per referral` (grand-total `avg_production`) |
| Empty run | `empty_when {block: main, test: no_detail_rows}` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Horizontal bars, top 15 sources by `production` with `ref_count` as a second series (`charts[]` hint, `top_n` 15); screen only |
| `#Ref`, `Production`, `Collection` cell of a source row or a type subtotal | `rows`: this report, `report_format = patient_detail`, filtered to the group (`referral_source_key`, `referral_type_code`, office); the list total equals the clicked number |
| `Referral` label of a source row | `report` `referral.referral_production_list` with `office_scope`, `date_from`, `date_to` copied, `referral_type_codes = [group type]` and the source passed as `referred_from_ids` (hidden drill parameter requested from the r01 author) |
| `MTD` / `YTD` / `Last Year` cell | `rows` (`patient_detail`) with the anchored range of that column |
| Patient name (detail block) | `record` patient -> `/patient/:id/overview` (needs `phi_identified` and the chart right; `assert_patient_visible`) |

### Actions

| Action | Scope / kind | Notes |
|---|---|---|
| Thank-you letter / labels to the listed sources | bulk `letters`, `labels` | Hand-off to Letters with the source ids (PD-15, family enhancement P3); `No Referral` and free-text rows are excluded and counted |
| Open referral source | row `navigate` | Setup › Referrals edit screen of `referral_source_id` |
| Export selection | bulk `export_selection` | Full Control + `reports_export_data_files` |
| Worklist | no | A periodic summary |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait, letter; header: organisation name, `Referral Summary`, `Office : <office name>` (single office) or office bands; two-row column header with `Referral #` spanning `MTD` / `YTD` / `Last Year`; `criteria_echo = footer` with `From` / `Thru`, `Referral Types`, then `Printed : <date time>`, `By : <user>`, `Page : n of m`; run warnings in the criteria block |
| XLSX | Sheet `Referral Summary`: one row per source with `office_name` and `source_type_label` repeated on every row, a `row_type` column (`detail`, `subtotal`, `grand_total`), flat labels `Referral # MTD`, `Referral # YTD`, `Referral # Last Year`; frozen header, autofilter, outline per type; no merged cells; criteria sheet. `patient_detail` = its own sheet |
| CSV | Main block of the chosen format, UTF-8 BOM, injection guard |
| Background | Escalated runs (Data) deliver the same snapshot to screen, PDF and XLSX |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Is `#Ref` the count of patients whose referral (or first visit) date falls in the range? Which date does the legacy use for patients without a referral date? | live legacy run against known patients |
| 2 | Anchor of `MTD` / `YTD` / `Last Year`: End Date of the range or the run date? Is `Last Year` the previous calendar year or the 12 months before? | live run with an End Date in an earlier month |
| 3 | Meaning of the positional argument `false` in `ReferralRefSumm` (a hidden option such as "include inactive patients"?) | live tool, report viewer URL with other criteria |
| 4 | Do sources whose every figure is zero print? Order of sources (alphabetical, `No Referral` last)? | live run |
| 5 | Product: 05 must define the collection leg of `referral_source_production` on the allocation join (service basis); otherwise only production is reconciled | 05_metric_catalog.md |
| 6 | Does the legacy run accept several offices or an office group (family open question 1)? | live tool |

## Referral Count Summary - `referral.referral_count_summary`

Referral Reports, screenshot `6.PNG` - P3 - S - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`) - cost_class interactive - legacy output confidence DOCUMENTED (sample 2016; definition of "seen" INFERRED)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Owner, marketing lead | Monthly, quarterly | How many referred patients each source keeps feeding into the chairs (volume, not money) |
| Office manager | Monthly | Share of seen patients without a recorded source (`No Referred By`): front-desk data-entry quality |
| Specialist office | On demand | Which referring doctors send patients who actually arrive |

### Legacy output

Printed title `Referral Count Summary` [P53·img], DOCUMENTED from the 2016 sample.

| Element | Legacy content | Confidence |
|---|---|---|
| Header | Organisation name, `Referral Count Summary`; no `Office :` line in the 2016 sample | DOCUMENTED |
| Group level | `Referral Type : <type>` | DOCUMENTED |
| Columns | `Referral` · `# Referred Pats Seen` | DOCUMENTED |
| Rows | One per referral source; `No Referred By` for patients of the type without a source (the same bucket is called `No Referral` on Referral Summary; both labels kept per report) | DOCUMENTED |
| Subtotal | `Total :` per referral type | DOCUMENTED |
| Grand total | None visible | DOCUMENTED |
| Footer | `From` / `Thru`, `Referral Types`, printed date, page | DOCUMENTED |
| "Seen" | A referred patient with at least one posted procedure in the range (presumed) | INFERRED |

Quirks: none known beyond the label difference. Deliberate additions: a `Grand Total :` row (family rule) and, for
several offices, the `Office :` band of the family rule (the 2016 sample predates the office line).

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r06 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | PDF from the snapshot (`output_format = pdf`); rows unchanged |
| PRINT FORMAT `Excel` | Flat XLSX (`xlsx`); `csv` added; rows unchanged |
| OFFICE/GROUP `Office` (default) with picker `108` (working office) | Patients whose current `home_office_id` is in the set and whose qualifying procedure was served in an office of the set (`rpt_charges.office_id`) |
| OFFICE/GROUP `Office` several offices / `all` | Union; one `Office :` band per home office with its own type subtotals |
| OFFICE/GROUP `Office Group` | `office_group_id`: offices of the group, banded per office |
| PROCEDURE DATE RANGE Start Date / End Date (default `today` / `today`) | `date_from` / `date_to`, inclusive, office-local: a patient counts when at least one live `rpt_charges` row has `service_date` in the range (the "seen" rule, presumed). Each patient counts once per source in the range, however many days they came |
| REFERRAL TYPE `ALL` (default) | No predicate; every type with a non-zero count prints |
| REFERRAL TYPE one type | `referral_type_codes = [code]`: patients of that type only; one group |

Dependency rules: `refferal_reports.r01.d01`, `refferal_reports.r01.d02`; nothing greyed; no show / hide rule. Footer
actions as on every report of the family.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `count_basis` | `enum` NEW (owner 04): `posted_procedure` (default, parity rule), `visit` (a `rpt_visits` day with a visit code), `kept_appointment` (`rpt_appointment_facts.is_kept`) | `posted_procedure` | Lets the office match the legacy reading once the live tool confirms what "seen" is, and count hygiene-only arrivals or kept appointments without a posted code |
| `first_visit_date_from` / `first_visit_date_to` | `date_range` (key of r01) | empty | Count only new patients (first visit in the range); with the default range this answers "new referred patients this month". Needs DATA-19 |
| `referred_from_ids` | `entity_multi` (`lookup:referral_sources`, referred-by) | `all` | Restrict to sources |
| `source_categories` | `enum_multi` NEW: `doctor`, `patient`, `other`, `none`; `accepts_all` | `all` | As on Referral Summary |
| `report_format` | `enum`: `summary` (default, legacy), `patient_detail` (NEW) | `summary` | Lists the counted patients; `rows` drill target |
| `compare_to` | FLT-26 | `none` | Adds `seen_count_compare` and `seen_change_pct` (P4) |
| Saved view "Referred patients seen this month - my offices" | saved view | - | `date_preset = month_to_date`, `office_ids = @my_offices` |
| Saved view "New referred patients, last quarter" | saved view | - | `date_preset = last_quarter`, `first_visit_date_*` = same range |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`inbound_source`: `patient_id`, `office_id`, `referral_source_id`, `source_name`, `source_type_label`, `source_category`); `rpt_charges` (`patient_id`, `office_id`, `service_date`, live rows); with `count_basis = visit` `rpt_visits` (`patient_id`, `office_id`, `visit_date`); with `kept_appointment` `rpt_appointment_facts` (`patient_id`, `office_id`, `appointment_date`, `is_kept`, `is_block`, `is_deleted`); `rpt_patient_dim` (`first_visit_date`); `rpt_office_dim` |
| Grain | Office (home) x referral type x source key (as Referral Summary) |
| `seen_count` | `count(DISTINCT patient_id)` of the source's patients with `EXISTS` a qualifying row (per `count_basis`) in the range and in an office of the set. `EXISTS`, never a join inside the aggregate |
| Date basis | `service_date` (fixed); `visit_date` / `appointment_date` under the enhancement bases |
| Office attribution | `home_office` for the patient and the band; the qualifying event must be in the office set |
| Provider attribution | None |
| Parameter -> query | `office_scope` -> `rpt_referral_facts.office_id IN` and event `office_id IN`; `date_range` -> event date `BETWEEN`; `referral_type_codes`, `referred_from_ids`, `source_categories`, `first_visit_date_*` as on Referral Summary |
| Availability | Coverage matrix row 61: **READY** as Referral Production List; app patients match a source by name only until SCHEMA(40); first-visit enhancement REPAIR(19); `count_basis = kept_appointment` uses `is_kept`, which on migrated rows exists only through the same-day charge (03 section 2.15) |
| Migrated history | Current state only (warning `referral_current_state`); the archive policy (`Ledger_archive.txt` rows excluded by default) can drop old visits |
| Cost | `interactive` (count only, no money legs) |
| Related metric | `new_patients_missing_source_pct` measures new patients, this report counts seen patients: a reconciliation test holds only for the `No Referred By` share with `first_visit_date_*` equal to the range (`reconciles_with` declared under that condition only; open question 3) |

### Output

Format `summary` (legacy), block `main`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | `text` | `aggregate` | band label `Office : {office_name}` (multi-office only) |
| `source_type_label` | Referral Type | `text` | `aggregate` | group header `Referral Type : {source_type_label}`, subtotal label `Total :` |
| `referral_source_label` | Referral | `text` | `phi_identified` (rule 13 label, degrades to `source_type_label`) | `label`; no-source row label `No Referred By` |
| `seen_count` | # Referred Pats Seen | `integer` | `aggregate` | `sum` per type, office, grand total (`Grand Total :`) |
| `seen_share_pct` | % of Seen | `percent` | `aggregate` | `share_of_parent(seen_count)`; default hidden |
| `new_patient_count` | New Patients | `integer` | `aggregate` | `sum`; patients of the row whose `first_visit_date` is in the range; default hidden (REPAIR(19)) |
| `seen_count_compare`, `seen_change_pct` | Seen (compare), Change % | `integer`, `percent` | `aggregate` | `sum`, `ratio`; `visible_when ["ne", "compare_to", "none"]` |
| hidden: `office_id`, `referral_type_code`, `referral_source_key`, `referral_source_id`, `source_category`, `row_id` | | | `aggregate` (`referral_source_key` `phi_identified`) | - |

Format `patient_detail` (NEW), block `patients`: `office_name`, `source_type_label`, `referral_source_label`, `chart_no`,
`patient_id`, `patient_name`, `first_seen_in_range` (date), `last_seen_in_range` (date), `days_seen` (integer),
`first_visit_date`; all `phi_identified`; count per source equals `seen_count`.

| Topic | Rule |
|---|---|
| Group levels | Office (fixed outer, multi-office) -> Referral Type; grand total enabled |
| Sort | Types by label; sources by label with `No Referred By` last; enhancement `sort_by`: `referral_name` (default), `seen_count_desc` |
| Page break | `page_break_by` `none` (default), `office`, `group` (layout, enhancement) |
| Summary cards | `Referred patients seen` (grand total), `Without a source` (`seen_count` of the `none` rows, from the subtotal of hidden `source_category = none`; computed as a block total) |
| Empty run | `no_detail_rows` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `seen_count` by source within type, top 15 plus `other` |
| `# Referred Pats Seen` cell or subtotal | `rows`: `report_format = patient_detail` filtered to the group |
| `Referral` label | `report` `referral.referral_summary_report` with the same `office_scope`, range and `referral_type_codes = [group type]` (money of the same sources) |
| Patient name (detail) | `record` patient -> `/patient/:id/overview` (`phi_identified`, chart right) |

### Actions

| Action | Scope / kind | Notes |
|---|---|---|
| Thank-you letter / labels to sources | bulk `letters`, `labels` | As on Referral Summary (PD-15) |
| Fix missing source | row `navigate` on a detail row of `No Referred By` | Opens the patient's edit wizard on the referral step (patient right) |
| Export selection | bulk `export_selection` | Full Control + export right |
| Worklist | no | The `No Referred By` detail list can be saved as a view for data clean-up |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait; header organisation name and `Referral Count Summary` (office line only for one office when the office band rule applies); footer echo `From` / `Thru`, `Referral Types`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | Sheet `Referral Count Summary`, one row per source, office and type repeated, `row_type` column, no merged cells; `patient_detail` on its own sheet |
| CSV | Main block |
| Background | Not needed (count query) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | What counts as "seen": a posted procedure, a visit-code procedure or a kept appointment in the range? | live run on a patient with only a kept appointment |
| 2 | Does a patient who moved home office after the visit count in the old or the new office (current state presumed)? | live tool |
| 3 | Header lists `new_patients_missing_source_pct` as the reconciling metric; it measures new patients, so the test is declared only under the cohort condition - confirm with 05 | 05_metric_catalog.md |
| 4 | Does the current build print an `Office :` line and a grand total (2016 sample only)? | live run |

## Internal Referral Management - `referral.internal_referral_management`

Referral Reports, screenshot `7.PNG` (criteria cut off at the `GROUP BY` header) - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`; whether `Utilities - Referral Management Full Control` is also needed: family open question 6) - cost_class interactive - legacy output confidence INFERRED (utility grid only; GROUP BY options hidden)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Treatment coordinator of the referring office | Weekly | Patients our dentists referred to an in-house specialist or another office of the organisation that are still `Incomplete` or not booked; call and book |
| Receiving specialist office | Daily, weekly | Internal referrals addressed to our providers: who must be scheduled (Appt columns) |
| Regional / office manager | Month end | Volume of internal referrals per referring and receiving provider and office: how much specialty work stays inside the organisation |

Feature context: cases are created from Treatment Plan `Refer To` > Internal tab and shown in Utilities › Referral
Management, tabs `INTERNAL - INCOMING` / `INTERNAL - OUTGOING` [P60].

### Legacy output

No vendor description or sample. The columns below are the grid of the utility [P60·img] and are the proposed print
layout (INFERRED).

| # | Header (grid, verbatim) | Content |
|---|---|---|
| 1 | `Referral Date` | date of the case |
| 2 | `Patient ID` | patient id |
| 3 | `Patient Name` | last, first |
| 4 | `Referred To Provider` | receiving provider |
| 5 | `Referred Out Procedure Codes` | codes of the referred plan items, comma-separated |
| 6 | `Tx Status` | `Incomplete` / `Completed` |
| 7 | `Appt Date` | booked appointment date |
| 8 | `Appt Time` | booked start time |
| 9 | `Appt Op` | operatory of that appointment |
| 10 | `Referring Office` | office that created the case |
| 11 | `Referring Provider` | provider who referred |

Proposed (INFERRED): title `Internal Referral Management`; one row per case; grouping per the hidden GROUP BY (unknown;
default none); count line `Total Referrals : n` following the family count-line pattern; footer echo of every
non-default criterion. Grid icons (attachments, calendar booking) have no print equivalent.

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r07 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); rows unchanged |
| Readability (no control) | A case is readable when its referring office OR its receiving office is in the caller's allowed offices (08 S-13); both office scopes below filter inside that readable set |
| REFERRED FROM OFFICE/GROUP `Office` (default) with picker `108` (working office) | `referred_from_office_ids = [working office]`: `referral_cases.from_office_id IN` the set; this office also supplies "today" |
| REFERRED FROM OFFICE/GROUP `Office` other offices / `all` | List: `IN` the list; `all`: no from-office predicate inside the readable set |
| REFERRED FROM OFFICE/GROUP `Office Group` | `referred_from_office_group_id`: offices of the group |
| REFERRED TO OFFICE/GROUP `Office` with picker `ALL` (default) | No predicate on the receiving office (`all` must not narrow the readable set to the caller's own offices: parity concern 2) |
| REFERRED TO OFFICE/GROUP `Office` one or more offices | `to_office_id IN` the list (office of the referred-to provider on the case) |
| REFERRED TO OFFICE/GROUP `Office Group` | `referred_to_office_group_id`: offices of the group |
| REFERRAL DATE RANGE Start Date / End Date (default `today` / `today`) | `referral_cases.referral_date BETWEEN` (inclusive, office-local date as entered) |
| REFERRED FROM PROVIDER `ALL` (default) / list | No predicate / `from_provider_id IN` (role `referring`); never scoped by `providers.office_id` |
| REFFERED TO PROVIDER `ALL` (default) / list | No predicate / `to_provider_id IN` (role `referred_to`) |
| PROCEDURE CODES `ALL` (default) / list | No predicate / `procedure_codes && :codes` (any-match on the referred codes of the case) [I] |
| USERS `ALL` (default) / list | No predicate / `created_by IN` (creating user) [I]; cases without a creator match only under `ALL` |
| SPECIALTY `ALL` (default) / one value | No predicate / specialty of the referred-to provider `IN` (legacy single-select, list accepted) [I]; see parity concern 3 |
| STATUSES `All` (default) | `referral_completion = all`: no Tx Status predicate |
| STATUSES `Completed` | `tx_status = 'completed'` |
| STATUSES `Incomplete` | `tx_status = 'incomplete'` (cases with NULL `tx_status` are treated as incomplete [I]) |
| STATUSES `Exclude Deleted Referrals` checked (default) | `exclude_deleted_referrals = true`: `deleted_at IS NULL` |
| STATUSES `Exclude Deleted Referrals` unchecked | Deleted cases are read from `referral_cases` too and print with the `Deleted` column visible |
| GROUP BY (header visible, options not captured) | No parameter in the parity file; the enhancement `group_by` below stands in until the live tool shows the options (open question 1) |

Dependency rules: `refferal_reports.r01.d01` (mode radio of both office scopes), `refferal_reports.r01.d02` (favorites). No
greyed control captured; the GROUP BY controls and anything below them are unknown.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `group_by` | `enum` (shared key; values NEW for this report): `none`, `referring_office`, `referred_to_office`, `referring_provider`, `referred_to_provider`, `specialty` | `none` | One group level with header and `Total Referrals for, <value> : n`; replaced by the legacy options once captured |
| `appointment_states` | `enum_multi` NEW (owner 04): `not_booked`, `booked_future`, `booked_kept`, `booked_broken`; `accepts_all` | `all` | From `appointment_id` and `rpt_appointment_facts.status_class`; `not_booked` is the follow-up list |
| `min_days_open` | `integer` NEW | empty | Incomplete cases whose `referral_date` is at least n days before the reference today |
| `include_referred_work_posted` | `boolean` NEW | `false` | Adds the column `Referred Work Posted` (a charge with one of the referred codes for the patient by the referred-to provider on or after the referral date); flags cases left `Incomplete` although the work was done |
| `sort_by` | `enum`: `referral_date` (default), `patient_last_name`, `referred_to_provider`, `days_open_desc` | `referral_date` | Row order inside the group |
| Saved view "Incoming to my office - incomplete, last 90 days" | saved view | - | `referred_from_office_ids = all`, `referred_to_office_ids = @working_office`, `referral_completion = incomplete`, `date_preset = last_90_days` |
| Saved view "Sent from my office - not booked" | saved view | - | Defaults plus `appointment_states = [not_booked]`, `date_preset = last_90_days` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`referral_kind = 'case'`, `direction = 'internal'`, `case_id`, `patient_id`, `referral_date`, `status` = Tx status on internal rows) joined through `case_id` to `referral_cases` (NEW, DATA-40: `from_office_id`, `to_office_id`, `from_provider_id`, `to_provider_id`, `specialty`, `procedure_codes`, `tx_status`, `appointment_id`, `treatment_plan_item_id`, `created_by`, `deleted_at`); `rpt_patient_dim` (`chart_no`, names); `rpt_provider_dim` twice (`provider_name`, `short_id`, `specialty`); `rpt_office_dim` twice (`office_name`, `local_today`); `rpt_appointment_facts` (`appointment_date`, `start_time`, `operatory_id`, `status_class`); operatory label from the passthrough `operatories` catalog (DATA-45); `rpt_user_dim` (`user_label` via `user_key = 'u:' + created_by`); `rpt_procedure_code_dim` (descriptions in the tooltip); with the enhancement `rpt_charges` |
| Grain | One referral case |
| Date basis | `referral_date` (fixed) |
| Office attribution | Two columns: referring office (`from_office_id`) and receiving office (`to_office_id`); readable when either is allowed (08 S-13, two-column `OR` on the scoped handle requested from 02 and 03) |
| Provider attribution | `referring` (`from_provider_id`) and `referred_to` (`to_provider_id`) |
| Deleted rows | `rpt_referral_facts` carries live cases only; `exclude_deleted_referrals = false` reads `referral_cases` directly with the same columns (03 section 2.23 note) |
| Parameter -> query | As in the parity table; `appointment_states` -> `CASE` on `appointment_id IS NULL` / `status_class`; `min_days_open` -> `local_today - referral_date >= :n AND tx_status IS DISTINCT FROM 'completed'` |
| Availability | Coverage matrix row 62: **SCHEMA(40)** - no rows until `referral_cases` exists and the Treatment Plan `Refer To` > Internal flow writes cases. Today treatment-plan items with status `internal_referral` exist (APP, `referral_kind = 'outbound_item'`) without a case, a Tx Status, a referring-office stamp (DATA-39) or a referral date (`presented_date` only); they are not used as a parity source (open question 6) |
| Migrated history | None: no Denticon referral case was migrated; the report starts with the first case created in DentC |
| Cost | `interactive` (case volume is small) |
| Metric | `outbound_referrals` (direction internal) reconciles with the row count for the same office scope and range |

### Output

One block `main`, grain case.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `referral_date` | Referral Date | `date` | `phi_identified` | - |
| `patient_id` | Patient ID | `id` | `phi_identified` | - |
| `patient_name` | Patient Name | `text` | `phi_identified` | `count` (label `Total Referrals :`) per group and grand total |
| `referred_to_provider_label` | Referred To Provider | `text` | `aggregate` | - |
| `procedure_codes_label` | Referred Out Procedure Codes | `text` | `phi_identified` | - |
| `tx_status` | Tx Status | `enum` (`incomplete` -> `Incomplete`, `completed` -> `Completed`) | `phi_identified` | - |
| `appointment_date` | Appt Date | `date` | `phi_identified` | `null_display` empty |
| `appointment_time` | Appt Time | `time` | `phi_identified` | - |
| `operatory_label` | Appt Op | `text` | `aggregate` | - |
| `referring_office_name` | Referring Office | `text` | `aggregate` | - |
| `referring_provider_label` | Referring Provider | `text` | `aggregate` | - |
| `referred_to_office_name` | Referred To Office | `text` | `aggregate` | - (added; default visible) |
| `specialty_label` | Specialty | `text` | `aggregate` | - (added; default hidden) |
| `created_by_label` | Created By | `text` | `aggregate` (rule 12) | - (added; default hidden) |
| `days_open` | Days Open | `integer` | `phi_identified` | `max` per group (added) |
| `is_deleted` | Deleted | `boolean` | `phi_identified` | `count` of true; `visible_when ["falsy", "exclude_deleted_referrals"]` |
| `referred_work_posted` | Referred Work Posted | `boolean` | `phi_identified` | `visible_when ["truthy", "include_referred_work_posted"]` |
| `is_completed`, `is_booked` | (hidden counters) | `integer` | `aggregate` | `sum` (feed the summary cards) |
| hidden: `case_id`, `appointment_id`, `treatment_plan_item_id`, `from_office_id`, `to_office_id`, `from_provider_id`, `to_provider_id`, `row_id` | | | `phi_identified` / `aggregate` | - |

| Topic | Rule |
|---|---|
| Group levels | None by default (legacy unknown); `group_by` adds one level; no `fixed_outer` office band, because each row has two offices (both are columns) |
| Sort | Default `referral_date` asc, `patient_last_name` (hidden), `row_id` [I] |
| Page break | `page_break_by` `none` (default), `group` (layout, enhancement) |
| Summary cards | `Referrals` (count), `Completed` (`is_completed` sum), `Incomplete` (count minus completed, computed as the `sum` of a hidden `is_incomplete`), `Not booked` (`count` minus `is_booked` sum, same technique) |
| Empty run | `no_detail_rows`; while DATA-40 is missing the run returns no rows with the warning `referral_cases_not_available` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bars per referred-to provider: completed / incomplete, top 15 (screen only) |
| Patient name | `record` patient -> `/patient/:id/overview` (`phi_identified`, chart right, `assert_patient_visible`) |
| Referred Out Procedure Codes | `record` treatment plan -> `/patient/:id/treatment` (treatment-plan right) |
| Appt Date | `record` appointment -> scheduler at that date with the appointment selected (scheduler right) |
| Referral Date | `record` referral case -> Referral Management case (route key `referral_case`, NEW, owner 07) |
| Group count, summary card | `rows` of this report filtered to the group / to `tx_status` / to `appointment_states` |

### Actions

| Action | Scope / kind | Phase | Notes |
|---|---|---|---|
| Book the referred appointment | row `navigate` | P4 | Scheduler booking hand-off (`openSchedulerForBooking`) with patient, referred-to provider, receiving office and the referred plan items seeded |
| Open case | row `navigate` | P4 | Referral Management case screen |
| Text / e-mail the patient to book | bulk `send_sms` / `send_email` | P4 | `requires: [sms_consent]` / e-mail opt-in; `no_auto_sms`, `no_correspondence` excluded and counted |
| Follow-up task | row / bulk `create_task` | P4 | Assigned to the caller by default |
| Export selection | bulk `export_selection` | P3 | Full Control + export right |
| Worklist | yes from P4 | P4 | `paging_mode = live` variant "Internal referrals to book" (`referral_completion = incomplete`, `appointment_states = [not_booked]`), family funnel item RPT-REF-09 |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (11 legacy columns plus additions); header organisation name, `Internal Referral Management`; repeating column header; `criteria_echo = footer` with labels `From` / `Thru`, `Referred From Offices`, `Referred To Offices`, `Referred From Provider`, `Referred To Provider`, `Procedure Codes`, `Users`, `Specialty`, `Statuses`, `Exclude Deleted Referrals` [I, echo labels not seen]; `Printed :`, `By :`, `Page : n of m` |
| XLSX | Sheet `Internal Referrals`, one row per case, codes as one text cell, dates and times typed; group value as a column when `group_by` is set; no merged cells |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Options of GROUP BY and any control below it (truncated capture) | live tool, scroll the criteria panel |
| 2 | Printed columns, grouping and totals (no sample exists) | live run, PDF and Excel |
| 3 | Do STATUSES `Completed` / `Incomplete` filter the Tx Status (presumed) or the case status? Who or what sets Tx Status `Completed` (manual, or posting of the referred codes)? | live tool, utility grid |
| 4 | USERS: creator or last modifier? SPECIALTY: specialty of the referred-to provider or of the case? | live tool |
| 5 | With REFERRED TO = ALL and REFERRED FROM = working office, does a receiving office see internal cases addressed to it, or only via the INCOMING tab of the utility? | live tool with a user of the receiving office |
| 6 | Product: offer an interim "internal referral items" list from `outbound_item` rows before DATA-40, labelled as not the legacy report? Default no | product owner |
| 7 | Are deleted cases printed with a marker when Exclude Deleted Referrals is unticked? | live run |

## External Incoming Referral Management - `referral.external_incoming_referral_management`

Referral Reports, screenshot `8.PNG` - P3 - M - right family `referral` (`reports_referral_reports_screen_view_only` / `reports_referral_reports_screen_full_control`; utility right question as on Internal Referral Management) - cost_class interactive - legacy output confidence INFERRED (utility grid and field guide only; report added after June 2023)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front desk, treatment coordinator of a specialist office | Daily | Referrals received from outside dentists (external referral link or ADD REFERRAL): who has not been contacted, who must call back, who is booked |
| Office manager | Weekly | Conversion of incoming referrals (received -> contacted -> scheduled -> completed); expired or refused referrals |
| Owner, practice-relations lead | Month end | Volume per referring doctor, per reason code and per our provider; whom to send a referral report or thank-you |

### Legacy output

No vendor description or sample. Columns from the `EXTERNAL - INCOMING` grid [P58·img][P59·img] (INFERRED as the print
layout):

| # | Header (grid, verbatim) | Content |
|---|---|---|
| 1 | `Referral Date` | date of the case |
| 2 | `Patient ID` | patient id; `N/A` until a patient record exists |
| 3 | `Patient Name` | registered patient or the prospect name keyed with the referral |
| 4 | `Referred To Provider` | our provider the case is addressed to |
| 5 | `Referral Reason Code` | office-defined reason (Setup › Misc Setup › Referral Reasons: code, specialty, description) |
| 6 | `Referral Status` | one of the eight case statuses |
| 7 | `Appt Date` | booked appointment |
| 8 | `Appt Time` | start time |
| 9 | `Appt Op` | operatory |
| 10 | `Referred By` | outside referral source |

Grid icons without a print equivalent: incoming attachment, outgoing report, calendar (book), phone (contact tracking,
source of CONTACT STATUSES), mail (send referral report), delete. Proposed (INFERRED): title `External Incoming Referral
Management`; `Office : <receiving office>` band when several offices; count line `Total Referrals : n` per office and
grand total; added column `Contact Status` (the phone-icon state the criteria filter on).

Status rules (documented for the utility [P57·img][P59·img][P61]): `Pending` is the default; staff set `Accepted`,
`Rejected` (with a note), `In Progress`, `Completed`, `Cancelled`, `Not Needed`; `Expired` is set automatically after 30
days.

### Parameters - legacy parity

<!-- PARITY:refferal_reports.r08 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); rows unchanged |
| REFERRED TO OFFICE/GROUP `Office` (default) with picker `108` (working office) | Security scope of this report (04 section 6.7): `referred_to_office_ids = [working office]` -> `referral_cases.to_office_id IN` the set; supplies "today" |
| REFERRED TO OFFICE/GROUP `Office` several offices / `all` | Union / every office the caller may read; one `Office :` band per receiving office |
| REFERRED TO OFFICE/GROUP `Office Group` | `referred_to_office_group_id`: offices of the group, banded per office |
| REFERRAL DATE RANGE Start Date / End Date (default `today` / `today`) | `referral_date BETWEEN` (inclusive, office-local) |
| REFERRED TO PROVIDER `ALL` (default) / list | No predicate / `to_provider_id IN` (role `referred_to`) [I] |
| REFERRED FROM `ALL` (default) / list | No predicate / `external_referral_id IN` (`lookup:referral_sources`, direction referred-by); cases keyed without a source row match only under `ALL` [I] |
| STATUSES `All` (default, ticked) | `referral_statuses = "all"`: no status predicate |
| STATUSES `Accepted` | Member `accepted`; applies when All is unticked: `status IN (...)` |
| STATUSES `Rejected` | Member `rejected` |
| STATUSES `Pending` | Member `pending` |
| STATUSES `Cancelled` | Member `cancelled` |
| STATUSES `Completed` | Member `completed` |
| STATUSES `In Progress` | Member `in_progress` |
| STATUSES `Not Needed` | Member `not_needed` |
| STATUSES `Expired` | Member `expired` (only as stored; see Data) |
| STATUSES `Exclude Deleted Referrals` checked (default) / unchecked | `exclude_deleted_referrals` `true`: `deleted_at IS NULL` / `false`: deleted cases included with the `Deleted` column |
| CONTACT STATUSES `All` (default, ticked) | `contact_statuses = "all"`: no predicate; cases without any contact entry are kept |
| CONTACT STATUSES `No Response` | Member `no_response`; applies when All is unticked: current `contact_status IN (...)`; cases without an entry dropped (`null_policy drop`) [I] |
| CONTACT STATUSES `Patient To Call` | Member `patient_to_call` |
| CONTACT STATUSES `Appointment Scheduled` | Member `appointment_scheduled` |
| CONTACT STATUSES `Referral Refused` | Member `referral_refused` |

Dependency rules: `refferal_reports.r01.d01`, `refferal_reports.r01.d02`; inside each grid, ticking a member clears `All`
and ticking `All` clears the members (to confirm, filter card 3.7); a grid with nothing ticked is 422 `invalid_parameter`
(`min_items` 1). No greyed control.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `has_patient_record` | `enum` NEW (owner 04): `all`, `registered`, `prospect` | `all` | `prospect` = cases with `patient_id IS NULL` (Patient ID `N/A`): people to register and call |
| `referral_reason_codes` | `entity_multi` NEW (`lookup:referral_reasons`, NEW source, owner 04 / 03) | `all` | Filter on `referral_cases.reason_code` |
| `appointment_states` | `enum_multi` NEW (as Internal Referral Management) | `all` | `not_booked`, `booked_future`, `booked_kept`, `booked_broken` |
| `contact_older_than_days` | `integer` NEW | empty | Cases whose last contact (`contact_status_at`) is older than n days or that were never contacted |
| `group_by` | `enum` (values NEW): `none`, `referred_from`, `referred_to_provider`, `reason_code`, `referral_status` | `none` | One group level with count |
| `sort_by` | `enum`: `referral_date` (default), `days_waiting_desc`, `patient_last_name`, `referred_from` | `referral_date` | Row order |
| Saved view "To call today" | saved view | - | `referral_statuses = [pending, accepted, in_progress]`, `contact_statuses = [no_response, patient_to_call]`, `date_preset = last_30_days` |
| Saved view "Last month by referring doctor" | saved view | - | `date_preset = last_month`, `group_by = referred_from` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_referral_facts` (`referral_kind = 'case'`, `direction = 'in'`, `office_id` = receiving office, `case_id`, `patient_id`, `referral_source_id`, `source_name`, `status`, `referral_date`) joined through `case_id` to `referral_cases` (NEW, DATA-40: `to_office_id`, `to_provider_id`, `external_referral_id`, `reason_code`, `status`, `contact_status`, `contact_status_at`, `appointment_id`, `prospect_first_name`, `prospect_last_name`, `prospect_phone`, `prospect_dob`, `deleted_at`); `rpt_patient_dim` (names, `chart_no`, `cell_phone`, `phone`, `no_auto_sms`, `no_correspondence`); `rpt_provider_dim` (to provider); `rpt_office_dim`; `rpt_appointment_facts` (`appointment_date`, `start_time`, `operatory_id`, `status_class`); `operatories` passthrough; referral reason catalog (NEW passthrough `referral_reasons`, owner 03 within DATA-40) |
| Grain | One incoming case |
| Date basis | `referral_date` (fixed); `contact_status_at` (UTC) converted to the receiving office's local date for display and `contact_older_than_days` |
| Office attribution | Receiving office (`to_office_id`), the security scope; S-13 also admits a case whose referring office is allowed, which is never an own office for an external case |
| Provider attribution | `referred_to` (`to_provider_id`) |
| Patient name | `coalesce` of the registered patient name and the prospect name; Patient ID prints `N/A` when `patient_id IS NULL` |
| Contact status | The stored current `contact_status` of the case (= latest contact-tracking entry). No contact history table exists in DATA-40, so "status at a past date" and contact ageing per entry are not available (parity concern 4) |
| `Expired` | Read as stored. Until the referral feature sets `expired` after 30 days, a stale `pending` case stays `pending`; the definition does not derive it (open question 4) |
| Parameter -> query | As in the parity table; `has_patient_record` -> `patient_id IS [NOT] NULL`; `referral_reason_codes` -> `reason_code IN`; `contact_older_than_days` -> `contact_status_at IS NULL OR local date of contact_status_at <= local_today - n` |
| Availability | Coverage matrix row 63: **SCHEMA(40)** - no rows until `referral_cases` exists and the external-referral intake (link and ADD REFERRAL) writes cases; `referral_reason_codes` needs the reason catalog (NEW) |
| Migrated history | None: no incoming case was migrated |
| Cost | `interactive` |
| Metric | No metric counts incoming cases today; the funnel tiles of RPT-REF-09 / 06 need NEW metrics (`incoming_referrals`, `incoming_referral_conversion_pct`, owner 05) |

### Output

One block `main`, grain case.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | `text` | `aggregate` | band `Office : {office_name}` (fixed outer, multi-office) |
| `referral_date` | Referral Date | `date` | `phi_identified` | - |
| `patient_id` | Patient ID | `id` | `phi_identified` | `null_display` `N/A` |
| `patient_name` | Patient Name | `text` | `phi_identified` | `count` (label `Total Referrals :`) per office and grand total |
| `patient_phone` | Phone | `text` | `phi_identified` | - (added; registered cell phone, else `prospect_phone`) |
| `referred_to_provider_label` | Referred To Provider | `text` | `aggregate` | - |
| `reason_code` | Referral Reason Code | `text` | `phi_identified` | - (tooltip: reason description) |
| `referral_status` | Referral Status | `enum` (8 labels) | `phi_identified` | - |
| `contact_status` | Contact Status | `enum` (4 labels) | `phi_identified` | `null_display` empty (added) |
| `contact_date` | Last Contact | `date` | `phi_identified` | - (added, office-local date of `contact_status_at`) |
| `appointment_date` | Appt Date | `date` | `phi_identified` | - |
| `appointment_time` | Appt Time | `time` | `phi_identified` | - |
| `operatory_label` | Appt Op | `text` | `aggregate` | - |
| `referred_by_label` | Referred By | `text` | `phi_identified` (referral source on a patient row) | - |
| `days_waiting` | Days Waiting | `integer` | `phi_identified` | `max` per office (added: days since `referral_date` while not booked and not closed) |
| `is_deleted` | Deleted | `boolean` | `phi_identified` | `visible_when ["falsy", "exclude_deleted_referrals"]` |
| `is_contacted`, `is_scheduled`, `is_completed` | (hidden counters) | `integer` | `aggregate` | `sum` |
| hidden: `case_id`, `appointment_id`, `office_id`, `to_provider_id`, `external_referral_id`, `row_id` | | | `phi_identified` / `aggregate` | - |

| Topic | Rule |
|---|---|
| Group levels | Receiving office (fixed outer, multi-office); optional `group_by` level; grand total enabled |
| Sort | Default `referral_date` asc, `patient_name`, `row_id` [I] |
| Page break | `page_break_by` `none` (default), `office`, `group` (layout, enhancement) |
| Summary cards | `Received` (count), `Contacted` (`is_contacted`), `Scheduled` (`is_scheduled`), `Completed` (`is_completed`); the conversion ratio is a hidden column `scheduled_pct` with total `ratio(is_scheduled, case_count)` |
| Empty run | `no_detail_rows`; warning `referral_cases_not_available` until DATA-40 |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of cases by `referred_by_label` (top 15) in P3; the funnel received -> contacted -> scheduled -> completed is the family P4 enhancement (RPT-REF-09) |
| Patient name (registered) | `record` patient -> `/patient/:id/overview` (`phi_identified`, chart right) |
| Patient name (prospect) | none in P3; P4 action "Register patient" |
| Appt Date | `record` appointment -> scheduler (scheduler right) |
| Referral Date | `record` referral case (route key `referral_case`, NEW, owner 07) |
| Referred By | `report` `referral.referral_source_list` filtered to the source (needs a hidden source parameter on r03) or Setup › Referrals record |
| Office count, summary card | `rows` of this report filtered to the office / counter |

### Actions

| Action | Scope / kind | Phase | Notes |
|---|---|---|---|
| Register patient | row `navigate` (prospect rows) | P4 | Add Patient wizard pre-filled with prospect name, phone, birth date; existing-patient match runs first |
| Book appointment | row `navigate` | P4 | `openSchedulerForBooking` with patient (registered only), referred-to provider, receiving office |
| Log contact | row `custom:referral_contact` | P4 | Handler owned by the referral feature (sets `contact_status`, `contact_status_at`); idempotent per run and case |
| Send referral report to the referring doctor | row `custom:referral_report` | P4 | Legacy mail icon; handler owned by the referral feature |
| Text the patients to call | bulk `send_sms` | P4 | `requires: [sms_consent]`; prospects without a patient record have no consent record and are excluded and counted |
| Follow-up task | row / bulk `create_task` | P4 | - |
| Export selection | bulk `export_selection` | P3 | Full Control + export right |
| Worklist | yes from P4 | P4 | `paging_mode = live` worklist "Incoming referrals to contact" from the saved view "To call today" |

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; header organisation name, `External Incoming Referral Management`, office band; `criteria_echo = footer` with `From` / `Thru`, `Referred To Offices`, `Referred To Provider`, `Referred From`, `Statuses`, `Contact Statuses`, `Exclude Deleted Referrals` [I]; `Printed :`, `By :`, `Page : n of m` |
| XLSX | Sheet `Incoming Referrals`, one row per case, office repeated, typed dates and times, no merged cells |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Printed columns, grouping, totals; is a contact-status column printed? | live run, PDF and Excel |
| 2 | CONTACT STATUSES: latest entry (presumed) or any entry? Does a case without an entry count as `No Response`? | live tool with an uncontacted case |
| 3 | Does REFERRED TO PROVIDER list only our providers, and REFERRED FROM only referred-by sources? Do the pickers follow the 2026-11 office-group associations of sources? | live tool |
| 4 | Product: derive `expired` for `pending` cases older than 30 days when the referral feature has not set it? Default no (read as stored) | product owner, referral feature |
| 5 | Does a prospect case (Patient ID `N/A`) print with the keyed name and phone? | live run |
| 6 | Behaviour when every STATUSES box is unticked (error, empty, or all)? | live tool |

<!-- WORK-ITEMS -->
| RPT-REF-40 | `referral.referral_summary_report` definition: summary block with office band and type groups, guarded average, positive collection on the allocation join, grand total, title `Referral Summary` | P3 | M | DATA-40, DATA-19, DATA-06, DATA-20, ENG-11, ENG-23, RPT-REF-01, RPT-REF-07 | Golden fixture with two offices, three sources, one `No Referral` patient and a refund: `#Ref`, production and collection per source equal hand-computed values; `Avg Production` empty when `#Ref` = 0; type total average = total production / total `#Ref`; production reconciles with `referral_source_production` |
| RPT-REF-41 | Referral Summary `Referral #` columns (`MTD`, `YTD`, `Last Year`) anchored on `date_to`, referral-date fallback to first visit with run warning | P3 | S | RPT-REF-40, DATA-40, DATA-19 | A run ending 2026-03-15 counts patients referred 2026-03-01..15, 2026-01-01..03-15 and in 2025; a migrated patient without `referral_date` is counted on its first visit date and the run prints `referral_date_from_first_visit` |
| RPT-REF-42 | `referral.referral_count_summary` definition with `count_basis` (`posted_procedure` default, `visit`, `kept_appointment`), `No Referred By` row, grand total | P3 | S | RPT-REF-01, RPT-REF-07, DATA-16, DATA-18, DATA-40 | A patient seen on three days counts once; a patient with only a kept appointment counts only under `kept_appointment`; per-type `Total :` equals the sum of its rows |
| RPT-REF-43 | `patient_detail` drill format for Referral Summary and Referral Count Summary and the `rows` drill from every count and money cell | P3 | S | RPT-REF-40, RPT-REF-42, ENG-30 | Every drilled list total equals the clicked number; the detail block refuses without `phi_identified`; summary runs stay byte-identical with the format absent |
| RPT-REF-44 | Source label class and grouping key: `referral_source_key` (id, normalised free text, none), rule-13 degrade to `source_type_label`, `source_categories` enhancement | P3 | S | RPT-REF-01, SEC-37, DATA-40 | A caller without `phi_identified` sees patient and free-text sources under their type label and the same totals; two app patients with `referred_by` " Source A" and "source a" fall in one row |
| RPT-REF-45 | `referral.internal_referral_management` definition: case rows with both offices and providers, Tx Status radio, deleted toggle, appointment columns, `Total Referrals` count | P3 | M | DATA-40, DATA-45, ENG-09, SEC-05, RPT-REF-01, RPT-REF-06 | Each STATUSES option selects exactly its cases; a deleted case appears only with `exclude_deleted_referrals = false` and shows `Deleted`; with REFERRED TO = ALL a case sent from the working office to an office the caller cannot read is listed |
| RPT-REF-46 | Two-office readability for internal cases (08 S-13) and `all` as no predicate inside the readable set; `group_by` enhancement until the legacy GROUP BY is captured | P3 | S | SEC-05, SEC-37, RPT-REF-45 | A user of the receiving office reads cases addressed to it and no other office's; `referred_to_office_ids = all` never narrows the readable set; each `group_by` value prints its count line |
| RPT-REF-47 | `referral.external_incoming_referral_management` definition: receiving-office security scope and band, eight-status and contact-status grids, prospect rows with Patient ID `N/A`, reason codes | P3 | M | DATA-40, ENG-09, FLT-09, RPT-REF-01, RPT-REF-06 | Each of the 8 statuses and 4 contact statuses selects exactly its cases; a list of contact statuses drops uncontacted cases and `All` keeps them; a prospect case prints `N/A` and the keyed name; an empty grid answers 422 |
| RPT-REF-48 | Case-report enhancements: `appointment_states`, `min_days_open`, `contact_older_than_days`, `has_patient_record`, `referral_reason_codes`, `include_referred_work_posted`, saved views of both reports | P3 | S | RPT-REF-45, RPT-REF-47, FLT-09, DATA-16 | Each enhancement changes rows only when set; default runs equal the legacy runs; `referred_work_posted` is true for a fixture case whose code was posted by the referred-to provider after the referral date |
| RPT-REF-49 | Case worklists and row actions (book, register prospect, log contact, send referral report, SMS, task) on live paging for Internal and External Incoming | P4 | M | RPT-REF-09, ENG-48, ENG-49, RPT-REF-45, RPT-REF-47 | Actions resolve ids from the snapshot; SMS exclusions are counted; a logged contact removes the case from "To call today" on the next page load |
| RPT-REF-50 | Prior-period comparison and new-patient cohort on Referral Summary and Referral Count Summary (`compare_to`, `first_visit_date_*`) | P4 | S | FLT-26, RPT-REF-40, RPT-REF-42, DATA-19 | `compare_to = none` leaves the legacy columns unchanged; previous-year production of a source equals a separate run over the previous year |
<!-- /WORK-ITEMS -->
