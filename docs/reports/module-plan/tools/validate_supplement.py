"""Check a vendor-documentation supplement of the legacy criteria inventory.

Usage: python -I validate_supplement.py <plan_root> <legacy/supplement/<category>.supplement.json>

The screenshot inventory (legacy/<category>.json -> legacy/index/<category>.controls.json) records only what
the captured screens show. Vendor documentation shows more: rows hidden below the captured area, the values
of collapsed dropdowns, criteria that only appear in another report mode, and enable/disable rules. A
supplement file adds those, each with a verbatim quote from the research document that supports it.

Prints "SUPPLEMENT VALID ..." with counts, or "SUPPLEMENT INVALID" followed by every problem.

File shape:

  { "category": "daily_reports",
    "source_document": "research/legacy_report_outputs_daily_my.md",
    "reports": [
      { "report_id": "daily_reports.r12",
        "legacy_name": "Special Transaction Report",          # exactly as in the index
        "added_controls": [                                   # controls our screenshots do not show
          { "section": "OTHER OPTIONS", "label": "Sort By", "type": "radio_group",
            "options": ["Patient LastName", "Patient ID", "Date"],
            "default_value": "",                              # '' when the default is not documented
            "enabled": true,
            "options_unknown": false,                         # true when the value list is not documented
            "distinct_from": "",                              # existing control_id it could be confused with
            "confidence": "confirmed",                        # confirmed | likely
            "evidence_quote": "verbatim text from the research document",
            "notes": "why it is missing from our capture" } ],
        "added_options": [                                    # more values for a control we already have
          { "control_id": "patients_list_reports.r03.s02.c01", "options": ["Birthdate", "Carrier"],
            "confidence": "confirmed", "evidence_quote": "...", "notes": "" } ],
        "dynamic_rules": [                                    # show / hide / enable / disable behaviour
          { "when": "PRODUCTION BY = Provider", "effect": "REPORT FORMAT Detail becomes selectable",
            "controls": ["daily_reports.r03.s05.c01"],        # existing control ids involved (optional)
            "confidence": "confirmed", "evidence_quote": "..." } ],
        "corrections": [                                      # facts that correct the screenshot inventory
          { "about": "truncation",                            # truncation | label | meaning | default | options | other
            "control_id": "", "text": "The panel ends at SORT BY; nothing else is hidden.",
            "resolves_truncation": true,                      # true only when the report is now fully known
            "confidence": "confirmed", "evidence_quote": "..." } ] } ],
    "unresolved": [ { "report_id": "daily_reports.r01", "question": "..." } ] }
"""
import json
import os
import re
import sys

TYPES = {'radio_group', 'picker', 'checkbox', 'date_input', 'dropdown', 'text_input', 'button', 'number_input', 'static_text', 'other'}
CONF = {'confirmed', 'likely'}
ABOUT = {'truncation', 'label', 'meaning', 'default', 'options', 'other'}


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def nq(s):
    """Normalise text for quote matching: quotes, dashes, markdown emphasis, table pipes, whitespace."""
    s = str(s or '')
    for a, b in (('‘', "'"), ('’', "'"), ('“', '"'), ('”', '"'), ('–', '-'), ('—', '-'),
                 (' ', ' '), ('−', '-'), ('→', '->'), ('&gt;', '>'), ('&lt;', '<'), ('&amp;', '&')):
        s = s.replace(a, b)
    s = re.sub(r'[`*|\\]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def main(root, path):
    errs = []
    try:
        sup = json.load(open(path, encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        print('SUPPLEMENT INVALID')
        print(f'- not valid JSON: {e}')
        return 1
    cat = sup.get('category')
    ip = os.path.join(root, 'legacy', 'index', f'{cat}.controls.json')
    if not os.path.exists(ip):
        print('SUPPLEMENT INVALID')
        print(f'- category {cat!r}: no index file {ip}')
        return 1
    idx = json.load(open(ip, encoding='utf-8'))
    doc_rel = sup.get('source_document') or ''
    dp = os.path.join(root, doc_rel)
    if not doc_rel or not os.path.exists(dp):
        print('SUPPLEMENT INVALID')
        print(f'- source_document {doc_rel!r} not found under {root}')
        return 1
    doc = nq(open(dp, encoding='utf-8').read())
    reports = {r['report_id']: r for r in idx['reports']}
    n = {'added_controls': 0, 'added_options': 0, 'dynamic_rules': 0, 'corrections': 0}
    seen = set()

    def quote_ok(where, q):
        q2 = nq(q)
        if len(q2) < 12:
            errs.append(f'{where}: evidence_quote is missing or shorter than 12 characters')
        elif q2 not in doc:
            errs.append(f'{where}: evidence_quote not found verbatim in {doc_rel}: {norm(q)[:120]!r}')

    def conf_ok(where, c):
        if c not in CONF:
            errs.append(f'{where}: confidence {c!r} must be confirmed or likely (leave inferred items out; list them under unresolved)')

    for sr in sup.get('reports', []):
        rid = sr.get('report_id')
        if rid not in reports:
            errs.append(f'{rid}: not a report of {cat}')
            continue
        if rid in seen:
            errs.append(f'{rid}: listed twice')
        seen.add(rid)
        ir = reports[rid]
        if norm(sr.get('legacy_name')) != norm(ir['name']):
            errs.append(f'{rid}: legacy_name {sr.get("legacy_name")!r} != index name {ir["name"]!r}')
        # only screenshot controls count as "existing" (the index may already carry an applied supplement)
        existing = [c for c in ir['controls'] if c.get('origin') != 'vendor_doc']
        by_id = {c['control_id']: c for c in existing}
        new_keys = set()
        for i, a in enumerate(sr.get('added_controls', []), 1):
            w = f'{rid} added_controls[{i}] [{norm(a.get("section"))} / {norm(a.get("label")) or "(no label)"}]'
            n['added_controls'] += 1
            if a.get('type') not in TYPES:
                errs.append(f'{w}: type {a.get("type")!r} must be one of {sorted(TYPES)}')
            if not norm(a.get('section')):
                errs.append(f'{w}: section is required (use the legacy section title, or the nearest one)')
            opts = a.get('options') or []
            if not isinstance(opts, list):
                errs.append(f'{w}: options must be a list')
                opts = []
            if a.get('type') in ('radio_group', 'dropdown') and not opts and not a.get('options_unknown'):
                errs.append(f'{w}: a {a.get("type")} needs options, or options_unknown: true with a note')
            if a.get('options_unknown') and not norm(a.get('notes')):
                errs.append(f'{w}: options_unknown needs a note saying what is not documented')
            d = norm(a.get('default_value'))
            if d and opts and a.get('type') in ('radio_group', 'dropdown') and d not in [norm(o) for o in opts]:
                errs.append(f'{w}: default_value {d!r} is not one of the options')
            if a.get('type') == 'checkbox' and d not in ('', 'checked', 'unchecked'):
                errs.append(f'{w}: checkbox default_value must be checked, unchecked or empty')
            if not isinstance(a.get('enabled', True), bool):
                errs.append(f'{w}: enabled must be true or false')
            conf_ok(w, a.get('confidence'))
            quote_ok(w, a.get('evidence_quote'))
            key = (norm(a.get('section')).upper(), norm(a.get('label')).lower(), a.get('type'))
            if key in new_keys:
                errs.append(f'{w}: listed twice in added_controls')
            new_keys.add(key)
            dup = [c['control_id'] for c in existing
                   if (norm(c['section']).upper(), norm(c['label']).lower(), c['type']) == key]
            if dup and not norm(a.get('distinct_from')):
                errs.append(f'{w}: the screenshot inventory already has this control ({", ".join(dup)}); '
                            f'use added_options / corrections, or set distinct_from if it really is another control')
            if norm(a.get('distinct_from')) and a['distinct_from'] not in by_id:
                errs.append(f'{w}: distinct_from {a["distinct_from"]!r} is not a control of {rid}')
        for i, a in enumerate(sr.get('added_options', []), 1):
            w = f'{rid} added_options[{i}] [{a.get("control_id")}]'
            n['added_options'] += 1
            c = by_id.get(a.get('control_id'))
            if c is None:
                errs.append(f'{w}: control_id is not a screenshot control of {rid}')
                continue
            opts = a.get('options') or []
            if not opts:
                errs.append(f'{w}: options is empty')
            have = {norm(o).lower() for o in c.get('options', []) if o not in (c.get('vendor_doc_options') or [])}
            for o in opts:
                if norm(o).lower() in have:
                    errs.append(f'{w}: option {o!r} is already in the screenshot inventory')
            if len({norm(o).lower() for o in opts}) != len(opts):
                errs.append(f'{w}: options contains duplicates')
            conf_ok(w, a.get('confidence'))
            quote_ok(w, a.get('evidence_quote'))
        for i, a in enumerate(sr.get('dynamic_rules', []), 1):
            w = f'{rid} dynamic_rules[{i}]'
            n['dynamic_rules'] += 1
            if not norm(a.get('when')) or not norm(a.get('effect')):
                errs.append(f'{w}: when and effect are required')
            for cid in a.get('controls') or []:
                if cid not in by_id:
                    errs.append(f'{w}: controls entry {cid!r} is not a screenshot control of {rid}')
            conf_ok(w, a.get('confidence'))
            quote_ok(w, a.get('evidence_quote'))
        for i, a in enumerate(sr.get('corrections', []), 1):
            w = f'{rid} corrections[{i}]'
            n['corrections'] += 1
            if a.get('about') not in ABOUT:
                errs.append(f'{w}: about {a.get("about")!r} must be one of {sorted(ABOUT)}')
            if not norm(a.get('text')):
                errs.append(f'{w}: text is required')
            if norm(a.get('control_id')) and a['control_id'] not in by_id:
                errs.append(f'{w}: control_id {a["control_id"]!r} is not a screenshot control of {rid}')
            if not isinstance(a.get('resolves_truncation', False), bool):
                errs.append(f'{w}: resolves_truncation must be true or false')
            if a.get('resolves_truncation') and not ir.get('possibly_truncated_screenshot', ir.get('possibly_truncated')):
                errs.append(f'{w}: resolves_truncation is set but the report is not marked possibly truncated')
            conf_ok(w, a.get('confidence'))
            quote_ok(w, a.get('evidence_quote'))
    for i, u in enumerate(sup.get('unresolved', []), 1):
        if u.get('report_id') and u['report_id'] not in reports:
            errs.append(f'unresolved[{i}]: report_id {u["report_id"]!r} is not a report of {cat}')
        if not norm(u.get('question')):
            errs.append(f'unresolved[{i}]: question is required')

    if errs:
        print('SUPPLEMENT INVALID')
        for e in errs[:300]:
            print('- ' + e)
        if len(errs) > 300:
            print(f'... and {len(errs) - 300} more')
        return 1
    print(f'SUPPLEMENT VALID category={cat} reports_touched={len(seen)} ' + ' '.join(f'{k}={v}' for k, v in n.items())
          + f' unresolved={len(sup.get("unresolved", []))}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2]))
