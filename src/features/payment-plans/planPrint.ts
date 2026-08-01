// Contract + coupon printing for the payment-plan screens.
//
// The backend has no contract/coupon report endpoint (gap PP-10), so both
// documents are generated client-side with jsPDF, mirroring the legacy printed
// layouts: a Truth-in-Lending style disclosure box for the contract and a
// three-per-page tear-off strip for the coupons.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmt_date, money, interval_label, type ScheduleRow } from "./planModel";

export const DISCLOSURES: Record<string, string> = {
  "Treatment Plan Disclosure":
    "This agreement is an estimate based on the treatment plan and insurance information available " +
    "at the time of preparation. Insurance estimates are not a guarantee of payment; the patient or " +
    "responsible party remains responsible for any balance the carrier does not pay. Fees may change " +
    "if treatment needs change. By signing below the responsible party agrees to the payment schedule " +
    "set out in this contract.",
  "Ortho Contract Disclosure":
    "Orthodontic fees cover the full course of active treatment and retention as described above. " +
    "Periodic charges are posted on the schedule shown; missed or cancelled visits do not reduce the " +
    "contracted fee. If treatment is discontinued, fees are pro-rated to the work completed to date. " +
    "The responsible party agrees to the payment schedule set out in this contract.",
  None: "",
};

export interface ContractHeader {
  office_name: string;
  office_phone: string;
  patient_name: string;
  patient_id: number;
  chart_no: string;
  dob: string;
  responsible_party: string;
}

export interface ContractTerms {
  title: string;
  /** Left column of the "worksheet" box — label / value pairs. */
  worksheet: Array<[string, string]>;
  /** Truth-in-Lending style figures. */
  disclosure_box: Array<[string, string, string]>;
  interval: string;
  num_payments: number;
  periodic_amt: number;
  first_due_date: string;
  disclosure_key: string;
  notes?: string;
}

function header_block(doc: jsPDF, h: ContractHeader, title: string): number {
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(h.office_name || "Dental Practice", 40, 44);
  doc.setFont("helvetica", "normal").setFontSize(9);
  if (h.office_phone) doc.text(h.office_phone, 40, 58);

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(title.toUpperCase(), 555, 44, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Printed ${fmt_date(new Date().toISOString().slice(0, 10))}`, 555, 58, { align: "right" });

  doc.setDrawColor(31, 58, 95).setLineWidth(1).line(40, 66, 555, 66);

  doc.setFontSize(9);
  const lines = [
    `Patient: ${h.patient_name}    PGID: ${h.patient_id}${h.chart_no ? `    Chart: ${h.chart_no}` : ""}`,
    `Date of Birth: ${h.dob || "-"}    Responsible Party: ${h.responsible_party || h.patient_name}`,
  ];
  let y = 82;
  for (const line of lines) {
    doc.text(line, 40, y);
    y += 13;
  }
  return y + 6;
}

function signature_block(doc: jsPDF, y: number, disclosure_key: string): void {
  const text = DISCLOSURES[disclosure_key] ?? "";
  let cursor = y;
  if (text) {
    doc.setFont("helvetica", "normal").setFontSize(8);
    const wrapped = doc.splitTextToSize(text, 515);
    doc.text(wrapped, 40, cursor);
    cursor += wrapped.length * 10 + 18;
  }
  const page_height = doc.internal.pageSize.getHeight();
  if (cursor > page_height - 90) {
    doc.addPage();
    cursor = 60;
  }
  doc.setDrawColor(120).setLineWidth(0.6);
  doc.line(40, cursor + 24, 290, cursor + 24);
  doc.line(320, cursor + 24, 555, cursor + 24);
  doc.setFontSize(8).setTextColor(80);
  doc.text("Responsible Party Signature", 40, cursor + 36);
  doc.text("Date", 320, cursor + 36);
  doc.setTextColor(0);
}

/** "PRINT CONTRACT" — the full agreement with the amortisation summary. */
export function buildContractPdf(
  header: ContractHeader,
  terms: ContractTerms,
  schedule: ScheduleRow[],
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = header_block(doc, header, terms.title);

  autoTable(doc, {
    startY: y,
    head: [["Contract Worksheet", ""]],
    body: terms.worksheet,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [31, 58, 95], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 260 }, 1: { halign: "right", cellWidth: 150 } },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  autoTable(doc, {
    startY: y,
    head: [["Annual Percentage Rate", "Finance Charge", "Amount Financed"]],
    body: [terms.disclosure_box[0] ?? ["-", "-", "-"]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, halign: "center" },
    headStyles: { fillColor: [58, 110, 165], textColor: 255, fontSize: 8 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(
    `${terms.num_payments} ${interval_label(terms.interval).toLowerCase()} payments of ` +
      `${money(terms.periodic_amt)}, first due ${fmt_date(terms.first_due_date)}.`,
    40,
    y + 4,
  );
  y += 20;

  if (schedule.length) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Billing Date", "Amount", "Rem. Payments", "Remaining Amount"]],
      body: schedule.map((r) => [
        String(r.periodic_order),
        fmt_date(r.periodic_date),
        money(r.periodic_amt),
        String(r.rem_payments),
        money(r.rem_total_amt),
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [58, 110, 165], textColor: 255 },
      columnStyles: {
        0: { halign: "right", cellWidth: 30 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: 40, right: 40 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }

  if (terms.notes?.trim()) {
    doc.setFont("helvetica", "bold").setFontSize(9).text("Notes", 40, y);
    doc.setFont("helvetica", "normal").setFontSize(8);
    const wrapped = doc.splitTextToSize(terms.notes.trim(), 515);
    doc.text(wrapped, 40, y + 12);
    y += 12 + wrapped.length * 10 + 10;
  }

  signature_block(doc, y, terms.disclosure_key);
  return doc;
}

/** "PRINT COUPONS" — one tear-off payment coupon per scheduled instalment. */
export function buildCouponsPdf(
  header: ContractHeader,
  terms: ContractTerms,
  schedule: ScheduleRow[],
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const per_page = 4;
  const coupon_height = 168;

  schedule.forEach((row, index) => {
    const slot = index % per_page;
    if (index > 0 && slot === 0) doc.addPage();
    const top = 44 + slot * coupon_height;

    doc.setDrawColor(150).setLineWidth(0.7).setLineDashPattern([3, 3], 0);
    doc.rect(40, top, 515, coupon_height - 22);
    doc.setLineDashPattern([], 0);

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(header.office_name || "Dental Practice", 54, top + 22);
    doc.setFont("helvetica", "normal").setFontSize(8);
    if (header.office_phone) doc.text(header.office_phone, 54, top + 34);

    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(`PAYMENT COUPON ${row.periodic_order} OF ${schedule.length}`, 541, top + 22, {
      align: "right",
    });

    doc.setFont("helvetica", "normal").setFontSize(9);
    const left = [
      `Patient: ${header.patient_name}`,
      `PGID: ${header.patient_id}${header.chart_no ? `   Chart: ${header.chart_no}` : ""}`,
      `Responsible Party: ${header.responsible_party || header.patient_name}`,
      `Plan: ${terms.title}`,
    ];
    left.forEach((line, i) => doc.text(line, 54, top + 56 + i * 13));

    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(`Due Date: ${fmt_date(row.periodic_date)}`, 541, top + 56, { align: "right" });
    doc.setFontSize(14);
    doc.text(`Amount Due: ${money(row.periodic_amt)}`, 541, top + 78, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(
      `Remaining after this payment: ${money(row.rem_total_amt)} over ${row.rem_payments} payment(s)`,
      541,
      top + 94,
      { align: "right" },
    );

    doc.setFontSize(8).setTextColor(90);
    doc.text("Amount enclosed: $ ______________", 54, top + 120);
    doc.text("Please detach and return this coupon with your payment.", 541, top + 120, {
      align: "right",
    });
    doc.setTextColor(0);
  });

  if (schedule.length === 0) {
    header_block(doc, header, `${terms.title} — Coupons`);
    doc.setFontSize(10).text("No scheduled payments to print coupons for.", 40, 140);
  }

  return doc;
}

/** Open a generated PDF in a print window (legacy prints straight to paper). */
export function printPdf(doc: jsPDF): void {
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}
