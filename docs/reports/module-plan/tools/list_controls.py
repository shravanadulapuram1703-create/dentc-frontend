"""Print a compact, one-line-per-control listing of a control index file.

Usage: python -I list_controls.py <legacy/index/<category>.controls.json> [report_id ...]

One block per report: report_id, legacy name, truncation flag, action buttons, then every control as

    control_id | SECTION | label | type | options (default marked with *) | default | enabled/GREYED

Use it instead of reading the JSON when you only need to know what the legacy criteria screen contains.
"""
import json
import re
import sys


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def main(path, only):
    idx = json.load(open(path, encoding='utf-8'))
    print(f'# {idx["category"]} - {idx.get("window_title", "")} - reports={idx["report_count"]} controls={idx["control_count"]}')
    for r in idx['reports']:
        if only and r['report_id'] not in only:
            continue
        flags = []
        if r.get('possibly_truncated'):
            flags.append('POSSIBLY TRUNCATED')
        print(f'\n## {r["report_id"]} | {r["name"]}' + (' | ' + ', '.join(flags) if flags else ''))
        print('actions: ' + ' ; '.join(r.get('actions', [])))
        if norm(r.get('notes')):
            print('notes: ' + norm(r['notes'])[:600])
        for c in r['controls']:
            d = norm(c.get('default_value'))
            opts = ' / '.join(('*' + norm(o)) if norm(o) == d else norm(o) for o in c.get('options', []))
            origin = ' | VENDOR-DOC' if c.get('origin') == 'vendor_doc' else ''
            print(f'{c["control_id"]} | {norm(c["section"])} | {norm(c["label"]) or "(no label)"} | {c["type"]} | {opts or "-"} | default={d or "-"} | '
                  f'{"enabled" if c.get("enabled", True) else "GREYED"}{origin}')
        for d in r.get('dynamic_rules', []):
            print(f'{d["rule_id"]} | RULE | when {norm(d["when"])} -> {norm(d["effect"])}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], set(sys.argv[2:]))
