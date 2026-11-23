"""Insert the generated "legacy parity" parameter table of each report into a catalog document.

Usage: python -I render_parity_tables.py <legacy/index/<category>.controls.json> <catalog/parity/<category>.parity.json> <catalog/<doc>.md>

The catalog document carries one marker line per report, inside that report's section:

    <!-- PARITY:<report_id> -->

The marker is replaced by a block

    <!-- PARITY:<report_id>:BEGIN -->
    ...generated table...
    <!-- PARITY:<report_id>:END -->

and the block is regenerated on every later run, so the table in the document always equals the parity
file. Prints "TABLES OK ..." or "TABLES INVALID" with the reports whose marker is missing.
"""
import json
import re
import sys


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def esc(s):
    return norm(s).replace('|', '\\|')


def legacy_cell(ic):
    t = ic['type']
    d = norm(ic.get('default_value'))
    if ic.get('options'):
        added = {norm(o) for o in (ic.get('vendor_doc_options') or [])}
        parts = [(f'**{esc(o)}**' if norm(o) == d else esc(o)) + (' †' if norm(o) in added else '') for o in ic['options']]
        s = ' / '.join(parts)
        if d and d not in [norm(o) for o in ic['options']]:
            s += f' (shown: {esc(d)})'
    elif t == 'checkbox':
        s = f'**{d or "unchecked"}**'
    elif t in ('static_text', 'button'):
        s = '-'
    else:
        s = f'shown: {esc(d)}' if d else '(empty)'
    if not ic.get('enabled', True):
        s += ' - greyed out'
    return s


def table(ir, pr):
    pc = {c['control_id']: c for c in pr.get('controls', [])}
    L = ['| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |',
         '|---|---|---|---|---|---|---|---|---|']
    for ic in ir['controls']:
        c = pc.get(ic['control_id'], {})
        om = c.get('option_map') or {}
        values = ', '.join(f'{esc(k)} -> `{esc(v)}`' for k, v in om.items()) or '-'
        default = c.get('default', '')
        default = '-' if default in ('', None) else f'`{esc(json.dumps(default) if not isinstance(default, str) else default)}`'
        notes = ' '.join(x for x in [
            ('Enabled when: ' + norm(c.get('enabled_when')) + '.') if norm(c.get('enabled_when')) else '',
            ('Option rules: ' + '; '.join(f'{k} enabled when {v}' for k, v in (c.get('option_enabled_when') or {}).items()) + '.')
            if c.get('option_enabled_when') else '',
            norm(c.get('notes')),
            ('Default differs: ' + norm(c.get('default_differs_reason'))) if norm(c.get('default_differs_reason')) else '',
        ] if x) or '-'
        L.append('| {} | {} ({}){} | {} | {} | {} | {} | {} | {} | {} |'.format(
            esc(ic['section']), esc(ic['label']) or '(no label)', ic['type'],
            ' †' if ic.get('origin') == 'vendor_doc' else '', legacy_cell(ic),
            f'`{esc(c.get("param"))}`' if norm(c.get('param')) else '-', esc(c.get('param_type')) or '-',
            values, default, esc(c.get('status')) or '?', esc(notes)))
    if any(ic.get('origin') == 'vendor_doc' or ic.get('vendor_doc_options') for ic in ir['controls']):
        L += ['', '† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).']
    acts = pr.get('actions', [])
    if acts:
        L += ['', '| Legacy action button | In the new module |', '|---|---|']
        for a in acts:
            L.append(f'| {esc(a.get("legacy_action"))} | {esc(a.get("new_feature"))} |')
    irules = ir.get('dynamic_rules', [])
    if irules:
        new = {d.get('rule_id'): norm(d.get('new_behavior')) for d in pr.get('dynamic_rules', [])}
        L += ['', '| Legacy behaviour (vendor documentation): when | Effect | In the new module |', '|---|---|---|']
        for d in irules:
            L.append(f'| {esc(d["when"])} | {esc(d["effect"])} | {esc(new.get(d["rule_id"])) or "?"} |')
    srules = pr.get('shared_rules', [])
    if srules:
        L += ['', '| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |', '|---|---|---|---|---|']
        for x in srules:
            val = x.get('value', '')
            val = json.dumps(val, ensure_ascii=False) if not isinstance(val, str) else val
            L.append(f'| `{esc(x.get("param"))}` | {esc(x.get("field"))} | {esc(x.get("when"))} | {esc(val) or "-"} | {esc(x.get("evidence"))}{" - " + esc(x.get("note")) if norm(x.get("note")) else ""} |')
    return '\n'.join(L)


def main(index_path, parity_path, doc_path):
    idx = {r['report_id']: r for r in json.load(open(index_path, encoding='utf-8'))['reports']}
    par = json.load(open(parity_path, encoding='utf-8'))
    text = open(doc_path, encoding='utf-8').read()
    missing = []
    done = 0
    for pr in par.get('reports', []):
        rid = pr.get('report_id')
        if rid not in idx:
            continue
        block = f'<!-- PARITY:{rid}:BEGIN -->\n{table(idx[rid], pr)}\n<!-- PARITY:{rid}:END -->'
        pat_block = re.compile(r'<!-- PARITY:' + re.escape(rid) + r':BEGIN -->.*?<!-- PARITY:' + re.escape(rid) + r':END -->', re.S)
        marker = f'<!-- PARITY:{rid} -->'
        if pat_block.search(text):
            text = pat_block.sub(lambda _m: block, text, count=1)
            done += 1
        elif marker in text:
            text = text.replace(marker, block, 1)
            done += 1
        else:
            missing.append(f'{rid} ({pr.get("legacy_name")})')
    if missing:
        print('TABLES INVALID')
        for m in missing:
            print(f'- no marker "<!-- PARITY:{m.split(" ")[0]} -->" in {doc_path} for {m}')
        return 1
    open(doc_path, 'w', encoding='utf-8').write(text)
    print(f'TABLES OK category={par.get("category")} reports={done} doc={doc_path}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3]))
