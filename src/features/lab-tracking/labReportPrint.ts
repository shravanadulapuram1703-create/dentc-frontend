// Lab Tracking reports (legacy M12 — "Lab Report" and "Lab Cost Report").
//
// The server renders these (`GET /appointments/lab-cases/report.pdf`,
// `…/cost-report.pdf`, LAB-4); these jsPDF + autotable builders are the
// offline fallback used by openServerReport when the route is unreachable. The
// page is patient-scoped, so the patient name lives in the header and the rows
// drop the per-row patient column the office-wide legacy report carried.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtDate, fmtTime, STATUS_META, statusOf, type LabCase } from './labModel';

export interface LabReportHeader {
  officeName: string;
  patientName: string;
  patientId: string;
  chartNo?: string;
  dob?: string;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function drawHeader(doc: jsPDF, header: LabReportHeader, title: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(header.officeName || 'Lab Tracking', pageW / 2, 40, { align: 'center' });
  doc.setFontSize(12);
  doc.text(title, pageW / 2, 58, { align: 'center' });

  const marginX = 36;
  autoTable(doc, {
    startY: 70,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, lineColor: [120, 120, 120] },
    body: [
      [`Patient : ${header.patientName}`, `Pat ID : ${header.patientId}`],
      [`Chart # : ${header.chartNo || '—'}`, `DOB : ${header.dob || '—'}`],
    ],
    columnStyles: { 0: { cellWidth: (pageW - marginX * 2) / 2 } },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Lab Report — case breakdown with the lifecycle dates and status. */
export function printLabReport(cases: LabCase[], header: LabReportHeader): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const marginX = 36;
  const startY = drawHeader(doc, header, 'Lab Cases Report') + 14;

  const body = cases.map((c) => [
    fmtDate(c.date),
    fmtTime(c.start_time),
    c.provider_name || '—',
    c.procedure_label || '—',
    c.lab_vendor_name || '—',
    fmtDate(c.lab_sent_on),
    fmtDate(c.lab_due_on),
    fmtDate(c.lab_received_on),
    STATUS_META[statusOf(c)].label,
    money(c.lab_cost),
  ]);
  const total = cases.reduce((s, c) => s + c.lab_cost, 0);
  body.push([
    { content: 'Total', colSpan: 9, styles: { fontStyle: 'bold', halign: 'right' } } as unknown as string,
    money(total),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    head: [['Appt Date', 'Time', 'Provider', 'Description', 'Lab', 'Sent', 'Due', 'Recvd', 'Status', 'Charges']],
    body,
    headStyles: { fillColor: [219, 228, 234], textColor: [40, 40, 40], fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [180, 180, 180] },
    columnStyles: { 9: { halign: 'right' } },
  });

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

/** Lab Cost Report — same cases focused on the cost total (legacy M12 #4). */
export function printLabCostReport(cases: LabCase[], header: LabReportHeader): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const marginX = 36;
  const startY = drawHeader(doc, header, 'Lab Cost Report') + 14;

  const body = cases.map((c) => [
    fmtDate(c.date),
    c.provider_name || '—',
    c.procedure_label || '—',
    c.lab_vendor_name || '—',
    fmtDate(c.lab_sent_on),
    fmtDate(c.lab_due_on),
    fmtDate(c.lab_received_on),
    money(c.lab_cost),
  ]);
  const total = cases.reduce((s, c) => s + c.lab_cost, 0);
  body.push([
    { content: 'Total Lab Cost', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' } } as unknown as string,
    money(total),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    head: [['Appt Date', 'Provider', 'Description', 'Lab', 'Lab Sent', 'Lab Due', 'Lab Recvd', 'Charges']],
    body,
    headStyles: { fillColor: [219, 228, 234], textColor: [40, 40, 40], fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [180, 180, 180] },
    columnStyles: { 7: { halign: 'right' } },
  });

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
