"""Assemble 04_filter_framework.md from doc_template.md + tables generated from the signature map.

Run:  python -I build_doc.py <index_dir> <signature_map.json> <derived.json> <template.md> <out.md>
"""
import glob
import json
import os
import re
import sys
from collections import OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dict_data import D, GROUP_TITLES  # noqa: E402
from expr_conv import to_expr  # noqa: E402

IDX, MAPF, DERF, TPL, OUT = sys.argv[1:6]
SIGS = json.load(open(os.path.join(IDX, 'signatures.json'), encoding='utf-8'))['signatures']
BY_ID = {s['signature_id']: s for s in SIGS}
SM = json.load(open(MAPF, encoding='utf-8'), object_pairs_hook=OrderedDict)
DER = json.load(open(DERF, encoding='utf-8'), object_pairs_hook=OrderedDict)
MAP = {m['signature_id']: m for m in SM['mappings']}
EW, OEW, RULES, OVR, VP = SM['enabled_when'], SM['option_enabled_when'], SM['rules'], SM['control_overrides'], SM['vendor_doc_parameters']
PARAMS, ACTIONS, SOURCES = SM['parameters'], SM['actions'], SM['option_sources']
EFF = DER['effective']
KEY2STEM = {k: stem for stem, p in list(PARAMS.items()) + list(ACTIONS.items()) for k in p['keys']}

CTL, REP_OF, REPORTS, CATS = {}, {}, OrderedDict(), OrderedDict()
for f in sorted(glob.glob(os.path.join(IDX, '*.controls.json'))):
    d = json.load(open(f, encoding='utf-8'))
    CATS[d['category']] = d
    for r in d['reports']:
        r['controls'] = [c for c in r['controls'] if c.get('origin') != 'vendor_doc']
        REPORTS[r['report_id']] = dict(r, category=d['category'])
        for c in r['controls']:
            CTL[c['control_id']] = c
            REP_OF[c['control_id']] = r['report_id']
SIG_OF = {c: s['signature_id'] for s in SIGS for c in s['control_ids']}
CAT_SHORT = {'appointment_reports': 'Appointment', 'daily_reports': 'Daily', 'insurance_reports': 'Insurance', 'ledger_reports': 'Ledger',
             'management_reports': 'Management', 'montly_reports': 'Monthly', 'my_reports': 'My Reports', 'ortho_reports': 'Ortho',
             'patients_list_reports': 'Lists-Patient', 'providers_list_reports': 'Lists-Provider', 'recall_reports': 'Recall',
             'refferal_reports': 'Referral', 'security_list_reports': 'Lists-Security', 'setup_list_reports': 'Lists-Setup',
             'statements_reports': 'Statements', 'treatmentplan_reports': 'Treatment Plan'}


def esc(s):
    return re.sub(r'\s+', ' ', str(s)).strip().replace('|', '\\|')


def rname(rid):
    r = REPORTS[rid]
    return f"{CAT_SHORT[r['category']]}: {r['name']}"


def stem_of(param):
    b = param.split('.')[0]
    return KEY2STEM.get(b, b)


def code(s):
    return f'`{s}`'


def jcode(v):
    return '`' + json.dumps(v) + '`'


def sig_range(ids):
    """Compress sig ids: sig0005, sig0006 -> 0005-0006."""
    nums = sorted(int(i[3:]) for i in ids)
    out, start, prev = [], None, None
    for n in nums:
        if start is None:
            start = prev = n
        elif n == prev + 1:
            prev = n
        else:
            out.append((start, prev))
            start = prev = n
    if start is not None:
        out.append((start, prev))
    return ', '.join(f'{a:04d}' if a == b else f'{a:04d}-{b:04d}' for a, b in out)


def clabel(cid):
    c = CTL[cid]
    return esc(c['section']) + (f" > {esc(c['label'])}" if c['label'] else '')


# ---------------------------------------------------------------------------------------------- shared dictionary
def t_dict():
    out = []
    shared = [k for k, p in PARAMS.items() if p['reports'] >= 2]
    missing = [k for k in shared if k not in D]
    assert not missing, missing
    for g, title in GROUP_TITLES:
        keys = [k for k in shared if PARAMS[k]['group'] == g]
        if not keys:
            continue
        out += [f'### {title}', '',
                '| Parameter = value keys - label | Type | Replaces: legacy section > label (controls) | Options | Default rule | Semantics | Backend application | Option source (`lookup:`) |',
                '|---|---|---|---|---|---|---|---|']
        for k in keys:
            p = PARAMS[k]
            opts, dflt, sem, be, lk = D[k]
            vk = p['value_keys']
            keys_txt = code(k) if vk == [k] else f'{code(k)} = ' + ', '.join(code(x) for x in vk)
            var = '; '.join(f"{esc(sec)}{' > ' + ' / '.join(esc(x) for x in e['labels']) if e['labels'] else ''} ({e['n']})"
                            for sec, e in DER['variants'][k].items())
            out.append(f"| {keys_txt} - {esc(p['label'])} | `{p['type']}` | {var} | {opts} | {dflt} | {sem} | {be} | {lk} |")
        out.append('')
        if g == 'people':
            out.append('{{T_PROVIDER_ROLES_BLOCK}}')
            out.append('')
    return '\n'.join(out).rstrip()


PROVIDER_ROLE_INFO = OrderedDict([
    ('provider_ids', ('declared by the report: `scope.provider_attribution`', 'the column of that attribution (03 section 5.2): treating, hygienist, credited or producing provider of a payment, billing or treating provider of a claim, appointment provider, preferred provider, note author', '-')),
    ('transaction_provider_ids', ('`treating`', '`rpt_charges.provider_id`', '`provider_ids` on a report whose attribution is `treating`')),
    ('appointment_provider_ids', ('`appointment`', '`rpt_appointment_facts.provider_id`', '`provider_ids` on a report whose attribution is `appointment`')),
    ('preferred_provider_ids', ('`preferred`', '`rpt_patient_dim.preferred_provider_id`', '`provider_ids` on a report whose attribution is `preferred`')),
    ('preferred_hygienist_ids', ('`preferred_hygienist`', '`rpt_patient_dim.preferred_hygienist_id`', 'none (always its own key: it appears beside `preferred_provider_ids`)')),
    ('visit_doctor_ids', ('`ortho_visit`', 'doctor of the ortho visit (`ortho_visits`, NEW in 03)', 'none (appears beside `appointment_provider_ids` on Missing Ortho Visits)')),
    ('referred_from_provider_ids', ('`referring`', 'referring provider of the referral case (NEW in 03)', 'none')),
    ('referred_to_provider_ids', ('`referred_to`', 'receiving provider of the referral case (NEW in 03)', 'none')),
])


def t_provider_roles():
    have = [k for k, p in PARAMS.items() if 'provider_role' in p]
    assert sorted(have) == sorted(PROVIDER_ROLE_INFO), sorted(set(have) ^ set(PROVIDER_ROLE_INFO))
    out = ['| Parameter | `provider_role` | Column filtered | Same concept as | Reports |', '|---|---|---|---|---|']
    for k, (role, col, same) in PROVIDER_ROLE_INFO.items():
        out.append(f"| {code(k)} | {role} | {col} | {same} | {PARAMS[k]['reports']} |")
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------- sections
SECTION_NOTES = {
    'PRINT FORMAT': 'Export format. Appointment List also has it (hidden in our capture, 9.7).',
    'OFFICE/GROUP': 'One `office_scope` parameter (section 6).',
    'OTHER OPTIONS': 'One parameter per control: booleans, plus the age range, the amount comparison, the aging buckets of Outstanding Claims and layout members.',
    'DATE RANGE': 'Primary range. Basis fixed by the report (7.2), or `date_basis` when the section has a radio; `date_basis_set` on Insurance Plan List.',
    'PROVIDER': 'Row label Preferred Provider on Progress Notes maps to `preferred_provider_ids`. Aging reports add the grouping controls.',
    'EXCLUDE PATIENT TYPE': 'Exclude filter on user-defined patient types.',
    'REPORT FORMAT': 'Detail / Summary. Account Ledger / Patient Ledger is a variant, hence `report_type`.',
    'CARRIER': 'Both label variants (Carriers, no label).',
    'APPOINTMENT DATE RANGE': 'Primary range. Basis `appointment_date`, or chosen with `date_basis` (radio in the section on Appointment Detail by User; radio titled REPORT TYPE on Lab Cost Report).',
    'GROUP BY': 'Radio = `group_by`; Page Break checkbox = `page_break_by.group`. Controls not captured on Internal Referral Management.',
    'EXCLUDE RESP. PARTY TYPE': 'Same parameter as EXCLUDE RESPONSIBLE PARTY TYPE.',
    'REPORT BY': 'Variant / dimension selector. One collapsed dropdown signature, five different lists: mapped per control (15.4, 11.1).',
    'REPORT DATE': 'Report Date = `report_date`; Billing Date = `billing_date`; radio on Claims Not Created = `date_basis`.',
    'SORT BY': '`sort_by`; Print Blank Routing Slip sits in this section on Routing Slip.',
    'PATIENT TYPE': 'Ortho-patient flag, not the user-defined types.',
    'PROCEDURE DATE RANGE': 'Primary range, basis `service_date`.',
    'REPORT TYPE': 'Three meanings (R4): Summary / Detail = `report_format`; Lab Report variants = `report_type`; on Lab Cost Report the radio is the date basis of the range = `date_basis`.',
    'SPECIALTY': 'Lookup dropdown.',
    'USER': 'Both label variants; Include User in Filters gates the picker on Insurance Plan List.',
    'CLAIM TYPE': 'Radio Both / Dental / Medical = `claim_type`; checkboxes on Claims Not Created = `coverage_orders`.',
    'CODES': 'Procedure code picker.',
    'DIAGNOSED DATE RANGE': 'Primary range, basis `diagnosed_date`.',
    'PROVIDER/USER': 'Two pickers in one section.',
    'CATEGORY': 'Picker and dropdown variants share the key.',
    'FEE SCHEDULE TO COMPARE': 'Both label variants; info icon = help text.',
    'NAME RANGE': 'Patient name range (vendor sample footer: Pat From / Thru).',
    'PAYMENT TYPES': 'Checkbox group = `payment_types` (tender categories); picker on Collection Report = `payment_codes`.',
    'PREFERRED PROVIDER': 'Both label variants.',
    'REFERRAL DATE RANGE': 'Primary range, basis `referral_date`.',
    'RESPONSIBLE PARTY NAME RANGE': 'Same parameter as the Start Name / End Name pair of Statements.',
    'STATUSES': 'Checkbox grid = `referral_statuses`; radio on Internal Referral Management = `referral_completion`.',
    'TRANSACTION TYPES': 'Adjustment (singular) on Super Bill is the same member.',
    'AGING': 'Bucket checkboxes = `aging_buckets`; the two credit-balance checkboxes are booleans.',
    'APPOINTMENT TYPE': 'Regular / Archived on Appointment Detail; Length and Status on Appointment List.',
    'CREATED DATE RANGE': 'Primary range, basis `created_date`.',
    'CREATED ON DATE RANGE': 'Primary range, basis `created_date`.',
    'EXCLUDE RESPONSIBLE PARTY TYPE': 'Same parameter as EXCLUDE RESP. PARTY TYPE.',
    'FEE SCHEDULE': 'One dropdown signature, two meanings: list filter `fee_schedule_ids` on Fee Schedule List, one required schedule `fee_schedule_id` on Procedure Codes by Fee Schedule (15.4).',
    'ORTHO START DATE': 'Optional attribute range.',
    'PATIENT': 'One box signature, two meanings: optional filter `patient_ids` on Audit Trail, mandatory single patient `patient_id` on Patient\'s Notes (15.4). SEARCH button superseded.',
    'PATIENT NAME RANGE': 'Same parameter as NAME RANGE.',
    'PLAN TYPE': 'Payment plan type.',
    'PRODUCTION BY': 'Variant selector (no None option).',
    'REFERRED FROM OFFICE/GROUP': 'Second office scope.',
    'REFERRED TO OFFICE/GROUP': 'Third office scope.',
    'RESPONSIBLE PARTY': 'One guarantor account (`accounts.id`); SEARCH button superseded.',
    'STATUS': 'Status of the procedure code.',
    'ANALYSIS BY': 'Variant selector.',
    'ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.)': 'Primary range, basis `anniversary_date`; header note kept as help text.',
    'APPOINTMENT CREATED DATE RANGE': 'Secondary range, enabled by `date_range_type`.',
    'CAPITATION FEE SCHEDULE': 'Lookup limited to capitation fee schedules (`pricing_model = copay`).',
    'CODE/CATEGORY': 'Radio + picker whose list depends on the radio; NONE button superseded.',
    'COLLECTION BY': 'Has None and the Page Break twin, hence `group_by`; the value `code` also selects another block (section 8).',
    'CORRESPONDING PROVIDER': 'Read-only display.',
    'DATE RANGE TYPE': 'Chooses which of the two ranges apply.',
    'EFFECTIVE DATE': 'Lookup dropdown, not a calendar box; depends on `fee_schedule_id`.',
    'FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS )': 'Optional attribute range on the first visit to the practice; header instruction kept as help text.',
    'INSURANCE PLANS/SUB TYPES': 'One picker for plans and sub types: one parameter with typed values (`unknown_legacy` until the dialog is read).',
    'LAST VISIT DATE RANGE': 'Mislabel on Provider Holidays: primary range, basis `holiday_date`.',
    'LOCATION': 'OFFICE/GROUP spelled differently.',
    'PAGE BREAK BY': 'Radio.',
    'PATIENT FIRST VISIT': 'Ortho Report: first Ortho Treatment Card entry - not the parameter of FIRST VISIT DATE RANGE.',
    'PATIENT LAST VISIT': 'Patients by Ortho Status: last Ortho Treatment Card entry - not the general last visit.',
    'PATIENTS': 'Optional patient filter of Routing Slip (blank = every patient with an appointment).',
    'PAYMENT/ADJ CODES': 'Include picker with default None; NONE button superseded.',
    'PLAN SETUP DATE RANGE': 'Primary range, basis `plan_setup_date`.',
    'PRINT NOTES': 'Note types to print (vendor documentation); dialog not captured.',
    'PROGRESS NOTES TO PRINT': 'Variant selector.',
    'RECALL DATE RANGE': 'Radio = `recall_date_mode`; dates = primary range, basis `recall_due_date`.',
    'REFERRAL OUT TO': 'Same parameter as REFERRED TO.',
    'REFERRED OUT DATE RANGE': 'Primary range, basis `referred_out_date`.',
    'REFFERED TO PROVIDER': 'Legacy misspelling of REFERRED TO PROVIDER.',
    'SCHEDULED DATE RANGE': 'Primary range, basis `scheduled_date`.',
    'SUMMARY/DETAIL': 'Report format spelled differently.',
    'TREATMENT PLAN/RECALL': 'Variant selector.',
    'VISIT DATE': 'Primary range, basis `ortho_visit_date`.',
    '[?]': 'Header hidden in our capture; vendor screenshots: REPORT FORMAT TO PRINT.',
    '[no header] BELOW THE TABLES': 'Two static texts kept as help text; the six message boxes they refer to are in 9.7.',
    '[no header] LEFT TABLE': 'Statements screen, left table. FINANCE CHARGES is a definition action, not a parameter.',
    '[no header] RIGHT TABLE': 'Statements screen, right table. PAPER STATEMENT SENT is a definition action, not a parameter.',
}


def t_sections():
    sec = OrderedDict()
    for cid, c in CTL.items():
        e = sec.setdefault(re.sub(r'\s+', ' ', c['section']).strip(), {'reports': set(), 'sigs': [], 'cids': []})
        e['reports'].add(REP_OF[cid])
        e['cids'].append(cid)
        sid = SIG_OF[cid]
        if sid not in e['sigs']:
            e['sigs'].append(sid)
    rows = sorted(sec.items(), key=lambda kv: (-len(kv[1]['reports']), kv[0]))
    assert len(rows) == 146, len(rows)
    for t in SECTION_NOTES:
        assert t in sec, t
    out = ['| # | Legacy section title | Reports | Signatures | `param`: value keys and members | Note |', '|---|---|---|---|---|---|']
    for i, (title, e) in enumerate(rows, 1):
        keys, extra = [], []
        for cid in e['cids']:
            m = EFF[cid]
            if m['status'] == 'help_text':
                if 'help text' not in extra:
                    extra.append('help text')
                continue
            if not m['param']:
                continue
            p = m['param']
            if m['status'] == 'superseded':
                p += ' (superseded)'
            elif m['param_type'] == 'action':
                p += ' (definition action)'
            if p not in keys:
                keys.append(p)
        grouped = OrderedDict()
        for k in keys:
            if '.' in k and '(' not in k:
                b, mem = k.split('.', 1)
                grouped.setdefault((b, 'members'), []).append(mem)
            else:
                grouped[(k, 'plain')] = None
        parts = []
        for (k, _kind), mems in grouped.items():
            if mems is None:
                m2 = re.match(r'^(\S+)( \(.*\))?$', k)
                parts.append(code(m2.group(1)) + (m2.group(2) or ''))
            elif len(mems) == 1:
                parts.append(code(f'{k}.{mems[0]}'))
            else:
                parts.append(code(k + '.{' + ', '.join(mems) + '}'))
        cell = ', '.join(parts)
        if extra:
            cell = (cell + '; ' if cell else '') + '; '.join(extra)
        out.append(f"| {i} | {esc(title)} | {len(e['reports'])} | {len(e['sigs'])} | {cell} | {SECTION_NOTES.get(title, '')} |")
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------- dependency tables
def rule_rows(captured):
    out = ['| # | Control id | Report | Legacy section > label | Parameter | `enabled_when` | Evidence | States never observed (control left enabled) | Basis |',
           '|---|---|---|---|---|---|---|---|---|']
    i = 0
    for cid, e in EW.items():
        if e['captured'] != captured:
            continue
        i += 1
        out.append(f"| {i} | `{cid}` | {esc(rname(REP_OF[cid]))} | {clabel(cid)} | {code(EFF[cid]['param'])} | `{e['enabled_when']}` | {e['evidence']} | {esc(e['unobserved']) or '-'} | {esc(e['basis'])} |")
    return '\n'.join(out), i


def ev_counts(captured):
    c = defaultdict(int)
    for e in EW.values():
        if e['captured'] == captured:
            c[e['evidence']] += 1
    return ', '.join(f'{k} {v}' for k, v in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])))


def short_reports(rids):
    """'Ledger: Ledger Report; Ledger: Walkout Report' -> 'Ledger: Ledger Report, Walkout Report'."""
    by_cat = OrderedDict()
    for rid in rids:
        by_cat.setdefault(CAT_SHORT[REPORTS[rid]['category']], []).append(REPORTS[rid]['name'])
    return '; '.join(f"{c}: {', '.join(esc(n) for n in names)}" for c, names in by_cat.items())


def t_opt_greyed():
    out = ['| Control ids | Report | Parameter | Greyed option | Option `enabled_when` | Evidence | Basis |', '|---|---|---|---|---|---|---|']
    n = 0
    merged = OrderedDict()
    for cid, opts in OEW.items():
        for o, e in opts.items():
            n += 1
            k = (EFF[cid]['param'], e['enabled_when'], e['evidence'], e['basis'], REP_OF[cid] if e['enabled_when'] != 'false' else '')
            m = merged.setdefault(k, {'cids': [], 'opts': [], 'rids': []})
            if cid not in m['cids']:
                m['cids'].append(cid)
                m['rids'].append(REP_OF[cid])
            if o not in m['opts']:
                m['opts'].append(o)
    for (param, expr, ev, basis, _r), m in merged.items():
        out.append(f"| {', '.join(code(c) for c in m['cids'])} | {short_reports(m['rids'])} | {code(param)} | {', '.join(code(o) for o in m['opts'])} | `{expr}` | {ev} | {esc(basis)} |")
    return '\n'.join(out), n


def t_rules():
    """Rules with the same parameter, field, condition, value, evidence and note are listed once, with all their reports."""
    out = ['| Report | Parameter | Field | Condition | Value | Evidence | Note |', '|---|---|---|---|---|---|---|']
    merged = OrderedDict()
    for r in RULES:
        k = (r['param'], r['field'], r['when'], json.dumps(r['value']), r['evidence'], r['note'])
        merged.setdefault(k, []).append(r['report_id'])
    for (param, field, when, value, ev, note), rids in merged.items():
        v = '-' if value == 'null' else '`' + value + '`'
        out.append(f"| {short_reports(rids)} | {code(param)} | `{field}` | `{when}` | {v} | {ev} | {esc(note)} |")
    return '\n'.join(out)


def t_vparams(kind):
    """Entries that differ only by report, or only by the key of one of the six message boxes, are listed in one row."""
    out = ['| Report | Parameter | Type | Value keys | Legacy control | Options | Default | Evidence | Note |', '|---|---|---|---|---|---|---|---|---|']
    n = 0
    merged = OrderedDict()
    for v in VP:
        if v['kind'] != kind:
            continue
        n += 1
        msg = v['param'].endswith('_message')
        ctrl = v['legacy_control'].rsplit(' > ', 1)[0] if msg else v['legacy_control']
        k = (v['report_id'] if msg else '', '' if msg else v['param'], v['param_type'], '' if msg else json.dumps(v['value_keys']), ctrl,
             v['options'], v['default'], v['evidence'], v['note'])
        m = merged.setdefault(k, {'rids': [], 'params': [], 'keys': [], 'labels': []})
        if v['report_id'] not in m['rids']:
            m['rids'].append(v['report_id'])
        if v['param'] not in m['params']:
            m['params'].append(v['param'])
        for vk in v['value_keys']:
            if vk not in m['keys']:
                m['keys'].append(vk)
        if msg:
            m['labels'].append(v['legacy_control'].rsplit(' > ', 1)[1])
    for (_r, _p, ptype, _vk, ctrl, options, default, ev, note), m in merged.items():
        if m['labels']:
            ctrl = f"{ctrl} > {' / '.join(m['labels'])}"
        vk = 'as the key' if m['keys'] == m['params'] else ', '.join(code(k) for k in m['keys'])
        out.append(f"| {short_reports(m['rids'])} | {', '.join(code(p) for p in m['params'])} | `{ptype}` | {vk} | {esc(ctrl)} | {esc(options) or '-'} | {esc(default) or '-'} | {ev} | {esc(note)} |")
    return '\n'.join(out), n


EXTRA_EXPR = [
    ('age_range_enabled == true and age_from is not empty', 'example: two conditions'),
    ('ctx.provider_restricted', '02: run limited to the provider linked to the caller'),
]


def t_expr():
    rows = OrderedDict()

    def use(s, stored, where):
        e = rows.setdefault(s, [stored, defaultdict(int)])
        assert e[0] == stored, s
        e[1][where] += 1

    for e in EW.values():
        use(e['enabled_when'], e['expr'], '9.3' if e['captured'] == 'greyed' else '9.6')
    for opts in OEW.values():
        for e in opts.values():
            use(e['enabled_when'], e['expr'], '9.4')
    for r in RULES:
        use(r['when'], r['expr'], '9.5')
    out = ['| String notation | Stored form (02 grammar) | Used by (section: number of rules) |', '|---|---|---|']
    for s, (stored, uses) in rows.items():
        assert to_expr(s)[0] == stored, s
        out.append(f"| `{s}` | {jcode(stored)} | {', '.join(f'{w}: {n}' for w, n in uses.items())} |")
    for s, where in EXTRA_EXPR:
        if s in rows:
            continue
        stored, keys = to_expr(s)
        for k in keys:
            assert k in KEY2STEM or any(k in p['value_keys'] for p in PARAMS.values()), (s, k)
        out.append(f"| `{s}` | {jcode(stored)} | {where} |")
    return '\n'.join(out), len(rows)


# ---------------------------------------------------------------------------------------------- checkbox groups
def t_em():
    out = ['| Parameter | Members | All box | `validation.min_items` | `semantics.full_selection` | Empty list means | Legacy default per report |',
           '|---|---|---|---|---|---|---|']
    for k, p in PARAMS.items():
        if p['type'] != 'enum_multi':
            continue
        s = p['semantics']
        members = [x.split('.', 1)[1] for x in p['param_values'] if '.' in x]
        per = OrderedDict()
        for cid, m in EFF.items():
            if m['param'] and stem_of(m['param']) == k and '.' in m['param']:
                per.setdefault(REP_OF[cid], []).append((m['param'].split('.', 1)[1], m['default']))
        dfl = OrderedDict()
        for rid, mem in per.items():
            ticked = [a for a, d in mem if d is True]
            if ticked == ['all']:
                txt = '`all`'
            elif len(ticked) == len(mem):
                txt = 'all ticked'
            elif not ticked:
                txt = 'none ticked'
            else:
                txt = ', '.join(code(a) for a in ticked)
            dfl.setdefault(txt, []).append(rname(rid))
        dtxt = '; '.join(f"{t} ({', '.join(names)})" for t, names in dfl.items())
        allbox = 'yes: scalar `"all"`' if s['accepts_all'] else 'no'
        out.append(f"| {code(k)} | {', '.join(code(m) for m in members if m != 'all')} | {allbox} | {s['min_items']} | `{s['full_selection']}` | {esc(s['empty_selection'])} | {esc(dtxt)} |")
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------- appendix
def t_appendix():
    out = ['| Parameter | Type | Value keys | `param` values in the map | Signature ids (sigNNNN) | Controls | Reports | Status of the controls |', '|---|---|---|---|---|---|---|---|']
    for g, _title in GROUP_TITLES:
        for k, p in PARAMS.items():
            if p['group'] != g:
                continue
            st = ', '.join(f'{s} {n}' for s, n in p['control_statuses'].items())
            vk = ', '.join(code(x) for x in p['value_keys']) or 'none'
            out.append(f"| {code(k)} | `{p['type']}` | {vk} | {', '.join(code(x) for x in p['param_values'])} | {sig_range(p['signature_ids'])} | {p['controls']} | {p['reports']} | {st} |")
    assert all(p['group'] in dict(GROUP_TITLES) for p in PARAMS.values())
    return '\n'.join(out)


def t_actions():
    info = {
        'run_finance_charges': ('FINANCE CHARGES', '`navigate` to the NEW definition `statements.finance_charges`: a run with side effects (02 section 5.9) with five criteria of its own - `finance_charge_date`, `responsible_party_name`, `exclude_resp_party_type_codes`, `provider_ids`, `finance_charge_basis` = `patient_portion` / `entire_balance`. Its values are never parameters of the statement run', 'always enabled'),
        'paper_statement_sent': ('PAPER STATEMENT SENT', 'Not documented (open decision 15). Candidates: `navigate` to Responsible Party - Statements Sent with `statement_type = paper` (the row caption of the button is Print Reports), or the bulk action over the snapshot of a `statements` run that 02 section 5.9 names', '`unknown` (9.3)'),
    }
    assert sorted(info) == sorted(ACTIONS), sorted(ACTIONS)
    out = ['| Action key | Legacy button | Signature | Control | Kind and target | `enabled_when` | Status |', '|---|---|---|---|---|---|---|']
    for k, a in ACTIONS.items():
        sid = [s for s in a['signature_ids'] if BY_ID[s]['type'] == 'button'][0]
        cid = BY_ID[sid]['control_ids'][0]
        out.append(f"| {code(k)} | {info[k][0]} | {sid} | `{cid}` | {info[k][1]} | {info[k][2]} | {MAP[sid]['status']} |")
    return '\n'.join(out)


def t_overrides():
    out = ['| Control id | Report | Legacy section > label | Mapping of the signature | Mapping of this control | Default | Reason |', '|---|---|---|---|---|---|---|']
    for cid, o in OVR.items():
        b = MAP[o['signature_id']]
        om = ''
        if o['option_map']:
            om = '; options ' + ', '.join(f"{esc(k)} -> `{v}`" for k, v in o['option_map'].items())
        d = 'empty (`null`)' if o['default'] is None else ('-' if o['default'] == '' else code(o['default']))
        out.append(f"| `{cid}` | {esc(rname(REP_OF[cid]))} | {clabel(cid)} | {o['signature_id']}: {code(b['param'])}, `{b['param_type']}`, {b['status']} | {code(o['param'])}, `{o['param_type']}`, {o['status']}{om} | {d} | {esc(o['reason'])} |")
    return '\n'.join(out)


def t_status():
    sc = SM['meta']['status_counts']
    order = ['replicated', 'replicated_enhanced', 'superseded', 'help_text', 'unknown_legacy', 'not_applicable']
    out = ['| Status | Signatures | Controls |', '|---|---|---|']
    ts = tc = 0
    for k in order:
        v = sc.get(k, {'signatures': 0, 'controls': 0})
        ts += v['signatures']
        tc += v['controls']
        out.append(f"| {k} | {v['signatures']} | {v['controls']} |")
    out.append(f'| **Total** | **{ts}** | **{tc}** |')
    assert ts == 358 and tc == 1025, (ts, tc)
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------- section 11 tables
def t_dropdowns():
    static = {'sig0011', 'sig0110', 'sig0172', 'sig0173', 'sig0196', 'sig0221', 'sig0231', 'sig0264', 'sig0317', 'sig0318', 'sig0339'}
    confirm = {
        'sig0011': 'Every length value after Any',
        'sig0056': 'List order, list content and the default rule; why Capitation Utilization shows another schedule than the Production Reports (15.4)',
        'sig0110': 'Every operator after All Amount', 'sig0172': 'Every audit type (vendor text names the tracked actions Edit, Delete, Close out, Reschedule Appointment, Cut/Copy - Paste Appointment)',
        'sig0173': 'Every module type (vendor documentation confirms Appointments)',
        'sig0196': 'Five reports, five lists: three are known from vendor screenshots and mapped per control (table below); still unread: My Daily Journal, Patients Seen',
        'sig0202': 'As Fee Schedule To Compare', 'sig0221': 'Every value after the placeholder',
        'sig0227': 'List source (provider specialties, referral specialties or both)', 'sig0231': 'Values after Both',
        'sig0240': 'Whether territories or non-US values are listed', 'sig0259': 'List source and order', 'sig0264': 'Values after ALL (Referred To, Referred By, Both?)',
        'sig0305': 'List source (14 code categories of the code dialog?)', 'sig0306': 'List source',
        'sig0315': 'Whether ALL is offered on Procedure Codes by Fee Schedule and its default rule (that control is mapped to `fee_schedule_id`, 15.4)',
        'sig0316': 'List content; default = earliest or latest date', 'sig0317': 'Values after ALL (vendor field Type: Payment, Adjustment)', 'sig0318': 'Values after ALL (vendor field Sub Type: None, Cash, Check, Credit Card, Care Credit, Direct Deposit; Collection, Production)',
        'sig0319': 'Whether only capitation fee schedules are listed', 'sig0320': 'List source', 'sig0339': 'Every day count after 0',
        'sig0351': 'List source in DentC (which `letter_type` holds Financial Disclosure letters); the default rule is documented',
    }
    rows = [s for s in SIGS if s['type'] == 'dropdown']
    assert len(rows) == 23, len(rows)
    out = ['| Signature | Section > label | Reports | Captured default | Parameter | List kind | Status | To confirm on the live tool |', '|---|---|---|---|---|---|---|---|']
    for s in rows:
        m = MAP[s['signature_id']]
        lab = f" > {esc(s['label'])}" if s['label'] else ''
        ovr = [c for c in s['control_ids'] if c in OVR]
        st = m['status'] + (f' ({len(ovr)} of {s["count"]} controls mapped per control)' if ovr else '')
        out.append(f"| {s['signature_id']} | {esc(s['section'])}{lab} | {s['count']} | {'; '.join(esc(d0) for d0 in s['defaults'])} | {code(m['param'])} | {'static list, options unknown' if s['signature_id'] in static else 'lookup'} | {st} | {confirm[s['signature_id']]} |")
    return '\n'.join(out)


def t_report_by_lists():
    out = ['| Report | Control id | Legacy values (first = default as captured) | `report_by` values | Status of the control |', '|---|---|---|---|---|']
    for cid in BY_ID['sig0196']['control_ids']:
        m = EFF[cid]
        if cid in OVR and OVR[cid]['option_map']:
            om = OVR[cid]['option_map']
            dv = OVR[cid]['default']
            labels = [k for k, v in om.items() if v == dv] + [k for k, v in om.items() if v != dv]
            out.append(f"| {esc(rname(REP_OF[cid]))} | `{cid}` | {', '.join(esc(x) for x in labels)} | {', '.join(code(om[x]) for x in labels)} | {m['status']} |")
        else:
            out.append(f"| {esc(rname(REP_OF[cid]))} | `{cid}` | {esc(CTL[cid]['default_value'])} (list not read) | {code(m['default'])} | {m['status']} |")
    return '\n'.join(out)


def t_trunc():
    res = {
        'appointment_reports.r01': 'Resolved by vendor screenshots: a PRINT FORMAT section and the header REPORT FORMAT TO PRINT sit above the visible area. Still open: enabled sets of four list types.',
        'appointment_reports.r08': 'Resolved by vendor screenshots: the clipped row is Include Patient Home Office and nothing follows. Still open: its default.',
        'daily_reports.r02': 'Cleared: a vendor screenshot shows empty space below GROUP BY.',
        'daily_reports.r12': 'Confirmed truncated: vendor documentation shows a Sort By row (Patient LastName / Patient ID / Date) below Group By (9.7).',
        'montly_reports.r03': 'Resolved by vendor screenshots: SORT BY is the last section; both labels confirmed.',
        'montly_reports.r04': 'Resolved by vendor screenshots: SORT BY is the last section; both labels confirmed.',
        'recall_reports.r03': 'Cleared: Include Inactive Patients is the last control (vendor screenshot).',
        'refferal_reports.r04': 'Open: Exclude Deleted Referrals and a GROUP BY section may follow the status grid; no vendor screenshot.',
        'refferal_reports.r07': 'Open: the GROUP BY header is visible but none of its controls; no vendor screenshot.',
        'treatmentplan_reports.r01': 'Open: one more OTHER OPTIONS row is hidden (vendor candidates: Print Account Name, Good Faith Estimate, X-Rays).',
        'treatmentplan_reports.r02': 'Cleared: a full-height vendor screenshot shows exactly two options.',
    }
    rows = [(rid, r) for rid, r in REPORTS.items() if r.get('possibly_truncated') or r.get('possibly_truncated_screenshot')]
    assert len(rows) == 11 and all(rid in res for rid, _ in rows), [rid for rid, _ in rows]
    out = ['| Report | Report id | Status after the vendor documentation |', '|---|---|---|']
    for rid, r in rows:
        out.append(f'| {esc(rname(rid))} | `{rid}` | {res[rid]} |')
    return '\n'.join(out)


def t_unreadable():
    res = {
        'appointment_reports.r01.s01.c01': ('`report_type`', 'Section title unreadable. Vendor screenshots: REPORT FORMAT TO PRINT. Options and default fully readable.'),
        'appointment_reports.r08.s10.c03': ('`include_patient_home_office`', 'Row content unreadable. Vendor screenshots: checkbox Include Patient Home Office. Default unknown.'),
        'montly_reports.r03.s12.c01': ('`sort_by`', 'Labels read from the top two pixel rows. Vendor screenshots confirm Resp. Party Last name / Resp. Party ID.'),
        'montly_reports.r04.s12.c01': ('`sort_by`', 'As above.'),
    }
    rows = []
    for cid, c in CTL.items():
        text = ' '.join([c['label'], ' '.join(c['options']), c['default_value'], c['section']])
        if '[?]' in text:
            rows.append(cid)
    assert sorted(rows) == sorted(res), rows
    out = ['| Control id | Report | Parameter | What is unreadable and what is known |', '|---|---|---|---|']
    for cid in rows:
        out.append(f'| `{cid}` | {esc(rname(REP_OF[cid]))} | {res[cid][0]} | {res[cid][1]} |')
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------- office scope tables
def t_locks():
    out = ['| Report | Mode radio | Picker | Declared in the definition | Evidence |', '|---|---|---|---|---|']
    led = ('`validation.allowed_modes: [office]`; `forced_when: [{"when": true, "value": {"office_ids": {"token": "working_office"}}}]` on the parameter `office_scope`')
    ledger = ['ledger_reports.r01', 'ledger_reports.r02', 'ledger_reports.r03', 'ledger_reports.r04']
    notes = [
        (ledger, ('Office Group option greyed', 'greyed', led, 'shown; vendor screenshots show the same')),
        (['daily_reports.r07'], ('Office Group option greyed', 'enabled', '`validation.allowed_modes: [office]`', 'shown')),
        (['refferal_reports.r03'], ('whole group greyed', 'greyed', '`scope.office_mode = optional`; `enabled_when: false` with `disabled_value: {"office_ids": "all"}`: the control is display-only and the run uses the catalog rule of 6.5', 'shown; display-only by design per vendor documentation')),
    ]
    forced = {r['report_id'] for r in RULES if r['param'] == 'office_scope' and r['field'] == 'forced_when'}
    assert set(ledger) <= forced
    for rids, n in notes:
        out.append(f'| {short_reports(rids)} | {n[0]} | {n[1]} | {n[2]} | {n[3]} |')
    return '\n'.join(out)


CATALOG_REPORTS = ['setup_list_reports.r08', 'setup_list_reports.r10', 'setup_list_reports.r11']


def t_no_office():
    scope_sigs = {'sig0002', 'sig0003', 'sig0296', 'sig0297', 'sig0265', 'sig0266', 'sig0282', 'sig0283'}
    groups = OrderedDict()
    n = 0
    for rid, r in REPORTS.items():
        if any(SIG_OF[c['control_id']] in scope_sigs for c in r['controls']):
            continue
        n += 1
        g = CAT_SHORT[r['category']]
        if rid in CATALOG_REPORTS:
            g += ' (office-pinned catalogs)'
        groups.setdefault(g, []).append(r['name'])
    implicit = {
        'Lists-Patient': '`scope.office_mode = none`, valid only because `patient_id` is required: the run is one chart, the chart is organisation-wide, and the selected patient must be a chart the caller may open (`assert_patient_visible` [V], 403 `patient_not_in_office`; 08 S-10)',
        'Lists-Security': '`scope.office_mode = none` - users, groups and rights are organisation-level',
        'Lists-Setup': '`scope.office_mode = none` - carriers, employers, plans, codes, macros and types have no office column',
        'Lists-Setup (office-pinned catalogs)': '`scope.office_mode = optional` with a hidden `office_scope` (default `all`): fee schedules are office-pinned catalogs in DentC (`office_scope=_CATALOG` in `app/api/v1/registry.py` [V]). Catalog rule: rows pinned to an office the caller may read plus rows without an office; every row for a caller with the view-all right. The legacy tool lists them organisation-wide; whether DentC follows that is decided in 08',
        'Statements': '`scope.office_mode = required` with a hidden `office_scope` forced to `working_office` - the statement run is per office (legacy reminder to update statement dates after printing the respective office statements)',
    }
    assert set(groups) == set(implicit), set(groups) ^ set(implicit)
    hidden = {v['report_id'] for v in VP if v['param'] == 'office_scope' and v['kind'] == 'hidden'}
    assert hidden == set(CATALOG_REPORTS) | {'statements_reports.r01'}, hidden
    out = ['| Category | Reports without an office control | Scope declared in the definition (02 `scope.office_mode`; inferred) |', '|---|---|---|']
    for g, names in groups.items():
        out.append(f"| {g} | {'; '.join(esc(x) for x in names)} | {implicit[g]} |")
    return '\n'.join(out), n


# ---------------------------------------------------------------------------------------------- dates
DATE_ROWS = [
    # (section, keys, basis, note)
    ('DATE RANGE', '`date_from`, `date_to`', '`date_basis` (radio in the section on 8 reports), `date_basis_set` (Insurance Plan List), else the fixed basis of the report (table below, 36 reports)', 'Unallocated Payment/Adjustments: `print_all_unallocated_as_of_today` replaces the range'),
    ('APPOINTMENT DATE RANGE', '`date_from`, `date_to`', '`appointment_date`; `date_basis` where the section has a radio (Appointment Detail by User) or the report has the radio titled REPORT TYPE (Lab Cost Report)', 'On DPS Eligibility Report it is one of two ranges (`date_range_type`)'),
    ('PROCEDURE DATE RANGE', '`date_from`, `date_to`', '`service_date`', ''),
    ('DIAGNOSED DATE RANGE', '`date_from`, `date_to`', '`diagnosed_date`', 'Every treatment-plan report filters on the diagnosed date'),
    ('REFERRAL DATE RANGE', '`date_from`, `date_to`', '`referral_date`', ''),
    ('CREATED DATE RANGE', '`date_from`, `date_to`', '`created_date`', 'Unreliable on migrated rows'),
    ('CREATED ON DATE RANGE', '`date_from`, `date_to`', '`created_date`', 'Same concept as CREATED DATE RANGE'),
    ('ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.)', '`date_from`, `date_to`', '`anniversary_date`', 'Default is next month onward, one year'),
    ('LAST VISIT DATE RANGE', '`date_from`, `date_to`', '`holiday_date`', 'Legacy mislabel on Provider Holidays'),
    ('PLAN SETUP DATE RANGE', '`date_from`, `date_to`', '`plan_setup_date`', ''),
    ('RECALL DATE RANGE', '`date_from`, `date_to`, `recall_date_mode`', '`recall_due_date`', '`recall_date_mode = no_recall_date` = recalls without a due date (`recall_due_date IS NULL`); the two dates are then disabled (to confirm, 11.5)'),
    ('REFERRED OUT DATE RANGE', '`date_from`, `date_to`', '`referred_out_date`', ''),
    ('SCHEDULED DATE RANGE', '`date_from`, `date_to`', '`scheduled_date`', ''),
    ('VISIT DATE', '`date_from`, `date_to`', '`ortho_visit_date`', 'Ortho Daily Journal: date of the Ortho Treatment Card entry'),
    ('APPOINTMENT CREATED DATE RANGE', '`appointment_created_date_from`, `appointment_created_date_to`', 'secondary range on the creation date of the appointment (dataset column of basis `created_date`)', 'Enabled by `date_range_type`'),
    ('DATE RANGE TYPE', '`date_range_type`', '-', '`appointment_date`, `appointment_created_date`, `both`'),
    ('ORTHO START DATE', '`ortho_start_date_from`, `ortho_start_date_to`', 'attribute range: start date of the ortho payment plan', 'Optional; blank = no restriction'),
    ('PATIENT FIRST VISIT', '`ortho_first_visit_date_from`, `ortho_first_visit_date_to`', 'attribute range: first Ortho Treatment Card entry (vendor documentation)', 'Ortho Report only. Not the first visit to the practice'),
    ('FIRST VISIT DATE RANGE ( LEAVE BLANK FOR ALL PATIENTS )', '`first_visit_date_from`, `first_visit_date_to`', 'attribute range: first visit to the practice = first completed procedure', 'Referral Production List only; blank = all patients'),
    ('PATIENT LAST VISIT', '`ortho_last_visit_date_from`, `ortho_last_visit_date_to`', 'attribute range: date of service of the last Ortho Treatment Card entry (vendor documentation)', 'Patients by Ortho Status with Time in Treatment only. The general last visit is `last_visit_date` (9.7)'),
    ('REPORT DATE', '`report_date`; `billing_date`; `date_basis`', 'role `as_of` or `single_day` (3.3)', 'Billing Date on Payment Plan Charges; on Claims Not Created the radio ALL / DOS Date / Transaction Date chooses the column of the single day, ALL = no date restriction'),
    ('DUE DATE', '`due_date`', 'single date: lab due date', 'Greyed with `report_type = appointment_list` (9.3)'),
    ('STATEMENT DATE', '`statement_date`', 'single date, role `filter_equals`', 'The row Statement Date of the Statements screen has the role `run_date`'),
    ('STATEMENT SENT DATE', '`statement_sent_date`', 'single date', ''),
    ('EFFECTIVE DATE', '`fee_schedule_effective_date`', 'lookup value, not a date control', 'Effective dates of the schedule in `fee_schedule_id`'),
]


def t_dates():
    sec = defaultdict(lambda: {'reports': set(), 'defaults': defaultdict(int)})
    for cid, c in CTL.items():
        t = re.sub(r'\s+', ' ', c['section']).strip()
        sec[t]['reports'].add(REP_OF[cid])
        if c['type'] == 'date_input' or (t == 'EFFECTIVE DATE'):
            sec[t]['defaults'][c['default_value'] or '(blank)'] += 1
            if (c['default_value'] or '(blank)') not in sec[t].setdefault('order', []):
                sec[t]['order'].append(c['default_value'] or '(blank)')
    tok = {'11/21/2026': '`today`', '(blank)': 'blank', '12/01/2026': '`start_of_next_month`', '11/30/2027': '`start_of_next_month+1y-1d`',
           '01/01/2020': 'unconfirmed (candidate `first_option`)', '11/20/2026': 'unconfirmed'}
    out = ['| Legacy section | Reports | Keys | Date basis / role | Default(s) | Note |', '|---|---|---|---|---|---|']
    for title, keys, basis, note in DATE_ROWS:
        e = sec[title]
        assert e['reports'], title
        dfl = ', '.join(tok[d0] for d0 in e.get('order', [])) or '-'
        out.append(f"| {esc(title)} | {len(e['reports'])} | {keys} | {basis} | {dfl} | {note} |")
    listed = {r[0] for r in DATE_ROWS}
    for t, e in sec.items():
        if e['defaults'] and t not in listed and not t.startswith('[no header]'):
            raise AssertionError(f'date section not listed: {t}')
    return '\n'.join(out)


FIXED_BASIS = OrderedDict([
    ('appointment_reports.r01', ('`appointment_date`', 'documented', 'Vendor documentation: DATE RANGE = appointment date.')),
    ('appointment_reports.r02', ('`appointment_date`', 'inferred', 'Appointments of the range that were never marked Missed.')),
    ('appointment_reports.r03', ('`appointment_date`', 'inferred', 'New-patient placeholder appointments of the range.')),
    ('appointment_reports.r06', ('`appointment_date`', 'inferred', 'Appointments of the range confirmed through a vendor.')),
    ('appointment_reports.r07', ('`appointment_date`', 'inferred', 'Appointments of the range with their time stamps.')),
    ('daily_reports.r03', ('`transaction_date`', 'documented', 'Vendor documentation: the posting date decides the period (02 worked example 1 uses the same value).')),
    ('daily_reports.r04', ('`transaction_date`', 'inferred', 'Money collected in the range; the sibling Deposit Slip offers Transaction Date (default) and Payment Date.')),
    ('daily_reports.r06', ('`appointment_date`', 'inferred', 'Scheduled production = procedures attached to the appointments of the range, beside the actual production of the same days.')),
    ('daily_reports.r07', ('`appointment_date`', 'documented', 'Vendor documentation: the range selects the appointments that get a slip.')),
    ('daily_reports.r09', ('`transaction_date`', 'inferred', 'Production family: posting date, as Production Report.')),
    ('daily_reports.r10', ('follows `patient_has`', 'documented', 'Vendor documentation: the date of the record chosen by PATIENT HAS - `appointment_date`, `transaction_date` (ledger transaction) or `service_date` (progress-note date of service); any of the three for ALL.')),
    ('daily_reports.r11', ('`claim_printed_date`', 'inferred', 'Claims printed in the range; no vendor description exists. Prints are not recorded today (03).')),
    ('insurance_reports.r01', ('`created_date`', 'documented', 'Vendor documentation: the date the claim was generated, not the date of service.')),
    ('insurance_reports.r02', ('`transaction_date`', 'inferred', 'Read from the vendor sample (column Tran. Date).')),
    ('insurance_reports.r04', ('`service_date`', 'inferred', 'Vendor sources do not say whether it is the date of service or the transaction date.')),
    ('insurance_reports.r06', ('`payment_date`', 'inferred', 'Capitation payments of the range.')),
    ('insurance_reports.r10', ('`service_date`', 'inferred', 'Basis not documented.')),
    ('insurance_reports.r12', ('`payment_date`', 'inferred', 'Basis not documented; first basis of the sibling EOB 835 Claims Reconcile Report. The range is limited to one month (documented): `validation.max_span_days: 31`.')),
    ('ledger_reports.r01', ('`transaction_date`', 'documented', 'Vendor documentation: transactions in the range; the ledger date of a line is the date of service of a procedure, the created date of a claim, the entry date of a payment or adjustment.')),
    ('ledger_reports.r02', ('`transaction_date`', 'inferred', 'Transactions listed on the walkout; default today.')),
    ('ledger_reports.r03', ('`service_date`', 'documented', 'The print-menu dialog labels the same range DOS Date Range.')),
    ('ledger_reports.r04', ('`created_date`', 'inferred', 'No vendor description; entry date of the payment, as on the other allocation reports.')),
    ('management_reports.r02', ('`appointment_date`', 'inferred', 'Visit / appointment dates considered.')),
    ('management_reports.r03', ('`modified_date`', 'documented', 'Vendor documentation: updated-date range (when the change was made, not the date of the changed record).')),
    ('management_reports.r04', ('`work_date`', 'inferred', 'Office-local date of the clock-in.')),
    ('montly_reports.r01', ('`transaction_date`', 'documented', 'Production figures use the posting date; MTD and YTD derive from the end date; the new-patient counts use their own dates (created date, first visit).')),
    ('montly_reports.r02', ('`transaction_date`', 'inferred', 'Day sheet family (PD-8).')),
    ('montly_reports.r05', ('`created_date`', 'documented', 'Vendor documentation: created (entry) date of the payment, not the editable transaction date.')),
    ('montly_reports.r06', ('`created_date`', 'documented', 'Vendor documentation: payments entered in the range.')),
    ('montly_reports.r07', ('`created_date`', 'inferred', 'Items entered in the range that are still unallocated.')),
    ('montly_reports.r08', ('`transaction_date`', 'inferred', 'Default basis of the Daily Journal it summarises.')),
    ('montly_reports.r09', ('`service_date`', 'documented', 'Vendor documentation: one row per date-of-service month in the range.')),
    ('my_reports.r02', ('`work_date`', 'inferred', 'As the Management Reports copy of the report.')),
    ('my_reports.r05', ('`transaction_date`', 'documented', 'Same report as the Daily Production Report.')),
    ('patients_list_reports.r05', ('`created_date`', 'documented', 'Vendor documentation: created date of the note.')),
    ('setup_list_reports.r13', ('`holiday_date`', 'inferred', 'Office holidays that fall in the range.')),
])


def t_fixed_basis():
    plain = []
    for rid, r in REPORTS.items():
        cs = [c for c in r['controls'] if re.sub(r'\s+', ' ', c['section']).strip() == 'DATE RANGE']
        if not cs:
            continue
        ps = [EFF[c['control_id']]['param'] for c in cs]
        if 'date_basis' in ps or any(p.startswith('date_basis_set') for p in ps):
            continue
        plain.append(rid)
    assert plain == list(FIXED_BASIS), sorted(set(plain) ^ set(FIXED_BASIS))
    out = ['| # | Report | Fixed `date_basis` | Evidence | Source of the basis |', '|---|---|---|---|---|']
    for i, (rid, (b, ev, note)) in enumerate(FIXED_BASIS.items(), 1):
        out.append(f'| {i} | {esc(rname(rid))} | {b} | {ev} | {note} |')
    ev = defaultdict(int)
    for _b, e, _n in FIXED_BASIS.values():
        ev[e] += 1
    return '\n'.join(out), len(plain), ', '.join(f'{k} {v}' for k, v in sorted(ev.items()))


# ---------------------------------------------------------------------------------------------- layout keys
def t_layout():
    out = ['| Key | Legacy section > label (signature) | Reports | Legacy options -> values | Default(s) |', '|---|---|---|---|---|']
    order = ['output_format', 'report_format', 'report_type', 'report_by', 'group_by', 'sort_by', 'page_break_by']
    for k in order:
        for sid in PARAMS[k]['signature_ids']:
            s, m = BY_ID[sid], MAP[sid]
            lab = f" > {esc(s['label'])}" if s['label'] else ''
            if s['type'] == 'checkbox':
                member = m['param'].split('.')[1]
                opts = f'ticked -> `{k} = {member}`'
                dfl = ', '.join(f'{d0} x{n}' for d0, n in s['defaults'].items())
            elif s['options']:
                opts = ', '.join(f"{esc(o)} -> `{v}`" for o, v in m['option_map'].items())
                dfl = ', '.join(f"`{m['option_map'][d0]}`" + (f' x{n}' if len(s['defaults']) > 1 else '') for d0, n in s['defaults'].items())
            else:
                opts = 'collapsed dropdown: one list per report (11.1, 15.4)'
                dfl = ', '.join(f"`{m['default_map'][d0]}`" for d0 in s['defaults'])
            out.append(f"| {code(m['param'])} | {esc(s['section'])}{lab} ({sid}) | {s['count']} | {opts} | {dfl} |")
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------- pickers
PICKER_ROWS = [
    # (entity, stems, source_key, exists, select, all_semantics)
    ('Office', ['office_scope', 'referred_from_office_scope', 'referred_to_office_scope'], '`offices`',
     '[V] `GET /api/v1/offices` (`listOffices`: `is_active`, `office_group_id`, `assigned_to_me`, `search`); FE `useOfficeOptions()`', 'multi',
     '`all` = every office the caller may read; tokens `working_office`, `my_offices`'),
    ('Office group', ['office_scope', 'referred_from_office_scope', 'referred_to_office_scope'], '`office_groups`',
     '[V] `GET /api/v1/office-groups` (`listOfficeGroups`: `search` only - no `ids` filter and nothing that marks the groups a caller may read, so the handler marks them itself); an office belongs to at most one group (`offices.office_group_id` [V]); no shared FE hook (NEW `useOfficeGroups`)',
     'multi: one group or several per run (legacy dialog not captured)',
     '`all` = every group = the offices that belong to a group; vendor documentation: default ALL when Office Group is chosen'),
    ('Provider', ['provider_ids', 'preferred_provider_ids', 'preferred_hygienist_ids', 'transaction_provider_ids', 'appointment_provider_ids',
                  'visit_doctor_ids', 'referred_from_provider_ids', 'referred_to_provider_ids'], '`providers`',
     '[V] `GET /api/v1/providers` (`listProviders`: `office_ids` comma-separated = providers serving any of these offices, each row with `served_office_ids`; `is_active`, `role`, `search`) - the roster of a multi-office scope comes from this filter; `GET /api/v1/offices/{office_id}/providers/effective` (`listOfficeEffectiveProviders`) covers one office only; FE `useProviderDirectory`, `ProviderOptionGroups`. Provider ids are strings',
     'multi', '`all` = no provider predicate'),
    ('User', ['user_ids', 'tx_counselor_ids'], '`users`',
     '[V] `GET /api/v1/users` (`listUsers`) exists but is guarded by the Security Users screen rights; FE `loadUserDirectory()`. NEW report lookup needed', 'multi', '`all` = no user predicate'),
    ('Security group', ['security_group_ids'], '`security_groups`', '[V] `GET /api/v1/user-groups` (`listUserGroups`)', 'multi', '`all` = every group'),
    ('Patient', ['patient_ids', 'patient_id', 'patient_name'], '`patients`', '[V] `GET /api/v1/patients` (`listPatients`: `search`, `ids`); FE `src/features/patients/patientLookup.ts`. No picker component (NEW)',
     '`patient_ids`: multi (legacy box holds one); `patient_id`: single', '`patient_ids`: empty = `all`; `patient_id`: required, no `all`'),
    ('Responsible party (account)', ['account_id', 'responsible_party_name'], '`accounts`',
     '[V] `GET /api/v1/accounts` (`listAccounts`: `search`, `account_no`), `GET /api/v1/responsible-parties` (`listResponsibleParties`). Three id spaces exist (`accounts.id`, `responsible_parties.id`, the patient id of a self-guarantor); the value is always `accounts.id`. No picker component (NEW)',
     'single', 'no `all`; required where 9.5 says so'),
    ('Carrier', ['carrier_ids'], '`carriers`', '[V] `GET /api/v1/insurance-carriers` (`listInsuranceCarriers`: `ids`, `search`); FE `searchCarriers`', 'multi', '`all` = no carrier predicate'),
    ('Employer', ['employer_ids'], '`employers`', '[V] `GET /api/v1/employers` (`listEmployers`: `ids`, `search`); FE `searchEmployers`', 'multi', '`all`'),
    ('Insurance plan / sub type', ['insurance_plan_selection'], '`insurance_plans_and_subtypes`',
     '[V] `GET /api/v1/insurance-plans` (`listInsurancePlans`), `GET /api/v1/insurance-plans/metadata` (`getInsurancePlanMetadata`); FE `searchPlans`. About 31k plans: typeahead only. The two sub type rows are static (NEW handler)',
     'multi; typed values `plan:<id>`, `subtype:dental`, `subtype:medical`', '`all` = no restriction'),
    ('Procedure code', ['procedure_codes', 'recall_procedure_codes', 'code_scope'], '`procedure_codes`',
     '[V] `GET /api/v1/procedure-codes` (`listProcedureCodes`: `category`, `is_active`, `search`); FE `loadProcedureCodes` (full map, about 1,100 codes), `searchProcedureCodes`', 'multi',
     '`all` = no code predicate. Legacy dialog (vendor screenshot): INCLUDE ALL, category radios, sort, transfer list'),
    ('Procedure category', ['procedure_category_codes', 'code_scope'], '`procedure_categories`', '[V] `GET /api/v1/procedure-code-categories` (`listProcedureCodeCategories`)', 'multi', '`all`'),
    ('Payment / adjustment code', ['payment_codes', 'payment_adjustment_codes'], '`payment_codes` (PAYMENT TYPES picker); `payment_adjustment_codes` (PAYMENT/ADJ CODES: both catalogs in one list, `group` = Payment / Adjustment, value `payment:<code>` / `adjustment:<code>`)',
     '[V] `GET /api/v1/definitions?group_code=payment_method` / `adjustment` (`listDefinitions`) hold four methods; the legacy 18 payment and 46 adjustment codes live only in FE `src/features/transactions/transactionCodes.ts`. Server catalog NEW (P0, DATA-03)',
     'multi', '`all`; `none` is the default of PAYMENT/ADJ CODES'),
    ('Operatory', ['operatory_ids'], '`operatories`', '[V] `GET /api/v1/operatories` (`listOperatories`: `office_id`, `office_ids`, `office_group_id`)', 'multi', '`all`; list follows the office scope'),
    ('Lab', ['lab_ids'], '`labs`', '[V] `GET /api/v1/labs` (`listLabs`: `ids`, `office_ids`)', 'multi', '`all`'),
    ('Vendor (appointment confirmation)', ['vendor_codes'], '`confirmation_vendors`', 'NEW - no entity, table or endpoint', 'multi', '`all`'),
    ('Patient type', ['include_patient_type_codes', 'exclude_patient_type_codes'], '`definitions:patient_type`',
     '[V] `GET /api/v1/definitions?group_code=patient_type` (seeded: CH, CP, EF, OR, SN, SR, SS, UP)', 'multi', 'include: `all`; exclude: `none`'),
    ('Responsible party type', ['exclude_resp_party_type_codes'], '`definitions:resp_party_type`', '[V] `GET /api/v1/definitions?group_code=resp_party_type` (seeded: CA, CO, DI, IN, ST, WO - provisional list)', 'multi', '`none` = exclude nothing'),
    ('Referral source', ['referred_to_ids', 'referred_from_ids'], '`referral_sources`', '[V] `GET /api/v1/referrals` (`listReferrals`: `referral_type` direction "0" / "1", `search`; office-scoped catalog with `office_ids`, `all_offices`, `include_global`)', 'multi', '`all`'),
    ('Referral type', ['referral_type_codes'], '`definitions:referral_type`', '[V] `GET /api/v1/definitions?group_code=referral_type`', 'multi (legacy dropdown: single)', '`all`'),
    ('Specialty', ['specialty_codes'], '`specialties`', '[V] `GET /api/v1/provider-specialties` (`listProviderSpecialties`); its 200 response has no schema in `openapi.json`, so the generated function returns `unknown` - a response model is requested from the backend. Referral-source specialty is free text', 'multi (legacy dropdown: single)', '`all`'),
    ('State', ['state_codes'], '`definitions:state`', '[V] `GET /api/v1/definitions?group_code=state` (50 states + DC seeded)', 'multi (legacy dropdown: single)', '`all`'),
    ('Fee schedule', ['fee_schedule_ids', 'fee_schedule_id', 'compare_fee_schedule_id'], '`fee_schedules`',
     '[V] `GET /api/v1/fee-schedules/options` (`listFeeScheduleOptions`) returns `id`, `name`, `fee_type` only - no `pricing_model`, no office; `GET /api/v1/fee-schedules` (`listFeeSchedules`: `fee_type`, `pricing_model`, office-scoped catalog) is the one the capitation filter needs; FE `searchFeeSchedules`',
     '`fee_schedule_ids`: multi; `fee_schedule_id`, `compare_fee_schedule_id`: single', '`all` (list filter); no `all` on the two single keys'),
    ('Fee schedule effective date', ['fee_schedule_effective_date'], '`fee_schedule_effective_dates`', 'NEW - distinct effective dates of the entries of the schedule in `fee_schedule_id` (`depends_on`)', 'single', 'no `all`'),
    ('Production type', ['production_type_ids'], '`production_types`', '[V] `GET /api/v1/production-types` (`listProductionTypes`)', 'multi (legacy dropdown: single)', '`all`'),
    ('Cancellation reason', ['cancellation_reason_codes'], '`cancellation_reasons`',
     'NEW - only a FE constant `CANCELLATION_REASONS` (`src/components/scheduler/statusMeta.ts`, 7 values) and the free-text column `appointments.cancellation_reason`', 'multi', '`all`'),
    ('Ortho status', ['ortho_status_codes'], '`ortho_statuses`', 'NEW - no vocabulary, column or endpoint; legacy value list unknown', 'multi', '`all`'),
    ('Treatment plan status', ['exclude_treatment_plan_statuses'], '`treatment_plan_statuses`',
     '[V] static in the backend: item statuses `ItemStatus` and pre-authorisation states `PreauthStatus` (`sent`, `closed`) in `app/schemas/treatment.py`. The source serves the ten legacy values `diagnosed`, `accepted`, `alternative`, `hold`, `unaccepted`, `pre_authorized_sent`, `scheduled`, `completed`, `referred_out`, `pre_authorized_closed` - the values of `treatment_plan_status` without `all` - plus the DentC-only item statuses `internal_referral`, `external_referral` as enhancement options',
     'multi', '`none` = exclude nothing'),
    ('835 reason code', ['exclude_reason_codes'], '`denial_reason_codes`', 'NEW - no remittance reason-code catalog', 'multi', '`none` = exclude nothing'),
    ('Note macro category', ['note_macro_category_codes'], '`note_macro_categories`', '[V] `GET /api/v1/note-macros/categories` (`listNoteMacroCategories`)', 'multi (legacy dropdown: single)', '`all`'),
    ('Note type', ['note_type_codes'], '`note_types`',
     'NEW source; column `patient_notes.note_type` exists [V]. Legacy types per vendor documentation: Patient Notes, Responsible Party Notes, Financial Notes, Chart Notes', 'multi', '`all`'),
    ('Financial disclosure letter', ['financial_disclosure_template_id'], '`financial_disclosure_letters`',
     '[V] `GET /api/v1/letter-templates?letter_type=` (`listLetterTemplates`), `GET /api/v1/offices/{office_id}/letter-templates/effective` (`listOfficeEffectiveLetterTemplates`); which `letter_type` holds disclosures is [I]', 'single', '`first_option` (alphabetical list; vendor documentation)'),
]


def t_pickers():
    out = ['| Entity | Parameter keys | Signatures | Controls | Source key (`lookup:`) | Exists today | Select | ALL / None |', '|---|---|---|---|---|---|---|---|']
    covered = set()
    for ent, stems, lk, exists, sel, allsem in PICKER_ROWS:
        sigs, n = [], 0
        for cid, m in EFF.items():
            if not m['param'] or m['status'] in ('superseded', 'help_text') or stem_of(m['param']) not in stems:
                continue
            t = CTL[cid]['type']
            if t not in ('picker', 'dropdown', 'text_input'):
                continue
            if ent in ('Office', 'Office group') and t != 'picker':
                continue
            n += 1
            if SIG_OF[cid] not in sigs:
                sigs.append(SIG_OF[cid])
            covered.add(SIG_OF[cid])
        assert sigs, ent
        keys = ', '.join(code(s) for s in stems)
        out.append(f"| {ent} | {keys} | {sig_range(sigs)} | {n} | {lk} | {exists} | {sel} | {allsem} |")
    missing = [s['signature_id'] for s in SIGS if s['type'] == 'picker' and s['signature_id'] not in covered]
    assert missing == [], missing
    n_pick = sum(s['count'] for s in SIGS if s['type'] == 'picker')
    assert sum(1 for s in SIGS if s['type'] == 'picker') == 49
    return '\n'.join(out), n_pick


# ---------------------------------------------------------------------------------------------- option sources
SOURCE_INFO = {
    'offices': ('`offices`', '[V] `listOffices`', 'Mark the offices the caller may read (`disabled_reason` on the others)'),
    'office_groups': ('`office_groups`, `offices.office_group_id`', '[V] `listOfficeGroups` (`search` only)', 'Mark the groups that contain an office the caller may read; return the member count'),
    'providers': ('`providers`, `provider_offices`', '[V] `listProviders` with `office_ids` (providers serving any of the offices), `listOfficeEffectiveProviders` (one office)', '`group` = selected offices / other offices; label `Name (ID)`; string ids'),
    'users': ('`users`', '[V] `listUsers`, guarded by the Security Users screen rights (`app/api/v1/users.py`)', 'Id and name only, under the report right (open decision 7)'),
    'patients': ('`patients`', '[V] `listPatients` (`search`, `ids`)', 'Typeahead only; lists only charts the caller may open (`patient_is_visible` [V])'),
    'accounts': ('`accounts`, guarantor name from `rpt_account_dim`', '[V] `listAccounts` (`search`, `account_no`), `listResponsibleParties`', 'Typeahead only; returns `accounts.id`, account number and guarantor `Last, First`'),
    'carriers': ('`insurance_carriers`', '[V] `listInsuranceCarriers` (`ids`, `search`)', 'Wrap'),
    'employers': ('`employers`', '[V] `listEmployers` (`ids`, `search`)', 'Wrap'),
    'insurance_plans_and_subtypes': ('`insurance_plans` plus two static sub type rows', '[V] `listInsurancePlans`', 'Typeahead for plans; typed values `plan:<id>`, `subtype:dental`, `subtype:medical`'),
    'procedure_codes': ('`procedure_codes`', '[V] `listProcedureCodes` (`category`, `is_active`, `search`)', 'Full list served (about 1,100 codes); `recall_only` filter for `recall_procedure_codes`'),
    'procedure_categories': ('procedure code categories', '[V] `listProcedureCodeCategories`', 'Wrap'),
    'payment_codes': ('server code catalog `transaction_codes` (NEW, DATA-03)', 'none: the `definitions` groups `payment_method` and `adjustment` [V] hold four methods; the legacy codes exist only in frontend code', 'Payment codes with their tender category'),
    'payment_adjustment_codes': ('same catalog', 'none', 'Payment and adjustment codes in one list: `group` = Payment / Adjustment, value `payment:<code>` / `adjustment:<code>`'),
    'operatories': ('`operatories`', '[V] `listOperatories` (`office_ids`, `office_group_id`)', 'Follows the office value keys'),
    'labs': ('`labs`', '[V] `listLabs` (`ids`, `office_ids`)', 'Follows the office value keys'),
    'definitions:patient_type': ('`definitions`', '[V] `listDefinitions` (`group_code`)', 'Generic handler for any definition group; extra row `no_type_defined`'),
    'definitions:resp_party_type': ('`definitions`', '[V] `listDefinitions`', 'Generic handler'),
    'definitions:referral_type': ('`definitions`', '[V] `listDefinitions`', 'Generic handler'),
    'definitions:state': ('`definitions`', '[V] `listDefinitions`', 'Generic handler'),
    'specialties': ('provider specialties', '[V] `listProviderSpecialties` (response model missing in `openapi.json`)', 'Wrap; ask the backend for a response model'),
    'production_types': ('`production_types`', '[V] `listProductionTypes`', 'Wrap'),
    'note_macro_categories': ('note macro categories', '[V] `listNoteMacroCategories`', 'Wrap'),
    'security_groups': ('`user_groups`', '[V] `listUserGroups`', 'Wrap'),
    'fee_schedules': ('`fee_schedules`', '[V] `listFeeSchedules` (`pricing_model`, `fee_type`; office-scoped catalog) - not `listFeeScheduleOptions`, which lacks `pricing_model`', 'Catalog rule of 6.5; filter `pricing_model = copay` for capitation lists'),
    'referral_sources': ('`referrals`', '[V] `listReferrals` (`referral_type`, `search`; office-scoped catalog)', 'Catalog rule of 6.5'),
    'financial_disclosure_letters': ('`letter_templates`', '[V] `listLetterTemplates`, `listOfficeEffectiveLetterTemplates`', 'Confirm the letter type; alphabetical order'),
    'treatment_plan_statuses': ('static list [V `ItemStatus`, `PreauthStatus` in `app/schemas/treatment.py`]', 'none needed', 'Serve the ten legacy values plus the two DentC-only statuses'),
    'cancellation_reasons': ('NEW definition group', 'none', 'Seed with the seven values of `src/components/scheduler/statusMeta.ts` [V]'),
    'note_types': ('distinct `patient_notes.note_type` values [V column]', 'none', 'NEW; legacy types Patient Notes, Responsible Party Notes, Financial Notes, Chart Notes'),
    'ortho_statuses': ('NEW (data owned by 03)', 'none', 'NEW'),
    'confirmation_vendors': ('NEW (data owned by 03)', 'none', 'NEW'),
    'denial_reason_codes': ('NEW (data owned by 03)', 'none', 'NEW'),
    'fee_schedule_effective_dates': ('`fee_schedule_entries.effective_date` of one schedule', 'none', 'NEW; `depends_on: [fee_schedule_id]`'),
}
SOURCE_ITEM = {'P1': 'FLT-06 (P0)', 'P2': 'FLT-08 (P2)', 'P3': 'FLT-09 (P3)'}
SOURCE_ITEM_OVERRIDE = {'payment_codes': 'FLT-07 (P0)', 'payment_adjustment_codes': 'FLT-07 (P0)'}


def t_sources():
    assert sorted(SOURCE_INFO) == sorted(SOURCES), sorted(set(SOURCE_INFO) ^ set(SOURCES))
    out = ['| Source key | Parameters | Reports | First needed by a report of | Delivered by | Served from | Existing endpoint whose service the handler reuses | Work |', '|---|---|---|---|---|---|---|---|']
    for sk, e in SOURCES.items():
        info = SOURCE_INFO[sk]
        item = SOURCE_ITEM_OVERRIDE.get(sk, SOURCE_ITEM[e['first_phase']])
        out.append(f"| {code(sk)} | {', '.join(code(p) for p in e['parameters'])} | {e['reports']} | {e['first_phase']} | {item} | {info[0]} | {info[1]} | {info[2]} |")
    return '\n'.join(out)


def sources_of(item):
    return ', '.join(code(sk) for sk, e in SOURCES.items() if SOURCE_ITEM_OVERRIDE.get(sk, SOURCE_ITEM[e['first_phase']]).startswith(item))


# ---------------------------------------------------------------------------------------------- counts
def counts():
    sc = SM['meta']['status_counts']
    g = lambda k, f: str(sc.get(k, {f: 0})[f])  # noqa: E731
    return {
        'N_MAPPED': str(SM['meta']['mapped']),
        'N_MAPPED_CONTROLS': format(sum(v['controls'] for v in sc.values()), ','),
        'N_PARAMS': str(len(PARAMS)),
        'N_KEYS': str(sum(len(p['value_keys']) for p in PARAMS.values())),
        'N_SHARED': str(sum(1 for p in PARAMS.values() if p['reports'] >= 2)),
        'N_SINGLE': str(sum(1 for p in PARAMS.values() if p['reports'] < 2)),
        'N_OVR': str(len(OVR)),
        'N_OVR_SIGS': str(len({o['signature_id'] for o in OVR.values()})),
        'N_ACTIONS': str(len(ACTIONS)),
        'N_REPL': g('replicated', 'signatures'), 'N_REPL_C': g('replicated', 'controls'),
        'N_ENH': g('replicated_enhanced', 'signatures'), 'N_ENH_C': g('replicated_enhanced', 'controls'),
        'N_SUP': g('superseded', 'signatures'), 'N_SUP_C': g('superseded', 'controls'),
        'N_HELP': g('help_text', 'signatures'), 'N_HELP_C': g('help_text', 'controls'),
        'N_UNK': g('unknown_legacy', 'signatures'), 'N_UNK_C': g('unknown_legacy', 'controls'),
    }


def t_typecov():
    order = ['checkbox', 'radio_group', 'picker', 'date_input', 'dropdown', 'text_input', 'number_input', 'button', 'static_text', 'other']
    out = ['| Legacy control type | Signatures | Controls | Canonical types used (signatures) |', '|---|---|---|---|']
    ts = tc = 0
    for t in order:
        rows = [s for s in SIGS if s['type'] == t]
        dist = defaultdict(int)
        for s in rows:
            m = MAP[s['signature_id']]
            if m['status'] == 'help_text':
                dist['help text'] += 1
            elif m['status'] == 'superseded':
                dist['button superseded by its control'] += 1
            elif m['param_type'] == 'action':
                dist['definition action'] += 1
            else:
                dist[f"`{m['param_type']}`"] += 1
        ts += len(rows)
        tc += sum(s['count'] for s in rows)
        cell = ', '.join(f'{k} {v}' for k, v in sorted(dist.items(), key=lambda kv: (-kv[1], kv[0])))
        out.append(f"| `{t}` | {len(rows)} | {sum(s['count'] for s in rows)} | {cell} |")
    out.append(f'| **Total** | **{ts}** | **{tc}** | |')
    assert ts == 358 and tc == 1025
    return '\n'.join(out)


def canonical_types():
    ts = sorted({p['type'] for p in PARAMS.values()})
    return ts


greyed_tbl, n_greyed = rule_rows('greyed')
enabled_tbl, n_enabled = rule_rows('enabled')
assert n_greyed == 53
opt_tbl, n_opt = t_opt_greyed()
vp_tbl, n_vp = t_vparams('vendor_doc')
hid_tbl, n_hid = t_vparams('hidden')
expr_tbl, n_expr = t_expr()
no_office_tbl, n_no_office = t_no_office()
fixed_tbl, n_fixed, fixed_ev = t_fixed_basis()
pick_tbl, n_pick_controls = t_pickers()
TABLES = {
    'T_DICT': t_dict().replace('{{T_PROVIDER_ROLES_BLOCK}}', 'Provider roles. Every provider-typed parameter carries `provider_role`; a report uses the generic key `provider_ids` when it has one provider criterion and a role key when the legacy screen names the role or shows two provider criteria.\n\n' + t_provider_roles()),
    'T_SECTIONS': t_sections(), 'T_GREYED': greyed_tbl, 'T_GREYED_COUNTS': ev_counts('greyed'),
    'T_ENABLED_RULES': enabled_tbl, 'N_ENABLED_RULES': str(n_enabled), 'T_ENABLED_COUNTS': ev_counts('enabled'),
    'T_OPT_GREYED': opt_tbl, 'N_OPT_GREYED': str(n_opt), 'N_OPT_CONTROLS': str(len(OEW)),
    'T_RULES': t_rules(), 'N_RULES': str(len(RULES)),
    'T_VPARAMS': vp_tbl, 'N_VPARAMS': str(n_vp), 'T_HIDDEN': hid_tbl, 'N_HIDDEN': str(n_hid),
    'T_EXPR': expr_tbl, 'N_EXPR': str(n_expr), 'T_EM': t_em(),
    'T_APPENDIX': t_appendix(), 'T_ACTIONS': t_actions(), 'T_OVERRIDES': t_overrides(), 'T_STATUS': t_status(),
    'T_DROPDOWNS': t_dropdowns(), 'T_REPORT_BY': t_report_by_lists(),
    'T_TRUNC': t_trunc(), 'T_UNREADABLE': t_unreadable(), 'T_LOCKS': t_locks(), 'T_NO_OFFICE': no_office_tbl,
    'N_NO_OFFICE': str(n_no_office), 'T_DATES': t_dates(), 'T_FIXED_BASIS': fixed_tbl, 'N_FIXED': str(n_fixed), 'FIXED_EV': fixed_ev,
    'T_LAYOUT': t_layout(), 'T_PICKERS': pick_tbl,
    'N_PICK_CONTROLS': str(n_pick_controls), 'T_TYPECOV': t_typecov(), 'T_SOURCES': t_sources(),
    'SRC_FLT06': sources_of('FLT-06'), 'SRC_FLT07': sources_of('FLT-07'), 'SRC_FLT08': sources_of('FLT-08'), 'SRC_FLT09': sources_of('FLT-09'),
    'N_TYPES': str(len(canonical_types())),
    'EX_PROVIDER_CID': BY_ID['sig0004']['control_ids'][0],
}
assert MAP['sig0004']['param'] == 'provider_ids' and BY_ID['sig0004']['section'] == 'PROVIDER'
TABLES.update(counts())

tpl = open(TPL, encoding='utf-8').read()
used = set()


def sub(m):
    k = m.group(1)
    used.add(k)
    if k not in TABLES:
        raise KeyError(k)
    return TABLES[k]


doc = re.sub(r'\{\{([A-Z0-9_]+)\}\}', sub, tpl)
unused = set(TABLES) - used
open(OUT, 'w', encoding='utf-8', newline='\n').write(doc.rstrip() + '\n')
print('written', OUT, 'lines', doc.rstrip().count('\n') + 1, 'types', canonical_types(), 'unused placeholders:', sorted(unused))
