// Generic report → PDF using jsPDF + autotable (already a project dependency,
// see src/features/treatment-plans/txReport.ts). The backend has no PDF export
// endpoint (docs/reports/reports_backend_devreport.md gap #4), so PDFs are built
// client-side and mirror the on-screen table.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportMatrix } from "./exportMatrix";

export interface PdfMeta {
  title: string;
  /** Sub-line under the title (range, office, filters). */
  subtitle?: string;
  /** Optional summary chips printed above the table (label: value). */
  summary?: { label: string; value: string }[];
}

/** Build the report PDF document (landscape letter for wide tables). */
export function buildReportPdf(matrix: ExportMatrix, meta: PdfMeta): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 32;

  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(31, 58, 95);
  doc.text(meta.title, marginX, 40);
  let y = 40;
  if (meta.subtitle) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 116, 139);
    doc.text(meta.subtitle, marginX, 56);
    y = 56;
  }
  // Generated-on line (right aligned).
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(148, 163, 184);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - marginX, 40, { align: "right" });

  if (meta.summary?.length) {
    doc.setFontSize(9).setTextColor(30, 41, 59);
    const line = meta.summary.map((s) => `${s.label}: ${s.value}`).join("     ");
    doc.text(doc.splitTextToSize(line, pageW - marginX * 2), marginX, y + 16);
    y += 16 + Math.ceil(line.length / 120) * 12;
  }

  const columnStyles: Record<number, { halign?: "left" | "right" | "center"; cellWidth?: number }> = {};
  matrix.aligns.forEach((a, i) => {
    columnStyles[i] = { halign: a };
    if (matrix.pdfWidths[i]) columnStyles[i].cellWidth = matrix.pdfWidths[i];
  });

  const body = [...matrix.body];
  if (matrix.hasTotals) body.push(matrix.totals);

  autoTable(doc, {
    startY: y + 18,
    margin: { left: marginX, right: marginX },
    theme: "striped",
    head: [matrix.head],
    body,
    headStyles: { fillColor: [31, 58, 95], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
    styles: { fontSize: 7.5, cellPadding: 3, lineColor: [226, 232, 240], textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles,
    // Bold the totals row (last row when present).
    didParseCell: (data) => {
      if (matrix.hasTotals && data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  return doc;
}

/** Open the report PDF in a new tab (print/preview). */
export function openReportPdf(matrix: ExportMatrix, meta: PdfMeta): void {
  const doc = buildReportPdf(matrix, meta);
  doc.output("dataurlnewwindow");
}

/** Download the report PDF as `<filename>.pdf`. */
export function downloadReportPdf(filename: string, matrix: ExportMatrix, meta: PdfMeta): void {
  const doc = buildReportPdf(matrix, meta);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
