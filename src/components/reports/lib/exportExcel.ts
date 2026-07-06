// Dependency-free Excel export. The project has no xlsx writer library and the
// backend has no export endpoint (docs/reports/reports_backend_devreport.md gap
// #4), so we emit SpreadsheetML 2003 (.xls XML) — which Excel/LibreOffice open
// natively, preserving numeric types and currency formatting (unlike CSV).
import { parseDecimal } from "../../dashboard/lib/aggregate";
import { cellText } from "./exportMatrix";
import type { ColumnDef } from "../types";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isNumberCol<Row>(col: ColumnDef<Row>): boolean {
  return Boolean(col.currency || col.total);
}

function numeric(v: unknown): number {
  return typeof v === "number" ? v : parseDecimal(String(v ?? ""));
}

function cellXml(styleId: string, type: "String" | "Number", value: string): string {
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}

export interface ExcelMeta {
  sheetName?: string;
  title?: string;
  subtitle?: string;
}

/** Build the SpreadsheetML document text. */
export function buildExcelXml<Row>(
  columns: ColumnDef<Row>[],
  rows: Row[],
  meta: ExcelMeta = {},
): string {
  const sheet = (meta.sheetName ?? "Report").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report";

  const headRow =
    "<Row>" + columns.map((c) => cellXml("hdr", "String", c.header)).join("") + "</Row>";

  const bodyRows = rows
    .map(
      (row) =>
        "<Row>" +
        columns
          .map((c) => {
            if (isNumberCol(c)) {
              return cellXml(c.currency ? "cur" : "num", "Number", String(numeric(c.accessor(row))));
            }
            return cellXml("txt", "String", cellText(c, row));
          })
          .join("") +
        "</Row>",
    )
    .join("");

  // Totals row for any column that requested a total.
  const anyTotal = columns.some((c) => c.total);
  let totalsRow = "";
  if (anyTotal) {
    totalsRow =
      "<Row>" +
      columns
        .map((c, i) => {
          if (c.total) {
            const sum = rows.reduce((s, row) => s + numeric(c.accessor(row)), 0);
            return cellXml(c.currency ? "curTot" : "numTot", "Number", String(sum));
          }
          return cellXml("txtTot", "String", i === 0 ? "Total" : "");
        })
        .join("") +
      "</Row>";
  }

  const titleRows = [
    meta.title
      ? `<Row><Cell ss:StyleID="title"><Data ss:Type="String">${xmlEscape(meta.title)}</Data></Cell></Row>`
      : "",
    meta.subtitle
      ? `<Row><Cell ss:StyleID="sub"><Data ss:Type="String">${xmlEscape(meta.subtitle)}</Data></Cell></Row>`
      : "",
    meta.title || meta.subtitle ? "<Row></Row>" : "",
  ].join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Calibri" ss:Size="10"/></Style>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14" ss:Color="#1F3A5F"/></Style>
  <Style ss:ID="sub"><Font ss:Size="10" ss:Color="#64748B"/></Style>
  <Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1F3A5F" ss:Pattern="Solid"/></Style>
  <Style ss:ID="txt"/>
  <Style ss:ID="num"><NumberFormat ss:Format="#,##0"/></Style>
  <Style ss:ID="cur"><NumberFormat ss:Format="&quot;$&quot;#,##0.00"/></Style>
  <Style ss:ID="txtTot"><Font ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/></Style>
  <Style ss:ID="numTot"><Font ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0"/></Style>
  <Style ss:ID="curTot"><Font ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;$&quot;#,##0.00"/></Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheet)}">
  <Table>
   ${titleRows}
   ${headRow}
   ${bodyRows}
   ${totalsRow}
  </Table>
 </Worksheet>
</Workbook>`;
}

/** Build + download the report as `<filename>.xls`. */
export function exportExcel<Row>(
  filename: string,
  columns: ColumnDef<Row>[],
  rows: Row[],
  meta: ExcelMeta = {},
): void {
  const xml = buildExcelXml(columns, rows, meta);
  const blob = new Blob(["﻿" + xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
