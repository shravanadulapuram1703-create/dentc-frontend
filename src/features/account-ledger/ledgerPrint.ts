// Printed "Account / Patient Ledger" — the legacy ledger statement.
//
// Replaces window.print() (which printed the whole page: toolbar, pager,
// checkboxes and all) with a landscape report of the ledger itself: every
// transaction that matches the current scope / date range / type filter, in the
// current sort order, with the running balance and the grand total, followed by
// the BALANCES table and the CONTRACTS cards exactly as the bottom tabs show
// them. The whole filtered feed is printed — not just the page on screen.

import autoTable from 'jspdf-autotable';
import {
  openPatientPdf,
  officeHeader,
  sectionTitle,
  dataTable,
  ensureSpace,
  printPatientPdf,
  cell,
  type PdfRow,
} from '@/features/print/patientPdf';
import { dollars, type LedgerRow } from './accountLedgerModel';
import { BALANCE_COLS, aggregateBalances, fmtDay, type MemberBalance } from './ledgerBalances';
import { contractCards } from './ledgerContracts';
import type { PaymentPlans } from './accountLedgerService';
import type { OfficeRead } from '@/api/generated/model';
import type { BalancesResponse } from '@/services/ledgerApi';

export interface LedgerPrintInput {
  patient: { id: number; name: string; dob?: string; chart_no?: string };
  office: OfficeRead | null;
  office_name: string;
  scope_label: string;
  member_count: number;
  date_from: string | null;
  date_to: string | null;
  filter_label: string;
  sort_label: string;
  rows: LedgerRow[];
  grand_total: number;
  header_balance: number;
  truncated: boolean;
  member_balances: MemberBalance[];
  ledger_balance: Map<number, number>;
  plans: PaymentPlans;
}

const LEDGER_COLS = [
  'Date', 'Patient', 'Office', 'A', 'Code', 'TH', 'Surf', 'T', 'N',
  'Description', 'Bill', 'Provider', 'Est Pat', 'Est Ins', 'Amount', 'Balance', 'User',
];

export function printLedger(input: LedgerPrintInput): void {
  const { office } = input;
  const range =
    input.date_from || input.date_to
      ? `${fmtDay(input.date_from) === '—' ? 'Start' : fmtDay(input.date_from)} – ${
          fmtDay(input.date_to) === '—' ? 'Today' : fmtDay(input.date_to)
        }`
      : 'All dates';

  const pdf = openPatientPdf(
    {
      title: input.scope_label,
      ...officeHeader(office, input.office_name),
      patient_name: input.patient.name,
      patient_id: input.patient.id,
      chart_no: input.patient.chart_no,
      dob: input.patient.dob,
      extra: [
        [
          'Scope',
          `${input.scope_label}${input.member_count > 1 ? ` (${input.member_count} members)` : ''}`,
        ],
        ['Date Range', `${range}    Type: ${input.filter_label}    Sort: ${input.sort_label}`],
        ['Balance', dollars(input.header_balance)],
      ],
    },
    { orientation: 'landscape' },
  );

  // ---- Transactions ----------------------------------------------------------
  sectionTitle(pdf, `Transactions (${input.rows.length})`);
  if (input.truncated) {
    pdf.doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(146, 64, 14);
    pdf.doc.text(
      'Showing the first 500 transactions per patient — narrow the date range to see older activity.',
      pdf.margin,
      pdf.y + 8,
    );
    pdf.doc.setFont('helvetica', 'normal').setTextColor(0);
    pdf.y += 14;
  }
  const body: PdfRow[] = input.rows.map((r) => [
    r.date,
    r.patient,
    r.office,
    r.apply_to,
    r.code,
    r.tooth,
    r.surface,
    r.t,
    r.n,
    r.description,
    r.hold_claim ? 'H' : r.bill,
    r.provider,
    dollars(r.est_pat),
    dollars(r.est_ins),
    r.kind === 'claim' ? '-' : dollars(r.amount),
    dollars(r.balance),
    cell(r.user, ''),
  ]);
  dataTable(pdf, LEDGER_COLS, body, {
    center: [3, 5, 6, 7, 8, 10],
    right: [12, 13, 14, 15],
    widths: {
      0: 50, 1: 84, 2: 36, 3: 18, 4: 40, 5: 22, 6: 28, 7: 16, 8: 16, 10: 66,
      12: 46, 13: 46, 14: 52, 15: 54, 16: 50,
    },
    font_size: 7,
    empty: 'No transactions match the current filter.',
    foot: [
      { content: 'Total', colSpan: 14 },
      { content: dollars(input.grand_total), styles: { halign: 'right' } },
      '',
      '',
    ],
  });

  // ---- Balances --------------------------------------------------------------
  sectionTitle(pdf, 'Balances');
  const account = aggregateBalances(input.member_balances);
  const account_balance = input.member_balances.reduce(
    (s, r) => s + (input.ledger_balance.get(r.member.patient_id) ?? 0),
    0,
  );
  const balance_row = (label: string, b: BalancesResponse | null, balance: number): PdfRow =>
    b === null
      ? [label, { content: 'not loaded', colSpan: BALANCE_COLS.length - 1 }]
      : [
          label,
          dollars(b.aging.current),
          dollars(b.aging.age_30),
          dollars(b.aging.age_60),
          dollars(b.aging.age_90),
          dollars(b.aging.age_120),
          dollars(balance),
          dollars(b.estimated_insurance),
          dollars(b.estimated_patient),
          dollars(b.recent_activity.today_charges),
          dollars(b.recent_activity.today_payments),
          dollars(b.recent_activity.last_insurance_payment?.amount ?? 0),
          fmtDay(b.recent_activity.last_insurance_payment?.date),
          dollars(b.recent_activity.last_patient_payment?.amount ?? 0),
          fmtDay(b.recent_activity.last_patient_payment?.date),
        ];
  dataTable(
    pdf,
    [...BALANCE_COLS],
    [
      balance_row('Account Balance', account, account_balance).map((c, i) =>
        i === 0 && typeof c === 'string' ? { content: c, styles: { fontStyle: 'bold' } } : c,
      ),
      ...input.member_balances.map((r) =>
        balance_row(r.member.name, r.balances, input.ledger_balance.get(r.member.patient_id) ?? 0),
      ),
    ],
    {
      right: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      font_size: 6.5,
      empty: 'No balance data available.',
    },
  );

  // ---- Contracts — the three plan cards side by side, as on screen ----------
  // Keep the heading with its cards: reserve the room BEFORE drawing the bar.
  ensureSpace(pdf, 170);
  sectionTitle(pdf, 'Contracts');
  const cards = contractCards(input.plans);
  const gap = 12;
  const card_width = (pdf.width - gap * (cards.length - 1)) / cards.length;
  const top = pdf.y;
  let bottom = top;
  cards.forEach((card, i) => {
    const left = pdf.margin + i * (card_width + gap);
    pdf.doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(31, 58, 95);
    pdf.doc.text(card.title.toUpperCase(), left, top + 8);
    pdf.doc.setFont('helvetica', 'normal').setTextColor(0);
    autoTable(pdf.doc, {
      startY: top + 12,
      body: card.rows,
      theme: 'grid',
      tableWidth: card_width,
      margin: { left, right: pdf.margin },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [200, 206, 214], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: card_width * 0.55, fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] },
        1: { cellWidth: card_width * 0.45 },
      },
    });
    const final_y = (pdf.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    bottom = Math.max(bottom, final_y);
  });
  pdf.y = bottom + 10;

  printPatientPdf(pdf);
}
