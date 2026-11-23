"""Rebuild the shared signature map and 04_filter_framework.md from the generator: generator -> map -> document.

Kept here so the map can be regenerated (work item FLT-22). It reads the control index as it was when the map was
written (the screenshot inventory); criteria added later from vendor documentation are mapped per report in the
catalog decisions, not here.

Usage: python -I make_all.py [map|doc|all]
Outputs go to ./out ; nothing is written into the repository by this script.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.abspath(os.path.join(HERE, '..', '..')).replace(os.sep, '/')
IDX = PLAN + '/legacy/index'
what = sys.argv[1] if len(sys.argv) > 1 else 'all'
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)


def run(args):
    r = subprocess.run([sys.executable, '-I'] + args, cwd=HERE, capture_output=True, text=True, encoding='utf-8')
    sys.stdout.write(r.stdout)
    if r.returncode:
        sys.stdout.write(r.stderr[-4000:])
        sys.exit(r.returncode)


if what in ('map', 'all'):
    run(['rev1_gen.py'])
    head = open(os.path.join(HERE, 'gen_head.py'), encoding='utf-8').read()
    tail = open(os.path.join(HERE, 'gen_tail.py'), encoding='utf-8').read()
    open(os.path.join(HERE, 'gen_map.py'), 'w', encoding='utf-8', newline='\n').write(head + tail)
    run(['gen_map.py', IDX, 'out/signature_map.json', 'out/derived.json'])
    run([PLAN + '/tools/validate_signature_map.py', IDX + '/signatures.json', 'out/signature_map.json'])
if what in ('doc', 'all'):
    parts = sorted(f for f in os.listdir(HERE) if f.startswith('tpl_') and f.endswith('.md') and f[4:6].isdigit())
    tpl = ''.join(open(os.path.join(HERE, f), encoding='utf-8').read() for f in parts)
    open(os.path.join(HERE, 'doc_template.md'), 'w', encoding='utf-8', newline='\n').write(tpl)
    run(['build_doc.py', IDX, 'out/signature_map.json', 'out/derived.json', 'doc_template.md', 'out/04_filter_framework.md'])
    run(['check_doc.py', 'out/04_filter_framework.md'])
