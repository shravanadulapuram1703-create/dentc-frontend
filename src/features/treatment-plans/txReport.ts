// Treatment Plan report (legacy M08 "Print / Preview" + "Save PDF file").
//
// There is no backend treatment-plan report/export endpoint (see PLAN-6), so the
// report is generated client-side with jsPDF. It mirrors the legacy printed
// layout: office header, patient/responsible-party/insurance block, then rows
// grouped by Tx Plan ID → Phase with per-phase and per-plan totals + Net Est Pat,
// followed by a disclosure and signature line.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { STATUS_LABEL, money, type TxRow, type TxStatus } from './txModel';

export const DISCLOSURES: Record<string, string> = {
  'Treatment Plan Disclosure':
    'This treatment plan is an estimate based on the information available at the time of ' +
    'preparation. Insurance estimates are not a guarantee of payment; the patient is responsible ' +
    'for any balance not paid by their insurance carrier. Fees are subject to change if treatment ' +
    'needs change. By signing below, the patient acknowledges they have reviewed and understand ' +
    'the proposed treatment and associated costs.',
  None: '',
};

export interface ReportOptions {
  tids: number[];
  phase: number | null; // null = all phases
  statuses: Set<TxStatus>;
  includeCompleted: boolean;
  disclosure: string;
  includeWithoutUcr: boolean;
  printAccountName: boolean;
  printRespPartyAddress: boolean;
}

export interface ReportHeader {
  officeName: string;
  officePhone: string;
  officeFax: string;
  patientName: string;
  patientId: number;
  dob: string;
  chartNo: string;
  address: string;
  respParty: string;
  primaryInsurance: string;
}

export function filterReportRows(rows: TxRow[], opts: ReportOptions): TxRow[] {
  return rows.filter(
    (r) =>
      opts.tids.includes(r.tid) &&
      (opts.phase == null || r.phase === opts.phase) &&
      opts.statuses.has(r.status) &&
      // "Include without UCR": when unchecked, drop procedures that have no
      // UCR/fee set (fee ≤ 0), matching the legacy report toggle.
      (opts.includeWithoutUcr || r.fee > 0),
  );
}

interface PhaseGroup {
  phase: number;
  rows: TxRow[];
}
interface PlanGroup {
  tid: number;
  phases: PhaseGroup[];
}

function group(rows: TxRow[]): PlanGroup[] {
  const byTid = new Map<number, Map<number, TxRow[]>>();
  for (const r of rows) {
    if (!byTid.has(r.tid)) byTid.set(r.tid, new Map());
    const phases = byTid.get(r.tid)!;
    if (!phases.has(r.phase)) phases.set(r.phase, []);
    phases.get(r.phase)!.push(r);
  }
  return [...byTid.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tid, phases]) => ({
      tid,
      phases: [...phases.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([phase, prs]) => ({ phase, rows: prs.sort((x, y) => x.order - y.order) })),
    }));
}

function sum(rows: TxRow[]) {
  return rows.reduce(
    (a, r) => ({ pat: a.pat + r.est_pat, ins: a.ins + r.est_ins, fee: a.fee + r.fee }),
    { pat: 0, ins: 0, fee: 0 },
  );
}

/** Build the report as a jsPDF document. */
export function buildTxPlanPdf(rows: TxRow[], header: ReportHeader, opts: ReportOptions): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 36;

  // ---- Office + title ----
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(header.officeName || 'Treatment Plan', pageW / 2, 40, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Treatment Plan', pageW / 2, 58, { align: 'center' });

  // ---- Patient / responsible party / insurance info box ----
  const info: [string, string][] = [
    [`Patient : ${header.patientName}`, `Pat ID : ${header.patientId}`],
    [`DOB : ${header.dob || '—'}`, `Office Phone # : ${header.officePhone || '—'}`],
    [`Chart # : ${header.chartNo || '—'}`, `Fax # : ${header.officeFax || '—'}`],
  ];
  if (opts.printAccountName) info.push([`Resp. Party : ${header.respParty}`, '']);
  if (opts.printRespPartyAddress) info.push([header.address || '', '']);
  info.push([`Primary Insurance : ${header.primaryInsurance || '—'}`, '']);

  autoTable(doc, {
    startY: 72,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, lineColor: [120, 120, 120], textColor: [20, 20, 20] },
    body: info,
    columnStyles: { 0: { cellWidth: (pageW - marginX * 2) / 2 } },
  });

  const grouped = group(rows);
  const head = [['Prov', 'Prop Dt', 'Th', 'Surf', 'Code', 'Description', 'Est Pat', 'Est Ins', 'Fee']];

  for (const plan of grouped) {
    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text(`Treatment Plan ${plan.tid}`, marginX, y);

    for (const ph of plan.phases) {
      const phTotal = sum(ph.rows);
      const body = ph.rows.map((r) => [
        r.provider_label,
        r.diag_date ? new Date(r.diag_date).toLocaleDateString('en-US') : '',
        r.tooth,
        r.surface,
        r.code,
        r.description,
        money(r.est_pat),
        money(r.est_ins),
        money(r.fee),
      ]);
      body.push([
        { content: `Total for Phase ${ph.phase}`, colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } } as unknown as string,
        money(phTotal.pat),
        money(phTotal.ins),
        money(phTotal.fee),
      ]);

      autoTable(doc, {
        startY: y + 6,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        head,
        body,
        headStyles: { fillColor: [219, 228, 234], textColor: [40, 40, 40], fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [180, 180, 180] },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 52 },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 42 },
          6: { halign: 'right', cellWidth: 52 },
          7: { halign: 'right', cellWidth: 52 },
          8: { halign: 'right', cellWidth: 52 },
        },
      });
      // Phase caption + Net Est Pat under the table
      const fy = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFont('helvetica', 'normal').setFontSize(7.5);
      doc.text(`Phase : ${ph.phase}   ·   Net Est Pat : ${money(phTotal.pat)}`, marginX, fy + 11);
      y = fy + 16;
    }

    const planTotal = sum(plan.phases.flatMap((p) => p.rows));
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text(
      `Total for Treatment Plan ${plan.tid} :   Est Pat ${money(planTotal.pat)}   ·   Est Ins ${money(planTotal.ins)}   ·   Fee ${money(planTotal.fee)}`,
      marginX,
      y + 4,
    );
    doc.text(`Net Est Pat : ${money(planTotal.pat)}`, marginX, y + 16);
  }

  // ---- Disclosure + signature ----
  let dy = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40;
  const pageH = doc.internal.pageSize.getHeight();
  if (dy > pageH - 120) {
    doc.addPage();
    dy = 60;
  }
  const disclosure = DISCLOSURES[opts.disclosure] ?? '';
  if (disclosure) {
    doc.setFont('helvetica', 'normal').setFontSize(8);
    const lines = doc.splitTextToSize(disclosure, pageW - marginX * 2);
    doc.text(lines, marginX, dy);
    dy += lines.length * 11 + 24;
  }
  doc.setFontSize(9);
  doc.line(marginX, dy, marginX + 220, dy);
  doc.text('Patient / Responsible Party Signature', marginX, dy + 12);
  doc.line(pageW - marginX - 140, dy, pageW - marginX, dy);
  doc.text('Date', pageW - marginX - 140, dy + 12);

  return doc;
}

/** Convenience: human label list of the included statuses (for the modal/title). */
export function statusSummary(statuses: Set<TxStatus>): string {
  return [...statuses].map((s) => STATUS_LABEL[s]).join(', ');
}
