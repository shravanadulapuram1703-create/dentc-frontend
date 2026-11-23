## Claims List - `insurance.claims_list`

Insurance Reports, screenshot 1.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - DOCUMENTED (2011 sample `[R5]`; current layout not re-verified)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Insurance coordinator, billing staff | On demand; typically next morning for "claims generated yesterday" and at month end for the month | Audit what was billed in a period: every claim (or pre-authorisation) generated, with its estimate, what has come back and what is still expected |
| Treatment coordinator | Weekly | Track pre-authorisations sent in a period (`claim_kind = pre_authorization`) before booking the treatment |
| Office manager | Month end | Check that every claim generated in the month carries an estimate and a status; spot carriers with many claims still unpaid |

It is the "generated in a period" stage of the claim funnel (header, family structure); open receivables by age are
Outstanding Claims, unsent claims are Claims Created Not Sent.

### Legacy output

Confidence: **DOCUMENTED** from the vendor's 2011 sample `[R5]`; the current build was not re-captured.

| Element | Content | Evidence |
|---|---|---|
| Printed title | `Claims Listing` (pre-authorisation run: title not seen; we print `Claims Listing` with the sub-title `Pre-Authorizations`, proposal) | `[S]` |
| Header | Organisation name, title, `Office : <name>` band per office (family page furniture) | `[S]` |
| Carrier band | `Carrier : <name>   Ph : <phone>` | `[S]` |
| Columns, in order | 1 `Chart #` - 2 `Patient / Subscriber` (two names, slash-separated) - 3 `Patient - Subscriber DOB` (two dates) - 4 `Sub ID` - 5 `Claim #` - 6 `Claim Sent - DOS` (sent date and date of service) - 7 `Claim Amt` - 8 `Est. Ins` - 9 `Recv. Amt.` - 10 `Rem. Amt.` - 11 `Status` | `[S]` |
| Carrier subtotal | `Total for <carrier> [ n ] :` with `n` = claim count and sums of columns 7-10 | `[S]` |
| Grand total | Not visible on the sample page `[unverified]`; we print `Grand Total [ n ] :` (header: `grand_total.enabled = true` proposed) | - |
| Footer echo | `From`, `Thru`, `Pat From`, `Thru`, `Carrier`, `Provider`, `Claim Type : EP`, `Claim amt over`; then title, `Printed : <date time>`, `Page : n of m` | `[S]` |

Sign conventions: every money column prints positive (billed, estimated, received, remaining). `Rem. Amt.` equals
`Est. Ins - Recv. Amt.` on every sample row (a 100.00 claim with 0.00 estimate shows 0.00 remaining) `[I]`; we keep that
formula. `Status` prints the word of the legacy letter (`Sent` on every sample row).

| Quirk | Treatment |
|---|---|
| 2011 footer echoes `Provider : ALL` although the current screen has no provider picker | Not echoed (no parameter); a provider filter is offered as an enhancement and echoed only when it is not `all` |
| Demo rows show `ORTHO` in `Chart #` | Printed as stored; no meaning assumed |
| A secondary claim repeats the lines (and so the `Claim Amt`) of its primary claim | Kept on the row (legacy). **Deliberate fix:** subtotals and totals add a claim family's `Claim Amt` once (header money rule); the footer prints `Secondary claims not re-added : n` when it matters |
| `Claim Type : EP` in the footer is the sent-type echo (E = EClaim, P = Paper), not CLAIM TYPE | Kept verbatim; CLAIM TYPE is echoed as `Claim Category : Both / Dental / Medical` (our wording, open question 6) |

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| CLAIM/PRE-AUTH `Claims` (default) | `NOT is_preauth`: claims only |
| CLAIM/PRE-AUTH `Pre-Authorization` | `is_preauth`: pre-authorisations instead of claims (documented); `Recv. Amt.` is normally 0.00; sub-title `Pre-Authorizations`; never mixed with claims in one total |
| CLAIM TYPE `Both` (default) | No predicate on `category` |
| CLAIM TYPE `Dental` / `Medical` | `category = 'dental'` / `'medical'` (meaning inferred, family open question 3); `insurance_claims.claim_type` holds the tier on migrated rows, so `category` comes from the 03 normalisation |
| OFFICE/GROUP `Office` (default) + picker (default working office) | Claim office `rpt_claim_facts.office_id IN (:office_ids)`; one `Office : <name>` band per office |
| OFFICE/GROUP `Office Group` + picker (default ALL) | Every office of the chosen groups (or every office the caller may read); multi-office bands |
| DATE RANGE Start Date / End Date (default today / today) | Fixed basis `created_date`: claim generated (`created_at_utc` as office-local date, per-office UTC bounds, data card 4.3) between the two dates inclusive. Only rows with `created_at_reliable`: migrated claims have no created date and are never selected (APP) |
| NAME RANGE Start Name `AAAAA` / End Name `ZZZZZ` (defaults) | Patient sort name `LAST, FIRST`, prefix rule, open bounds add no predicate (filter card 3.4). Needs `phi_identified` |
| NAME RANGE `SEARCH` (two buttons) | Superseded by the lookup icon in each box (writes `Last, First`) |
| CLAIM AMOUNT OVER OR EQUAL TO (default 0.00) | `billed_amount >= :claim_amount_min`; at 0.00 every claim passes, including claims whose header total was zeroed by the recompute (data card 2.20) |
| CARRIER `ALL` (default) / a selection | No predicate / `carrier_id IN (...)` on the claim's carrier |
| CLAIM SENT TYPE `EClaim` + `Paper` both ticked (default) | No predicate (`full_selection: no_predicate`): unsent claims and claims without a recorded channel are kept |
| CLAIM SENT TYPE `EClaim` only / `Paper` only | `sent_method = 'eclaim'` / `'paper'`; claims without a channel (every unsent claim, every claim before DATA-21 unless the carrier default applies, coverage matrix #30) are dropped. Both unticked: 422 `min_items` |
| OTHER OPTIONS `Include Resolved Claims` unticked (default) | Claims: `status_class IN ('unsent', 'sent', 'partially_paid', 'denied')`. Pre-authorisations: `status_class IN ('unsent', 'sent')` (proposal, open question 1) |
| OTHER OPTIONS `Include Resolved Claims` ticked | Also `paid` and `closed` (pre-authorisations: also `closed`). `void` and `deleted` are never listed |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged (`role: output`); PDF banded layout or flat XLSX; `csv` added |

Dependency rules: none (no greyed control, no dynamic state documented).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_basis` | `enum` (shared 3.3) | `created_date` (legacy) | `created_date` / NEW value `sent_date` (`submitted_date`) / `service_date` (`service_from`). `sent_date` and `service_date` work on migrated history, so "claims sent last month" is answerable for any period | `sent_date` is NEW in the vocabulary of `04_filter_framework.md` 7.3; `service_date` on migrated claims needs the `claim_id` backfill (REPAIR(10)) |
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Claim provider: `treating_provider_id`, else `billing_provider_id` (header attribution) | Restores the filter the 2011 footer echoes; hidden in the echo while `all` |
| `coverage_orders` | `enum_multi` (shared 2.5) | all four ticked (no predicate) | `tier IN (...)`: list only primary or only secondary claims | Same members and semantics as Claims Not Created |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | Inside the carrier band: `patient_name` (sort name, then `claim_number`), `claim_number`, `created_date`, `claim_amount_desc` | Legacy row order inside a band not documented (open question 8) |
| Optional columns | column chooser | hidden | `Ty` (tier letter), `Created On`, `Created By`, `Days Since Sent`, `Outstanding` (`outstanding_amount`, net of write-offs) | Legacy columns unchanged when untouched |
| Saved view "Claims generated yesterday" | saved view | - | `date_preset = yesterday`, `office_ids = @working_office` | Next-morning audit |
| Saved view "Pre-auths this month" | saved view | - | `claim_kind = pre_authorization`, `date_preset = month_to_date`, `include_resolved_claims = true` | Treatment-coordinator tracking |
| Saved view "Claims sent last month" | saved view | - | `date_basis = sent_date`, `date_preset = last_month`, `include_resolved_claims = true` | Reconciles with `claims_submitted_count` (Output) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts` (rows), `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `dob`), `rpt_user_dim` (`user_label` of `created_by_user_id`, optional column), `rpt_office_dim` (band label, `local_today`) |
| Columns used | `claim_id`, `claim_number`, `claim_family_no`, `patient_id`, `office_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `tier`, `category`, `is_preauth`, `status_class`, `submitted_date`, `service_from`, `created_at_utc`, `created_at_reliable`, `created_by_user_id`, `treating_provider_id`, `billing_provider_id`, `billed_amount`, `expected_amount`, `expected_basis`, `paid_amount`, `outstanding_amount`, `outstanding_quality`, `sent_method`, `sub_member_id`, `subscriber_name`, `subscriber_dob`, `era` |
| Population | `status_class NOT IN ('void', 'deleted')`, then the parameter predicates of the parity table |
| Date basis | fixed `created_date` (header date-bases table, documented); enhancement `date_basis` as above. `created_date` predicate runs on the timestamp with per-office UTC bounds and `created_at_reliable = true` |
| Office attribution | claim office `rpt_claim_facts.office_id` |
| Provider attribution | none on the legacy screen; enhancement filter on treating, else billing provider |
| Family-once claim amount | hidden column `billed_amount_once` = `billed_amount` on the first row of each `claim_family_no` in the run (window `row_number() OVER (PARTITION BY claim_family_no ORDER BY tier_rank, claim_id) = 1`), else 0; computed by the builder inside the filtered population, so a family split across two carrier bands counts in the band of its lowest tier |
| Remaining amount | computed `difference(expected_amount, paid_amount)` (legacy formula); `outstanding_amount` (also net of write-offs) is the optional `Outstanding` column |
| Coverage rating | **APP** (coverage matrix 11.1 #30): the created date was not loaded for migrated claims, so the default run lists app-era claims only. Options: service dates and estimates on history REPAIR(10); carrier / plan and status mapping REPAIR(32); EClaim / Paper per claim SCHEMA(21) (carrier default until then) |
| Quality notices | `expected_basis <> 'estimate'` rows (estimate missing or equal to billed) are counted and printed in the criteria block; migrated rows selected through the enhanced bases carry the REPAIR(32) status notice (a migrated `A` claim may show as `Sent`) |
| Migrated history | not reproducible on the legacy basis: no migrated claim can ever match a `created_date` range. Availability code `claim_created_date_app_only` (NEW, owner 03) printed when the range starts before the tenant's go-live date |

### Output

Report format: one (`standard`); `claim_kind` changes the population and the sub-title only. Block `claims` (shape `table`,
placement `main`, `row_id_column = claim_id`). Grouping: `fixed_outer` office band when `["ctx", "multi_office"]`, then
the fixed level carrier (`key_columns [carrier_id]`, `header_template "Carrier : {carrier_name}   Ph : {carrier_phone}"`,
subtotal label `Total for {carrier_name} [ {row_count} ] :`); `grand_total {enabled: true, label: "Grand Total [ {row_count} ] :"}`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | group key of the office band |
| `carrier_id` | - | id, hidden | aggregate | group key of the carrier band |
| `carrier_name`, `carrier_phone` | - | text, hidden | aggregate | band labels |
| `claim_id` | - | id, hidden | phi_identified | row id, drill key |
| `patient_id` | - | id, hidden, entity patient | phi_identified | drill key, manifest |
| `patient_sort_name` | - | text, hidden | phi_identified | sort key |
| `chart_no` | Chart # | text | phi_identified | none |
| `patient_subscriber` | Patient / Subscriber | text | phi_identified | key column; `Last, First / Last, First` |
| `patient_subscriber_dob` | Patient - Subscriber DOB | text (two dates) | phi_sensitive | none; XLSX / CSV split into `patient_dob` (phi_identified) and `subscriber_dob` (phi_sensitive) |
| `sub_id` | Sub ID | text | phi_sensitive | none (`sub_member_id`, open question 4) |
| `claim_number` | Claim # | text, drill `claim_record` | phi_identified | none |
| `sent_dos` | Claim Sent - DOS | text (two dates) | phi_identified | none; XLSX / CSV split into `submitted_date`, `service_from` (date) |
| `claim_amount` | Claim Amt | money | financial_patient | subtotal and total = `sum(billed_amount_once)`; row shows `billed_amount` |
| `est_ins` | Est. Ins | money | financial_patient | sum (`expected_amount`) |
| `recv_amt` | Recv. Amt. | money | financial_patient | sum (`paid_amount`) |
| `rem_amt` | Rem. Amt. | money, computed | financial_patient | sum |
| `status` | Status | enum | aggregate | none. Labels: `unsent` Created, Not Sent; `sent` Sent; `partially_paid` Partial Payment; `paid`, `closed` Closed; `denied` Denied (no legacy letter); pre-auth `unsent` / `sent` Pre Auth Sent, `closed` Pre Auth Closed |
| `tier_letter` | Ty | text, `default_visible: false` | aggregate | none (`P`, `S`, `T`, `Q`) |
| `created_date` | Created On | date, `default_visible: false` | phi_identified | none |
| `created_by` | Created By | text, `default_visible: false` | aggregate | none |
| `days_since_sent` | Days Since Sent | integer, `default_visible: false` | phi_identified | none (`local_today - submitted_date`) |
| `outstanding` | Outstanding | money, `default_visible: false` | financial_patient | sum |
| `row_count` | - | integer, hidden | aggregate | `count` per band, placeholder `[ n ]` |

Sort: `sort_by` (enhancement) inside the carrier band; carriers ordered by `carrier_name`; tie-breaker `claim_id`. Page
break: office band only. Summary cards (block totals): `Claims` (count), `Claim Amt` (family-once), `Est. Ins`,
`Rem. Amt.`. `reconciles_with`: none on the default basis; test RPT-INS-10 checks that the count equals
`claims_submitted_count` for the saved view "Claims sent last month". `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (optional, below the table) | Horizontal bars: `Claim Amt` and `Rem. Amt.` per carrier, top 10 (`charts[] {kind: bar, block: claims, category_column: carrier_name}`) |
| `Claim #` | `claim_record`: `kind record`, entity claim, `route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only` |
| `Patient / Subscriber` | patient shell (`route_key patient_overview`), `phi_identified` |
| Carrier subtotal | `kind rows`: same run filtered to the carrier |
| `Status` = Sent / Partial Payment | `kind report` `insurance.outstanding_claims` with `office_scope`, `carrier_ids` = `{column: carrier_id}`, `claim_kind` copied |
| `Status` = Created, Not Sent | `kind report` `insurance.claims_created_not_sent` with `office_scope`, `carrier_ids`, `date_from` / `date_to` copied |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim | row | drill `claim_record` | `transactions_insurance_claims_details_view_only` | P2 |
| Open ledger | row | `navigate` `patient_ledger` (`patient_id`) | `transactions_patient_ledger_screen_full_control` (alternative read right, security card 2.2) | P2 |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |
| Create follow-up tasks | bulk | `create_task` (outstanding claims follow-up of DASH-28) | task feature right | P3 (ENG-49) |

Not a worklist: the live follow-up list is `worklists.outstanding_claims`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (11 columns), letter; header per family page furniture; carrier bands and subtotals; `criteria_echo = footer` with the legacy wording of Legacy output; `totals_on_last_page` |
| XLSX | One sheet `claims`, one header row, the two composite columns split into four typed columns, `Office`, `Office Name`, `Carrier`, `Carrier Phone` as columns, no subtotal rows (outline groups optional), criteria on sheet `criteria` |
| CSV | Same columns as XLSX, main block |
| Background | Not needed at the default; `escalate_when` none (one claim row per claim, indexed on `(tenant_id, office_id, created_at)` by DATA-21) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Which statuses does `Include Resolved Claims` add (closed only, or paid and denied too)? Are denied claims listed by default? What does it do on a pre-authorisation run (the parity mapping names claim statuses only)? | Claims: default unsent, sent, partially paid, denied, ticked adds paid and closed. Pre-auths: default unsent and sent, ticked adds closed |
| 2 | Printed title and sub-title of a pre-authorisation run | `Claims Listing` + `Pre-Authorizations` |
| 3 | Is a grand total printed; is there an office total with several offices? | Both printed |
| 4 | Is `Sub ID` the member id or the subscriber's own id? | `sub_member_id` |
| 5 | `Rem. Amt.` formula when a payment exceeds the estimate (negative remaining?) | `Est. Ins - Recv. Amt.`, sign kept |
| 6 | Footer wording for CLAIM TYPE (dental / medical) beside `Claim Type : EP` | `Claim Category : <value>` |
| 7 | Does a secondary claim print its family's `Claim Amt` and add it again to the carrier total? | Row prints it; totals add the family once (deliberate fix) |
| 8 | Row order inside a carrier band | Patient sort name, then claim number |

## Capitation Utilization - `insurance.capitation_utilization`

Insurance Reports, screenshot 2.PNG - P2 - L - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - DOCUMENTED (Detail, 2008 sample `[R8]`); Summary INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff of offices that treat managed-care (DHMO, prepaid) members | Month end, once per carrier | Produce the utilisation report the carrier requires: patients seen and services performed for its members, with the co-pay collected and the supplemental fees the carrier owes (documented) |
| Office manager, owner | Quarterly, before contract renewal | Compare the office-fee value of the work done for members with what the carrier pays (capitation and supplemental fees) |

### Legacy output

Confidence: **DOCUMENTED** for `Detail` (2008 sample `[R8]`), **INFERRED** for `Summary`.

| Element | Content | Evidence |
|---|---|---|
| Header block | Office name, address lines, `Ph # :`, `Tax ID :` (with `Print Office Address`), then `Facility ID : <value>` | `[S]` `[D]` |
| Printed title | `Capitation Utilization - Detail`; Summary: `Capitation Utilization - Summary` (not seen, inferred) | `[S]` |
| Detail columns, in order | `Patient Name` - `Sub ID` - `Sub DOB` - `Tran. Date` - `Code` - `Description` - `Th` - `Surf` - `Prdr` - `Office Default` - `Co - Pay` - `Sup. Fee.` | `[S]` |
| Grouping | `Carrier : <name>` -> `Plan ID : <id>   Group No : <no>` -> `Tran Date : <date>` | `[S]` |
| Totals | `Total for <group no> :`, `Total for carrier - <name> :`, `Grand Total :` over the three money columns; no total per date band | `[S]` |
| Summary (INFERRED) | Carrier and plan / group totals without patient lines (research `[I]`); we add the encounter counts of the comparable SoftDent report `[X8]` (members seen, procedures) | `[I]` |

Column meanings: `Co - Pay` and `Sup. Fee.` are the two amounts of the managed-care fee schedule (patient amount and
insurance supplemental amount, `[D]` `[R35]`); `Office Default` is taken to be the office (UCR) fee, all 0.00 in the
sample `[I]`. `Th` holds a tooth number or a quadrant (`UL`, `LL`). All money prints positive; no patient balance is
involved (the report lists services, not money posted).

Quirks kept: zero `Office Default` values print as `0.00`, not blank; the date band repeats per plan / group. Deliberate
choice: a line whose code has neither a co-pay nor a supplemental fee on the schedule (blank / blank = non-covered,
`[D]` `[R35]`) prints both cells blank and counts in a `Non-covered lines : n` footer line.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `detail`: one row per procedure, three group levels, title `... - Detail` |
| REPORT FORMAT `Summary` | Block `summary`: one row per carrier x plan / group with counts and the money totals, no patient lines (INFERRED) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged (`role: output`); `csv` added. Whether Excel greys GROUP BY is family open question 1 (left enabled) |
| OFFICE/GROUP `Office` (default) + picker (working office) | Office of service `rpt_charges.office_id IN (...)`; office header block per office |
| OFFICE/GROUP `Office Group` + picker (ALL) | Every office of the groups; one header block and band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / treating provider `rpt_charges.provider_id IN (...)`; applies to the treating provider also when the billing provider is printed (proposal) |
| DATE RANGE Start / End (today / today) | Fixed basis `transaction_date` of the procedure (inferred from `Tran. Date`); equals `service_date` until DATA-13 |
| FACILITY ID (blank) | Free text printed as `Facility ID : <value>` in the header; not a filter (`role: layout`, re-renders the snapshot); blank prints `Facility ID :` with no value |
| CARRIER `ALL` (default) / a selection | Carrier of the patient's prepaid coverage slot (`rpt_insurance_coverage.carrier_id` with `is_prepaid`); after DATA-33 the payer stamped on the charge when that plan is prepaid |
| INCLUDE UCR unticked (default) | No compare column; `compare_fee_schedule_id` greyed, value forced to `null` |
| INCLUDE UCR ticked | Enables FEE SCHEDULE TO COMPARE (required) and adds the column `{compare_fee_schedule_name}` beside `Office Default`: the fee of the line's code on that schedule in force on the service date |
| FEE SCHEDULE TO COMPARE (greyed; captured `CP-40 ( 135 )`) | One fee schedule (`lookup:fee_schedules`, label `Name ( id )`); default `first_option` candidate, list content and default rule `unknown_legacy` (FLT-23); named in the criteria echo |
| OTHER OPTIONS `Print All Codes` unticked (default) | Only codes reported to the carrier: `coalesce(rpt_procedure_code_dim.bill_to_insurance, NOT is_z_code)`; z-codes (internal extra-service codes) dropped (documented) |
| OTHER OPTIONS `Print All Codes` ticked | Every code, z-codes included |
| OTHER OPTIONS `Include Fees Charged` ticked (default) | Adds the column `Fee Charged` (`rpt_charges.charged_fee`); rows unchanged (documented meaning; column placement doubtful, open question 2) |
| OTHER OPTIONS `Include Fees Charged` unticked | No `Fee Charged` column |
| OTHER OPTIONS `Print Office Address` unticked (default) / ticked | Header without / with the office block (address, `Ph # :`, `Tax ID :`); `role: layout` |
| OTHER OPTIONS `Show Billing Provider For Hygienist` unticked (default) | `Prdr` prints the treating provider |
| OTHER OPTIONS `Show Billing Provider For Hygienist` ticked | On a line whose treating provider has `provider_kind = 'hygienist'` (DATA-05), `Prdr` prints the office billing provider (`rpt_office_dim.billing_provider_id`); rows unchanged (INFERRED) |
| GROUP BY `None` (default) | Carrier -> plan / group -> date levels |
| GROUP BY `Provider` | Adds an outer provider level (inferred; vendor's popular variant "Capitation utilization by provider") with `Total for provider - <name> :` |

Dependency rule `insurance_reports.r02.d01`: `compare_fee_schedule_id` has `enabled_when ["truthy", "include_ucr"]` and
`required_when ["truthy", "include_ucr"]`; while greyed its value is `null` and no compare column is built.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `page_break_by` | `enum` (shared 3.9), role `layout` | `none` | NEW value `carrier`: each carrier starts a page, so one PDF can be split and sent per carrier; `group` = break on the provider level when `group_by = provider` | `carrier` is NEW in the 04 vocabulary (8); XLSX `sheet_per_page_break` gives one sheet per carrier |
| `procedure_codes` | `entity_multi` (shared 3.6) | `all` | Restrict to codes a carrier asks about (for example the supplemental-fee codes) | - |
| `include_non_covered` | `boolean` NEW | `true` | `false` drops lines whose code is blank / blank on the managed-care schedule | Owner: this catalog |
| Summary columns `members_seen`, `procedure_count` | columns | shown in Summary | Encounter counts per plan / group and carrier | Comparable `[X8]` |
| `compare_to` | comparison period (filter card 12) | `none` | On `summary`: prior-month and prior-year columns of `Office Default` and `Sup. Fee.` | P4 (FLT-26), `supports_comparison` on the summary format only |
| Saved view "Last month, carrier <name>" | saved view | - | `date_preset = last_month`, `carrier_ids = [id]`, `facility_id` = the carrier's facility id, `print_office_address = true` | Keeps the Facility ID per carrier; schedulable on the 1st of the month (header cadence) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_insurance_coverage` (prepaid slot, `carrier_id`, `carrier_name`, `ins_plan_id`, `group_number`, `sub_member_id`, `subscriber_dob`, `is_prepaid`), `rpt_procedure_code_dim` (`description`, `is_z_code`, `bill_to_insurance`), `rpt_fee_schedule_fees` (`patient_fee`, `insurance_fee`, `schedule_fee`, `pricing_model`), `rpt_patient_dim` (names), `rpt_provider_dim` (`short_id`, `provider_kind`), `rpt_office_dim` (header block, `billing_provider_id`, `local_today`) |
| Population | live charges (`NOT is_void`, archive policy), `NOT is_contract_billing`, `transaction_date` in range, `office_id` in scope, patient holds a live prepaid dental slot (`is_prepaid`); a patient with two prepaid slots is listed under the lower tier; `print_all_codes` rule as above |
| Co - Pay / Sup. Fee. | `patient_fee` / `insurance_fee` of the managed-care schedule (`pricing_model = 'copay'`) in force on the service date. Schedule = `rpt_charges.fee_schedule_id` when it is a copay schedule, else the schedule assigned to the slot's plan / carrier through `fee_schedule_assignments` precedence (`ins_plan_id > carrier_id > provider_id > specialty_id`, narrowed by office). NEW: set-based resolver `rpt_resolved_fee_schedule()` mirroring `pricing_service.resolve_procedure_fee`, owned by `03_data_foundation.md`; `fee_schedule_assignments` read through a passthrough dataset (DATA-45) |
| Office Default | `rpt_charges.office_fee` (UCR snapshot, `gross_production` basis, PD-1) |
| Compare column | `rpt_fee_schedule_fees.schedule_fee` of `compare_fee_schedule_id` on (code, service date); NULL prints blank |
| Fee Charged | `rpt_charges.charged_fee` |
| Date basis | fixed `transaction_date` (inferred); FLT-23 confirms |
| Office attribution | office of service (PD-6) |
| Provider attribution | treating provider `rpt_charges.provider_id`; printed provider per `show_billing_provider_for_hygienist` |
| Coverage rating | **REPAIR(32)** (coverage matrix #31): capitation plans are identifiable only after the legacy prepaid code is decoded - `insurance_plans.is_prepaid` is true on 9 of 31,337 migrated plans because `ISPREPAID` was pushed through a boolean parse (`legacy_prepaid_code` keeps the raw value [V]). Until DATA-32 the report is near-empty on migrated plans. Interim rule proposed for 03: a plan is prepaid when `is_prepaid` or its resolved fee schedule has `pricing_model = 'copay'` (open question 7) |
| Further limits | `Co - Pay` / `Sup. Fee.` and FEE SCHEDULE TO COMPARE need `rpt_fee_schedule_fees` (DATA-51); payer on the charge SCHEMA(33): until then coverage is today's slot, so a member who left the plan disappears from past months and a new member's earlier visits appear; `print_all_codes` uses `is_z_code` until `bill_to_insurance` is filled in setup (DATA-04); hygienist rule needs `provider_kind` (DATA-05) |
| Migrated history | transaction date equals service date (DATA-13); migrated charges have no `fee_schedule_id` (resolver path only); skipped migrated charges (DATA-57) are missing from past months |

### Output

Report formats: `detail` (default), `summary`. Office header block (`placement: report_start` per office band, shape
`key_value`): `office_name`, `address`, `phone` (`Ph # :`), `tax_id` (`Tax ID :`) when `print_office_address`;
`facility_id` (`Facility ID :`) always. Class `aggregate` (practice data).

`detail` (shape `table`, `row_id_column = charge_id`, `max_levels 4`). Levels: [provider when `group_by = provider`:
`Provider : {provider_name}`, subtotal `Total for provider - {provider_name} :`] -> carrier `Carrier : {carrier_name}`,
subtotal `Total for carrier - {carrier_name} :` -> plan / group `Plan ID : {ins_plan_id}   Group No : {group_number}`,
subtotal `Total for {group_number} :` -> date `Tran Date : {transaction_date}`, no subtotal. Grand total `Grand Total :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `carrier_id`, `ins_plan_id`, `group_number`, `transaction_date` | - | hidden | aggregate (`transaction_date`: phi_identified) | group keys |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` |
| `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `patient_name` | Patient Name | text, entity patient | phi_identified | key column |
| `sub_id` | Sub ID | text | phi_sensitive | none |
| `sub_dob` | Sub DOB | date | phi_sensitive | none |
| `tran_date` | Tran. Date | date | phi_identified | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none (tooth or quadrant) |
| `surface` | Surf | text | phi_identified | none |
| `provider_short_id` | Prdr | text | aggregate | none |
| `office_default` | Office Default | money | financial_patient | sum |
| `compare_fee` | `{compare_fee_schedule_name}` | money, `visible_when ["truthy","include_ucr"]` | financial_patient | sum |
| `fee_charged` | Fee Charged | money, `visible_when ["truthy","include_fees_charged"]` | financial_patient | sum |
| `co_pay` | Co - Pay | money | financial_patient | sum |
| `sup_fee` | Sup. Fee. | money | financial_patient | sum |
| `is_non_covered` | - | boolean, hidden | aggregate | count, printed `Non-covered lines : n` |

`summary` (shape `table`, row = office x [provider] x carrier x plan / group, title `Capitation Utilization - Summary`):
`carrier_name` "Carrier" (aggregate, key), `ins_plan_id` "Plan ID", `group_number` "Group No" (aggregate),
`members_seen` "Members Seen" (integer, `count_distinct` patient; sum is not additive, carrier and grand rows recount),
`procedure_count` "Procedures" (integer, count), `office_default`, `compare_fee`, `fee_charged`, `co_pay`, `sup_fee`
(money, `financial_practice`, sum); carrier subtotal and grand total as in detail.

Sort: carriers by name, plans by `group_number`, dates ascending, then `patient_sort_name`, `code`, `charge_id`. Page
break: `page_break_by` (enhancement). Summary cards: `Office Default` total, `Co - Pay` total, `Sup. Fee.` total,
`Members Seen`. `reconciles_with`: grand `office_default` = `capitation_value_of_services` (P3 metric; test enabled when
the metric ships). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (Summary only) | Stacked bars per carrier: `Co - Pay` + `Sup. Fee.` against `Office Default` (value of services against what was earned per visit) |
| `Patient Name` | patient shell, `phi_identified` |
| Detail row | `kind record`, entity charge, `route_key patient_ledger` (charge highlighted), `right_code transactions_patient_ledger_screen_full_control` |
| Plan / group subtotal or summary row | `kind rows`: detail format filtered to carrier and plan |
| Carrier subtotal | `kind report` `insurance.capitation_payment` with `office_scope`, `carrier_ids` = the carrier, `date_from` / `date_to` copied (what the carrier paid for the same period) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open ledger | row | drill (record) | `transactions_patient_ledger_screen_full_control` | P2 |
| Export per carrier | bulk | `export_selection` with `page_break_by = carrier` and `xlsx.sheet_per_page_break` | `reports_export_data_files` | P2 |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | Legacy-like form: office header block (address, `Ph # :`, `Tax ID :`, `Facility ID :`) at the top of each office, banded table, landscape (12 to 14 columns), letter; `criteria_echo = footer` (`From`, `Thru`, `Providers`, `Carriers`, `Print All Codes`, compare schedule name); one carrier per page set with `page_break_by = carrier` |
| XLSX | Sheet `detail` or `summary`, flat rows with `Office`, `Office Name`, `Carrier`, `Plan ID`, `Group No` as columns; header-block values on the `criteria` sheet (`Facility ID`, address); no merged cells |
| CSV | Main block of the chosen format |
| Background | `interactive`; escalates to `background` when `all_offices` and the range exceeds 92 days (`escalate_when`, server only) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Summary layout (columns, levels, counts) | Carrier x plan / group rows with members seen, procedures and money totals |
| 2 | Is `Office Default` the office UCR fee, the office default fee schedule, or the column that `Include Fees Charged` switches? | Office UCR fee on the charge; `Fee Charged` is a separate column |
| 3 | Where does the provider level of GROUP BY Provider sit (outer, or under carrier)? | Outermost inside the office band |
| 4 | `Show Billing Provider For Hygienist`: office billing provider or the supervising dentist? Does PROVIDER then filter on the printed provider? | Office billing provider; filter stays on the treating provider |
| 5 | FEE SCHEDULE TO COMPARE: list content (copay schedules only?), order, default rule | Every schedule, `first_option` candidate (FLT-23) |
| 6 | Date basis `Tran. Date` = transaction or service date | Transaction date (equal until DATA-13) |
| 7 | Interim capitation-plan rule until the prepaid code is decoded (copay schedule = prepaid?) | Proposed to 03; until accepted only `is_prepaid` plans |
| 8 | Are non-covered (blank / blank) lines printed? Are members with no visits listed? | Printed with blank cells; members without visits not listed |

## Claims Created Not Sent - `insurance.claims_created_not_sent`

Insurance Reports, screenshot 3.PNG - P2 - S - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff | Daily, before the batch claim submission | Find claims that were created (saved) but never transmitted or printed - legacy status `Q`, ledger text `Created, Not Sent` - and send them `[I]`, vocabulary `[D]` `[R15]` `[R16]` |
| Office manager | Weekly | Make sure no claim waits more than a day or two; see who created the waiting claims |

No vendor article names this report; every layout statement below is a reconstruction from the Claims Listing family
`[R5]`, Open Dental `Claims Not Sent` `[X1]`, Dentrix Enterprise `Insurance Claims Not Sent` `[X9]` and Dentrix
`Insurance Claims to Process` `[X14]`, to be confirmed on the live tool (RPT-INS-09, FLT-23).

### Legacy output

Confidence: **INFERRED** for every element.

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `Claims Created Not Sent` (menu name; not seen) | header page furniture |
| Carrier band | `Carrier : <name>   Ph : <phone>` | Claims Listing family `[R5]` |
| Columns, in order | `Chart #` - `Patient / Subscriber` - `Sub ID` - `Claim #` - `Created On` - `DOS` - `Ty` - `Claim Amt` - `Est. Ins` - `Status` | research reconstruction `[X1]` `[X9]` |
| Subtotal | `Total for <carrier> [ n ] :` with claim count, sums of `Claim Amt` and `Est. Ins` | `[R5]` |
| GROUP BY Provider | Outer provider level `Provider : <name>` with subtotal | `[C]` `[I]` |
| Grand total | `Grand Total [ n ] :` | proposal |
| Footer echo | `From`, `Thru`, `Pat From`, `Thru`, `Providers`, `Carriers`, `Claim Amt Over/Equal`, `Claim Category`, then title, printed stamp, page | family furniture |

Sign conventions: money positive. Quirk to confirm: a claim saved with `E-Claim` reads `Recreated` in the legacy ledger
but still waits in Batch Claims Processing; whether the legacy report lists it is `[unverified]` `[R16]`. We list every
unsent claim, whatever button created it.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| CLAIM TYPE `Both` (default) / `Dental` / `Medical` | No predicate / `category = 'dental'` / `'medical'` (inferred, as Claims List) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; `csv` added. Excel greying GROUP BY: family open question 1 (left enabled) |
| OFFICE/GROUP `Office` (default) + picker / `Office Group` + picker | Claim office `rpt_claim_facts.office_id` in the resolved set; band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / `coalesce(treating_provider_id, billing_provider_id) IN (...)` (inferred, family open question 2) |
| CREATED ON DATE RANGE Start / End (today / today) | Fixed basis `created_date` (claim created), `created_at_reliable` rows only; migrated claims never match (APP) |
| NAME RANGE Start `AAAAA` / End `ZZZZZ`; two `SEARCH` buttons | Patient sort-name range with the prefix rule, open bounds; buttons superseded by the lookup icons |
| CLAIM AMOUNT OVER OR EQUAL TO (0.00) | `billed_amount >= value` (inferred, as Claims List) |
| CARRIER `ALL` (default) / a selection | No predicate / claim carrier `IN (...)` |
| GROUP BY `None` (default) | Carrier bands only |
| GROUP BY `Provider` | Outer provider level on the claim provider, subtotal per provider (inferred) |
| Population rule (no control) | `status_class = 'unsent'` (stored `draft`, `ready`, `hold`, blank, other unknown values without a sent date, data card 3.2) and `NOT is_preauth` |

Dependency rules: none captured.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `claim_kind` | `enum` (shared 3.5) | `claims` | `pre_authorization` lists unsent pre-authorisations instead | The legacy screen has no CLAIM/PRE-AUTH section; the default keeps the legacy population |
| `date_basis` | `enum` (shared 3.3) | `created_date` | `service_date` (`service_from`): finds the old unsent claims that no created date reaches, migrated drafts included (flagged) | Migrated drafts may be closed claims stored as `draft` (REPAIR(32)) |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked | Only primary or only secondary unsent claims (secondary claims wait for the primary EOB) | - |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | `patient_name`, `created_oldest_first` (Dentrix `[X14]` order), `claim_amount_desc` | Legacy order unknown |
| Column `days_unsent` | column | shown | `local_today - created_date` | Drives the age chart |
| Saved view "All unsent claims" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today` | Daily pre-batch list; with `created_date` it covers every app-era claim |
| Saved view "Unsent over 2 days" | saved view | - | `date_to = today-2d` with `date_from = 2000-01-01` | Escalation list for the manager |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts`, `rpt_patient_dim`, `rpt_user_dim` (`Created By`), `rpt_provider_dim` (provider band label) |
| Columns used | as Claims List plus `created_by_user_id`, `service_from`, `tier`; no remittance columns (an unsent claim has none) |
| Date basis | fixed `created_date`; enhancement `service_date` |
| Office attribution | claim office |
| Provider attribution | claim provider: `treating_provider_id`, else `billing_provider_id` (06 section 6.7) |
| Family amounts | `Claim Amt` totals add a claim family once (`billed_amount_once`, as Claims List); `Est. Ins` per tier, additive |
| Coverage rating | **APP** (coverage matrix #32): the created date of migrated claims is the load time, so they are excluded from the default basis; mis-mapped statuses REPAIR(32) |
| Era notes | migrated claims whose stored code became `draft` and that carry no sent date classify as `unsent` (data card 2.20); they appear only through `date_basis = service_date`, flagged `era = migrated`, with the notice `claim_status_unconfirmed` (NEW code, owner 03) until section 6 #15 of 03 confirms the codes |
| Not reproducible | which migrated claims were really waiting to be sent on a past date (no status history before DATA-25) |

### Output

Report format: one (`standard`). Block `claims` (table, `row_id_column = claim_id`). Levels: office band
(`multi_office`) -> [provider `Provider : {provider_name}`, subtotal `Total for provider - {provider_name} [ {row_count} ] :`
when `group_by = provider`] -> carrier `Carrier : {carrier_name}   Ph : {carrier_phone}`, subtotal
`Total for {carrier_name} [ {row_count} ] :`; grand total `Grand Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `carrier_id` | - | id, hidden | aggregate | group keys |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` (money in the block, rule 3) |
| `claim_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `chart_no` | Chart # | text | phi_identified | none |
| `patient_subscriber` | Patient / Subscriber | text | phi_identified | key column |
| `sub_id` | Sub ID | text | phi_sensitive | none |
| `claim_number` | Claim # | text, drill `claim_record` | phi_identified | none |
| `created_date` | Created On | date | phi_identified | none |
| `service_from` | DOS | date | phi_identified | none |
| `tier_letter` | Ty | text | aggregate | none |
| `claim_amount` | Claim Amt | money | financial_patient | sum of `billed_amount_once` |
| `est_ins` | Est. Ins | money | financial_patient | sum |
| `status` | Status | enum | aggregate | none (`Created, Not Sent`; stored value in the tooltip: `draft`, `ready`, `hold`) |
| `days_unsent` | Days Unsent | integer | phi_identified | `max` per band |
| `created_by` | Created By | text, `default_visible: false` | aggregate | none |
| `era_flag` | Migrated | boolean, `visible_when ["eq","date_basis","service_date"]` | aggregate | count |

Sort: `sort_by` inside the carrier band; tie-breaker `claim_id`. Page break: office band; `page_break_by = group`
offered when `group_by = provider` (shared 3.9). Summary cards: `Unsent claims` (count), `Claim Amt`, `Oldest (days)`.
`reconciles_with`: count = `claims_unsent_count` for the saved view "All unsent claims" (created-date basis covers every
app-era claim). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of claim count by age band of `days_unsent`: `0-1`, `2-7`, `8-30`, `over 30` |
| Age bar | `kind rows`: the run filtered to that band |
| `Claim #` | `claim_record` (`route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only`) |
| `Patient / Subscriber` | patient shell, `phi_identified` |
| Carrier subtotal | `kind rows` |
| Footer link "Next stage" | `kind report` `insurance.claims_list` with the same `office_scope` and dates (funnel link, header) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim (send, print or edit there) | row | drill `claim_record` | `transactions_insurance_claims_details_view_only` | P2 |
| Open ledger | row | `navigate` `patient_ledger` | `transactions_patient_ledger_screen_full_control` | P2 |
| Send in batch | bulk | `navigate` to Batch Claims Processing (`route_key batch_claims_processing`) with the snapshot's claim ids | claim feature right | P3 (ENG-49; the utility is a labelled placeholder in `src/components/utilities/utilityCatalog.ts` today) |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: the live, actionable version is stage `unsent` of `worklists.unbilled_procedures` (06); the
report stays the printable daily list.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape, carrier (and provider) bands, footer echo as Legacy output |
| XLSX | Sheet `claims`: flat typed columns plus `Office`, `Office Name`, `Carrier`, `Carrier Phone`, `Provider` (when grouped), `Stored Status`; criteria sheet |
| CSV | Main block |
| Background | Not needed (small population: unsent claims only) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, order and printed title (no vendor source) | Proposal of Legacy output |
| 2 | Is a claim saved with `E-Claim` (ledger `Recreated`) listed? | Every unsent claim is listed |
| 3 | Does CREATED ON DATE RANGE read the creation date or the last recreation date? | Creation date |
| 4 | Are pre-authorisations that were never sent listed? | No (enhancement `claim_kind`) |
| 5 | Provider of the PROVIDER filter and of GROUP BY Provider | Treating, else billing |
| 6 | Does Excel grey GROUP BY? | Left enabled (family open question 1) |

## Procedures on Hold - `insurance.procedures_on_hold`

Insurance Reports, screenshot 4.PNG - P2 - S - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office, billing staff | Daily, run for today's date (vendor cadence `[D]` `[R12]` `[R14]`) | Review the procedures whose billing the office put on hold (`Hold Claim` ticked, red `H` in the Bill column), release the hold and generate the claim |
| Office manager | Weekly, over a wider range | Catch holds that were forgotten: a held procedure never reaches a claim until someone unticks it |

### Legacy output

Confidence: purpose and workflow **DOCUMENTED** (`[D]` `[R11]` `[R12]` `[R14]`); layout **INFERRED**.

| Element | Content | Evidence |
|---|---|---|
| Printed title | `Procedures on Hold` (menu name; not seen) | header page furniture |
| Columns (reconstructed), in order | `Patient` (id and name) - `Date` - `Code` - `Description` - `Th` - `Surf` - `Provider` - `Fee` - `Est. Ins` - `Carrier` - `Hold Note` | research reconstruction |
| Grouping / totals | Not documented; proposal: office band, flat list, `Total [ n ] :` with sums of `Fee` and `Est. Ins` | proposal |
| Footer echo | `From`, `Thru`, `Offices`, title, printed stamp, page | family furniture |

Documented behaviour we keep: the hold is a tick on the procedure (Ledger or Transaction Entry) that blocks claim
generation until unticked; a note explaining the hold can be added; held procedures also appear on Claims Not Created
(reconciliation rule 4 of the research, header RPT-INS-03). Money prints positive.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) | Office of service `rpt_charges.office_id IN (...)` |
| OFFICE/GROUP `Office Group` + picker (ALL) | Every office of the groups; band per office |
| DATE RANGE Start / End (today / today) | Fixed basis `service_date` of the held procedure (inferred; DOS versus transaction date unverified, FLT-23) |
| Population rule (no control) | Live charges with `hold_claim = true` and no claim (`billing_state = 'hold'`, data card 2.9): the procedures put on hold and not yet billed |

Dependency rules: none (three sections, nothing greyed).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Treating provider `rpt_charges.provider_id` | - |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the line (rule in Data) | Lines without insurance match only under `all` |
| `group_by` | `enum` (shared 3.9) | `none` | `provider`, `carrier`: one level with subtotals | Values exist in the shared vocabulary |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | `patient_name` (then date), `service_date_oldest_first`, `fee_desc` | - |
| Column `days_since_service` | column | shown | `local_today - service_date`; the age of the hold itself is unknown (no hold stamp, Data) | - |
| Saved view "All open holds" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today` | Weekly forgotten-hold sweep; schedulable end of day (header cadence) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_patient_dim` (`chart_no`, names), `rpt_procedure_code_dim` (`description`), `rpt_provider_dim` (`short_id`), `rpt_insurance_coverage` (carrier of the primary dental slot) |
| Columns used | `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `surface`, `quadrant`, `charged_fee`, `est_insurance`, `hold_claim`, `claim_id`, `billing_state`, `bill_tier`, `primary_carrier_id` (after DATA-33), `era` |
| Population | `NOT is_void` (archive policy), `billing_state = 'hold'`, `service_date` in range, `office_id` in scope. A held charge that already carries a claim (possible on migrated rows, where `ISHOLDCLAIM` and the claim link were both loaded [V] `s28`) is `on_claim` and not listed |
| Carrier | `primary_carrier_id` on the charge after DATA-33; until then the carrier of the patient's live primary dental slot today (`rpt_insurance_coverage`, `category = 'dental'`, `tier = 'primary'`); blank when the patient has no coverage |
| Hold note | Not stored: `patient_procedures` has `hold_claim` (boolean) only [V `app/db/models/clinical.py`]. NEW `patient_procedures.hold_reason`, `hold_set_at`, `hold_set_by`, written by `patient_procedure_service` when the flag changes, exposed on `rpt_charges` (owner `03_data_foundation.md`, item RPT-INS-18). Until then the `Hold Note` column prints the procedure note (`patient_procedures.notes`, NEW column `procedure_note` on `rpt_charges`, class `clinical`) |
| Date basis | fixed `service_date` (inferred) |
| Office attribution | office of service (PD-6) |
| Provider attribution | treating provider |
| Coverage rating | **READY** (coverage matrix #33): the hold flag was migrated (`ISHOLDCLAIM` [V] `s28`) |
| Migrated history | who held a procedure, when and why is unknowable for migrated rows (and for app rows until RPT-INS-18); the report shows the current hold state only, never the holds of a past date |

### Output

Report format: one (`standard`). Block `held_procedures` (table, `row_id_column = charge_id`). Levels: office band
(`multi_office`) -> [provider or carrier level when `group_by` is set, subtotal `Total for {label} [ {row_count} ] :`];
grand total `Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `group_key` | - | hidden | provider_comp (provider) / aggregate (carrier) | group key when `group_by` is set |
| `chart_no` | Pat ID | text | phi_identified | none |
| `patient_name` | Patient | text, entity patient | phi_identified | key column |
| `service_date` | Date | date | phi_identified | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none (tooth or quadrant) |
| `surface` | Surf | text | phi_identified | none |
| `provider_short_id` | Provider | text | aggregate | none |
| `fee` | Fee | money | financial_patient | sum (`charged_fee`) |
| `est_ins` | Est. Ins | money | financial_patient | sum (`est_insurance`) |
| `carrier_name` | Carrier | text | aggregate | none |
| `hold_note` | Hold Note | text | phi_identified (`hold_reason`); `clinical` while it falls back to the procedure note | none |
| `days_since_service` | Days | integer | phi_identified | `max` per band |

Sort: `sort_by`; tie-breaker `charge_id`. Page break: office band; `page_break_by = group` when grouped. Summary cards:
`Held procedures` (count), `Fee on hold`, `Est. Ins on hold`. `reconciles_with`: grand `fee` = `procedures_on_hold_amount`
(metrics card 5.3, service basis). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list (the age split is in the `Days` column and the summary cards) |
| Row | `kind record`, entity charge, `route_key patient_ledger` with the charge highlighted, `right_code transactions_patient_ledger_screen_full_control` (header: the procedure in the ledger) |
| `Patient` | patient shell, `phi_identified` |
| Group subtotal | `kind rows` |
| Footer link "Next stage" | `kind report` `insurance.claims_not_created` with `office_scope` copied, `date_basis = service_date`, `report_date = date_to` (funnel link) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Release hold / create claim | row | drill to the ledger line, where the Edit Transaction dialog holds the `Hold Claim` tick and the claim flow (the report itself never writes) | ledger feature right | P2 |
| Release holds | bulk | `custom:release_hold` through `worklists.unbilled_procedures` (stage `hold`), PATCH `hold_claim = false` per charge via `patient_procedure_service`, idempotent per `(run_id, action_key, charge_id)` | `transactions_transaction_entry_screen_full_control` | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: yes; the live version is stage `hold` of `worklists.unbilled_procedures` (06), which leaves the
list when the hold is released and the claim exists.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (note column), letter; office band; footer echo `From`, `Thru`, `Offices` |
| XLSX | Sheet `held_procedures`, flat typed columns plus `Office`, `Office Name`, `Provider Name`; criteria sheet |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Date basis: date of service or transaction date | Service date |
| 2 | Column list, grouping and totals (layout not documented) | Proposal above |
| 3 | Does the legacy report print the hold note? | Yes, `Hold Note` column (procedure note until RPT-INS-18) |
| 4 | Are held procedures of patients without insurance listed? Are $0.00 lines listed? | Both listed |
| 5 | Product: should releasing a hold from the report be allowed in P2 (write action) or stay in the ledger | Ledger only in P2; bulk release in P3 |

<!-- WORK-ITEMS -->
| RPT-INS-10 | Claims List definition: 11 legacy columns (composite `Patient / Subscriber`, `Patient - Subscriber DOB`, `Claim Sent - DOS` split in XLSX), status labels, carrier band with count, family-once `Claim Amt` totals, `include_resolved_claims` status sets for claims and pre-auths, pre-auth sub-title, legacy footer wording | P2 | M | RPT-INS-01, DATA-21, DATA-32, ENG-11, ENG-23, ENG-27 | Default run lists only app-era claims created today in the working office; a primary + secondary family adds `Claim Amt` once to the totals and prints it on both rows; `Rem. Amt.` = `Est. Ins - Recv. Amt.`; ticking Include Resolved adds paid and closed claims only; void / deleted never appear |
| RPT-INS-11 | Claims List enhancements: `date_basis` with NEW value `sent_date` and `service_date`, `provider_ids` (claim provider), `coverage_orders`, `sort_by`, optional columns, three shipped saved views | P2 | S | RPT-INS-10, FLT-02, ENG-28 | With `date_basis = sent_date` and Include Resolved the count equals `claims_submitted_count` for the same range and offices; migrated claims appear under `sent_date` with the REPAIR(32) notice; untouched defaults reproduce RPT-INS-10 output byte for byte |
| RPT-INS-12 | Capitation Utilization Detail: prepaid-slot population, carrier -> plan / group -> date levels (provider outer level with GROUP BY), `Office Default` / `Co - Pay` / `Sup. Fee.` / `Fee Charged` / compare columns, office header block with Facility ID, `print_all_codes` rule, hygienist billing-provider rule, non-covered count | P2 | L | RPT-INS-04, RPT-INS-14, DATA-32, DATA-51, DATA-04, DATA-05, ENG-23, ENG-27 | Default run matches the 2008 sample column list and the three subtotal labels; unticked Print All Codes drops z-codes; compare column only with Include UCR and a schedule; a hygienist line prints the office billing provider only when ticked; grand Office Default equals `capitation_value_of_services` on the fixture |
| RPT-INS-13 | Capitation Utilization Summary format and `page_break_by = carrier` (NEW value) with XLSX sheet per carrier | P2 | S | RPT-INS-12, ENG-23, ENG-27 | Summary carrier totals equal the Detail carrier totals for the same parameters; `members_seen` is recounted at carrier and grand level (not summed); a two-carrier PDF starts the second carrier on a new page |
| RPT-INS-14 | Managed-care fee resolution for reporting: NEW `rpt_resolved_fee_schedule()` (charge schedule, else `fee_schedule_assignments` precedence by plan, carrier, provider, specialty, narrowed by office) and the interim prepaid-plan rule (`is_prepaid` or resolved schedule `pricing_model = 'copay'`) proposed to 03 | P2 | M | DATA-32, DATA-51, DATA-45 | On a sample of app-era charges the resolved schedule equals `pricing_service.resolve_procedure_fee`; a plan whose schedule is copay is listed before the prepaid code is decoded only when 03 accepts the interim rule; blank / blank codes flag `is_non_covered` |
| RPT-INS-15 | Claims Created Not Sent definition: unsent population (`status_class = 'unsent'`, claims only), proposed columns with `Days Unsent` and `Created By`, provider and carrier levels, enhancements (`claim_kind`, `date_basis = service_date` with migrated flag, `coverage_orders`, `sort_by`), age-band chart, saved views | P2 | S | RPT-INS-01, DATA-21, DATA-32, ENG-11 | Count of the saved view "All unsent claims" equals `claims_unsent_count`; a sent claim never appears; a migrated draft appears only under `service_date` with the `claim_status_unconfirmed` notice; GROUP BY Provider subtotals sum to the grand total |
| RPT-INS-16 | Send in batch hand-off from Claims Created Not Sent: bulk `navigate` to Batch Claims Processing carrying the snapshot's claim ids | P3 | S | RPT-INS-15, ENG-49 | The utility opens with exactly the selected unsent claims; ids come from the snapshot, never from the client; the hand-off is audited |
| RPT-INS-17 | Procedures on Hold definition: `billing_state = 'hold'` population on service date, proposed columns (carrier from the primary slot until DATA-33, `Hold Note`, `Days`), enhancements (`provider_ids`, `carrier_ids`, `group_by`, `sort_by`), drill to the ledger line, funnel link to Claims Not Created | P2 | S | RPT-INS-03, DATA-06, DATA-21, ENG-11 | Every held unclaimed live charge in range appears once and also appears on Claims Not Created; a held charge with a claim id is not listed; total Fee equals `procedures_on_hold_amount` |
| RPT-INS-18 | Hold reason and hold stamps: NEW `patient_procedures.hold_reason`, `hold_set_at`, `hold_set_by` written by `patient_procedure_service` on every hold change; `rpt_charges` exposes them and `procedure_note`; ledger dialog captures the reason (handed to 03 and the ledger feature) | P2 | S | DATA-06 | Ticking Hold Claim with a reason stores reason, time and user; unticking clears them and writes an audit row; Procedures on Hold prints the reason instead of the procedure note |
| RPT-INS-19 | Bulk release of holds from the report through `worklists.unbilled_procedures` (`custom:release_hold`) | P3 | S | RPT-INS-17, ENG-49, DASH-28 | Releasing 20 selected rows PATCHes 20 charges once each (idempotent on rerun); a charge changed since the snapshot is skipped and reported; the action needs the transaction-entry right |
<!-- /WORK-ITEMS -->
