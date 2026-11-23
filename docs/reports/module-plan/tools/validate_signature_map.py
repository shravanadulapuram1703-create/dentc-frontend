"""Check the shared signature map: one canonical parameter mapping per recurring legacy control.

Usage: python -I validate_signature_map.py <legacy/index/signatures.json> <legacy/index/signature_map.json> [min_count]

Every signature used by at least <min_count> reports (default 2) must be mapped. Singletons may be
mapped too; unmapped ones are left to the category catalog authors.

Map file shape:

  { "mappings": [
      { "signature_id": "sig0001",
        "status": "replicated",            # replicated | replicated_enhanced | help_text | superseded |
                                           # not_applicable | unknown_legacy
        "param": "output_format",          # canonical parameter key ('' only for help_text /
                                           # not_applicable / unknown_legacy)
        "param_type": "enum",              # a parameter type defined in 04_filter_framework.md
        "option_map": { "PDF": "pdf", "Excel": "xlsx" },     # every legacy option -> new value
        "default_map": { "PDF": "pdf" },   # legacy default value as captured -> new default
                                           # (e.g. "11/21/2026": "today", "ALL": "all", "108": "current_office")
        "notes": "" } ] }

Prints "SIGMAP VALID ..." or "SIGMAP INVALID" followed by the problems.
"""
import json
import re
import sys

STATUSES = {'replicated', 'replicated_enhanced', 'help_text', 'superseded', 'not_applicable', 'unknown_legacy'}
PARAM_OPTIONAL = {'help_text', 'not_applicable', 'unknown_legacy'}
NEEDS_NOTES = {'superseded', 'not_applicable', 'unknown_legacy'}
PARAM_RE = re.compile(r'^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$')


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def main(sig_path, map_path, min_count=2):
    sigs = {s['signature_id']: s for s in json.load(open(sig_path, encoding='utf-8'))['signatures']}
    try:
        data = json.load(open(map_path, encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        print('SIGMAP INVALID')
        print(f'- not valid JSON: {e}')
        return 1
    errs = []
    seen = {}
    for m in data.get('mappings', []):
        sid = m.get('signature_id')
        if sid not in sigs:
            errs.append(f'{sid}: unknown signature_id')
            continue
        if sid in seen:
            errs.append(f'{sid}: mapped twice')
        seen[sid] = m
        s = sigs[sid]
        st = m.get('status')
        if st not in STATUSES:
            errs.append(f'{sid}: status {st!r} must be one of {sorted(STATUSES)}')
            continue
        param = m.get('param', '') or ''
        if st not in PARAM_OPTIONAL and not PARAM_RE.match(param):
            errs.append(f'{sid} [{s["section"]} / {s["label"] or "(no label)"}]: param {param!r} must be a snake_case key')
        if st in NEEDS_NOTES and not norm(m.get('notes')):
            errs.append(f'{sid}: status {st} needs an explanation in notes')
        if st in ('replicated', 'replicated_enhanced'):
            if not norm(m.get('param_type')):
                errs.append(f'{sid}: param_type is missing')
            om = {norm(k): v for k, v in (m.get('option_map') or {}).items()}
            for o in s['options']:
                if norm(o) not in om:
                    errs.append(f'{sid} [{s["section"]} / {s["label"] or "(no label)"}]: legacy option {o!r} not in option_map')
            if s['type'] == 'radio_group':
                dm = {norm(k): v for k, v in (m.get('default_map') or {}).items()}
                for d in s['defaults']:
                    if norm(d) in om and norm(d) in dm and dm[norm(d)] != om[norm(d)]:
                        errs.append(f'{sid}: default_map[{d!r}] disagrees with option_map[{d!r}]')
    need = [s for s in sigs.values() if s['count'] >= min_count]
    missing = [s for s in need if s['signature_id'] not in seen]
    for s in missing:
        errs.append(f'{s["signature_id"]} [{s["section"]} / {s["type"]} / {s["label"] or "(no label)"}] used {s["count"]}x: not mapped')
    if errs:
        print('SIGMAP INVALID')
        for e in errs[:300]:
            print('- ' + e)
        if len(errs) > 300:
            print(f'... and {len(errs) - 300} more')
        return 1
    covered = sum(sigs[sid]['count'] for sid in seen)
    total = sum(s['count'] for s in sigs.values())
    print(f'SIGMAP VALID mapped_signatures={len(seen)}/{len(sigs)} recurring_mapped={len(need)}/{len(need)} '
          f'controls_covered={covered}/{total}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 2))
