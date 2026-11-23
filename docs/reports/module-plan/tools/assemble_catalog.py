"""Assemble a category catalog document from its parts and generate its parity tables.

Usage: python -I assemble_catalog.py <plan_root> <category> [--force]

Parts live in <plan_root>/catalog/parts/<category>/ and are concatenated in file-name order:

    00_header.md     "# <Category> - report specifications", "## Overview", "## Shared rules"
    10_*.md, 20_*.md report sections ("## <Legacy report name> - `report_key`"), in the legacy order

Any part may carry work items between the marker lines

    <!-- WORK-ITEMS -->
    | RPT-DAILY-10 | title | P1 | M | DATA-06 | acceptance check |
    <!-- /WORK-ITEMS -->

The blocks are removed from the parts and collected into one "## Work items" table at the end of the
document. The document is written to <plan_root>/catalog/<doc>.md and the parity tables are generated into it
(render_parity_tables.py). Once assembled, the document is the source of truth: it is edited directly and a
second run does NOT rebuild it from the parts (it only regenerates the tables) unless --force is given.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render_parity_tables  # noqa: E402

DOCS = {'daily_reports': 'daily_reports.md', 'montly_reports': 'monthly_reports.md', 'ledger_reports': 'ledger_reports.md',
        'management_reports': 'management_reports.md', 'insurance_reports': 'insurance_reports.md',
        'appointment_reports': 'appointment_reports.md', 'treatmentplan_reports': 'treatment_plan_reports.md',
        'refferal_reports': 'referral_reports.md', 'recall_reports': 'recall_reports.md', 'ortho_reports': 'ortho_reports.md',
        'statements_reports': 'statements.md', 'patients_list_reports': 'patient_lists.md',
        'providers_list_reports': 'provider_lists.md', 'security_list_reports': 'security_lists.md',
        'setup_list_reports': 'setup_lists.md', 'my_reports': 'my_reports.md'}
MARK = '<!-- ASSEMBLED'
WI = re.compile(r'<!-- WORK-ITEMS -->(.*?)<!-- /WORK-ITEMS -->', re.S)


def main(root, cat, force):
    doc_path = os.path.join(root, 'catalog', DOCS[cat])
    idx_path = os.path.join(root, 'legacy', 'index', cat + '.controls.json')
    par_path = os.path.join(root, 'catalog', 'parity', cat + '.parity.json')
    parts_dir = os.path.join(root, 'catalog', 'parts', cat)
    already = os.path.exists(doc_path) and MARK in open(doc_path, encoding='utf-8').read()
    if already and not force:
        print(f'{DOCS[cat]} is already assembled - keeping it (use --force to rebuild from the parts); regenerating tables only')
    else:
        if not os.path.isdir(parts_dir):
            print(f'ASSEMBLE INVALID\n- no parts folder {parts_dir}')
            return 1
        files = sorted(f for f in os.listdir(parts_dir) if f.endswith('.md'))
        if not files or not files[0].startswith('00_'):
            print(f'ASSEMBLE INVALID\n- parts folder must contain 00_header.md first; found {files}')
            return 1
        body, rows = [], []
        for f in files:
            text = open(os.path.join(parts_dir, f), encoding='utf-8').read()
            for m in WI.finditer(text):
                for line in m.group(1).splitlines():
                    line = line.strip()
                    if line.startswith('|') and not re.match(r'^\|\s*(id|-+)\s*\|', line, re.I) and not set(line) <= set('|-: '):
                        rows.append(line)
            text = WI.sub('', text)
            text = re.sub(r'^##\s+Work items\s*$', '', text, flags=re.M | re.I)
            body.append(text.strip() + '\n')
        doc = '\n'.join(body)
        doc += '\n## Work items\n\n| id | title | phase | size | depends on | acceptance check |\n|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n'
        doc += f'\n{MARK} from catalog/parts/{cat}/ ({", ".join(files)}). Edit this document directly from now on. -->\n'
        open(doc_path, 'w', encoding='utf-8').write(doc)
        print(f'assembled {DOCS[cat]} from {len(files)} parts, {len(rows)} work items')
    rc = render_parity_tables.main(idx_path, par_path, doc_path)
    return rc


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2], '--force' in sys.argv[3:]))
