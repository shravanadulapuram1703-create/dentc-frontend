// Letters — HTML → flowed-block parser.
//
// Template bodies are a deliberately small HTML subset carried over by the
// legacy migration. Across all 153 seeded templates the only tags that appear
// are: br, div, strong, u, span, ul, ol, li (attributes: class, style). Rather
// than pull in an HTML-to-canvas rasteriser just to print a letter, we parse
// that subset into ordered blocks of styled text runs, which both the on-screen
// preview and the jsPDF renderer consume. That keeps the printed PDF as real,
// selectable text instead of a screenshot.
//
// The two `class` values in the corpus are `dvfrom` (letterhead / return
// address) and `dvto` (recipient address). They are tagged on the block so the
// PDF can lay them out as address blocks and the "Envelope Printing" option can
// lift them onto a #10 envelope page.

export interface TextRun {
  text: string;
  bold: boolean;
  underline: boolean;
}

export type BlockKind = 'para' | 'item' | 'from' | 'to';

export interface LetterBlock {
  kind: BlockKind;
  runs: TextRun[];
  /** List bullet / number, already formatted ("•", "3."). */
  marker?: string;
  /** Nesting depth for list indentation. */
  indent: number;
}

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'TABLE', 'TR', 'H1', 'H2', 'H3']);

/** Collapse runs of whitespace but keep meaningful single spaces. */
function normalize(text: string): string {
  // DOMParser turns &nbsp; into U+00A0; jsPDF and the preview both want a
  // plain space, and an irregular-whitespace literal is a lint error here.
  return text.replace(/\u00A0/g, ' ').replace(/[\s]+/g, ' ');
}

export function parse_letter_html(html: string): LetterBlock[] {
  const doc = new DOMParser().parseFromString(
    `<div id="__root">${html ?? ''}</div>`,
    'text/html',
  );
  const root = doc.getElementById('__root');
  const blocks: LetterBlock[] = [];

  let runs: TextRun[] = [];
  let kind: BlockKind = 'para';
  let marker: string | undefined;
  let indent = 0;

  const flush = () => {
    // Keep genuinely empty lines — legacy letters use stacked <br/> for spacing.
    const text = runs.map((r) => r.text).join('');
    if (text.trim() === '' && runs.length === 0 && !marker) {
      blocks.push({ kind, runs: [], indent });
    } else {
      blocks.push({ kind, runs, marker, indent });
    }
    runs = [];
    marker = undefined;
  };

  const push_text = (text: string, bold: boolean, underline: boolean) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.bold === bold && last.underline === underline) {
      last.text += text;
    } else {
      runs.push({ text, bold, underline });
    }
  };

  const walk = (
    node: Node,
    bold: boolean,
    underline: boolean,
    ctx: { kind: BlockKind; indent: number },
  ) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        push_text(normalize(child.textContent ?? ''), bold, underline);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'BR') {
        flush();
        kind = ctx.kind;
        indent = ctx.indent;
        continue;
      }

      if (tag === 'UL' || tag === 'OL') {
        flush();
        const ordered = tag === 'OL';
        let n = 1;
        for (const li of Array.from(el.children)) {
          if (li.tagName.toUpperCase() !== 'LI') continue;
          kind = 'item';
          indent = ctx.indent + 1;
          marker = ordered ? `${n++}.` : '•';
          walk(li, bold, underline, { kind: 'item', indent: ctx.indent + 1 });
          flush();
        }
        kind = ctx.kind;
        indent = ctx.indent;
        marker = undefined;
        continue;
      }

      if (BLOCK_TAGS.has(tag)) {
        flush();
        const cls = (el.getAttribute('class') ?? '').toLowerCase();
        const next_kind: BlockKind =
          cls.includes('dvfrom') ? 'from' : cls.includes('dvto') ? 'to' : ctx.kind;
        kind = next_kind;
        indent = ctx.indent;
        walk(el, bold, underline, { kind: next_kind, indent: ctx.indent });
        flush();
        kind = ctx.kind;
        indent = ctx.indent;
        continue;
      }

      const next_bold = bold || tag === 'STRONG' || tag === 'B';
      const next_underline = underline || tag === 'U' || tag === 'INS';
      walk(el, next_bold, next_underline, ctx);
    }
  };

  if (root) walk(root, false, false, { kind: 'para', indent: 0 });
  flush();

  return trim_edges(blocks);
}

/** Drop leading/trailing blank blocks so the letter starts at the top margin. */
function trim_edges(blocks: LetterBlock[]): LetterBlock[] {
  const is_blank = (b: LetterBlock) =>
    !b.marker && b.runs.every((r) => r.text.trim() === '');
  let start = 0;
  let end = blocks.length;
  while (start < end && is_blank(blocks[start] as LetterBlock)) start += 1;
  while (end > start && is_blank(blocks[end - 1] as LetterBlock)) end -= 1;
  return blocks.slice(start, end);
}

/** Plain text of a block, for measuring and for the envelope extractor. */
export function block_text(b: LetterBlock): string {
  return b.runs.map((r) => r.text).join('').trim();
}

/**
 * Pull the `dvfrom` (return address) and `dvto` (recipient) blocks out of a
 * parsed letter. Used by "Envelope Printing"; when a template has no address
 * divs the caller falls back to the merge context.
 */
export function extract_addresses(blocks: LetterBlock[]): {
  from: string[];
  to: string[];
} {
  const pick = (kind: BlockKind) =>
    blocks
      .filter((b) => b.kind === kind)
      .map(block_text)
      .filter((t) => t.length > 0);
  return { from: pick('from'), to: pick('to') };
}

/**
 * Re-serialise parsed blocks to sanitised HTML for the on-screen preview.
 * The preview never renders the raw template body: the body is merged first
 * (values escaped) and then rebuilt from this whitelisted structure, so a
 * template row can never inject script or remote content into the app.
 */
export function blocks_to_html(blocks: LetterBlock[]): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return blocks
    .map((b) => {
      const inner =
        b.runs
          .map((r) => {
            let t = esc(r.text) || '';
            if (r.bold) t = `<strong>${t}</strong>`;
            if (r.underline) t = `<u>${t}</u>`;
            return t;
          })
          .join('') || '&nbsp;';
      const cls =
        b.kind === 'from'
          ? 'ltr-from'
          : b.kind === 'to'
            ? 'ltr-to'
            : b.kind === 'item'
              ? 'ltr-item'
              : 'ltr-para';
      const marker = b.marker ? `<span class="ltr-marker">${esc(b.marker)}</span>` : '';
      const pad = b.indent ? ` style="padding-left:${b.indent * 18}px"` : '';
      return `<div class="${cls}"${pad}>${marker}${inner}</div>`;
    })
    .join('');
}
