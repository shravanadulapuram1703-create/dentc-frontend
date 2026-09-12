// Shared scaffolding for the patient-screen "Print" buttons.
//
// The legacy application printed each patient screen as a formatted report —
// never a browser screenshot of the UI. There is no backend report/render
// endpoint for any of these screens (see docs/print/patient_print_backend_devreport.md),
// so every print is generated client-side with jsPDF + autotable, the same way
// the Perio chart, Treatment Plan and Payment Plan reports already are.
//
// Each screen builds its own document from the data it already has on screen
// (patient details, grids, balances…) using the helpers below, then hands it to
// `printPatientPdf`, which stamps page numbers and opens the print dialog.

import jsPDF from 'jspdf';
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable';
import type { OfficeRead } from '@/api/generated/model';

export interface PatientPrintHeader {
  /** Report title printed top-right, e.g. "Patient Overview". */
  title: string;
  office_name: string;
  office_phone?: string | null;
  office_address?: string | null;
  patient_name: string;
  patient_id: number | string;
  chart_no?: string | null;
  dob?: string | null;
  /** Extra "Label: value" pairs shown under the patient line (scope, date range…). */
  extra?: Array<[string, string]>;
}

/**
 * Office block for the report header. Prefers the resolved letterhead the
 * backend publishes on `OfficeRead.letterhead` (PRINT-2 — Statement-tab logo /
 * correspondence name / address source), falling back to the office row.
 */
export function officeHeader(
  office: OfficeRead | null | undefined,
  fallback_name: string,
): Pick<PatientPrintHeader, 'office_name' | 'office_phone' | 'office_address'> {
  const src = office?.letterhead ?? office ?? null;
  if (!src) return { office_name: fallback_name, office_phone: null, office_address: null };
  const line1 = [src.address_line1, src.address_line2].filter(Boolean).join(', ');
  const line2 = [[src.city, src.state].filter(Boolean).join(', '), src.zip].filter(Boolean).join(' ');
  return {
    office_name: src.name || office?.name || fallback_name,
    office_phone: src.phone ?? office?.phone ?? office?.phone_2 ?? null,
    office_address: [line1, line2].filter(Boolean).join(' · ') || null,
  };
}

export interface PatientPdf {
  doc: jsPDF;
  /** Current cursor (pt from the top of the page). */
  y: number;
  margin: number;
  /** Usable width between the margins. */
  width: number;
  page_height: number;
}

export type PdfCell = string | CellDef;
export type PdfRow = PdfCell[];

const NAVY: [number, number, number] = [31, 58, 95];
const BLUE: [number, number, number] = [58, 110, 165];
const GRID_LINE: [number, number, number] = [200, 206, 214];

const last_y = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0;

/** Start a new document with the shared office / patient header block. */
export function openPatientPdf(
  header: PatientPrintHeader,
  opts: { orientation?: 'portrait' | 'landscape' } = {},
): PatientPdf {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: opts.orientation ?? 'portrait' });
  const margin = 36;
  const page_width = doc.internal.pageSize.getWidth();
  const page_height = doc.internal.pageSize.getHeight();
  const width = page_width - margin * 2;
  const right = page_width - margin;

  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0);
  doc.text(header.office_name || 'Dental Practice', margin, 44);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(80);
  let y = 58;
  if (header.office_address) {
    doc.text(header.office_address, margin, y);
    y += 12;
  }
  if (header.office_phone) {
    doc.text(header.office_phone, margin, y);
    y += 12;
  }

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(0);
  doc.text(header.title.toUpperCase(), right, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(80);
  doc.text(`Printed ${new Date().toLocaleString('en-US')}`, right, 58, { align: 'right' });
  doc.setTextColor(0);

  y = Math.max(y, 66);
  doc.setDrawColor(...NAVY).setLineWidth(1).line(margin, y, right, y);
  y += 14;

  doc.setFontSize(9);
  const id_parts = [`Patient: ${header.patient_name}`, `ID: ${header.patient_id}`];
  if (header.chart_no) id_parts.push(`Chart: ${header.chart_no}`);
  if (header.dob) id_parts.push(`DOB: ${header.dob}`);
  doc.text(id_parts.join('    '), margin, y);
  y += 13;
  for (const [label, value] of header.extra ?? []) {
    doc.text(`${label}: ${value}`, margin, y);
    y += 13;
  }

  return { doc, y: y + 4, margin, width, page_height };
}

/** Add a page when fewer than `needed` points remain below the cursor. */
export function ensureSpace(pdf: PatientPdf, needed: number): void {
  if (pdf.y + needed > pdf.page_height - 48) {
    pdf.doc.addPage();
    pdf.y = 48;
  }
}

/** Section heading — a navy bar with white uppercase text. */
export function sectionTitle(pdf: PatientPdf, title: string): void {
  ensureSpace(pdf, 60);
  const { doc, margin, width } = pdf;
  doc.setFillColor(...NAVY).rect(margin, pdf.y, width, 16, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(255);
  doc.text(title.toUpperCase(), margin + 6, pdf.y + 11);
  doc.setTextColor(0);
  pdf.y += 18;
}

/**
 * Label / value pairs. `rows` may hold two-column pairs ([label, value]) or
 * four-column pairs ([label, value, label, value]) — the legacy screens show
 * both, and the table keeps the on-screen row order.
 */
export function keyValueTable(pdf: PatientPdf, rows: Array<Array<string>>): void {
  if (rows.length === 0) return;
  const four = rows.some((r) => r.length > 2);
  const body: RowInput[] = rows.map((r) => {
    if (four && r.length === 2) {
      return [r[0] ?? '', { content: r[1] ?? '', colSpan: 3 } as CellDef];
    }
    return r.map((c) => c ?? '');
  });
  const label_width = four ? pdf.width * 0.17 : pdf.width * 0.3;
  const value_width = four ? pdf.width * 0.33 : pdf.width * 0.7;
  autoTable(pdf.doc, {
    startY: pdf.y,
    body,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, lineColor: GRID_LINE, lineWidth: 0.5, overflow: 'linebreak' },
    columnStyles: four
      ? {
          0: { cellWidth: label_width, fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] },
          1: { cellWidth: value_width },
          2: { cellWidth: label_width, fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] },
          3: { cellWidth: value_width },
        }
      : {
          0: { cellWidth: label_width, fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] },
          1: { cellWidth: value_width },
        },
    margin: { left: pdf.margin, right: pdf.margin },
  });
  pdf.y = last_y(pdf.doc) + 10;
}

export interface DataTableOptions {
  /** Column indexes to right-align (money / counts). */
  right?: number[];
  /** Column indexes to centre. */
  center?: number[];
  /** Fixed widths (pt) by column index; the rest share the remaining width. */
  widths?: Record<number, number>;
  /** Font size for head + body (defaults to 8). */
  font_size?: number;
  /** Optional bold footer row (totals). */
  foot?: PdfRow;
  /** Text to print in place of the table when `body` is empty. */
  empty?: string;
}

/** Column grid with a blue header row — one per on-screen DataGrid. */
export function dataTable(pdf: PatientPdf, head: string[], body: PdfRow[], opts: DataTableOptions = {}): void {
  if (body.length === 0) {
    ensureSpace(pdf, 24);
    pdf.doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(110);
    pdf.doc.text(opts.empty ?? 'No records.', pdf.margin + 2, pdf.y + 9);
    pdf.doc.setFont('helvetica', 'normal').setTextColor(0);
    pdf.y += 20;
    return;
  }
  const column_styles: Record<number, { halign?: 'right' | 'center'; cellWidth?: number }> = {};
  for (const i of opts.right ?? []) column_styles[i] = { ...column_styles[i], halign: 'right' };
  for (const i of opts.center ?? []) column_styles[i] = { ...column_styles[i], halign: 'center' };
  for (const [i, w] of Object.entries(opts.widths ?? {})) {
    column_styles[Number(i)] = { ...column_styles[Number(i)], cellWidth: w };
  }
  const font_size = opts.font_size ?? 8;
  autoTable(pdf.doc, {
    startY: pdf.y,
    head: [head],
    body,
    foot: opts.foot ? [opts.foot] : undefined,
    theme: 'grid',
    styles: { fontSize: font_size, cellPadding: 2.5, lineColor: GRID_LINE, lineWidth: 0.5, overflow: 'linebreak' },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: font_size - 0.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold' },
    columnStyles: column_styles,
    margin: { left: pdf.margin, right: pdf.margin },
  });
  pdf.y = last_y(pdf.doc) + 10;
}

/** A labelled block of wrapped text (notes, alerts). */
export function paragraph(
  pdf: PatientPdf,
  label: string,
  text: string,
  opts: { color?: [number, number, number] } = {},
): void {
  const { doc, margin, width } = pdf;
  const body = text.trim() || '-';
  doc.setFont('helvetica', 'normal').setFontSize(8.5);
  const lines: string[] = doc.splitTextToSize(body, width - 8);
  ensureSpace(pdf, 14 + lines.length * 10);
  if (label) {
    doc.setFont('helvetica', 'bold').setTextColor(71, 85, 105);
    doc.text(label, margin, pdf.y + 9);
    pdf.y += 13;
  }
  doc.setFont('helvetica', 'normal').setTextColor(...(opts.color ?? [0, 0, 0]));
  doc.text(lines, margin + 4, pdf.y + 8);
  doc.setTextColor(0);
  pdf.y += lines.length * 10 + 8;
}

/** Stamp "Page x of y" on every page, then open the browser print dialog. */
export function printPatientPdf(pdf: PatientPdf): void {
  const { doc } = pdf;
  const pages = doc.getNumberOfPages();
  const page_width = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(120);
    doc.text(`Page ${i} of ${pages}`, page_width - pdf.margin, pdf.page_height - 20, { align: 'right' });
    doc.setTextColor(0);
  }
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

/** Blank-safe cell text. */
export const cell = (v: string | number | null | undefined, dash = '-'): string =>
  v == null || String(v).trim() === '' ? dash : String(v);
