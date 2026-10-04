// Printable time-card / hours report (jsPDF + autotable), opened in a new tab
// with the print dialog — the same pattern as labReportPrint.ts. There is no
// server-rendered time-clock PDF yet (TC-BE-8).
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatClockTime,
  formatDayKey,
  formatHours,
  ISSUE_LABELS,
  reportTotals,
  type UserSummary,
} from "./timeClockModel";

export interface TimeClockPrintHeader {
  title: string;
  practice: string;
  from: string;
  to: string;
  overtime_label: string;
}

function lastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function printTimeClockReport(
  users: readonly UserSummary[],
  header: TimeClockPrintHeader,
  officeName: (office_id: number | null | undefined) => string,
): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 36;

  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(header.practice || "Time Clock", pageW / 2, 40, { align: "center" });
  doc.setFontSize(12);
  doc.text(header.title, pageW / 2, 58, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(
    `${formatDayKey(header.from)} – ${formatDayKey(header.to)}   ·   Overtime: ${header.overtime_label}   ·   Printed ${new Date().toLocaleString("en-US")}`,
    pageW / 2,
    72,
    { align: "center" },
  );

  const totals = reportTotals(users);
  autoTable(doc, {
    startY: 84,
    margin: { left: marginX, right: marginX },
    theme: "grid",
    head: [["Employee", "Days", "Shifts", "Regular", "Overtime", "Total", "Issues"]],
    body: [
      ...users.map((u) => [
        u.name,
        u.days.length,
        u.shift_count,
        formatHours(u.regular_hours),
        formatHours(u.overtime_hours),
        formatHours(u.total_hours),
        u.issue_count || "",
      ]),
      [
        { content: "Total", styles: { fontStyle: "bold" } } as unknown as string,
        "",
        totals.shifts,
        formatHours(totals.regular_hours),
        formatHours(totals.overtime_hours),
        formatHours(totals.total_hours),
        totals.issues || "",
      ],
    ],
    headStyles: { fillColor: [219, 228, 234], textColor: [40, 40, 40], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 180, 180] },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  for (const u of users) {
    const body: Array<Array<string | number>> = [];
    for (const d of u.days) {
      d.rows.forEach((r, i) => {
        body.push([
          i === 0 ? formatDayKey(d.day) : "",
          officeName(r.entry.office_id),
          formatClockTime(r.clock_in, r.time_zone),
          r.clock_out ? formatClockTime(r.clock_out, r.time_zone) : r.live_hours != null ? "On the clock" : "—",
          formatHours(r.hours),
          r.issues.map((x) => ISSUE_LABELS[x]).join("; "),
        ]);
      });
      if (d.rows.length > 1 || d.overtime > 0) {
        body.push([
          "",
          "",
          "",
          { content: "Day total", styles: { fontStyle: "bold", halign: "right" } } as unknown as string,
          { content: formatHours(d.hours), styles: { fontStyle: "bold" } } as unknown as string,
          d.overtime > 0 ? `OT ${formatHours(d.overtime)}` : "",
        ]);
      }
    }
    autoTable(doc, {
      startY: lastY(doc) + 18,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [
        [
          {
            content: `${u.name}  —  Regular ${formatHours(u.regular_hours)}  ·  OT ${formatHours(u.overtime_hours)}  ·  Total ${formatHours(u.total_hours)}`,
            colSpan: 6,
            styles: { halign: "left", fillColor: [31, 58, 95], textColor: [255, 255, 255] },
          } as unknown as string,
        ],
        ["Date", "Office", "Clock in", "Clock out", "Hours", "Notes"],
      ],
      body,
      headStyles: { fillColor: [219, 228, 234], textColor: [40, 40, 40], fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [180, 180, 180] },
      columnStyles: { 4: { halign: "right" } },
    });
  }

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
