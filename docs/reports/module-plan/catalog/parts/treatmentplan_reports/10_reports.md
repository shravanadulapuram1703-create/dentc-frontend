## Treatment Plan Proposal - `treatment_plan.treatment_plan_proposal`

Treatment Plan Reports › Treatment Plan Proposal, screenshot `1.PNG` (possibly truncated) - P3 - L - right family `treatment_plan` - interactive (escalates to background above 100 documents) - PARTIALLY DOCUMENTED (document layout DOCUMENTED from the single-patient `Treatment Plan` print; batch behaviour INFERRED)

### Purpose

Treatment coordinators and front desk print the patient-facing treatment plan (estimate, insurance benefits, financial
disclosure, signature line) for several patients at once: at the end of the day for every patient whose treatment was
diagnosed that day, or before a consult day for the patients on the schedule. The document is handed to the patient at case
presentation and signed. The single-patient version stays on the patient's treatment-plan screen
(`TxPlanReportModal.tsx`, `GET /treatment-plans/{plan_id}/report`, PLAN-6); this report is the batch print of the same
document.

### Legacy output

One document per patient, printed title `Treatment Plan` (internal name `TxPlnTreatPlanPatUCR`), layout read from the
vendor's 2023 and 2025 samples of the single-patient print that shares these options. That the batch report prints the same
document for each selected patient is INFERRED.

| # | Part | Content |
|---|---|---|
| 1 | Title | Organisation name; `Treatment Plan` |
| 2 | Patient box | `Patient :` · `Pat ID :` · `DOB :` |
| 3 | Account box | `Chart # :` · `Resp. Party :` (with address when `Print Responsible Party Address`) · `Office Phone # :` · `Fax # :` · `Primary Insurance:` (and `Secondary Insurance:`) |
| 4 | Procedure grid (2025, current) | `Prdr` · `Prop. Dt` · `Th` · `Surf` · `Code` · `Description` · `Est Pat.` · `Est Ins.` · `Fee` · `UCR`. The 2023 grid also had `Ord`, `Start Dt`, `End Dt` (the vendor removed them); `Prdr` was a provider code in 2023 and a full name in 2025 |
| 5 | Grouping and totals | `Treatment Plan : <id>` -> `Phase : <id>`; `Total for Phase <n> :` and `Total for Treatment Plan <n> :` over `Est Pat.`, `Est Ins.`, `Fee`, `UCR`; under each, `Discount :` (when any) and `Net Est Pat :` = `Est Pat.` - discount |
| 6 | Benefits grid | Rows `Primary`, `Secondary`, `Tertiary`, `Quaternary` (as present); columns `Fam Max` · `Fam Max Rem` · `Ind Max` · `Ind Max Rem` · `Fam Ded` · `Fam Ded Rem` · `Ind Ded` · `Ind Ded Rem`; `99999` = unlimited, printed as a number |
| 7 | Disclosure | Text of the selected Financial Disclosure letter (office letter; may contain merge fields such as tooth numbers) |
| 8 | Signature | `Patient or Parent/Guardian` and `Date` lines (image and date when signed electronically) |

Markers kept: `*` beside a fee = a discount applies to that procedure; `~` beside a fee = the deductible is applied to that
service. `UCR` = the higher of the office UCR fee and the insurance fee-schedule fee (vendor text). Signs: all amounts
positive. Deliberate fix: none. Kept quirk: `99999` printed as a number, not "Unlimited" (enhancement tooltip only). The
single-patient dialog also offers `Good Faith Estimate`, `Print Account Name`, `X-Rays` and `Include Statuses` (defaults
Diagnosed + Accepted); none of them is visible on the batch screen, whose third OTHER OPTIONS row is cut off.

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` | Proposal documents in the PDF layout `treatment_plan_proposal` (one document per patient) |
| PRINT FORMAT `Excel` | XLSX with one row per printed procedure line (patient, plan and phase keys repeated) and a benefits sheet; no document layout (legacy Excel of this report not documented) |
| OFFICE/GROUP `Office` | Picker lists offices; items whose `treatment_item_office` is in the list |
| OFFICE/GROUP `Office Group` | Picker lists office groups; items of the offices of the group(s) |
| Office picker `108` (working office) / list / `ALL` | Working office (default), the chosen offices, or every office the caller may read |
| PROVIDER `ALL` / list | No provider predicate / items whose treating provider is in the list |
| DIAGNOSED DATE RANGE Start Date / End Date (`today` / `today`) | Items with `presented_date` in the range; a patient gets a document when at least one item qualifies, and the document holds only the qualifying items (INFERRED, family open question 2) |
| NAME RANGE Start Name / End Name (`AAAAA` / `ZZZZZ`) | Patients whose sort name `Last, First` falls in the range, prefix rule; the sentinels add no predicate |
| NAME RANGE `SEARCH` (both) | Superseded: the lookup icon inside each box writes `Last, First` |
| TREATMENT PLAN ID blank / `<n>` | All plans / only the plan with `plan_no = n` of each selected patient |
| PHASE ID blank / `<n>` | All phases / only items with `phase_id = n` |
| ORDER ID blank / `<n>` | All items / only items with `priority = n` |
| FINANCIAL DISCLOSURE `.Treatment Plan Disclosure` (first letter) / other letter | The disclosure text printed in part 7 of every document |
| EXCLUDE PATIENT TYPE `None` / list | Nothing excluded / patients with any selected type get no document |
| `Include Office UCR` ticked (default) / unticked | `UCR` column and its totals printed / left out |
| `Itemize Prices` ticked (default) / unticked | Amounts on every procedure line / lines without amounts, totals only (INFERRED) |
| `Include Completed Procedures` unticked (default) / ticked | Completed items (`is_completed`) left out / printed, marked `Completed` |
| `Print Responsible Party Address` unticked (default) / ticked | Name only / name and mailing address under `Resp. Party :` |

Dependency rules: none captured and none documented; every control is always enabled.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| Patients selected elsewhere (bulk "Print proposals" from Treatment Plan Status, Treatment Plan Detail or a worklist) | `patient_ids` (`entity_multi`, shared, search source `patients`) | empty = no restriction | Documents only for these patients; set only through the bulk action or the lookup; never written to a URL |
| Patients on a given day's schedule (consult-day preparation) | `appointment_date` (`date`, NEW; owner 04) | blank = no restriction | Patients with a live appointment that day in `rpt_appointment_facts` at the selected offices |
| Item status choice, as on the single-patient dialog | `include_item_statuses` (`enum_multi`, NEW; options `diagnosed`, `accepted`, `unaccepted`, `hold`, `alternative`, `referred_out`; `accepts_all`) | `all` | Exclusive statuses printed; `all` reproduces the batch screen |
| Account name on the header (single-patient dialog option) | `print_account_name` (`boolean`, NEW) | `false` | Adds the guarantor account name above `Resp. Party :`; becomes the parity mapping if the hidden third row turns out to hold it |
| Legacy 2023 columns | column chooser (`Ord`, `Start Dt`, `End Dt`) | hidden | Screen and XLSX only; the PDF grid follows the 2025 layout |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts` (items), `rpt_patient_dim` (name, `chart_no`, `dob`, `patient_type_codes`, `account_id`), `rpt_account_dim` (guarantor name and address), `rpt_office_dim` (office phone, fax, letterhead), `rpt_provider_dim` (`Prdr` = `provider_name`; `short_id` in the 2023 variant), `rpt_insurance_coverage` (carrier and group number per tier), `rpt_benefit_usage()` (remainders as of office-local today), passthrough `letter_templates` + `office_letter_templates` (disclosure text; NEW passthrough registration, owner 03 under DATA-45) |
| Item columns | `item_id`, `plan_id`, `plan_no` (NEW), `phase_id`, `priority`, `provider_id`, `diagnosed_date`, `presented_date`, `start_date`, `end_date`, `tooth`, `surface`, `procedure_code`, `description`, `exclusive_status`, `is_completed`, `fee`, `ucr_fee`, `insurance_estimate`, `est_patient`, `discount`; NEW `estimated_deductible` (from `treatment_plan_items.estimated_deductible`, for the `~` marker; owner 03) and `plan_name` (`treatment_plans.name`, the plan description) |
| Date basis | `diagnosed_date` (`presented_date`); printed `Prop. Dt` = `diagnosed_date` (INFERRED that the proposal date is the diagnosed date) |
| Office / provider | `treatment_item_office`; treating provider |
| Parameter binding | office scope, providers, date range, codes of the family: `WHERE` on items; name range and patient types: `WHERE` on `rpt_patient_dim`; `treatment_plan_id`: `plan_no = :n`; `phase_id`, `order_id`: equality; `include_completed_procedures = false`: `NOT is_completed`; `include_office_ucr`, `itemize_prices`, `print_responsible_party_address`: column and layout switches (role `query`, they select columns); `financial_disclosure_template_id`: one lookup per run |
| Benefits grid | Per patient and dental slot: `Ind Max`, `Ind Ded`, `Fam Max`, `Fam Ded` = plan limits; `Ind Max Rem` = `max_remaining_effective`; `Ind Ded Rem` = `deductible_remaining_effective`; `Fam Max Rem`, `Fam Ded Rem` = stored snapshots (`family_max_remaining_stored`, `family_ded_remaining_stored`), printed with "as stored on `slot_written_on`" in the footnote. The per-plan "annual max remaining after this plan" of the single-patient service (dry re-estimate) is not computed in batch |
| Insurance label | `carrier_name` + `group_number` (no plan-name column, AL-12 convention) |
| Disclosure merge | Merge fields are resolved by the letters feature's renderer per patient (PD-15); the report passes the template id and the patient id. NEW hook, owner `02_architecture.md` (renderer call from a PDF layout) |
| Availability | APP (coverage matrix row 52): migrated plans have no dates and are never selected; benefits grid family columns are stored snapshots; `Ind Max Rem` needs DATA-32 (P2) |

### Output

Report format `standard`; PDF layout `treatment_plan_proposal` (NEW renderer key, owner 02), `record_per_page = true`
(group level `patient`).

Block `document_header` (`key_value`, placement `after_group` of level `patient`, printed before the grid):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_name` | Patient | text | `phi_identified` | label |
| `patient_id` | Pat ID | id | `phi_identified` | - |
| `dob` | DOB | date | `phi_identified` | - |
| `chart_no` | Chart # | text | `phi_identified` | - |
| `responsible_party_name` | Resp. Party | text | `phi_identified` | - |
| `responsible_party_address` | (address) | text | `phi_identified` | `visible_when ["truthy", "print_responsible_party_address"]` |
| `office_phone`, `office_fax` | Office Phone #, Fax # | text | `aggregate` | - |
| `primary_insurance_label`, `secondary_insurance_label` | Primary Insurance, Secondary Insurance | text | `phi_identified` | - |

Block `items` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `item_id` | - | id | `phi_identified` | hidden; `row_id_column` |
| `plan_no` | Treatment Plan | integer | `phi_identified` | hidden group key, header `Treatment Plan : {plan_no} {plan_name}` |
| `phase_id` | Phase | integer | `phi_identified` | hidden group key, header `Phase : {phase_id}` |
| `priority` | Ord | integer | `phi_identified` | `default_visible false` |
| `provider_label` | Prdr | text | `aggregate` | - |
| `diagnosed_date` | Prop. Dt | date | `phi_identified` | - |
| `start_date`, `end_date` | Start Dt, End Dt | date | `phi_identified` | `default_visible false` |
| `tooth` | Th | text | `phi_identified` | - |
| `surface` | Surf | text | `phi_identified` | - |
| `procedure_code` | Code | text | `phi_identified` | - |
| `description` | Description | text | `phi_identified` | - |
| `fee_marker` | (marker) | text | `phi_identified` | `*` when `discount > 0`, `~` when `estimated_deductible > 0`, printed beside `Fee` |
| `est_patient` | Est Pat. | money | `financial_patient` | `sum` per phase, plan; `visible_when ["truthy", "itemize_prices"]` on lines (totals always) |
| `insurance_estimate` | Est Ins. | money | `financial_patient` | as above |
| `fee` | Fee | money | `financial_patient` | as above |
| `ucr_fee` | UCR | money | `financial_patient` | as above; `visible_when ["truthy", "include_office_ucr"]` |
| `discount` | Discount | money | `financial_patient` | hidden on lines; `sum` printed as `Discount :` under each phase and plan total when non-zero |
| `net_est_patient` | Net Est Pat | money | `financial_patient` | `computed difference(est_patient, discount)` on the phase and plan subtotal lines only |
| `status_label` | Status | text | `phi_identified` | `visible_when ["truthy", "include_completed_procedures"]`; `Completed` on completed items |

Grouping: `patient` (document; key `patient_id`) -> `plan_no` (subtotal `Total for Treatment Plan {plan_no} :`) ->
`phase_id` (subtotal `Total for Phase {phase_id} :`); no grand total (a document per patient). Block `benefits`
(`table`, `after_group` of `patient`): `coverage_tier` (Primary ... Quaternary), `family_max`, `family_max_remaining`,
`individual_max`, `individual_max_remaining`, `family_deductible`, `family_deductible_remaining`, `individual_deductible`,
`individual_deductible_remaining` - all money, `financial_patient`, no totals. Block `disclosure` (`key_value`,
`after_group` of `patient`): `disclosure_text` (`phi_identified` once merged), then the signature lines. Sort: documents by
patient sort name, `patient_id`; lines by `plan_no`, `phase_id`, `priority`, `diagnosed_date`, `item_id` (INFERRED). Page
break: a new page per document (fixed). Summary cards (screen only): documents, procedure lines, sum of `fee`, sum of
`est_patient`.

### Visuals and drill-through

None - a document. Drill: `patient_name` -> `kind: record`, entity `patient`, route `patient_treatment_plan` (the patient's
treatment-plan screen, `phi_identified` plus the treatment-plan feature right); a plan header -> the same screen with the
plan selected.

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open treatment plan | row (document) | `navigate` | Patient treatment-plan screen |
| Present and sign | row | `navigate` | Opens the single-patient print dialog of the treatment-plan screen in signature mode (shared `SignatureCapture`); the signed copy is stored by that feature as a patient document, as the legacy tool logs it to patient notes. The report run itself writes nothing (`side_effects = none`) |
| Book from plan | row | `navigate` | `openSchedulerForBooking` hand-off with the document's unscheduled item ids seeded |
| Export selection | bulk | `export_selection` | Full Control and `reports_export_data_files` |

Not a worklist.

### Export and print

PDF: portrait, Letter, letterhead of the item office, `record_per_page`, `sectioned_page_numbers` (`Page n of m` per
document), `volume_size` 200 documents per file, `criteria_echo = none` on the documents (patient-facing) and a separate
cover page with the resolved criteria for the staff copy. XLSX: sheet `items` (one row per procedure line with
`patient_id`, `patient_name`, `plan_no`, `phase_id` repeated; no merged cells), sheet `benefits`, `criteria` sheet. CSV:
block `items`. Background run (AD-5) above 100 documents, with the artifact delivered in volumes.

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | What the hidden third OTHER OPTIONS row holds (`Print Account Name`, `Good Faith Estimate`, `X-Rays` are the candidates) | live legacy tool, criteria scrolled to the bottom or a taller window |
| 2 | Effect of `Itemize Prices` unticked | live legacy run, both states |
| 3 | Which item statuses the batch prints by default (all non-completed, or Diagnosed + Accepted as on the single-patient dialog) | live legacy run with items in every status |
| 4 | Whether the batch prints the 2023 grid (`Ord`, `Start Dt`, `End Dt`) or the 2025 grid, and `Prdr` as code or name | live legacy run |
| 5 | What the legacy Excel output of this report contains | live legacy run with PRINT FORMAT Excel |
| 6 | Whether the batch output can be signed (signature viewer) or only the single-patient print | live legacy run |
| 7 | Document order (patient name, chart, diagnosed date) | live legacy run |
| 8 | Which DentC `letter_type` holds Financial Disclosure letters; payment-plan contracts use definitions group `financial_disclosure` instead - one source for both? | product decision with 04 (option source `financial_disclosure_letters`) |

## Treatment Plan Status - `treatment_plan.treatment_plan_status`

Treatment Plan Reports › Treatment Plan Status, screenshot `2.PNG` (complete, vendor full-height screenshot) - P3 - M - right family `treatment_plan` - interactive - DOCUMENTED (Detail, 2013 sample); Summary INFERRED

### Purpose

Front office and treatment coordinators run it daily, weekly and at month end to find patients with treatment that is
diagnosed or accepted but not yet scheduled or completed, and call them. Vendor recipes: exclude Scheduled and Completed
(everything not yet booked or done); or status Accepted and exclude Completed and / or Scheduled (works only where staff
mark items Accepted). Management uses the Summary to size the pending treatment value per patient.

### Legacy output

Printed title `Treatment Plan Status - Detail` (2013 sample, 12 pages for seven months of one office). One line per planned
procedure:

| # | Column | Content |
|---|---|---|
| 1 | `T ID` | Treatment plan number |
| 2 | `Ph` | Phase id |
| 3 | `Ord` | Order id |
| 4 | `Sts` | Exclusive status letter |
| 5 | `PA Sts` | Pre-auth status |
| 6 | `Sch` | Scheduled flag (`Y` / `N`) |
| 7 | `Com` | Completed flag (`Y` / `N`) |
| 8 | `Diag. Dt / Accept Dt` | Diagnosed and accepted dates (two lines in one cell) |
| 9 | `Start Dt / End Dt` | Start and end dates (two lines) |
| 10 | `Th` | Tooth |
| 11 | `Surf` | Surface |
| 12 | `Code` | Procedure code |
| 13 | `Description` | Code description |
| 14 | `Prdr` | Provider code |
| 15 | `Est. Pat` | Estimated patient portion |
| 16 | `Est. Ins` | Estimated insurance portion |
| 17 | `Total` | 15 + 16 |

Band per patient: `Patient : <name>   Pat ID : <id>   Chart# :   (H) : ...   (C) : ...   (W) : ...`. Subtotals
`Total for Phase <n> :`, `Total for Plan <n> :`, `Total for Patient :` over columns 15-17. Patient blocks follow
diagnosed-date order in the sample (INFERRED rule). Footer echo `From`, `Thru`, `Providers : ALL`, `Tx Plan : ALL`,
`Exclude Tx Plan : S,C`, `Exclude Pat Type`. No grand total is visible in the sample. Summary: not documented; taken to
print patient-level totals only (INFERRED). Kept: two-layer status, letters, Y / N flags. Deliberate fix: the XLSX splits
the two-line date cells into four columns; a grand total is added (enhancement, labelled `Total :`).

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `items`: one line per item under patient, plan and phase bands |
| REPORT FORMAT `Summary` | Block `patients`: one line per patient with item count and the three amounts (INFERRED layout) |
| PRINT FORMAT `PDF` / `Excel` | PDF banded table / flat XLSX; rows unchanged |
| OFFICE/GROUP `Office` / `Office Group`; picker `108` / list / `ALL` | Items whose `treatment_item_office` is in the resolved office set |
| PROVIDER `ALL` / list | Treating provider of the item |
| DIAGNOSED DATE RANGE Start / End (`today`) | Items with `presented_date` in the range |
| TREATMENT PLANS `ALL` (default) | No status predicate |
| TREATMENT PLANS `Diagnosed` / `Accepted` / `Unaccepted` / `Hold` / `Alternative` | `exclusive_status` = that value, whether or not the item is scheduled or completed |
| TREATMENT PLANS `Referred Out` | `exclusive_status IN ('referred_out', 'external_referral', 'internal_referral')` |
| TREATMENT PLANS `Scheduled` / `Completed` | `is_scheduled` / `is_completed` (any exclusive status) |
| TREATMENT PLANS `Pre-Authorized Sent` / `Pre-Authorized Closed` | `preauth_status = 'sent'` / `'closed'` |
| EXCLUDE TREATMENT PLANS `None` (default) | Nothing excluded |
| EXCLUDE TREATMENT PLANS any of `Diagnosed (D)`, `Accepted (A)`, `Unaccepted (U)`, `Hold (H)`, `Alternative (L)`, `Referred Out (R)`, `Scheduled (S)`, `Completed (C)`, `Pre-Authorized Sent (PS)`, `Pre-Authorized Closed (PC)` | Items matching ANY picked predicate are dropped; footer prints the letters |
| CODES `ALL` / list | Item procedure code in the list |
| TX COUNSELOR `ALL` / list | `counselor_user_id` in the list; items without a counselor only under `ALL` |
| EXCLUDE PATIENT TYPE `None` / list | Patients with any selected type dropped |
| `Include Inactive Patients` unticked (default) / ticked | Active patients only / also inactive (and deleted, until DATA-44) |
| `Include internal plan id` unticked (default) / ticked | `T ID` only / also the internal plan id column (INFERRED) |

Dependency rules: none (all controls always enabled). TREATMENT PLANS and EXCLUDE TREATMENT PLANS combine with AND
(status selected, then exclusions removed), which is what both vendor recipes rely on.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| Sort | `sort_by` (`enum`, shared key; options NEW for this report: `diagnosed_date`, `patient_last_name`, `total_amount_desc`, `oldest_diagnosed_first`) | `diagnosed_date` (legacy order) | Order of patient blocks; lines inside a patient keep plan, phase, order |
| Accepted-date window (follow-up of accepted cases) | `accepted_date` (`date_range`, NEW key, value keys `accepted_date_from`, `accepted_date_to`; owner 04) | blank = no restriction | On `accepted_date_effective`; app-era reliable after DATA-39 |
| Minimum value per patient (call the largest cases first) | `patient_total_over` (`decimal`, NEW) | `0.00` = no restriction | Patients whose listed `total_amount` is at least the value |
| Age of the pending item | column `days_since_diagnosed` | hidden | Office-local today minus `diagnosed_date` |
| Counselor column | column `counselor_label` | hidden | From `rpt_user_dim` |
| Family enhancements | `group_by`, `exclude_patients_with_future_appointment`, preset views | see Shared rules | - |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts`, `rpt_patient_dim` (`last_name`, `first_name`, `chart_no`, `phone` (H), `cell_phone` (C), `work_phone` (W), `is_active`, `patient_type_codes`), `rpt_provider_dim` (`short_id` for `Prdr`), `rpt_user_dim` (counselor label), `rpt_appointment_facts` (enhancement only) |
| Columns used | `item_id`, `plan_id`, `plan_no` (NEW), `phase_id`, `priority`, `exclusive_status`, `exclusive_status_inferred`, `preauth_status`, `is_scheduled`, `is_completed`, `diagnosed_date`, `presented_date`, `accepted_date`, `accepted_date_effective`, `start_date`, `end_date`, `tooth`, `surface`, `procedure_code`, `description`, `provider_id`, `counselor_user_id`, `est_patient`, `insurance_estimate`, `fee` |
| Date basis | `diagnosed_date` (`presented_date`); `Accept Dt` prints the stored `accepted_date` (blank where only the effective date is known; reliable after DATA-39) |
| Office / provider | `treatment_item_office`; treating provider; counselor = `counselor_user_id` |
| Parameter binding | All criteria are `WHERE` predicates on the item or patient; `report_format` selects the block; `include_internal_plan_id` adds a column (role `query`) |
| Availability | APP (coverage matrix row 53). `Sts` of a scheduled or completed item that was never booked is inferred (`A*`); status as of a past date needs SCHEMA(25) (DATA-25) and is not offered. Migrated items never appear |

### Output

Format `detail`, block `items` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | id | `phi_identified` | group key level `patient` (band) |
| `patient_name` | Patient | text | `phi_identified` | band label |
| `chart_no` | Chart# | text | `phi_identified` | band |
| `home_phone`, `cell_phone`, `work_phone` | (H), (C), (W) | text | `phi_identified` | band |
| `plan_no` | T ID | integer | `phi_identified` | group key level `plan` |
| `plan_id` | Internal plan id | text | `phi_identified` | `visible_when ["truthy", "include_internal_plan_id"]` |
| `phase_id` | Ph | integer | `phi_identified` | group key level `phase` |
| `priority` | Ord | integer | `phi_identified` | - |
| `status_letter` | Sts | text | `phi_identified` | `D`, `A`, `U`, `H`, `L`, `R`; `A*` when inferred |
| `preauth_letter` | PA Sts | text | `phi_identified` | `PS` / `PC` / blank |
| `scheduled_flag` | Sch | text | `phi_identified` | `Y` / `N` |
| `completed_flag` | Com | text | `phi_identified` | `Y` / `N` |
| `diagnosed_date` | Diag. Dt | date | `phi_identified` | - |
| `accepted_date` | Accept Dt | date | `phi_identified` | - |
| `start_date` | Start Dt | date | `phi_identified` | - |
| `end_date` | End Dt | date | `phi_identified` | - |
| `tooth`, `surface` | Th, Surf | text | `phi_identified` | - |
| `procedure_code`, `description` | Code, Description | text | `phi_identified` | - |
| `provider_code` | Prdr | text | `aggregate` | - |
| `est_patient` | Est. Pat | money | `financial_patient` | `sum` per phase, plan, patient; grand total |
| `insurance_estimate` | Est. Ins | money | `financial_patient` | same |
| `total_amount` | Total | money | `financial_patient` | same |
| `fee` | Fee | money | `financial_patient` | `default_visible false`; same rule |
| `first_presented_date`, `patient_sort_name`, `item_id` | - | date, text, id | `phi_identified` | hidden sort keys; `item_id` = `row_id_column` |

Grouping: `patient` (header `Patient : {patient_name}   Pat ID : {patient_id}   Chart# : {chart_no}   (H) : {home_phone}
(C) : {cell_phone}   (W) : {work_phone}`, subtotal `Total for Patient :`) -> `plan` (subtotal `Total for Plan {plan_no} :`)
-> `phase` (subtotal `Total for Phase {phase_id} :`); grand total `Total :` (enhancement). With `group_by = provider` or
`tx_counselor` an outer level is added above `patient`. Sort: `sort_by` (default `diagnosed_date` = patient blocks by
`first_presented_date`, then `patient_sort_name`, `patient_id`); lines by `plan_no`, `phase_id`, `priority`,
`procedure_code`, `item_id`. Page break: none (legacy has no control); `page_break_by` not offered.

Format `summary`, block `patients` (`table`, main): `patient_name`, `patient_id`, `chart_no`, `home_phone`, `cell_phone`,
`work_phone` (all `phi_identified`), `item_count` (integer, `aggregate`, `sum`), `est_patient`, `insurance_estimate`,
`total_amount` (money, `financial_patient`, `sum`); grand total `Total :`.

Summary cards (both formats): patients (`count_distinct patient_id`), procedures (`count item_id`), `est_patient`,
`insurance_estimate`, `total_amount` grand totals. `reconciles_with`: grand total of `fee` = `treatment_presented_amount`
for the same office set, providers and range when `treatment_plan_status = all`, `exclude_treatment_plan_statuses = none`,
`procedure_codes = all`, `tx_counselor_ids = all`, `exclude_patient_type_codes = none` and `include_inactive_patients =
true`. The preset "Unscheduled treatment" is not reconciled with `unscheduled_treatment_amount`: the metric is as of today,
uses the pending rule (`is_pending`, which also drops items with an end date and referred-out items) and has no diagnosed
range.

### Visuals and drill-through

Chart hint: stacked bar of `total_amount` by `status_letter` (one bar per provider when `group_by = provider`); otherwise a
list. Drill: patient band -> `kind: record` patient treatment-plan screen; item line -> `kind: record` the item's Edit
Treatment window on that screen; plan subtotal -> the screen with the plan selected. All need `phi_identified` and the
treatment-plan feature right.

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open treatment plan | row | `navigate` | Patient treatment-plan screen |
| Book from plan | row | `navigate` | `openSchedulerForBooking` with the patient's listed unscheduled item ids seeded (never bare navigation to the scheduler) |
| Create follow-up task | row, bulk | `create_task` | One task per patient, assignee = counselor when set |
| Text / e-mail patients | bulk | `send_sms`, `send_email` | Handlers of the communication feature; `requires` consent; `no_correspondence`, `no_auto_sms`, `no_auto_email`, `sms_opt_out_at` give exclusion counts |
| Letters | bulk | `letters` | Letters feature (PD-15), one letter per patient |
| Print proposals | bulk | `navigate` | Opens `treatment_plan.treatment_plan_proposal` with `patient_ids` of the selection and the same office, provider and range |
| Export selection | bulk | `export_selection` | Full Control and `reports_export_data_files` |

Doubles as a worklist: `worklists.unscheduled_treatment` (DASH-34, right family `treatment_plan`) is the live version of
the preset "Unscheduled treatment" with follow-up outcomes; this report stays the parity print.

### Export and print

PDF: landscape (17 columns), `banded_table`, repeating header, patient bands, `criteria_echo = footer`, `Page : n of m`.
XLSX: one sheet per format, one row per item (detail) or per patient (summary), band fields repeated as columns, the two
date cells split into `diagnosed_date`, `accepted_date`, `start_date`, `end_date`, no merged cells, `autofilter`,
`criteria_sheet`. CSV: the main block. Background run when the estimate exceeds the inline row limit (month-end runs over
an office group).

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Layout of the Summary format | live legacy run with Summary |
| 2 | Effect of `Include internal plan id` | live legacy run, both states |
| 3 | Patient block order (earliest diagnosed date, name, id) | live legacy run with patients diagnosed out of name order |
| 4 | Whether a grand total prints | live legacy run, last page |
| 5 | Whether status `Scheduled` means "currently booked" (DentC `is_scheduled`) or "was ever scheduled" | live legacy run with a cancelled appointment |
| 6 | Whether the Diagnosed radio includes items that are scheduled or completed (our predicate: yes, exclusive status only) | live legacy run: Diagnosed with and without excluding S / C |

## Treatment Plan Analysis - `treatment_plan.treatment_plan_analysis`

Treatment Plan Reports › Treatment Plan Analysis, screenshot `3.PNG` (complete) - P3 - M - right family `treatment_plan` - instant - DOCUMENTED (sample c. 2022 plus definitions; row set conflicts between vendor sources)

### Purpose

Office managers and management review it daily, weekly or monthly to see how much planned treatment sits in each status
and how the counts move through the workflow. Vendor advice: keep the default filters; the numbers are meaningful only
where staff maintain statuses. Ratios above 100% point to workflow gaps (work completed without being marked scheduled),
not to performance.

### Legacy output

Printed title `Treatment Plan Analysis`; one block per office (`Office : <name>`). Table `Treatments` · `Count` · `Amount`,
then a `Percentage :` section with two columns (count ratio, amount ratio) and a one-line explanation under each ratio.

| Row | Definition (vendor) |
|---|---|
| `Diagnosed`, `Accepted`, `Unaccepted`, `Hold`, `Alternative` | Items with that exclusive status that are not scheduled and not completed; mutually exclusive |
| `Referred Out` | Shown in the sample, not defined in the article; taken as the same rule |
| `Pre-Auth Sent`, `Pre-Auth Closed` | Items with that pre-auth status, not scheduled and not completed, whatever their exclusive status (overlap the rows above) |
| `Scheduled`, `Completed` | All scheduled / all completed items; an item can be both |

| Ratio (numerator to denominator) | Sample count % | Sample amount % |
|---|---|---|
| `Accepted to Diagnosed` | 2.96 | 1.94 |
| `Unaccepted to Diagnosed` | 1.97 | 1.90 |
| `Scheduled to Accepted` | 433.33 | 231.67 |
| `Pre - Authorized Closed to Pre - Authorized Sent` | 0.00 | 0.00 |
| `Completed to Scheduled` | 476.92 | 878.50 |

`Count` = number of items, `Amount` = their total value (taken as `fee`), ratio = numerator / denominator x 100. The rows
do not add up to the number of planned items (overlap by design); kept. Row-set conflict: the article defines
`Alternative` and `Pre-Auth Closed` but not `Referred Out`; the sample shows `Referred Out` and neither of the other two.
Decision: print all ten rows in the order Diagnosed, Accepted, Unaccepted, Hold, Alternative, Referred Out, Pre-Auth Sent,
Pre-Auth Closed, Scheduled, Completed, zero rows included (open question 1).

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | PDF blocks per office / flat XLSX with an `office_name` column |
| OFFICE/GROUP `Office` / `Office Group`; picker `108` / list / `ALL` | One block per office of the resolved set (items by `treatment_item_office`) |
| PROVIDER `ALL` / list | Treating provider of the item |
| DIAGNOSED DATE RANGE Start / End (`today`) | Cohort of items with `presented_date` in the range; every row and ratio counts only these items |
| EXCLUDE PATIENT TYPE `None` / list | Items of patients with any selected type left out of every row |
| `Include Inactive Patients` unticked (default) / ticked | Active patients only / also inactive |

Dependency rules: none.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| True funnel by cohort | `report_format` (`enum`, NEW for this report: `standard` = legacy rows, `funnel`) | `standard` | `funnel`: each item counted once at its furthest stage under the hierarchy completed > scheduled > accepted > diagnosed / hold / unaccepted; `alternative`, `referred_out` outside the denominator (`data_card.md` 3.2); acceptance and completion rates beside the legacy ratios |
| Organisation total block | `include_all_offices_total` (`boolean`, NEW) | `false` | Adds an `All offices` block after the office blocks when several offices are in scope |
| Codes | `procedure_codes` (`entity_multi`, shared) | `all` | Analysis for a code set (implants, crowns) |
| Comparison period | `compare_to` (FLT-26, P4) | `none` | Prior-period count and amount columns per row |
| Family enhancements | `group_by` (`provider`, `tx_counselor`): one block per office and provider / counselor | `none` | - |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts`; `rpt_patient_dim` (`is_active`, `patient_type_codes`); `rpt_office_dim` (band label) |
| Row predicates (all on items in the cohort) | Diagnosed ... Alternative: `exclusive_status = <value> AND NOT is_scheduled AND NOT is_completed`; Referred Out: `exclusive_status IN ('referred_out', 'external_referral', 'internal_referral') AND NOT is_scheduled AND NOT is_completed`; Pre-Auth Sent / Closed: `preauth_status = 'sent'` / `'closed'` `AND NOT is_scheduled AND NOT is_completed`; Scheduled: `is_scheduled`; Completed: `is_completed` |
| Measures | `count(item_id)` and `sum(fee)` per row, one `FILTER` clause per row in a single pass grouped by `office_id` |
| Ratios | `computed ratio(count_a, count_b)` and `ratio(amount_a, amount_b)` per office with the zero-denominator guard (empty cell, never 0 and never an error) |
| Date basis / attribution | `diagnosed_date` (`presented_date`); `treatment_item_office`; treating provider |
| Availability | APP (coverage matrix row 54). Current state: a cohort's rows change as items move, so re-running an old range gives today's distribution of that cohort, not the one printed then (DATA-25 for history) |

### Output

Format `standard`. Fixed outer group `office` (always, also for one office: the legacy band is printed), header `Office :
{office_name}`. Block `status_rows` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id | `aggregate` | hidden group key |
| `status_row` | Treatments | enum | `aggregate` | row dimension, fixed order of the ten rows |
| `item_count` | Count | integer | `aggregate` | none (rows overlap: no total row, deliberately) |
| `amount` | Amount | money | `financial_practice` | none |

Block `ratios` (`table`, `after_group` of `office`, title `Percentage :`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `ratio_label` | (ratio) | text | `aggregate` | five fixed rows |
| `ratio_note` | (explanation) | text | `aggregate` | our one-line wording: "<numerator> items as a share of <denominator> items, same cohort" |
| `count_pct` | Count % | percent | `aggregate` | `computed ratio`, 2 decimals |
| `amount_pct` | Amount % | percent | `financial_practice` | `computed ratio`, 2 decimals |

Format `funnel` (enhancement): block `funnel` with `stage` (completed, scheduled, accepted, open = diagnosed / hold /
unaccepted, outside = alternative / referred out), `item_count`, `amount`, `share_of_parent` of the cohort; reconciles
with `treatment_funnel_amount` and `treatment_funnel_pct` for the same parameters (`reconciles_with`). The `standard` rows
reconcile with no metric (the legacy definitions overlap). Summary cards: Diagnosed amount, Accepted amount, Completed
amount, Completed to Scheduled count %. Sort and page break: fixed; PDF page break per office when more than one office.

### Visuals and drill-through

Chart: horizontal bars of `amount` per `status_row` per office (`charts[]` hint); `funnel` format uses `FunnelChart`
(DASH-11). Drill (`kind: report`, target `treatment_plan.treatment_plan_status`, `report_format = detail`, `office_ids`
<- the office of the block, `provider_ids`, `date_range`, `exclude_patient_type_codes`, `include_inactive_patients` copied):

| Row clicked | Target parameters set |
|---|---|
| Diagnosed / Accepted / Unaccepted / Hold / Alternative / Referred Out | `treatment_plan_status` = that value, `exclude_treatment_plan_statuses = [scheduled, completed]` |
| Pre-Auth Sent / Pre-Auth Closed | `treatment_plan_status` = `pre_authorized_sent` / `pre_authorized_closed`, `exclude_treatment_plan_statuses = [scheduled, completed]` |
| Scheduled / Completed | `treatment_plan_status` = `scheduled` / `completed`, no exclusion |

A ratio row drills to its numerator row. The drill lands on exactly the items behind the count (reconciliation line in the
drill panel).

### Actions

None on rows (aggregate report); actions are taken on the drilled Treatment Plan Status list. Not a worklist.

### Export and print

PDF: portrait, `banded_table`, one office block per page group, `criteria_echo = footer`. XLSX: sheet `status_rows` and
sheet `ratios`, each with `office_id` and `office_name` columns, typed numbers and percents, no merged cells. CSV: block
`status_rows` (or `ratios` on request). Inline run (`instant`): one aggregate pass over the cohort.

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Current row set: are zero rows suppressed, and do `Alternative`, `Referred Out`, `Pre-Auth Closed` all print? | live legacy run over a range with items in every status |
| 2 | `Amount` = fee, estimate total or UCR | live legacy run against a known plan |
| 3 | Display of a ratio with a zero denominator | live legacy run with no accepted items |
| 4 | Whether an office group prints one block per office or one combined block | live legacy run with an office group |
| 5 | Product: should the hub default to the `funnel` format for dashboards while the parity report keeps `standard`? | product owner (PD list) |

## Treatment Plan Detail - `treatment_plan.treatment_plan_detail`

Treatment Plan Reports › Treatment Plan Detail, screenshot `4.PNG` (complete) - P3 - S - right family `treatment_plan` - interactive - PARTIALLY DOCUMENTED (purpose, criteria and code picker documented; layout INFERRED)

### Purpose

Clinical leads and front office run it on demand to find the patients who have particular procedure codes in their
treatment plans: a campaign list (implant or whitening consults), a recall of a product or technique, or a check before a
specialist day. The documented use: set the range in which the plan was entered, pick one or more codes, print.

### Legacy output

No vendor sample. Reconstructed layout (INFERRED, basis: the `Treatment Plan Status - Detail` columns and the documented
purpose): group per procedure code (`Code - Description`); per item the patient (name, Pat ID, chart, phones), diagnosed
date, tooth, surface, status, provider, estimated patient, estimated insurance, fee; a subtotal per code; a grand total.
Printed title taken as the menu name `Treatment Plan Detail`. Comparable: Open Dental Treatment Finder (code-range filter).
The CODES picker (`SEARCH CODE`) offers `CATEGORY` radios (`Diagnostic`, `Restorative`, `Periodontics`, `Maxilo Prosth`,
`Prosth. fixed`, `Orthodontics`, `Other`, `Preventive`, `Endodontics`, `Prosth. remov`, `Implant Serv`, `Oral Surgery`,
`Adjunct Serv`, `All Medical`), `SORT BY` `Code` / `Desc`, a search box and a transfer list; the box is empty by default
(unlike Treatment Plan Status, where it shows `ALL`).

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | PDF grouped by code / flat XLSX |
| OFFICE/GROUP `Office` / `Office Group`; picker `108` / list / `ALL` | Items whose `treatment_item_office` is in the resolved set |
| PROVIDER `ALL` / list | Treating provider of the item |
| DIAGNOSED DATE RANGE Start / End (`today`) | Items with `presented_date` in the range |
| CODES empty (captured default) | `unknown_legacy`: treated as all codes until confirmed (every planned item in the range, grouped by code); candidate alternative: a code is required |
| CODES list | Items whose `procedure_code` is in the list (SEARCH CODE category radios and sort become the category tree and sort of the code picker, FLT-25) |
| EXCLUDE PATIENT TYPE `None` / list | Patients with any selected type dropped |
| `Include Inactive Patients` unticked (default) / ticked | Active patients only / also inactive |

Dependency rules: none captured. If the live check shows that an empty CODES box blocks the run, the parameter gets
`required: true` with no default and the parity file is rebuilt.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| Leave out done or booked work | `exclude_treatment_plan_statuses` (`entity_multi`, shared source `treatment_plan_statuses`) | `none` | Same predicates as on Treatment Plan Status; `[scheduled, completed]` gives the open campaign list |
| Code ranges, categories, saved code sets | `procedure_codes` picker extras (FLT-25) | `all` | `D6000-D6199` as one entry; "Implant Serv" category as one click |
| One line per patient | `report_format` (`enum`, NEW for this report: `detail`, `patients`) | `detail` | `patients`: one row per patient and code with item count and amounts, for mailing lists |
| Family enhancements | `group_by`, `exclude_patients_with_future_appointment` | see Shared rules | - |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts`; `rpt_patient_dim` (name, `chart_no`, phones, `is_active`, `patient_type_codes`, outreach flags); `rpt_procedure_code_dim` (`description`, `code_category` for the picker); `rpt_provider_dim` |
| Columns used | `item_id`, `patient_id`, `procedure_code`, `description`, `presented_date`, `diagnosed_date`, `tooth`, `surface`, `exclusive_status`, `exclusive_status_inferred`, `is_scheduled`, `is_completed`, `provider_id`, `est_patient`, `insurance_estimate`, `fee` |
| Date basis / attribution | `diagnosed_date` (`presented_date`); `treatment_item_office`; treating provider |
| Parameter binding | All criteria are `WHERE` predicates; `procedure_codes` list -> `procedure_code IN (...)` (ranges expanded by `rpt_code_in_group()` semantics, never a join) |
| Availability | APP (coverage matrix row 55); migrated items never appear |

### Output

Format `detail`, block `items` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` | Code | text | `aggregate` | group key level `code`, header `{procedure_code} - {description}` |
| `description` | Description | text | `aggregate` | group label |
| `patient_name` | Patient | text | `phi_identified` | `count_distinct patient_id` per code as `Patients : n` |
| `patient_id` | Pat ID | id | `phi_identified` | - |
| `chart_no` | Chart# | text | `phi_identified` | - |
| `home_phone`, `cell_phone` | (H), (C) | text | `phi_identified` | - |
| `diagnosed_date` | Diag. Dt | date | `phi_identified` | - |
| `tooth`, `surface` | Th, Surf | text | `phi_identified` | - |
| `status_letter` | Sts | text | `phi_identified` | exclusive letter, `A*` when inferred |
| `scheduled_flag`, `completed_flag` | Sch, Com | text | `phi_identified` | `Y` / `N` |
| `provider_code` | Prdr | text | `aggregate` | - |
| `est_patient` | Est. Pat | money | `financial_patient` | `sum` per code; grand total |
| `insurance_estimate` | Est. Ins | money | `financial_patient` | same |
| `fee` | Fee | money | `financial_patient` | same |
| `item_id`, `patient_sort_name` | - | id, text | `phi_identified` | hidden; `row_id_column`, sort key |

Subtotal per code: `Total for Code {procedure_code} :` with item count, patient count and the three amounts; grand total
`Total :`. Sort: codes ascending; inside a code `patient_sort_name`, `diagnosed_date`, `item_id` (INFERRED). Page break:
none. Format `patients` (enhancement): `procedure_code`, `patient_name`, `patient_id`, `chart_no`, phones, `item_count`,
`fee` sum. Summary cards: patients (distinct), items, `fee` total.

### Visuals and drill-through

Chart hint: bar of patients per code (top 15). Drill: code subtotal -> `kind: report` `treatment_plan.treatment_plan_status`
(`procedure_codes = [<code>]`, office, providers, range, patient-type exclusion and inactive switch copied, `report_format =
detail`); patient cell -> `kind: record` patient treatment-plan screen.

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open treatment plan | row | `navigate` | Patient treatment-plan screen |
| Book from plan | row | `navigate` | `openSchedulerForBooking` with the listed item ids seeded |
| Text / e-mail patients | bulk | `send_sms`, `send_email` | Consent exclusions as on Treatment Plan Status; one message per patient (de-duplicated across codes) |
| Letters, postcards, labels | bulk | `letters`, `postcards`, `labels` | Owning features (PD-15), one per patient |
| Create task | row, bulk | `create_task` | Follow-up task per patient |
| Print proposals | bulk | `navigate` | `treatment_plan.treatment_plan_proposal` with `patient_ids` of the selection |
| Export selection | bulk | `export_selection` | Full Control and `reports_export_data_files` |

Usable as an ad-hoc campaign list; not a standing worklist.

### Export and print

PDF: landscape, `banded_table`, code bands with subtotals, `criteria_echo = footer` (`Codes : <list>`), `Page : n of m`.
XLSX: one row per item with `procedure_code` and `description` repeated, typed amounts, no merged cells, `criteria_sheet`.
CSV: the main block. Inline run; background only above the inline row limit (an all-codes run over an office group).

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Does an empty CODES box mean all codes, or must a code be picked? | live legacy run with the box empty |
| 2 | Actual output layout: columns, grouping per code or per patient, totals | live legacy run, PDF and Excel |
| 3 | Does the report list completed and scheduled items, or only open ones? | live legacy run with a completed item of a picked code |

<!-- WORK-ITEMS -->
| RPT-TX-10 | `treatment_plan.treatment_plan_proposal` definition and builder: document grain per patient, plan and phase bands, totals with Discount and Net Est Pat, markers, benefits block from `rpt_benefit_usage()`, disclosure lookup, all eleven criteria and the enhancement keys | P3 | L | RPT-TX-01, RPT-TX-02, DATA-56, DATA-39, DATA-32, ENG-11 | Golden fixture of two patients with two plans, three phases, a discount and a deductible: phase and plan totals, `Net Est Pat` and markers equal hand-computed values; TREATMENT PLAN ID 2 prints only each patient's second plan; completed items appear only with `include_completed_procedures = true` |
| RPT-TX-11 | PDF layout `treatment_plan_proposal`: record-per-page documents, header boxes, 2025 grid, benefits grid, merged disclosure through the letters renderer, signature lines, per-document page numbers, volumes | P3 | L | ENG-23, ENG-26, ENG-22, RPT-TX-10 | A 250-patient run produces two volumes; each document restarts `Page n of m`; the disclosure prints merged tooth numbers; the layout matches the single-patient print of `TxPlanReportModal.tsx` field for field |
| RPT-TX-12 | Proposal row actions: open treatment plan, present and sign (single-patient print dialog in signature mode), book from plan through `openSchedulerForBooking` | P3 | M | ENG-49, UX-22, RPT-TX-10 | Present and sign opens the patient's dialog with the plan and phase of the document preselected; the signed copy is stored by the treatment-plan feature; the run itself writes no row |
| RPT-TX-13 | `treatment_plan.treatment_plan_status` definition: Detail and Summary formats, status radio and exclusion picker on the two-layer predicates, counselor and code filters, internal plan id column, patient bands with three phones | P3 | M | RPT-TX-01, RPT-TX-02, DATA-56, DATA-39, ENG-11, ENG-23 | Vendor recipe fixtures: exclude S, C lists exactly the items neither booked nor charged; Accepted + exclude S, C lists exactly accepted unbooked uncharged items; grand total of `fee` reconciles with `treatment_presented_amount` under the stated parameters |
| RPT-TX-14 | Treatment Plan Status as a call list: bulk SMS / e-mail / letters / tasks / print proposals with consent exclusion counts; preset "Unscheduled treatment" aligned with `worklists.unscheduled_treatment` | P3 | M | ENG-49, DASH-31, DASH-34, SEC-36, RPT-TX-13 | Bulk text to 50 listed patients reports the consent exclusions before sending; print proposals opens r01 with the 50 `patient_ids`; the preset and the worklist list the same patients on a fixture without end-dated items |
| RPT-TX-15 | `treatment_plan.treatment_plan_analysis` definition: ten status rows per office in one filtered pass, five guarded ratios, drill map to Treatment Plan Status | P3 | M | RPT-TX-01, DATA-56, DATA-39, ENG-11, ENG-30 | The vendor sample counts (203, 6, 4, 4, 13, 10, 26, 124) reproduce the sample ratios to two decimals; a zero denominator prints an empty cell; every row drill returns exactly its count of items |
| RPT-TX-16 | Treatment Plan Analysis enhancements: `funnel` format, organisation total block, code filter, comparison period | P4 | M | RPT-TX-15, MET-15, FLT-26 | `funnel` stage amounts reconcile with `treatment_funnel_amount`; the `standard` default run is unchanged; comparison columns use the same cohort rule for the prior period |
| RPT-TX-17 | `treatment_plan.treatment_plan_detail` definition: code-grouped item list with patient and code subtotals, CODES default per the live check, `exclude_treatment_plan_statuses` and `patients` format enhancements | P3 | S | RPT-TX-01, RPT-TX-04, DATA-56, FLT-25 | Two picked codes produce two bands whose subtotals equal row sums and whose patient counts are distinct counts; an empty CODES box behaves as confirmed by RPT-TX-04 |
| RPT-TX-18 | Treatment Plan Detail campaign actions: bulk SMS, e-mail, letters, postcards, labels, tasks, print proposals, de-duplicated per patient | P3 | S | ENG-49, DASH-31, RPT-TX-17 | A patient listed under two codes receives one message; exclusion counts match the consent flags of `rpt_patient_dim` |
<!-- /WORK-ITEMS -->
