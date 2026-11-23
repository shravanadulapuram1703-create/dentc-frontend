"""Pre-fill one parity skeleton per category from the control index and the shared signature map.

Usage: python -I make_parity_skeleton.py <legacy/index> <catalog/skeleton>

Reads <index>/<category>.controls.json, <index>/signatures.json and <index>/signature_map.json and writes
<catalog/skeleton>/<category>.parity.json.

Controls whose signature is in the shared map arrive fully mapped, so the same legacy control gets the same
parameter on every report. Everything else arrives with "status": "TODO" and a proposed parameter name; the
category catalog author completes those, sets report_key / phase, and saves the result as
catalog/parity/<category>.parity.json (checked by validate_parity.py).

Run apply_supplement.py first: controls and option values added from vendor documentation then arrive too
("origin": "vendor_doc" with status TODO; added option values as "TODO" inside option_map), together with one
dynamic_rules entry per documented show/hide/enable rule whose new_behavior the author fills in.
"""
import json
import os
import re
import sys

STANDARD_ACTIONS = {
    'CLEAR CRITERIA': 'Clear criteria: resets every parameter of the report to its default value.',
    'PRINT / PREVIEW': 'Run: preview on screen, then print or export in the chosen output format.',
    'ADD TO MY FAVORITES': 'Add to favorites: saves the report with the current criteria as a favorite (saved view).',
}


# report_key = <prefix>.<snake_case of the legacy name>; the default phase of each family follows the brief (section 6)
PREFIX = {'daily_reports': ('daily', 'P1'), 'montly_reports': ('monthly', 'P2'), 'ledger_reports': ('ledger', 'P1'),
          'management_reports': ('management', 'P2'), 'insurance_reports': ('insurance', 'P2'), 'appointment_reports': ('appointment', 'P3'),
          'treatmentplan_reports': ('treatment_plan', 'P3'), 'refferal_reports': ('referral', 'P3'), 'recall_reports': ('recall', 'P3'),
          'ortho_reports': ('ortho', 'P3'), 'statements_reports': ('statements', 'P1'), 'patients_list_reports': ('lists', 'P3'),
          'providers_list_reports': ('lists', 'P3'), 'security_list_reports': ('lists', 'P3'), 'setup_list_reports': ('lists', 'P3'),
          'my_reports': ('my_reports', 'P1')}
KEY_OVERRIDES = {'statements.statements': 'statements.statement_run'}


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def report_key(category, name):
    key = PREFIX[category][0] + '.' + re.sub(r'[^a-z0-9]+', '_', name.replace("'", '').replace('’', '').lower()).strip('_')
    return KEY_OVERRIDES.get(key, key)


def snake(s):
    s = re.sub(r'[^a-z0-9]+', '_', norm(s).lower()).strip('_')
    return s or 'value'


def main(index_dir, out_dir):
    sig_data = json.load(open(os.path.join(index_dir, 'signatures.json'), encoding='utf-8'))
    by_control = {}
    for s in sig_data['signatures']:
        for cid in s['control_ids']:
            by_control[cid] = s['signature_id']
    map_path = os.path.join(index_dir, 'signature_map.json')
    mappings, enabled_when, overrides, option_rules, shared_rules, shared_vendor = {}, {}, {}, {}, {}, {}
    if os.path.exists(map_path):
        sig_map = json.load(open(map_path, encoding='utf-8'))
        for m in sig_map.get('mappings', []):
            mappings[m['signature_id']] = m
        for cid, v in (sig_map.get('enabled_when') or {}).items():
            enabled_when[cid] = norm(v.get('enabled_when') if isinstance(v, dict) else v)
            if isinstance(v, dict) and v.get('evidence') in ('inferred', 'unknown'):
                enabled_when[cid] += f' ({v["evidence"]})'
        # one control that means something else than the other controls of its signature
        overrides = dict(sig_map.get('control_overrides') or {})
        for cid, v in (sig_map.get('option_enabled_when') or {}).items():
            option_rules[cid] = {k: norm(x.get('enabled_when') if isinstance(x, dict) else x) for k, x in v.items()}
        # visible / required / forced / default / label rules per report, and parameters known only from vendor documentation
        for x in sig_map.get('rules') or []:
            shared_rules.setdefault(x.get('report_id'), []).append(
                {k: x.get(k) for k in ('param', 'field', 'when', 'value', 'evidence', 'note') if x.get(k) not in (None, '')})
        for x in sig_map.get('vendor_doc_parameters') or []:
            shared_vendor.setdefault(x.get('report_id'), []).append(
                {k: x.get(k) for k in ('param', 'param_type', 'legacy_control', 'options', 'default', 'evidence', 'kind', 'note') if x.get(k) not in (None, '')})
    os.makedirs(out_dir, exist_ok=True)
    tot = pre = 0
    for f in sorted(os.listdir(index_dir)):
        if not f.endswith('.controls.json'):
            continue
        idx = json.load(open(os.path.join(index_dir, f), encoding='utf-8'))
        out = {'category': idx['category'], 'reports': []}
        for r in idx['reports']:
            pr = {
                'report_id': r['report_id'], 'legacy_name': r['name'],
                'report_key': report_key(idx['category'], r['name']), 'phase': PREFIX[idx['category']][1],
                'actions': [{'legacy_action': a, 'new_feature': STANDARD_ACTIONS.get(norm(a).upper(), '')} for a in r.get('actions', [])],
                'controls': [],
                # behaviour documented by the vendor: say how the new report behaves for each rule
                'dynamic_rules': [{'rule_id': d['rule_id'], 'legacy_when': d['when'], 'legacy_effect': d['effect'],
                                   'confidence': d.get('confidence', ''), 'new_behavior': ''} for d in r.get('dynamic_rules', [])],
                # facts that correct the screenshot inventory (information for the author; not checked)
                'legacy_corrections': [{'about': k.get('about', ''), 'control_id': k.get('control_id', ''), 'text': k.get('text', '')}
                                       for k in r.get('corrections', [])],
                # from 04_filter_framework.md (signature_map.json): parameter rules of this report and the parameters it
                # already defines for criteria known only from vendor documentation - use them for the VENDOR-DOC controls
                'shared_rules': shared_rules.get(r['report_id'], []),
                'shared_vendor_doc_parameters': shared_vendor.get(r['report_id'], []),
            }
            for c in r['controls']:
                tot += 1
                sid = by_control.get(c['control_id'])
                m = mappings.get(sid)
                ld = norm(c['default_value'])
                entry = {
                    'control_id': c['control_id'], 'signature_id': sid,
                    'legacy_section': c['section'], 'legacy_label': c['label'], 'legacy_type': c['type'],
                    'legacy_options': c['options'], 'legacy_default': c['default_value'], 'legacy_enabled': c['enabled'],
                    'origin': c.get('origin', 'screenshot'),
                }
                if c.get('origin') == 'vendor_doc':
                    entry['vendor_doc_confidence'] = c.get('confidence', '')
                    entry['vendor_doc_evidence'] = c.get('evidence_quote', '')
                    entry['legacy_notes'] = c.get('notes', '')
                if c.get('vendor_doc_options'):
                    entry['vendor_doc_options'] = c['vendor_doc_options']
                if m:
                    pre += 1
                    om = dict(m.get('option_map') or {})
                    om_n = {norm(k): v for k, v in om.items()}
                    for o in c['options']:
                        # an option the shared map does not know (added from vendor documentation): the author maps it
                        if (om_n or c.get('vendor_doc_options')) and norm(o) not in om_n:
                            om[o] = 'TODO'
                    dm_n = {norm(k): v for k, v in (m.get('default_map') or {}).items()}
                    if c['type'] == 'checkbox' and ld in ('checked', 'unchecked'):
                        default = ld == 'checked'
                    elif ld in dm_n:
                        default = dm_n[ld]
                    elif ld in om_n:
                        default = om_n[ld]
                    else:
                        default = c['default_value']
                    entry.update({'status': m['status'], 'param': m.get('param', ''), 'param_type': m.get('param_type', ''),
                                  'option_map': om, 'default': default, 'default_differs_reason': '',
                                  'enabled_when': enabled_when.get(c['control_id'], ''), 'notes': m.get('notes', '')})
                    ov = overrides.get(c['control_id'])
                    if ov:
                        # the shared map says this one control differs from its signature: its mapping and default are given directly
                        om2 = dict(ov.get('option_map') or {})
                        om2_n = {norm(k): v for k, v in om2.items()}
                        inherit = not om2          # an override without option_map keeps the options of the signature mapping
                        for o in c['options']:
                            if norm(o) not in om2_n:
                                om2[o] = om.get(o, 'TODO') if inherit else 'TODO'
                        entry.update({'status': ov.get('status', entry['status']), 'param': ov.get('param', entry['param']),
                                      'param_type': ov.get('param_type', entry['param_type']), 'option_map': om2,
                                      'default': ov.get('default', default),
                                      'notes': norm(ov.get('notes')) + (' Differs from the shared mapping: ' + norm(ov.get('reason')) if norm(ov.get('reason')) else ''),
                                      'shared_override': True})
                    if option_rules.get(c['control_id']):
                        entry['option_enabled_when'] = option_rules[c['control_id']]
                else:
                    om = {o: snake(o) for o in c['options']}
                    if c['type'] == 'checkbox' and ld in ('checked', 'unchecked'):
                        default = ld == 'checked'
                    elif c['default_value'] in om:
                        default = om[c['default_value']]
                    else:
                        default = c['default_value']
                    entry.update({'status': 'TODO', 'param': snake(c['label'] or c['section']), 'param_type': '',
                                  'option_map': om, 'default': default, 'default_differs_reason': '',
                                  'enabled_when': enabled_when.get(c['control_id'], ''), 'notes': ''})
                pr['controls'].append(entry)
            out['reports'].append(pr)
        json.dump(out, open(os.path.join(out_dir, idx['category'] + '.parity.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(f'controls={tot} prefilled_from_signature_map={pre} todo={tot - pre}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
