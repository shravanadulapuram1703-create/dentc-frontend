// Progress-note body normalisation — turns whatever the backend holds in
// `notes` / `notes_html` into safe, readable HTML (and plain text) for display.
//
// Why this exists: the legacy Denticon import stored `notes_html` with every
// `&` replaced by the token `~^^~`, on top of the HTML already being
// entity-escaped once. A typical row therefore reads
//   ~^^~lt;p~^^~gt;Lips: Normal~^^~lt;/p~^^~gt;
// which is `&lt;p&gt;Lips: Normal&lt;/p&gt;` → `<p>Lips: Normal</p>`. In the
// 2,000-row sample audited on 2026-09-10, 1,932 of 1,980 legacy rows (98%) are
// encoded this way. The plain `notes` column is not a safe fallback either:
// ~40% of legacy rows have a literal `?` where a non-breaking space used to be
// and ~20% lost their line breaks entirely (see PN-12 in
// docs/progress-notes/progress_notes_backend_devreport.md). Decoding
// `notes_html` recovers the original paragraphs, so it is the preferred source.
//
// Notes written through this app store real HTML (`<br>`, colour `<span>`s) in
// `notes_html`, which passes through untouched apart from sanitising.

import type { ProgressNoteRead } from '@/api/generated/model';

const LEGACY_AMP_TOKEN = '~^^~';

/** Tags the rich-text body is allowed to contain; everything else is unwrapped. */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'div',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'font',
  'ul',
  'ol',
  'li',
  'sub',
  'sup',
]);

/** Only inline colour styling survives sanitising (the editor's text-colour toolbar). */
const STYLE_ALLOWED = /^\s*(color|background-color|font-weight|font-style|text-decoration)\s*:\s*[#\w(),.\s%-]+;?\s*$/i;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r\n?|\n/g, '<br>');
}

/** True when the value carries the legacy `~^^~` (= `&`) import encoding. */
export function hasLegacyEncoding(value?: string | null): boolean {
  return !!value && value.includes(LEGACY_AMP_TOKEN);
}

/**
 * Undo the legacy import encoding: `~^^~` → `&`, then ONE level of entity
 * decoding so `&lt;p&gt;` becomes a real `<p>` while `&amp;nbsp;` correctly
 * collapses to the `&nbsp;` entity (a single regex pass cannot double-decode).
 * Values without the token are returned unchanged.
 */
export function decodeLegacyMarkup(value: string): string {
  if (!value.includes(LEGACY_AMP_TOKEN)) return value;
  return value
    .split(LEGACY_AMP_TOKEN)
    .join('&')
    .replace(/&(lt|gt|amp|quot|#39|#34);/g, (_, ent: string) => {
      switch (ent) {
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'amp':
          return '&';
        case 'quot':
        case '#34':
          return '"';
        default:
          return "'";
      }
    });
}

/** Restorative freehand drawings are persisted as progress notes whose body is stroke JSON. */
export function isDrawingNote(n: Pick<ProgressNoteRead, 'notes_html'>): boolean {
  const h = n.notes_html?.trim();
  if (!h || !h.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(h) as { type?: unknown };
    return parsed?.type === 'rx-draw';
  } catch {
    return false;
  }
}

function isEmptyBlock(el: Element): boolean {
  if (el.querySelector('br')) return false;
  return (el.textContent ?? '').replace(/\u00a0/g, ' ').trim() === '';
}

/**
 * Allow-list sanitiser for note HTML (the list renders it with
 * dangerouslySetInnerHTML). Unknown elements are unwrapped rather than dropped
 * so no clinical text is lost; scripts/styles/comments are removed outright.
 * Also tidies the legacy import artefacts: doubly-nested `<p><p>` wrappers,
 * whitespace-only text between blocks (the raw value has `\r\n` between
 * paragraphs) and trailing empty paragraphs.
 */
export function sanitizeNoteHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return escapeHtml(html);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.body;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        // Whitespace-only text directly between block elements is layout noise.
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (child.textContent ?? '').trim() === '' &&
          (child.previousSibling?.nodeName === 'P' || child.nextSibling?.nodeName === 'P')
        ) {
          child.remove();
        }
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
        el.remove();
        continue;
      }
      walk(el);
      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: keep the children, drop the element.
        const frag = doc.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.replaceWith(frag);
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const keep =
          (name === 'style' && STYLE_ALLOWED.test(attr.value)) ||
          (name === 'color' && tag === 'font' && /^[#\w(),\s]+$/.test(attr.value));
        if (!keep) el.removeAttribute(attr.name);
      }
      // Legacy import sometimes wrapped each paragraph twice (<p><p>text</p></p>);
      // the parser auto-closes those into stray `<p></p>` pairs. Drop paragraphs
      // with no content at all, but keep deliberate `<p>&nbsp;</p>` spacers.
      if (tag === 'p' && !el.querySelector('br') && (el.textContent ?? '') === '') {
        el.remove();
      }
    }
  };
  walk(body);

  // Trailing whitespace / empty paragraphs (legacy rows end with <p>&nbsp;</p>).
  for (;;) {
    const last = body.lastChild;
    if (!last) break;
    if (last.nodeType === Node.TEXT_NODE && (last.textContent ?? '').trim() === '') {
      last.remove();
      continue;
    }
    if (last.nodeType === Node.ELEMENT_NODE && (last as Element).tagName === 'P' && isEmptyBlock(last as Element)) {
      last.remove();
      continue;
    }
    break;
  }
  return body.innerHTML;
}

/** Raw (decoded but unsanitised) HTML the note should render as, or '' when empty. */
function rawNoteHtml(n: Pick<ProgressNoteRead, 'notes' | 'notes_html'>): string {
  if (isDrawingNote(n)) return textToHtml(n.notes ?? '');
  const html = n.notes_html?.trim();
  if (html) return decodeLegacyMarkup(html);
  const text = n.notes ?? '';
  // A handful of legacy rows carry the encoded markup in the plain column too.
  return hasLegacyEncoding(text) ? decodeLegacyMarkup(text) : textToHtml(text);
}

/** Safe HTML for the list row / editor body. */
export function noteDisplayHtml(n: Pick<ProgressNoteRead, 'notes' | 'notes_html'>): string {
  return sanitizeNoteHtml(rawNoteHtml(n));
}

/**
 * Plain text for search and text-only surfaces (timeline, previews). Derived
 * from the decoded HTML so legacy rows keep their line breaks and lose the
 * `?` mojibake that the plain column carries.
 */
export function noteDisplayText(n: Pick<ProgressNoteRead, 'notes' | 'notes_html'>): string {
  const html = rawNoteHtml(n);
  if (typeof DOMParser === 'undefined') return n.notes ?? '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  for (const el of Array.from(doc.body.querySelectorAll('script,style'))) el.remove();
  for (const br of Array.from(doc.body.querySelectorAll('br'))) br.replaceWith('\n');
  for (const block of Array.from(doc.body.querySelectorAll('p,div,li'))) block.append('\n');
  return (doc.body.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
