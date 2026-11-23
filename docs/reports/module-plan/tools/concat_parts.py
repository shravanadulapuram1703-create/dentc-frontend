"""Concatenate document parts into one document and collect their work items into one table.

Usage: python -I concat_parts.py <parts_dir> <out.md>

Parts (*.md) are joined in file-name order. Work items written between the marker lines

    <!-- WORK-ITEMS -->
    | RPT-NEW-10 | title | P4 | M | DATA-30 | acceptance check |
    <!-- /WORK-ITEMS -->

are removed from the parts and collected into one "## Work items" table at the end. Prints the number of
parts, report sections ("## ... `category.report_name`") and work items, and warns about duplicate report
keys or work-item ids.
"""
import os
import re
import sys

WI = re.compile(r'<!-- WORK-ITEMS -->(.*?)<!-- /WORK-ITEMS -->', re.S)


def main(parts_dir, out):
    files = sorted(f for f in os.listdir(parts_dir) if f.endswith('.md'))
    body, rows = [], []
    for f in files:
        text = open(os.path.join(parts_dir, f), encoding='utf-8').read()
        for m in WI.finditer(text):
            for line in m.group(1).splitlines():
                line = line.strip()
                if line.startswith('|') and not re.match(r'^\|\s*(id|-+)\s*\|', line, re.I) and not set(line) <= set('|-: '):
                    rows.append(line)
        text = re.sub(r'^##\s+Work items\s*$', '', WI.sub('', text), flags=re.M | re.I)
        body.append(text.strip() + '\n')
    doc = '\n'.join(body) + '\n## Work items\n\n| id | title | phase | size | depends on | acceptance check |\n|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n'
    open(out, 'w', encoding='utf-8').write(doc)
    keys = re.findall(r'^## .*`([a-z_]+\.[a-z0-9_]+)`', doc, flags=re.M)
    ids = [re.match(r'^\|\s*([A-Z-]+-\d+[a-z]?)', r).group(1) for r in rows if re.match(r'^\|\s*([A-Z-]+-\d+[a-z]?)', r)]
    dup_k = sorted({k for k in keys if keys.count(k) > 1})
    dup_i = sorted({i for i in ids if ids.count(i) > 1})
    print(f'wrote {out}: parts={len(files)} report_sections={len(keys)} work_items={len(rows)} lines={doc.count(chr(10))}')
    if dup_k:
        print('DUPLICATE report keys: ' + ', '.join(dup_k))
    if dup_i:
        print('DUPLICATE work-item ids: ' + ', '.join(dup_i))
    return 1 if (dup_k or dup_i) else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1], sys.argv[2]))
