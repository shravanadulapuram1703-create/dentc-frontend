"""Print a compact, diff-friendly outline of a legacy inventory / blind transcription JSON.

Usage: python -I outline.py <file.json> [--names]

  --names   only print the report list and the report names with their screenshots
"""
import json
import sys


def one(s):
    return str(s).replace('\n', ' ').strip()


def main(path, names_only=False):
    d = json.load(open(path, encoding='utf-8'))
    out = []
    out.append(f'CATEGORY {d.get("category")} | window_title: {one(d.get("window_title", ""))}')
    out.append('REPORT LIST (' + str(len(d.get('report_list', []))) + '): ' + ' | '.join(one(x) for x in d.get('report_list', [])))
    out.append('WITHOUT SCREENSHOT: ' + (' | '.join(one(x) for x in d.get('reports_without_screenshot', [])) or '-'))
    if not names_only:
        out.append('OBSERVATIONS: ' + one(d.get('observations', '')))
    n_controls = 0
    for r in d.get('reports', []):
        out.append('')
        out.append(f'== REPORT: {one(r.get("name"))}   shots={",".join(r.get("screenshots", []))}   truncated={r.get("possibly_truncated")}   actions={" ; ".join(one(a) for a in r.get("actions", []))}')
        if names_only:
            continue
        if r.get('notes'):
            out.append(f'   notes: {one(r["notes"])}')
        for s in r.get('sections', []):
            out.append(f'  -- SECTION: {one(s.get("title"))}')
            for c in s.get('controls', []):
                n_controls += 1
                bits = [f'[{c.get("type")}] {one(c.get("label", "")) or "(no label)"}']
                if c.get('options'):
                    bits.append('options: ' + ' / '.join(one(o) for o in c['options']))
                bits.append('default: ' + (one(c.get('default_value', '')) or '(empty)'))
                if not c.get('enabled', True):
                    bits.append('DISABLED')
                if c.get('notes'):
                    bits.append('notes: ' + one(c['notes']))
                out.append('     ' + ' | '.join(bits))
    if not names_only:
        out.append('')
        out.append(f'TOTAL reports={len(d.get("reports", []))} controls={n_controls}')
    sys.stdout.reconfigure(encoding='utf-8')
    print('\n'.join(out))


if __name__ == '__main__':
    main(sys.argv[1], '--names' in sys.argv[2:])
