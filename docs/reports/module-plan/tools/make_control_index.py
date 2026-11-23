"""Give every legacy criteria control a stable id and write a flat index per category.

Usage: python -I make_control_index.py <legacy_json_dir> <out_dir>

For every <legacy_json_dir>/<category>.json this writes <out_dir>/<category>.controls.json:

  { "category": ..., "window_title": ..., "report_count": n, "control_count": n,
    "reports": [ { "report_id": "<category>.r01", "name": ..., "screenshots": [...],
                   "possibly_truncated": bool, "actions": [...], "notes": ...,
                   "controls": [ { "control_id": "<category>.r01.s02.c01", "section": ...,
                                   "label": ..., "type": ..., "options": [...],
                                   "default_value": ..., "enabled": bool, "notes": ... } ] } ] }

Ids are positional (report / section / control order of the verified inventory). The parity files in
catalog/ refer to these ids, and validate_parity.py also cross-checks section and label text, so a
shifted id is caught instead of silently mapping the wrong control.
"""
import json
import os
import sys


def build(path):
    d = json.load(open(path, encoding='utf-8'))
    cat = d['category']
    reports = []
    total = 0
    for ri, r in enumerate(d['reports'], 1):
        rid = f'{cat}.r{ri:02d}'
        controls = []
        for si, s in enumerate(r['sections'], 1):
            for ci, c in enumerate(s['controls'], 1):
                controls.append({
                    'control_id': f'{rid}.s{si:02d}.c{ci:02d}',
                    'section': s['title'],
                    'label': c.get('label', ''),
                    'type': c.get('type', ''),
                    'options': c.get('options', []),
                    'default_value': c.get('default_value', ''),
                    'enabled': c.get('enabled', True),
                    'notes': c.get('notes', ''),
                })
        total += len(controls)
        reports.append({
            'report_id': rid,
            'name': r['name'],
            'screenshots': r.get('screenshots', []),
            'possibly_truncated': r.get('possibly_truncated', False),
            'actions': r.get('actions', []),
            'notes': r.get('notes', ''),
            'controls': controls,
        })
    return {
        'category': cat,
        'window_title': d.get('window_title', ''),
        'report_list': d.get('report_list', []),
        'reports_without_screenshot': d.get('reports_without_screenshot', []),
        'observations': d.get('observations', ''),
        'report_count': len(reports),
        'control_count': total,
        'reports': reports,
    }


def main(src, out):
    os.makedirs(out, exist_ok=True)
    grand_r = grand_c = 0
    for f in sorted(os.listdir(src)):
        if not f.endswith('.json'):
            continue
        idx = build(os.path.join(src, f))
        json.dump(idx, open(os.path.join(out, idx['category'] + '.controls.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
        grand_r += idx['report_count']
        grand_c += idx['control_count']
        print(f'{idx["category"]}: reports={idx["report_count"]} controls={idx["control_count"]}')
    print(f'TOTAL reports={grand_r} controls={grand_c}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
