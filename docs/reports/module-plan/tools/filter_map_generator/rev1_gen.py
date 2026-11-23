"""Revision patch 1 for gen_map.py: registry and per-signature mappings. Writes gen_head.py."""
s = open('orig/gen_map.py', encoding='utf-8').read()
n = 0


def rep(old, new, count=1):
    global s, n
    assert s.count(old) == count, (s.count(old), old[:90])
    s = s.replace(old, new)
    n += 1


# ------------------------------------------------------------------ registry
rep("""PAIR('first_visit_date', 'date_range', 'Patient first visit date range', 'dates', 'from', 'to')
PAIR('last_visit_date', 'date_range', 'Patient last visit date range', 'dates', 'from', 'to')
""", """PAIR('first_visit_date', 'date_range', 'First visit date range (first completed procedure)', 'dates', 'from', 'to')
PAIR('ortho_first_visit_date', 'date_range', 'Ortho first visit date range (first Ortho Treatment Card entry)', 'dates', 'from', 'to')
PAIR('ortho_last_visit_date', 'date_range', 'Ortho last visit date range (last Ortho Treatment Card entry)', 'dates', 'from', 'to')
""")
rep("""P('patient_ids', 'entity_multi', 'Patient', 'patients')
P('responsible_party_id', 'entity_single', 'Responsible party', 'patients')
""", """P('patient_ids', 'entity_multi', 'Patient (optional filter)', 'patients')
P('patient_id', 'entity_single', 'Patient (one required patient)', 'patients')
P('account_id', 'entity_single', 'Responsible party (guarantor account)', 'patients')
""")
rep("""P('employer_ids', 'entity_multi', 'Employer', 'insurance')
""", """P('employer_ids', 'entity_multi', 'Employer', 'insurance')
P('insurance_plan_selection', 'entity_multi', 'Insurance plans / sub types', 'insurance')
""")
rep("""P('fee_schedule_ids', 'entity_multi', 'Fee schedule', 'codes')
""", """P('fee_schedule_ids', 'entity_multi', 'Fee schedule (list filter)', 'codes')
P('fee_schedule_id', 'entity_single', 'Fee schedule (one required schedule)', 'codes')
""")
rep("""P('run_finance_charges', 'action', 'Finance charges', 'financial')
P('paper_statement_sent_report', 'action', 'Paper statement sent', 'financial')
""", """# criteria-area buttons: never parameters; they become definition actions (02 section 3.10)
P('run_finance_charges', 'action', 'Finance charges', 'actions')
P('paper_statement_sent_report', 'action', 'Paper statement sent', 'actions')
""")

# ------------------------------------------------------------------ mappings
rep("""add('sig0003', RE, 'office_scope.selection', default_map={'108': 'current_office', 'ALL': 'all'},
    notes='108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). '
          'Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = '
          'groups from Setup > Office Groups (default ALL). Greyed (locked to the current office) on the four Ledger reports and '
          'Referral Source List. The selection becomes the value keys office_ids / office_group_id / all_offices; '
          'tokens current_office, my_offices, all.',""",
    """add('sig0003', RE, 'office_scope.selection', default_map={'108': 'working_office', 'ALL': 'all'},
    notes='108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group). '
          'Vendor documentation: Office = one or more offices the user can access (default the logged-in office); Office Group = '
          'groups from Setup > Office Groups (default ALL). Greyed (locked to the working office) on the four Ledger reports and '
          'display-only on Referral Source List. The selection becomes exactly one of the value keys office_ids / office_group_id / '
          'office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read.',""")
rep("""add('sig0024', R, 'report_format', ['detail', 'summary'],
    notes='Greyed on 835 Denial Report while PRINT FORMAT = Excel (vendor documentation: Excel exists only as Detail).',""",
    """add('sig0024', R, 'report_format', ['detail', 'summary'],
    notes='Greyed on 835 Denial Report while PRINT FORMAT = Excel (vendor documentation: Excel exists only as Detail). On the '
          'Daily Production Report the Detail option alone is greyed until PRODUCTION BY = Provider (option_enabled_when).',""")
rep("""add('sig0038', R, 'report_type', ['all', 'sent_date', 'due_date', 'received_date'],
    notes='Selects which lab date the appointment date range is matched against (vendor documentation; All presumably = '
          'appointment date). Equivalent to the date basis of the existing lab cost report (appointment / sent / due / received).',""",
    """add('sig0038', R, 'date_basis', ['appointment_date', 'lab_sent_date', 'lab_due_date', 'lab_received_date'],
    notes='Legacy title REPORT TYPE, but the radio is the date basis of the APPOINTMENT DATE RANGE below it: it selects which lab '
          'date the range is matched against (vendor documentation). All = appointment date is unverified - confirm on the live tool. '
          'Same choice as date_basis of the existing lab cost report endpoint (appointment / sent / due / received).',""")
rep("""add('sig0040', RE, 'report_date', default_map=TODAY,
    notes='Single date. Role per report: as_of (Aging, Outstanding Claims), single_day (Peg Board Day Sheet), '
          'basis-dependent (Claims Not Created, greyed while the radio is on ALL). ' + DATE_NOTE,""",
    """add('sig0040', RE, 'report_date', default_map=TODAY,
    notes='Single date. Role per report: as_of (Aging, Outstanding Claims), single_day (Peg Board Day Sheet; Claims Not Created, '
          'on the column chosen by date_basis, greyed while the radio is on ALL). ' + DATE_NOTE,""")
rep("""add('sig0056', R, 'compare_fee_schedule_id',
    default_map={'CIGNA PPO HAMILTON ( 128 )': 'first_option', 'CP-40 ( 135 )': 'first_option'},
    notes='Lookup dropdown of fee schedules shown as name ( id ); captured default is tenant data, presumably the first '
          'list entry (inferred - confirm). Greyed until Include UCR is ticked. List captured collapsed.',""",
    """add('sig0056', UNK, 'compare_fee_schedule_id',
    default_map={'CIGNA PPO HAMILTON ( 128 )': 'first_option', 'CP-40 ( 135 )': 'first_option'},
    notes='Lookup dropdown of fee schedules shown as name ( id ), captured collapsed and greyed until Include UCR is ticked. The '
          'default rule is unconfirmed: vendor screenshots of other tenants show other schedules in the same greyed box, so the value '
          'is tenant data, presumably the first list entry (candidate default first_option). The two captured values of one tenant '
          'differ per report, so Capitation Utilization has its own list or default rule (control override). Confirm list order, '
          'list content and default on the live tool.',""")
rep("""add('sig0074', RE, 'patient_ids', default_map={'': 'all'},
    notes='Patient lookup box (header plural PATIENTS, row label Patient). Empty = all patients. Whether legacy accepts '
          'several patients is unknown; the parameter accepts a list.', expect=('PATIENTS', 'text_input', 'Patient'))""",
    """add('sig0074', RE, 'patient_ids', default_map={'': 'all'},
    notes='Patient lookup box (header plural PATIENTS, row label Patient). Vendor documentation: limits the run to one patient; '
          'left blank, a slip prints for every patient with an appointment in the range. Legacy holds one patient; the parameter '
          'accepts a list (enhancement).', expect=('PATIENTS', 'text_input', 'Patient'))""")
rep("""add('sig0098', R, 'patient_name_from', default_map={'AAAAA': 'AAAAA', PAT_CTX: 'current_patient_last_name'},
    notes='Start of an alphabetical last-name range. AAAAA / ZZZZZ are the legacy open bounds. On Ledger reports the box is '
          'pre-filled from the patient in context.', expect=('PATIENT NAME RANGE', 'text_input', 'Start Name'))""",
    """add('sig0098', R, 'patient_name_from', default_map={'AAAAA': 'AAAAA', PAT_CTX: 'current_patient_name'},
    notes='Start of an alphabetical range on the patient sort name (Last, First). AAAAA / ZZZZZ are the legacy open bounds. On '
          'Super Bill both boxes are pre-filled with the patient in context (token current_patient_name = Last, First), which '
          'selects exactly that patient.', expect=('PATIENT NAME RANGE', 'text_input', 'Start Name'))""")
rep("""add('sig0100', R, 'patient_name_to', default_map={'ZZZZZ': 'ZZZZZ', PAT_CTX: 'current_patient_last_name'},
    notes='End of the alphabetical last-name range (inclusive).', expect=('PATIENT NAME RANGE', 'text_input', 'End Name'))""",
    """add('sig0100', R, 'patient_name_to', default_map={'ZZZZZ': 'ZZZZZ', PAT_CTX: 'current_patient_name'},
    notes='End of the alphabetical range on the patient sort name (inclusive, prefix rule). Vendor documentation: the same '
          'patient in both boxes limits the report to that patient.', expect=('PATIENT NAME RANGE', 'text_input', 'End Name'))""")
rep("""add('sig0101', RE, 'payment_adjustment_codes', default_map=NONE,
    notes='Include picker whose default is None (no payment or adjustment codes selected); ALL and a list are the other states. '
          'Dialog never captured.', expect=('PAYMENT/ADJ CODES', 'picker', ''))""",
    """add('sig0101', RE, 'payment_adjustment_codes', default_map=NONE,
    notes='Include picker whose default is None (no payment or adjustment codes selected); ALL and a list are the other states. '
          'One option source payment_adjustment_codes (payment and adjustment codes in one list, value = kind:code). '
          'Dialog never captured.', expect=('PAYMENT/ADJ CODES', 'picker', ''))""")
rep("""add('sig0104', R, 'code_scope.mode'""", """add('sig0103', UNK, 'insurance_plan_selection', default_map=ALL,
    notes='One picker, two kinds of rows (vendor documentation: specific insurance plans or sub types medical / dental). Mapped as '
          'one parameter whose option source insurance_plans_and_subtypes returns typed values plan:<id>, subtype:dental, '
          'subtype:medical; ALL = no restriction. The dialog was never captured: confirm its rows, grouping and selection rules on '
          'the live tool.', expect=('INSURANCE PLANS/SUB TYPES', 'picker', ''))
add('sig0104', R, 'code_scope.mode'""")
rep("""add('sig0108', R, 'age_from', default_map={'0': 0}, notes='Lower age bound in years, inclusive. Greyed while Age Range is unticked.',""",
    """add('sig0108', R, 'age_from', default_map={'0': 0},
    notes='Lower age bound in years, inclusive; 0 is the legacy open bound (no predicate). Applies only while Age Range is ticked.',""")
rep("""add('sig0109', R, 'age_to', default_map={'999': 999}, notes='Upper age bound in years, inclusive. Greyed while Age Range is unticked.',""",
    """add('sig0109', R, 'age_to', default_map={'999': 999},
    notes='Upper age bound in years, inclusive; 999 is the legacy open bound (no predicate). Applies only while Age Range is ticked.',""")
rep("""add('sig0115', R, 'patient_name_from', default_map={'AAAAA': 'AAAAA'},
    notes='Start of an alphabetical last-name range. The legacy title does not say whose name; the vendor sample footer prints '
          'Pat From / Thru, so it is the patient name range (same parameter as PATIENT NAME RANGE).',""",
    """add('sig0115', R, 'patient_name_from', default_map={'AAAAA': 'AAAAA'},
    notes='Start of an alphabetical range on the patient sort name. The legacy title does not say whose name; the vendor sample '
          'footer prints Pat From / Thru, so it is the patient name range (same parameter as PATIENT NAME RANGE).',""")
rep("""add('sig0117', R, 'patient_name_to', default_map={'ZZZZZ': 'ZZZZZ'}, notes='End of the alphabetical last-name range (inclusive).',""",
    """add('sig0117', R, 'patient_name_to', default_map={'ZZZZZ': 'ZZZZZ'}, notes='End of the alphabetical range on the patient sort name (inclusive, prefix rule).',""")
rep("""add('sig0154', R, 'report_type', ['account_ledger', 'patient_ledger'],
    notes='Legacy title is REPORT FORMAT, but the choice selects the report variant (account versus patient ledger), so it maps '
          'to report_type. Only the Account Ledger state was captured.',""",
    """add('sig0154', R, 'report_type', ['account_ledger', 'patient_ledger'],
    notes='Legacy title is REPORT FORMAT, but the choice selects the report variant (account versus patient ledger), so it maps '
          'to report_type. Only the Account Ledger state was captured. Vendor documentation: the patient ledger is run by selecting '
          'the patient, so Patient Ledger shows a patient selector (patient_id) in place of the responsible party.',""")
rep("""add('sig0155', R, 'responsible_party_id', default_map={'[responsible party open at capture]': 'current_responsible_party'},
    notes='One responsible party (single account), required. Pre-filled from the patient / account in context.',""",
    """add('sig0155', R, 'account_id', default_map={'[responsible party open at capture]': 'current_account'},
    notes='One responsible party = one guarantor account (value accounts.id), shown as Last, First. Pre-filled with the account of '
          'the patient in context (token current_account). Required, except on Ledger Report with REPORT FORMAT = Patient Ledger, '
          'where the patient is selected instead (vendor documentation).',""")
rep("""add('sig0156', SUP, 'responsible_party_id.search', notes=SEARCH_NOTE,""", """add('sig0156', SUP, 'account_id.search', notes=SEARCH_NOTE,""")
rep("""add('sig0158', R, 'responsible_party_name_from', default_map={'AAAAA': 'AAAAA', PAT_CTX: 'current_responsible_party_last_name'},
    notes='Start of an alphabetical responsible-party last-name range. AAAAA / ZZZZZ are the legacy open bounds. On Walkout Report '
          'the box is pre-filled from the account in context.',""",
    """add('sig0158', R, 'responsible_party_name_from', default_map={'AAAAA': 'AAAAA', PAT_CTX: 'current_responsible_party_name'},
    notes='Start of an alphabetical range on the responsible-party sort name (Last, First of the guarantor). AAAAA / ZZZZZ are the '
          'legacy open bounds. On Walkout Report both boxes are pre-filled from the patient in context (token '
          'current_responsible_party_name); whether the legacy tool writes the patient or the guarantor is to confirm with a dependent.',""")
rep("""add('sig0160', R, 'responsible_party_name_to', default_map={'ZZZZZ': 'ZZZZZ', PAT_CTX: 'current_responsible_party_last_name'},
    notes='End of the responsible-party last-name range (inclusive).',""",
    """add('sig0160', R, 'responsible_party_name_to', default_map={'ZZZZZ': 'ZZZZZ', PAT_CTX: 'current_responsible_party_name'},
    notes='End of the range on the responsible-party sort name (inclusive, prefix rule).',""")
rep("""add('sig0170', RE, 'patient_ids', default_map={'': 'all'}, notes='Patient lookup box. Empty = all patients.', expect=('PATIENT', 'text_input', 'Patient'))""",
    """add('sig0170', RE, 'patient_ids', default_map={'': 'all'},
    notes='Patient lookup box as an optional filter (Audit Trail: restrict to one patient, empty = all). On Patient\\'s Notes the same '
          'box is a mandatory single patient: control override to patient_id.', expect=('PATIENT', 'text_input', 'Patient'))""")
rep("""add('sig0192', R, 'print_all_unallocated_as_of_today', notes='When ticked the date range is ignored (as-of snapshot).',""",
    """add('sig0192', R, 'print_all_unallocated_as_of_today', notes='When ticked the date range is ignored (as-of snapshot) and both date boxes are disabled.',""")
rep("""add('sig0200', R, 'corresponding_provider_id', default_map={'': 'current_user_report_provider'},
    notes='Read-only display of the provider linked to the logged-in user (Report Access Provider); the run is limited to that '
          'provider. Empty when the user has no link.',""",
    """add('sig0200', R, 'corresponding_provider_id', default_map={'': 'current_user_report_provider'},
    notes='Read-only display of the provider linked to the logged-in user (Report Access Provider); the value comes from validate '
          '(display_source caller_report_provider). The run itself is limited by the hidden forced provider_ids. Empty when the user '
          'has no link: the run is refused.',""")
rep("""add('sig0202', R, 'compare_fee_schedule_id', default_map={'CIGNA PPO HAMILTON ( 128 )': 'first_option'},
    notes='Row label Fee Schedule inside FEE SCHEDULE TO COMPARE. Same parameter as Fee Schedule To Compare. Default presumably '
          'the first list entry (inferred). Greyed until Include UCR is ticked. List captured collapsed.',""",
    """add('sig0202', UNK, 'compare_fee_schedule_id', default_map={'CIGNA PPO HAMILTON ( 128 )': 'first_option'},
    notes='Row label Fee Schedule inside FEE SCHEDULE TO COMPARE. Same parameter as Fee Schedule To Compare, same unconfirmed '
          'default rule (candidate first_option). Greyed until Include UCR is ticked. List captured collapsed.',""")
rep("""add('sig0209', RE, 'last_visit_date_from', default_map={'': None}, notes=OPT_RANGE, expect=('PATIENT LAST VISIT', 'date_input', 'Start Date'))
add('sig0210', RE, 'last_visit_date_to', default_map={'': None}, notes=OPT_RANGE, expect=('PATIENT LAST VISIT', 'date_input', 'End Date'))""",
    """ORTHO_LV = 'Vendor documentation: Last Visit on this report = date of service of the last Ortho Treatment Card entry, not the general last visit. '
add('sig0209', RE, 'ortho_last_visit_date_from', default_map={'': None}, notes=OPT_RANGE + ORTHO_LV, expect=('PATIENT LAST VISIT', 'date_input', 'Start Date'))
add('sig0210', RE, 'ortho_last_visit_date_to', default_map={'': None}, notes=OPT_RANGE + ORTHO_LV, expect=('PATIENT LAST VISIT', 'date_input', 'End Date'))""")
rep("""add('sig0212', RE, 'first_visit_date_from', default_map=TODAY, notes=OPT_RANGE + DATE_NOTE, expect=('PATIENT FIRST VISIT', 'date_input', 'Start Date'))
add('sig0213', RE, 'first_visit_date_to', default_map=TODAY, notes=OPT_RANGE + DATE_NOTE, expect=('PATIENT FIRST VISIT', 'date_input', 'End Date'))""",
    """ORTHO_FV = 'Vendor documentation: First Visit on Ortho Report = first Ortho Treatment Card entry, not the first visit to the practice. '
add('sig0212', RE, 'ortho_first_visit_date_from', default_map=TODAY, notes=OPT_RANGE + ORTHO_FV + DATE_NOTE, expect=('PATIENT FIRST VISIT', 'date_input', 'Start Date'))
add('sig0213', RE, 'ortho_first_visit_date_to', default_map=TODAY, notes=OPT_RANGE + ORTHO_FV + DATE_NOTE, expect=('PATIENT FIRST VISIT', 'date_input', 'End Date'))""")
rep("""add('sig0251', R, 'recall_date_mode', ['recall_date_range', 'no_recall_date'],
    notes='No Recall Date presumably ignores the two dates (state not captured).', expect=('RECALL DATE RANGE', 'radio_group', ''))""",
    """add('sig0251', R, 'recall_date_mode', ['recall_date_range', 'no_recall_date'],
    notes='Recall Date Range = range on the recall due date. No Recall Date = patients whose recall has no due date (predicate '
          'recall_due_date IS NULL; the two dates are disabled). The second meaning is the vendor reading and was not captured - confirm.',
    expect=('RECALL DATE RANGE', 'radio_group', ''))""")
rep("""add('sig0255', RE, 'first_visit_date_from', default_map={'': None},
    notes=OPT_RANGE + 'Header instruction ( LEAVE BLANK FOR ALL PATIENTS ) is kept as help text.', expect=(FV, 'date_input', 'Start Date'))""",
    """add('sig0255', RE, 'first_visit_date_from', default_map={'': None},
    notes=OPT_RANGE + 'First visit to the practice (first completed procedure). Header instruction ( LEAVE BLANK FOR ALL PATIENTS ) '
          'is kept as help text.', expect=(FV, 'date_input', 'Start Date'))""")
rep("""add('sig0266', RE, 'referred_from_office_scope.selection', default_map={'108': 'current_office'},
    notes='Offices or office groups the referral came from. 108 = current office.',""",
    """add('sig0266', RE, 'referred_from_office_scope.selection', default_map={'108': 'working_office'},
    notes='Offices or office groups the referral came from. 108 = working office.',""")
rep("""        notes=('All box of the status grid: ticked = no status restriction.' if mem == 'all' else
               'Member of the status checkbox grid; applies when All is unticked.'), expect=('STATUSES', 'checkbox', lab))""",
    """        notes=('All box of the status grid: ticked = the scalar value all (no status restriction); never a member of the list.' if mem == 'all' else
               'Member of the status checkbox grid; applies when All is unticked.'), expect=('STATUSES', 'checkbox', lab))""")
rep("""add('sig0283', RE, 'referred_to_office_scope.selection', default_map={'ALL': 'all', '108': 'current_office'},
    notes='Offices or office groups the referral was sent to. Default ALL on Internal Referral Management, current office on '""",
    """add('sig0283', RE, 'referred_to_office_scope.selection', default_map={'ALL': 'all', '108': 'working_office'},
    notes='Offices or office groups the referral was sent to. Default ALL on Internal Referral Management, working office on '""")
rep("""        notes=('All box of the contact status grid: ticked = no restriction.' if mem == 'all' else""",
    """        notes=('All box of the contact status grid: ticked = the scalar value all (no restriction); never a member of the list.' if mem == 'all' else""")
rep("""add('sig0297', RE, 'office_scope.selection', default_map={'108': 'current_office'},""",
    """add('sig0297', RE, 'office_scope.selection', default_map={'108': 'working_office'},""")
rep("""add('sig0300', R, 'date_basis_set.created_date', notes='Checkbox pair: the date range applies to the created-on and / or the modified-on date.',""",
    """add('sig0300', R, 'date_basis_set.created_date', notes='Checkbox pair: the date range applies to the created-on and / or the modified-on date. Both ticked = created or modified in the range; none ticked = no date restriction (both to confirm).',""")
rep("""add('sig0301', R, 'date_basis_set.modified_date', notes='Checkbox pair: the date range applies to the created-on and / or the modified-on date.',""",
    """add('sig0301', R, 'date_basis_set.modified_date', notes='Checkbox pair: the date range applies to the created-on and / or the modified-on date. Both ticked = created or modified in the range; none ticked = no date restriction (both to confirm).',""")
rep("""add('sig0315', RE, 'fee_schedule_ids', default_map={'CIGNA PPO HAMILTON': 'first_option', 'ALL': 'all'},
    notes=LOOKUP_DD + ' Default ALL on Fee Schedule List; a specific schedule (tenant data, presumably the first list entry) on '
          'Procedure Codes by Fee Schedule, where ALL may not be offered - confirm.', expect=('FEE SCHEDULE', 'dropdown', ''))""",
    """add('sig0315', RE, 'fee_schedule_ids', default_map={'CIGNA PPO HAMILTON': 'first_option', 'ALL': 'all'},
    notes=LOOKUP_DD + ' This mapping is the list filter of Fee Schedule List (default ALL). On Procedure Codes by Fee Schedule the '
          'same dropdown is the single schedule whose fees are printed: control override to fee_schedule_id.', expect=('FEE SCHEDULE', 'dropdown', ''))""")
rep("""add('sig0316', UNK, 'fee_schedule_effective_date', default_map={'01/01/2020': 'first_option'},
    notes='Dropdown (not a calendar box) captured collapsed: presumably the effective dates of the selected fee schedule. '
          'Confirm the list and whether the default is the earliest or the latest date.', expect=('EFFECTIVE DATE', 'dropdown', ''))""",
    """add('sig0316', UNK, 'fee_schedule_effective_date', default_map={'01/01/2020': 'first_option'},
    notes='Dropdown (not a calendar box) captured collapsed: presumably the effective dates of the fee schedule chosen in '
          'fee_schedule_id (depends_on). Confirm the list and whether the default is the earliest or the latest date.', expect=('EFFECTIVE DATE', 'dropdown', ''))""")
rep("""add('sig0323', R, 'run_finance_charges',
    notes='Opens the finance-charge run (Finance Charge Date, Responsible Party Range, Exclude Responsible Party Type, Provider, '
          'Apply Finance Charge to Patient Portion / Entire Balance). No finance-charge engine exists yet (new feature).',""",
    """add('sig0323', R, 'run_finance_charges',
    notes='Criteria-area button, not a parameter: a definition action (02 section 3.10, scope criteria, kind navigate) that opens the '
          'separate finance-charge run statements.finance_charges with its own five criteria (Finance Charge Date, Responsible Party '
          'Range, Exclude Responsible Party Type, Provider, Apply Finance Charge to Patient Portion / Entire Balance). No '
          'finance-charge engine exists yet (new feature).',""")
rep("""add('sig0337', UNK, 'paper_statement_sent_report',
    notes='Button greyed in our capture, enabled in vendor screenshots; presumably prints a report of paper statements sent. '
          'Confirm what it does and what enables it.', expect=(RT, 'button', 'PAPER STATEMENT SENT'))""",
    """add('sig0337', UNK, 'paper_statement_sent_report',
    notes='Criteria-area button, not a parameter: a definition action (02 section 3.10). Greyed in our capture, enabled in vendor '
          'screenshots. What it does is not documented: its row caption Print Reports suggests a report of paper statements sent; '
          '02 section 5.9 treats it as a bulk action over the snapshot of a statement run. Confirm what it does and what enables it.',
    expect=(RT, 'button', 'PAPER STATEMENT SENT'))""")
rep("""add('sig0339', UNK, 'exclude_statement_sent_within_days', default_map={'0': 0},
    notes=COLLAPSED + 'Number of days of the within-last sentence; the dropdown looks enabled although the checkbox is unticked.',""",
    """add('sig0339', UNK, 'exclude_statement_sent_within_days', default_map={'0': 0},
    notes=COLLAPSED + 'Number of days of the within-last sentence; captured enabled although the checkbox is unticked, so it carries no enabling rule.',""")
rep("""add('sig0344', HELP, '', ptype='',
    notes='Hint for statement message inputs that are not rendered in the capture; their number and labels are unknown - capture on the live tool.',""",
    """add('sig0344', HELP, '', ptype='',
    notes='Caption of the six statement message boxes (General, Current, Over 30, Over 60, Over 90, Over 120 Message; vendor '
          'documentation), which were not rendered in our capture. Kept as help text of the six text parameters general_message ... '
          'over_120_message (max_length 100).',""")
rep("""add('sig0351', R, 'financial_disclosure_template_id', default_map={'.Treatment Plan Disclosure': 'first_option'},
    notes='Lookup dropdown captured collapsed. Vendor documentation: lists the letters of type Financial Disclosure assigned to the '
          'office; the leading period of the captured value is a sort trick, so the default is the first list entry.',""",
    """add('sig0351', R, 'financial_disclosure_template_id', default_map={'.Treatment Plan Disclosure': 'first_option'},
    notes='Lookup dropdown captured collapsed. Vendor documentation: lists the letters of type Financial Disclosure assigned to the '
          'office in alphabetical order, and advises prefixing a name with a period to make it the default - so the default rule '
          '(first list entry) is documented, not inferred.',""")
rep("""    notes='Single-select status filter. The two Pre-Authorized values are pre-authorisation states, not item statuses.',""",
    """    notes='Single-select status filter; same ten values as the option source treatment_plan_statuses of EXCLUDE TREATMENT PLANS. '
          'The two Pre-Authorized values are pre-authorisation states, not item statuses.',""")
rep("""    notes='Exclude filter on treatment plan statuses; None = exclude nothing. Vendor screenshot: the dialog lists the statuses with '""",
    """    notes='Exclude filter on treatment plan statuses (source treatment_plan_statuses: the ten values of treatment_plan_status '
          'without all); None = exclude nothing. Vendor screenshot: the dialog lists the statuses with '""")

rep("fixed_basis('visit_date')", "fixed_basis('ortho_visit_date')", count=2)

# the action key must not presume what the button does (report or bulk action): neutral name
rep("'paper_statement_sent_report'", "'paper_statement_sent'", count=3)

# cut everything from section 3 on; gen_tail.py is appended by make_gen.py
cut = s.index('# ----------------------------------------------------------------------------------------------\n# 3. enabled_when for the 53 controls captured greyed out')
s = s[:cut]
open('gen_head.py', 'w', encoding='utf-8', newline='\n').write(s)
print('replacements', n, 'head lines', s.count('\n'))
