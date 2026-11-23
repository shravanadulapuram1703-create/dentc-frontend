## Executive Summary - `monthly.executive_summary`

Monthly Reports, screenshot `1.PNG` - P2 - L - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (background when the run spans more than 10 offices or more than 366 days) - DOCUMENTED (every line and its vendor definition); GROUP BY Provider / Page Break layout INFERRED

### Purpose

Owner, regional manager and office manager: one page of practice KPIs per office - patients, visits, appointments,
production, collections, adjustments, doctor / hygiene split, averages, referral sources, MTD / YTD money and, on request,
the A/R snapshot. Run at the end of the day (range = today), at month end (range = the month, the vendor-recommended run
with `SELECT` > all offices) and for year-end information ([R] research section 2.9: Management / C-level, daily, month
end, year end). Supports: "is this office on track this month", comparing locations side by side, spotting a drop in
visits or a rise in cancellations, and the month-end management pack. The Daily Reports category has its own daily
variants (not part of this category).

### Legacy output

Confidence DOCUMENTED: base layout and every line from the vendor field guide (annotated, 3 images) and a 2025 sample;
GROUP BY Provider and Page Break layout INFERRED (third-party source only).

Header: organisation name, title `Executive Summary`, band `Office : <office>`. Body in three columns: label, bold figure,
sub-figure column. One KPI block per selected office; whether a consolidated all-offices block follows is unverified
(family open question 1).

| # | Printed line (exact) | Vendor definition |
|---|---|---|
| 1 | `New Patients :` | patients added to the system (created date) in the range, by the patient's home office |
| 2 | `New Patients by First Visit Date :` | patients whose first visit is in the range, same office rule |
| 3 | `Patients Seen :` | distinct patients with a ledger procedure whose code has Ledger Code = yes and Visit Code = yes |
| 4 | `Avg Patients Seen Per Day :` | Patients Seen ÷ office working days (days with a ledger procedure in the range) |
| 5 | `Patient Visits :` | patient-days with such a procedure |
| 6 | `Total Procedures Done :` | ledger procedures with Ledger Code = yes (Visit Code ignored) |
| 7 | `Total Chair Hours :` | appointment length of appointments with a completed transaction; missed and cancelled excluded |
| 8 | `Missed Appointments :` | appointments in the range marked missed |
| 9 | `Cancelled Appointments :` | appointments in the range marked cancelled |
| 10 | `Production :` | visit-code ledger items net of all production adjustments |
| 11 | `  Patient :` (sub-figure) | estimated patient portion = Production - Insurance |
| 12 | `  Insurance :` (sub-figure) | estimated insurance portion |
| 13 | `Non visit code transactions :` | ledger items with Ledger Code = yes and Visit Code = no |
| 14 | `Total :` | Production + non visit code transactions |
| 15 | `Collection :` | patient + insurance payments, printed negative (A/R reduced) |
| 16 | `  Patient :` / `  Insurance :` | ledger type `P` / `I` |
| 17 | `Adjustments :` `(Collection)` | total collection adjustments |
| 18 | `Dentist Production :` + sub `Non visit code transactions :` | production of dentist providers |
| 19 | `Hygienist Production :` + sub `Non visit code transactions :` | production of hygienist providers |
| 20 | `Total :` | dentist + hygienist, non-visit included |
| 21-24 | `Average Production Per Patients Seen :` / `Per Chair Hours :` / `Per Procedures Done :` / `Per Patient Visits :` | Production (line 10) ÷ the line named |

Further blocks per office: `Referrals :` table (source name, `New Patients`, `Production`, `Total :` row; probably printed
only when referral data exists [I]); MTD / YTD table (rows `Charges`, `Non-Visit code Transactions`, `Payments`,
`Adjustments`; MTD = first of the month of End Date through End Date, YTD = January 1 through End Date); with Show AR the
row `A/R as of : <End Date>` with `Current`, `Over30`, `Over60`, `Over90`, `Over120`, `Total A/R`, then `Estimated
Insurance :` and `Estimated Patient :`. Footer: `From:`, `Thru:`, `Offices: <ids>`, `Providers : ALL`, `* Show AR.`.

Signs: payments negative, adjustments as stored (sample `35.86`), no currency symbol, two decimals. Quirks kept: three
new-patient notions side by side; the A/R block equals the Aging Report only for a single-day run with Include Credit
Balance ticked on the Aging Report. Quirks deliberately fixed: the vendor guide's copy error on the Insurance line (we
print Insurance); `Total Chair Hours` is computed in hours although the vendor sample behaves like minutes (1,060.00 for
24 visits) - see Open questions; a third row `Other Production :` prints only when providers that are neither dentist nor
hygienist produced, so lines 18-20 still add up.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default) + picker `108` | `office_ids = [working office]`; one KPI block (and its trailer blocks) per resolved office (`fixed_outer` level office, also for one office). Each figure uses its own office column (Data) |
| OFFICE/GROUP = Office Group + picker | `office_group_id`: every office of the group, one block each, in office display order |
| Provider = ALL (default) | No provider predicate; footer `Providers : ALL` |
| Provider = list | Every figure limited to the providers on its own provider column (Data, provider column per line); footer lists the provider short ids. New-patient lines and Referrals block are not provider-limited [I] |
| Start Date / End Date (default today / today) | Range of every count and money line on its date (Data); End Date also anchors MTD (month start of `date_to`) and YTD (January 1 of `date_to`) and is the as-of date of the A/R block |
| Show AR unticked (default) | No A/R block, no footer flag |
| Show AR ticked | Adds block `ar_snapshot` (`A/R as of : <date_to>`) per office and footer flag `* Show AR.` |
| GROUP BY = None (default) | Office totals only |
| GROUP BY = Provider | Inside each office one KPI block per provider with activity in the range (provider header `Provider : <short id> - <name>`), then the office total block [I]. Lines without a provider (1, 2, Referrals) print in the office total block only |
| Page Break unticked (default; greyed while GROUP BY = None) | Provider blocks follow each other |
| Page Break ticked | `page_break_by = group`: each provider block starts a new PDF page; layout only, the snapshot is reused |

Dependency rules: `page_break_by` `enabled_when` `["eq", "group_by", "provider"]` (inferred from the greyed capture;
disabled value `none`). Legacy actions: PRINT / PREVIEW -> `print`, CLEAR CRITERIA -> `frontend`, ADD TO MY FAVORITES ->
`saved_view`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range` | `today` | Month-end pack in one click: `last_month`, `month_to_date`, `year_to_date`, `last_quarter`; schedules store the preset (a monthly schedule on the 1st with `last_month`) |
| `compare_to` (+ `compare_date_from`, `compare_date_to`) | `enum` `none`, `previous_period`, `previous_year`, `custom` (filter card 12, `supports_comparison = true`) | `none` | Adds columns `Prior` and `Change %` to every count and money line of the KPI block; the legacy layout is unchanged while `none`. P4 (FLT-26) |
| `office_scope` `my_offices` / `all` | shared | `working_office` | Regional run over the caller's offices |
| `include_office_total_block` | `boolean` (NEW key, owner: this catalog) | `false` | Appends one consolidated block over all resolved offices after the last office (ratio lines recomputed from the summed components, never averaged). Replaced by the legacy behaviour once family open question 1 is answered |
| `chart_series` (view state, not a parameter) | - | - | Toggles the trend chart (Visuals) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_charges`, `rpt_ledger_entries`, `rpt_visits`, `rpt_provider_visits`, `rpt_appointment_facts`, `rpt_patient_activity`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_procedure_code_dim`, `rpt_office_dim`, `rpt_ar_open_items()` (unit `account_office`, `p_as_of = date_to`), `rpt_aging_bucket_sets` (set `legacy`) |
| Fixed `date_basis` | `transaction_date` (documented). Charges: `rpt_charges.transaction_date`, equal to `service_date` until DATA-13. Visits: `rpt_visits.visit_date` (date of service of the visit-code charges). Appointments: `appointment_date`. Payments / adjustments: `rpt_ledger_entries.transaction_date` |
| Line 1 | `count(*)` of `rpt_patient_dim` with office-local `created_at_utc` date in range, `created_at_reliable`, NOT `is_placeholder_patient`; office = `rpt_patient_dim.home_office_id`. Migrated patients carry the load time: they are never counted (APP for history), `availability[]` code `created_date_migrated` |
| Line 2 | `rpt_patient_activity.first_visit_date` in range, office = `rpt_patient_dim.home_office_id` (metric `new_patients_first_visit` with `office_attribution = home_office`) |
| Lines 3, 5 | `count(DISTINCT patient_id)` and `count(*)` of `rpt_visits` (office = `rpt_visits.office_id`); by provider `rpt_provider_visits` (not additive across providers) |
| Line 4 | Line 3 ÷ `count(DISTINCT visit_date)` of `rpt_visits` of the office in range (metric `working_days`, `working_day_basis = activity`); zero-denominator guard prints `0.00` |
| Line 6 | `count(*)` of `rpt_charges` with `is_ledger_code` (office of service) - metric `procedures_done` |
| Line 7 | `sum(duration_minutes) / 60` of `rpt_appointment_facts` with `is_kept`, NOT `is_block`, NOT `is_deleted`, NOT `is_legacy_archive` (unless tenant policy) - metric `chair_hours`, office = appointment office |
| Lines 8, 9 | `count(*)` of `rpt_appointment_facts` with `status_class = 'no_show'` / `'cancelled'` (data card 3.2), same row filters |
| Line 10 | metric `visit_code_production`: `Σ rpt_charges.charged_fee [is_production AND is_visit_code]` + `Σ rpt_ledger_entries.amount [ledger_bucket = 'production_adjustment']` of the office |
| Lines 11, 12 | Insurance = `Σ rpt_charges.est_insurance` of the visit-code charges of line 10; Patient = line 10 - Insurance (the vendor formula; production adjustments therefore land in Patient) |
| Line 13 | `Σ charged_fee [is_ledger_code AND NOT is_visit_code]` |
| Line 14 | line 10 + line 13 |
| Lines 15, 16 | `Σ amount` of `rpt_ledger_entries [journal_column = 'payment']` (legacy ledger type P / I) split by `payer` (`patient` / `insurance`; both stores, PD-2); signed negative. Differs from `gross_collections` by `non_collection_payment` rows, which the legacy line includes |
| Line 17 | `Σ amount [journal_column = 'adjust' AND entry_type <> 'charge']` (legacy Sub Type Collection); migrated adjustments have unknown Sub Type and land here until DATA-12 (`availability[]` code `unclassified_adjustments`) |
| Lines 18-20 | lines 10 and 13 split by `rpt_provider_dim.provider_kind` of the treating provider (`rpt_charges.provider_id`; production adjustments by `rpt_ledger_entries.provider_id`): `dentist` + `specialist` -> Dentist, `hygienist` -> Hygienist, other / NULL -> Other [I]. Hygienist credit uses the treating provider (`hygiene_credit_policy = treating_provider` for parity) |
| Lines 21-24 | `safe_div(line 10, line 3 / 7 / 6 / 5)`, computed by the banding step from unrounded components (metric catalog 7.9) |
| Referrals block | new patients of line 2 grouped by `rpt_patient_dim.referral_source_id` / `referral_source_name` (migrated patients: link by legacy id through `referred_by_raw`; app patients: free text until DATA-40, printed under the raw text); `Production` = `Σ amount [journal_column = 'charges']` of those patients in the range (charges plus production adjustments, Visit Code ignored, vendor definition). Rows only for sources with a new patient; block omitted when empty [I] |
| MTD / YTD block | windows `start_of_month(date_to)..date_to`, `start_of_year(date_to)..date_to`: `Charges` = line 10 rule, `Non-Visit code Transactions` = line 13, `Payments` = line 15, `Adjustments` = line 17 |
| A/R block | `rpt_ar_open_items(tenant, NULL, date_to, 'account_office')` per `unit_office_id`: buckets of `rpt_aging_bucket_sets` `legacy` over `open_amount` of open debits by `age_days`; `Total A/R` = `Σ open_amount` over debits and unallocated credits (credits netted, metric `total_ar`); `Estimated Insurance` = `Σ open_insurance_est`; `Estimated Patient` = `Σ open_patient` (credits included, [I]) |
| Provider attribution (inferred, family open question 2) | production, procedures, non-visit: `rpt_charges.provider_id`; patients seen / visits: `rpt_provider_visits.provider_id`; chair hours, missed, cancelled: `rpt_appointment_facts.provider_id`; collections, adjustments: `rpt_ledger_entries.provider_id`; A/R block: `rpt_ar_open_items.provider_id` |
| Office attribution | per line as above (office of service, visit office, appointment office, transaction office, home office for new patients, unit office for A/R); NULL office = `Unassigned office` (organisation callers only) |
| Availability | READY (coverage matrix row 13). Procedures Done / Non visit need the reviewed `is_ledger_code` / `is_visit_code` flags (DATA-04); line 1 is APP for migrated patients; chair hours need `is_kept` (DATA-16); visits DATA-18, first visit DATA-19; A/R block DATA-27 (tenant-wide), a past End Date is recomputed until DATA-30; referral production for app patients needs DATA-40 (P3); migrated adjustment classes REPAIR(12); migrated ledger completeness DATA-57 warning |
| Cannot be produced | `New Patients` (created date) for migrated patients; frozen month-end figures before day close exists (DATA-29 / DATA-30); hygienist credit on migrated charges (no `hygienist_id`) |

### Output

One format `standard` (no REPORT FORMAT control). Block `kpi` (`shape = key_value`, main), grouping `fixed_outer` office
(header `Office : {office_name}`), option `group_by = provider` adds level provider (header `Provider : {provider_short_id}
- {provider_name}`, `page_break_allowed`), `trailer_blocks` `referrals`, `mtd_ytd`, `ar_snapshot` after each office.

Block `kpi` - one row per line per group; columns:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `line_key` | (hidden) | id | `aggregate` | - |
| `line_label` | (label column) | text | `aggregate` | label |
| `value` | (bold figure) | decimal / money / integer per line (`format` from the line: counts integer, hours decimal 2, money 2 decimals minus sign) | counts `aggregate`; money `financial_practice`; in provider groups `provider_comp` | office block = office figure (never the sum of provider blocks: visit counts are not additive) |
| `sub_value` | (sub-figure) | money | as `value` | as `value` |
| `prior_value`, `change_pct` | Prior, Change % | as `value`, percent | as `value` | `visible_when` `["ne", "compare_to", "none"]` |

Line keys in print order: `new_patients_created`, `new_patients_first_visit`, `patients_seen`, `avg_patients_seen_per_day`,
`patient_visits`, `procedures_done`, `chair_hours`, `missed_appointments`, `cancelled_appointments`, `production_net`
(subs `production_est_patient`, `production_est_insurance`), `production_non_visit`, `production_total`,
`collection_total` (subs `collection_patient`, `collection_insurance`), `collection_adjustments`, `production_dentist`
(sub `production_dentist_non_visit`), `production_hygienist` (sub `production_hygienist_non_visit`), `production_other`
(`visible_when` non-zero), `production_provider_total`, `avg_production_per_patient_seen`,
`avg_production_per_chair_hour`, `avg_production_per_procedure`, `avg_production_per_visit`.

Block `referrals` (table, `after_group`): `referral_source_name` Referral (text, `phi_identified` when the source is a
patient or free text, else `aggregate`, rule 13), `new_patients` New Patients (integer, `aggregate`, sum),
`production` Production (money, `financial_practice`, sum); `Total :` row. Sort: source name.

Block `mtd_ytd` (table, `after_group`): `row_label` (Charges, Non-Visit code Transactions, Payments, Adjustments), `mtd`
MTD, `ytd` YTD (money, `financial_practice`; `provider_comp` in provider groups); no total row.

Block `ar_snapshot` (table, `after_group`, `visible_when` `["truthy", "show_ar"]`): `ar_as_of` (date, label `A/R as of :`),
`bucket_current` Current, `bucket_over_30` Over30, `bucket_over_60` Over60, `bucket_over_90` Over90, `bucket_over_120`
Over120, `total_ar` Total A/R, `estimated_insurance` Estimated Insurance, `estimated_patient` Estimated Patient (money,
`financial_practice`).

Sort: fixed line order; offices in display order; providers by last name. Page break: `page_break_by` (`none`, `group`).
Summary cards (main office or the total block): `production_net`, `collection_total`, `patients_seen`, `new_patients_first_visit`.
`reconciles_with`: `production_net` = `visit_code_production`, `patients_seen` = `patients_seen`, `chair_hours` =
`chair_hours`, `total_ar` = `total_ar` (unit `account_office`, as of `date_to`). `empty_when`: `total_is_zero` on
`production_total`.

### Visuals and drill-through

Chart (screen only, `charts[]`): bar chart of `production_net`, `collection_total` (sign flipped for display) and
`collection_adjustments` per office (category = office) when more than one office; per provider when grouped.

| Click | Target | Parameters passed |
|---|---|---|
| `production_net`, `production_non_visit`, dentist / hygienist lines | `daily.production_report` | `office_ids` = clicked office, `date_from` / `date_to`, `provider_ids` = clicked provider group or the run's |
| `collection_total` and subs | `daily.collection_report` | office, range, providers |
| `collection_adjustments` | `daily.special_transaction_report` | office, range (adjustment codes of class collection) |
| `patients_seen`, `patient_visits` | `lists.patients_seen` | office, range, providers |
| `new_patients_first_visit` | `lists.patient_list_new_patient` | home office, range |
| `missed_appointments`, `cancelled_appointments` | `appointment.appointment_list` | office, range, status missed / cancelled |
| Referral row | `referral.referral_summary_report` | source, range |
| A/R bucket or `total_ar` | `monthly.aging_report` | office, `report_date = date_to`, `aging_buckets = [clicked]`, `include_credit_balances = true` |
| MTD / YTD cell | same report | `date_from` = window start, `date_to` |

### Actions

None at row level (aggregate report, not a worklist). Bulk: `export_selection` of the chosen offices' blocks. Hub
actions: schedule (month-end pack), save view, share (needs `reports_monthly_reports_screen_full_control`).

### Export and print

PDF: layout `executive_summary` (NEW renderer key: three-column key-value body, trailer tables), portrait, letterhead
(organisation name, title, `Office :` band), criteria echo in the footer (`From:`, `Thru:`, `Offices:`, `Providers :`,
`* Show AR.`), `Printed :`, `By :`, `Page : n of m`; one office per page block, page break per provider when ticked.
XLSX: sheet `Summary` flat (`office`, `provider`, `line_key`, `line_label`, `value`, `sub_value`, prior columns when
present), sheets `Referrals`, `MTD_YTD`, `AR` (one row per office), `Criteria`; no merged cells. CSV: the `kpi` block flat.
Background run (`escalate_when` above) delivers the artifact by link.

### Open questions

| # | Question |
|---|---|
| 1 | Consolidated all-offices block on multi-office runs (family 1); until answered, `include_office_total_block` default false |
| 2 | Which provider column limits each line when providers are selected (family 2); confirm with a two-provider office |
| 3 | `Total Chair Hours` unit: sample (1,060.00 for 24 visits, 3.56 per hour) behaves like minutes. Product decision: print hours (default) or minutes for parity |
| 4 | GROUP BY Provider layout and where the new-patient and referral lines print (INFERRED) |
| 5 | Whether specialists count as Dentist Production; whether production adjustments count in the dentist / hygienist split |
| 6 | Whether Patients Seen excludes missed / cancelled appointments (search snippet only) - our visit rule does not read appointments |
| 7 | Is the Referrals block printed when it is empty, and does it count by first-visit date or created date |

## Executive Day Sheet - `monthly.executive_day_sheet`

Monthly Reports, screenshot `2.PNG` - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (instant for one office and one day; background for an office group over more than 92 days) - DOCUMENTED (columns and row structure from the 2020 and 2022 samples); closing total row unverified

### Purpose

Office manager, bookkeeper and owner, daily or for any range (month-end adjustment review): the money of the range per
transaction type - services, every production adjustment code, every collection adjustment code, every payment code -
with its effect on A/R. Used to see which adjustment codes were used and for how much, how much sales tax and finance
charges were posted, and to check that the month's A/R movement is explained by codes (vendor recommendation; modern form
of the peg-board day sheet).

### Legacy output

Confidence DOCUMENTED (two vendor samples); total row unverified.

Header: organisation name, `Executive Day Sheet` (the 2020 build printed `Day Sheet` in the footer), `Office : <office
name>`. One section per office.

| Column (as printed) | Content |
|---|---|
| `Type` | `Services`, then each adjustment / payment code name, right-aligned |
| `Production` | amount for `Services` and production-class adjustment codes; `--` otherwise |
| `Collections` | amount for payment codes; `--` otherwise |
| `Adjustments` | amount for collection-class adjustment codes; `--` otherwise |
| `A. R. Impact` | signed effect on receivables (sample: `Services` $56,144.66 -> $56,144.66; `$Test Production Adj` ($75.00) -> ($75.00); `FEE - Finance Charge (Account)` $608.21; `Sales Tax` $0.80) |

Row order: (1) `Services`; (2) production adjustment codes (`ADJ OFF - Courtesy Discount`, `AUTO - Insurance
Adjustment(P)`, `FEE - Finance Charge (Account)`, `FEE - Late Charge`, ...); (3) collection adjustment codes (`Balance
Moved to Contract`, `Periodic Contract Billing`, `REFUND - Patient`, `REV PMT - Non-sufficient funds`, `Sales Tax`,
`TRANSFER - Payment From`, ...); (4) payment codes (`PMT PAT-Cash`, `PMT INS - Check`, ...). Within a section the sample
order looks alphabetical [I]. Every configured code prints even at $0.00 (a single-office sample runs to 5 pages). A
grand-total row is likely on the last page but not visible in the published pages [unverified]. Footer: `From`, `Thru`,
`Office`.

Signs and format: `$` and parentheses for negatives (`format.negative = parentheses`, `symbol = $`); payments negative.
Kept. Deliberate addition: a `Total` row per office (sum of each column), marked [I] in the definition description until
confirmed.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT = PDF (default) | `output_format = pdf`: preview on screen, PDF rendered from the snapshot |
| PRINT FORMAT = Excel | `output_format = xlsx`: flat typed sheet from the same snapshot (rows unchanged) |
| OFFICE/GROUP = Office (default) + picker `108` | One section per resolved office; legs filtered on the transaction office `rpt_ledger_entries.office_id` |
| OFFICE/GROUP = Office Group + picker | Every office of the group, one section each (no consolidated section unless family open question 1 says so) |
| Start Date / End Date (default today / today) | Legs with `transaction_date` in the inclusive range; code rows without legs print 0.00 |

No dependency rules on this screen. No provider control: `provider_ids` is not offered and no provider restriction applies.
Legacy actions as the family.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset | `today` | `last_month` / `month_to_date` for the month-end adjustment review |
| `hide_zero_rows` | `boolean` (NEW key, owner: this catalog) | `false` | Drops code rows whose four amounts are 0.00 (the legacy prints them); the criteria echo prints `* Zero rows hidden.` |
| `code_sections` | `enum_multi` `services`, `production_adjustments`, `collection_adjustments`, `payments` (NEW key; `min_items` 1, `full_selection = no_predicate`) | all ticked | Prints only the chosen sections; `Total` row then labelled `Total (selected sections)` |
| `include_office_total_section` | `boolean` (NEW key) | `false` | Adds one consolidated section over all resolved offices |
| `compare_to` | shared (filter card 12) | `none` | Adds `Prior A. R. Impact` and `Change` per code row. P4 |
| `output_format = csv` | shared | - | CSV of the code rows |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (live), `rpt_transaction_code_dim`, `rpt_office_dim` |
| Date basis | `transaction_date` fixed (inferred from the day-sheet family, PD-8); charges equal their service date until DATA-13 |
| Office | transaction office `rpt_ledger_entries.office_id`; NULL = `Unassigned office` section (organisation callers only) |
| Provider | none |
| Row skeleton | per office: one `Services` row, plus one row per code of `rpt_transaction_code_dim` (`code_kind` `adjustment` / `payment`, `is_active` or used in the range, version valid on `date_to`), plus system rows that occur in the range (`unclassified` for migrated adjustments, migrated tender aliases), plus a row per procedure code of class `non_production_charge` used in the range (contract billing) |
| Section of a row | `services`: `entry_type = 'charge' AND journal_column = 'charges'`; `production_adjustments`: `entry_type <> 'charge' AND journal_column = 'charges'`; `collection_adjustments`: `journal_column = 'adjust'` (collection Sub Type, unknown Sub Type, transfers, opening rows, refunds, contract-billing charges); `payments`: `journal_column = 'payment'` |
| Amount columns | `production` = `Σ amount` for rows of sections services / production_adjustments, NULL (`--`) otherwise; `collections` = `Σ amount` of payment rows; `adjustments` = `Σ amount` of collection-adjustment rows; `ar_impact` = `Σ amount` of every row (A/R movement) |
| Joins | legs to codes on `code` through `LATERAL ... ORDER BY valid_from DESC LIMIT 1` (no multiplication, R-01); zero rows by `LEFT JOIN` from the skeleton |
| Availability | READY (coverage matrix row 14). One row per code on history: REPAIR(12) - until DATA-12 every migrated adjustment prints on `Unclassified adjustment (migrated)` in the collection section and migrated payments on their tender alias rows (`availability[]` `unclassified_adjustments`); code catalog DATA-03; completeness of migrated charges DATA-57 |
| Cannot be produced | per-code adjustment split for migrated history before DATA-12; a frozen day sheet of a past range before DATA-29 |

### Output

One format `standard`, block `codes` (table, main), grouping `fixed_outer` office (`Office : {office_name}`, subtotal row
`Total`, `page_break_allowed`), inner level `code_section` (no header printed, legacy has none; section order fixed).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `type_label` | Type | text (right-aligned for code rows) | `aggregate` | label `Total` |
| `production` | Production | money (`$`, parentheses, `null_display = --`) | `financial_practice` | sum |
| `collections` | Collections | money (same format) | `financial_practice` | sum |
| `adjustments` | Adjustments | money (same format) | `financial_practice` | sum |
| `ar_impact` | A. R. Impact | money (same format) | `financial_practice` | sum (= office ledger movement of the range) |
| `prior_ar_impact`, `ar_impact_change` | Prior A. R. Impact, Change | money | `financial_practice` | sum; `visible_when` `["ne", "compare_to", "none"]` |
| hidden: `row_id` (`<office>:<section>:<code>`), `code`, `code_kind`, `code_section`, `section_order`, `legacy_sub_type`, `is_system_row` | | | `aggregate` | |

Sort: `default_sort` = `section_order`, then `type_label` (case-insensitive), then `code`. Page break: office (always
a new page per office in PDF, as the samples). Summary cards per office: `production` total, `collections` total,
`adjustments` total, `ar_impact` total. `reconciles_with`: `ar_impact` total = `Σ rpt_ledger_entries.amount` of office and
range (R-14b roll-forward); `production` total = `Σ amount [journal_column = 'charges']` of office and range, which
excludes contract billing (`non_production_charges` print in Adjustments) - an identity test added to RPT-MONTHLY-15.
`empty_when`: `total_is_zero` on `ar_impact` and `production`.

### Visuals and drill-through

Chart: horizontal bar of the ten largest absolute `adjustments` and `production` adjustment rows (`top_n = 10`), to show
which adjustment codes drive the month. Drill:

| Click | Target | Parameters passed |
|---|---|---|
| `Services` row | `daily.production_report` | office, `date_from` / `date_to` |
| Adjustment or payment code row | `daily.special_transaction_report` | office, range, payment / adjustment code = clicked `code` |
| Office `Total` of `ar_impact` | `daily.daily_journal` | office, range (the lines behind the movement) |

### Actions

None (aggregate report). Not a worklist. Hub actions: schedule (e.g. monthly on the 1st with `last_month`), save view.

### Export and print

PDF: layout `day_sheet` (ENG-24) in its code-row variant (RPT-MONTHLY-05), portrait, `$` and parentheses, `--` for empty
cells, header `Executive Day Sheet` / `Office :`, footer echo `From`, `Thru`, `Office`, `Printed :`, `By :`, `Page : n
of m`, new page per office, `Total` row at the end of each office. XLSX: one sheet `Day Sheet` with columns `office`,
`section`, `code`, `type`, `production`, `collections`, `adjustments`, `ar_impact` (typed money, no `--` text: empty cells
are blank), a `Criteria` sheet. CSV: the same flat table.

### Open questions

| # | Question |
|---|---|
| 1 | Is there a grand-total row on the last page, per office or over all offices |
| 2 | Row order inside a section (alphabetical, code order or setup order) |
| 3 | Are inactive codes printed at 0.00, or only active ones; are codes of other offices' setups printed |
| 4 | Where contract billing (`Periodic Contract Billing`) prints when it is a procedure posting: our rule follows `journal_column` (Adjust) |
| 5 | Date basis: transaction date assumed (no basis control on the screen) |

## Aging Report by Home Office - `monthly.aging_report_by_home_office`

Monthly Reports, screenshot `3.PNG` (criteria row SORT BY clipped; completed from vendor screenshots) - P2 - L - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (background for more than 5 offices, an office group, `all`, or a row estimate above 20,000 accounts) - DOCUMENTED (Detail, PDF and Excel); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED

### Purpose

Front office and billing staff for collection calls (daily / weekly), management for the A/R snapshot at month end and
year end, and the reference when a statement looks wrong (compare the balance on this report, on Aging Report and on the
ledger). It lists accounts receivable by responsible party, split into estimated insurance and estimated patient
portions, aged into buckets, for the responsible parties whose **home office** is selected - every transaction of the
account counts wherever it was recorded. The vendor's recommended ageing for multi-location organisations, because it
avoids the false debit and credit pairs of the transaction-office view.

### Legacy output

Confidence: Detail DOCUMENTED (2019 PDF sample, 2023 Excel sample, 2025 footer); Summary and GROUP BY PROVIDER layouts
PARTIALLY DOCUMENTED.

Titles: `Aging by Home Office` (2019 build), `Aging Report by Home Office - Detail` (Excel 2023). Header: organisation,
title, `Office : <office>` band.

Detail, PDF: one three-line block per responsible party, separated by a dashed rule.

| Column (as printed) | Content |
|---|---|
| `Resp Party` > `ID`, `Name` | responsible-party id, `Last, First` |
| `Type` | responsible-party type code (demo `CA`, `IN`, `AA`, `OO`) |
| `Lst Pay Date` / `Lst Pay Amount` (2025: one stacked `Lst Pay Dt/ Amt.`) | last payment date and amount |
| `Lst Stmt Date` | last statement date |
| (row tag) | blank = total, `Ins:`, `Pat:` |
| `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120` | balance per bucket |
| `Total Bal.` | row total |

Line 1 = identity + account totals; line 2 = phones `(H):`, `(C):` and the `Ins:` amounts; line 3 = the `Pat:` amounts
(2025 build: line 2 starts with `Type : <code>` and the last-payment amount, line 3 with the phone). Totals on the last
page: `Total Accounts with A/R : <n>`, then `Total :`, `Ins:`, `Pat:` rows across all buckets. Footer: `Report Date`,
`Start Name` / `End Name`, `Patient Type`, `Offices`, `Provider : N/A` (not grouped), `Ex Resp Party Type : NONE`,
`Aging : Current Over30 Over60 Over90 Over120`, `Account Balance Over : 0.00`, `* Includes accounts with Credit
Balances.` when ticked.

Detail, Excel: flat sheet, first column `Office`, then per bucket the triple `<bucket>`, `<bucket> Est. Ins`,
`<bucket> Est. Pat`; with `Over 120+` the triples `Over 120`, `Over 150`, `Over 180`, `Over 270`, `Over 365`.

Summary [D purpose, I layout]: the A/R snapshot of each selected office - one total / `Ins:` / `Pat:` block by bucket per
office without account lines. GROUP BY PROVIDER [I]: account blocks grouped and subtotalled by provider.

Signs: leading minus, no currency symbol; credit balances negative in `Total Bal.`. Quirks kept: only responsible parties
appear (their ids differ from patient ids); the `Ins:` estimate is not the Outstanding Claims total (secondary insurance
and claims not yet created are included). Bucket edges: legacy set (Current 0-29, Over 30 30-59, Over 60 60-89, Over 90
90-119, Over 120 120+), printed in the echo; the 0-30 glossary variant is family open question 3.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT = Detail (default) | Block `accounts`: one account block per responsible party, office totals, `Total Accounts with A/R` |
| REPORT FORMAT = Summary | Block `office_summary`: per office (and per provider when grouped) the total / Ins / Pat rows by bucket and the account count; no account rows |
| PRINT FORMAT = PDF (default) | PDF; `aging_buckets` shows `over_120` |
| PRINT FORMAT = Excel | `output_format = xlsx` (role `query`): `over_120` is replaced by `over_120_plus` (ticked state carried over), the run is re-validated and re-run, the xlsx adds the extended triples |
| OFFICE/GROUP = Office (default) + picker `108` | Accounts whose `rpt_account_dim.home_office_id` is selected; all their open items, any office |
| OFFICE/GROUP = Office Group + picker | Home offices of the group, one `Office :` section each |
| GROUP BY PROVIDER unticked (default) | `group_by = none`; footer `Provider : N/A`; provider basis and picker greyed |
| GROUP BY PROVIDER ticked | `group_by = provider`: open items grouped by the provider of `provider_basis`; an account whose items belong to two providers appears under both with its share [I]; provider subtotal rows |
| Preferred Provider (default, greyed until grouped) | provider of an item = `rpt_patient_dim.preferred_provider_id` of the item's patient, fallback `rpt_patient_activity.last_visit_provider_id`, else `Unassigned provider` |
| Transaction Provider | provider of an item = `rpt_ar_open_items.provider_id` (the provider on the open debit; credits: provider on the credit leg) |
| Provider = ALL (default, greyed until grouped) | no provider predicate |
| Provider = list | only items whose provider (per basis) is selected; account totals recomputed over those items [I] |
| Report Date (default today) | `p_as_of = report_date`: balances and ages at the end of that office-local day |
| PATIENT TYPE = Both (default) / General / Ortho | item filter on `rpt_patient_dim.is_ortho_patient` of the item's patient (`general` = false, `ortho` = true) before account totals [I]; echoed |
| Start Name `AAAAA` / End Name `ZZZZZ` (+ SEARCH) | inclusive range on the guarantor sort name, prefix rule (a bound without comma compares the last name); sentinels add no predicate; SEARCH superseded by the lookup icon |
| EXCLUDE RESP. PARTY TYPE = None (default) / list | `rpt_account_dim.resp_party_type NOT IN (...)`; accounts without a type kept; echoed `Ex Resp Party Type` |
| AGING BY = Account AR (default) | measure = insurance + patient (`open_amount`); threshold compares the account total |
| AGING BY = Patient AR | measure = `open_patient` only, and only items of patients whose own `rpt_patient_dim.home_office_id` is selected [I]; accounts with only an insurance balance drop out; the threshold label becomes `Patient Balance Over` |
| Account Balance Over `0.00` | account measure total `>` value (applies to debit accounts; see the credit rule below) |
| SHOW ONLY CREDIT BALANCES unticked (default) / ticked | ticked: only accounts with total `< 0`; overrides Include Credit Balance |
| Current / Over 30 / Over 60 / Over 90 / Over 120 (all ticked) | account filter: a debit account is listed when it has an open debit in at least one ticked bucket (`predicate` even when all ticked); printed columns are always all five |
| Over 120+ (Excel only, default not documented; candidate ticked) | as `over_120` for the filter (open debit aged 120+); adds the extended bucket columns over_120 / over_150 / over_180 / over_270 / over_365 with Est. Ins / Est. Pat |
| Include Credit Balance unticked (default) | accounts with total `< 0` are left out (grand total higher than real A/R) |
| Include Credit Balance ticked | accounts with total `< 0` are listed and counted; footer `* Includes accounts with Credit Balances.` |
| Exclude patients sent to collection. | ticked: accounts with `rpt_account_dim.send_collections` dropped |
| Exclude accounts where patient portion is paid & insurance portion is expected. | ticked: accounts with patient total `<= 0` and insurance total `> 0` dropped |
| Include Balance Status | layout: adds `Bal. Status` (code + description) to line 1 of the block (DATA-35) |
| Include Contract Balances | layout: adds `Reg Cont. Bal.` and `Ort Cont. Bal.` (names inferred from the Walkout Report) to line 1 |
| SORT BY = Resp. Party Last name (default) / Resp. Party ID | order of accounts inside each office (and provider): last name, first name, `account_id` / legacy responsible-party id |

Dependency rules: `provider_basis` and `provider_ids` `enabled_when` `["eq", "group_by", "provider"]` (inferred; disabled
values `preferred_provider`, `all`); `aging_buckets` option `over_120` `visible_when` `["ne", "output_format", "xlsx"]`,
option `over_120_plus` `visible_when` `["eq", "output_format", "xlsx"]` (rule d01); `account_balance_over` label
`Patient Balance Over` when `["eq", "aging_by", "patient_ar"]` (rule d02); `include_credit_balances` ignored while
`only_credit_balances` is true. Credit rule (proposal, see Open questions 1): the threshold and the bucket predicate apply
to accounts with total `> 0`; accounts with total `< 0` are governed only by the two credit options; accounts with total
`= 0` are never listed.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `report_date` tokens | `date` | `today` | `end_of_last_month` for the month-end snapshot in schedules and saved views |
| `min_age_days` | `integer` (NEW key, owner: this catalog) | `0` | Lists only accounts whose oldest open debit is at least n days old (collection call list "over 60 and nothing paid") |
| `last_payment_before` | `date` (NEW key) | blank (no predicate) | Accounts whose last payment is before the date or that never paid |
| `exclude_accounts_with_payment_plan` | `boolean` (NEW key) | `false` | Drops accounts with an active regular or ortho contract (`rpt_payment_plan_contracts.is_active`) |
| `exclude_accounts_with_future_appointment` | `boolean` (NEW key) | `false` | Drops accounts where a member holds a future appointment (`rpt_patient_activity.next_appointment_date`), to focus calls on patients not coming in |
| `aging_bucket_set` | `enum` `legacy`, `common` (NEW key; sets of `rpt_aging_bucket_sets`) | `legacy` | `common` (31-60 / 61-90 / 91+) for dashboards comparison; echoed |
| `office_scope` `my_offices` | shared | `working_office` | Regional run |
| `compare_report_date` | `date` (NEW key) | blank | Summary format only: adds the bucket totals as of the second date and the change (month-over-month A/R movement) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ar_open_items(tenant, NULL, report_date, 'account')`, `rpt_aging_bucket_sets`, `rpt_account_dim`, `rpt_patient_dim`, `rpt_patient_activity`, `rpt_ledger_entries` (last payment for a past date), `rpt_payment_plan_contracts` (contract balances), `rpt_provider_dim`, `rpt_office_dim` |
| Date basis | none; `report_date` role `as_of`; ages from `age_date` (procedure completed) to `report_date` |
| Office | home office `rpt_account_dim.home_office_id` (`scope.office_attribution = home_office`); NULL = `Unassigned office`. Items of any transaction office count |
| Provider | `provider_basis` (above); default run has no provider attribution |
| Account aggregates | per `account_id`: `total = Σ open_amount` (debits and unallocated credits), `ins_total = Σ open_insurance_est`, `pat_total = Σ open_patient`; per bucket `Σ` over open debits with `age_days` inside the bucket (credits are never inside a bucket) |
| Credits in the three lines | an unallocated credit enters `Total Bal.` and the `Pat:` total (patient payer) or the `Ins:` total (insurance payer) [I]; buckets show debits only |
| Identity columns | `responsible_party_id` = `rpt_account_dim.legacy_key` (Denticon `RPID`) else `account_no`; name `guarantor_last_name`, `guarantor_first_name`; phones from `rpt_account_dim`; `resp_party_type` (DATA-53) |
| Last payment | `report_date = today`: `max(rpt_patient_activity.last_patient_payment_date)` over account members and the amount of that row (data card 2.19); past date: latest `rpt_ledger_entries` leg `entry_type = 'patient_payment'` with `transaction_date <= report_date`, legs of the same day summed |
| Last statement date | `rpt_account_dim.last_statement_date` (DATA-22); empty before it |
| Balance status | `rpt_account_dim.balance_status_code` + definitions label (DATA-35) |
| Contract balances | `Σ pat_amount_remaining` of active `rpt_payment_plan_contracts` of the members, split `contract_kind` regular / ortho (DATA-37); app era only |
| Parameter application | office, name range, resp-party type, sent to collection: account predicates; patient type, provider, Patient AR office rule: item predicates before aggregation; threshold, buckets, credit options, insurance-expected: account predicates after aggregation |
| Availability | READY (coverage matrix row 15). Derived oldest-first allocation; Ins / Pat split and names on history REPAIR(10) (`split_quality` footnote when not `exact`); Exclude Resp. Party Type SCHEMA(53); Balance Status SCHEMA(35); Last Statement Date SCHEMA(22); past report date reproduces only with SCHEMA(30); migrated A/R completeness REPAIR(57); tenant-wide FIFO DATA-27 |
| Cannot be produced | an exact past ageing before snapshots (recomputed from today's rows, `availability[]` `as_of_recomputed`); preferred provider for migrated patients (fallback only); contract balances of migrated contracts (none migrated); the account as it was before a guarantor change |

### Output

Format `detail`, block `accounts` (table, main). Grouping `fixed_outer` office (`Office : {office_name}`, subtotal rows
`Total :` / `Ins:` / `Pat:` and `Total Accounts with A/R : {count}`), option `group_by = provider` adds level provider
(`Provider : {provider_short_id} - {provider_name}`, same subtotal rows). Grand total over all offices when the run
resolves to more than one office [I]. One row per account (per account and provider when grouped); the PDF renders it as
the three-line block.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `responsible_party_id` | Resp Party ID | text | `phi_identified` (key) | count_distinct `account_id` -> `Total Accounts with A/R` |
| `responsible_party_name` | Name | text `Last, First` | `phi_identified` (key) | label |
| `resp_party_type` | Type | text | `phi_identified` | none |
| `phone_home`, `phone_cell` | (H):, (C): | text | `phi_identified` | none |
| `last_payment_date` | Lst Pay Date | date | `phi_identified` | none |
| `last_payment_amount` | Lst Pay Amount | money | `financial_patient` | none |
| `last_statement_date` | Lst Stmt Date | date | `phi_identified` | none |
| `balance_status` | Bal. Status | text | `phi_identified` | none; `visible_when` `["truthy", "include_balance_status"]` |
| `reg_contract_balance`, `ortho_contract_balance` | Reg Cont. Bal., Ort Cont. Bal. | money | `financial_patient` | sum; `visible_when` `["truthy", "include_contract_balances"]` |
| `bucket_current` ... `bucket_over_120` | Current, Over 30, Over 60, Over 90, Over 120 | money | `financial_patient` | sum |
| `total_balance` | Total Bal. | money | `financial_patient` | sum |
| `ins_current` ... `ins_over_120`, `ins_total` | Ins: per bucket, total | money | `financial_patient` | sum |
| `pat_current` ... `pat_over_120`, `pat_total` | Pat: per bucket, total | money | `financial_patient` | sum |
| `over_150`, `over_180`, `over_270`, `over_365` (+ `ins_` / `pat_` twins) | Over 150 ... Over 365, Est. Ins, Est. Pat | money | `financial_patient` | sum; `visible_when` `["in", "aging_buckets", ["over_120_plus"]]`; `export` xlsx and screen only |
| `split_quality_note` | (footnote) | text | `aggregate` | none |
| hidden: `account_id` (row id with provider key), `office_id`, `provider_id`, `sort_last_name`, `sort_first_name`, `guarantor_patient_id` | | | entity classes (rule 6) | |

Format `summary`, block `office_summary` (table): one row per office (per office and provider when grouped) and portion
(`portion` = `Total`, `Ins:`, `Pat:`): `office_name` (`aggregate`), `provider_name` (`provider_comp` when grouped),
`portion`, five bucket columns, `total_balance` (all `financial_practice`), `account_count` (`aggregate`); grand total
rows; `compare_*` columns when `compare_report_date` is set.

Sort: `sort_by` `responsible_party_last_name` (keys `sort_last_name`, `sort_first_name`, `account_id`) /
`responsible_party_id` (`responsible_party_id`, `account_id`); `row_id_column` `account_id` (+ `provider_id`). Page break:
office (PDF new page per office). Summary cards: `total_balance`, `ins_total`, `pat_total`, `account_count`, `bucket_over_90
+ bucket_over_120` share. `reconciles_with`: grand `total_balance` with credits included = metric `total_ar`
(`ar_office_attribution = home_office`) as of `report_date` (R-05). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Chart: stacked bar of the five bucket totals per office (Summary and Detail header), split Ins / Pat; second chart donut
of `ins_total` versus `pat_total`. Drill:

| Click | Target | Parameters passed |
|---|---|---|
| Account row / name | `ledger.ledger_report` | `report_type = account_ledger`, `account_id`, `date_preset = trailing_12_months` (needs `phi_identified`) |
| Bucket cell of an account | `ledger.account_allocation` | `account_id`, `date_to = report_date` (the open items behind the bucket) |
| Office or provider bucket subtotal (Summary) | same report, `kind = rows` | `report_format = detail`, office, provider, `aging_buckets = [clicked bucket]` |
| `Total Bal.` of a credit account | `worklists.unallocated_credits` | `account_id` |
| Account count | same report, `kind = rows` | `report_format = detail` |

### Actions

The Detail format doubles as the collection worklist (hand-off target of `worklists.patient_ar`).

| Action | Scope / kind | Detail |
|---|---|---|
| Open account ledger | row, `navigate` -> `patient_account_ledger` | right of the ledger screen; `phi_identified` |
| Open guarantor patient | row, `navigate` -> `patient_overview` | when the guarantor is a patient |
| Collection letter | bulk, `letters` | hand-off of the selected accounts to the letters batch (PD-15); excludes `no_correspondence` |
| Balance reminder text | bulk, `send_sms` | `requires: sms_consent`; exclusions counted (`no_auto_sms`, `sms_opt_out_at`) |
| Balance reminder e-mail | bulk, `send_email` | `no_auto_email` excluded; no amounts in the message body unless the template allows (08) |
| Follow-up task | bulk, `create_task` | one task per account to a chosen user ("collection call") |
| Send statements | bulk, `navigate` -> `statements` with the selected accounts | statement run of the Statements screen |
| Export selection | bulk, `export_selection` | needs `reports_export_data_files` |

### Export and print

PDF: layout `aging_block` (NEW renderer key: three-line account block with dashed rule, row tags `Ins:` / `Pat:`, phones on
line 2), landscape, letterhead, repeating column header, office totals and `Total Accounts with A/R` at office end, footer
criteria echo exactly as the legacy list (Report Date, Start / End Name, Patient Type, Offices, Provider, Ex Resp Party
Type, Aging, Account / Patient Balance Over, credit flag). Summary: `banded_table`. XLSX: Detail one flat sheet with
`Office` first, identity columns, then per bucket the triple `<bucket>`, `<bucket> Est. Ins`, `<bucket> Est. Pat`
(extended triples with Over 120+), typed cells, frozen header, autofilter, no merged cells; Summary one sheet; `Criteria`
sheet. CSV: Detail flat as the xlsx. Background for tenant-wide runs (data card 2.13: tenant-wide FIFO is a background
job); the artifact is delivered by link.

### Open questions

| # | Question |
|---|---|
| 1 | How the threshold and the bucket boxes treat credit accounts when Include Credit Balance is ticked (proposal: they apply to debit accounts only) |
| 2 | Where an unapplied credit prints in the three lines (Total only, `Pat:` / `Ins:`, or a bucket) |
| 3 | AGING BY = Patient AR: does "only the patient balances for this office" mean the patient's own home office (our reading) or the account's |
| 4 | Provider filter: whole accounts or only the provider's items (family 5); Preferred Provider of a multi-patient account |
| 5 | Summary and GROUP BY PROVIDER layouts (family 6); grand total over offices |
| 6 | `Over 120+` default state and info-icon text (family 4); bucket boundary day (family 3) |
| 7 | PATIENT TYPE: item-level (our rule) or account-level filter |
| 8 | Last payment: patient payments only (our rule, data card) or any payer; position of Balance Status and contract balances on the page |
| 9 | Content of the EXCLUDE RESP. PARTY TYPE dialog (never captured) |

## Aging Report - `monthly.aging_report`

Monthly Reports, screenshot `4.PNG` (criteria panel pixel-identical to `3.PNG`, SORT BY clipped) - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (background as Aging Report by Home Office) - DOCUMENTED (Detail); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED

### Purpose

The single-location ageing: the same responsible-party / insurance / patient / bucket layout as
`monthly.aging_report_by_home_office`, but it evaluates **only the transactions recorded in each selected office** -
A/R by transaction office. Recommended by the vendor for single-location practices (daily / weekly collection work,
`Aging Report - Detail` with Include Balance Status; `Aging Report - Summary` with Include Credit Balance for the
real A/R); explicitly not recommended for multi-location organisations. In DentC it is also the per-office A/R that the
Executive Day Sheet and the Executive Summary roll forward (R-14b) and the drill target of the A/R dashboard tiles.

### Legacy output

Confidence: Detail DOCUMENTED (2019 and 2025 samples); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED. Printed titles
`Aging Detail` (2019), `Aging Report - Detail` (2025); Summary title `Aging Report - Summary` [I from the old menu name].

Columns, three-line block, totals (`Total Accounts with A/R : n`, `Total :` / `Ins:` / `Pat:`) and footer echo are
identical to Aging Report by Home Office (section above). Differences:

| Topic | Aging Report | Aging Report by Home Office |
|---|---|---|
| Transactions considered | only those recorded at the selected office | all transactions of the account |
| Account listed under | each selected office where its office balance is non-zero | its home office only |
| Vendor example: charge 100 at A, payment 100 at B | A shows 100 due; B shows a 100 credit (with Include Credit Balance) although the ledger is 0 | account not listed |
| Sum across all offices | organisation A/R only with credit balances included | organisation A/R |

Quirks kept: accounts with a 0.00 ledger balance appear in multi-location organisations (debit at one office, credit at
another); the default run excludes credit balances, so the default total is above the real A/R and does not equal the
Executive Summary A/R block (which nets credits); Account AR can pull balances of dependants who belong to another
office.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r04 -->

Every option has the effect described for `monthly.aging_report_by_home_office` with the office unit `account_office`
(open items computed per account **and** transaction office, `rpt_ar_open_items.unit_office_id`). The options whose
effect differs:

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT = Detail (default) / Summary | Detail: one block per account per office where the account's office balance is non-zero; Summary: per office the total / Ins / Pat bucket rows and the account count |
| PRINT FORMAT = PDF (default) / Excel | as the home-office report; Excel shows Over 120+ in place of Over 120 (rule d01, inferred for this report from the identical panel) and re-runs |
| OFFICE/GROUP = Office (default) + picker `108` / Office Group | transaction offices: only legs with `office_id` in the selection are allocated and aged against each other; one `Office :` section per office |
| GROUP BY PROVIDER / Preferred Provider / Transaction Provider / Provider picker | as the home-office report, inside each office section; Transaction Provider = provider of the open item of that office |
| Report Date (default today) | as of the end of that day, per office unit |
| PATIENT TYPE Both / General / Ortho | item filter on the patient of the office-unit item |
| Start Name / End Name (+ SEARCH), EXCLUDE RESP. PARTY TYPE | account predicates, as the home-office report |
| AGING BY = Account AR (default) | measure `open_amount` of the account's items in that office (all members, so dependants of another home office count) |
| AGING BY = Patient AR | measure `open_patient` of the account's items in that office; accounts with only an insurance balance in that office drop out; label `Patient Balance Over` (rule d02) |
| Account Balance Over `0.00` | office-level account total `>` value |
| SHOW ONLY CREDIT BALANCES | only (account, office) pairs with office total `< 0` - the false credits of cross-office payments appear here |
| Current ... Over 120 (all ticked), Over 120+ (Excel) | (account, office) pairs with an open debit of that office in a ticked bucket |
| Include Credit Balance unticked (default) / ticked | (account, office) pairs with office total `< 0` left out / listed; only ticked does the sum over all offices equal organisation A/R |
| Exclude patients sent to collection., Exclude accounts where patient portion is paid & insurance portion is expected. | as the home-office report, tested on the office-level totals (insurance-expected) and the account flag (collection) |
| Include Balance Status | account-level status printed on each office line of the account |
| Include Contract Balances | account-level contract balances printed on each office line of the account (not split by office) |
| SORT BY = Resp. Party Last name (default) / Resp. Party ID | inside each office (and provider) |

Dependency rules: identical to the home-office report (`provider_basis` / `provider_ids` `enabled_when` `["eq",
"group_by", "provider"]`; d01 option visibility on `output_format` with `role: query`; d02 label rule; credit rule as
proposed there).

### Parameters - enhancements

The enhancement keys of `monthly.aging_report_by_home_office` (`min_age_days`, `last_payment_before`,
`exclude_accounts_with_payment_plan`, `exclude_accounts_with_future_appointment`, `aging_bucket_set`,
`compare_report_date`, `report_date` tokens), with the same defaults, plus:

| Key | Type | Default | Effect |
|---|---|---|---|
| `only_cross_office_accounts` | `boolean` (NEW key, owner: this catalog) | `false` | Lists only accounts that carry a non-zero balance in two or more of the resolved offices (the false debit / credit pairs to clean up by a transfer); needs `all` or several offices |
| `show_account_ledger_balance` | `boolean` (NEW key) | `false` | Adds column `Acct. Bal.` (the account's balance over all offices, unit `account`) beside the office `Total Bal.`, so a 0.00 account with an office debit is visible at a glance |

### Data

| Item | Rule |
|---|---|
| Datasets | as the home-office report, with `rpt_ar_open_items(tenant, NULL, report_date, 'account_office')`; `show_account_ledger_balance` also calls unit `account` for the listed accounts |
| Office | transaction office `rpt_ar_open_items.unit_office_id` (`scope.office_attribution = transaction_office`); a real allocation link is kept only when both legs sit in the same office; NULL office = `Unassigned office` (migrated payments of unknown office: a credit there) |
| Provider, last payment, statement date, balance status, contract balances | as the home-office report (last payment and contract balances are account-level, not per office [I]) |
| Ties to | per-office ledger balance `Σ rpt_ledger_entries.amount GROUP BY office_id` as of `report_date` when credits are included (R-14b) |
| Availability | READY (coverage matrix row 16), with the same option ratings as the home-office report: SCHEMA(53) resp. party type, SCHEMA(35) balance status, SCHEMA(22) last statement date, SCHEMA(30) past report date, REPAIR(10) split and names on history, REPAIR(57) completeness; tenant-wide runs DATA-27 |
| Cannot be produced | as the home-office report; in addition the legacy per-office allocation of migrated history is derived (oldest first inside each office), so a migrated account can show a different office split than Denticon printed |

### Output

Same blocks, columns, data classes, sort options and totals as `monthly.aging_report_by_home_office` (block `accounts` for
Detail, `office_summary` for Summary), with these changes:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_ledger_balance` | Acct. Bal. | money | `financial_patient` | none (an account can repeat across offices); `visible_when` `["truthy", "show_account_ledger_balance"]` |
| `other_office_count` | Other Offices | integer | `aggregate` | none; `visible_when` `["truthy", "only_cross_office_accounts"]` |
| hidden `row_id` | | id | `phi_identified` | `<account_id>:<unit_office_id>[:<provider_id>]` |

Grouping `fixed_outer` office = `unit_office_id`. Grand total across offices is the sum of the office totals (with credits
included it equals organisation A/R). `reconciles_with`: office `total_balance` with credits included = metric `total_ar`
(`ar_office_attribution = transaction_office`) of that office as of `report_date`; also equals the Executive Summary
`total_ar` of a single-day run (RPT-MONTHLY-08). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Charts as the home-office report (bucket stack per office). Drill as the home-office report, plus: an account row with
`only_cross_office_accounts` -> `monthly.aging_report_by_home_office` with `account_id` filter through `param_map`
(`responsible_party_name_from` / `_to` = the account's sort name) to show the netted view; Summary office total ->
`monthly.executive_day_sheet` with the office and `date_preset = month_to_date` (the movement behind the balance).
A/R dashboard tiles drill here with `report_date` and `aging_buckets` (06 drill table).

### Actions

Same row and bulk actions as the home-office report (open account ledger, collection letter, SMS, e-mail, task, statements,
export selection). Additional row action `Transfer balance between offices` (`navigate` -> `patient_account_ledger` with
the transfer dialog preselected) for cross-office pairs; offered only with `only_cross_office_accounts` and the ledger
Full Control right. Doubles as a worklist as the home-office report.

### Export and print

As the home-office report: PDF `aging_block` landscape with the legacy footer echo and title `Aging Report - Detail` /
`Aging Report - Summary` (`title_templates` by `report_format`), new page per office; XLSX flat with `Office` first and the
bucket triples (extended with Over 120+); CSV flat; background for tenant-wide runs. The added columns export to all three
formats.

### Open questions

| # | Question |
|---|---|
| 1 | Does Over 120+ exist on this report with PRINT FORMAT = Excel (rule d01 inferred from the identical panel) |
| 2 | Are last payment, Balance Status and contract balances printed per office line or once per account |
| 3 | Credit rule, Patient AR meaning, provider filter and Summary layout: as open questions 1, 3, 4, 5 of the home-office report |
| 4 | Accounts with a 0.00 office balance but open debits and credits inside one office (parked remainders after DATA-26): listed or not |

<!-- WORK-ITEMS -->
| RPT-MONTHLY-10 | `monthly.executive_summary` definition: `kpi` key-value block with the 24 lines and their formulas, per-line office and provider columns, MTD / YTD, A/R block (unit `account_office`), Show AR flag, office `fixed_outer` level, criteria echo | P2 | L | RPT-MONTHLY-01, DATA-04, DATA-16, DATA-18, DATA-19, DATA-27, MET-05, MET-10, ENG-11 | On `golden_small` each line equals its metric (`visit_code_production`, `patients_seen`, `patient_visits`, `procedures_done`, `chair_hours`, `appointments_no_show`, `appointments_cancelled`); Patient + Insurance = Production; Dentist + Hygienist + Other = Total; MTD of a run ending on the 1st equals the range figure; Show AR total equals `monthly.aging_report` with credits included for the same single day |
| RPT-MONTHLY-11 | Executive Summary GROUP BY Provider: provider level, provider-attributed lines, office total block from office facts (not summed), Page Break as `page_break_by = group` | P2 | M | RPT-MONTHLY-10, DATA-18, ENG-23 | A patient-day seen by a dentist and a hygienist counts once in the office block and once under each provider; Page Break greyed while GROUP BY = None; ticking it re-renders without a new run |
| RPT-MONTHLY-12 | Executive Summary Referrals block: sources of first-visit new patients, production of those patients, legacy-id link for migrated patients, raw-text fallback for app patients, switch to `referral_source_id` after DATA-40 | P2 | S | RPT-MONTHLY-10, DATA-19, DATA-40 | Fixture with two sources: New Patients sum equals line 2 for patients with a source; production equals their charges plus production adjustments in the range; block omitted when empty |
| RPT-MONTHLY-13 | PDF renderer `executive_summary` (three-column key-value body, trailer tables, per-office and per-provider blocks) and XLSX sheets Summary / Referrals / MTD_YTD / AR | P2 | M | ENG-23, ENG-27, RPT-MONTHLY-10 | Side by side with the 2025 vendor sample every line, label and footer flag is present in order; the xlsx has no merged cells and typed money cells |
| RPT-MONTHLY-14 | Executive Summary enhancements: `include_office_total_block`, chart, drill targets of the KPI lines, comparison columns (`compare_to`, P4 part) | P2 | S | RPT-MONTHLY-10, ENG-30, FLT-26 | Total block ratios equal ratios of summed components; each drill returns a run whose total equals the clicked figure; `compare_to = none` leaves the served columns of the legacy layout unchanged |
| RPT-MONTHLY-15 | `monthly.executive_day_sheet` definition on the code-row renderer: office sections, section rules by `journal_column` and `entry_type`, zero rows from the code skeleton, unclassified migrated row, office `Total` row | P2 | M | RPT-MONTHLY-05, DATA-03, DATA-12, ENG-24 | Office `Total` of A. R. Impact equals the office ledger movement of the range; every active code prints at 0.00 on an empty day; a production adjustment prints in Production, a refund and contract billing in Adjustments; `$` and parentheses in PDF |
| RPT-MONTHLY-16 | Executive Day Sheet enhancements and outputs: `hide_zero_rows`, `code_sections`, `include_office_total_section`, top-10 adjustment chart, drills to Production / Special Transaction / Daily Journal, XLSX `Day Sheet` sheet | P2 | S | RPT-MONTHLY-15, ENG-27, ENG-30 | Default run equals the legacy row set; with `hide_zero_rows` only non-zero rows remain and the echo says so; a code-row drill lists legs summing to the row |
| RPT-MONTHLY-17 | `monthly.aging_report_by_home_office` definition on the shared ageing builder (unit `account`): home-office attribution, account aggregates, item-level patient-type / provider / Patient AR filters, account-level threshold / bucket / credit / insurance-expected / collection predicates, identity, last payment, statement date, balance status, contract balances | P2 | L | RPT-MONTHLY-02, RPT-MONTHLY-03, DATA-22, DATA-35, DATA-37, DATA-53, FLT-16 | Vendor example (charge 100 at A, payment 100 at B) lists no account; grand total with credits included equals organisation A/R (R-05); each legacy option toggled alone changes the row set as its parity row says on fixtures; the footer echo matches the legacy wording |
| RPT-MONTHLY-18 | Ageing Summary format and GROUP BY PROVIDER for both ageing reports: `office_summary` block, provider level with Preferred (fallback last-visit provider) and Transaction basis, provider subtotals, grand total, `compare_report_date` | P2 | M | RPT-MONTHLY-17, RPT-MONTHLY-02 | Summary bucket totals equal the Detail office totals for the same parameters; an account with items of two providers splits exactly between them; Provider picker greyed until GROUP BY PROVIDER |
| RPT-MONTHLY-19 | PDF renderer `aging_block` (three-line account block, dashed rule, Ins: / Pat: tags, phones, office totals, `Total Accounts with A/R`) and the flat Excel layout with bucket triples and the Over 120+ extension, for both ageing reports | P2 | M | ENG-23, ENG-27, RPT-MONTHLY-03, RPT-MONTHLY-17 | Side by side with the 2019 / 2025 PDF and 2023 Excel samples every column and footer item is present; Excel switch shows Over 120+ and the five extended triples; PDF never shows them |
| RPT-MONTHLY-20 | Ageing enhancement parameters for both ageing reports: `min_age_days`, `last_payment_before`, `exclude_accounts_with_payment_plan`, `exclude_accounts_with_future_appointment`, `aging_bucket_set` | P2 | S | RPT-MONTHLY-17, DATA-19, DATA-37 | Each key at its default leaves the parity run unchanged; each key alone removes exactly the fixture accounts it targets |
| RPT-MONTHLY-21 | Ageing worklist actions for both ageing reports: open account ledger, open guarantor patient, collection letter, SMS and e-mail reminders with consent exclusions, follow-up task, statement hand-off, export selection; `worklists.patient_ar` hand-off | P3 | M | ENG-49, RPT-MONTHLY-17, SEC-03 | Bulk SMS excludes accounts without consent and reports the count; entity ids come from the snapshot; every hand-off is audited with the patient manifest |
| RPT-MONTHLY-22 | `monthly.aging_report` definition (unit `account_office`): transaction-office attribution, per-office account blocks, cross-office credits, account-level fields repeated per office line, `only_cross_office_accounts`, `show_account_ledger_balance`, transfer row action | P2 | M | RPT-MONTHLY-02, RPT-MONTHLY-17, RPT-MONTHLY-18, RPT-MONTHLY-19 | Vendor example gives A = 100 and B = -100 with credits included and no B row by default; each office total with credits included equals its ledger balance (R-14b); `only_cross_office_accounts` lists exactly the fixture accounts with balances in two offices |
| RPT-MONTHLY-23 | Live legacy verification of reports 1-4: the open questions of this part (chair-hour unit, provider binding, GROUP BY layouts, day-sheet total row and order, credit rule, Patient AR meaning, Over 120+ on Aging Report, last payment payer) with owner and answer recorded in the parity decisions | P2 | S | FLT-23, RPT-MONTHLY-07 | Every open question of sections 1-4 has an answer or a recorded product decision; definitions with `[I]` items updated and `definition_version` bumped |
<!-- /WORK-ITEMS -->
