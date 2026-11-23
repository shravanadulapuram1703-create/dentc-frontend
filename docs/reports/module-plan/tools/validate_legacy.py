"""Usage: python -I validate_legacy.py <category.json> — validates the legacy inventory structure and prints counts."""
import json, sys
TYPES = {'radio_group', 'checkbox', 'text_input', 'date_input', 'number_input', 'dropdown', 'picker',
         'listbox', 'button', 'static_text', 'other'}
errs = []
def need(o, k, t, where):
    if k not in o:
        errs.append(f'{where}: missing "{k}"'); return None
    if not isinstance(o[k], t):
        errs.append(f'{where}: "{k}" must be {t}'); return None
    return o[k]
d = json.load(open(sys.argv[1], encoding='utf-8'))
for k, t in (('category', str), ('window_title', str), ('source_folder', str), ('report_list', list),
             ('reports', list), ('reports_without_screenshot', list), ('observations', str)):
    need(d, k, t, 'root')
nc = 0
for i, r in enumerate(d.get('reports', [])):
    w = f'reports[{i}]({r.get("name")})'
    for k, t in (('name', str), ('screenshots', list), ('sections', list), ('actions', list),
                 ('possibly_truncated', bool), ('notes', str)):
        need(r, k, t, w)
    for j, s in enumerate(r.get('sections', [])):
        ws = f'{w}.sections[{j}]({s.get("title")})'
        need(s, 'title', str, ws)
        for m, c in enumerate(need(s, 'controls', list, ws) or []):
            wc = f'{ws}.controls[{m}]'
            for k, t in (('label', str), ('type', str), ('options', list), ('default_value', str),
                         ('enabled', bool), ('notes', str)):
                need(c, k, t, wc)
            if c.get('type') not in TYPES:
                errs.append(f'{wc}: type "{c.get("type")}" not in {sorted(TYPES)}')
            nc += 1
if errs:
    print('INVALID'); [print(' -', e) for e in errs[:60]]; sys.exit(1)
print(f'VALID category={d["category"]} reports={len(d["reports"])} listed={len(d["report_list"])} controls={nc}')
