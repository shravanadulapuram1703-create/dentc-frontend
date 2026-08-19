// Letters — PDF renderer (legacy "Print / Preview" → Report Viewer → "Save PDF file").
//
// There is no backend letter render/export endpoint (gap LTR-5), so the PDF is
// produced client-side from the parsed template blocks. Text is drawn with
// jsPDF's text primitives rather than rasterised, so the output stays
// selectable, searchable and small (a 9 KB consent form instead of a 2 MB
// screenshot).
//
// Output shape, matching the legacy printout:
//   [envelope page]   only when "Envelope Printing" is ticked
//   letter body       flowed from the template blocks, bold/underline/lists kept
//   signature block   consent forms only, driven by the Signature Type dropdown
//   footer            patient · office · Page N of M on every page

import jsPDF from 'jspdf';
import { block_text, extract_addresses, type LetterBlock, type TextRun } from './letterHtml';
import { signature_line, type SignatureType } from './lettersModel';

/** 8.5in × 11in in points. */
const MARGIN = 54;
const FONT_SIZE = 10;
const LINE_H = 13.5;
const BLOCK_GAP = 3;
/** #10 envelope, landscape, in points (9.5in × 4.125in). */
const ENVELOPE: [number, number] = [684, 297];

export interface LetterPdfHeader {
  patient_name: string;
  patient_id: number;
  office_name: string;
  /** ISO date the letter was generated. */
  printed_on: string;
  /** Letter/template name, used as the PDF title + footer label. */
  letter_name: string;
}

export interface LetterPdfOptions {
  envelope_printing: boolean;
  /** Consent forms print signature lines; plain letters do not. */
  is_consent: boolean;
  signature_type: SignatureType;
  signer_name: string;
  /** Fallbacks when the template has no dvfrom/dvto address divs. */
  fallback_from: string[];
  fallback_to: string[];
}

interface Word {
  text: string;
  bold: boolean;
  underline: boolean;
  width: number;
}

/**
 * jsPDF's built-in Helvetica is a WinAnsi standard font: characters outside
 * that encoding come out as mojibake in the printed PDF. The seeded templates
 * are full of typographic punctuation (&ldquo;/&rdquo;/&mdash;/&nbsp;), so every
 * string is folded to its ASCII equivalent before it is drawn. The on-screen
 * preview keeps the real characters — only the PDF needs this.
 */
const PDF_CHAR_MAP: Record<string, string> = {
  ['\u2018']: '\'',
  ['\u2019']: '\'',
  ['\u201A']: ',',
  ['\u201B']: '\'',
  ['\u201C']: '"',
  ['\u201D']: '"',
  ['\u201E']: '"',
  ['\u201F']: '"',
  ['\u2013']: '-',
  ['\u2014']: '-',
  ['\u2015']: '-',
  ['\u2212']: '-',
  ['\u2022']: '-',
  ['\u00B7']: '-',
  ['\u2026']: '...',
  ['\u00A0']: ' ',
  ['\u2032']: '\'',
  ['\u2033']: '"',
  ['\u00AD']: '-',
};

export function pdf_safe(text: string): string {
  let out = '';
  for (const ch of text) {
    const mapped = PDF_CHAR_MAP[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    // Anything still outside Latin-1 would render as a blank box; a question
    // mark makes the substitution visible instead of silently dropping text.
    out += ch.codePointAt(0)! <= 0xff ? ch : '?';
  }
  return out;
}

function set_font(doc: jsPDF, bold: boolean) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
}

function measure(doc: jsPDF, text: string, bold: boolean): number {
  set_font(doc, bold);
  return doc.getTextWidth(text);
}

/** Split styled runs into measurable words, preserving inter-word spaces. */
function to_words(doc: jsPDF, runs: TextRun[]): Word[] {
  const words: Word[] = [];
  for (const run of runs) {
    for (const piece of run.text.split(/(\s+)/)) {
      if (piece === '') continue;
      words.push({
        text: piece,
        bold: run.bold,
        underline: run.underline,
        width: measure(doc, pdf_safe(piece), run.bold),
      });
    }
  }
  return words;
}

/**
 * Draw one block of styled text, wrapping at `max_width` and paginating via
 * `ensure_space`. Returns the y cursor after the block.
 */
function draw_block(
  doc: jsPDF,
  words: Word[],
  x: number,
  y: number,
  max_width: number,
  ensure_space: (y: number) => number,
): number {
  if (words.length === 0) return y + LINE_H;

  let line: Word[] = [];
  let line_width = 0;
  let cursor_y = y;

  const flush_line = () => {
    // Trailing spaces never print, and would push the underline past the text.
    while (line.length && (line[line.length - 1] as Word).text.trim() === '') line.pop();
    if (line.length === 0) {
      cursor_y += LINE_H;
      return;
    }
    cursor_y = ensure_space(cursor_y);
    let cursor_x = x;
    for (const w of line) {
      set_font(doc, w.bold);
      doc.text(pdf_safe(w.text), cursor_x, cursor_y);
      if (w.underline && w.text.trim() !== '') {
        doc.setLineWidth(0.5);
        doc.line(cursor_x, cursor_y + 1.5, cursor_x + w.width, cursor_y + 1.5);
      }
      cursor_x += w.width;
    }
    cursor_y += LINE_H;
    line = [];
    line_width = 0;
  };

  for (const w of words) {
    const is_space = w.text.trim() === '';
    // A leading space on a fresh line is dropped, not carried over.
    if (line.length === 0 && is_space) continue;
    if (line_width + w.width > max_width && line.length > 0) {
      flush_line();
      // The word that forced the wrap can itself be the inter-word space; it
      // must not reappear as an indent at the start of the new line.
      if (is_space) continue;
    }
    line.push(w);
    line_width += w.width;
  }
  flush_line();
  return cursor_y;
}

function draw_envelope(doc: jsPDF, from: string[], to: string[]) {
  doc.setFontSize(9).setFont('helvetica', 'normal');
  let y = 46;
  for (const l of from.slice(0, 6)) {
    doc.text(pdf_safe(l), 46, y);
    y += 12;
  }
  doc.setFontSize(12);
  y = 150;
  for (const l of to.slice(0, 6)) {
    doc.text(pdf_safe(l), 300, y);
    y += 16;
  }
}

/**
 * Build the letter PDF. Returns the jsPDF document so the caller can preview it
 * (`output('bloburl')`), download it, or upload the blob to patient documents.
 */
export function build_letter_pdf(
  blocks: LetterBlock[],
  header: LetterPdfHeader,
  opts: LetterPdfOptions,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  doc.setProperties({
    title: `${header.letter_name} — ${header.patient_name}`,
    subject: header.letter_name,
    creator: 'DentC',
  });

  // --- Optional envelope page ---------------------------------------------
  if (opts.envelope_printing) {
    const addr = extract_addresses(blocks);
    const from = addr.from.length ? addr.from : opts.fallback_from;
    const to = addr.to.length ? addr.to : opts.fallback_to;
    doc.deletePage(1);
    doc.addPage(ENVELOPE, 'landscape');
    draw_envelope(doc, from, to);
    doc.addPage('letter', 'portrait');
  }

  const page_w = doc.internal.pageSize.getWidth();
  const page_h = doc.internal.pageSize.getHeight();
  const max_width = page_w - MARGIN * 2;
  const bottom = page_h - MARGIN - 18;

  doc.setFontSize(FONT_SIZE);

  const ensure_space = (y: number): number => {
    if (y <= bottom) return y;
    doc.addPage('letter', 'portrait');
    doc.setFontSize(FONT_SIZE);
    return MARGIN + LINE_H;
  };

  let y = MARGIN + LINE_H;

  for (const b of blocks) {
    const indent = MARGIN + b.indent * 18;
    if (b.marker) {
      y = ensure_space(y);
      set_font(doc, false);
      doc.text(pdf_safe(b.marker), indent - 14, y);
    }
    const words = to_words(doc, b.runs);
    if (words.length === 0 && !b.marker) {
      y += LINE_H * 0.7; // blank spacer line
      continue;
    }
    y = draw_block(doc, words, indent, y, max_width - b.indent * 18, ensure_space);
    y += BLOCK_GAP;
  }

  // --- Signature block (consent forms) -------------------------------------
  if (opts.is_consent) {
    y = ensure_space(y + 18);
    if (y + 96 > bottom) {
      doc.addPage('letter', 'portrait');
      doc.setFontSize(FONT_SIZE);
      y = MARGIN + LINE_H;
    }
    y = draw_signature_block(doc, y, MARGIN, max_width, opts, header);
  }

  stamp_footers(doc, header, opts.envelope_printing);
  return doc;
}

function draw_signature_block(
  doc: jsPDF,
  y0: number,
  x: number,
  width: number,
  opts: LetterPdfOptions,
  header: LetterPdfHeader,
): number {
  let y = y0;
  doc.setDrawColor(120).setLineWidth(0.5);
  doc.line(x, y, x + width, y);
  y += 22;

  const half = width * 0.62;
  const rule = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(pdf_safe(label), x, y);
    doc.line(x + 118, y + 2, x + half, y + 2);
    if (value) {
      doc.setFontSize(10).text(pdf_safe(value), x + 122, y);
      doc.setFontSize(9);
    }
    doc.text('Date', x + half + 24, y);
    doc.line(x + half + 52, y + 2, x + width, y + 2);
    y += 30;
  };

  rule('Patient / Guardian', '');
  doc.setFontSize(8).setTextColor(110);
  doc.text(pdf_safe(`Print name: ${header.patient_name}`), x + 122, y - 20);
  doc.setTextColor(0);

  const line = signature_line(opts.signature_type);
  if (line) {
    rule(line, '');
    if (opts.signer_name) {
      doc.setFontSize(8).setTextColor(110);
      doc.text(pdf_safe(`Print name: ${opts.signer_name}`), x + 122, y - 20);
      doc.setTextColor(0);
    }
  }
  doc.setFontSize(FONT_SIZE);
  return y;
}

function stamp_footers(doc: jsPDF, header: LetterPdfHeader, has_envelope: boolean) {
  const total = doc.getNumberOfPages();
  const first = has_envelope ? 2 : 1;
  for (let p = first; p <= total; p += 1) {
    doc.setPage(p);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(120);
    const left = [header.office_name, header.patient_name, `ID ${header.patient_id}`]
      .filter(Boolean)
      .join('  -  ');
    doc.text(pdf_safe(left), MARGIN, h - 28);
    doc.text(
      pdf_safe(
        `${header.letter_name}  -  ${header.printed_on}  -  Page ${p - first + 1} of ${total - first + 1}`,
      ),
      w - MARGIN,
      h - 28,
      { align: 'right' },
    );
    doc.setTextColor(0);
  }
}

/** Plain-text rendering of the letter, stored alongside the consent record. */
export function blocks_to_text(blocks: LetterBlock[]): string {
  return blocks
    .map((b) => `${b.marker ? `${b.marker} ` : ''}${'  '.repeat(b.indent)}${block_text(b)}`)
    .join('\n');
}
