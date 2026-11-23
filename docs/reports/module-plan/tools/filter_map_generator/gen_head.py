"""Generate legacy/index/signature_map.json from signatures.json.

Run:  python -I gen_map.py <index_dir> <out_json> <derived_json>

Rules and tables live here; nothing is typed by hand into the JSON.
"""
import glob
import json
import os
import re
import sys
from collections import OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from expr_conv import to_expr  # noqa: E402

IDX, OUT, DERIVED = sys.argv[1], sys.argv[2], sys.argv[3]
SIGS = json.load(open(os.path.join(IDX, 'signatures.json'), encoding='utf-8'))['signatures']
BY_ID = {s['signature_id']: s for s in SIGS}

CTL, REP_OF, REPORTS = {}, {}, OrderedDict()
for f in sorted(glob.glob(os.path.join(IDX, '*.controls.json'))):
    d = json.load(open(f, encoding='utf-8'))
    for r in d['reports']:
        # controls added by tools/apply_supplement.py are mapped report by report in the catalog, not here
        r['controls'] = [c for c in r['controls'] if c.get('origin') != 'vendor_doc']
        REPORTS[r['report_id']] = {'category': d['category'], 'name': r['name'], 'controls': r['controls'],
                                   'truncated': r.get('possibly_truncated', False), 'actions': r.get('actions', [])}
        for c in r['controls']:
            CTL[c['control_id']] = c
            REP_OF[c['control_id']] = r['report_id']


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


# ----------------------------------------------------------------------------------------------
# 1. Canonical parameter registry.  key -> (type, stem, label, group)
#    key  = the value key in the flat params object (part of `param` before any '.'); for office_scope and
#           scoped_selection the parameter key itself (their legacy controls are addressed as members)
#    stem = the declared parameter the key belongs to (range and pair types share one stem)
# ----------------------------------------------------------------------------------------------
PARAMS = OrderedDict()


def P(key, ptype, label, group, stem=None):
    assert key not in PARAMS, key
    PARAMS[key] = {'type': ptype, 'stem': stem or key, 'label': label, 'group': group}


def PAIR(stem, ptype, label, group, a, b):
    P(f'{stem}_{a}', ptype, label, group, stem)
    P(f'{stem}_{b}', ptype, label, group, stem)


# --- scope
P('office_scope', 'office_scope', 'Office / Office Group', 'scope')
P('referred_from_office_scope', 'office_scope', 'Referred from office / office group', 'scope')
P('referred_to_office_scope', 'office_scope', 'Referred to office / office group', 'scope')
# --- people
P('provider_ids', 'entity_multi', 'Provider', 'people')
P('preferred_provider_ids', 'entity_multi', 'Preferred provider', 'people')
P('preferred_hygienist_ids', 'entity_multi', 'Preferred hygienist', 'people')
P('transaction_provider_ids', 'entity_multi', 'Transaction provider', 'people')
P('appointment_provider_ids', 'entity_multi', 'Appointment provider', 'people')
P('visit_doctor_ids', 'entity_multi', 'Visit doctor', 'people')
P('referred_from_provider_ids', 'entity_multi', 'Referred from provider', 'people')
P('referred_to_provider_ids', 'entity_multi', 'Referred to provider', 'people')
P('tx_counselor_ids', 'entity_multi', 'Tx counselor', 'people')
P('user_ids', 'entity_multi', 'User', 'people')
P('security_group_ids', 'entity_multi', 'Security group', 'people')
P('corresponding_provider_id', 'display', 'Corresponding provider', 'people')
P('provider_basis', 'enum', 'Provider basis (preferred / transaction)', 'people')
P('include_user_in_filters', 'boolean', 'Include user in filters', 'people')
P('include_inactive_users', 'boolean', 'Include inactive users', 'people')
# --- dates
P('date_from', 'date_range', 'Date range (primary)', 'dates', 'date_range')
P('date_to', 'date_range', 'Date range (primary)', 'dates', 'date_range')
P('date_basis', 'enum', 'Date basis', 'dates')
P('date_basis_set', 'enum_multi', 'Date basis (created on / modified on)', 'dates')
P('date_range_type', 'enum', 'Date range type', 'dates')
PAIR('appointment_created_date', 'date_range', 'Appointment created date range', 'dates', 'from', 'to')
PAIR('ortho_start_date', 'date_range', 'Ortho start date range', 'dates', 'from', 'to')
PAIR('first_visit_date', 'date_range', 'First visit date range (first completed procedure)', 'dates', 'from', 'to')
PAIR('ortho_first_visit_date', 'date_range', 'Ortho first visit date range (first Ortho Treatment Card entry)', 'dates', 'from', 'to')
PAIR('ortho_last_visit_date', 'date_range', 'Ortho last visit date range (last Ortho Treatment Card entry)', 'dates', 'from', 'to')
P('report_date', 'date', 'Report date', 'dates')
P('billing_date', 'date', 'Billing date', 'dates')
P('due_date', 'date', 'Due date', 'dates')
P('statement_date', 'date', 'Statement date', 'dates')
P('statement_sent_date', 'date', 'Statement sent date', 'dates')
P('recall_date_mode', 'enum', 'Recall date mode', 'dates')
P('print_all_unallocated_as_of_today', 'boolean', 'Print all unallocated payment/adjustments as of today', 'dates')
# --- patients and accounts
P('patient_ids', 'entity_multi', 'Patient (optional filter)', 'patients')
P('patient_id', 'entity_single', 'Patient (one required patient)', 'patients')
P('account_id', 'entity_single', 'Responsible party (guarantor account)', 'patients')
PAIR('patient_name', 'text_range', 'Patient name range', 'patients', 'from', 'to')
PAIR('responsible_party_name', 'text_range', 'Responsible party name range', 'patients', 'from', 'to')
P('patient_type', 'enum', 'Patient type (general / ortho)', 'patients')
P('patient_status', 'enum', 'Patient status', 'patients')
P('include_patient_type_codes', 'entity_multi', 'Include patient type', 'patients')
P('exclude_patient_type_codes', 'entity_multi', 'Exclude patient type', 'patients')
P('exclude_resp_party_type_codes', 'entity_multi', 'Exclude responsible party type', 'patients')
P('include_inactive_patients', 'boolean', 'Include inactive patients', 'patients')
P('include_inactive_accounts', 'boolean', 'Include inactive accounts', 'patients')
P('gender', 'enum', 'Sex', 'patients')
P('age_range_enabled', 'number_range', 'Age range', 'patients', 'age')
P('age_from', 'number_range', 'Age range', 'patients', 'age')
P('age_to', 'number_range', 'Age range', 'patients', 'age')
PAIR('zip_code', 'text_range', 'Zip code range', 'patients', 'from', 'to')
PAIR('account_balance', 'number_range', 'Account balance range', 'patients', 'from', 'to')
P('account_balance_over', 'decimal', 'Account balance over', 'patients')
P('patient_balance_over', 'decimal', 'Patient balance greater than', 'patients')
P('include_credit_balances', 'boolean', 'Include credit balances', 'patients')
P('only_credit_balances', 'boolean', 'Show only credit balances', 'patients')
P('exclude_credit_balances', 'boolean', 'Exclude credit balances', 'patients')
P('exclude_sent_to_collection', 'boolean', 'Exclude patients sent to collection', 'patients')
P('exclude_insurance_expected_accounts', 'boolean', 'Exclude accounts where patient portion is paid and insurance portion is expected', 'patients')
P('exclude_open_claim_accounts', 'boolean', 'Exclude responsible parties where the patient has an open claim', 'patients')
P('include_balance_status', 'boolean', 'Include balance status', 'patients')
P('include_contract_balances', 'boolean', 'Include contract balances', 'patients')
P('include_patient_balance', 'boolean', 'Include / show patient balance', 'patients')
P('include_patient_phone_number', 'boolean', 'Include patient phone number', 'patients')
P('include_patient_home_office', 'boolean', 'Include patient home office', 'patients')
P('include_patients_with_no_email', 'boolean', 'Include patients with no email', 'patients')
P('include_patients_with_no_insurance', 'boolean', 'Include patients with no insurance', 'patients')
P('note_type_codes', 'entity_multi', 'Note types to print', 'patients')
P('credit_card_on_file', 'enum', 'Credit card on file', 'patients')
P('patient_identifier', 'enum', 'Print patient ID or chart number', 'patients')
# --- insurance and claims
P('carrier_ids', 'entity_multi', 'Carrier', 'insurance')
P('employer_ids', 'entity_multi', 'Employer', 'insurance')
P('insurance_plan_selection', 'entity_multi', 'Insurance plans / sub types', 'insurance')
P('group_number', 'text', 'Group #', 'insurance')
P('claim_kind', 'enum', 'Claim / pre-authorization', 'insurance')
P('claim_type', 'enum', 'Claim type (dental / medical)', 'insurance')
P('coverage_orders', 'enum_multi', 'Claim type (coverage order)', 'insurance')
P('claim_sent_types', 'enum_multi', 'Claim sent type', 'insurance')
P('claim_amount_min', 'decimal', 'Claim amount over or equal to', 'insurance')
P('claim_status', 'enum', 'Claim status', 'insurance')
P('claim_matching_status', 'enum', '835 claim matching status', 'insurance')
P('exclude_reason_codes', 'entity_multi', 'Exclude reason code', 'insurance')
P('facility_id', 'text', 'Facility ID', 'insurance')
P('include_resolved_claims', 'boolean', 'Include resolved claims', 'insurance')
P('eligibility_on_hold', 'boolean', 'DPS eligibility: on hold', 'insurance')
P('aging_buckets', 'enum_multi', 'Aging buckets', 'insurance')
P('aging_by', 'enum', 'Aging by', 'insurance')
P('plan_type', 'enum', 'Payment plan type', 'insurance')
P('ortho_plan_parts', 'enum_multi', 'Ortho plan parts', 'insurance')
P('show_details_ucr', 'boolean', 'Show details UCR', 'insurance')
P('print_all_codes', 'boolean', 'Print all codes', 'insurance')
P('include_fees_charged', 'boolean', 'Include fees charged', 'insurance')
P('print_office_address', 'boolean', 'Print office address', 'insurance')
P('show_billing_provider_for_hygienist', 'boolean', 'Show billing provider for hygienist', 'insurance')
# --- codes and clinical
P('procedure_codes', 'entity_multi', 'Procedure codes', 'codes')
P('recall_procedure_codes', 'entity_multi', 'Recall procedure codes', 'codes')
P('procedure_category_codes', 'entity_multi', 'Procedure category', 'codes')
P('code_scope', 'scoped_selection', 'Code / category', 'codes')
P('payment_adjustment_codes', 'entity_multi', 'Payment / adjustment codes', 'codes')
P('payment_codes', 'entity_multi', 'Payment types (codes)', 'codes')
P('production_type_ids', 'entity_multi', 'Production type', 'codes')
P('procedure_code_status', 'enum', 'Procedure code status', 'codes')
P('procedure_code_types', 'enum_multi', 'Procedure code type', 'codes')
P('include_only_tooth_required', 'boolean', 'Include only tooth required', 'codes')
P('include_only_surface_required', 'boolean', 'Include only surface required', 'codes')
P('include_only_bill_to_insurance', 'boolean', 'Include only bill to insurance', 'codes')
P('fee_schedule_ids', 'entity_multi', 'Fee schedule (list filter)', 'codes')
P('fee_schedule_id', 'entity_single', 'Fee schedule (one required schedule)', 'codes')
P('fee_schedule_effective_date', 'entity_single', 'Fee schedule effective date', 'codes')
P('compare_fee_schedule_id', 'entity_single', 'Fee schedule to compare', 'codes')
P('include_ucr', 'boolean', 'Include UCR', 'codes')
P('include_office_ucr', 'boolean', 'Include office UCR', 'codes')
P('include_z_codes', 'boolean', 'Include Z-codes', 'codes')
P('credit_code_type', 'enum', 'Credit code type', 'codes')
P('credit_code_class', 'enum', 'Credit code class', 'codes')
P('note_macro_category_codes', 'entity_multi', 'Macro category', 'codes')
P('treatment_plan_status', 'enum', 'Treatment plan status', 'codes')
P('exclude_treatment_plan_statuses', 'entity_multi', 'Exclude treatment plans', 'codes')
P('treatment_plan_id', 'text', 'Treatment plan ID', 'codes')
P('phase_id', 'text', 'Phase ID', 'codes')
P('order_id', 'text', 'Order ID', 'codes')
P('financial_disclosure_template_id', 'entity_single', 'Financial disclosure', 'codes')
P('ortho_status_codes', 'entity_multi', 'Ortho status', 'codes')
P('weeks_since_last_visit', 'integer', 'Number of weeks since last visit', 'codes')
P('missing_items', 'enum_multi', 'Missing items', 'codes')
P('patient_has', 'enum', 'Patient has', 'codes')
P('appointments_to_include', 'enum', 'Appointments to include', 'codes')
P('procedure_code_source', 'enum', 'Routing slip procedure codes', 'codes')
P('include_completed_procedures', 'boolean', 'Include completed procedures', 'codes')
P('itemize_prices', 'boolean', 'Itemize prices', 'codes')
P('print_responsible_party_address', 'boolean', 'Print responsible party address', 'codes')
P('include_internal_plan_id', 'boolean', 'Include internal plan id', 'codes')
# --- scheduling and referral
P('operatory_ids', 'entity_multi', 'Operatory', 'scheduling')
P('lab_ids', 'entity_multi', 'Lab', 'scheduling')
P('vendor_codes', 'entity_multi', 'Vendors', 'scheduling')
P('cancellation_reason_codes', 'entity_multi', 'Cancellation reason', 'scheduling')
P('appointment_set', 'enum', 'Appointment set (regular / archived)', 'scheduling')
P('appointment_length', 'enum', 'Appointment length', 'scheduling')
P('appointment_statuses', 'enum_multi', 'Appointment status', 'scheduling')
P('only_appointnow_appointments', 'boolean', 'Only AppointNow appointments', 'scheduling')
P('appointnow_source', 'enum', 'AppointNow source', 'scheduling')
P('include_cancelled_appointments', 'boolean', 'Include cancelled appointments', 'scheduling')
P('include_missed_appointments', 'boolean', 'Include missed appointments', 'scheduling')
P('include_off_call_list', 'boolean', 'Include off call list', 'scheduling')
P('exclude_lab_received', 'boolean', 'Exclude lab received', 'scheduling')
P('scheduled_status', 'enum', 'Scheduled / not scheduled', 'scheduling')
P('print_blank_routing_slip', 'boolean', 'Print blank routing slip', 'scheduling')
P('referral_type_codes', 'entity_multi', 'Referral type', 'scheduling')
P('referral_direction', 'enum', 'Referred to / by', 'scheduling')
P('referred_to_ids', 'entity_multi', 'Referred to / referral out to', 'scheduling')
P('referred_from_ids', 'entity_multi', 'Referred from', 'scheduling')
P('referral_statuses', 'enum_multi', 'Referral statuses', 'scheduling')
P('referral_completion', 'enum', 'Referral completion', 'scheduling')
P('contact_statuses', 'enum_multi', 'Contact statuses', 'scheduling')
P('exclude_deleted_referrals', 'boolean', 'Exclude deleted referrals', 'scheduling')
P('specialty_codes', 'entity_multi', 'Specialty', 'scheduling')
P('state_codes', 'entity_multi', 'State', 'scheduling')
# --- financial
P('transaction_types', 'enum_multi', 'Transaction types', 'financial')
P('payment_types', 'enum_multi', 'Payment types', 'financial')
P('payment_adjustment_scope', 'enum', 'Payments / adjustments scope', 'financial')
P('check_type', 'enum', 'Check type', 'financial')
P('group_batch_checks', 'boolean', 'Group batch checks', 'financial')
P('batch_check_grouping', 'enum', 'Batch check grouping', 'financial')
P('payer_display', 'enum', 'Show responsible party / patient', 'financial')
P('show_ar', 'boolean', 'Show AR', 'financial')
P('include_resp_party_type', 'boolean', 'Include resp. party type', 'financial')
P('show_datewise_summary', 'boolean', 'Show datewise summary', 'financial')
P('include_collection_adjustments', 'boolean', 'Include adjustments (collection)', 'financial')
P('print_all_transactions', 'boolean', 'Print all transactions (includes statements, ledger notes)', 'financial')
P('show_charges_breakdown', 'boolean', 'Show charges break down', 'financial')
P('amount_operator', 'amount_comparison', 'Amount comparison', 'financial', 'amount')
P('amount_value', 'amount_comparison', 'Amount comparison', 'financial', 'amount')
P('audit_type', 'enum', 'Audit type', 'financial')
P('module_type', 'enum', 'Module type', 'financial')
P('suppress_aging', 'boolean', 'Suppress aging', 'financial')
P('hide_insurance_shares', 'boolean', 'Hide insurance shares', 'financial')
P('hide_credit_card_section', 'boolean', 'Hide credit card section', 'financial')
P('exclude_statement_sent_within', 'lookback_days', 'Exclude accounts where statement was sent within last N days', 'financial', 'exclude_statement_sent_within')
P('exclude_statement_sent_within_days', 'lookback_days', 'Exclude accounts where statement was sent within last N days', 'financial', 'exclude_statement_sent_within')
P('statement_type', 'enum', 'Statement type', 'financial')
P('last_statement_date', 'display', 'Last statement date', 'financial')
P('last_close_out_date', 'display', 'Last close out date', 'financial')
# criteria-area buttons: never parameters; they become definition actions (02 section 3.10)
P('run_finance_charges', 'action', 'Finance charges', 'actions')
P('paper_statement_sent', 'action', 'Paper statement sent', 'actions')
# --- output and layout
P('output_format', 'enum', 'Print format', 'layout')
P('report_format', 'enum', 'Report format', 'layout')
P('report_type', 'enum', 'Report type', 'layout')
P('report_by', 'enum', 'Report by', 'layout')
P('group_by', 'enum', 'Group by', 'layout')
P('sort_by', 'enum', 'Sort by', 'layout')
P('page_break_by', 'enum', 'Page break by', 'layout')

# ----------------------------------------------------------------------------------------------
# 2. Mappings
# ----------------------------------------------------------------------------------------------
MAP = OrderedDict()
CB = {'checked': True, 'unchecked': False}
TODAY = {'11/21/2026': 'today'}
ALL = {'ALL': 'all'}
NONE = {'None': 'none'}


def base(param):
    return param.split('.')[0]


def STEMS():
    return {p['stem'] for p in PARAMS.values()}


def stem_of(param):
    b = base(param)
    return PARAMS[b]['stem'] if b in PARAMS else b


def add(sid, status, param, option_values=None, default_map=None, notes='', ptype=None, expect=None):
    """expect = (section, type, label) guard so a shifted signature id is caught."""
    s = BY_ID[sid]
    assert sid not in MAP, sid
    if expect:
        got = (s['section'], s['type'], s['label'])
        assert got == expect, f'{sid}: expected {expect}, got {got}'
    if param:
        assert base(param) in PARAMS or base(param) in STEMS(), f'{sid}: unregistered param {param}'
        ptype = ptype or PARAMS[base(param)]['type']
    om = OrderedDict()
    if option_values is not None:
        assert len(option_values) == len(s['options']), f'{sid}: {len(option_values)} values for {len(s["options"])} options'
        for o, v in zip(s['options'], option_values):
            om[o] = v
    else:
        assert not s['options'] or status in ('help_text', 'not_applicable', 'unknown_legacy'), f'{sid}: options not mapped'
    dm = OrderedDict()
    seen = list(s['defaults'].keys())
    if s['type'] == 'radio_group':
        for d0 in seen:
            dm[d0] = om[d0]
    elif s['type'] == 'checkbox':
        for d0 in seen:
            dm[d0] = CB[d0]
    if default_map:
        for k, v in default_map.items():
            dm[k] = v
    if s['type'] not in ('button', 'static_text', 'other') and status in ('replicated', 'replicated_enhanced'):
        for d0 in seen:
            assert d0 in dm, f'{sid}: captured default {d0!r} has no default_map entry'
    MAP[sid] = OrderedDict(signature_id=sid, status=status, param=param or '', param_type=ptype or '',
                           option_map=om, default_map=dm, notes=norm(notes))


R, RE, UNK, SUP, HELP = 'replicated', 'replicated_enhanced', 'unknown_legacy', 'superseded', 'help_text'

PICKER_NOTE = ('Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; '
               'ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool.')
EXCL_NOTE = ('Exclude filter: None = exclude nothing; rows whose value is in the list are dropped. '
             'Dialog content was never captured - confirm on the live tool.')
DATE_NOTE = 'Default = today in the office time zone (relative token). Enhanced with presets and relative tokens.'
SEARCH_NOTE = ('Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon '
               'opens the full search dialog; no separate button.')
COLLAPSED = 'Static dropdown captured collapsed: only the default is known. Expand the list on the live tool and record every option. '
LOOKUP_DD = ('Lookup-fed dropdown captured collapsed (ALL plus tenant rows). Legacy is single-select; the parameter accepts a list '
             '(enhancement). Confirm list source on the live tool.')


def fixed_basis(b):
    return f'Primary date range. This legacy section fixes date_basis = {b} (no basis radio). ' + DATE_NOTE


# sig0001-0016  Appointment List
add('sig0001', R, 'report_type',
    ['confirmation_call_list', 'call_list', 'pull_chart_list', 'cancelled_list', 'cancelled_from_automated_campaigns', 'missed_list'],
    notes='List-type selector. Section header hidden above the viewport in our capture; vendor screenshots show the title '
          'REPORT FORMAT TO PRINT and a PRINT FORMAT (PDF / Excel) section above it that our inventory lacks. Selects the report '
          'variant, so it maps to report_type. Only the Confirmation Call List state was captured (vendor: Cancelled List); '
          'capture the other four states, they drive nine greyed controls.',
    expect=('[?]', 'radio_group', ''))
add('sig0002', R, 'office_scope.mode', ['office', 'office_group'],
    notes='Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports '
          '(mode locked to office); the whole control is greyed on Referral Source List.',
    expect=('OFFICE/GROUP', 'radio_group', ''))
add('sig0003', RE, 'office_scope.selection', default_map={'108': 'working_office', 'ALL': 'all'},
    notes='108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). '
          'Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = '
          'groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and '
          'display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / '
          'office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read.',
    expect=('OFFICE/GROUP', 'picker', ''))
add('sig0004', RE, 'provider_ids', default_map=ALL,
    notes=PICKER_NOTE + ' Provider role (line, appointment, preferred) is declared per report. '
          'Greyed on the two Aging reports until GROUP BY PROVIDER is ticked.', expect=('PROVIDER', 'picker', 'Provider'))
add('sig0005', RE, 'date_from', default_map=TODAY,
    notes='Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. ' + DATE_NOTE,
    expect=('DATE RANGE', 'date_input', 'Start Date'))
add('sig0006', RE, 'date_to', default_map=TODAY,
    notes='Primary date range, inclusive end. ' + DATE_NOTE, expect=('DATE RANGE', 'date_input', 'End Date'))
add('sig0007', RE, 'exclude_patient_type_codes', default_map=NONE,
    notes=EXCL_NOTE + ' Vendor documentation describes this option as an include filter on Special Transaction Report - confirm.',
    expect=('EXCLUDE PATIENT TYPE', 'picker', ''))
add('sig0008', RE, 'exclude_resp_party_type_codes', default_map=NONE, notes=EXCL_NOTE,
    expect=('EXCLUDE RESP. PARTY TYPE', 'picker', ''))
add('sig0009', RE, 'cancellation_reason_codes', default_map=ALL,
    notes=PICKER_NOTE + ' Greyed in both captures; applies only when cancelled appointments are in scope.',
    expect=('CANCELLATION REASON', 'picker', ''))
add('sig0010', RE, 'operatory_ids', default_map=ALL, notes=PICKER_NOTE, expect=('OPERATORY', 'picker', 'Operatory'))
add('sig0011', UNK, 'appointment_length', default_map={'Any': 'any'},
    notes=COLLAPSED + 'Expected: Any plus appointment lengths.', expect=('APPOINTMENT TYPE', 'dropdown', 'Length'))
add('sig0012', R, 'appointment_statuses.missed', notes='Row label Status. Member of the appointment status checkbox pair.',
    expect=('APPOINTMENT TYPE', 'checkbox', 'Missed'))
add('sig0013', R, 'appointment_statuses.cancelled', notes='Row label Status. Member of the appointment status checkbox pair.',
    expect=('APPOINTMENT TYPE', 'checkbox', 'Cancelled'))
add('sig0014', R, 'include_off_call_list', expect=('OTHER OPTIONS', 'checkbox', 'Include Off Call List'))
add('sig0015', R, 'include_patient_balance', notes='Same parameter as Show Patient Balance.',
    expect=('OTHER OPTIONS', 'checkbox', 'Include Patient Balance'))
add('sig0016', R, 'sort_by', ['appointment_date', 'provider_last_name_appointment_date', 'patient_chart_no', 'patient_last_name'],
    expect=('SORT BY', 'radio_group', ''))
add('sig0017', RE, 'output_format', ['pdf', 'xlsx'],
    notes='PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout.',
    expect=('PRINT FORMAT', 'radio_group', ''))
add('sig0018', R, 'include_patient_balance', notes='Same parameter as Include Patient Balance.',
    expect=('OTHER OPTIONS', 'checkbox', 'Show Patient Balance'))
add('sig0019', R, 'report_type', ['appointment_list', 'not_sent', 'not_received', 'due_date'],
    notes='Selects the report variant. Only the Appointment List state was captured.', expect=('REPORT TYPE', 'radio_group', ''))
add('sig0020', RE, 'due_date', default_map=TODAY, notes='Single date. ' + DATE_NOTE, expect=('DUE DATE', 'date_input', 'Due Date'))
add('sig0021', RE, 'lab_ids', default_map=ALL, notes=PICKER_NOTE, expect=('LAB', 'picker', 'Lab'))
add('sig0022', RE, 'date_from', default_map=TODAY,
    notes='Primary date range. Basis appointment_date unless the section carries a basis radio (Appointment Detail by User). ' + DATE_NOTE,
    expect=('APPOINTMENT DATE RANGE', 'date_input', 'Start Date'))
add('sig0023', RE, 'date_to', default_map=TODAY,
    notes='Primary date range, inclusive end. Basis appointment_date unless the section carries a basis radio. ' + DATE_NOTE,
    expect=('APPOINTMENT DATE RANGE', 'date_input', 'End Date'))
add('sig0024', R, 'report_format', ['detail', 'summary'],
    notes='Greyed on 835 Denial Report while PRINT FORMAT = Excel (vendor documentation: Excel exists only as Detail). On the '
          'Daily Production Report the Detail option alone is greyed until PRODUCTION BY = Provider (option_enabled_when).',
    expect=('REPORT FORMAT', 'radio_group', ''))
add('sig0025', R, 'include_missed_appointments', expect=('OTHER OPTIONS', 'checkbox', 'Include Missed Appointments'))
add('sig0026', R, 'include_cancelled_appointments', expect=('OTHER OPTIONS', 'checkbox', 'Include Cancelled Appointments'))
add('sig0027', RE, 'vendor_codes', default_map=ALL,
    notes=PICKER_NOTE + ' Vendor = third-party service that confirmed the appointment; no such entity exists yet (new lookup).',
    expect=('VENDORS', 'picker', 'Vendors'))
add('sig0028', R, 'appointment_set', ['regular', 'archived'], notes='Regular versus archived appointments.',
    expect=('APPOINTMENT TYPE', 'radio_group', ''))
add('sig0029', R, 'only_appointnow_appointments', expect=('APPOINT NOW', 'checkbox', 'Only AppointNow Appointments'))
add('sig0030', R, 'appointnow_source', ['both', 'appoint_now', 'appoint_now_api'], expect=('APPOINT NOW', 'radio_group', ''))
add('sig0031', RE, 'provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('PROVIDER/USER', 'picker', 'Provider'))
add('sig0032', RE, 'user_ids', default_map=ALL, notes=PICKER_NOTE + ' User who entered or created the row.',
    expect=('PROVIDER/USER', 'picker', 'User'))
add('sig0033', R, 'date_basis', ['appointment_date', 'created_date'], expect=('DATE RANGE', 'radio_group', ''))
add('sig0034', R, 'group_by', ['provider', 'user'], expect=('GROUP BY', 'radio_group', ''))
add('sig0035', R, 'page_break_by', ['none', 'date', 'provider', 'user'],
    notes='The User option is greyed while GROUP BY = Provider.', expect=('PAGE BREAK BY', 'radio_group', ''))
add('sig0036', R, 'include_patient_phone_number', expect=('OTHER OPTIONS', 'checkbox', 'Include Patient Phone Number'))
add('sig0037', UNK, 'include_patient_home_office',
    notes='Clipped third row of OTHER OPTIONS on Appointment Detail, unreadable in our capture. Vendor screenshots show a checkbox '
          'Include Patient Home Office with nothing after it. Confirm label and default state on the live tool.',
    expect=('OTHER OPTIONS', 'other', '[?]'))
add('sig0038', R, 'date_basis', ['appointment_date', 'lab_sent_date', 'lab_due_date', 'lab_received_date'],
    notes='Legacy title REPORT TYPE, but the radio is the date basis of the APPOINTMENT DATE RANGE below it: it selects which lab '
          'date the range is matched against (vendor documentation). All = appointment date is unverified - confirm on the live tool. '
          'Same choice as date_basis of the existing lab cost report endpoint (appointment / sent / due / received).',
    expect=('REPORT TYPE', 'radio_group', ''))
add('sig0039', R, 'exclude_lab_received', expect=('OTHER OPTIONS', 'checkbox', 'Exclude Lab Received'))
# daily
add('sig0040', RE, 'report_date', default_map=TODAY,
    notes='Single date. Role per report: as_of (Aging, Outstanding Claims), single_day (Peg Board Day Sheet; Claims Not Created, '
          'on the column chosen by date_basis, greyed while the radio is on ALL). ' + DATE_NOTE,
    expect=('REPORT DATE', 'date_input', 'Report Date'))
add('sig0041', R, 'date_basis', ['transaction_date', 'created_date'], expect=('DATE RANGE', 'radio_group', ''))
add('sig0042', R, 'patient_type', ['both', 'general', 'ortho'],
    notes='Ortho-patient flag, not the user-defined patient types of INCLUDE / EXCLUDE PATIENT TYPE.',
    expect=('PATIENT TYPE', 'radio_group', ''))
add('sig0043', R, 'transaction_types.services', expect=('TRANSACTION TYPES', 'checkbox', 'Services'))
add('sig0044', R, 'transaction_types.payments', expect=('TRANSACTION TYPES', 'checkbox', 'Payments'))
add('sig0045', R, 'transaction_types.adjustments', expect=('TRANSACTION TYPES', 'checkbox', 'Adjustments'))
add('sig0046', R, 'show_ar', notes='Greyed on Daily Journal in every known capture (enabling rule unknown); enabled on Executive Summary.',
    expect=('OTHER OPTIONS', 'checkbox', 'Show AR'))
add('sig0047', R, 'include_resp_party_type', expect=('OTHER OPTIONS', 'checkbox', 'Include Resp. Party Type'))
add('sig0048', R, 'show_datewise_summary', notes='Same parameter as Show Datewise Distribution.',
    expect=('OTHER OPTIONS', 'checkbox', 'Show Datewise Summary'))
add('sig0049', R, 'group_by', ['none', 'provider', 'user'], expect=('GROUP BY', 'radio_group', ''))
add('sig0050', R, 'page_break_by.group',
    notes='Page Break checkbox beside GROUP BY: ticked sets page_break_by = group (break on the selected grouping). '
          'Greyed while GROUP BY = None.', expect=('GROUP BY', 'checkbox', 'Page Break'))
add('sig0051', R, 'report_by', ['code', 'provider', 'category', 'carrier'],
    notes='PRODUCTION BY selects the report variant (no None option).', expect=('PRODUCTION BY', 'radio_group', ''))
add('sig0052', R, 'group_by', ['none', 'provider', 'carrier'], expect=('GROUP BY', 'radio_group', ''))
add('sig0053', RE, 'procedure_codes', default_map={'ALL': 'all', '': 'all'},
    notes=PICKER_NOTE + ' One capture (Treatment Plan Detail) shows an empty box: treated as no restriction - confirm.',
    expect=('CODES', 'picker', ''))
add('sig0054', R, 'include_ucr', expect=('OTHER OPTIONS', 'checkbox', 'Include UCR'))
add('sig0055', R, 'include_z_codes', notes='Greyed until Include UCR is ticked.', expect=('OTHER OPTIONS', 'checkbox', 'Include Z-Codes'))
add('sig0056', UNK, 'compare_fee_schedule_id',
    default_map={'CIGNA PPO HAMILTON ( 128 )': 'first_option', 'CP-40 ( 135 )': 'first_option'},
    notes='Lookup dropdown of fee schedules shown as name ( id ), captured collapsed and greyed until Include UCR is ticked. The '
          'default rule is unconfirmed: vendor screenshots of other tenants show other schedules in the same greyed box, so the value '
          'is tenant data, presumably the first list entry (candidate default first_option). The two captured values of one tenant '
          'differ per report, so Capitation Utilization has its own list or default rule (control override). Confirm list order, '
          'list content and default on the live tool.',
    expect=('FEE SCHEDULE TO COMPARE', 'dropdown', 'Fee Schedule To Compare'))
add('sig0057', RE, 'payment_codes', default_map=ALL,
    notes=PICKER_NOTE + ' Vendor documentation: restricts to chosen payment codes (Setup > Payment/Adjustment Types), '
          'not the tender categories of the checkbox variant.',
    expect=('PAYMENT TYPES', 'picker', 'Payment Types'))
add('sig0058', R, 'group_by', ['none', 'provider', 'carrier', 'code'],
    notes='COLLECTION BY groups the report (it has a None option and the Page Break twin) and also sets the printed variant title.',
    expect=('COLLECTION BY', 'radio_group', ''))
add('sig0059', R, 'page_break_by.group', notes='Page Break checkbox beside COLLECTION BY; greyed while None is selected.',
    expect=('COLLECTION BY', 'checkbox', 'Page Break'))
add('sig0060', R, 'include_collection_adjustments', expect=('OTHER OPTIONS', 'checkbox', 'Include Adjustments(Collection)'))
add('sig0061', R, 'date_basis', ['transaction_date', 'payment_date'], expect=('DATE RANGE', 'radio_group', ''))
for sid, mem, lab in (('sig0062', 'cash', 'Cash'), ('sig0063', 'check', 'Check'), ('sig0064', 'credit_card', 'Credit Card'),
                      ('sig0065', 'care_credit', 'CareCredit'), ('sig0066', 'direct_deposit', 'Direct Deposit'),
                      ('sig0067', 'internal_financing', 'Internal Financing')):
    add(sid, R, f'payment_types.{mem}', notes='Member of the payment type (tender category) checkbox group.',
        expect=('PAYMENT TYPES', 'checkbox', lab))
add('sig0068', R, 'payment_types.none',
    notes='Checkbox literally labelled None: payment types whose type field is blank (vendor documentation), '
          'not a select-nothing shortcut.',
    expect=('PAYMENT TYPES', 'checkbox', 'None'))
add('sig0069', R, 'check_type', ['both', 'patient_checks', 'insurance_checks'],
    notes='Greyed until the Check payment type is ticked.', expect=('CHECK TYPE', 'radio_group', ''))
add('sig0070', R, 'group_batch_checks', notes='Section header doubles as the checkbox. Greyed in the default state.',
    expect=('GROUP BATCH CHECKS', 'checkbox', 'GROUP BATCH CHECKS'))
add('sig0071', R, 'batch_check_grouping', ['batch_id', 'check_number'], notes='Greyed until GROUP BATCH CHECKS is ticked.',
    expect=('GROUP BATCH CHECKS', 'radio_group', ''))
add('sig0072', R, 'payer_display', ['responsible_party', 'patient', 'none'], expect=('OTHER OPTIONS', 'radio_group', ''))
add('sig0073', R, 'report_by', ['next_scheduled_appointment', 'next_scheduled_recall'], expect=('REPORT BY', 'radio_group', ''))
add('sig0074', RE, 'patient_ids', default_map={'': 'all'},
    notes='Patient lookup box (header plural PATIENTS, row label Patient). Vendor documentation: limits the run to one patient; '
          'left blank, a slip prints for every patient with an appointment in the range. Legacy holds one patient; the parameter '
          'accepts a list (enhancement).', expect=('PATIENTS', 'text_input', 'Patient'))
add('sig0075', SUP, 'patient_ids.search', notes=SEARCH_NOTE, ptype='action', expect=('PATIENTS', 'button', 'SEARCH'))
add('sig0076', R, 'procedure_code_source', ['recommended', 'active_treatment_plan', 'codes'], expect=('OTHER OPTIONS', 'radio_group', ''))
add('sig0077', HELP, 'procedure_code_source',
    notes='Info icon after Recommended. Tooltip (vendor documentation): order of procedure codes = appointment codes, then '
          'provider defaults, then blank; then Accepted, then Diagnosed plan codes. Kept as help on the recommended option.',
    ptype='', expect=('OTHER OPTIONS', 'other', ''))
add('sig0078', R, 'include_completed_procedures', expect=('OTHER OPTIONS', 'checkbox', 'Include Completed Procedures'))
add('sig0079', R, 'sort_by', ['appointment_date', 'provider_last_name_appointment_date', 'operatory_appointment_date', 'patient_last_name'],
    expect=('SORT BY', 'radio_group', ''))
add('sig0080', R, 'print_blank_routing_slip', expect=('SORT BY', 'checkbox', 'Print Blank Routing Slip'))
add('sig0081', RE, 'preferred_provider_ids', default_map=ALL,
    notes=PICKER_NOTE + ' Row label is Preferred Provider although the section header is PROVIDER.',
    expect=('PROVIDER', 'picker', 'Preferred Provider'))
add('sig0082', R, 'report_type', ['detail', 'unsigned', 'missing'],
    notes='Selects the report variant (legacy Patient Progress Notes / Unsigned / Missing Progress Notes).',
    expect=('PROGRESS NOTES TO PRINT', 'radio_group', ''))
add('sig0083', R, 'date_basis', ['service_date', 'created_date', 'appointment_date'],
    notes='The Appointment Date option is greyed while PROGRESS NOTES TO PRINT = Detail.', expect=('DATE RANGE', 'radio_group', ''))
add('sig0084', R, 'appointments_to_include', ['only_missing_progress_notes', 'all'],
    notes='Greyed on Progress Notes while the variant is Detail.', expect=('APPOINTMENTS TO INCLUDE', 'radio_group', ''))
add('sig0085', R, 'page_break_by.patient', notes='Ticked sets page_break_by = patient.',
    expect=('OTHER OPTIONS', 'checkbox', 'Page Break by Patient'))
add('sig0086', R, 'report_by', ['category', 'carrier'], notes='ANALYSIS BY selects the report variant.', expect=('ANALYSIS BY', 'radio_group', ''))
add('sig0087', RE, 'procedure_category_codes', default_map=ALL, notes=PICKER_NOTE, expect=('CATEGORY', 'picker', ''))
add('sig0088', RE, 'carrier_ids', default_map=ALL,
    notes=PICKER_NOTE + ' Greyed on Production Analysis Report while ANALYSIS BY = Category.', expect=('CARRIER', 'picker', ''))
add('sig0089', R, 'patient_has', ['all', 'appointment', 'ledger_transaction', 'progress_notes'], expect=('PATIENT HAS', 'radio_group', ''))
add('sig0090', R, 'missing_items.appointment', expect=('BUT MISSING', 'checkbox', 'Appointment'))
add('sig0091', R, 'missing_items.ledger_transaction', expect=('BUT MISSING', 'checkbox', 'Transaction in Ledger'))
add('sig0092', R, 'missing_items.progress_notes', expect=('BUT MISSING', 'checkbox', 'Progress Notes'))
add('sig0093', R, 'missing_items.progress_notes_with_signature', expect=('BUT MISSING', 'checkbox', 'Progress Notes with Signature'))
add('sig0094', R, 'sort_by', ['date', 'patient_last_name', 'provider'], expect=('SORT BY', 'radio_group', ''))
add('sig0095', R, 'group_by', ['none', 'provider'],
    notes='Vendor screenshot: both radios are greyed on Outstanding Claims when PRINT FORMAT = Excel.', expect=('GROUP BY', 'radio_group', ''))
add('sig0096', RE, 'carrier_ids', default_map=ALL, notes=PICKER_NOTE, expect=('CARRIER', 'picker', 'Carriers'))
add('sig0097', R, 'date_basis', ['transaction_date', 'service_date'], expect=('DATE RANGE', 'radio_group', ''))
PAT_CTX = '[name of the patient open at capture]'
add('sig0098', R, 'patient_name_from', default_map={'AAAAA': 'AAAAA', PAT_CTX: 'current_patient_name'},
    notes='Start of an alphabetical range on the patient sort name (Last, First). AAAAA / ZZZZZ are the legacy open bounds. On '
          'Super Bill both boxes are pre-filled with the patient in context (token current_patient_name = Last, First), which '
          'selects exactly that patient.', expect=('PATIENT NAME RANGE', 'text_input', 'Start Name'))
add('sig0099', SUP, 'patient_name.search', notes=SEARCH_NOTE, ptype='action', expect=('PATIENT NAME RANGE', 'button', 'SEARCH'))
add('sig0100', R, 'patient_name_to', default_map={'ZZZZZ': 'ZZZZZ', PAT_CTX: 'current_patient_name'},
    notes='End of the alphabetical range on the patient sort name (inclusive, prefix rule). Vendor documentation: the same '
          'patient in both boxes limits the report to that patient.', expect=('PATIENT NAME RANGE', 'text_input', 'End Name'))
add('sig0101', RE, 'payment_adjustment_codes', default_map=NONE,
    notes='Include picker whose default is None (no payment or adjustment codes selected); ALL and a list are the other states. '
          'One option source payment_adjustment_codes (payment and adjustment codes in one list, value = kind:code). '
          'Dialog never captured.', expect=('PAYMENT/ADJ CODES', 'picker', ''))
add('sig0102', SUP, 'payment_adjustment_codes.clear', ptype='action',
    notes='NONE button resets the picker to None. Superseded by the None / clear control built into the multi-select.',
    expect=('PAYMENT/ADJ CODES', 'button', 'NONE'))
add('sig0103', UNK, 'insurance_plan_selection', default_map=ALL,
    notes='One picker, two kinds of rows (vendor documentation: specific insurance plans or sub types medical / dental). Mapped as '
          'one parameter whose option source insurance_plans_and_subtypes returns typed values plan:<id>, subtype:dental, '
          'subtype:medical; ALL = no restriction. The dialog was never captured: confirm its rows, grouping and selection rules on '
          'the live tool.', expect=('INSURANCE PLANS/SUB TYPES', 'picker', ''))
add('sig0104', R, 'code_scope.mode', ['code', 'category'], notes='Chooses whether the picker below lists procedure codes or categories.',
    expect=('CODE/CATEGORY', 'radio_group', ''))
add('sig0105', RE, 'code_scope.selection', default_map=ALL,
    notes='Procedure codes (mode code) or procedure categories (mode category). ' + PICKER_NOTE, expect=('CODE/CATEGORY', 'picker', ''))
add('sig0106', SUP, 'code_scope.clear', ptype='action',
    notes='NONE button sets the selection to none. Superseded by the None / clear control built into the multi-select.',
    expect=('CODE/CATEGORY', 'button', 'NONE'))
add('sig0107', R, 'age_range_enabled', notes='Gate of the age range: the From / To boxes apply only when ticked.',
    expect=('OTHER OPTIONS', 'checkbox', 'Age Range'))
add('sig0108', R, 'age_from', default_map={'0': 0},
    notes='Lower age bound in years, inclusive; 0 is the legacy open bound (no predicate). Applies only while Age Range is ticked.',
    expect=('OTHER OPTIONS', 'number_input', 'From'))
add('sig0109', R, 'age_to', default_map={'999': 999},
    notes='Upper age bound in years, inclusive; 999 is the legacy open bound (no predicate). Applies only while Age Range is ticked.',
    expect=('OTHER OPTIONS', 'number_input', 'To'))
add('sig0110', UNK, 'amount_operator', default_map={'All Amount': 'all'},
    notes=COLLAPSED + 'Expected: All Amount plus comparison operators.', expect=('OTHER OPTIONS', 'dropdown', 'Amount'))
add('sig0111', R, 'amount_value', default_map={'0': '0.00'},
    notes='Comparison amount for the Amount dropdown. Greyed while the dropdown shows All Amount.',
    expect=('OTHER OPTIONS', 'number_input', ''))
add('sig0112', R, 'group_by', ['code', 'user', 'insurance_plan', 'transaction_provider'],
    notes='Row label Group By inside OTHER OPTIONS. Vendor documentation shows a further Sort By row below it that our capture cuts off.',
    expect=('OTHER OPTIONS', 'radio_group', 'Group By'))
# insurance
add('sig0113', R, 'claim_kind', ['claims', 'pre_authorization'], expect=('CLAIM/PRE-AUTH', 'radio_group', ''))
add('sig0114', R, 'claim_type', ['both', 'dental', 'medical'], expect=('CLAIM TYPE', 'radio_group', ''))
add('sig0115', R, 'patient_name_from', default_map={'AAAAA': 'AAAAA'},
    notes='Start of an alphabetical range on the patient sort name. The legacy title does not say whose name; the vendor sample '
          'footer prints Pat From / Thru, so it is the patient name range (same parameter as PATIENT NAME RANGE).', expect=('NAME RANGE', 'text_input', 'Start Name'))
add('sig0116', SUP, 'patient_name.search', notes=SEARCH_NOTE, ptype='action', expect=('NAME RANGE', 'button', 'SEARCH'))
add('sig0117', R, 'patient_name_to', default_map={'ZZZZZ': 'ZZZZZ'}, notes='End of the alphabetical range on the patient sort name (inclusive, prefix rule).',
    expect=('NAME RANGE', 'text_input', 'End Name'))
add('sig0118', R, 'claim_amount_min', default_map={'0.00': '0.00'}, notes='Claim amount >= value.',
    expect=('CLAIM AMOUNT OVER OR EQUAL TO', 'number_input', ''))
add('sig0119', R, 'claim_sent_types.eclaim', expect=('CLAIM SENT TYPE', 'checkbox', 'EClaim'))
add('sig0120', R, 'claim_sent_types.paper', expect=('CLAIM SENT TYPE', 'checkbox', 'Paper'))
add('sig0121', R, 'include_resolved_claims', expect=('OTHER OPTIONS', 'checkbox', 'Include Resolved Claims'))
add('sig0122', R, 'facility_id', default_map={'': ''}, expect=('FACILITY ID', 'text_input', ''))
add('sig0123', R, 'include_ucr', notes='Section header and checkbox carry the same words.', expect=('INCLUDE UCR', 'checkbox', 'Include UCR'))
add('sig0124', R, 'print_all_codes', expect=('OTHER OPTIONS', 'checkbox', 'Print All Codes'))
add('sig0125', R, 'include_fees_charged', expect=('OTHER OPTIONS', 'checkbox', 'Include Fees Charged'))
add('sig0126', R, 'print_office_address', expect=('OTHER OPTIONS', 'checkbox', 'Print Office Address'))
add('sig0127', R, 'show_billing_provider_for_hygienist', expect=('OTHER OPTIONS', 'checkbox', 'Show Billing Provider For Hygienist'))
add('sig0128', RE, 'date_from', default_map=TODAY, notes=fixed_basis('created_date'), expect=('CREATED ON DATE RANGE', 'date_input', 'Start Date'))
add('sig0129', RE, 'date_to', default_map=TODAY, notes=fixed_basis('created_date'), expect=('CREATED ON DATE RANGE', 'date_input', 'End Date'))
add('sig0130', R, 'eligibility_on_hold', expect=('DPS ELIGIBILITY', 'checkbox', 'On Hold'))
add('sig0131', R, 'date_range_type', ['appointment_date', 'appointment_created_date', 'both'],
    notes='Chooses which of the two date ranges applies; Both applies both.', expect=('DATE RANGE TYPE', 'radio_group', ''))
add('sig0132', RE, 'appointment_created_date_from', default_map=TODAY,
    notes='Secondary date range on the appointment creation date. Greyed while DATE RANGE TYPE = Appointment Date. ' + DATE_NOTE,
    expect=('APPOINTMENT CREATED DATE RANGE', 'date_input', 'Start Date'))
add('sig0133', RE, 'appointment_created_date_to', default_map=TODAY,
    notes='Secondary date range, inclusive end. Greyed while DATE RANGE TYPE = Appointment Date. ' + DATE_NOTE,
    expect=('APPOINTMENT CREATED DATE RANGE', 'date_input', 'End Date'))
add('sig0134', R, 'include_patients_with_no_insurance', expect=('OTHER OPTIONS', 'checkbox', 'Include patients with no insurance'))
add('sig0135', R, 'report_type', ['treatment_plan', 'recall'], notes='Selects the report variant.', expect=('TREATMENT PLAN/RECALL', 'radio_group', ''))
ANN = 'ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.)'
add('sig0136', RE, 'date_from', default_map={'12/01/2026': 'start_of_next_month'},
    notes='Primary date range with fixed date_basis = anniversary_date. Default is the first day of next month, not today. '
          'Header note (* UPCOMING BENEFIT ROLLOVER PERIOD.) is kept as help text.', expect=(ANN, 'date_input', 'Start Date'))
add('sig0137', RE, 'date_to', default_map={'11/30/2027': 'start_of_next_month+1y-1d'},
    notes='Primary date range, inclusive end, fixed date_basis = anniversary_date. Default = start date plus one year minus one day.',
    expect=(ANN, 'date_input', 'End Date'))
add('sig0138', RE, 'exclude_resp_party_type_codes', default_map=NONE, notes=EXCL_NOTE, expect=('EXCLUDE RESPONSIBLE PARTY TYPE', 'picker', ''))
for sid, mem, lab in (('sig0139', 'current', 'Current'), ('sig0140', 'over_30', 'Over 30'), ('sig0141', 'over_60', 'Over 60'),
                      ('sig0142', 'over_90', 'Over 90'), ('sig0143', 'over_120', 'Over 120')):
    add(sid, R, f'aging_buckets.{mem}', notes='Aging bucket checkbox (claims) placed under OTHER OPTIONS on Outstanding Claims.',
        expect=('OTHER OPTIONS', 'checkbox', lab))
add('sig0144', R, 'date_basis', ['all', 'service_date', 'transaction_date'],
    notes='ALL = no date restriction; the Report Date box below is greyed while ALL is selected.', expect=('REPORT DATE', 'radio_group', ''))
for sid, mem, lab in (('sig0145', 'primary', 'Primary'), ('sig0146', 'secondary', 'Secondary'), ('sig0147', 'tertiary', 'Tertiary'),
                      ('sig0148', 'quaternary', 'Quaternary')):
    add(sid, R, f'coverage_orders.{mem}', notes='On Claims Not Created the CLAIM TYPE title means coverage order, not dental / medical.',
        expect=('CLAIM TYPE', 'checkbox', lab))
add('sig0149', R, 'claim_matching_status', ['both', 'matched', 'unmatched'], expect=('835 CLAIM MATCHING STATUS', 'radio_group', ''))
add('sig0150', R, 'claim_status', ['all', 'partial_closed', 'closed'], expect=('CLAIM STATUS', 'radio_group', ''))
add('sig0151', R, 'date_basis', ['payment_date', 'file_received_date'], expect=('DATE RANGE', 'radio_group', ''))
add('sig0152', R, 'show_details_ucr', expect=('OTHER OPTIONS', 'checkbox', 'Show Details UCR'))
add('sig0153', RE, 'exclude_reason_codes', default_map=NONE,
    notes=EXCL_NOTE + ' Reason codes of 835 remittances; no such catalog exists yet (new lookup).', expect=('EXCLUDE REASON CODE', 'picker', ''))
# ledger
add('sig0154', R, 'report_type', ['account_ledger', 'patient_ledger'],
    notes='Legacy title is REPORT FORMAT, but the choice selects the report variant (account versus patient ledger), so it maps '
          'to report_type. Only the Account Ledger state was captured. Vendor documentation: the patient ledger is run by selecting '
          'the patient, so Patient Ledger shows a patient selector (patient_id) in place of the responsible party.',
    expect=('REPORT FORMAT', 'radio_group', ''))
add('sig0155', R, 'account_id', default_map={'[responsible party open at capture]': 'current_account'},
    notes='One responsible party = one guarantor account (value accounts.id), shown as Last, First. Pre-filled with the account of '
          'the patient in context (token current_account). Required, except on Ledger Report with REPORT FORMAT = Patient Ledger, '
          'where the patient is selected instead (vendor documentation).',
    expect=('RESPONSIBLE PARTY', 'text_input', 'Responsible Party'))
add('sig0156', SUP, 'account_id.search', notes=SEARCH_NOTE, ptype='action', expect=('RESPONSIBLE PARTY', 'button', 'SEARCH'))
add('sig0157', R, 'print_all_transactions', expect=('OTHER OPTIONS', 'checkbox', 'Print all transactions (includes statements, ledger notes)'))
add('sig0158', R, 'responsible_party_name_from', default_map={'AAAAA': 'AAAAA', PAT_CTX: 'current_responsible_party_name'},
    notes='Start of an alphabetical range on the responsible-party sort name (Last, First of the guarantor). AAAAA / ZZZZZ are the '
          'legacy open bounds. On Walkout Report both boxes are pre-filled from the patient in context (token '
          'current_responsible_party_name); whether the legacy tool writes the patient or the guarantor is to confirm with a dependent.', expect=('RESPONSIBLE PARTY NAME RANGE', 'text_input', 'Start Name'))
add('sig0159', SUP, 'responsible_party_name.search', notes=SEARCH_NOTE, ptype='action', expect=('RESPONSIBLE PARTY NAME RANGE', 'button', 'SEARCH'))
add('sig0160', R, 'responsible_party_name_to', default_map={'ZZZZZ': 'ZZZZZ', PAT_CTX: 'current_responsible_party_name'},
    notes='End of the range on the responsible-party sort name (inclusive, prefix rule).', expect=('RESPONSIBLE PARTY NAME RANGE', 'text_input', 'End Name'))
add('sig0161', R, 'show_charges_breakdown', expect=('OTHER OPTIONS', 'checkbox', 'Show charges break down'))
add('sig0162', R, 'transaction_types.adjustments', notes='Singular spelling of the Adjustments member.',
    expect=('TRANSACTION TYPES', 'checkbox', 'Adjustment'))
# management
add('sig0163', RE, 'billing_date', default_map=TODAY, notes='Single date. ' + DATE_NOTE, expect=('REPORT DATE', 'date_input', 'Billing Date'))
add('sig0164', R, 'plan_type', ['regular', 'ortho'], expect=('PLAN TYPE', 'radio_group', ''))
for sid, mem, lab in (('sig0165', 'patient', 'Ortho Patient'), ('sig0166', 'primary', 'Ortho Primary'), ('sig0167', 'secondary', 'Ortho Secondary')):
    add(sid, R, f'ortho_plan_parts.{mem}', notes='Greyed while PLAN TYPE = Regular.', expect=('OTHER OPTIONS', 'checkbox', lab))
add('sig0168', R, 'patient_balance_over', default_map={'0.00': '0.00'}, notes='Patient balance > value.',
    expect=('OTHER OPTIONS', 'number_input', 'Patient Balance Greater Than'))
add('sig0169', RE, 'user_ids', default_map=ALL, notes=PICKER_NOTE, expect=('USER', 'picker', 'User'))
add('sig0170', RE, 'patient_ids', default_map={'': 'all'},
    notes='Patient lookup box as an optional filter (Audit Trail: restrict to one patient, empty = all). On Patient\'s Notes the same '
          'box is a mandatory single patient: control override to patient_id.', expect=('PATIENT', 'text_input', 'Patient'))
add('sig0171', SUP, 'patient_ids.search', notes=SEARCH_NOTE, ptype='action', expect=('PATIENT', 'button', 'SEARCH'))
add('sig0172', UNK, 'audit_type', default_map=ALL, notes=COLLAPSED, expect=('OTHER OPTIONS', 'dropdown', 'Audit Type'))
add('sig0173', UNK, 'module_type', default_map=ALL, notes=COLLAPSED, expect=('OTHER OPTIONS', 'dropdown', 'Module Type'))
add('sig0174', R, 'report_format', ['detail', 'summary', 'employee_total_only'], expect=('REPORT FORMAT', 'radio_group', ''))
add('sig0175', R, 'group_by.office', notes='Ticked sets group_by = office. Greyed while a single office is selected.',
    expect=('OTHER OPTIONS', 'checkbox', 'Group By Office'))
# monthly
add('sig0176', R, 'group_by.provider', notes='Ticked sets group_by = provider and enables the provider basis radio and the Provider picker.',
    expect=('PROVIDER', 'checkbox', 'GROUP BY PROVIDER'))
add('sig0177', R, 'provider_basis', ['preferred_provider', 'transaction_provider'], notes='Greyed until GROUP BY PROVIDER is ticked.',
    expect=('PROVIDER', 'radio_group', ''))
add('sig0178', R, 'aging_by', ['account_ar', 'patient_ar'], notes='Patient AR also renames the threshold to Patient Balance Over.',
    expect=('AGING BY', 'radio_group', ''))
add('sig0179', R, 'account_balance_over', default_map={'0.00': '0.00'}, notes='Balance > value.',
    expect=('AGING BY', 'number_input', 'Account Balance Over'))
add('sig0180', R, 'only_credit_balances', notes='Sits inside the AGING section header bar.', expect=('AGING', 'checkbox', 'SHOW ONLY CREDIT BALANCES'))
for sid, mem, lab in (('sig0181', 'current', 'Current'), ('sig0182', 'over_30', 'Over 30'), ('sig0183', 'over_60', 'Over 60'),
                      ('sig0184', 'over_90', 'Over 90'), ('sig0185', 'over_120', 'Over 120')):
    add(sid, R, f'aging_buckets.{mem}', notes='Aging bucket checkbox. Vendor documentation: Excel output shows Over 120+ in place of Over 120.',
        expect=('AGING', 'checkbox', lab))
add('sig0186', R, 'include_credit_balances', expect=('AGING', 'checkbox', 'Include Credit Balance'))
add('sig0187', R, 'exclude_sent_to_collection', expect=('OTHER OPTIONS', 'checkbox', 'Exclude patients sent to collection.'))
add('sig0188', R, 'exclude_insurance_expected_accounts',
    expect=('OTHER OPTIONS', 'checkbox', 'Exclude accounts where patient portion is paid & insurance portion is expected.'))
add('sig0189', R, 'include_balance_status', expect=('OTHER OPTIONS', 'checkbox', 'Include Balance Status'))
add('sig0190', R, 'include_contract_balances', expect=('OTHER OPTIONS', 'checkbox', 'Include Contract Balances'))
add('sig0191', R, 'sort_by', ['responsible_party_last_name', 'responsible_party_id'],
    notes='Row clipped in our captures (labels read as best effort); vendor screenshots confirm both labels and that SORT BY '
          'is the last section. Re-check on the live tool.', expect=('SORT BY', 'radio_group', ''))
add('sig0192', R, 'print_all_unallocated_as_of_today', notes='When ticked the date range is ignored (as-of snapshot) and both date boxes are disabled.',
    expect=('DATE RANGE', 'checkbox', 'Print all unallocated payment/adjustments as of today'))
add('sig0193', R, 'exclude_credit_balances', expect=('OTHER OPTIONS', 'checkbox', 'Exclude Credit Balances'))
add('sig0194', R, 'include_inactive_patients', expect=('OTHER OPTIONS', 'checkbox', 'Include Inactive Patients'))
add('sig0195', R, 'payment_adjustment_scope', ['payments_and_adjustments', 'payments_only', 'adjustments_only'], expect=('OTHER OPTIONS', 'radio_group', ''))
# my reports
add('sig0196', UNK, 'report_by',
    default_map={'User': 'user', 'Appointment': 'appointment', 'Day': 'day', 'Attached to Provider': 'attached_to_provider', 'Created Date': 'created_date'},
    notes=COLLAPSED + 'Five reports show five different defaults, so the list differs per report (My Daily Journal: User; '
          'Patient List - New Patient: Appointment; Patients Seen: Day; Patient List - Grouped By: Attached to Provider; '
          'Responsible Party List: Created Date). Vendor screenshots give three of the five lists: Patient List - New Patient = '
          'Appointment, Carrier, Created Date / First Visit Date, Referral, Referral Type; Patient List - Grouped By = Attached to '
          'Provider, Birthdate, Carrier, Employer, Fee Schedule, HIPAA Agreement, Insurance Plan, Last Visit, Medical Alert, '
          'Patient Type, Preferred Provider, Uninsured, Zip Code; Responsible Party List = Balance, Balance Aged Over X Days, '
          'Created Date, Resp. Party Type, Send Statement Status, Zip. Several values swap criteria (Last Visit, Send Statement '
          'Status, Balance Aged Over X Days). Still unread: My Daily Journal, Patients Seen.', expect=('REPORT BY', 'dropdown', ''))
add('sig0197', R, 'patient_identifier', ['patient_id', 'chart_no'], expect=('PRINT', 'radio_group', ''))
add('sig0198', R, 'show_datewise_summary', notes='Same option as Show Datewise Summary (vendor documentation).',
    expect=('OTHER OPTIONS', 'checkbox', 'Show Datewise Distribution'))
add('sig0199', R, 'date_basis', ['appointment_date', 'created_date'], expect=('APPOINTMENT DATE RANGE', 'radio_group', ''))
add('sig0200', R, 'corresponding_provider_id', default_map={'': 'current_user_report_provider'},
    notes='Read-only display of the provider linked to the logged-in user (Report Access Provider); the value comes from validate '
          '(display_source caller_report_provider). The run itself is limited by the hidden forced provider_ids. Empty when the user '
          'has no link: the run is refused.', expect=('CORRESPONDING PROVIDER', 'text_input', ''))
add('sig0201', R, 'report_by', ['code', 'provider', 'category'], notes='PRODUCTION BY selects the report variant.', expect=('PRODUCTION BY', 'radio_group', ''))
add('sig0202', UNK, 'compare_fee_schedule_id', default_map={'CIGNA PPO HAMILTON ( 128 )': 'first_option'},
    notes='Row label Fee Schedule inside FEE SCHEDULE TO COMPARE. Same parameter as Fee Schedule To Compare, same unconfirmed '
          'default rule (candidate first_option). Greyed until Include UCR is ticked. List captured collapsed.',
    expect=('FEE SCHEDULE TO COMPARE', 'dropdown', 'Fee Schedule'))
add('sig0203', HELP, 'compare_fee_schedule_id', ptype='',
    notes='Info icon after the Fee Schedule label; tooltip text not visible - capture it on the live tool and keep it as help text.',
    expect=('FEE SCHEDULE TO COMPARE', 'other', ''))
# ortho
add('sig0204', R, 'weeks_since_last_visit', default_map={'6': 6}, expect=('NUMBER OF WEEKS SINCE LAST VISIT', 'number_input', ''))
add('sig0205', RE, 'date_from', default_map=TODAY, notes=fixed_basis('ortho_visit_date'), expect=('VISIT DATE', 'date_input', 'Start Date'))
add('sig0206', RE, 'date_to', default_map=TODAY, notes=fixed_basis('ortho_visit_date'), expect=('VISIT DATE', 'date_input', 'End Date'))
OPT_RANGE = 'Optional attribute range: blank = no restriction. Not the primary date range. '
add('sig0207', RE, 'ortho_start_date_from', default_map={'': None, '11/21/2026': 'today'},
    notes=OPT_RANGE + 'Default blank on Patients by Ortho Status with Time in Treatment, today on Ortho Report.',
    expect=('ORTHO START DATE', 'date_input', 'Start Date'))
add('sig0208', RE, 'ortho_start_date_to', default_map={'': None, '11/21/2026': 'today'},
    notes=OPT_RANGE + 'Default blank on Patients by Ortho Status with Time in Treatment, today on Ortho Report.',
    expect=('ORTHO START DATE', 'date_input', 'End Date'))
ORTHO_LV = 'Vendor documentation: Last Visit on this report = date of service of the last Ortho Treatment Card entry, not the general last visit. '
add('sig0209', RE, 'ortho_last_visit_date_from', default_map={'': None}, notes=OPT_RANGE + ORTHO_LV, expect=('PATIENT LAST VISIT', 'date_input', 'Start Date'))
add('sig0210', RE, 'ortho_last_visit_date_to', default_map={'': None}, notes=OPT_RANGE + ORTHO_LV, expect=('PATIENT LAST VISIT', 'date_input', 'End Date'))
add('sig0211', RE, 'ortho_status_codes', default_map=ALL,
    notes=PICKER_NOTE + ' The ortho status value list is not shown in any source and no vocabulary exists yet (new lookup).',
    expect=('ORTHO STATUS', 'picker', ''))
ORTHO_FV = 'Vendor documentation: First Visit on Ortho Report = first Ortho Treatment Card entry, not the first visit to the practice. '
add('sig0212', RE, 'ortho_first_visit_date_from', default_map=TODAY, notes=OPT_RANGE + ORTHO_FV + DATE_NOTE, expect=('PATIENT FIRST VISIT', 'date_input', 'Start Date'))
add('sig0213', RE, 'ortho_first_visit_date_to', default_map=TODAY, notes=OPT_RANGE + ORTHO_FV + DATE_NOTE, expect=('PATIENT FIRST VISIT', 'date_input', 'End Date'))
add('sig0214', R, 'missing_items.ledger_transaction', expect=('MISSING', 'checkbox', 'Ledger Transaction'))
add('sig0215', R, 'missing_items.ortho_visit', expect=('MISSING', 'checkbox', 'Ortho Visit'))
add('sig0216', RE, 'appointment_provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('APPOINTMENT PROVIDER', 'picker', 'Appointment Provider'))
add('sig0217', RE, 'visit_doctor_ids', default_map=ALL, notes=PICKER_NOTE, expect=('VISIT DOCTOR', 'picker', 'Visit Doctor'))
# patient lists
add('sig0218', R, 'report_format', ['summary', 'detail'], notes='REPORT TYPE with Summary / Detail is the report format spelled differently.',
    expect=('REPORT TYPE', 'radio_group', ''))
add('sig0219', R, 'patient_status', ['active', 'inactive', 'both'], expect=('PATIENT STATUS', 'radio_group', ''))
add('sig0220', RE, 'include_patient_type_codes', default_map=ALL, notes=PICKER_NOTE, expect=('INCLUDE PATIENT TYPE', 'picker', ''))
add('sig0221', UNK, 'gender', default_map={'------': 'all'},
    notes=COLLAPSED + 'The six hyphens are a no-selection placeholder (= all).', expect=('SEX', 'dropdown', ''))
add('sig0222', R, 'age_from', default_map={'': None}, notes='Lower age bound in years, inclusive; blank = no lower bound.',
    expect=('AGE RANGE', 'number_input', 'From'))
add('sig0223', R, 'age_to', default_map={'': None}, notes='Upper age bound in years, inclusive; blank = no upper bound.',
    expect=('AGE RANGE', 'number_input', 'To'))
add('sig0224', R, 'include_patients_with_no_email', expect=('OTHER OPTIONS', 'checkbox', 'Include Patients With No Email'))
add('sig0225', R, 'date_basis', ['transaction_date', 'service_date'], expect=('DATE RANGE', 'radio_group', ''))
add('sig0226', RE, 'note_type_codes', default_map=ALL,
    notes='Vendor documentation: the picker selects the note types to print (list starts ALL, Patient Notes, Resp. Party Notes; '
          'the printed Note Type column shows Patient Notes, Responsible Party Notes, Financial Notes, Chart Notes; footer echo '
          'Note Type, blank when all). ' + PICKER_NOTE, expect=('PRINT NOTES', 'picker', ''))
add('sig0227', RE, 'specialty_codes', default_map=ALL, notes=LOOKUP_DD, expect=('SPECIALTY', 'dropdown', ''))
add('sig0228', RE, 'preferred_provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('PREFERRED PROVIDER', 'picker', 'Preferred Provider'))
add('sig0229', RE, 'date_from', default_map=TODAY, notes=fixed_basis('plan_setup_date'), expect=('PLAN SETUP DATE RANGE', 'date_input', 'Start Date'))
add('sig0230', RE, 'date_to', default_map=TODAY, notes=fixed_basis('plan_setup_date'), expect=('PLAN SETUP DATE RANGE', 'date_input', 'End Date'))
add('sig0231', UNK, 'credit_card_on_file', default_map={'Both': 'both'}, notes=COLLAPSED + 'Expected: Both / Yes / No.',
    expect=('CREDIT CARD ON FILE', 'dropdown', ''))
add('sig0232', RE, 'date_from', default_map=TODAY, notes=fixed_basis('created_date'), expect=('CREATED DATE RANGE', 'date_input', 'Start Date'))
add('sig0233', RE, 'date_to', default_map=TODAY, notes=fixed_basis('created_date'), expect=('CREATED DATE RANGE', 'date_input', 'End Date'))
add('sig0234', R, 'include_inactive_accounts', expect=('OTHER OPTIONS', 'checkbox', 'Include Inactive Accounts (All patients inactive in account)'))
add('sig0235', R, 'account_balance_from', default_map={'0.00': '0.00'}, notes='Lower bound, inclusive.', expect=('ACCOUNT BALANCE RANGE', 'number_input', 'Start'))
add('sig0236', R, 'account_balance_to', default_map={'999999.99': '999999.99'}, notes='Upper bound, inclusive.', expect=('ACCOUNT BALANCE RANGE', 'number_input', 'End'))
add('sig0237', R, 'statement_type', ['paper', 'email', 'both'],
    notes='Email and Both are greyed in the only capture (reason not shown).', expect=('STATEMENT TYPE', 'radio_group', ''))
add('sig0238', RE, 'statement_date', default_map=TODAY, notes='Single date. ' + DATE_NOTE, expect=('STATEMENT DATE', 'date_input', 'Statement Date'))
add('sig0239', RE, 'statement_sent_date', default_map=TODAY, notes='Single date. ' + DATE_NOTE, expect=('STATEMENT SENT DATE', 'date_input', 'Statement Sent Date'))
# provider lists
add('sig0240', RE, 'state_codes', default_map=ALL, notes=LOOKUP_DD + ' Static list of states.', expect=('STATE', 'dropdown', ''))
add('sig0241', RE, 'date_from', default_map=TODAY,
    notes='Primary date range. Legacy title LAST VISIT DATE RANGE is a mislabel on Provider Holidays: the range is the holiday date '
          '(date_basis = holiday_date). ' + DATE_NOTE, expect=('LAST VISIT DATE RANGE', 'date_input', 'Start Date'))
add('sig0242', RE, 'date_to', default_map=TODAY,
    notes='Primary date range, inclusive end; date_basis = holiday_date (legacy title is a mislabel). ' + DATE_NOTE,
    expect=('LAST VISIT DATE RANGE', 'date_input', 'End Date'))
# recall
add('sig0243', RE, 'date_from', default_map=TODAY, notes=fixed_basis('service_date'), expect=('PROCEDURE DATE RANGE', 'date_input', 'Start Date'))
add('sig0244', RE, 'date_to', default_map=TODAY, notes=fixed_basis('service_date'), expect=('PROCEDURE DATE RANGE', 'date_input', 'End Date'))
add('sig0245', RE, 'transaction_provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('TRANSACTION PROVIDER', 'picker', ''))
add('sig0246', RE, 'recall_procedure_codes', default_map=ALL, notes=PICKER_NOTE + ' Presumably limited to codes flagged as recall codes.',
    expect=('RECALL PROCEDURE CODES', 'picker', ''))
add('sig0247', RE, 'date_from', default_map=TODAY, notes=fixed_basis('scheduled_date'), expect=('SCHEDULED DATE RANGE', 'date_input', 'Start Date'))
add('sig0248', RE, 'date_to', default_map=TODAY, notes=fixed_basis('scheduled_date'), expect=('SCHEDULED DATE RANGE', 'date_input', 'End Date'))
add('sig0249', RE, 'preferred_provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('PREFERRED PROVIDER', 'picker', ''))
add('sig0250', RE, 'preferred_hygienist_ids', default_map=ALL, notes=PICKER_NOTE, expect=('PREFERRED HYGIENIST', 'picker', ''))
add('sig0251', R, 'recall_date_mode', ['recall_date_range', 'no_recall_date'],
    notes='Recall Date Range = range on the recall due date. No Recall Date = patients whose recall has no due date (predicate '
          'recall_due_date IS NULL; the two dates are disabled). The second meaning is the vendor reading and was not captured - confirm.',
    expect=('RECALL DATE RANGE', 'radio_group', ''))
add('sig0252', RE, 'date_from', default_map=TODAY, notes=fixed_basis('recall_due_date'), expect=('RECALL DATE RANGE', 'date_input', 'Start Date'))
add('sig0253', RE, 'date_to', default_map=TODAY, notes=fixed_basis('recall_due_date'), expect=('RECALL DATE RANGE', 'date_input', 'End Date'))
add('sig0254', R, 'scheduled_status', ['all', 'scheduled', 'not_scheduled'], expect=('SCHEDULED/NOT SCHEDULED', 'radio_group', ''))
# referral
FV = 'FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS )'
add('sig0255', RE, 'first_visit_date_from', default_map={'': None},
    notes=OPT_RANGE + 'First visit to the practice (first completed procedure). Header instruction ( LEAVE BLANK FOR ALL PATIENTS ) '
          'is kept as help text.', expect=(FV, 'date_input', 'Start Date'))
add('sig0256', RE, 'first_visit_date_to', default_map={'': None}, notes=OPT_RANGE, expect=(FV, 'date_input', 'End Date'))
add('sig0257', R, 'zip_code_from', default_map={'': ''}, notes='Start of a zip code range; blank = no lower bound.', expect=('ZIP CODE RANGE', 'text_input', 'From'))
add('sig0258', R, 'zip_code_to', default_map={'': ''}, notes='End of the zip code range (inclusive); blank = no upper bound.', expect=('ZIP CODE RANGE', 'text_input', 'Through'))
add('sig0259', RE, 'referral_type_codes', default_map=ALL, notes=LOOKUP_DD, expect=('REFERRAL TYPE', 'dropdown', ''))
add('sig0260', R, 'group_by.zip_code', notes='Ticked sets group_by = zip_code.', expect=('OTHER OPTIONS', 'checkbox', 'Group By Zip Code'))
add('sig0261', RE, 'date_from', default_map=TODAY, notes=fixed_basis('referred_out_date'), expect=('REFERRED OUT DATE RANGE', 'date_input', 'Start Date'))
add('sig0262', RE, 'date_to', default_map=TODAY, notes=fixed_basis('referred_out_date'), expect=('REFERRED OUT DATE RANGE', 'date_input', 'End Date'))
add('sig0263', RE, 'referred_to_ids', default_map=ALL, notes=PICKER_NOTE + ' Same parameter as REFERRED TO.', expect=('REFERRAL OUT TO', 'picker', ''))
add('sig0264', UNK, 'referral_direction', default_map=ALL, notes=COLLAPSED + 'Expected: ALL / Referred To / Referred By.',
    expect=('REFERRED TO/BY', 'dropdown', ''))
add('sig0265', R, 'referred_from_office_scope.mode', ['office', 'office_group'], expect=('REFERRED FROM OFFICE/GROUP', 'radio_group', ''))
add('sig0266', RE, 'referred_from_office_scope.selection', default_map={'108': 'working_office'},
    notes='Offices or office groups the referral came from. 108 = working office.', expect=('REFERRED FROM OFFICE/GROUP', 'picker', ''))
add('sig0267', RE, 'date_from', default_map=TODAY, notes=fixed_basis('referral_date'), expect=('REFERRAL DATE RANGE', 'date_input', 'Start Date'))
add('sig0268', RE, 'date_to', default_map=TODAY, notes=fixed_basis('referral_date'), expect=('REFERRAL DATE RANGE', 'date_input', 'End Date'))
add('sig0269', RE, 'referred_from_provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('REFERRED FROM PROVIDER', 'picker', ''))
add('sig0270', RE, 'referred_to_ids', default_map=ALL, notes=PICKER_NOTE + ' External party the patient was referred to.', expect=('REFERRED TO', 'picker', ''))
add('sig0271', RE, 'procedure_codes', default_map=ALL, notes=PICKER_NOTE, expect=('PROCEDURE CODES', 'picker', ''))
add('sig0272', RE, 'user_ids', default_map=ALL, notes=PICKER_NOTE, expect=('USERS', 'picker', ''))
STAT = (('sig0273', 'all', 'All'), ('sig0274', 'accepted', 'Accepted'), ('sig0275', 'rejected', 'Rejected'), ('sig0276', 'pending', 'Pending'),
        ('sig0277', 'cancelled', 'Cancelled'), ('sig0278', 'completed', 'Completed'), ('sig0279', 'in_progress', 'In Progress'),
        ('sig0280', 'not_needed', 'Not Needed'), ('sig0281', 'expired', 'Expired'))
for sid, mem, lab in STAT:
    add(sid, R, f'referral_statuses.{mem}',
        notes=('All box of the status grid: ticked = the scalar value all (no status restriction); never a member of the list.' if mem == 'all' else
               'Member of the status checkbox grid; applies when All is unticked.'), expect=('STATUSES', 'checkbox', lab))
add('sig0282', R, 'referred_to_office_scope.mode', ['office', 'office_group'], expect=('REFERRED TO OFFICE/GROUP', 'radio_group', ''))
add('sig0283', RE, 'referred_to_office_scope.selection', default_map={'ALL': 'all', '108': 'working_office'},
    notes='Offices or office groups the referral was sent to. Default ALL on Internal Referral Management, working office on '
          'External Incoming Referral Management.', expect=('REFERRED TO OFFICE/GROUP', 'picker', ''))
add('sig0284', RE, 'referred_to_provider_ids', default_map=ALL, notes=PICKER_NOTE + ' Legacy header is misspelt REFFERED.',
    expect=('REFFERED TO PROVIDER', 'picker', ''))
add('sig0285', R, 'referral_completion', ['all', 'completed', 'incomplete'], expect=('STATUSES', 'radio_group', ''))
add('sig0286', R, 'exclude_deleted_referrals', expect=('STATUSES', 'checkbox', 'Exclude Deleted Referrals'))
add('sig0287', RE, 'referred_to_provider_ids', default_map=ALL, notes=PICKER_NOTE, expect=('REFERRED TO PROVIDER', 'picker', ''))
add('sig0288', RE, 'referred_from_ids', default_map=ALL, notes=PICKER_NOTE + ' External source the referral came from.', expect=('REFERRED FROM', 'picker', ''))
for sid, mem, lab in (('sig0289', 'all', 'All'), ('sig0290', 'no_response', 'No Response'), ('sig0291', 'patient_to_call', 'Patient To Call'),
                      ('sig0292', 'appointment_scheduled', 'Appointment Scheduled'), ('sig0293', 'referral_refused', 'Referral Refused')):
    add(sid, R, f'contact_statuses.{mem}',
        notes=('All box of the contact status grid: ticked = the scalar value all (no restriction); never a member of the list.' if mem == 'all' else
               'Member of the contact status checkbox grid; applies when All is unticked.'), expect=('CONTACT STATUSES', 'checkbox', lab))
# security lists
add('sig0294', R, 'include_inactive_users', expect=('OTHER OPTIONS', 'checkbox', 'Include Inactive Users'))
add('sig0295', RE, 'security_group_ids', default_map=ALL, notes=PICKER_NOTE, expect=('SECURITY GROUP', 'picker', 'Group'))
add('sig0296', R, 'office_scope.mode', ['office', 'office_group'], notes='LOCATION is the OFFICE/GROUP section spelled differently.',
    expect=('LOCATION', 'radio_group', ''))
add('sig0297', RE, 'office_scope.selection', default_map={'108': 'working_office'}, notes='LOCATION is the OFFICE/GROUP section spelled differently.',
    expect=('LOCATION', 'picker', ''))
# setup lists
add('sig0298', RE, 'employer_ids', default_map=ALL, notes=PICKER_NOTE, expect=('EMPLOYER', 'picker', ''))
add('sig0299', R, 'sort_by', ['carrier', 'employer'], expect=('SORT BY', 'radio_group', ''))
add('sig0300', R, 'date_basis_set.created_date', notes='Checkbox pair: the date range applies to the created-on and / or the modified-on date. Both ticked = created or modified in the range; none ticked = no date restriction (both to confirm).',
    expect=('DATE RANGE', 'checkbox', 'Created On'))
add('sig0301', R, 'date_basis_set.modified_date', notes='Checkbox pair: the date range applies to the created-on and / or the modified-on date. Both ticked = created or modified in the range; none ticked = no date restriction (both to confirm).',
    expect=('DATE RANGE', 'checkbox', 'Modified On'))
add('sig0302', R, 'include_user_in_filters', notes='When ticked the user picker below applies.', expect=('USER', 'checkbox', 'Include User in Filters'))
add('sig0303', RE, 'user_ids', default_map=ALL, notes=PICKER_NOTE, expect=('USER', 'picker', ''))
add('sig0304', R, 'group_number', default_map={'': ''}, expect=('GROUP #', 'text_input', ''))
add('sig0305', RE, 'procedure_category_codes', default_map=ALL, notes=LOOKUP_DD, expect=('CATEGORY', 'dropdown', ''))
add('sig0306', RE, 'production_type_ids', default_map=ALL, notes=LOOKUP_DD, expect=('PRODUCTION TYPE', 'dropdown', ''))
add('sig0307', R, 'procedure_code_status', ['active', 'inactive', 'both'], expect=('STATUS', 'radio_group', ''))
add('sig0308', R, 'include_only_tooth_required', expect=('OTHER OPTIONS', 'checkbox', 'Include Only Tooth Required'))
add('sig0309', R, 'include_only_surface_required', expect=('OTHER OPTIONS', 'checkbox', 'Include Only Surface Required'))
add('sig0310', R, 'include_only_bill_to_insurance', expect=('OTHER OPTIONS', 'checkbox', 'Include Only Bill to Insurance'))
add('sig0311', R, 'report_format', ['summary', 'detail'], notes='SUMMARY/DETAIL is the report format spelled differently.',
    expect=('SUMMARY/DETAIL', 'radio_group', ''))
add('sig0312', R, 'procedure_code_types.dental', expect=('PROCEDURE CODE TYPE', 'checkbox', 'Dental'))
add('sig0313', R, 'procedure_code_types.medical', expect=('PROCEDURE CODE TYPE', 'checkbox', 'Medical'))
add('sig0314', R, 'procedure_code_types.other', expect=('PROCEDURE CODE TYPE', 'checkbox', 'Other'))
add('sig0315', RE, 'fee_schedule_ids', default_map={'CIGNA PPO HAMILTON': 'first_option', 'ALL': 'all'},
    notes=LOOKUP_DD + ' This mapping is the list filter of Fee Schedule List (default ALL). On Procedure Codes by Fee Schedule the '
          'same dropdown is the single schedule whose fees are printed: control override to fee_schedule_id.', expect=('FEE SCHEDULE', 'dropdown', ''))
add('sig0316', UNK, 'fee_schedule_effective_date', default_map={'01/01/2020': 'first_option'},
    notes='Dropdown (not a calendar box) captured collapsed: presumably the effective dates of the fee schedule chosen in '
          'fee_schedule_id (depends_on). Confirm the list and whether the default is the earliest or the latest date.', expect=('EFFECTIVE DATE', 'dropdown', ''))
add('sig0317', UNK, 'credit_code_type', default_map=ALL, notes=COLLAPSED + 'Expected: ALL / Payment / Adjustment (vendor documentation: field Type of a payment or adjustment type).', expect=('TYPE', 'dropdown', ''))
add('sig0318', UNK, 'credit_code_class', default_map=ALL, notes=COLLAPSED + 'Expected: ALL plus the classes of Setup > Payment/Adjustment Types.',
    expect=('CLASS', 'dropdown', ''))
add('sig0319', RE, 'fee_schedule_ids', default_map=ALL, notes=LOOKUP_DD + ' Lookup limited to capitation fee schedules.',
    expect=('CAPITATION FEE SCHEDULE', 'dropdown', ''))
add('sig0320', RE, 'note_macro_category_codes', default_map=ALL, notes=LOOKUP_DD, expect=('MACRO CATEGORY', 'dropdown', ''))
# statements
LT, RT, BT = '[no header] LEFT TABLE', '[no header] RIGHT TABLE', '[no header] BELOW THE TABLES'
add('sig0321', UNK, 'statement_date', default_map={'11/20/2026': 'today'},
    notes='Captured default is one day before the capture date, so the default rule is unconfirmed (today in the office time zone, '
          'previous day or a stored date). Proposed default today - confirm on the live tool.', expect=(LT, 'date_input', 'Statement Date'))
add('sig0322', HELP, 'statement_date', ptype='',
    notes='Info icon after the Statement Date label; tooltip text not visible - capture it on the live tool and keep it as help text.',
    expect=(LT, 'other', ''))
add('sig0323', R, 'run_finance_charges',
    notes='Criteria-area button, not a parameter: a definition action (02 section 3.10, scope criteria, kind navigate) that opens the '
          'separate finance-charge run statements.finance_charges with its own five criteria (Finance Charge Date, Responsible Party '
          'Range, Exclude Responsible Party Type, Provider, Apply Finance Charge to Patient Portion / Entire Balance). No '
          'finance-charge engine exists yet (new feature).',
    expect=(LT, 'button', 'FINANCE CHARGES'))
add('sig0324', HELP, 'responsible_party_name_from', ptype='', notes='Row caption of the Start Name / End Name pair; kept as the label of the range control.',
    expect=(LT, 'static_text', 'Responsible Party Range'))
add('sig0325', R, 'responsible_party_name_from', default_map={'AAAAA': 'AAAAA'}, notes='Start of the responsible-party last-name range.',
    expect=(LT, 'text_input', 'Start Name'))
add('sig0326', SUP, 'responsible_party_name.search', notes=SEARCH_NOTE, ptype='action', expect=(LT, 'button', 'SEARCH'))
add('sig0327', R, 'responsible_party_name_to', default_map={'ZZZZZ': 'ZZZZZ'}, notes='End of the responsible-party last-name range (inclusive).',
    expect=(LT, 'text_input', 'End Name'))
add('sig0328', R, 'account_balance_over', default_map={'5.00': '5.00'}, notes='Balance > value. Default 5.00 on Statements.',
    expect=(LT, 'number_input', 'Account Balance Over'))
add('sig0329', R, 'include_credit_balances', expect=(LT, 'checkbox', 'Include Credit Balances'))
add('sig0330', R, 'sort_by', ['responsible_party_last_name', 'responsible_party_id'], expect=(LT, 'radio_group', ''))
add('sig0331', R, 'suppress_aging', expect=(LT, 'checkbox', 'Suppress Aging'))
add('sig0332', R, 'hide_insurance_shares', expect=(LT, 'checkbox', 'Hide Insurance Shares'))
add('sig0333', R, 'hide_credit_card_section', expect=(LT, 'checkbox', 'Hide Credit Card Section'))
add('sig0334', R, 'last_statement_date', default_map={'': 'server_value'}, notes='Read-only value supplied by the server (blank in the capture).', expect=(RT, 'static_text', 'Last Statement Date'))
add('sig0335', R, 'last_close_out_date', default_map={'12/31/2019': 'server_value'}, notes='Read-only value supplied by the server (12/31/2019 in the capture).', expect=(RT, 'static_text', 'Last Close Out Date'))
add('sig0336', HELP, 'paper_statement_sent', ptype='', notes='Row caption Print Reports of the PAPER STATEMENT SENT button; kept as its label.',
    expect=(RT, 'static_text', 'Print Reports'))
add('sig0337', UNK, 'paper_statement_sent',
    notes='Criteria-area button, not a parameter: a definition action (02 section 3.10). Greyed in our capture, enabled in vendor '
          'screenshots. What it does is not documented: its row caption Print Reports suggests a report of paper statements sent; '
          '02 section 5.9 treats it as a bulk action over the snapshot of a statement run. Confirm what it does and what enables it.',
    expect=(RT, 'button', 'PAPER STATEMENT SENT'))
add('sig0338', R, 'exclude_statement_sent_within', notes='Checkbox of the sentence: Exclude accounts where statement was sent within last [n] days.',
    expect=(RT, 'checkbox', 'Exclude accounts where statement was sent within last'))
add('sig0339', UNK, 'exclude_statement_sent_within_days', default_map={'0': 0},
    notes=COLLAPSED + 'Number of days of the within-last sentence; captured enabled although the checkbox is unticked, so it carries no enabling rule.',
    expect=(RT, 'dropdown', 'days.'))
add('sig0340', R, 'exclude_insurance_expected_accounts', notes='Default checked on Statements, unchecked on the Aging reports.',
    expect=(RT, 'checkbox', 'Exclude accounts where patient portion is paid and insurance portion is expected'))
add('sig0341', R, 'exclude_sent_to_collection', expect=(RT, 'checkbox', 'Exclude patients Sent to Collection.'))
add('sig0342', R, 'exclude_open_claim_accounts', notes='Vendor documentation: only present when the account feature for holding statements with open claims is on.',
    expect=(RT, 'checkbox', 'Exclude Responsible Parties where the Patient has an open claim'))
add('sig0343', RE, 'exclude_resp_party_type_codes', default_map=NONE, notes=EXCL_NOTE, expect=(RT, 'picker', 'Exclude Responsible Party Type'))
add('sig0344', HELP, '', ptype='',
    notes='Caption of the six statement message boxes (General, Current, Over 30, Over 60, Over 90, Over 120 Message; vendor '
          'documentation), which were not rendered in our capture. Kept as help text of the six text parameters general_message ... '
          'over_120_message (max_length 100).',
    expect=(BT, 'static_text', 'Maximum 100 characters per message'))
add('sig0345', HELP, '', ptype='', notes='Reminder shown above the action buttons; kept as help text beside Update Statement Dates.',
    expect=(BT, 'static_text', 'Note: Please update Statement Dates after Printing respective Office Statements.'))
# treatment plans
add('sig0346', RE, 'date_from', default_map=TODAY, notes=fixed_basis('diagnosed_date'), expect=('DIAGNOSED DATE RANGE', 'date_input', 'Start Date'))
add('sig0347', RE, 'date_to', default_map=TODAY, notes=fixed_basis('diagnosed_date'), expect=('DIAGNOSED DATE RANGE', 'date_input', 'End Date'))
add('sig0348', R, 'treatment_plan_id', default_map={'': ''}, expect=('TREATMENT PLAN ID', 'text_input', ''))
add('sig0349', R, 'phase_id', default_map={'': ''}, expect=('PHASE ID', 'text_input', ''))
add('sig0350', R, 'order_id', default_map={'': ''}, expect=('ORDER ID', 'text_input', ''))
add('sig0351', R, 'financial_disclosure_template_id', default_map={'.Treatment Plan Disclosure': 'first_option'},
    notes='Lookup dropdown captured collapsed. Vendor documentation: lists the letters of type Financial Disclosure assigned to the '
          'office in alphabetical order, and advises prefixing a name with a period to make it the default - so the default rule '
          '(first list entry) is documented, not inferred.',
    expect=('FINANCIAL DISCLOSURE', 'dropdown', ''))
add('sig0352', R, 'include_office_ucr', expect=('OTHER OPTIONS', 'checkbox', 'Include Office UCR'))
add('sig0353', R, 'itemize_prices', expect=('OTHER OPTIONS', 'checkbox', 'Itemize Prices'))
add('sig0354', R, 'print_responsible_party_address', expect=('OTHER OPTIONS', 'checkbox', 'Print Responsible Party Address'))
add('sig0355', R, 'treatment_plan_status',
    ['all', 'diagnosed', 'accepted', 'alternative', 'hold', 'unaccepted', 'pre_authorized_sent', 'scheduled', 'completed', 'referred_out', 'pre_authorized_closed'],
    notes='Single-select status filter; same ten values as the option source treatment_plan_statuses of EXCLUDE TREATMENT PLANS. '
          'The two Pre-Authorized values are pre-authorisation states, not item statuses.',
    expect=('TREATMENT PLANS', 'radio_group', ''))
add('sig0356', RE, 'exclude_treatment_plan_statuses', default_map=NONE,
    notes='Exclude filter on treatment plan statuses (source treatment_plan_statuses: the ten values of treatment_plan_status '
          'without all); None = exclude nothing. Vendor screenshot: the dialog lists the statuses with '
          'codes (Diagnosed D, Hold H, Pre-Authorized Closed PC, Pre-Authorized Sent PS, Referred Out R, Unaccepted U, Completed C, '
          'Scheduled S, and Accepted and Alternative above the visible part) with a NONE tick and search.',
    expect=('EXCLUDE TREATMENT PLANS', 'picker', ''))
add('sig0357', RE, 'tx_counselor_ids', default_map=ALL, notes=PICKER_NOTE + ' Treatment counselor = a user.', expect=('TX COUNSELOR', 'picker', ''))
add('sig0358', R, 'include_internal_plan_id', expect=('OTHER OPTIONS', 'checkbox', 'Include internal plan id'))

