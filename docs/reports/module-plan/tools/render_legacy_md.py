"""Render the verified legacy inventory JSON files into one Markdown reference.

Usage: python -I render_legacy_md.py <legacy_json_dir> <out.md>
"""
import json
import os
import sys

ORDER = [
    ('daily_reports', 'Daily Reports'),
    ('montly_reports', 'Monthly Reports'),
    ('ledger_reports', 'Ledger Reports'),
    ('management_reports', 'Management Reports'),
    ('insurance_reports', 'Insurance Reports'),
    ('appointment_reports', 'Appointment Reports'),
    ('treatmentplan_reports', 'Treatment Plan Reports'),
    ('refferal_reports', 'Referral Reports'),
    ('recall_reports', 'Recall Reports'),
    ('ortho_reports', 'Ortho Reports'),
    ('statements_reports', 'Statements'),
    ('patients_list_reports', 'Lists - Patient'),
    ('providers_list_reports', 'Lists - Provider'),
    ('security_list_reports', 'Lists - Security'),
    ('setup_list_reports', 'Lists - Setup'),
    ('my_reports', 'My Reports'),
]

TYPE_LABEL = {
    'radio_group': 'Radio', 'checkbox': 'Checkbox', 'text_input': 'Text', 'date_input': 'Date',
    'number_input': 'Number', 'dropdown': 'Dropdown', 'picker': 'Picker', 'listbox': 'List box',
    'button': 'Button', 'static_text': 'Text note', 'other': 'Other',
}


def esc(s):
    return str(s).replace('|', '\\|').replace('\n', ' ').strip()


def main(src, out):
    cats = []
    for key, title in ORDER:
        p = os.path.join(src, key + '.json')
        if os.path.exists(p):
            cats.append((key, title, json.load(open(p, encoding='utf-8'))))
    known = {k for k, _ in ORDER}
    for f in sorted(os.listdir(src)):
        if f.endswith('.json') and f[:-5] not in known:
            cats.append((f[:-5], f[:-5], json.load(open(os.path.join(src, f), encoding='utf-8'))))

    n_reports = sum(len(d['reports']) for _, _, d in cats)
    n_controls = sum(len(s['controls']) for _, _, d in cats for r in d['reports'] for s in r['sections'])
    L = []
    L.append('# Legacy report inventory (Denticon) - every report, filter and option')
    L.append('')
    L.append('Generated from the verified transcriptions in `legacy/*.json` (two blind readers plus a reconciling')
    L.append('third reader per category, all working from the original screenshots). This is the parity baseline:')
    L.append('every control listed here must exist in the new Reports module.')
    L.append('')
    L.append(f'**Totals:** {len(cats)} categories, {n_reports} reports, {n_controls} criteria controls.')
    L.append('')
    L.append('## Contents')
    L.append('')
    L.append('| # | Category | Reports | Controls | Reports in legacy list without a screenshot |')
    L.append('|---|---|---|---|---|')
    for i, (key, title, d) in enumerate(cats, 1):
        nc = sum(len(s['controls']) for r in d['reports'] for s in r['sections'])
        missing = ', '.join(d.get('reports_without_screenshot') or []) or '-'
        L.append(f'| {i} | [{title}](#{i}-{title.lower().replace(" ", "-")}) | {len(d["reports"])} | {nc} | {esc(missing)} |')
    L.append('')
    for i, (key, title, d) in enumerate(cats, 1):
        L.append(f'## {i}. {title}')
        L.append('')
        L.append(f'- Source: `{key}` ({len(d["reports"])} reports transcribed) - window title: "{esc(d.get("window_title", ""))}"')
        L.append(f'- Reports listed in the legacy screen: {", ".join(esc(x) for x in d.get("report_list", [])) or "-"}')
        if d.get('reports_without_screenshot'):
            L.append(f'- **No screenshot for:** {", ".join(esc(x) for x in d["reports_without_screenshot"])}')
        if d.get('observations'):
            L.append(f'- Notes: {esc(d["observations"])}')
        L.append('')
        for j, r in enumerate(d['reports'], 1):
            L.append(f'### {i}.{j} {r["name"]}')
            L.append('')
            meta = [f'Screenshots: {", ".join(r.get("screenshots", []))}']
            if r.get('actions'):
                meta.append('Actions: ' + ', '.join(esc(a) for a in r['actions']))
            if r.get('possibly_truncated'):
                meta.append('**Possibly truncated - more options may exist below the visible area**')
            L.append(' - '.join(meta))
            if r.get('notes'):
                L.append('')
                L.append(f'> {esc(r["notes"])}')
            L.append('')
            L.append('| Section | Control | Type | Options | Default | Enabled | Notes |')
            L.append('|---|---|---|---|---|---|---|')
            for s in r['sections']:
                if not s['controls']:
                    L.append(f'| {esc(s["title"])} | - | - | - | - | - | (no controls) |')
                for c in s['controls']:
                    opts = ' / '.join(esc(o) for o in c.get('options', [])) or '-'
                    L.append('| {} | {} | {} | {} | {} | {} | {} |'.format(
                        esc(s['title']), esc(c.get('label', '')) or '(unlabelled)', TYPE_LABEL.get(c.get('type'), c.get('type')),
                        opts, esc(c.get('default_value', '')) or '-', 'yes' if c.get('enabled', True) else '**no (greyed)**',
                        esc(c.get('notes', '')) or '-'))
            L.append('')
    open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'wrote {out}: {len(cats)} categories, {n_reports} reports, {n_controls} controls')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
