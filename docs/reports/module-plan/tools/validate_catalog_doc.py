"""Check the structure of a category catalog document against the legacy index and the parity file.

Usage: python -I validate_catalog_doc.py <plan_root> <category>

Prints "CATALOG VALID ..." or "CATALOG INVALID" followed by every problem. Checks:

  * the document has "## Overview", "## Shared rules" and "## Work items"
  * every legacy report of the category has its own "## <Legacy report name> - `report_key`" section, in the
    legacy order, with the report_key of the parity file
  * every report section has all sub-sections of the template and a generated parity table
  * the Overview table names every report_key
  * work item ids are unique and carry the category prefix
  * no "TODO" / "TBD" placeholders are left
"""
import json
import os
import re
import sys

DOCS = {'daily_reports': ('daily_reports.md', 'RPT-DAILY'), 'montly_reports': ('monthly_reports.md', 'RPT-MONTHLY'),
        'ledger_reports': ('ledger_reports.md', 'RPT-LEDGER'), 'management_reports': ('management_reports.md', 'RPT-MGMT'),
        'insurance_reports': ('insurance_reports.md', 'RPT-INS'), 'appointment_reports': ('appointment_reports.md', 'RPT-APPT'),
        'treatmentplan_reports': ('treatment_plan_reports.md', 'RPT-TX'), 'refferal_reports': ('referral_reports.md', 'RPT-REF'),
        'recall_reports': ('recall_reports.md', 'RPT-RECALL'), 'ortho_reports': ('ortho_reports.md', 'RPT-ORTHO'),
        'statements_reports': ('statements.md', 'RPT-STMT'), 'patients_list_reports': ('patient_lists.md', 'RPT-PLIST'),
        'providers_list_reports': ('provider_lists.md', 'RPT-PRLIST'), 'security_list_reports': ('security_lists.md', 'RPT-SLIST'),
        'setup_list_reports': ('setup_lists.md', 'RPT-STLIST'), 'my_reports': ('my_reports.md', 'RPT-MY')}
SUBS = ['Purpose', 'Legacy output', 'Parameters - legacy parity', 'Parameters - enhancements', 'Data', 'Output',
        'Visuals and drill-through', 'Actions', 'Export and print', 'Open questions']


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def loose(s):
    return re.sub(r'[^a-z0-9]+', ' ', norm(s).lower()).strip()


def main(root, cat):
    doc_name, prefix = DOCS[cat]
    doc_path = os.path.join(root, 'catalog', doc_name)
    idx = json.load(open(os.path.join(root, 'legacy', 'index', cat + '.controls.json'), encoding='utf-8'))
    par = json.load(open(os.path.join(root, 'catalog', 'parity', cat + '.parity.json'), encoding='utf-8'))
    if not os.path.exists(doc_path):
        print(f'CATALOG INVALID\n- {doc_path} does not exist')
        return 1
    text = open(doc_path, encoding='utf-8').read()
    lines = text.splitlines()
    errs = []
    h2 = [(i, norm(l[3:])) for i, l in enumerate(lines) if l.startswith('## ')]
    names = [t for _, t in h2]
    for need in ('Overview', 'Shared rules', 'Work items'):
        if not any(loose(t) == loose(need) for t in names):
            errs.append(f'missing section "## {need}"')
    keys = {r['report_id']: r.get('report_key', '') for r in par.get('reports', [])}
    last_pos = -1
    overview = ''
    for n, (i, t) in enumerate(h2):
        if loose(t) == 'overview':
            end = h2[n + 1][0] if n + 1 < len(h2) else len(lines)
            overview = '\n'.join(lines[i:end])
    for r in idx['reports']:
        rid, name, key = r['report_id'], r['name'], keys.get(r['report_id'], '')
        found = [(n, i, t) for n, (i, t) in enumerate(h2) if f'`{key}`' in t and key]
        if not found:
            errs.append(f'{rid} ({name}): no section heading "## {name} - `{key}`"')
            continue
        n, i, t = found[0]
        if loose(name) not in loose(t):
            errs.append(f'{rid}: heading {t!r} does not contain the legacy name {name!r}')
        if i < last_pos:
            errs.append(f'{rid} ({name}): section is out of the legacy order')
        last_pos = i
        end = h2[n + 1][0] if n + 1 < len(h2) else len(lines)
        sec = lines[i:end]
        h3 = [loose(l[4:]) for l in sec if l.startswith('### ')]
        for s in SUBS:
            if not any(x.startswith(loose(s)) for x in h3):
                errs.append(f'{rid} ({name}): sub-section "### {s}" is missing')
        body = '\n'.join(sec)
        if f'<!-- PARITY:{rid}:BEGIN -->' not in body or f'<!-- PARITY:{rid}:END -->' not in body:
            errs.append(f'{rid} ({name}): generated parity table is missing (marker <!-- PARITY:{rid} --> then render_parity_tables.py)')
        if len(body) < 1500:
            errs.append(f'{rid} ({name}): section is only {len(body)} characters - too thin to build from')
        if key and f'`{key}`' not in overview:
            errs.append(f'{rid}: report_key `{key}` is not in the Overview table')
    ids = re.findall(r'^\|\s*(RPT-[A-Z]+-\d+[a-z]?)\s*\|', text, flags=re.M)
    seen = set()
    for w in ids:
        if not w.startswith(prefix + '-'):
            errs.append(f'work item {w}: must start with {prefix}-')
        if w in seen:
            errs.append(f'work item {w}: id used twice')
        seen.add(w)
    if not ids:
        errs.append('no work items found (rows "| RPT-...-nn | ..." in the Work items table)')
    for m in re.finditer(r'\b(TODO|TBD|FIXME)\b', text):
        ln = text.count('\n', 0, m.start()) + 1
        errs.append(f'line {ln}: placeholder {m.group(1)} left in the document')
    if errs:
        print('CATALOG INVALID')
        for e in errs[:200]:
            print('- ' + e)
        return 1
    print(f'CATALOG VALID category={cat} doc={doc_name} reports={len(idx["reports"])} work_items={len(ids)} lines={len(lines)}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2]))
