"""Check that a catalog parity file maps EVERY legacy control of a category.

Usage: python -I validate_parity.py <index/<category>.controls.json> <catalog/<category>.parity.json>

Prints "PARITY VALID ..." with counts, or "PARITY INVALID" followed by every problem found.

Parity file shape:

  { "category": "<category>",
    "reports": [
      { "report_id": "<category>.r01",          # from the controls index
        "legacy_name": "Production Report",     # exactly as in the index
        "report_key": "daily.production_report",
        "phase": "P1",
        "actions": [ { "legacy_action": "ADD TO MY FAVORITES", "new_feature": "..." } ],
        "controls": [
          { "control_id": "<category>.r01.s02.c01",
            "legacy_section": "PRINT FORMAT",   # exactly as in the index
            "legacy_label": "",                 # exactly as in the index
            "status": "replicated",             # see STATUSES
            "param": "output_format",           # new parameter key ('' only where allowed)
            "param_type": "enum",
            "option_map": { "PDF": "pdf", "Excel": "xlsx" },   # every legacy option -> new value
            "default": "pdf",                   # new default that corresponds to the legacy default
            "default_differs_reason": "",       # fill ONLY when the new default deliberately differs
            "enabled_when": "",                 # required when the legacy control is greyed out
            "notes": "" } ],
        "dynamic_rules": [                      # one per rule the index lists for the report (vendor-documented
          { "rule_id": "<category>.r01.d01",    # show / hide / enable behaviour); new_behavior says how the new
            "new_behavior": "..." } ] } ] }     # report behaves

Controls with "origin": "vendor_doc" in the index (ids ending .xNN) come from vendor documentation rather than
from our screenshots; they are checked exactly like the others.
"""
import json
import re
import sys

STATUSES = {
    'replicated',           # same control, same options, same default
    'replicated_enhanced',  # same options plus more (multi-select, extra options, presets)
    'help_text',            # legacy static text kept as help text / tooltip
    'superseded',           # replaced by an equivalent mechanism - notes must say which
    'not_applicable',       # legacy-only technical control - notes must say why
    'unknown_legacy',       # legacy control unreadable / clipped - to confirm on the live legacy screen
}
PARAM_OPTIONAL = {'help_text', 'not_applicable', 'unknown_legacy'}
NEEDS_NOTES = {'superseded', 'not_applicable', 'unknown_legacy'}
PHASES = {'P0', 'P1', 'P2', 'P3', 'P4', 'P5'}
KEY_RE = re.compile(r'^[a-z][a-z0-9_]*\.[a-z0-9][a-z0-9_]*$')
PARAM_RE = re.compile(r'^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$')


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def main(index_path, parity_path):
    idx = json.load(open(index_path, encoding='utf-8'))
    try:
        par = json.load(open(parity_path, encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        print('PARITY INVALID')
        print(f'- parity file is not valid JSON: {e}')
        return 1
    errs = []
    if par.get('category') != idx['category']:
        errs.append(f'category is {par.get("category")!r}, expected {idx["category"]!r}')

    p_reports = {}
    for r in par.get('reports', []):
        rid = r.get('report_id')
        if rid in p_reports:
            errs.append(f'{rid}: report listed twice')
        p_reports[rid] = r

    counts = {s: 0 for s in STATUSES}
    n_controls = 0
    n_rules = 0
    n_vendor = sum(1 for r in idx['reports'] for c in r['controls'] if c.get('origin') == 'vendor_doc')
    seen_keys = {}
    for ir in idx['reports']:
        rid = ir['report_id']
        pr = p_reports.pop(rid, None)
        if pr is None:
            errs.append(f'{rid} ({ir["name"]}): report missing from parity file')
            continue
        if norm(pr.get('legacy_name')) != norm(ir['name']):
            errs.append(f'{rid}: legacy_name {pr.get("legacy_name")!r} != index name {ir["name"]!r}')
        key = pr.get('report_key', '')
        if not KEY_RE.match(key or ''):
            errs.append(f'{rid}: report_key {key!r} must look like category.report_name (snake_case)')
        elif key in seen_keys:
            errs.append(f'{rid}: report_key {key!r} already used by {seen_keys[key]}')
        else:
            seen_keys[key] = rid
        if pr.get('phase') not in PHASES:
            errs.append(f'{rid}: phase {pr.get("phase")!r} must be one of {sorted(PHASES)}')
        mapped_actions = {norm(a.get('legacy_action')).upper() for a in pr.get('actions', []) if norm(a.get('new_feature'))}
        for a in ir.get('actions', []):
            if norm(a).upper() not in mapped_actions:
                errs.append(f'{rid}: legacy action {a!r} not mapped in actions[] (needs legacy_action + new_feature)')

        p_controls = {}
        for c in pr.get('controls', []):
            cid = c.get('control_id')
            if cid in p_controls:
                errs.append(f'{cid}: control listed twice')
            p_controls[cid] = c
        for ic in ir['controls']:
            cid = ic['control_id']
            n_controls += 1
            pc = p_controls.pop(cid, None)
            if pc is None:
                errs.append(f'{cid} [{ic["section"]} / {ic["label"] or "(no label)"}]: control missing from parity file')
                continue
            if norm(pc.get('legacy_section')) != norm(ic['section']):
                errs.append(f'{cid}: legacy_section {pc.get("legacy_section")!r} != index {ic["section"]!r}')
            if norm(pc.get('legacy_label')) != norm(ic['label']):
                errs.append(f'{cid}: legacy_label {pc.get("legacy_label")!r} != index {ic["label"]!r}')
            st = pc.get('status')
            if st not in STATUSES:
                errs.append(f'{cid}: status {st!r} must be one of {sorted(STATUSES)}')
                continue
            counts[st] += 1
            param = pc.get('param', '') or ''
            if st not in PARAM_OPTIONAL and not PARAM_RE.match(param):
                errs.append(f'{cid}: param {param!r} must be a snake_case parameter key')
            if st in NEEDS_NOTES and not norm(pc.get('notes')):
                errs.append(f'{cid}: status {st} needs an explanation in notes')
            if st in ('replicated', 'replicated_enhanced'):
                om = pc.get('option_map') or {}
                om_norm = {norm(k): v for k, v in om.items()}
                for o in ic.get('options', []):
                    if norm(o) not in om_norm:
                        errs.append(f'{cid}: legacy option {o!r} not in option_map')
                    elif om_norm[norm(o)] in ('TODO', '', None):
                        errs.append(f'{cid}: legacy option {o!r} still maps to {om_norm[norm(o)]!r} - give it its new value')
                if 'default' not in pc:
                    errs.append(f'{cid}: default is missing')
                elif not norm(pc.get('default_differs_reason')):
                    ld = norm(ic.get('default_value'))
                    if ic['type'] == 'radio_group' and ld in om_norm and pc['default'] != om_norm[ld]:
                        errs.append(f'{cid}: default {pc["default"]!r} != mapped legacy default {om_norm[ld]!r} (legacy default {ld!r}); fix it or give default_differs_reason')
                    if ic['type'] == 'checkbox' and ld in ('checked', 'unchecked') and pc['default'] is not (ld == 'checked'):
                        errs.append(f'{cid}: checkbox default must be {ld == "checked"} (legacy {ld}); fix it or give default_differs_reason')
            if ic.get('vendor_doc_options') and st == 'unknown_legacy':
                errs.append(f'{cid}: vendor documentation gives option values {ic["vendor_doc_options"]!r} - map them (status cannot stay unknown_legacy)')
            if not ic.get('enabled', True) and st in ('replicated', 'replicated_enhanced') and not norm(pc.get('enabled_when')):
                errs.append(f'{cid}: legacy control is greyed out - enabled_when must state the condition that enables it')
        for cid in p_controls:
            errs.append(f'{cid}: control is not in the legacy index (remove it or fix the id)')
        p_rules = {d.get('rule_id'): d for d in pr.get('dynamic_rules', [])}
        for d in ir.get('dynamic_rules', []):
            n_rules += 1
            pd = p_rules.pop(d['rule_id'], None)
            if pd is None:
                errs.append(f'{d["rule_id"]} [when {d["when"]}]: dynamic rule missing from dynamic_rules[]')
            elif len(norm(pd.get('new_behavior'))) < 10:
                errs.append(f'{d["rule_id"]}: new_behavior must say how the new report behaves (which parameter, enabled or visible when)')
        for rid2 in p_rules:
            errs.append(f'{rid2}: dynamic rule is not in the legacy index (remove it or fix the id)')
    for rid in p_reports:
        errs.append(f'{rid}: report is not in the legacy index (remove it or fix the id)')

    if errs:
        print('PARITY INVALID')
        for e in errs[:300]:
            print('- ' + e)
        if len(errs) > 300:
            print(f'... and {len(errs) - 300} more')
        return 1
    stats = ' '.join(f'{k}={v}' for k, v in sorted(counts.items()))
    print(f'PARITY VALID category={idx["category"]} reports={len(idx["reports"])} controls={n_controls} '
          f'from_vendor_documentation={n_vendor} dynamic_rules={n_rules} {stats}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2]))
