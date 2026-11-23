import re
import sys

p = sys.argv[1]
lines = open(p, encoding='utf-8').read().split('\n')
BS = chr(92)


def cols(line):
    n = 0
    for i, ch in enumerate(line):
        if ch == '|' and (i == 0 or line[i - 1] != BS):
            n += 1
    return n - 1


bad = 0
tables = 0
i = 0
in_code = False
while i < len(lines):
    line = lines[i]
    if line.startswith('```'):
        in_code = not in_code
    if not in_code and line.startswith('|') and i + 1 < len(lines) and re.match(r'^[|][-| ]+[|]$', lines[i + 1]):
        n = cols(line)
        tables += 1
        j = i + 2
        while j < len(lines) and lines[j].startswith('|'):
            if cols(lines[j]) != n:
                bad += 1
                print(f'line {j + 1}: {cols(lines[j])} cols, header has {n}: {lines[j][:110]}')
            j += 1
        i = j
        continue
    i += 1
nonascii = sorted({ch for ln in lines for ch in ln if ord(ch) > 127})
print('tables', tables, 'bad rows', bad, 'lines', len(lines), 'non-ascii chars', [hex(ord(c)) for c in nonascii])
print('unresolved placeholders', sum(ln.count('{{') for ln in lines))
heads = [ln for ln in lines if re.match(r'^## [0-9]+[.] ', ln)]
print(len(heads), 'top sections:', [h[3:6] for h in heads])
flt = re.findall(r'^[|] (FLT-[0-9]+) [|]', '\n'.join(lines), flags=re.M)
print('FLT items', len(flt), flt[0] if flt else None, flt[-1] if flt else None)
