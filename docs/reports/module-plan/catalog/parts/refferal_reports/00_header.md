# Referral Reports - report specifications

Referral marketing and referral-case follow-up: where patients come from and what they produce (six classic reports on the
patient referral fields and the referral-source catalog), and the status of referral cases sent and received (three
Referral Management reports). Hub home: Patients › Referrals (brief section 1). Default phase P3; every report ships in P3.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `referral.referral_production_list` | Referral Production List | Per referred patient: visits, procedures, production, collection, adjustments in the period, grouped by referral type (or type, zip, source) | P3 | M | READY (app patients: SCHEMA(40); first-visit filter: REPAIR(19)) | DOCUMENTED (both layouts, samples 2016) |
| `referral.referred_out_list` | Referred Out List | Patients the office referred out, with date, dentist and specialty | P3 | S | APP (structured target and specialty: SCHEMA(40)) | DOCUMENTED (sample 2016) |
| `referral.referral_source_list` | Referral Source List | Master list of referral sources | P3 | S | READY (source Type column: NEW, see Shared rules) | DOCUMENTED (sample 2016) |
| `referral.external_outgoing_referral_management` | External Outgoing Referral Management | Referral cases sent by our providers to outside providers, with status | P3 | M | SCHEMA(40) | INFERRED (utility grid only) |
| `referral.referral_summary_report` | Referral Summary Report | Per referral type and source: #Ref, production, collection, average, referral counts MTD / YTD / Last Year | P3 | M | READY (as Referral Production List) | DOCUMENTED (sample 2023) |
| `referral.referral_count_summary` | Referral Count Summary | Per referral type and source: referred patients seen in the period | P3 | S | READY (as Referral Production List) | DOCUMENTED (sample 2016) |
| `referral.internal_referral_management` | Internal Referral Management | Referral cases between our own providers / offices, with Tx Status and booked appointment | P3 | M | SCHEMA(40) (items with status `internal_referral` exist (APP) without a case or Tx Status) | INFERRED (utility grid only; GROUP BY hidden) |
| `referral.external_incoming_referral_management` | External Incoming Referral Management | Referral cases received from outside providers, with status and contact tracking | P3 | M | SCHEMA(40) | INFERRED (utility grid and field guide only) |

## Shared rules

### Families inside the category

| Family | Reports | Grain | Dataset rows |
|---|---|---|---|
| Patient referral (inbound) | Referral Production List, Referral Summary Report, Referral Count Summary | referred patient; referral source within referral type | `rpt_referral_facts` with `referral_kind = 'inbound_source'`, joined on `patient_id` to `rpt_charges`, `rpt_payment_allocations`, `rpt_adjustments`, `rpt_patient_dim`, `rpt_patient_activity` |
| Patient referral (outbound) | Referred Out List | referred-out patient (one per patient: single `patients.referred_to`) | `rpt_referral_facts` with `referral_kind = 'outbound_patient'`, `rpt_patient_dim`, `rpt_patient_activity` (`Last Visit`) |
| Source catalog | Referral Source List | referral source | passthrough `referrals` (catalog rule of 04 section 6.5) |
| Referral cases | the three Referral Management reports | referral case | `rpt_referral_facts` with `referral_kind = 'case'` over `referral_cases` (NEW, DATA-40), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`, `rpt_appointment_facts` (booked appointment) |

`referral_kind = 'outbound_item'` (treatment-plan items with a referred-out status) feeds no legacy report; it is the
interim source of `outbound_referrals` and of the case reports' history (see open questions).

### Shared parameters and defaults (from the parity file; no report repeats them)

| Parameter | Type | Reports | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 8 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | r01, r02, r05, r06; r03 display-only | `working_office` | Patient reports: attribution = patient home office, money legs restricted to the same office set (below). r03: `enabled_when false`, `disabled_value {"office_ids": "all"}`, catalog rule |
| `referred_from_office_scope` | `office_scope` | r04 (security scope), r07 (filter) | `working_office` | Referring office of the case |
| `referred_to_office_scope` | `office_scope` | r07 (filter, default `all`), r08 (security scope, default `working_office`) | per report | Receiving office of the case |
| `date_range` (`date_from`, `date_to`) | `date_range` | all but r03 | `today` / `today` | Fixed basis per report: `service_date` (r01, r05, r06), `referred_out_date` (r02), `referral_date` (r04, r07, r08); no `date_basis` parameter |
| `referral_type_codes` | `entity_multi` | r01, r03, r05, r06 | `all` | Patient's referral type on r01 / r05 / r06; type of the source row on r03. Legacy single-select, list = enhancement. `lookup:definitions:referral_type` |
| `specialty_codes` | `entity_multi` | r02, r04, r07 | `all` | Referral-source specialty on r02 / r04; provider specialty on r07 |
| `referred_to_ids`, `referred_from_ids` | `entity_multi` | r02, r04 / r08 | `all` | `lookup:referral_sources` filtered by direction (referred-to / referred-by); search source, `max_items` 500 |
| `referred_from_provider_ids`, `referred_to_provider_ids` | `entity_multi` | r04, r07 / r07, r08 | `all` | `provider_role` `referring` / `referred_to`; never scoped by `providers.office_id` |
| `procedure_codes`, `user_ids` | `entity_multi` | r04, r07 | `all` | Any-match on the referred codes of the case; user = creator of the case (inferred) |
| `referral_statuses` | `enum_multi`, `accepts_all` | r04, r08 | `all` | Eight-value case vocabulary; `predicate`, `min_items` 1 |
| `exclude_deleted_referrals` | `boolean` | r07, r08 | `true` | Soft-deleted cases dropped |

Dynamic rules for the whole family: `refferal_reports.r01.d01` (Office / Office Group mode decides the value key of all three
office-scope parameters) and `refferal_reports.r01.d02` (ADD TO MY FAVORITES / UPDATE MY FAVORITES = one favorite saved view
per caller and report). Footer actions on every report: CLEAR CRITERIA -> reset to defaults (frontend), PRINT / PREVIEW ->
`print`, ADD TO MY FAVORITES -> `saved_view`.

### Date bases, attribution, freshness

| Topic | Rule |
|---|---|
| Date basis | `service_date` of posted procedures (`rpt_charges.service_date`); collection = allocations to those charges (PD-3, allocation-based, `rpt_payment_allocations`); adjustments by effective service date. `referred_out_date` = `patients.referral_to_date`. `referral_date` = Referral Date of the case. Office-local dates, inclusive (AD-9) |
| "Today" | Office-local date of the working office (security-scope office on r04 / r08, `referred_from_office_scope` on r07) |
| Office attribution | Patient reports (r01, r02, r05, r06): `home_office` (`rpt_patient_dim.home_office_id`), current state - legacy "patients currently in that office". Money legs of r01 / r05 / r06 are additionally restricted to the resolved office set (office of service for production, transaction office for collections and adjustments), the legacy "no cross-office data". Case reports: referring office (r04), receiving office (r08), either office readable under 08 S-13 (r07). r03: none (catalog rule) |
| Provider attribution | Patient reports: none (no provider parameter). Case reports: `referring` and `referred_to` roles of the case |
| History limit | Current state only: a change of the patient's home office, referral type or source rewrites history (legacy behaviour, vendor text). Printed as an `availability[]` warning on r01, r05, r06 |
| Freshness | `live` (views over OLTP). `cost_class`: `instant` for r03; `interactive` for the rest |

### Sign and arithmetic conventions (deliberate, because the legacy samples conflict)

| Item | Convention | Legacy evidence |
|---|---|---|
| Collection | Positive amount collected, net of refunds, in every layout and total (`-Σ p.amount [COLL]` as in metric `referral_source_production`) | standard layout printed negative, zip layout positive [conflict] |
| Adjs | Signed: credit adjustments negative, debit adjustments positive | sample shows signed values |
| `# Visits` | Distinct patient-office-days with a posted procedure (`rpt_visits`) in the range; subtotals are sums of rows | zip-sample subtotals do not equal row sums [conflict] |
| `Avg Production` | `ratio(production, ref_count)` with the zero-denominator guard: empty cell when `#Ref` = 0 (never production) | vendor sample prints production when `#Ref` = 0 [quirk not copied] |
| Totals | `Total for Referral type, <type> [n]:` (n = patients) on r01; `Total :` per type on r05 / r06; grand total added on every report (enhancement; legacy r06 shows none) | samples |

### Page furniture, rights, data classes

| Topic | Rule |
|---|---|
| Header | Organisation name, printed title from `title_templates` (r01 `Referral Production Listing`, subtitle `(by Zip Code)` when `group_by = zip_code`; r05 `Referral Summary`; others the menu name), `Office : <office name>` outer band when `["ctx", "multi_office"]` |
| Footer | `criteria_echo = footer` with the legacy echo labels (`From` / `Thru`, `First Visit Date From` / `Thru` (legacy typo `Firsti` not copied), `Referral Types`, `From Zip` / `Zip`, `Exclude Pat Type`, `Specialty`, `Referred Out to`, `Referral By/To`), `Printed : <date time>`, `By : <user>`, `Page : n of m` |
| Right family | `referral`: `reports_referral_reports_screen_view_only` (run and view) / `reports_referral_reports_screen_full_control` (also print, export, schedule) (08 section 2.3, PD-10). No per-report override; whether the three case reports also need the legacy `Utilities - Referral Management Full Control` is an open question |
| Data classes | Patient name, chart #, patient id, phones, zip, dates of service, referral source on a patient row: `phi_identified`. Money on a patient row (r01): `financial_patient`. Money per source or type (r05): `financial_practice`; a source that is a patient or free text is a `phi_identified` + `deny` label (08 section 5.2 rule 13) and degrades to `source_type_label` for a caller without the class. Counts (r06): `aggregate`. r03 catalog columns: `aggregate`, `Cost` `financial_practice`, a source naming a patient `phi_identified`. Case rows: `phi_identified`; referral reason and notes `phi_identified` (free text, rule 4) |
| Drill | Source or type row -> `kind: rows` (r01 filtered to the source); patient cell -> `kind: record` patient chart (right of the chart feature, `phi_identified`); case row -> patient chart and booked appointment |
| Metrics | Summary figures reconcile with `referral_source_production` (r01 / r05 production and collection per source), `outbound_referrals` (r02 count, r04 + r07 counts), `new_patients_missing_source_pct` (r06 "No Referred By" share) - `reconciles_with[]` tests, never second queries |

### Data gaps the family depends on (owned by 03)

| Gap | Effect | Owner |
|---|---|---|
| `referral_cases` entity (direction, from / to office and provider, status, Tx status, contact entries, reason code, appointment, created_by, soft delete) | r04, r07, r08 return no rows until it exists and the app writes cases | DATA-40 |
| `patients.referral_source_id`, `referral_date` | App patients hold free-text `referred_by`; source match only by name until back-fill | DATA-40 |
| Structured referred-out target | r02 source and specialty filters match by name until a source id is stored | DATA-40 |
| Type of a referral-source row (legacy setup field `Type`) and the `Both` direction | r03 REFERRAL TYPE and REFERRED TO/BY `both` cannot filter: NEW `referrals.source_type_code` and a three-valued direction, owner 03_data_foundation.md (extension of DATA-40) | NEW |
| Maintained first visit date | r01 first-visit cohort is NULL until maintained | DATA-19 |
| `referrals` hard delete, no index | Deleting a source breaks the string link; lookups unindexed | DATA-08, DATA-40 (`is_active`) |

### Family-wide enhancements (additive; defaults unchanged)

| Enhancement | Reports | Phase |
|---|---|---|
| Multi-select on REFERRAL TYPE and SPECIALTY; search and inactive switch in the source pickers | all | P3 |
| Columns: percent of patients and percent of production per source (`share_of_parent`), grand totals | r01, r05, r06 | P3 |
| ROI column from `referrals.cost` (labelled reference-only, no period) | r05 | P4 |
| Cross-office view (home office ignored, money in all offices) as an explicit option, default off | r01, r05, r06 | P4 |
| Case funnel (received -> contacted -> scheduled -> completed) with ageing; row actions "open case", "book appointment" | r04, r07, r08 | P4 |
| Bulk actions letters / labels to referral sources (owning feature handles, PD-15) | r03, r05 | P3 |

### Family-wide open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Do r01 / r05 / r06 accept several offices or an office group, given the vendor text "limited to the office the report is run in"? | live legacy tool, office group run |
| 2 | Values and order of REFERRAL TYPE, SPECIALTY and REFERRED TO/BY dropdowns; source of SPECIALTY (provider or referral-source specialties) per report | live legacy tool, expand each dropdown |
| 3 | What follows the third STATUSES row on External Outgoing (Exclude Deleted Referrals? GROUP BY?) and the GROUP BY options of Internal Referral Management | live legacy tool, scroll the criteria panel |
| 4 | Output columns, grouping and totals of the three Referral Management reports (no sample exists) | live legacy run of each, PDF and Excel |
| 5 | Meaning of USERS (creator versus modifier) and of CONTACT STATUSES (latest entry? no entry = No Response?) | live legacy tool |
| 6 | Whether the case reports also require `Utilities - Referral Management Full Control` | live legacy tool with a View Only group |
| 7 | Since the 2026-11 office-group associations of referral sources: are source pickers filtered by office, and is OFFICE/GROUP still disabled on Referral Source List? | live legacy tool |

<!-- WORK-ITEMS -->
| RPT-REF-01 | Shared referral parameter set and option sources: `referral_type_codes`, `referral_sources` by direction, specialty source variants (referral-source / provider), three office-scope parameters with `security_scope` per report | P3 | S | FLT-03, FLT-09, FLT-13, DATA-40 | Each of the 8 definitions validates with the defaults of the parity file; `referred_to_ids` lists only referred-to sources, `referred_from_ids` only referred-by sources; FLT-20 parity default tests pass |
| RPT-REF-02 | `referral.referral_production_list`: standard and by-zip-code variants on inbound_source facts with production, allocated collections, adjustments, visits | P3 | M | DATA-40, DATA-19, DATA-06, DATA-20, ENG-11, ENG-23, RPT-REF-01 | Golden fixture: per-patient and per-type totals equal hand-computed sums; zip variant has no Adjs column and three group levels; `group_by = zip_code` changes the title subtitle |
| RPT-REF-03 | `referral.referral_summary_report` and `referral.referral_count_summary` (MTD / YTD / Last Year referral counts, `No Referral` / `No Referred By` rows, guarded average) | P3 | M | RPT-REF-02, MET-18 | Production and collection per source reconcile with `referral_source_production` for the same params; `Avg Production` is empty when `#Ref` = 0; count summary counts each patient once per source |
| RPT-REF-04 | `referral.referred_out_list` on outbound_patient facts (patients.referred_to, referral_to_date) | P3 | S | DATA-40, DATA-19, RPT-REF-01 | Patients with `referral_to_date` in range are listed once; exclude patient type keeps patients without a type; total line equals row count |
| RPT-REF-05 | `referral.referral_source_list` on the `referrals` catalog with display-only office scope and the catalog rule | P3 | S | DATA-40, DATA-08, FLT-03 | Office picker change does not change rows; a caller sees only sources the Setup screen shows them; REFERRED TO/BY and REFERRAL TYPE filter once the NEW source columns exist, ALL returns every source before |
| RPT-REF-06 | The three Referral Management definitions on case facts: status grid, Tx status radio, contact statuses, deleted flag, two-column readability rule for internal cases | P3 | L | DATA-40, SEC-05, ENG-09, RPT-REF-01 | Every legacy status and contact status selects exactly its cases; a receiving office reads internal cases addressed to it (08 S-13); deleted cases appear only with `exclude_deleted_referrals = false` |
| RPT-REF-07 | Family conventions: signs, totals, title templates, footer criteria echo labels, `availability[]` warnings (current-state history, migrated free-text links) | P3 | S | ENG-23, FLT-18, RPT-REF-02 | PDF footers print the legacy echo labels; collection is positive in both r01 layouts; warnings appear in the criteria block of affected runs |
| RPT-REF-08 | Live legacy verification for this category: dropdown values, truncated criteria of r04 and r07, outputs of the three case reports, USERS / CONTACT STATUSES meaning | P3 | S | FLT-23 | Every `unknown_legacy` and inferred note of `refferal_reports.parity.json` is resolved or re-confirmed, and the parity file is rebuilt PARITY VALID |
| RPT-REF-09 | Referral analytics enhancements: share-of-parent columns, cross-office option, ROI on source cost, case funnel and ageing with row actions | P4 | M | RPT-REF-03, RPT-REF-06, MET-18 | Default runs are byte-identical to the P3 legacy runs; enhanced columns reconcile with the metric registry |
<!-- /WORK-ITEMS -->
