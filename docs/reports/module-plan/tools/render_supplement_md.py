"""Render the vendor-documentation supplement of the legacy inventory as one readable document.

Usage: python -I render_supplement_md.py <plan_root> <out.md>

Reads <plan_root>/legacy/supplement/<category>.supplement.json and pickers.*.json and writes one document:
per category and report the criteria controls, option values, show/hide/enable rules and corrections that
vendor documentation adds to what our screenshots show, then the picker dialogs and dropdown lists, then the
questions that remain open.
"""
import json
import os
import re
import sys

ORDER = ['daily_reports', 'montly_reports', 'ledger_reports', 'management_reports', 'insurance_reports',
         'appointment_reports', 'treatmentplan_reports', 'refferal_reports', 'recall_reports', 'ortho_reports',
         'statements_reports', 'patients_list_reports', 'providers_list_reports', 'security_list_reports',
         'setup_list_reports', 'my_reports']
TITLES = {'daily_reports': 'Daily Reports', 'montly_reports': 'Monthly Reports', 'ledger_reports': 'Ledger Reports',
          'management_reports': 'Management Reports', 'insurance_reports': 'Insurance Reports',
          'appointment_reports': 'Appointment Reports', 'treatmentplan_reports': 'Treatment Plan Reports',
          'refferal_reports': 'Referral Reports', 'recall_reports': 'Recall Reports', 'ortho_reports': 'Ortho Reports',
          'statements_reports': 'Statements', 'patients_list_reports': 'Lists - Patient',
          'providers_list_reports': 'Lists - Provider', 'security_list_reports': 'Lists - Security',
          'setup_list_reports': 'Lists - Setup', 'my_reports': 'My Reports'}


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def esc(s):
    return norm(s).replace('|', '\\|')


def main(root, out):
    sup_dir = os.path.join(root, 'legacy', 'supplement')
    tot = {'added_controls': 0, 'added_options': 0, 'dynamic_rules': 0, 'corrections': 0, 'unresolved': 0, 'dialogs': 0}
    body, open_q = [], []
    for cat in ORDER:
        p = os.path.join(sup_dir, cat + '.supplement.json')
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding='utf-8'))
        idx = json.load(open(os.path.join(root, 'legacy', 'index', cat + '.controls.json'), encoding='utf-8'))
        ctl = {c['control_id']: c for r in idx['reports'] for c in r['controls']}
        names = {r['report_id']: r['name'] for r in idx['reports']}
        body += ['', f'## {TITLES[cat]}', '', f'Source: `{d.get("source_document", "")}`.']
        if not d.get('reports'):
            body += ['', 'Nothing to add: the vendor documentation shows no criteria beyond our screenshots for this category.']
        for r in d.get('reports', []):
            body += ['', f'### {esc(r.get("legacy_name"))}', '']
            ac = r.get('added_controls', [])
            if ac:
                tot['added_controls'] += len(ac)
                body += ['**Controls our screenshots do not show**', '', '| Section | Control | Type | Options | Default | Evidence | Why it was not captured |', '|---|---|---|---|---|---|---|']
                for a in ac:
                    body.append(f'| {esc(a.get("section"))} | {esc(a.get("label")) or "(no label)"} | {esc(a.get("type"))} | {esc(" / ".join(a.get("options") or [])) or ("not documented" if a.get("options_unknown") else "-")} '
                                f'| {esc(a.get("default_value")) or "not documented"} | {esc(a.get("confidence"))} | {esc(a.get("notes"))} |')
                body.append('')
            ao = r.get('added_options', [])
            if ao:
                tot['added_options'] += sum(len(a.get('options') or []) for a in ao)
                body += ['**Option values our screenshots do not show**', '', '| Section | Control | Added values | Evidence | Notes |', '|---|---|---|---|---|']
                for a in ao:
                    c = ctl.get(a.get('control_id'), {})
                    body.append(f'| {esc(c.get("section"))} | {esc(c.get("label")) or "(no label)"} | {esc(" / ".join(a.get("options") or []))} | {esc(a.get("confidence"))} | {esc(a.get("notes"))} |')
                body.append('')
            dr = r.get('dynamic_rules', [])
            if dr:
                tot['dynamic_rules'] += len(dr)
                body += ['**Show / hide / enable rules**', '', '| When | Effect | Evidence |', '|---|---|---|']
                for a in dr:
                    body.append(f'| {esc(a.get("when"))} | {esc(a.get("effect"))} | {esc(a.get("confidence"))} |')
                body.append('')
            co = r.get('corrections', [])
            if co:
                tot['corrections'] += len(co)
                body += ['**Corrections and meanings**', '', '| About | Control | Statement | Evidence |', '|---|---|---|---|']
                for a in co:
                    c = ctl.get(a.get('control_id'), {})
                    which = f'{c.get("section", "")} / {c.get("label") or "(no label)"}' if c else '-'
                    body.append(f'| {esc(a.get("about"))}{" (screen now complete)" if a.get("resolves_truncation") else ""} | {esc(which)} | {esc(a.get("text"))} | {esc(a.get("confidence"))} |')
                body.append('')
        for u in d.get('unresolved', []):
            tot['unresolved'] += 1
            open_q.append((TITLES[cat], names.get(u.get('report_id'), ''), u.get('question')))
    dialogs = []
    for f in sorted(os.listdir(sup_dir)) if os.path.isdir(sup_dir) else []:
        if f.startswith('pickers.') and f.endswith('.json'):
            d = json.load(open(os.path.join(sup_dir, f), encoding='utf-8'))
            for x in d.get('dialogs', []):
                dialogs.append((x, d.get('source_document', '')))
    body += ['', '## Picker dialogs and dropdown lists', '',
             'What opens behind SELECT / SEARCH and what collapsed dropdowns contain, as far as vendor documentation shows.', '']
    for x, src in dialogs:
        tot['dialogs'] += 1
        body += [f'### {esc(x.get("dialog_name"))}', '',
                 f'{esc(x.get("kind"))} - opened from: {esc(x.get("opened_from"))} - used by: {esc(", ".join(x.get("used_by") or []))} - evidence: {esc(x.get("confidence"))} (`{src}`)', '']
        if x.get('elements'):
            body += ['| Element | Type | Options | Notes |', '|---|---|---|---|']
            for e in x['elements']:
                body.append(f'| {esc(e.get("label"))} | {esc(e.get("type"))} | {esc(" / ".join(e.get("options") or [])) or "-"} | {esc(e.get("notes"))} |')
            body.append('')
        if x.get('values'):
            body += ['Values: ' + ' / '.join(esc(v) for v in x['values']), '']
        if norm(x.get('notes')):
            body += [esc(x.get('notes')), '']
    body += ['## Criteria questions that remain open', '', '| Category | Report | Question |', '|---|---|---|']
    for cat, name, q in open_q:
        body.append(f'| {cat} | {esc(name) or "(category)"} | {esc(q)} |')
    head = ['# Legacy inventory supplement - what vendor documentation adds to our screenshots', '',
            'Generated by `tools/render_supplement_md.py` from `legacy/supplement/*.json`. Do not edit by hand.', '',
            'The screenshot inventory (`01_legacy_inventory.md`) records each legacy criteria screen in the one state that was',
            'captured. This supplement adds what the vendor\'s own documentation shows beyond that: rows hidden below the captured',
            'area, values of collapsed dropdowns, criteria that only appear after another option is chosen, the rules that enable',
            'or disable controls, what individual controls mean, and the contents of picker dialogs. Every entry carries a verbatim',
            'quote from the research documents (kept in the JSON files) and a confidence: **confirmed** = shown or stated by the',
            'vendor, **likely** = implied by vendor text. Added controls, added option values and rules are part of the parity',
            'checklist (`09_parity_matrix.md` section 7).', '',
            f'Totals: {tot["added_controls"]} added controls, {tot["added_options"]} added option values, {tot["dynamic_rules"]} rules, '
            f'{tot["corrections"]} corrections and meanings, {tot["dialogs"]} picker dialogs and dropdown lists, {tot["unresolved"]} open questions.']
    open(out, 'w', encoding='utf-8').write('\n'.join(head + body) + '\n')
    print(f'wrote {out}: ' + ' '.join(f'{k}={v}' for k, v in tot.items()))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], sys.argv[2])
