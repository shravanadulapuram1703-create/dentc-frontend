"""Build the compact reference cards that report-specification authors work from.

Usage: python -I make_reference_pack.py <plan_root>

The design documents are long (150-250 KB each). A report specification needs only part of each: the report
definition fields, the dataset columns, the date / attribution rules, the coverage rating of its report, the
shared parameters, the metric keys and the right codes. This script copies exactly those parts - nothing is
rewritten - into <plan_root>/catalog/reference/:

    engine_card.md        02_architecture.md   section 3 (definition schema) without the long worked examples
    data_card.md          03_data_foundation.md sections 2-5: datasets (SQL sketches and the "Source expression"
                          column removed), normalisation rules, date bases, attribution rules
    coverage_matrix.md    03_data_foundation.md section 11 (availability of every legacy report)
    data_work_items.md    03_data_foundation.md sections 7 and 12 (schema additions, DATA-nn work items)
    filter_card.md        04_filter_framework.md sections 2, 3, 8, 9, 12 (types, shared parameters, output
                          parameters, dependencies, enhancements every report gets)
    metrics_card.md       05_metric_catalog.md  every table row that defines a metric key (when the document exists)
    security_card.md      08_security_compliance.md the sections on right codes and data classes (when it exists)

The cards are generated; the design documents stay the source of truth. Every card starts with a table of
contents with line numbers so a reader can jump to the part it needs.
"""
import os
import re
import sys


def read(path):
    return open(path, encoding='utf-8').read().splitlines()


def h2_sections(lines):
    """Return [(title, start, end)] of '## ' sections, ignoring headings inside code fences."""
    out, fence, starts = [], False, []
    for i, l in enumerate(lines):
        if l.lstrip().startswith('```'):
            fence = not fence
        elif not fence and l.startswith('## '):
            starts.append(i)
    for n, s in enumerate(starts):
        e = starts[n + 1] if n + 1 < len(starts) else len(lines)
        out.append((lines[s][3:].strip(), s, e))
    return out


def pick(lines, wanted):
    """wanted: list of regexes matched against the section title; returns the lines of those sections, in order."""
    secs = h2_sections(lines)
    got = []
    for w in wanted:
        hit = [(t, s, e) for t, s, e in secs if re.search(w, t, re.I)]
        if not hit:
            got.append(f'> (section matching /{w}/ not found in the source document)')
            continue
        for t, s, e in hit:
            got += lines[s:e]
    return got


def strip_code(lines, keep_max=0, note='(SQL / code sketch omitted here - see the design document)'):
    out, buf, fence = [], [], False
    for l in lines:
        if l.lstrip().startswith('```'):
            if fence:
                buf.append(l)
                if keep_max and len(buf) <= keep_max:
                    out += buf
                else:
                    out.append(f'> {note}')
                buf, fence = [], False
            else:
                fence, buf = True, [l]
            continue
        (buf if fence else out).append(l)
    return out + buf


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


def drop_column(lines, name):
    out, i = [], 0
    while i < len(lines):
        l = lines[i]
        if l.lstrip().startswith('|') and i + 1 < len(lines) and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i + 1]):
            head = split_row(l)
            idx = next((k for k, c in enumerate(head) if c.lower() == name.lower()), None)
            j = i
            while j < len(lines) and lines[j].lstrip().startswith('|'):
                if idx is None:
                    out.append(lines[j])
                else:
                    cells = split_row(lines[j])
                    if len(cells) == len(head):
                        cells = cells[:idx] + cells[idx + 1:]
                        out.append('| ' + ' | '.join(cells) + ' |')
                    else:
                        out.append(lines[j])
                j += 1
            i = j
            continue
        out.append(l)
        i += 1
    return out


def squeeze(lines):
    out, blank = [], False
    for l in lines:
        b = not l.strip()
        if b and blank:
            continue
        out.append(l.rstrip())
        blank = b
    return out


def with_toc(title, source, body):
    body = squeeze(body)
    heads = [(i, l) for i, l in enumerate(body) if re.match(r'^#{2,3} ', l)]
    head = [f'# {title}', '', f'Generated by `tools/make_reference_pack.py` from `{source}` - a copy of the parts a report specification needs.',
            'The design document is the source of truth; open it when you need the SQL sketches or the reasoning.', '',
            '## Contents (line numbers of this file)', '']
    offset = len(head) + len(heads) + 1
    for i, l in heads:
        indent = '  ' if l.startswith('### ') else ''
        head.append(f'{indent}- line {i + offset + 1}: {l.lstrip("#").strip()}')
    head.append('')
    return head + body


def write(path, lines):
    open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(f'{os.path.basename(path)}: {len(lines)} lines, {sum(len(l) + 1 for l in lines) // 1024} KB')


def main(root):
    out_dir = os.path.join(root, 'catalog', 'reference')
    os.makedirs(out_dir, exist_ok=True)
    p02, p03, p04 = (os.path.join(root, n) for n in ('02_architecture.md', '03_data_foundation.md', '04_filter_framework.md'))
    p05, p08 = os.path.join(root, '05_metric_catalog.md'), os.path.join(root, '08_security_compliance.md')
    if os.path.exists(p02):
        body = strip_code(pick(read(p02), [r'^3\.']), keep_max=25,
                          note='(worked example omitted here - the two complete definitions are in 02_architecture.md section 3)')
        write(os.path.join(out_dir, 'engine_card.md'), with_toc('Engine card - the report definition schema', '02_architecture.md', body))
    if os.path.exists(p03):
        l03 = read(p03)
        body = drop_column(strip_code(pick(l03, [r'^2\.', r'^3\.', r'^4\.', r'^5\.'])), 'Source expression')
        write(os.path.join(out_dir, 'data_card.md'), with_toc('Data card - rpt_* datasets, normalisation, dates, attribution', '03_data_foundation.md', body))
        write(os.path.join(out_dir, 'coverage_matrix.md'), with_toc('Coverage matrix - what each legacy report needs from the data', '03_data_foundation.md', pick(l03, [r'^11\.'])))
        write(os.path.join(out_dir, 'data_work_items.md'), with_toc('Data work items - schema additions and DATA-nn', '03_data_foundation.md',
                                                                    strip_code(pick(l03, [r'^7\.', r'^12\.']))))
    if os.path.exists(p04):
        body = strip_code(pick(read(p04), [r'^2\.', r'^3\.', r'^8\.', r'^9\.', r'^12\.']), keep_max=12)
        write(os.path.join(out_dir, 'filter_card.md'), with_toc('Filter card - parameter types and the shared parameter dictionary', '04_filter_framework.md', body))
    if os.path.exists(p05):
        l05 = read(p05)
        rows, fence, last_h = [], False, ''
        for i, l in enumerate(l05):
            if l.lstrip().startswith('```'):
                fence = not fence
            if fence:
                continue
            if re.match(r'^#{2,3} ', l):
                last_h = l
            if l.lstrip().startswith('|') and re.match(r'^\s*\|\s*`[a-z][a-z0-9_]+`\s*\|', l):
                k = i
                while k > 0 and l05[k - 1].lstrip().startswith('|'):
                    k -= 1
                head = [c.strip('` ').lower() for c in split_row(l05[k])]
                if not head or head[0] != 'metric_key':
                    continue
                keep = [n for n, c in enumerate(head) if c in ('metric_key', 'label', 'definition', 'basis', 'fmt', 'avail.', 'ph')]
                if last_h:
                    rows += ['', last_h, '']
                    # the "Drill:" line under the heading names the report keys the metrics lead to
                    for m in range(l05.index(last_h) + 1, k):
                        if 'Drill' in l05[m] or (rows and 'Drill' in rows[-1] and l05[m].strip()):
                            rows.append(l05[m])
                    hc = split_row(l05[k])
                    rows += ['', '| ' + ' | '.join(hc[n] for n in keep) + ' |', '|' + '---|' * len(keep)]
                    last_h = ''
                cells = split_row(l)
                if len(cells) == len(head) and cells[0].strip('` ').lower() != 'metric_key':
                    rows.append('| ' + ' | '.join(cells[n] for n in keep) + ' |')
        write(os.path.join(out_dir, 'metrics_card.md'), with_toc('Metrics card - every metric key', '05_metric_catalog.md', rows))
    if os.path.exists(p08):
        body = strip_code(pick(read(p08), [r'right', r'data class', r'classif']), keep_max=12)
        write(os.path.join(out_dir, 'security_card.md'), with_toc('Security card - right codes and data classes', '08_security_compliance.md', body))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1])
