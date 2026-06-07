// Client-side CSV export. The backend has no export endpoints (see
// docs/reports/reports_backend_devreport.md gap #4), so reports download CSV
// generated entirely in the browser.

export interface CsvColumn<T> {
  header: string;
  /** Cell value for a row; numbers/strings are coerced and quote-escaped. */
  value: (row: T) => string | number | null | undefined;
}

/** UTF-8 BOM so Excel detects the encoding correctly. */
const BOM = String.fromCharCode(0xfeff);

function escapeCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  // Quote when the cell contains a delimiter, quote, or newline.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build CSV text from typed columns + rows. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(","))
    .join("\r\n");
  return body ? `${head}\r\n${body}` : head;
}

/** Trigger a browser download of `csv` as `<filename>.csv`. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Build + download in one call. */
export function exportCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  downloadCsv(filename, toCsv(columns, rows));
}
