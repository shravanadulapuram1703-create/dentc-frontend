"""Merge the vendor-documentation supplements into the control index, so parity is checked against them too.

Usage: python -I apply_supplement.py <plan_root> [category ...]

Without categories every index file is rebuilt; with categories only those are touched (use this while the
supplement of other categories is still being verified).

Reads  <plan_root>/legacy/supplement/<category>.supplement.json   (each must pass validate_supplement.py)
Patches <plan_root>/legacy/index/<category>.controls.json in place:

  * added controls are appended to their report with ids <report_id>.x01, .x02 ... and "origin": "vendor_doc"
  * added option values are appended to the existing control ("vendor_doc_options" lists them)
  * dynamic rules are stored on the report as "dynamic_rules" with ids <report_id>.d01 ...
  * corrections are stored on the report as "corrections" with ids <report_id>.k01 ...
  * a correction with resolves_truncation clears "possibly_truncated" (the screenshot value is kept in
    "possibly_truncated_screenshot")
  * control_count is recomputed; screenshot_control_count keeps the number read from the screenshots

Running it again first removes what an earlier run added, so the result always equals index + supplement.
Do NOT re-run summarize_controls.py afterwards: signatures.json and signature_map.json are keyed on the
screenshot inventory, and the controls added here are mapped report by report in the catalog.
"""
import json
import os
import re
import sys


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def strip_previous(idx):
    for r in idx['reports']:
        r['controls'] = [c for c in r['controls'] if c.get('origin') != 'vendor_doc']
        for c in r['controls']:
            added = c.pop('vendor_doc_options', None)
            c.pop('vendor_doc_options_confidence', None)
            if added:
                drop = {norm(o).lower() for o in added}
                c['options'] = [o for o in c['options'] if norm(o).lower() not in drop]
        r.pop('dynamic_rules', None)
        r.pop('corrections', None)
        if 'possibly_truncated_screenshot' in r:
            r['possibly_truncated'] = r.pop('possibly_truncated_screenshot')


def main(root, only=()):
    sup_dir = os.path.join(root, 'legacy', 'supplement')
    idx_dir = os.path.join(root, 'legacy', 'index')
    tot = {'added_controls': 0, 'added_options': 0, 'dynamic_rules': 0, 'corrections': 0, 'truncation_resolved': 0}
    for f in sorted(os.listdir(idx_dir)):
        if not f.endswith('.controls.json'):
            continue
        if only and f[:-len('.controls.json')] not in only:
            continue
        ip = os.path.join(idx_dir, f)
        idx = json.load(open(ip, encoding='utf-8'))
        strip_previous(idx)
        shot = sum(len(r['controls']) for r in idx['reports'])
        sp = os.path.join(sup_dir, idx['category'] + '.supplement.json')
        if os.path.exists(sp):
            sup = json.load(open(sp, encoding='utf-8'))
            reports = {r['report_id']: r for r in idx['reports']}
            for sr in sup.get('reports', []):
                r = reports[sr['report_id']]
                by_id = {c['control_id']: c for c in r['controls']}
                for i, a in enumerate(sr.get('added_controls', []), 1):
                    r['controls'].append({
                        'control_id': f'{r["report_id"]}.x{i:02d}', 'section': a['section'], 'label': a.get('label', ''),
                        'type': a['type'], 'options': list(a.get('options') or []), 'default_value': a.get('default_value', ''),
                        'enabled': a.get('enabled', True), 'notes': norm(a.get('notes')),
                        'origin': 'vendor_doc', 'confidence': a['confidence'], 'options_unknown': bool(a.get('options_unknown')),
                        'evidence_quote': norm(a.get('evidence_quote')), 'source_document': sup.get('source_document', ''),
                    })
                    tot['added_controls'] += 1
                for a in sr.get('added_options', []):
                    c = by_id[a['control_id']]
                    have = {norm(o).lower() for o in c['options']}
                    new = [o for o in a['options'] if norm(o).lower() not in have]
                    c['options'] = c['options'] + new
                    c['vendor_doc_options'] = (c.get('vendor_doc_options') or []) + new
                    c['vendor_doc_options_confidence'] = a['confidence']
                    tot['added_options'] += len(new)
                rules = []
                for i, a in enumerate(sr.get('dynamic_rules', []), 1):
                    rules.append({'rule_id': f'{r["report_id"]}.d{i:02d}', 'when': norm(a['when']), 'effect': norm(a['effect']),
                                  'controls': list(a.get('controls') or []), 'confidence': a['confidence'],
                                  'evidence_quote': norm(a.get('evidence_quote'))})
                if rules:
                    r['dynamic_rules'] = rules
                    tot['dynamic_rules'] += len(rules)
                cors = []
                for i, a in enumerate(sr.get('corrections', []), 1):
                    cors.append({'correction_id': f'{r["report_id"]}.k{i:02d}', 'about': a['about'], 'control_id': a.get('control_id', ''),
                                 'text': norm(a['text']), 'resolves_truncation': bool(a.get('resolves_truncation')),
                                 'confidence': a['confidence'], 'evidence_quote': norm(a.get('evidence_quote'))})
                    if a.get('resolves_truncation') and r.get('possibly_truncated'):
                        r['possibly_truncated_screenshot'] = True
                        r['possibly_truncated'] = False
                        tot['truncation_resolved'] += 1
                if cors:
                    r['corrections'] = cors
                    tot['corrections'] += len(cors)
            idx['supplement_unresolved'] = sup.get('unresolved', [])
            idx['supplement_source_document'] = sup.get('source_document', '')
        idx['screenshot_control_count'] = shot
        idx['control_count'] = sum(len(r['controls']) for r in idx['reports'])
        idx['vendor_doc_control_count'] = idx['control_count'] - shot
        json.dump(idx, open(ip, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
        print(f'{idx["category"]}: screenshot_controls={shot} vendor_doc_controls={idx["vendor_doc_control_count"]}'
              + ('' if os.path.exists(sp) else ' (no supplement file)'))
    print('applied: ' + ' '.join(f'{k}={v}' for k, v in tot.items()))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], tuple(sys.argv[2:]))
