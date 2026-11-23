# ----------------------------------------------------------------------------------------------
# 2b. Control overrides: one signature that means different things on different reports
# ----------------------------------------------------------------------------------------------
by_control = {c: s['signature_id'] for s in SIGS for c in s['control_ids']}
CAT_PHASE = {'daily_reports': 'P1', 'ledger_reports': 'P1', 'my_reports': 'P1', 'statements_reports': 'P1',
             'montly_reports': 'P2', 'management_reports': 'P2', 'insurance_reports': 'P2',
             'appointment_reports': 'P3', 'treatmentplan_reports': 'P3', 'refferal_reports': 'P3', 'recall_reports': 'P3',
             'ortho_reports': 'P3', 'patients_list_reports': 'P3', 'providers_list_reports': 'P3',
             'security_list_reports': 'P3', 'setup_list_reports': 'P3'}
CAT_SHORT = {'appointment_reports': 'Appointment', 'daily_reports': 'Daily', 'insurance_reports': 'Insurance', 'ledger_reports': 'Ledger',
             'management_reports': 'Management', 'montly_reports': 'Monthly', 'my_reports': 'My Reports', 'ortho_reports': 'Ortho',
             'patients_list_reports': 'Lists-Patient', 'providers_list_reports': 'Lists-Provider', 'recall_reports': 'Recall',
             'refferal_reports': 'Referral', 'security_list_reports': 'Lists-Security', 'setup_list_reports': 'Lists-Setup',
             'statements_reports': 'Statements', 'treatmentplan_reports': 'Treatment Plan'}


def rname(rid):
    return f"{CAT_SHORT[REPORTS[rid]['category']]}: {REPORTS[rid]['name']}"


OVR = OrderedDict()


def override(cid, status, param, default, notes, reason, option_map=None, ptype=None):
    """Mapping of ONE control that replaces the mapping of its signature. `default` is the new default of that control."""
    assert cid in CTL and cid not in OVR, cid
    sid = by_control[cid]
    b = MAP[sid]
    assert base(param) in PARAMS or base(param) in STEMS(), f'{cid}: unregistered param {param}'
    ptype = ptype or PARAMS[base(param)]['type']
    om = OrderedDict(option_map or {})
    assert status in (R, RE, UNK, SUP, HELP), status
    assert norm(notes) and norm(reason), cid
    same = (status, param, ptype, dict(om), norm(notes)) == (b['status'], b['param'], b['param_type'], dict(b['option_map']), b['notes'])
    assert not same, f'{cid}: override identical to the signature mapping'
    OVR[cid] = OrderedDict(signature_id=sid, status=status, param=param, param_type=ptype, option_map=om, default=default,
                           notes=norm(notes), reason=norm(reason))


override('patients_list_reports.r05.s03.c01', R, 'patient_id', None,
         notes="Mandatory single patient (vendor documentation: type the last name, search, pick); the report prints the notes of that "
               "one patient and has no office filter. Required, no all, no list. Empty by default as captured; the patient in context "
               "is offered as the first suggestion, never pre-filled silently.",
         reason="Same box as the optional patient filter of Audit Trail (sig0170), different meaning: optional filter with all there, "
                "one required patient here.")
override('patients_list_reports.r05.s03.c02', SUP, 'patient_id.search', '', notes=SEARCH_NOTE, ptype='action',
         reason='SEARCH button of the single-patient box of Patient\'s Notes (parameter patient_id, not patient_ids).')
override('setup_list_reports.r08.s05.c01', UNK, 'fee_schedule_id', 'first_option',
         notes='On Procedure Codes by Fee Schedule the dropdown selects the ONE fee schedule whose fees are printed: single value, '
               'required. The captured default is a specific schedule (tenant data); candidate rule first_option, unconfirmed. Whether '
               'the list offers ALL is not visible: all is not accepted until the live list shows it. fee_schedule_effective_date '
               'depends on this value.',
         reason='Same dropdown signature as the list filter of Fee Schedule List (sig0315, default ALL), different meaning: one required '
                'schedule here.')
override('insurance_reports.r02.s09.c01', UNK, 'compare_fee_schedule_id', 'first_option',
         notes='Capitation Utilization shows CP-40 ( 135 ) while the Production Reports of the same tenant show CIGNA PPO HAMILTON ( 128 ): '
               'the two values cannot both be the first entry of one list, so this dropdown has another list or another default rule. '
               'Candidates: the list is restricted to capitation fee schedules (source fee_schedules filtered by pricing_model = copay) '
               'and the default is its first entry; or the default comes from the plan or the office. Confirm list content, order and '
               'default on the live tool.',
         reason='Same signature as Fee Schedule To Compare of the Daily Production Report (sig0056), different captured default in the same tenant.')
override('treatmentplan_reports.r04.s05.c01', UNK, 'procedure_codes', 'all',
         notes='Captured EMPTY on Treatment Plan Detail while the same picker shows ALL on three other reports. Vendor documentation: the '
               'report finds the patients who have the selected codes in their treatment plan, so a selection may be required. '
               'Candidates: empty = all codes (used until confirmed), or at least one code is required. Confirm on the live tool.',
         reason='Same signature as the CODES picker whose default is ALL (sig0053); the empty default is unconfirmed on this report only.')
override('my_reports.r01.s01.c01', UNK, 'report_by', 'user', option_map={'User': 'user'},
         notes='On My Daily Journal REPORT BY selects WHOSE lines are listed, not a grouping: User = lines entered by the logged-in '
               'user (forces user_ids to current_user). The other value is presumably Provider = lines of the provider linked to the '
               'user (forces provider_ids to current_user_report_provider); the list was captured collapsed - read it on the live tool.',
         reason='Same collapsed REPORT BY dropdown as four patient-list reports (sig0196), different list and a restriction meaning.')
override('patients_list_reports.r03.s01.c01', R, 'report_by', 'appointment',
         option_map=OrderedDict([('Appointment', 'appointment'), ('Carrier', 'carrier'),
                                 ('Created Date / First Visit Date', 'created_date_first_visit_date'), ('Referral', 'referral'),
                                 ('Referral Type', 'referral_type')]),
         notes='Option list read from a vendor screenshot (2022), not from our capture: re-check on the live tool. The value selects the '
               'report variant and the date the range applies to (Appointment uses APPOINTMENT DATE RANGE).',
         reason='REPORT BY list of Patient List - New Patient is known from vendor documentation; the signature itself stays unknown_legacy.')
override('patients_list_reports.r06.s01.c01', R, 'report_by', 'attached_to_provider',
         option_map=OrderedDict([('Attached to Provider', 'attached_to_provider'), ('Birthdate', 'birthdate'), ('Carrier', 'carrier'),
                                 ('Employer', 'employer'), ('Fee Schedule', 'fee_schedule'), ('HIPAA Agreement', 'hipaa_agreement'),
                                 ('Insurance Plan', 'insurance_plan'), ('Last Visit', 'last_visit'), ('Medical Alert', 'medical_alert'),
                                 ('Patient Type', 'patient_type'), ('Preferred Provider', 'preferred_provider'), ('Uninsured', 'uninsured'),
                                 ('Zip Code', 'zip_code')]),
         notes='All 13 values read from vendor screenshots, not from our capture: re-check on the live tool. The criteria panel changes '
               'with the value; only the modes Attached to Provider and Last Visit were seen.',
         reason='REPORT BY list of Patient List - Grouped By is known from vendor documentation; the signature itself stays unknown_legacy.')
override('patients_list_reports.r09.s02.c01', R, 'report_by', 'created_date',
         option_map=OrderedDict([('Balance', 'balance'), ('Balance Aged Over X Days', 'balance_aged_over_x_days'),
                                 ('Created Date', 'created_date'), ('Resp. Party Type', 'resp_party_type'),
                                 ('Send Statement Status', 'send_statement_status'), ('Zip', 'zip')]),
         notes='Six values from vendor documentation, not from our capture: re-check on the live tool. Send Statement Status and Balance '
               'Aged Over X Days swap criteria.',
         reason='REPORT BY list of Responsible Party List is known from vendor documentation; the signature itself stays unknown_legacy.')


def eff(cid):
    """Effective mapping of one control: its override, else the signature mapping with the default the skeleton tool derives."""
    c = CTL[cid]
    if cid in OVR:
        o = OVR[cid]
        return dict(status=o['status'], param=o['param'], param_type=o['param_type'], option_map=o['option_map'],
                    default=o['default'], overridden=True)
    m = MAP.get(by_control[cid])
    if not m:
        return None
    ld = norm(c['default_value'])
    om_n = {norm(k): v for k, v in m['option_map'].items()}
    dm_n = {norm(k): v for k, v in m['default_map'].items()}
    if c['type'] == 'checkbox' and ld in ('checked', 'unchecked'):
        d = ld == 'checked'
    elif ld in dm_n:
        d = dm_n[ld]
    elif ld in om_n:
        d = om_n[ld]
    else:
        d = c['default_value']
    return dict(status=m['status'], param=m['param'], param_type=m['param_type'], option_map=m['option_map'], default=d,
                overridden=False)


def cid_of(rid, param):
    hits = [c['control_id'] for c in REPORTS[rid]['controls'] if (eff(c['control_id']) or {}).get('param') == param]
    assert len(hits) == 1, (rid, param, hits)
    return hits[0]


# ----------------------------------------------------------------------------------------------
# 3. enabled_when: every control with an enabling rule
#    captured: greyed (the 53 controls captured greyed out) | enabled (rule on a control captured enabled)
#    evidence: shown | documented (vendor documentation) | inferred | unknown
#    Rule of 04 section 9.2: an unobserved state never disables a control. `unobserved` names the states nobody saw;
#    the expression leaves the control enabled in them.
# ----------------------------------------------------------------------------------------------
EW = OrderedDict()
EXPR_USES = []


def ew(cid, expr, evidence, why='', unobserved=''):
    assert cid in CTL and cid not in EW, cid
    assert evidence in ('shown', 'documented', 'inferred', 'unknown'), evidence
    stored, keys = to_expr(expr)
    EXPR_USES.append((cid, expr, keys))
    EW[cid] = OrderedDict(enabled_when=expr, expr=stored, evidence=evidence, basis=norm(why),
                          captured='enabled' if CTL[cid]['enabled'] else 'greyed', unobserved=norm(unobserved))


AL = 'appointment_reports.r01'
FOUR = 'Call List, Pull Chart List, Cancelled From Automated Campaigns, Missed List'
for cid in (f'{AL}.s05.c01', f'{AL}.s06.c01', f'{AL}.s07.c01', f'{AL}.s10.c01'):
    ew(cid, 'report_type != confirmation_call_list', 'documented',
       'Greyed with Confirmation Call List (our capture); a vendor screenshot shows it enabled with Cancelled List.', unobserved=FOUR)
ew(f'{AL}.s08.c01', 'report_type not in [confirmation_call_list, cancelled_list]', 'documented',
   'Disabled with Confirmation Call List (our capture) and with Cancelled List (vendor screenshot); no state that enables it was seen.',
   unobserved=FOUR)
for cid in (f'{AL}.s09.c01', f'{AL}.s09.c02', f'{AL}.s09.c03'):
    ew(cid, 'report_type not in [confirmation_call_list, cancelled_list]', 'documented',
       'Disabled with Confirmation Call List (our capture) and with Cancelled List (vendor screenshot). Mirrors the Scheduler Call List '
       'filters (duration, show missed, show cancelled), so presumably meant for Call List.', unobserved=FOUR)
ew(f'{AL}.s11.c01', 'report_type != confirmation_call_list', 'inferred',
   'Disabled with Confirmation Call List (our capture); presumably meant for Pull Chart List.',
   unobserved='Call List, Pull Chart List, Cancelled List, Cancelled From Automated Campaigns, Missed List')
ew('appointment_reports.r04.s05.c01', 'report_type != appointment_list', 'inferred',
   'Greyed with REPORT TYPE = Appointment List; the label matches the Due Date report type.', unobserved='Not Sent, Not Received, Due Date')
ew('appointment_reports.r08.s03.c02', 'only_appointnow_appointments == true', 'documented', 'Vendor screenshot: ticking the checkbox enables the three radios.')
ew('appointment_reports.r08.s11.c01', 'include_cancelled_appointments == true', 'inferred', 'Greyed while Include Cancelled Appointments is unticked.')
ew('daily_reports.r02.s08.c01', 'unknown', 'unknown',
   'Greyed in our capture and in every vendor screenshot seen (Detail, Office, any transaction mix); nobody has seen it enabled and '
   'the driving control is unknown. Stays enabled until the rule is read on the live tool.')
ew('daily_reports.r02.s09.c02', 'group_by != none', 'documented', 'Vendor documentation: page break only when grouped.')
ew('daily_reports.r03.s06.c02', 'group_by != none', 'documented', 'Vendor screenshot shows the checkbox active (label Page Break by Provider) with GROUP BY = Provider.')
ew('daily_reports.r03.s08.c02', 'include_ucr == true', 'documented', 'Vendor screenshots: unlocks when Include UCR is ticked.')
ew('daily_reports.r03.s09.c01', 'include_ucr == true', 'documented', 'Vendor screenshots: unlocks when Include UCR is ticked.')
ew('daily_reports.r04.s06.c02', 'group_by != none', 'inferred', 'Same pattern as the GROUP BY rows.')
ew('daily_reports.r05.s06.c01', 'payment_types contains check', 'documented', 'Vendor documentation: CHECK TYPE unlocks when Check is ticked.')
ew('daily_reports.r05.s07.c01', 'payment_types contains check', 'inferred', 'Greyed together with CHECK TYPE while Check is unticked.')
ew('daily_reports.r05.s07.c02', 'group_batch_checks == true', 'documented', 'Vendor documentation: the radios unlock with the GROUP BATCH CHECKS checkbox.')
ew('daily_reports.r08.s06.c01', 'report_type != detail', 'documented',
   'Greyed under Detail (our capture and a vendor screenshot). The same section is enabled on My Reports Missing Progress Notes, the Missing variant.',
   unobserved='Unsigned')
ew('daily_reports.r09.s07.c01', 'report_by == carrier', 'inferred', 'Greyed while ANALYSIS BY = Category; Carrier is the only other value.')
ew('daily_reports.r10.s08.c02', 'group_by == provider', 'documented', 'Vendor documentation: Page Break is ticked automatically when GROUP BY = Provider.')
ew('daily_reports.r12.s10.c02', 'age_range_enabled == true', 'inferred', 'Greyed while Age Range is unticked.')
ew('daily_reports.r12.s10.c03', 'age_range_enabled == true', 'inferred', 'Greyed while Age Range is unticked.')
ew('daily_reports.r12.s10.c05', 'amount_operator != all', 'inferred', 'Greyed while the Amount dropdown shows All Amount.')
ew('insurance_reports.r02.s09.c01', 'include_ucr == true', 'documented', 'Vendor text: available once Include UCR is ticked.')
ew('insurance_reports.r05.s07.c01', 'date_range_type != appointment_date', 'inferred', 'Greyed while DATE RANGE TYPE = Appointment Date.',
   unobserved='Appointment Created Date, Both')
ew('insurance_reports.r05.s07.c02', 'date_range_type != appointment_date', 'inferred', 'Greyed while DATE RANGE TYPE = Appointment Date.',
   unobserved='Appointment Created Date, Both')
ew('insurance_reports.r09.s03.c02', 'date_basis != all', 'inferred', 'Greyed while the radio above is on ALL.', unobserved='DOS Date, Transaction Date')
ew('insurance_reports.r12.s01.c01', 'output_format != xlsx', 'documented', 'Vendor documentation: Excel exists only as Detail; the report opens with Excel selected.')
for cid in ('ledger_reports.r01.s02.c02', 'ledger_reports.r02.s01.c02', 'ledger_reports.r03.s01.c02', 'ledger_reports.r04.s01.c02'):
    ew(cid, 'false', 'shown', 'Lock, not a dependency: on all four Ledger reports the office is always the working office (vendor screenshots show the same).')
for cid in ('management_reports.r01.s05.c01', 'management_reports.r01.s05.c02', 'management_reports.r01.s05.c03'):
    ew(cid, 'plan_type == ortho', 'inferred', 'Greyed while PLAN TYPE = Regular; Ortho is the only other value.')
MO = ('Greyed with one office selected in Office mode. With a single office in scope the option has no effect, so disabling it there '
      'cannot remove a legacy result; several offices and Office Group mode were not captured.')
ew('management_reports.r04.s05.c01', 'ctx.multi_office', 'inferred', MO, unobserved='several offices, Office Group mode')
ew('montly_reports.r01.s05.c02', 'group_by == provider', 'inferred', 'Greyed while GROUP BY = None; Provider is the only other value.')
for cid in ('montly_reports.r03.s04.c02', 'montly_reports.r03.s04.c03', 'montly_reports.r04.s04.c02', 'montly_reports.r04.s04.c03'):
    ew(cid, 'group_by == provider', 'inferred', 'Greyed while GROUP BY PROVIDER is unticked.')
ew('my_reports.r02.s05.c01', 'ctx.multi_office', 'inferred', MO, unobserved='several offices, Office Group mode')
ew('my_reports.r05.s03.c01', 'false', 'documented', 'Display-only: shows the Report Access Provider of the logged-in user, never editable.')
ew('my_reports.r05.s08.c01', 'include_ucr == true', 'inferred', 'Same dependency as on the Daily Reports Production Report.')
ew('refferal_reports.r03.s02.c01', 'false', 'documented', 'Display-only by design on Referral Source List (vendor documentation): the selection does not filter the list.')
ew('refferal_reports.r03.s02.c02', 'false', 'documented', 'Display-only by design on Referral Source List (vendor documentation): the selection does not filter the list.')
IPL = ('Captured grey although Modified On is ticked, so the driver is not the checkbox pair; it may be a read-only box filled through '
       'the calendar icon. Stays enabled until read on the live tool.')
ew('setup_list_reports.r02.s03.c03', 'unknown', 'unknown', IPL)
ew('setup_list_reports.r02.s03.c04', 'unknown', 'unknown', IPL)
ew('statements_reports.r01.s02.c04', 'unknown', 'unknown',
   'Greyed in our capture, enabled in vendor screenshots: the state is real but its condition is not documented. Stays enabled until read on the live tool.')

GREYED = [cid for cid, c in CTL.items() if not c['enabled']]
assert len(GREYED) == 53, len(GREYED)
assert set(GREYED) == set(EW), sorted(set(GREYED) ^ set(EW))

# --- rules on controls captured ENABLED (the default-state capture cannot show them)
for rid in ('recall_reports.r03',):
    for p in ('date_from', 'date_to'):
        ew(cid_of(rid, p), 'recall_date_mode == recall_date_range', 'inferred',
           'No Recall Date selects recalls without a due date, so the two dates do not apply (state not captured).')
for p in ('date_from', 'date_to'):
    ew(cid_of('montly_reports.r07', p), 'print_all_unallocated_as_of_today == false', 'inferred',
       'The checkbox replaces the range by an as-of-today snapshot (state not captured).')
    ew(cid_of('insurance_reports.r05', p), 'date_range_type != appointment_created_date', 'inferred',
       'The primary range applies for Appointment Date and Both (states Appointment Created Date and Both not captured).',
       unobserved='Both')
ew(cid_of('setup_list_reports.r02', 'user_ids'), 'include_user_in_filters == true', 'inferred',
   'The checkbox label says the picker is part of the filter only when ticked (captured ticked).')
for rid in ('recall_reports.r01', 'recall_reports.r02', 'recall_reports.r03'):
    for p in ('age_from', 'age_to'):
        ew(cid_of(rid, p), 'age_range_enabled == true', 'inferred',
           'Captured with Age Range ticked; greyed on Special Transaction Report while it is unticked.')
ew(cid_of('appointment_reports.r08', 'user_ids'), 'only_appointnow_appointments == false', 'documented',
   'Vendor screenshot: with Only AppointNow Appointments ticked the User picker is disabled.')
ew(cid_of('appointment_reports.r08', 'group_by'), 'only_appointnow_appointments == false', 'documented',
   'Vendor screenshot: with Only AppointNow Appointments ticked both GROUP BY radios are disabled.')
ew(cid_of('insurance_reports.r08', 'group_by'), 'output_format != xlsx', 'documented',
   'Vendor screenshot: both GROUP BY radios are greyed when PRINT FORMAT = Excel (flat workbook).')
ew(cid_of('daily_reports.r03', 'group_by'), 'report_by != provider', 'documented',
   'Vendor screenshot: with PRODUCTION BY = Provider the options Provider and Carrier are greyed, which leaves None.',
   unobserved='Category, Carrier')
ew(cid_of('daily_reports.r03', 'include_ucr'), 'report_by != provider', 'documented',
   'Vendor screenshot: Include UCR and Include Z-Codes are greyed with PRODUCTION BY = Provider.', unobserved='Category, Carrier')

# ----------------------------------------------------------------------------------------------
# 3b. option_enabled_when: one option greyed inside an enabled group (control id -> option value -> rule)
# ----------------------------------------------------------------------------------------------
OEW = OrderedDict()


def opt_ew(cid, option, expr, evidence, why=''):
    e = eff(cid)
    assert CTL[cid]['enabled'], cid
    assert option in e['option_map'].values(), (cid, option)
    stored, keys = to_expr(expr)
    EXPR_USES.append((cid, expr, keys))
    OEW.setdefault(cid, OrderedDict())[option] = OrderedDict(enabled_when=expr, expr=stored, evidence=evidence, basis=norm(why))


for cid in ('daily_reports.r07.s01.c01', 'ledger_reports.r01.s02.c01', 'ledger_reports.r02.s01.c01', 'ledger_reports.r03.s01.c01',
            'ledger_reports.r04.s01.c01'):
    opt_ew(cid, 'office_group', 'false', 'shown', 'Lock: the report runs for offices only (validation.allowed_modes = [office]).')
opt_ew('appointment_reports.r08.s09.c01', 'user', 'group_by == user', 'inferred', 'Greyed while GROUP BY = Provider; User is the only other grouping.')
opt_ew('daily_reports.r08.s05.c01', 'appointment_date', 'report_type != detail', 'documented',
       'Greyed under Detail (our capture and a vendor screenshot); My Reports Missing Progress Notes, the Missing variant, filters by appointment date. Unsigned not observed.')
for o in ('email', 'both'):
    opt_ew('patients_list_reports.r11.s01.c01', o, 'unknown', 'unknown',
           'Greyed in the only capture; presumably the e-statement feature of the organisation (ctx.feature.<flag>). Stays enabled until read on the live tool.')
opt_ew('daily_reports.r03.s01.c01', 'detail', 'report_by == provider', 'documented',
       'Vendor documentation: Detail is selectable only for PRODUCTION BY = Provider (greyed in our capture with Code).')
GREYED_OPTION_CONTROLS = ['daily_reports.r07.s01.c01', 'ledger_reports.r01.s02.c01', 'ledger_reports.r02.s01.c01',
                          'ledger_reports.r03.s01.c01', 'ledger_reports.r04.s01.c01', 'appointment_reports.r08.s09.c01',
                          'daily_reports.r08.s05.c01', 'patients_list_reports.r11.s01.c01', 'daily_reports.r03.s01.c01']
assert sorted(OEW) == sorted(GREYED_OPTION_CONTROLS)
for cid in GREYED_OPTION_CONTROLS:   # the inventory note of each of these controls states the greyed option
    assert re.search(r'grey', CTL[cid].get('notes') or '', re.I), cid

# ----------------------------------------------------------------------------------------------
# 3c. Controls that only vendor documentation shows, and hidden parameters without a legacy control
#     (no signature: they are mapped report by report in the catalog; the keys are fixed here)
# ----------------------------------------------------------------------------------------------
VP = []


def vparam(rid, param, ptype, legacy, value_keys=None, options='', default='', note='', evidence='documented', kind='vendor_doc'):
    assert rid in REPORTS, rid
    VP.append(OrderedDict(report_id=rid, report=rname(rid), param=param, param_type=ptype, value_keys=value_keys or [param],
                          legacy_control=legacy, options=options, default=default, evidence=evidence, kind=kind, note=norm(note)))


vparam('appointment_reports.r01', 'output_format', 'enum', 'PRINT FORMAT (section above the visible area)', options='PDF -> pdf, Excel -> xlsx',
       default='pdf', note='Vendor screenshots show the section above the list-type radios; our capture starts below it.')
vparam('daily_reports.r03', 'provider_ids', 'entity_multi', 'PROVIDERS (picker)', default='all',
       note='Shown beside CODES when GROUP BY = Provider and in place of CODES when PRODUCTION BY = Provider.')
vparam('daily_reports.r03', 'sort_by', 'enum', 'SORT BY', options='Transaction Date -> transaction_date, Patient Lastname -> patient_last_name',
       default='transaction_date (first option; default not documented)',
       note='Seen with PRODUCTION BY = Provider and REPORT FORMAT = Detail; which of the two drives it is not documented.')
vparam('daily_reports.r12', 'sort_by', 'enum', 'OTHER OPTIONS > Sort By', options='Patient LastName -> patient_last_name, Patient ID -> patient_id, Date -> date',
       default='patient_last_name (first option; default not documented)', note='Row below Group By that our capture cuts off.')
vparam('insurance_reports.r07', 'recall_date', 'date_range', 'TREATMENT PLAN/RECALL > Recall Date From / Thru',
       value_keys=['recall_date_from', 'recall_date_to', 'recall_date_preset'], evidence='inferred',
       note='Read from the criteria echo of a 2011 Recall sample; the current Recall state of the screen was not captured.')
vparam('insurance_reports.r07', 'max_over', 'decimal', 'TREATMENT PLAN/RECALL > Max Over', evidence='inferred',
       note='Control type and default unknown (criteria echo of a 2011 sample).')
vparam('insurance_reports.r07', 'recall_procedure_codes', 'entity_multi', 'TREATMENT PLAN/RECALL > Recall Codes', default='all', evidence='inferred',
       note='Same parameter as RECALL PROCEDURE CODES of the recall reports.')
vparam('ledger_reports.r01', 'patient_id', 'entity_single', 'patient selector of REPORT FORMAT = Patient Ledger', default='current_patient',
       note='Vendor text: the patient ledger is run by selecting the patient. The panel in that state was not captured.')
vparam('ledger_reports.r01', 'add_patient_note', 'boolean', 'print-menu dialog Patient Ledger Report > prompt to add a patient note', default='false',
       note='Print-menu flow only; wording and form of the prompt are not documented.')
for k, lab in (('general_message', 'General Message'), ('current_message', 'Current Message'), ('over_30_message', 'Over 30 Message'),
               ('over_60_message', 'Over 60 Message'), ('over_90_message', 'Over 90 Message'), ('over_120_message', 'Over 120 Message')):
    vparam('statements_reports.r01', k, 'text', f'[no header] BELOW THE TABLES > {lab}', default='server_value (office statement setup)',
           note='validation.max_length 100; role layout; default text from Setup > Offices > Office Setup > Statement. Not rendered in our capture.')
    vparam('ledger_reports.r02', k, 'text', f'Walkout print-menu dialog > {lab}', default='server_value (office statement setup)',
           note='validation.max_length 100; role layout. Print-menu dialog only.')
vparam('ledger_reports.r02', 'add_patient_note', 'boolean', 'Walkout print-menu dialog > option to add a note that a walkout was printed', default='false',
       note='Label, control type and default are not documented.')
vparam('ledger_reports.r03', 'include_previous_balance', 'boolean', 'print-menu dialog Super Bill Report > Include Previous Balance', default='false',
       note='Dialog only; default not documented.')
vparam('management_reports.r03', 'audit_subject', 'enum', 'print-menu dialog Audit Trail Report > Account / Patient', options='Account -> account, Patient -> patient',
       default='not documented', note='Patient-level entry point of the Audit Trail.')
vparam('montly_reports.r03', 'aging_buckets.over_120_plus', 'enum_multi', 'AGING > Over 120+ (replaces Over 120 when PRINT FORMAT = Excel)', value_keys=['aging_buckets'],
       default='not documented', note='Member over_120_plus: the spreadsheet then carries Over 120 / 150 / 180 / 270 / 365 buckets.')
vparam('montly_reports.r04', 'aging_buckets.over_120_plus', 'enum_multi', 'AGING > Over 120+ (replaces Over 120 when PRINT FORMAT = Excel)', value_keys=['aging_buckets'],
       default='not documented', evidence='inferred', note='Inferred from the identical criteria panel of Aging Report by Home Office.')
vparam('patients_list_reports.r06', 'provider_basis', 'enum', 'PREFERRED PROVIDER > Preferred Provider / Treating Provider (REPORT BY = Last Visit)',
       options='Preferred Provider -> preferred_provider, Treating Provider -> treating_provider', default='preferred_provider')
vparam('patients_list_reports.r06', 'last_visit_date', 'date_range', 'LAST VISIT DATE RANGE (REPORT BY = Last Visit)',
       value_keys=['last_visit_date_from', 'last_visit_date_to', 'last_visit_date_preset'],
       note='General last visit of the patient (last completed procedure), not the ortho last visit.')
vparam('patients_list_reports.r06', 'include_patients_with_no_last_visit', 'boolean', 'OTHER OPTIONS > Include Patients with No Lastvisit date. (REPORT BY = Last Visit)',
       default='not documented')
vparam('patients_list_reports.r09', 'send_statement_status', 'enum', 'SEND STATEMENT STATUS (REPORT BY = Send Statement Status)', options='Yes -> yes, No -> no',
       default='not documented', note='Replaces the date range in that mode.')
vparam('patients_list_reports.r09', 'aged_balance', 'number_range', 'Aged Balance range Start / End (REPORT BY = Balance Aged Over X Days)',
       value_keys=['aged_balance_from', 'aged_balance_to'], default='1.00 / 999999.99')
vparam('patients_list_reports.r09', 'aging_days', 'enum', 'days 30 / 60 / 90 / 120 (REPORT BY = Balance Aged Over X Days)', options='30 -> 30, 60 -> 60, 90 -> 90, 120 -> 120',
       default='not documented')
# hidden parameters: no legacy control, the legacy tool applies the restriction itself
HID = 'No control on the legacy screen: the legacy tool applies the restriction itself.'
vparam('my_reports.r01', 'user_ids', 'entity_multi', '(none)', default='current_user', kind='hidden',
       note=HID + ' Forced to the caller while report_by = user: lines entered by the logged-in user. disabled_value all, so it adds '
       'no predicate under another option.')
vparam('my_reports.r01', 'provider_ids', 'entity_multi', '(none)', default='current_user_report_provider', kind='hidden', evidence='inferred',
       note=HID + ' Every option of REPORT BY other than User is treated as a provider-type value until the list is read: forced to the '
       'linked provider for a provider-restricted caller. disabled_value all while report_by = user.')
vparam('my_reports.r02', 'user_ids', 'entity_multi', '(none)', default='current_user', kind='hidden',
       note=HID + ' Forced to the caller. Own hours only: the Management Reports copy of the report has the USER picker, this one has none.')
vparam('my_reports.r04', 'user_ids', 'entity_multi', '(none)', default='current_user', kind='hidden',
       note=HID + ' Forced to the caller: appointments created by the logged-in user (role of the user inferred from the parent report). '
       'The Provider and Operatory pickers stay filters inside that set.')
vparam('my_reports.r05', 'provider_ids', 'entity_multi', '(none)', default='current_user_report_provider', kind='hidden',
       note=HID + ' Forced to the Report Access Provider shown in CORRESPONDING PROVIDER for a provider-restricted caller. A caller the '
       'definition exempts gets the parameter as a picker; the default token then resolves to the own link, or to all without a link.')
vparam('statements_reports.r01', 'office_scope', 'office_scope', '(none)', value_keys=['office_ids', 'office_group_id', 'office_group_ids', 'all_offices'],
       default='working_office', kind='hidden', evidence='inferred',
       note='The Statements screen has no office selector; the run is per office (legacy reminder to update statement dates per office).')
for rid in ('setup_list_reports.r08', 'setup_list_reports.r10', 'setup_list_reports.r11'):
    vparam(rid, 'office_scope', 'office_scope', '(none)', value_keys=['office_ids', 'office_group_id', 'office_group_ids', 'all_offices'],
           default='all', kind='hidden', evidence='inferred',
           note='Fee schedules are office-pinned catalogs in DentC: the hidden scope applies the catalog rule (rows of offices the caller may read plus rows without an office).')

# ----------------------------------------------------------------------------------------------
# 3d. Rules beyond enabled_when (visible / required / forced / default / label), per report
# ----------------------------------------------------------------------------------------------
RULES = []


def rule(rid, param, field, when, value=None, evidence='documented', note=''):
    assert rid in REPORTS, rid
    assert field in ('visible_when', 'required_when', 'forced_when', 'default_when', 'label_when', 'option_visible_when', 'disabled_value'), field
    stored, keys = to_expr(when)
    EXPR_USES.append((rid, when, keys))
    RULES.append(OrderedDict(report_id=rid, report=rname(rid), param=param, field=field, when=when, expr=stored, value=value,
                             evidence=evidence, note=norm(note)))


WO = {'office_ids': {'token': 'working_office'}}
for rid in ('ledger_reports.r01', 'ledger_reports.r02', 'ledger_reports.r03', 'ledger_reports.r04'):
    rule(rid, 'office_scope', 'forced_when', 'true', WO, 'shown', 'Lock of the four Ledger reports: always the working office.')
rule('statements_reports.r01', 'office_scope', 'forced_when', 'true', WO, 'inferred', 'Hidden scope: the statement run is per office.')
rule('refferal_reports.r03', 'office_scope', 'disabled_value', 'true', {'office_ids': 'all'}, 'documented',
     'The control is display-only (enabled_when false); the run uses the catalog rule instead of the displayed office.')
for rid in ('setup_list_reports.r08', 'setup_list_reports.r10', 'setup_list_reports.r11'):
    rule(rid, 'office_scope', 'visible_when', 'false', None, 'inferred', 'Hidden scope with default all (catalog rule); no legacy control.')
# Restrictions the legacy tool applies without a control. Which definition restricts whom is declared in
# 08_security_compliance.md section 4.2 (table "Definitions that restrict") and 4.3: self_always is written as an
# unconditional force; self_unless_privileged follows the context facts ctx.provider_restricted / ctx.user_restricted,
# which the scope step sets from scope.provider_restriction / scope.user_restriction of the definition.
CU, CP = {'token': 'current_user'}, {'token': 'current_user_report_provider'}
rule('my_reports.r01', 'user_ids', 'forced_when', 'report_by == user', CU, 'documented',
     'My Reports limits a user to their own activity: User = lines entered by the logged-in user (user restriction self_always).')
rule('my_reports.r01', 'user_ids', 'visible_when', 'false', None, 'shown', 'No control on the legacy screen.')
rule('my_reports.r01', 'user_ids', 'disabled_value', 'true', 'all', 'inferred',
     'Applies under every option other than User, where the provider force restricts the run instead.')
rule('my_reports.r01', 'provider_ids', 'forced_when', 'report_by != user and ctx.provider_restricted', CP, 'inferred',
     'Every other option of the unread REPORT BY list is treated as a provider-type value, so no option runs without a restriction; '
     'without a link the run is refused (403 report_provider_not_linked).')
rule('my_reports.r01', 'provider_ids', 'visible_when', 'report_by != user and not ctx.provider_restricted', None, 'policy',
     'No control on the legacy screen. A caller the definition exempts (PD-11) gets the picker, default the own link, else all.')
rule('my_reports.r01', 'provider_ids', 'disabled_value', 'true', 'all', 'inferred', 'Applies while REPORT BY = User.')
rule('my_reports.r02', 'user_ids', 'forced_when', 'true', CU, 'documented',
     'Own card only: the report prints hourly and overtime rates (user restriction self_always).')
rule('my_reports.r02', 'user_ids', 'visible_when', 'false', None, 'shown', 'No control on the legacy screen.')
rule('my_reports.r03', 'provider_ids', 'forced_when', 'ctx.provider_restricted', CP, 'policy',
     'The legacy PROVIDER picker (default ALL) is forced to the link and shown read-only for a provider-restricted caller; an exempt '
     'caller keeps the picker. How the legacy tool restricts this report is not documented (11.5).')
rule('my_reports.r04', 'user_ids', 'forced_when', 'true', CU, 'documented',
     'Appointments entered by the logged-in user (user restriction self_always).')
rule('my_reports.r04', 'user_ids', 'visible_when', 'false', None, 'shown', 'No control on the legacy screen.')
rule('my_reports.r05', 'provider_ids', 'forced_when', 'ctx.provider_restricted', CP, 'documented',
     'Effect of scope.provider_restriction, applied by the scope step, so the definition carries no second rule. Without a link the '
     'run is refused (403 report_provider_not_linked), as in the legacy tool.')
rule('my_reports.r05', 'provider_ids', 'visible_when', 'not ctx.provider_restricted', None, 'policy',
     'No control on the legacy screen. A caller the definition exempts (PD-11) gets the picker in place of the CORRESPONDING PROVIDER '
     'box, default the own link, else all.')
rule('management_reports.r04', 'user_ids', 'forced_when', 'ctx.user_restricted', CU, 'policy',
     'A caller without the data class payroll_time sees the own card only; the control shows the forced value read-only. The existing '
     'time-clock builder already narrows such a caller.')
rule('daily_reports.r03', 'report_format', 'forced_when', 'report_by != provider', 'summary', 'documented',
     'REPORT FORMAT is locked to Summary unless PRODUCTION BY = Provider; the Detail option is greyed (option_enabled_when).')
rule('daily_reports.r03', 'procedure_codes', 'visible_when', 'report_by != provider', None, 'documented', 'With PRODUCTION BY = Provider the CODES picker is replaced by the PROVIDERS picker.')
rule('daily_reports.r03', 'provider_ids', 'visible_when', 'report_by == provider or group_by == provider', None, 'documented', 'PROVIDERS picker (absent from our capture).')
rule('daily_reports.r03', 'sort_by', 'visible_when', 'report_by == provider and report_format == detail', None, 'inferred',
     'SORT BY was seen with PRODUCTION BY = Provider and Detail; which of the two drives it is not documented.')
rule('daily_reports.r03', 'page_break_by', 'label_when', 'group_by == provider', 'Page Break by Provider', 'documented', 'Label of the Page Break checkbox.')
rule('daily_reports.r10', 'page_break_by', 'default_when', 'group_by == provider', 'group', 'documented', 'Page Break is ticked automatically when GROUP BY = Provider.')
rule('insurance_reports.r12', 'report_format', 'forced_when', 'output_format == xlsx', 'detail', 'documented', 'Excel exists only as Detail.')
rule('ledger_reports.r01', 'account_id', 'visible_when', 'report_type == account_ledger', None, 'documented', 'The account ledger is run by selecting the responsible party.')
rule('ledger_reports.r01', 'account_id', 'required_when', 'report_type == account_ledger', None, 'documented', '')
rule('ledger_reports.r01', 'patient_id', 'visible_when', 'report_type == patient_ledger', None, 'documented', 'The patient ledger is run by selecting the patient (panel not captured).')
rule('ledger_reports.r01', 'patient_id', 'required_when', 'report_type == patient_ledger', None, 'documented', '')
rule('ledger_reports.r04', 'account_id', 'required_when', 'true', None, 'shown', 'One account per run.')
rule('patients_list_reports.r05', 'patient_id', 'required_when', 'true', None, 'documented', 'Mandatory single patient.')
for rid in ('daily_reports.r03', 'insurance_reports.r02', 'my_reports.r05'):
    rule(rid, 'compare_fee_schedule_id', 'required_when', 'include_ucr == true', None, 'inferred', 'The compare column needs a schedule.')
rule('daily_reports.r12', 'amount_value', 'required_when', 'amount_operator != all', None, 'inferred', '')
rule('insurance_reports.r05', 'appointment_created_date', 'required_when', 'date_range_type != appointment_date', None, 'inferred', 'The secondary range applies only then.')
for rid, ev in (('montly_reports.r03', 'documented'), ('montly_reports.r04', 'inferred')):
    rule(rid, 'aging_buckets', 'option_visible_when', 'output_format == xlsx', 'over_120_plus', ev, 'Excel shows Over 120+ (with an info icon) in place of Over 120.')
    rule(rid, 'aging_buckets', 'option_visible_when', 'output_format != xlsx', 'over_120', ev, '')
    rule(rid, 'account_balance_over', 'label_when', 'aging_by == patient_ar', 'Patient Balance Over', 'documented', 'Label of the threshold follows AGING BY.')
rule('statements_reports.r01', 'exclude_open_claim_accounts', 'visible_when', 'ctx.feature.hold_statements_with_open_claims', None, 'documented',
     'Present only when the account feature "Enable Advance Hold Statements with Open Claims" is on.')
rule('insurance_reports.r07', 'recall_date', 'visible_when', 'report_type == recall', None, 'inferred', 'Recall state of Benefits Used/Unused (not captured).')
rule('insurance_reports.r07', 'max_over', 'visible_when', 'report_type == recall', None, 'inferred', '')
rule('insurance_reports.r07', 'recall_procedure_codes', 'visible_when', 'report_type == recall', None, 'inferred', '')
for p in ('provider_basis', 'last_visit_date', 'include_patients_with_no_last_visit'):
    rule('patients_list_reports.r06', p, 'visible_when', 'report_by == last_visit', None, 'documented', 'Mode Last Visit (vendor screenshots).')
for p in ('provider_ids', 'specialty_codes'):
    rule('patients_list_reports.r06', p, 'visible_when', 'report_by != last_visit', None, 'documented',
         'Replaced by the PREFERRED PROVIDER block in mode Last Visit; the other 11 modes were not captured (treated as visible).')
rule('patients_list_reports.r09', 'send_statement_status', 'visible_when', 'report_by == send_statement_status', None, 'documented', '')
rule('patients_list_reports.r09', 'date_range', 'visible_when', 'report_by != send_statement_status', None, 'documented', 'The date range is replaced by SEND STATEMENT STATUS in that mode.')
for p in ('aged_balance', 'aging_days'):
    rule('patients_list_reports.r09', p, 'visible_when', 'report_by == balance_aged_over_x_days', None, 'documented', '')

# ----------------------------------------------------------------------------------------------
# 3e. Attributes this document fixes per parameter
# ----------------------------------------------------------------------------------------------
SOURCES = {
    'office_scope': ['offices', 'office_groups'], 'referred_from_office_scope': ['offices', 'office_groups'],
    'referred_to_office_scope': ['offices', 'office_groups'],
    'provider_ids': ['providers'], 'preferred_provider_ids': ['providers'], 'preferred_hygienist_ids': ['providers'],
    'transaction_provider_ids': ['providers'], 'appointment_provider_ids': ['providers'], 'visit_doctor_ids': ['providers'],
    'referred_from_provider_ids': ['providers'], 'referred_to_provider_ids': ['providers'],
    'tx_counselor_ids': ['users'], 'user_ids': ['users'], 'security_group_ids': ['security_groups'],
    'patient_ids': ['patients'], 'patient_id': ['patients'], 'patient_name': ['patients'],
    'account_id': ['accounts'], 'responsible_party_name': ['accounts'],
    'include_patient_type_codes': ['definitions:patient_type'], 'exclude_patient_type_codes': ['definitions:patient_type'],
    'exclude_resp_party_type_codes': ['definitions:resp_party_type'], 'note_type_codes': ['note_types'],
    'carrier_ids': ['carriers'], 'employer_ids': ['employers'], 'insurance_plan_selection': ['insurance_plans_and_subtypes'],
    'exclude_reason_codes': ['denial_reason_codes'],
    'procedure_codes': ['procedure_codes'], 'recall_procedure_codes': ['procedure_codes'],
    'procedure_category_codes': ['procedure_categories'], 'code_scope': ['procedure_codes', 'procedure_categories'],
    'payment_adjustment_codes': ['payment_adjustment_codes'], 'payment_codes': ['payment_codes'],
    'production_type_ids': ['production_types'],
    'fee_schedule_ids': ['fee_schedules'], 'fee_schedule_id': ['fee_schedules'], 'compare_fee_schedule_id': ['fee_schedules'],
    'fee_schedule_effective_date': ['fee_schedule_effective_dates'], 'note_macro_category_codes': ['note_macro_categories'],
    'exclude_treatment_plan_statuses': ['treatment_plan_statuses'],
    'financial_disclosure_template_id': ['financial_disclosure_letters'], 'ortho_status_codes': ['ortho_statuses'],
    'operatory_ids': ['operatories'], 'lab_ids': ['labs'], 'vendor_codes': ['confirmation_vendors'],
    'cancellation_reason_codes': ['cancellation_reasons'],
    'referral_type_codes': ['definitions:referral_type'], 'referred_to_ids': ['referral_sources'], 'referred_from_ids': ['referral_sources'],
    'specialty_codes': ['specialties'], 'state_codes': ['definitions:state'],
}
PROVIDER_ROLE = {
    'provider_ids': 'report (scope.provider_attribution)', 'preferred_provider_ids': 'preferred',
    'preferred_hygienist_ids': 'preferred_hygienist', 'transaction_provider_ids': 'treating',
    'appointment_provider_ids': 'appointment', 'visit_doctor_ids': 'ortho_visit',
    'referred_from_provider_ids': 'referring', 'referred_to_provider_ids': 'referred_to',
}
# enum_multi: what a full selection means, the smallest legal selection, what an empty list means
EM = {
    'transaction_types': ('no_predicate', 1, '-'),
    'payment_types': ('no_predicate', 1, '-'),
    'aging_buckets': ('predicate', 1, '-'),
    'claim_sent_types': ('no_predicate', 1, '-'),
    'coverage_orders': ('no_predicate', 1, '-'),
    'procedure_code_types': ('no_predicate', 1, '-'),
    'missing_items': ('predicate', 1, '-'),
    'appointment_statuses': ('predicate', 0, 'neither missed nor cancelled appointments are added to the list (legacy default)'),
    'ortho_plan_parts': ('no_predicate', 0, 'legacy default; meaning unconfirmed - treated as no restriction on the plan part'),
    'date_basis_set': ('predicate', 0, 'no date restriction'),
    'referral_statuses': ('predicate', 1, '-'),
    'contact_statuses': ('predicate', 1, '-'),
}
ACCEPTS_ALL_EM = {'referral_statuses', 'contact_statuses'}

# ----------------------------------------------------------------------------------------------
# 4. Checks + output
# ----------------------------------------------------------------------------------------------
unmapped = [s for s in SIGS if s['signature_id'] not in MAP]
assert not unmapped, [s['signature_id'] for s in unmapped]

EFF = OrderedDict((cid, eff(cid)) for cid in CTL)

# collisions: the same value-bearing param twice in one report
collisions = []
for rid, r in REPORTS.items():
    seen = defaultdict(list)
    for c in r['controls']:
        m = EFF[c['control_id']]
        if m and m['param'] and m['status'] in (R, RE, UNK) and m['param_type'] != 'action':
            seen[m['param']].append(c['control_id'])
    for p, cids in seen.items():
        if len(cids) > 1:
            collisions.append((rid, r['name'], p, cids))

assert not collisions, collisions

# usage per parameter, from the effective mapping of every control
usage = OrderedDict()
for cid, m in EFF.items():
    if not m['param']:
        continue
    stem = stem_of(m['param'])
    u = usage.setdefault(stem, {'sigs': [], 'controls': 0, 'reports': set(), 'statuses': defaultdict(int), 'params': [],
                                'variants': OrderedDict(), 'phases': set()})
    sid = by_control[cid]
    if sid not in u['sigs']:
        u['sigs'].append(sid)
    u['controls'] += 1
    u['reports'].add(REP_OF[cid])
    u['phases'].add(CAT_PHASE[REPORTS[REP_OF[cid]]['category']])
    u['statuses'][m['status']] += 1
    if m['status'] != HELP:
        if m['param'] not in u['params']:
            u['params'].append(m['param'])
        c = CTL[cid]
        e = u['variants'].setdefault(norm(c['section']), {'labels': [], 'n': 0})
        if c['label'] and c['label'] not in e['labels']:
            e['labels'].append(c['label'])
        e['n'] += 1

sig_status = defaultdict(lambda: [0, 0])
for sid, m in MAP.items():
    sig_status[m['status']][0] += 1
ctl_status = defaultdict(int)
for cid, m in EFF.items():
    ctl_status[m['status']] += 1
for k, v in ctl_status.items():
    sig_status[k][1] = v

params_out = OrderedDict()
for key, p in PARAMS.items():
    stem = p['stem']
    e = params_out.setdefault(stem, OrderedDict(type=p['type'], label=p['label'], group=p['group'], keys=[]))
    e['keys'].append(key)


def value_keys(stem, e):
    t = e['type']
    if t == 'office_scope':
        pre = stem[:-len('office_scope')]
        return [pre + 'office_ids', pre + 'office_group_id', pre + 'office_group_ids', pre + 'all_offices']
    if t == 'scoped_selection':
        return [stem + '_mode', stem + '_selection']
    if t == 'date_range':
        b = 'date' if stem == 'date_range' else stem
        assert e['keys'] == [b + '_from', b + '_to'], (stem, e['keys'])
        return [b + '_from', b + '_to', b + '_preset']
    if t in ('action', 'display'):
        return []
    return list(e['keys'])


for stem, e in params_out.items():
    e['value_keys'] = value_keys(stem, e)
    u = usage.get(stem)
    assert u, f'parameter {stem} is not used by any control'
    e['reports'] = len(u['reports'])
    e['controls'] = u['controls']
    e['signature_ids'] = sorted(u['sigs'])
    e['param_values'] = u['params']
    e['control_statuses'] = dict(sorted(u['statuses'].items()))
    e['first_phase'] = min(u['phases'])
    if stem in SOURCES:
        e['options_source'] = SOURCES[stem]
    if stem in PROVIDER_ROLE:
        e['provider_role'] = PROVIDER_ROLE[stem]
    if e['type'] == 'enum_multi':
        full, mn, empty = EM[stem]
        e['semantics'] = OrderedDict(full_selection=full, min_items=mn, empty_selection=empty, accepts_all=stem in ACCEPTS_ALL_EM)
for stem, e in params_out.items():
    if e['type'] in ('entity_multi', 'entity_single', 'office_scope', 'scoped_selection', 'text_range') and stem not in ('zip_code',):
        assert stem in SOURCES, f'no option source for {stem}'
assert set(EM) == {k for k, e in params_out.items() if e['type'] == 'enum_multi'}, set(EM) ^ {k for k, e in params_out.items() if e['type'] == 'enum_multi'}
actions_out = OrderedDict((k, params_out.pop(k)) for k in [k for k, e in params_out.items() if e['type'] == 'action'])
for a in actions_out.values():
    for drop in ('value_keys', 'first_phase'):
        a.pop(drop, None)

# every legacy default of a checkbox group must be a legal value (the parity default test of FLT-20 depends on it)
for stem, e in params_out.items():
    if e['type'] != 'enum_multi':
        continue
    per_report = defaultdict(list)
    for cid, m in EFF.items():
        if m['param'] and stem_of(m['param']) == stem and '.' in m['param']:
            per_report[REP_OF[cid]].append((m['param'].split('.')[1], m['default']))
    for rid, members in per_report.items():
        ticked = [mem for mem, d in members if d is True]
        if e['semantics']['accepts_all']:
            assert ticked == ['all'] or 'all' not in ticked, (stem, rid, ticked)
        assert len(ticked) >= e['semantics']['min_items'], f'{stem} on {rid}: legacy default {ticked} violates min_items'

# expressions name value keys only
ALL_KEYS = {k for e in params_out.values() for k in e['value_keys']}
for v in VP:
    ALL_KEYS.update(k for k in v['value_keys'])
for where, expr, keys in EXPR_USES:
    for k in keys:
        assert k in ALL_KEYS, f'{where}: expression {expr!r} uses unknown value key {k}'
for r0 in RULES:
    pk = r0['param']
    assert pk in params_out or pk in ALL_KEYS or any(v['param'].split('.')[0] == pk and v['report_id'] == r0['report_id'] for v in VP), f'rule on unknown parameter {pk}'

# option sources: first phase in which a report needs each source
src = OrderedDict()
for cid, m in EFF.items():
    if not m['param'] or m['status'] in (HELP, SUP):
        continue
    stem = stem_of(m['param'])
    for sk in SOURCES.get(stem, []):
        e = src.setdefault(sk, {'phases': defaultdict(int), 'params': [], 'reports': set()})
        e['phases'][CAT_PHASE[REPORTS[REP_OF[cid]]['category']]] += 1
        e['reports'].add(REP_OF[cid])
        if stem not in e['params']:
            e['params'].append(stem)
for v in VP:
    stem = v['param'].split('.')[0]
    for sk in SOURCES.get(stem, []):
        e = src.setdefault(sk, {'phases': defaultdict(int), 'params': [], 'reports': set()})
        e['phases'][CAT_PHASE[REPORTS[v['report_id']]['category']]] += 1
        e['reports'].add(v['report_id'])
        if stem not in e['params']:
            e['params'].append(stem)
sources_out = OrderedDict()
for sk in sorted(src, key=lambda k: (min(src[k]['phases']), k)):
    e = src[sk]
    sources_out[sk] = OrderedDict(first_phase=min(e['phases']), reports=len(e['reports']), parameters=e['params'],
                                  reports_per_phase=dict(sorted(e['phases'].items())))

out = OrderedDict()
out['meta'] = OrderedDict(
    generated_by='gen_map.py (rules and tables; regenerate, do not edit by hand). Generator and document builder are kept outside '
                 'the repository until work item FLT-22 commits them under tools/.',
    document='04_filter_framework.md',
    source='legacy/index/signatures.json',
    signature_count=len(SIGS), mapped=len(MAP), unmapped=[s['signature_id'] for s in unmapped],
    recurring_signatures=sum(1 for s in SIGS if s['count'] >= 2),
    control_count=len(CTL), control_overrides=len(OVR),
    param_convention='param is the value key (flat params object of 02_architecture.md section 3.2) that carries the legacy '
                     'control value; key.member addresses one part of a parameter (a checkbox of a group, the mode radio or '
                     'the picker of an office scope or scoped selection, a button). parameters[].value_keys lists the keys a '
                     'parameter contributes to params. param_type action marks a legacy button: it is never a parameter.',
    override_convention='mappings[] holds one mapping per signature. control_overrides[control_id] replaces param, param_type, '
                        'option_map, status and notes for that one control and gives its default directly; apply it after the '
                        'signature mapping. A control without an override takes the mapping of its signature.',
    rule_convention='enabled_when[control_id] holds the enabling rule of a control (captured = greyed for the 53 controls captured '
                    'greyed out, enabled for rules on controls captured enabled); expr is the stored form of the string. '
                    'option_enabled_when[control_id][option_value] holds the rule of one option of an enabled group. rules[] '
                    'holds visible / required / forced / default / label rules per report. The expression unknown (stored '
                    '["unknown"]) evaluates as true and must be resolved before the definition is published.',
    token_convention='default_map and control_overrides write tokens as bare names (today, working_office, first_option, all, none, '
                     'current_account, current_patient_name); a report definition writes context tokens as {"token": name} and '
                     'range defaults as a preset.',
    status_counts={k: {'signatures': v[0], 'controls': v[1]} for k, v in sorted(sig_status.items())},
    greyed_controls=len(GREYED), rules_on_enabled_controls=len(EW) - len(GREYED),
    controls_with_greyed_options=len(OEW),
)
out['mappings'] = list(MAP.values())
out['control_overrides'] = OVR
out['enabled_when'] = EW
out['option_enabled_when'] = OEW
out['rules'] = RULES
out['parameters'] = params_out
out['actions'] = actions_out
out['vendor_doc_parameters'] = VP
out['option_sources'] = sources_out
json.dump(out, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

derived = OrderedDict(
    effective={cid: OrderedDict(status=m['status'], param=m['param'], param_type=m['param_type'], default=m['default'],
                                overridden=m['overridden']) for cid, m in EFF.items()},
    variants={k: v['variants'] for k, v in usage.items()},
    collisions=collisions,
)
json.dump(derived, open(DERIVED, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

print(f'signatures={len(SIGS)} mapped={len(MAP)} unmapped={len(unmapped)} parameters={len(params_out)} actions={len(actions_out)} '
      f'value_keys={sum(len(e["value_keys"]) for e in params_out.values())} overrides={len(OVR)}')
print('status (signatures, controls):', {k: tuple(v) for k, v in sorted(sig_status.items())})
print('shared parameters (>=2 reports):', sum(1 for e in params_out.values() if e['reports'] >= 2))
print('enabled_when entries:', len(EW), 'greyed', len(GREYED), '| option rules', sum(len(v) for v in OEW.values()), '| rules', len(RULES),
      '| vendor/hidden params', len(VP))
print('collisions:', len(collisions))
for c in collisions:
    print('  ', c)
print('sources:', {k: v['first_phase'] for k, v in sources_out.items()})
