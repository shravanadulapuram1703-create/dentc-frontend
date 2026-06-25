// Prescription print (legacy M11 "Quick Print" / "Print").
//
// There is no backend prescription print/export endpoint, so each prescription
// is rendered client-side with jsPDF as a pad-style sheet ready for the
// provider's signature — one prescription per page, matching the legacy output.

import jsPDF from 'jspdf';
import { fmtRxDate } from './rxModel';
import type { RxRow } from './rxModel';

export interface RxPrintHeader {
  officeName: string;
  officeLine: string; // address / phone / fax on one line
  patientName: string;
  dob: string;
}

/** Resolve a provider_id to a printable provider name (DEA optional). */
export type ProviderResolver = (id: string | null | undefined) => string;

function drawSheet(
  doc: jsPDF,
  rx: RxRow,
  header: RxPrintHeader,
  providerName: (id: string | null | undefined) => string,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const x = 54;
  let y = 60;

  doc.setFont('helvetica', 'bold').setFontSize(15);
  doc.text(header.officeName || 'Prescription', pageW / 2, y, { align: 'center' });
  y += 16;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  if (header.officeLine) {
    doc.text(header.officeLine, pageW / 2, y, { align: 'center' });
    y += 14;
  }
  doc.setDrawColor(150).line(x, y, pageW - x, y);
  y += 24;

  // Patient + date
  doc.setFontSize(11);
  doc.text(`Patient: ${header.patientName}`, x, y);
  doc.text(`Date: ${fmtRxDate(rx.rx_date)}`, pageW - x, y, { align: 'right' });
  y += 16;
  if (header.dob) {
    doc.setFontSize(9).text(`DOB: ${header.dob}`, x, y);
    y += 18;
  } else {
    y += 4;
  }

  // Rx body
  doc.setFont('helvetica', 'bold').setFontSize(22);
  doc.text('℞', x, y); // ℞ symbol
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(rx.drug_name, x + 30, y);
  y += 24;

  doc.setFont('helvetica', 'normal').setFontSize(11);
  const lines: string[] = [];
  if (rx.dispense) lines.push(`Disp: ${rx.dispense}`);
  if (rx.sig) lines.push(`Sig: ${rx.sig}`);
  lines.push(`Refills: ${rx.refills ?? 0}`);
  if (rx.is_as_written) lines.push('Dispense As Written');
  for (const ln of lines) {
    doc.text(ln, x + 30, y);
    y += 18;
  }

  if (rx.notes) {
    y += 6;
    doc.setFont('helvetica', 'italic').setFontSize(10);
    const wrapped = doc.splitTextToSize(`Note: ${rx.notes}`, pageW - 2 * x - 30);
    doc.text(wrapped, x + 30, y);
    y += wrapped.length * 14;
  }

  // Signature line
  y += 60;
  doc.setDrawColor(120).line(x, y, x + 260, y);
  y += 14;
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(providerName(rx.provider_id) || 'Provider Signature', x, y);
}

/** Build a multi-prescription PDF (one sheet per Rx). */
export function buildRxPdf(
  rxs: RxRow[],
  header: RxPrintHeader,
  providerName: ProviderResolver,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  rxs.forEach((rx, i) => {
    if (i > 0) doc.addPage();
    drawSheet(doc, rx, header, providerName);
  });
  return doc;
}

/** Open the print dialog for the given prescriptions. */
export function printPrescriptions(
  rxs: RxRow[],
  header: RxPrintHeader,
  providerName: ProviderResolver,
): void {
  if (!rxs.length) return;
  const doc = buildRxPdf(rxs, header, providerName);
  doc.autoPrint();
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}
