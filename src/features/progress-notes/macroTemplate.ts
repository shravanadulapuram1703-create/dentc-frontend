// Progress-note macro templating (legacy Denticon parity).
//
// A note macro's `content` interleaves literal text with fillable tokens that the
// "Please complete below questionnaire" popup turns into form fields. Three token
// forms are supported (the seeded macros use the first; the legacy docs the rest):
//
//   @@<prompt>@@                bare prompt     → free-text fill-in (label = prompt)
//                               e.g. @@insert tooth number@@, @@insert value@@
//   @@<Label>{{<source>}}@@     labelled token  → question label = <Label>
//   {{<source>}}                bare token      → question label = <source>
//
// For the {{…}} forms, <source> is either:
//   • inline options separated by "/"   e.g. {{Low/Med/high}}  → choose from list
//   • a pick-list name reference        e.g. {{Recall Procedures Provided}}
//                                        → options pulled from the questionnaire
//                                          (pick-list) of the same description
//
// A trailing "*" on the label/source marks the field mandatory (red asterisk).
// On submit, each token is replaced in-place by the chosen answer(s); a token with
// no answer collapses to an empty string (matching the legacy "TMJ:" behaviour
// where an unfilled section just leaves its literal prefix).

export interface MacroField {
  /** Stable key tying a parsed field to its answer (token order, left→right). */
  key: string;
  /** Question label shown in the questionnaire. */
  label: string;
  /** Inline "/"-separated options, or null when the source is a pick-list name. */
  inlineOptions: string[] | null;
  /** Pick-list (questionnaire-header) description to resolve, or null when inline. */
  picklistName: string | null;
  /** Mandatory field (red asterisk). */
  required: boolean;
  /** Bare @@prompt@@ token — always a free-text fill-in (no option lookup). */
  freeText?: boolean;
}

// Ordered alternation: labelled {{…}} first, then bare @@prompt@@, then bare {{…}}.
// (The labelled form requires inner braces, so a brace-less @@…@@ falls through to
// the bare-prompt alternative.) Kept simple — no nested braces.
const TOKEN_SOURCE = String.raw`@@\s*([^{}@]*?)\s*\{\{\s*([^{}]*?)\s*\}\}\s*@@|@@\s*([^@]+?)\s*@@|\{\{\s*([^{}]*?)\s*\}\}`;

function newTokenRe(): RegExp {
  return new RegExp(TOKEN_SOURCE, 'g');
}

function splitInline(source: string): string[] {
  return source
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse a macro body into its ordered fillable fields (empty if none). */
export function parseMacroFields(content: string): MacroField[] {
  if (!content) return [];
  const fields: MacroField[] = [];
  const re = newTokenRe();
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(content)) !== null) {
    // m[1]+m[2] = labelled {{…}}; m[3] = bare @@prompt@@; m[4] = bare {{…}}.
    const isBarePrompt = m[3] != null;
    const labelRaw = (m[1] ?? '').trim();
    const sourceRaw = (isBarePrompt ? m[3]! : m[2] ?? m[4] ?? '').trim();
    if (!labelRaw && !sourceRaw) continue;
    const required = labelRaw.includes('*') || sourceRaw.includes('*');
    const source = sourceRaw.replace(/\*/g, '').trim();
    const label = (labelRaw.replace(/\*/g, '').trim() || source);
    if (isBarePrompt) {
      fields.push({ key: `f${i++}`, label, inlineOptions: null, picklistName: null, required, freeText: true });
      continue;
    }
    const inline = source.includes('/') ? splitInline(source) : null;
    fields.push({
      key: `f${i++}`,
      label,
      inlineOptions: inline,
      picklistName: inline ? null : source || null,
      required,
    });
  }
  return fields;
}

/** True when the macro has at least one fillable token. */
export function macroHasFields(content: string): boolean {
  return newTokenRe().test(content ?? '');
}

/**
 * Replace every token with its answer (by field key, in token order). Tokens
 * without an answer collapse to "". Surrounding literal text is preserved.
 */
export function substituteMacro(content: string, answers: Record<string, string>): string {
  let i = 0;
  return (content ?? '').replace(newTokenRe(), () => {
    const key = `f${i++}`;
    return answers[key] ?? '';
  });
}
