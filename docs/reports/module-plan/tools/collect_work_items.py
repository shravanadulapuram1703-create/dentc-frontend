"""Collect every work item of the plan into one register and check it.

Usage: python -I collect_work_items.py <plan_root> [--strict]

Scans the design documents (<plan_root>/NN_*.md) and the report specifications (<plan_root>/catalog/*.md) for
work-item tables: tables whose header has an id column plus "Phase" and "Size", with rows whose first cell
is an id such as ENG-01, DATA-13, FLT-07, MET-02, DASH-11, UX-05, SEC-09 or RPT-DAILY-12.

Writes <plan_root>/work_items.json   every item: id, area, title, phase, size, depends_on, acceptance, document
       <plan_root>/work_items.md     the register grouped by phase and area, plus totals

and prints the problems a roadmap must not have:
  * an id defined twice
  * a dependency on an id that no document defines
  * a phase inversion: an item that depends on an item of a LATER phase
  * a missing or invalid phase (P0..P5) or size (S / M / L / XL)

Exit code 1 with --strict when there are problems.
"""
import json
import os
import re
import sys
from collections import defaultdict

ID_RE = re.compile(r'^(?:[A-Z]{2,6})(?:-[A-Z]{2,8})?-\d{1,3}[a-z]?$')
REF_RE = re.compile(r'\b((?:[A-Z]{2,6})(?:-[A-Z]{2,8})?-\d{1,3}[a-z]?)\b')
RANGE_RE = re.compile(r'\b((?:[A-Z]{2,6})(?:-[A-Z]{2,8})?)-(\d{1,3})\s*(?:\.\.|to|–|—|-)\s*(?:(?:[A-Z]{2,6})(?:-[A-Z]{2,8})?-)?(\d{1,3})\b')
PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5']
SIZES = {'S', 'M', 'L', 'XL'}
DAYS = {'S': 2, 'M': 5, 'L': 10, 'XL': 20}


def split_row(row):
    cells, cur, tick, i = [], '', False, 0
    s = row.strip()
    while i < len(s):
        ch = s[i]
        if ch == '\\' and i + 1 < len(s):
            cur += s[i:i + 2]
            i += 2
            continue
        if ch == '`':
            tick = not tick
        if ch == '|' and not tick:
            cells.append(cur)
            cur = ''
        else:
            cur += ch
        i += 1
    cells.append(cur)
    if cells and not cells[0].strip():
        cells = cells[1:]
    if cells and not cells[-1].strip():
        cells = cells[:-1]
    return [c.strip() for c in cells]


def clean(s):
    return re.sub(r'\s+', ' ', re.sub(r'[`*]', '', s or '')).strip()


def parse_doc(path, rel):
    items = []
    lines = open(path, encoding='utf-8').read().splitlines()
    i, fence = 0, False
    while i < len(lines):
        l = lines[i]
        if l.lstrip().startswith('```'):
            fence = not fence
        if not fence and l.lstrip().startswith('|') and i + 1 < len(lines) and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i + 1]):
            head = [clean(c).lower() for c in split_row(l)]
            j = i + 2
            rows = []
            while j < len(lines) and lines[j].lstrip().startswith('|'):
                rows.append((j + 1, split_row(lines[j])))
                j += 1
            if 'phase' in head and 'size' in head and head and head[0] in ('id', '#', 'item', 'work item'):
                col = {name: head.index(name) for name in head}
                dep = next((col[n] for n in col if n.startswith('depends')), None)
                acc = next((col[n] for n in col if n.startswith('acceptance')), None)
                tit = next((col[n] for n in col if n in ('title', 'work', 'item', 'description')), 1)
                for ln, cells in rows:
                    wid = clean(cells[0]) if cells else ''
                    if not ID_RE.match(wid) or len(cells) < len(head):
                        continue
                    items.append({
                        'id': wid, 'area': wid.rsplit('-', 1)[0], 'title': clean(cells[tit]),
                        'phase': clean(cells[col['phase']]), 'size': clean(cells[col['size']]).upper(),
                        'depends_on_text': clean(cells[dep]) if dep is not None else '',
                        'acceptance': clean(cells[acc]) if acc is not None else '',
                        'document': rel, 'line': ln,
                    })
            i = j
            continue
        i += 1
    return items


def expand_refs(text):
    refs = set()
    for m in RANGE_RE.finditer(text):
        area, a, b = m.group(1), int(m.group(2)), int(m.group(3))
        if a < b <= a + 60:
            w = len(m.group(2))
            for n in range(a, b + 1):
                refs.add(f'{area}-{str(n).zfill(w)}')
    for m in REF_RE.finditer(text):
        refs.add(m.group(1))
    return sorted(refs)


def main(root, strict):
    docs = sorted(f for f in os.listdir(root) if re.match(r'^\d\d_.*\.md$', f) and not f.startswith('09_') and not f.startswith('01_'))
    cat_dir = os.path.join(root, 'catalog')
    cats = sorted('catalog/' + f for f in os.listdir(cat_dir) if f.endswith('.md')) if os.path.isdir(cat_dir) else []
    items, problems = [], []
    for rel in docs + cats:
        # the plan documents 10-12 re-list items defined elsewhere: they are consumers, not sources
        if re.match(r'^1[0-2]_', rel):
            continue
        items += parse_doc(os.path.join(root, rel), rel)
    by_id = {}
    for it in items:
        if it['id'] in by_id:
            problems.append(f'{it["id"]}: defined twice ({by_id[it["id"]]["document"]}:{by_id[it["id"]]["line"]} and {it["document"]}:{it["line"]})')
        else:
            by_id[it['id']] = it
    areas = {it['area'] for it in items}
    for it in by_id.values():
        m = re.search(r'P[0-5]', it['phase'])
        it['phase_id'] = m.group(0) if m else ''
        if not it['phase_id']:
            problems.append(f'{it["id"]}: phase {it["phase"]!r} is not P0..P5 ({it["document"]}:{it["line"]})')
        size = it['size'].split('/')[0].split(' ')[0].strip()
        it['size_id'] = size if size in SIZES else ''
        if not it['size_id']:
            problems.append(f'{it["id"]}: size {it["size"]!r} is not S / M / L / XL ({it["document"]}:{it["line"]})')
        refs = [r for r in expand_refs(it['depends_on_text']) if r != it['id']]
        it['depends_on'] = refs
        for r in refs:
            if r not in by_id:
                if r.rsplit('-', 1)[0] in areas or re.match(r'^(ENG|DATA|FLT|MET|DASH|UX|SEC|RPT)', r):
                    problems.append(f'{it["id"]}: depends on {r}, which no document defines ({it["document"]}:{it["line"]})')
            elif it['phase_id'] and by_id[r].get('phase_id') is not None:
                pass
    for it in by_id.values():
        for r in it['depends_on']:
            d = by_id.get(r)
            if d and it['phase_id'] and d.get('phase_id') and PHASES.index(d['phase_id']) > PHASES.index(it['phase_id']):
                problems.append(f'{it["id"]} ({it["phase_id"]}) depends on {r} ({d["phase_id"]}): phase inversion ({it["document"]}:{it["line"]})')
    out = sorted(by_id.values(), key=lambda x: (x['phase_id'] or 'P9', x['area'], x['id']))
    json.dump({'count': len(out), 'items': out, 'problems': problems}, open(os.path.join(root, 'work_items.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

    L = ['# Work-item register', '',
         'Generated by `tools/collect_work_items.py` from the work-item tables of the design documents and the report',
         'specifications. Do not edit by hand. Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks, XL more.', '']
    tab = defaultdict(lambda: defaultdict(int))
    days = defaultdict(lambda: defaultdict(int))
    for it in out:
        tab[it['phase_id'] or '?'][it['area']] += 1
        days[it['phase_id'] or '?'][it['area']] += DAYS.get(it['size_id'], 0)
    all_areas = sorted({a for p in tab.values() for a in p})
    L += ['## Totals: items per phase and area', '', '| Phase | ' + ' | '.join(all_areas) + ' | Total |', '|---|' + '---|' * (len(all_areas) + 1)]
    for p in PHASES + (['?'] if '?' in tab else []):
        if p in tab:
            L.append(f'| {p} | ' + ' | '.join(str(tab[p].get(a, 0) or '') for a in all_areas) + f' | {sum(tab[p].values())} |')
    L.append('| **Total** | ' + ' | '.join(str(sum(tab[p].get(a, 0) for p in tab)) for a in all_areas) + f' | **{len(out)}** |')
    L += ['', '## Rough effort: working days per phase and area (S=2, M=5, L=10, XL=20 - an order of magnitude, not an estimate)', '',
          '| Phase | ' + ' | '.join(all_areas) + ' | Total |', '|---|' + '---|' * (len(all_areas) + 1)]
    for p in PHASES + (['?'] if '?' in days else []):
        if p in days:
            L.append(f'| {p} | ' + ' | '.join(str(days[p].get(a, 0) or '') for a in all_areas) + f' | {sum(days[p].values())} |')
    L.append('| **Total** | ' + ' | '.join(str(sum(days[p].get(a, 0) for p in days)) for a in all_areas) + f' | **{sum(sum(v.values()) for v in days.values())}** |')
    for p in PHASES + ['']:
        sel = [it for it in out if it['phase_id'] == p]
        if not sel:
            continue
        L += ['', f'## {p or "No valid phase"}', '', '| Id | Title | Size | Depends on | Document |', '|---|---|---|---|---|']
        for it in sel:
            L.append(f'| {it["id"]} | {it["title"].replace("|", "/")} | {it["size_id"] or it["size"]} | {", ".join(it["depends_on"]) or "-"} | [{it["document"]}]({it["document"]}) |')
    L += ['', '## Problems found', '']
    L += [f'- {p}' for p in problems] or ['None.']
    open(os.path.join(root, 'work_items.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'work items: {len(out)} in {len({it["document"] for it in out})} documents; problems: {len(problems)}')
    by_kind = defaultdict(int)
    for p in problems:
        by_kind['defined twice' if 'defined twice' in p else 'unknown dependency' if 'no document defines' in p
                else 'phase inversion' if 'phase inversion' in p else 'phase' if 'is not P0' in p else 'size'] += 1
    print('  ' + ', '.join(f'{k}: {v}' for k, v in sorted(by_kind.items())))
    for p in problems[:80]:
        print('- ' + p)
    return 1 if (problems and strict) else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], '--strict' in sys.argv[2:]))
