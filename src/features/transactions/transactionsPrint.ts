// Printed "Transactions Entry" — the day's check-out sheet for one patient.
//
// Replaces window.print() (which printed the whole browser page, toolbar and
// entry tabs included) with a structured report: the Patient Dashboard block
// (responsible party balance, insurance, today's charge split) followed by the
// transaction grid for the selected date and its totals.

import {
  openPatientPdf,
  officeHeader,
  sectionTitle,
  keyValueTable,
  dataTable,
  printPatientPdf,
  cell,
} from '@/features/print/patientPdf';
import { money, num } from './transactionsModel';
import type { EntryRow } from './transactionsModel';
import type { InsuranceSummary, InsuranceSummaryEntry } from './transactionsService';
import type { PatientBalance, OfficeRead } from '@/api/generated/model';

export interface TransactionsPrintInput {
  patient: { id: number; name: string; dob?: string; chart_no?: string };
  office: OfficeRead | null;
  office_name: string;
  /** Applied transaction date as shown in the toolbar (MM/DD/YYYY). */
  transaction_date: string;
  balance: PatientBalance | null;
  insurance: InsuranceSummary;
  rows: EntryRow[];
  today_charges: number;
  today_est_ins: number;
  /** Deductible applied to the day's charges (`/day-totals`, PRINT-6). */
  today_est_ded: number;
  today_est_pat: number;
}

const carrier_line = (entry: InsuranceSummaryEntry | null): string => {
  if (!entry) return 'None on file';
  const parts = [entry.carrier_name];
  if (entry.plan_type) parts.push(entry.plan_type);
  if (entry.max_remaining != null) parts.push(`Max Rem ${money(num(entry.max_remaining))}`);
  return parts.join(' · ');
};

export function printTransactionsEntry(input: TransactionsPrintInput): void {
  const { office } = input;
  const pdf = openPatientPdf(
    {
      title: 'Transactions Entry',
      ...officeHeader(office, input.office_name),
      patient_name: input.patient.name,
      patient_id: input.patient.id,
      chart_no: input.patient.chart_no,
      dob: input.patient.dob,
      extra: [['Transaction Date', input.transaction_date]],
    },
    { orientation: 'landscape' },
  );

  // ---- Patient Dashboard (check-out review block) ----------------------------
  sectionTitle(pdf, 'Patient Dashboard');
  const b = input.balance;
  keyValueTable(pdf, [
    ['Responsible', input.patient.name, "Today's Total Charges", money(input.today_charges)],
    ['RP BD', cell(input.patient.dob, '—'), "Today's Est Ded", money(input.today_est_ded)],
    ['Balance', money(b?.balance), "Today's Est Ins Portion", money(input.today_est_ins)],
    [
      'Est Ins',
      money(b?.estimated_insurance),
      "Today's Est Pat Portion",
      money(input.today_est_pat),
    ],
    ['Est Pat', money(b?.estimated_patient), 'Prim. Ins', carrier_line(input.insurance.primary)],
    ['', '', 'Sec. Ins', carrier_line(input.insurance.secondary)],
  ]);

  // ---- Transactions for the date ---------------------------------------------
  sectionTitle(pdf, `Transactions — ${input.transaction_date}`);
  const total_amount = input.rows.reduce((s, r) => s + r.amount, 0);
  const total_est_pat = input.rows.reduce((s, r) => s + r.est_pat, 0);
  const total_est_ins = input.rows.reduce((s, r) => s + r.est_ins, 0);
  dataTable(
    pdf,
    ['Pm', 'Date', 'Patient', 'Office', 'A', 'Code', 'Th', 'Surf', 'Description', 'Bill', 'Provider', 'Est Pat', 'Est Ins', 'Amount'],
    input.rows.map((r) => [
      // Standard PDF fonts have no check-mark glyph, so the Pm tick prints as Y.
      r.pm ? 'Y' : '',
      r.date,
      r.patient,
      r.office,
      r.apply_to,
      r.code,
      r.tooth,
      r.surface,
      r.description,
      r.bill,
      r.provider,
      r.est_pat ? money(r.est_pat) : '',
      r.est_ins ? money(r.est_ins) : '',
      money(r.amount),
    ]),
    {
      center: [0, 4, 6, 7],
      right: [11, 12, 13],
      widths: { 0: 22, 1: 58, 4: 50, 5: 46, 6: 26, 7: 34, 9: 50, 11: 54, 12: 54, 13: 58 },
      font_size: 7.5,
      empty: 'No records to display.',
      foot: [
        { content: `Total (${input.rows.length} transaction${input.rows.length === 1 ? '' : 's'})`, colSpan: 11 },
        { content: money(total_est_pat), styles: { halign: 'right' } },
        { content: money(total_est_ins), styles: { halign: 'right' } },
        { content: money(total_amount), styles: { halign: 'right' } },
      ],
    },
  );

  printPatientPdf(pdf);
}
