import io, re, json, sys

doc = io.open(sys.argv[1], encoding='utf-8').read()
m = json.load(io.open(sys.argv[2], encoding='utf-8'))
heads = set(re.findall(r'^#{2,3} (\d+(?:\.\d+)?)[. ]', doc, re.M))
print('headings', len(heads))

# own section references: "(9.5)", "(9.5, 9.7)", "section 9", "sections 9.3 to 9.6", "of 9.2", "in 13.1" ...
bad = set()
lines = doc.split('\n')
for ln, line in enumerate(lines, 1):
    # drop references to other documents: "02 section 4.1", "08 section 13.3", "(02 section 3.2)", "its section 18.2", "brief section 6"
    t = re.sub(r'(?:\b0\d|\b08|brief|its|their|there|`0\d_[a-z_]+\.md`)\s+sections?\s+[\d., and]+', ' ', line)
    t = re.sub(r'\b0[0-9] \(section \d+\)', ' ', t)
    t = re.sub(r'\b0[0-9] \(section[^)]*\)', ' ', t)
    for ref in re.findall(r'(?<![\w.$/-])(\d{1,2}\.\d{1,2})(?![\w/%-]|\.\d)', t):
        a, b = ref.split('.')
        if int(a) > 15 or int(a) < 1:
            continue
        if ref not in heads:
            bad.add((ref, ln, line[max(0, line.find(ref) - 40):line.find(ref) + 30]))
for b in sorted(bad)[:60]:
    print('REF?', b)

flt = set(re.findall(r'FLT-(\d\d)', doc))
print('FLT ids used', sorted(flt)[0], sorted(flt)[-1], len(flt))
sigs = {x['signature_id'] for x in m['mappings']}
used = set(re.findall(r'sig\d{4}', doc))
print('sig ids in doc not in map:', sorted(used - sigs))
params = set(m['parameters']) | set(m['actions'])
keys = {k for p in m['parameters'].values() for k in p['value_keys']}
for v in m['vendor_doc_parameters']:
    keys.update(v['value_keys']); params.add(v['param'].split('.')[0])
# decisions referenced
dec = [int(x) for x in re.findall(r'open decision (\d+)', doc)]
print('open decisions referenced', sorted(set(dec)))
rows = re.findall(r'^\| (\d+) \| .*', doc[doc.index('### 11.7'):doc.index('## 12.')], re.M)
print('rows in 11.7 tables', rows)
