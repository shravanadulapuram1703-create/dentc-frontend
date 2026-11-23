"""Print a compact, one-line-per-control view of a parity file (legacy control -> new parameter).

Usage: python -I list_parity.py <catalog/parity/<category>.parity.json> [report_id ...]

One block per report: report_id, legacy name, report_key, phase, actions, then every control as

    control_id | SECTION | label | status | param : type | legacy option -> new value ... | default | enabled_when

followed by the documented show/hide/enable rules. Controls decided by the catalog author (not the shared
signature map) are marked "*". Use it to see how a report's criteria are mapped without reading the JSON.
"""
import json
import re
import sys


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def main(path, only):
    par = json.load(open(path, encoding='utf-8'))
    for r in par['reports']:
        if only and r['report_id'] not in only:
            continue
        print(f'\n## {r["report_id"]} | {r["legacy_name"]} | report_key={r.get("report_key") or "?"} | phase={r.get("phase") or "?"}')
        for a in r.get('actions', []):
            print(f'action: {a["legacy_action"]} -> {norm(a.get("new_feature")) or "?"}')
        for c in r['controls']:
            om = '; '.join(f'{k} -> {v}' for k, v in (c.get('option_map') or {}).items())
            d = c.get('default')
            d = json.dumps(d) if not isinstance(d, str) else d
            flags = ('*' if c.get('decided_in_catalog') else '') + (' VENDOR-DOC' if c.get('origin') == 'vendor_doc' else '') \
                + ('' if c.get('legacy_enabled', True) else ' GREYED')
            print(f'{c["control_id"]}{flags} | {norm(c["legacy_section"])} | {norm(c["legacy_label"]) or "(no label)"} | {c.get("status")} | '
                  f'{c.get("param") or "-"} : {c.get("param_type") or "-"} | {om or "-"} | default={d if d not in ("", None) else "-"}'
                  + (f' | enabled_when: {norm(c.get("enabled_when"))}' if norm(c.get('enabled_when')) else '')
                  + (f' | notes: {norm(c.get("notes"))[:220]}' if norm(c.get('notes')) else ''))
        for d in r.get('dynamic_rules', []):
            print(f'{d["rule_id"]} | RULE | legacy: when {norm(d.get("legacy_when"))} -> {norm(d.get("legacy_effect"))} | new: {norm(d.get("new_behavior")) or "?"}')
        for k in r.get('legacy_corrections', []):
            print(f'correction ({k.get("about")}): {norm(k.get("text"))}')
        for x in r.get('shared_rules', []):
            val = x.get('value', '')
            val = json.dumps(val, ensure_ascii=False) if not isinstance(val, str) else val
            print(f'shared rule (04): {x.get("param")} {x.get("field")} when {norm(x.get("when"))}' + (f' value {val}' if val else '')
                  + (f' [{x.get("evidence")}]' if x.get('evidence') else '') + (f' - {norm(x.get("note"))}' if norm(x.get('note')) else ''))
        for x in r.get('shared_vendor_doc_parameters', []):
            print(f'shared vendor-doc parameter (04): {x.get("param")} : {x.get("param_type")} | legacy control: {norm(x.get("legacy_control"))} | '
                  f'options: {norm(x.get("options")) or "-"} | default: {norm(x.get("default")) or "-"} [{x.get("evidence")}]'
                  + (f' - {norm(x.get("note"))}' if norm(x.get('note')) else ''))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], set(sys.argv[2:]))
