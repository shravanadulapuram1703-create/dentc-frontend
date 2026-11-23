"""Check that the backend and frontend plans schedule every work item of the register.

Usage: python -I check_plan_coverage.py <plan_root>

Reads <plan_root>/work_items.json (run collect_work_items.py first), 10_backend_plan.md and
11_frontend_plan.md. Id ranges such as "DATA-01..DATA-12", "ENG-03 to ENG-09" or "RPT-DAILY-10..39" count
for every id in the range.

Prints "COVERAGE VALID ..." when every work item is named in at least one of the two plans and each plan
names only ids that exist; otherwise "COVERAGE INVALID" with
  * work items neither plan mentions (grouped by area and phase)
  * ids a plan mentions that no document defines
  * items a plan schedules in a different phase than the item's own phase (when the plan states a phase
    heading "## P<n>" or "## Phase P<n>" above the mention)
"""
import json
import os
import re
import sys
from collections import defaultdict

REF = r'((?:ENG|DATA|FLT|MET|DASH|UX|SEC|RPT-[A-Z]{2,8}))-(\d{1,3})([a-z]?)'
REF_RE = re.compile(r'\b' + REF + r'\b')
RANGE_RE = re.compile(r'\b' + REF + r'\s*(?:\.\.\.?|to|through|–|—)\s*(?:(?:ENG|DATA|FLT|MET|DASH|UX|SEC|RPT-[A-Z]{2,8})-)?(\d{1,3})\b')
PHASE_H = re.compile(r'^#{1,4}\s.*\b(P[0-5])\b')


def mentions(text):
    """Return {id: set(phases under whose heading it is mentioned)}; '' when no phase heading applies."""
    out = defaultdict(set)
    phase = ''
    for line in text.splitlines():
        m = PHASE_H.match(line)
        if m:
            phase = m.group(1)
        elif re.match(r'^#{1,2}\s', line):
            phase = ''
        for m in RANGE_RE.finditer(line):
            area, a, b = m.group(1), int(m.group(2)), int(m.group(4))
            if a < b <= a + 80:
                w = len(m.group(2))
                for n in range(a, b + 1):
                    out[f'{area}-{str(n).zfill(w)}'].add(phase)
        for m in REF_RE.finditer(line):
            out[f'{m.group(1)}-{m.group(2)}{m.group(3)}'].add(phase)
    return out


def main(root):
    reg = json.load(open(os.path.join(root, 'work_items.json'), encoding='utf-8'))['items']
    by_id = {it['id']: it for it in reg}
    plans = {}
    for name in ('10_backend_plan.md', '11_frontend_plan.md'):
        p = os.path.join(root, name)
        plans[name] = mentions(open(p, encoding='utf-8').read()) if os.path.exists(p) else None
    errs = []
    for name, m in plans.items():
        if m is None:
            errs.append(f'{name} does not exist')
    have = [m for m in plans.values() if m is not None]
    missing = [it for it in reg if not any(it['id'] in m for m in have)]
    if missing:
        groups = defaultdict(list)
        for it in missing:
            groups[(it['area'], it.get('phase_id') or '?')].append(it['id'])
        for (area, phase), ids in sorted(groups.items()):
            errs.append(f'not scheduled by either plan - {area} {phase}: {", ".join(ids)}')
    for name, m in plans.items():
        if m is None:
            continue
        unknown = sorted(i for i in m if i not in by_id)
        if unknown:
            errs.append(f'{name} mentions ids that no document defines: {", ".join(unknown[:60])}{" ..." if len(unknown) > 60 else ""}')
        wrong = []
        for i, phases in m.items():
            it = by_id.get(i)
            ph = {p for p in phases if p}
            if it and it.get('phase_id') and ph and it['phase_id'] not in ph and '' not in phases:
                wrong.append(f'{i} (item phase {it["phase_id"]}, mentioned only under {"/".join(sorted(ph))})')
        if wrong:
            errs.append(f'{name} schedules items under another phase than their own: {"; ".join(wrong[:40])}{" ..." if len(wrong) > 40 else ""}')
    counts = ' '.join(f'{n}={len([i for i in m if i in by_id]) if m is not None else 0}' for n, m in plans.items())
    if errs:
        print('COVERAGE INVALID')
        for e in errs:
            print('- ' + e)
        print(f'register={len(reg)} {counts} unscheduled={len(missing)}')
        return 1
    print(f'COVERAGE VALID register={len(reg)} {counts}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1]))
