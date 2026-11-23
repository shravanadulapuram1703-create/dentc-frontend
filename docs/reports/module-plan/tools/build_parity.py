"""Build a category parity file from its skeleton plus the author's decisions, then check it.

Usage: python -I build_parity.py <plan_root> <category>

Reads  <plan_root>/catalog/skeleton/<category>.parity.json    (generated: every legacy control, most already
                                                               mapped by the shared signature map)
       <plan_root>/catalog/decisions/<category>.decisions.json (written by the catalog author: ONLY what the
                                                               skeleton cannot know or gets wrong for a report)
Writes <plan_root>/catalog/parity/<category>.parity.json and runs validate_parity.py on it.

The parity file is never edited by hand: change the decisions file and run this again.

Decisions file shape (every part optional except report_key and phase of each report):

  { "category": "daily_reports",
    "reports": {
      "daily_reports.r03": {
        "report_key": "daily.production_report",
        "phase": "P1",
        "actions": { "PRINT / PREVIEW": "text that replaces the standard mapping" },
        "dynamic_rules": { "daily_reports.r03.d01": "how the new report behaves for this legacy rule" } } },
    "controls": {
      "daily_reports.r03.s05.c02": {            # any subset of the control fields; given fields replace the skeleton's
        "status": "replicated",
        "param": "report_format", "param_type": "enum",
        "option_map": { "Detail": "detail" },   # merged into the skeleton's option_map (use it for TODO values too)
        "option_map_replace": false,            # true = replace the whole option_map instead of merging
        "default": "summary", "default_differs_reason": "",
        "enabled_when": "production_by == provider",
        "notes": "why this control differs from the shared mapping on this report" } } }
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import validate_parity  # noqa: E402

CONTROL_FIELDS = {'status', 'param', 'param_type', 'option_map', 'option_map_replace', 'default', 'default_differs_reason', 'enabled_when', 'notes'}
REPORT_FIELDS = {'report_key', 'phase', 'actions', 'dynamic_rules'}


def main(root, cat):
    sk_path = os.path.join(root, 'catalog', 'skeleton', cat + '.parity.json')
    de_path = os.path.join(root, 'catalog', 'decisions', cat + '.decisions.json')
    out_path = os.path.join(root, 'catalog', 'parity', cat + '.parity.json')
    idx_path = os.path.join(root, 'legacy', 'index', cat + '.controls.json')
    par = json.load(open(sk_path, encoding='utf-8'))
    try:
        dec = json.load(open(de_path, encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        print('PARITY INVALID')
        print(f'- decisions file {de_path} cannot be read as JSON: {e}')
        return 1
    errs = []
    if dec.get('category') not in (None, cat):
        errs.append(f'decisions category is {dec.get("category")!r}, expected {cat!r}')
    d_reports = dict(dec.get('reports') or {})
    d_controls = dict(dec.get('controls') or {})
    used_overrides = 0
    for r in par['reports']:
        dr = d_reports.pop(r['report_id'], None) or {}
        for k in dr:
            if k not in REPORT_FIELDS:
                errs.append(f'{r["report_id"]}: unknown report field {k!r} (allowed: {sorted(REPORT_FIELDS)})')
        r['report_key'] = dr.get('report_key', r.get('report_key', ''))
        r['phase'] = dr.get('phase', r.get('phase', ''))
        acts = {str(k).strip().upper(): v for k, v in (dr.get('actions') or {}).items()}
        known = {a['legacy_action'].strip().upper() for a in r['actions']}
        for k in acts:
            if k not in known:
                errs.append(f'{r["report_id"]}: actions key {k!r} is not a legacy action of this report ({sorted(known)})')
        for a in r['actions']:
            if a['legacy_action'].strip().upper() in acts:
                a['new_feature'] = acts[a['legacy_action'].strip().upper()]
        rules = dict(dr.get('dynamic_rules') or {})
        for d in r.get('dynamic_rules', []):
            if d['rule_id'] in rules:
                d['new_behavior'] = rules.pop(d['rule_id'])
        for k in rules:
            errs.append(f'{r["report_id"]}: dynamic_rules key {k!r} is not a rule of this report')
        for c in r['controls']:
            dc = d_controls.pop(c['control_id'], None)
            if dc is None:
                continue
            used_overrides += 1
            for k in dc:
                if k not in CONTROL_FIELDS:
                    errs.append(f'{c["control_id"]}: unknown control field {k!r} (allowed: {sorted(CONTROL_FIELDS)})')
            if 'option_map' in dc:
                if dc.get('option_map_replace'):
                    c['option_map'] = dict(dc['option_map'])
                else:
                    merged = dict(c.get('option_map') or {})
                    merged.update(dc['option_map'])
                    c['option_map'] = merged
            for k in ('status', 'param', 'param_type', 'default', 'default_differs_reason', 'enabled_when', 'notes'):
                if k in dc:
                    c[k] = dc[k]
            c['decided_in_catalog'] = True
    for k in d_reports:
        errs.append(f'reports key {k!r} is not a report of {cat}')
    for k in d_controls:
        errs.append(f'controls key {k!r} is not a control of {cat}')
    if errs:
        print('PARITY INVALID')
        for e in errs:
            print('- ' + e)
        return 1
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump(par, open(out_path, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(f'built {out_path} (control overrides applied: {used_overrides})')
    return validate_parity.main(idx_path, out_path)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2]))
