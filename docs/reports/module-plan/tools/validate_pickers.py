"""Check a file describing the legacy picker dialogs and dropdown lists (what opens behind SELECT / SEARCH).

Usage: python -I validate_pickers.py <plan_root> <legacy/supplement/pickers.<name>.json>

The screenshots never show an opened picker dialog or an expanded dropdown. Vendor documentation shows some.
Each entry records one dialog or dropdown list with a verbatim quote from the research document.

Prints "PICKERS VALID ..." or "PICKERS INVALID" followed by every problem.

File shape:

  { "source_document": "research/legacy_report_outputs_daily_my.md",
    "dialogs": [
      { "dialog_name": "SEARCH OFFICES",                 # legacy title of the dialog, or "<control> dropdown"
        "kind": "picker_dialog",                         # picker_dialog | dropdown_list
        "opened_from": "OFFICE/GROUP > SELECT",          # the control that opens it
        "used_by": ["daily_reports", "montly_reports"],  # category keys ("all" allowed)
        "elements": [                                    # what the dialog contains
          { "label": "INCLUDE ALL", "type": "checkbox", "options": [], "notes": "" },
          { "label": "SORT BY", "type": "radio_group", "options": ["Office Name", "Office ID"], "notes": "" },
          { "label": "list columns", "type": "columns", "options": ["Office ID", "Office Name"], "notes": "" } ],
        "values": [],                                    # for a dropdown_list: the values, in legacy order
        "confidence": "confirmed",                       # confirmed | likely
        "evidence_quote": "verbatim text from the research document",
        "notes": "" } ] }
"""
import json
import os
import re
import sys

KINDS = {'picker_dialog', 'dropdown_list'}
ETYPES = {'checkbox', 'radio_group', 'dropdown', 'text_input', 'button', 'columns', 'list', 'tabs', 'date_input', 'number_input', 'static_text', 'other'}
CONF = {'confirmed', 'likely'}


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def nq(s):
    s = str(s or '')
    for a, b in (('‘', "'"), ('’', "'"), ('“', '"'), ('”', '"'), ('–', '-'), ('—', '-'),
                 (' ', ' '), ('−', '-'), ('→', '->'), ('&gt;', '>'), ('&lt;', '<'), ('&amp;', '&')):
        s = s.replace(a, b)
    s = re.sub(r'[`*|\\]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def main(root, path):
    try:
        data = json.load(open(path, encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        print('PICKERS INVALID')
        print(f'- not valid JSON: {e}')
        return 1
    doc_rel = data.get('source_document') or ''
    dp = os.path.join(root, doc_rel)
    if not doc_rel or not os.path.exists(dp):
        print('PICKERS INVALID')
        print(f'- source_document {doc_rel!r} not found under {root}')
        return 1
    doc = nq(open(dp, encoding='utf-8').read())
    cats = {f[:-len('.controls.json')] for f in os.listdir(os.path.join(root, 'legacy', 'index')) if f.endswith('.controls.json')}
    errs, names = [], set()
    for i, d in enumerate(data.get('dialogs', []), 1):
        w = f'dialogs[{i}] [{norm(d.get("dialog_name"))}]'
        if not norm(d.get('dialog_name')):
            errs.append(f'{w}: dialog_name is required')
        key = (norm(d.get('dialog_name')).upper(), norm(d.get('opened_from')).upper())
        if key in names:
            errs.append(f'{w}: listed twice with the same opened_from')
        names.add(key)
        if d.get('kind') not in KINDS:
            errs.append(f'{w}: kind must be one of {sorted(KINDS)}')
        if not norm(d.get('opened_from')):
            errs.append(f'{w}: opened_from is required')
        for u in d.get('used_by') or []:
            if u != 'all' and u not in cats:
                errs.append(f'{w}: used_by {u!r} is not a category key ({", ".join(sorted(cats))}) or "all"')
        if not (d.get('used_by') or []):
            errs.append(f'{w}: used_by is required')
        if d.get('kind') == 'dropdown_list' and not (d.get('values') or []):
            errs.append(f'{w}: a dropdown_list needs values')
        if d.get('kind') == 'picker_dialog' and not (d.get('elements') or []):
            errs.append(f'{w}: a picker_dialog needs elements')
        for j, e in enumerate(d.get('elements') or [], 1):
            if e.get('type') not in ETYPES:
                errs.append(f'{w} elements[{j}]: type {e.get("type")!r} must be one of {sorted(ETYPES)}')
            if not norm(e.get('label')):
                errs.append(f'{w} elements[{j}]: label is required')
        if d.get('confidence') not in CONF:
            errs.append(f'{w}: confidence must be confirmed or likely')
        q = nq(d.get('evidence_quote'))
        if len(q) < 12:
            errs.append(f'{w}: evidence_quote is missing or shorter than 12 characters')
        elif q not in doc:
            errs.append(f'{w}: evidence_quote not found verbatim in {doc_rel}: {norm(d.get("evidence_quote"))[:120]!r}')
    if errs:
        print('PICKERS INVALID')
        for e in errs[:200]:
            print('- ' + e)
        return 1
    print(f'PICKERS VALID dialogs={len(data.get("dialogs", []))} source={doc_rel}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2]))
