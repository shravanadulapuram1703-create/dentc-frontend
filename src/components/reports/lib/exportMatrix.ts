// Turn a report's typed columns + rows into a flat string matrix shared by every
// exporter (CSV, Excel, PDF) and the print view, so all outputs stay identical.
import { formatCurrencyExact } from "../../dashboard/lib/aggregate";
import type { CellAlign, ColumnDef } from "../types";

export interface ExportMatrix {
  head: string[];
  aligns: CellAlign[];
  body: string[][];
  /** Per-column footer totals (empty string where a column has no total). */
  totals: string[];
  /** True when any column requested a total (i.e. render the totals row). */
  hasTotals: boolean;
  pdfWidths: (number | undefined)[];
}

/** Plain string value of a cell (format > accessor). */
export function cellText<Row>(col: ColumnDef<Row>, row: Row): string {
  if (col.format) return col.format(row);
  const v = col.accessor(row);
  return v == null ? "" : String(v);
}

function numeric(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export function buildMatrix<Row>(columns: ColumnDef<Row>[], rows: Row[]): ExportMatrix {
  const head = columns.map((c) => c.header);
  const aligns = columns.map((c) => c.align ?? (c.currency ? "right" : "left"));
  const body = rows.map((row) => columns.map((c) => cellText(c, row)));

  let hasTotals = false;
  const totals = columns.map((c, i) => {
    if (!c.total) return "";
    hasTotals = true;
    const sum = rows.reduce((s, row) => s + numeric(c.accessor(row)), 0);
    if (i === 0 && columns[0]?.total !== true) return "Total";
    return c.currency ? formatCurrencyExact(sum) : sum.toLocaleString();
  });
  // Label the totals row in the first column when it isn't itself a total.
  if (hasTotals && columns.length > 0 && !columns[0]?.total) totals[0] = "Total";

  return { head, aligns, body, totals, hasTotals, pdfWidths: columns.map((c) => c.pdfWidth) };
}
