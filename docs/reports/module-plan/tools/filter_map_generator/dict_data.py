"""Hand-written semantics for the shared parameter dictionary (section 3 of 04_filter_framework.md).

stem -> (options, default_rule, semantics, backend, option source)
No pipe characters inside the strings (they go into markdown table cells).
"""

GROUP_TITLES = [
    ('scope', '3.1 Scope'),
    ('people', '3.2 Providers and users'),
    ('dates', '3.3 Dates'),
    ('patients', '3.4 Patients and accounts'),
    ('insurance', '3.5 Insurance, claims and plans'),
    ('codes', '3.6 Codes, fees and clinical'),
    ('scheduling', '3.7 Scheduling and referrals'),
    ('financial', '3.8 Financial'),
    ('layout', '3.9 Output and layout'),
]

D = {
    # ---------------------------------------------------------------- scope
    'office_scope': (
        'Mode `office`: `working_office`, `my_offices`, an office id list, `all`. Mode `office_group`: one group id, a group id list, `all`',
        '`working_office` (`office_ids = [working office]`); `all` on 835 Denial Report',
        'Include. `all` = every office the caller may read, never wider than their rights and never an error. Exactly one of the four value keys is set; an absent key takes this default. Section 6',
        'Resolved by the scope step of the engine (6.2) into an office id list (`null` = tenant-wide) applied to the office column named by `scope.office_attribution` of the report',
        '`offices`, `office_groups`'),
    'referred_from_office_scope': (
        'As `office_scope`', '`working_office`',
        'Include. Office (or group) that created the referral. `all` as in `office_scope`',
        'Same resolution, applied to the originating office of the referral case. No referral-case table exists today (data owned by 03)',
        '`offices`, `office_groups`'),
    'referred_to_office_scope': (
        'As `office_scope`', '`all` on Internal Referral Management, `working_office` on External Incoming Referral Management',
        'Include. Office (or group) the referral was sent to',
        'Same resolution, applied to the receiving office of the referral case',
        '`offices`, `office_groups`'),
    # ---------------------------------------------------------------- people
    'provider_ids': (
        'Every provider, active and inactive', '`all`',
        'Include. `all` = no provider restriction (no predicate). `provider_role` = `scope.provider_attribution` of the report (table below). Forced to `current_user_report_provider` for a provider-restricted caller on the definitions that declare a provider restriction, and hidden there where the legacy screen has no provider control (9.7)',
        '`<role column> IN (:provider_ids)`. Never scoped by `providers.office_id`. Provider ids are strings (`providers.id`)',
        '`providers`'),
    'preferred_provider_ids': (
        'Every provider', '`all`',
        'Include on the preferred provider of the patient. `all` = no restriction. `provider_role = preferred`',
        '`rpt_patient_dim.preferred_provider_id IN (...)`. Not migrated: migrated patients have no preferred provider and match only under `all`',
        '`providers`'),
    'preferred_hygienist_ids': (
        'Every provider (hygienists first)', '`all`',
        'Include on the preferred hygienist of the patient. `all` = no restriction. `provider_role = preferred_hygienist`',
        '`rpt_patient_dim.preferred_hygienist_id IN (...)`. Not migrated (as above)',
        '`providers`'),
    'transaction_provider_ids': (
        'Every provider', '`all`',
        'Include on the provider of the ledger line of the completed procedure. `provider_role = treating`',
        '`rpt_charges.provider_id IN (...)`',
        '`providers`'),
    'referred_from_provider_ids': (
        'Every provider', '`all`', 'Include on the referring provider of the referral case. `provider_role = referring`',
        'Predicate on the referring provider of the referral case (no referral-case table today)', '`providers`'),
    'referred_to_provider_ids': (
        'Every provider', '`all`', 'Include on the provider the case is referred to. `provider_role = referred_to`',
        'Predicate on the receiving provider of the referral case (no referral-case table today)', '`providers`'),
    'user_ids': (
        'Every user, active and inactive', '`all`',
        'Include. `all` = no user restriction. The user role is declared per report (entered by, employee, listed user, created or modified by). On three My Reports it is a hidden parameter forced to `current_user`; on the Management Time Clock Report it is forced for a user-restricted caller (9.7)',
        '`user_key IN (:user_ids)` on the user column the report declares (03 section 5.4). Migrated rows that carry only a legacy login string match only under `all`',
        '`users`'),
    'provider_basis': (
        '`preferred_provider`, `transaction_provider`', '`preferred_provider`',
        'Single choice. Chooses which provider the balances are grouped by and which provider `provider_ids` filters',
        'Switches the provider column of the aging dataset. Applies only when `group_by = provider`', '-'),
    'include_inactive_users': (
        '`true`, `false`', '`false`',
        '`false` = active users only; `true` = active and inactive', '`users.is_active` predicate dropped when `true`', '-'),
    # ---------------------------------------------------------------- dates
    'date_range': (
        'Preset in `date_preset`, or `custom` with an ISO date or relative token on each side', '`today` / `today` (Benefits Used/Unused: `start_of_next_month` / `start_of_next_month+1y-1d`)',
        'Inclusive on both ends, in office-local dates. The basis is fixed by the report (7.2) or chosen with `date_basis`. Section 7',
        '`<basis column> BETWEEN :date_from AND :date_to` on the office-local `DATE` column the dataset exposes for the basis (02 section 4.2 `date_columns`); how a time stamp becomes that column is owned by 03',
        '-'),
    'date_basis': (
        'Per report: `transaction_date`, `created_date`, `service_date`, `payment_date`, `appointment_date`, `file_received_date`, `lab_sent_date`, `lab_due_date`, `lab_received_date`, `all`',
        'First legacy option of the report',
        'Single choice. Names the date that `date_from` / `date_to` (or `report_date`) apply to. `all` (Claims Not Created only) = no date restriction and disables `report_date`. On Lab Cost Report the legacy title of this radio is REPORT TYPE',
        'Selects the basis column of the dataset. Created-date bases are unreliable on migrated rows (`created_at` = migration time)', '-'),
    'ortho_start_date': (
        'ISO date or token; blank allowed', 'blank on Patients by Ortho Status with Time in Treatment, `today` / `today` on Ortho Report',
        'Optional attribute range, inclusive; blank = no restriction. Not the primary range',
        '`ortho_plans.treat_start_date BETWEEN ...` (zero contracts were migrated)', '-'),
    'report_date': (
        'ISO date or token', '`today`',
        'One date. Role declared per report: `as_of` (Aging, Outstanding Claims: balances at the end of that office-local day) or `single_day` (Peg Board Day Sheet; Claims Not Created, on the column chosen by `date_basis`)',
        '`as_of`: rows on or before the date; `single_day`: `<basis column> = :report_date`', '-'),
    'statement_date': (
        'ISO date or token', '`today` (Statements screen: captured one day earlier, rule unconfirmed)',
        'One date. Role declared per report: `filter_equals` (Responsible Party - Statements Sent: must equal the date of a past statement run) or `run_date` (Statements: the date stamped on the new statements and the as-of date of their balances)',
        '`filter_equals`: equality on the statement date of the stored statement rows; `run_date`: as-of date of the run and value written to the new rows', '-'),
    # ---------------------------------------------------------------- patients
    'patient_ids': (
        'Any patient', '`all` (empty box)',
        'Optional include filter on Routing Slip and Audit Trail. `all` = every patient in scope. Legacy shows one box; the parameter accepts a list. The mandatory single patient of Patient\'s Notes is `patient_id`, not this parameter',
        '`patient_id IN (:patient_ids)`', '`patients`'),
    'account_id': (
        'One responsible party = one guarantor account (`accounts.id`)', '`current_account` (account of the patient in context)',
        'Single account. Required on Account Allocation and on Ledger Report with `report_type = account_ledger`; with `patient_ledger` the report takes `patient_id` instead (9.5)',
        '`account_id = :account_id` on the dataset (`rpt_account_dim.account_id`, 03 section 5.3)', '`accounts`'),
    'patient_name': (
        'Free text on each side', '`AAAAA` / `ZZZZZ`; `current_patient_name` on both sides on Super Bill',
        'Inclusive alphabetical range on the patient sort name `Last, First`, case-insensitive, with the prefix rule: each bound is compared with the sort name cut to the length of that bound, so End Name `C` includes `COOK, ANN`, and the same `Last, First` in both boxes selects that person (vendor documentation: enter the same patient twice for one patient). `AAAAA` and `ZZZZZ` are open bounds',
        'Sort name `upper(concat_ws(\', \', last_name, first_name))`, cut to the length of the bound, compared with each bound; sentinel bounds add no predicate', '`patients` (the lookup icon writes `Last, First` into the box)'),
    'responsible_party_name': (
        'Free text on each side', '`AAAAA` / `ZZZZZ`; `current_responsible_party_name` on both sides on Walkout Report',
        'Inclusive alphabetical range on the responsible-party sort name `Last, First`, same rules as `patient_name`',
        'Same comparison on `upper(concat_ws(\', \', guarantor_last_name, guarantor_first_name))` of `rpt_account_dim`', '`accounts` (the lookup icon writes `Last, First` into the box)'),
    'patient_type': (
        '`both`, `general`, `ortho`', '`both`',
        'Single choice on the ortho-patient flag. `both` = no restriction. Not the user-defined patient types',
        'Ortho rule owned by 03 (candidates: `patients.patient_type`, code `OR` in `patients.patient_types`)', '-'),
    'patient_status': (
        '`active`, `inactive`, `both`', '`active`',
        'Single choice. `both` = no restriction', '`patients.is_active`; inactive and deleted patients share the flag today', '-'),
    'include_patient_type_codes': (
        'User-defined patient types', '`all`',
        'Include: patient has at least one selected type. `all` = no restriction, patients without a type included. The legacy picker also lists `No Type Defined` (vendor documentation): source row `no_type_defined` selects patients without a type',
        'Overlap test between `patients.patient_types` and the list', '`definitions:patient_type`'),
    'exclude_patient_type_codes': (
        'User-defined patient types', '`none`',
        'Exclude: patients having any selected type are dropped. `none` = nothing excluded. Source row `no_type_defined` drops patients without a type. Printed footer echo `ExPatType`; one vendor article calls it an include filter (open decision 1)',
        '`NOT` overlap between `patients.patient_types` and the list; patients without a type are kept', '`definitions:patient_type`'),
    'exclude_resp_party_type_codes': (
        'Responsible-party types', '`none`',
        'Exclude: accounts whose responsible-party type is selected are dropped. `none` = nothing excluded. Vendor documentation: every account has exactly one type; `No Type Defined` is one of the types',
        '`resp_party_type NOT IN (...)` on `rpt_account_dim`; rows without a type are kept', '`definitions:resp_party_type`'),
    'include_inactive_patients': (
        '`true`, `false`', '`false`',
        '`false` = active patients only; `true` = active and inactive (same as `patient_status = both`)',
        '`patients.is_active` predicate dropped when `true`. Recall reports also drop accounts sent to collection (vendor documentation)', '-'),
    'age': (
        'Gate `age_range_enabled`; whole numbers `age_from`, `age_to`',
        'Gate off, 0 - 999 on Special Transaction Report; gate on, 0 - 999 on the three recall reports; no gate, blank on Patient List',
        'Inclusive age in whole years on the reference date of the run. `0`, `999` and blank are open bounds: gate off, or gate on with 0 - 999, adds no predicate, so no patient is dropped by the legacy default. A narrowed bound excludes patients without a birth date (open decision 6)',
        'Age computed from `patients.dob` at the reference date of the run; no predicate for open bounds', '-'),
    'account_balance_over': (
        'Decimal', '`0.00` on the Aging reports, `5.00` on Statements',
        'Strictly greater than. Label reads Patient Balance Over when `aging_by = patient_ar`',
        'Predicate on the account (or patient) balance of the canonical ledger layer (PD-4)', '-'),
    'include_credit_balances': (
        '`true`, `false`', '`false`',
        '`false` = accounts with a negative total are left out; `true` = they are included',
        'Balance predicate `total >= 0` dropped when `true`', '-'),
    'only_credit_balances': (
        '`true`, `false`', '`false`',
        '`true` = only accounts with a negative total; overrides `include_credit_balances`', 'Balance predicate `total < 0`', '-'),
    'exclude_sent_to_collection': (
        '`true`, `false`', '`false`', '`true` = accounts flagged sent to collection are dropped',
        'Predicate on the sent-to-collection flag of the account', '-'),
    'exclude_insurance_expected_accounts': (
        '`true`, `false`', '`false` on the Aging reports, `true` on Statements',
        '`true` = accounts whose remaining balance is expected entirely from insurance are dropped',
        'Predicate `patient portion <= 0 AND insurance portion > 0` on the account balance split', '-'),
    'include_balance_status': (
        '`true`, `false`', '`false`', 'Layout only: prints the balance status of the account. Does not filter',
        'Adds the column. No balance-status entity exists today (data owned by 03)', '-'),
    'include_contract_balances': (
        '`true`, `false`', '`false`', 'Layout only: adds the remaining regular and ortho contract balances. Does not filter',
        'Adds the columns from the payment-plan tables', '-'),
    'include_patient_balance': (
        '`true`, `false`', '`true`', 'Layout only: prints the patient balance column', 'Adds the column', '-'),
    'include_patient_phone_number': (
        '`true`, `false`', '`false` on Appointment Detail, `true` on Appointment Detail by User (as captured)',
        'Layout only: prints the phone numbers', 'Adds the column', '-'),
    # ---------------------------------------------------------------- insurance
    'carrier_ids': (
        'Insurance carriers', '`all`',
        'Include. `all` = no carrier restriction. Carrier of the claim on claim reports, of the plan on lists',
        '`carrier_id IN (...)` on the claim or plan', '`carriers`'),
    'employer_ids': (
        'Employers', '`all`', 'Include. `all` = no restriction', '`employer_id IN (...)` on the plan', '`employers`'),
    'claim_kind': (
        '`claims`, `pre_authorization`', '`claims`', 'Single choice: claims or pre-authorisations',
        '`insurance_claims.is_preauth`', '-'),
    'claim_type': (
        '`both`, `dental`, `medical`', '`both`', 'Single choice. `both` = no restriction',
        'Dental / medical category of the claim; `insurance_claims.claim_type` holds the tier on migrated rows (normalisation owned by 03)', '-'),
    'claim_sent_types': (
        '`eclaim`, `paper`', 'Both ticked', 'Include. Full selection = no predicate (2.5): claims without a recorded channel are kept, so the default run lists every claim. One box = `IN` list, claims without a channel dropped',
        'Submission channel of the claim. Not stored per claim today (gap for 03)', '-'),
    'claim_amount_min': (
        'Decimal', '`0.00`', 'Greater than or equal to', 'Predicate on the claim amount', '-'),
    'aging_buckets': (
        '`current`, `over_30`, `over_60`, `over_90`, `over_120`; Excel output of the two Aging reports: `over_120_plus` in place of `over_120` (9.5)', 'All ticked',
        'Include, always a predicate (2.5): accounts (claims on Outstanding Claims) that have a balance in at least one ticked bucket (vendor documentation)',
        'Bucket edges and the aged amount per PD-4 (accounts) or the claim aging rule (Outstanding Claims)', '-'),
    'aging_by': (
        '`account_ar`, `patient_ar`', '`account_ar`',
        'Single choice. `account_ar` = insurance plus patient balances of the account; `patient_ar` = patient balances only',
        'Chooses the balance measure and the population of the aging dataset', '-'),
    'plan_type': (
        '`regular`, `ortho`', '`regular`', 'Single choice: regular or ortho payment plans',
        'Payment plan type (`regular` / `ortho`)', '-'),
    # ---------------------------------------------------------------- codes
    'procedure_codes': (
        'Procedure codes', '`all` (Treatment Plan Detail shows an empty box: unconfirmed, 15.4)',
        'Include. `all` = no code restriction',
        '`procedure_code IN (...)`', '`procedure_codes`'),
    'recall_procedure_codes': (
        'Recallable procedure codes', '`all`', 'Include. `all` = every recallable code',
        '`procedure_code IN (...)` on the recall item', '`procedure_codes` (recall codes only)'),
    'procedure_category_codes': (
        'Procedure categories', '`all`', 'Include. `all` = no restriction', '`procedure_codes.category IN (...)`', '`procedure_categories`'),
    'production_type_ids': (
        'Production types', '`all`', 'Include. `all` = no restriction',
        'No link between procedure codes and production types exists today (gap for 03)', '`production_types`'),
    'procedure_code_status': (
        '`active`, `inactive`, `both`', '`active`', 'Single choice. `both` = no restriction', '`procedure_codes.is_active`', '-'),
    'include_only_tooth_required': (
        '`true`, `false`', '`false`', '`true` = only codes that require a tooth', '`procedure_codes.requires_tooth`', '-'),
    'include_only_surface_required': (
        '`true`, `false`', '`false`', '`true` = only codes that require a surface', '`procedure_codes.requires_surface`', '-'),
    'include_only_bill_to_insurance': (
        '`true`, `false`', '`false`', '`true` = only codes billed to insurance', 'No such column exists today (gap for 03)', '-'),
    'fee_schedule_ids': (
        'Fee schedules', '`all`',
        'Include list filter of Fee Schedule List and Capitation Fee Schedule. `all` = every fee schedule the caller may read. The single required schedule of Procedure Codes by Fee Schedule is `fee_schedule_id`',
        '`fee_schedule_id IN (...)`; Capitation Fee Schedule restricts the lookup and the rows to `pricing_model = copay`', '`fee_schedules`'),
    'compare_fee_schedule_id': (
        'One fee schedule', 'unconfirmed; candidate `first_option` (11.1)',
        'Single value. Supplies the compare-fee column. Applies only when `include_ucr` is true (`disabled_value: null`)',
        'Joins the entry of that fee schedule in force on the service date to the production rows', '`fee_schedules`'),
    'include_ucr': (
        '`true`, `false`', '`false`', 'Layout: adds the UCR / compare-fee column and enables `compare_fee_schedule_id`', 'Adds the column', '-'),
    'ortho_status_codes': (
        'Ortho statuses', '`all`', 'Include. `all` = no restriction', 'No ortho status vocabulary exists today (gap for 03)', '`ortho_statuses`'),
    'missing_items': (
        'Daily Audit: `appointment`, `ledger_transaction`, `progress_notes`, `progress_notes_with_signature`. Missing Ortho Visits: `ledger_transaction`, `ortho_visit`',
        'All ticked', 'Include, always a predicate (2.5): rows that miss at least one ticked item',
        'Anti-joins against the ticked record types', '-'),
    'appointments_to_include': (
        '`only_missing_progress_notes`, `all`', '`only_missing_progress_notes`', 'Single choice', 'Anti-join on progress notes when the first value is chosen', '-'),
    'include_completed_procedures': (
        '`true`, `false`', '`false`', '`true` = completed procedures are also listed', 'Status predicate dropped when `true`', '-'),
    # ---------------------------------------------------------------- scheduling
    'operatory_ids': (
        'Operatories of the selected offices', '`all`', 'Include. `all` = no restriction', '`appointments.operatory_id IN (...)`', '`operatories`'),
    'lab_ids': (
        'Labs', '`all`', 'Include. `all` = no restriction', 'Lab of the lab case on the appointment', '`labs`'),
    'cancellation_reason_codes': (
        'Cancellation reasons', '`all`', 'Include on cancelled appointments. `all` = no restriction',
        '`appointments.cancellation_reason`; free text today and not written by the Scheduler (gap for 03)', '`cancellation_reasons`'),
    'include_cancelled_appointments': (
        '`true`, `false`', '`false` on SmartAssist Report Card and Appointment Detail, `true` on Appointment Detail by User (as captured)',
        '`true` = cancelled appointments are also listed', '`appointments.is_cancelled` predicate dropped when `true`', '-'),
    'referral_type_codes': (
        'Referral types', '`all`', 'Include. `all` = no restriction', 'Lead-source type of the referral source', '`definitions:referral_type`'),
    'referred_to_ids': (
        'Referral sources with direction referred-to', '`all`', 'Include. `all` = no restriction',
        'Referral source the patient or case was referred to', '`referral_sources`'),
    'referral_statuses': (
        '`accepted`, `rejected`, `pending`, `cancelled`, `completed`, `in_progress`, `not_needed`, `expired`; the All box is the scalar value `"all"`, never a list member', '`all`',
        'Include. `"all"` = no status restriction; a list = `IN` list, cases without a status dropped. Ticking a status clears All and the reverse (to confirm)', 'Status of the referral case', '-'),
    'exclude_deleted_referrals': (
        '`true`, `false`', '`true`', '`true` = deleted referrals are dropped', 'Deleted flag of the referral case', '-'),
    'specialty_codes': (
        'Specialties', '`all`', 'Include. `all` = no restriction. Legacy single-select',
        'Specialty of the provider or of the referral source (free text on migrated rows)', '`specialties`'),
    'state_codes': (
        'States', '`all`', 'Include. `all` = no restriction. Legacy single-select', 'State of the address of the listed entity', '`definitions:state`'),
    # ---------------------------------------------------------------- financial
    'transaction_types': (
        '`services`, `payments`, `adjustments`', 'All ticked', 'Include. Full selection = no predicate (2.5); a subset = `IN` list. At least one box',
        'Entry class of the canonical ledger rows', '-'),
    'payment_types': (
        '`cash`, `check`, `credit_card`, `care_credit`, `direct_deposit`, `internal_financing`, `none`',
        'Deposit Slip: `cash` only. Allocation Detail: the six categories, all ticked (no `none` box)',
        'Include on the tender category of the payment code. `none` (Deposit Slip only) = payment codes whose type field is blank. Full selection = no predicate (2.5), so on Allocation Detail payments without a category are listed (to confirm, 11.5). At least one box',
        'Tender category of the payment code (server-side code catalog, P0)', '-'),
    'show_ar': (
        '`true`, `false`', '`false`', 'Layout: adds the A/R block as of the end of the range. Greyed on Daily Journal for an unknown reason (9.3)', 'Adds the block', '-'),
    'show_datewise_summary': (
        '`true`, `false`', '`false` on Daily Journal (both), `true` on Allocation Detail', 'Layout: adds a per-day recap', 'Adds the recap rows', '-'),
    # ---------------------------------------------------------------- layout
    'output_format': (
        '`pdf`, `xlsx`; added: `csv`', '`pdf`; `xlsx` on 835 Denial Report',
        'Format of the exported file. Never changes the rows; the result is always shown on screen first. `role: output`, except on the four reports where a legacy rule depends on it (section 8)',
        'Rendered from the run snapshot (AD-5, AD-6); PRINT / PREVIEW = `render_output` of the run request', '-'),
    'report_format': (
        '`detail`, `summary`; Time Clock Report adds `employee_total_only`', '`detail`; `summary` on Production Report and on the five reports whose radio is ordered Summary / Detail',
        'Row grain of the same population', 'Selects the result grain in the report definition', '-'),
    'report_type': (
        'Per report', 'First legacy option', 'Selects the variant of a report family (population, columns, title). Never a date basis and never a row grain',
        'Selects the variant in the report definition', '-'),
    'report_by': (
        'Per report', 'Legacy default of the report', 'Selects the dimension or basis the report is organised by. On My Daily Journal it selects whose lines are listed (9.5)',
        'Selects the variant or dimension in the report definition', '-'),
    'group_by': (
        'Per report: `none`, `provider`, `user`, `carrier`, `code`, `insurance_plan`, `transaction_provider`, `office`, `zip_code`', '`none` where offered',
        'One grouping level with group headers and subtotals. `none` = no grouping. On Collection Report the value `code` also selects another result block (section 8)', 'Adds the group level to the result', '-'),
    'sort_by': (
        'Per report', 'First legacy option', 'Row order within the innermost group', 'ORDER BY of the definition, with stable tie-breakers', '-'),
    'page_break_by': (
        '`none`, `group`, `date`, `provider`, `user`, `patient`', '`none`',
        'PDF only (`role: layout`): starts a new page per value. `group` = break on the `group_by` dimension', 'Passed to the PDF renderer; ignored for other formats; changing it reuses the snapshot', '-'),
}
