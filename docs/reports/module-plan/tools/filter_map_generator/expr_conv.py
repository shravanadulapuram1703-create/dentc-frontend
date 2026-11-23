"""String notation of a dependency expression -> stored form (JSON arrays of 02_architecture.md section 3.2).

Additions to the engine grammar used here: ["contains", key, literal], the boolean literals true / false,
ctx facts beyond multi_office / provider_restricted (ctx.feature.<flag>) and the marker ["unknown"].
"""
import re

TOKEN = re.compile(r'\s*(==|!=|>=|<=|>|<|\[|\]|\(|\)|,|[A-Za-z_][A-Za-z0-9_.]*|-?[0-9]+(?:\.[0-9]+)?)')
CMP = {'==': 'eq', '!=': 'ne', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte'}


def tokenize(s):
    out, i = [], 0
    s = s.strip()
    while i < len(s):
        m = TOKEN.match(s, i)
        if not m:
            raise ValueError(f'bad expression at {i}: {s!r}')
        out.append(m.group(1))
        i = m.end()
    return out


def literal(tok):
    if tok == 'true':
        return True
    if tok == 'false':
        return False
    if re.fullmatch(r'-?[0-9]+', tok):
        return int(tok)
    if re.fullmatch(r'-?[0-9]+\.[0-9]+', tok):
        return float(tok)
    return tok


class Parser:
    def __init__(self, s):
        self.t = tokenize(s)
        self.i = 0
        self.keys = []

    def peek(self, k=0):
        return self.t[self.i + k] if self.i + k < len(self.t) else None

    def take(self, expect=None):
        tok = self.peek()
        if tok is None or (expect is not None and tok != expect):
            raise ValueError(f'expected {expect!r}, got {tok!r} in {self.t}')
        self.i += 1
        return tok

    def expr(self):
        parts = [self.and_expr()]
        while self.peek() == 'or':
            self.take()
            parts.append(self.and_expr())
        return parts[0] if len(parts) == 1 else ['or'] + parts

    def and_expr(self):
        parts = [self.unary()]
        while self.peek() == 'and':
            self.take()
            parts.append(self.unary())
        return parts[0] if len(parts) == 1 else ['and'] + parts

    def unary(self):
        tok = self.peek()
        if tok == 'not':
            self.take()
            return ['not', self.unary()]
        if tok == '(':
            self.take()
            e = self.expr()
            self.take(')')
            return e
        if tok in ('true', 'false'):
            self.take()
            return tok == 'true'
        if tok == 'unknown':
            # rule that nobody could observe: evaluates as true (control stays enabled); the definition lint
            # refuses a published definition that still contains it
            self.take()
            return ['unknown']
        if tok and tok.startswith('ctx.'):
            self.take()
            return ['ctx', tok[4:]]
        return self.cmp()

    def cmp(self):
        key = self.take()
        if not re.fullmatch(r'[a-z][a-z0-9_]*', key):
            raise ValueError(f'operand must be a value key: {key!r}')
        self.keys.append(key)
        op = self.take()
        if op in CMP:
            lit = literal(self.take())
            if op in ('==', '!=') and isinstance(lit, bool):
                return ['truthy' if (lit == (op == '==')) else 'falsy', key]
            return [CMP[op], key, lit]
        if op == 'in':
            return ['in', key, self.lit_list()]
        if op == 'not':
            self.take('in')
            return ['not_in', key, self.lit_list()]
        if op == 'contains':
            return ['contains', key, literal(self.take())]
        if op == 'is':
            if self.peek() == 'not':
                self.take()
                self.take('empty')
                return ['not_empty', key]
            self.take('empty')
            return ['empty', key]
        raise ValueError(f'unknown operator {op!r} in {self.t}')

    def lit_list(self):
        self.take('[')
        out = [literal(self.take())]
        while self.peek() == ',':
            self.take()
            out.append(literal(self.take()))
        self.take(']')
        return out


def to_expr(s):
    """Return (stored_form, value_keys_used)."""
    p = Parser(s)
    e = p.expr()
    if p.peek() is not None:
        raise ValueError(f'trailing tokens in {s!r}: {p.t[p.i:]}')
    return e, p.keys


if __name__ == '__main__':
    import json
    for s in ['group_by != none', 'payment_types contains check', 'date_range_type in [appointment_created_date, both]',
              'include_ucr == true', 'only_appointnow_appointments == false', 'date_basis_set is not empty', 'false',
              'ctx.multi_office', 'ctx.feature.hold_statements_with_open_claims', 'not (group_by == none) and output_format != xlsx',
              'report_by == provider or group_by == provider']:
        print(s, '->', json.dumps(to_expr(s)[0]))
