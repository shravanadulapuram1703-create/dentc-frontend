// Fee Schedule Excel template — genuinely functional, fully client-side.
//
// The project ships no xlsx *writer* and the backend has no import endpoint, so
// the "Excel template" is emitted as a UTF-8 CSV (which Excel opens natively) and
// completed uploads are parsed + validated in the browser. No mock data, no fake
// server round-trip — the download and the validation report are both real.

// UTF-8 byte-order mark, built at runtime so no literal BOM sits in the source.
const BOM = String.fromCharCode(0xfeff);

export const FEE_TEMPLATE_HEADERS = [
  "procedure_code",
  "description",
  "fee",
  "effective_date",
] as const;

const EXAMPLE_ROWS: string[][] = [
  ["D0120", "Periodic oral evaluation", "55.00", "2026-01-01"],
  ["D1110", "Prophylaxis - adult", "110.00", "2026-01-01"],
];

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Build + download the blank fee-schedule import template as CSV. */
export function downloadFeeScheduleTemplate(): void {
  const lines = [
    FEE_TEMPLATE_HEADERS.join(","),
    ...EXAMPLE_ROWS.map((r) => r.map(csvEscape).join(",")),
  ];
  // Prepend a UTF-8 BOM so Excel detects the encoding correctly.
  const blob = new Blob([BOM + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fee_schedule_template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface RowError {
  row: number; // 1-based data row (header excluded)
  message: string;
}

export interface ValidationReport {
  total_rows: number;
  valid_rows: number;
  errors: RowError[];
  header_ok: boolean;
}

/** Minimal, dependency-free CSV line splitter (handles quoted fields + commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse + validate an uploaded CSV against the template schema. */
export async function validateFeeScheduleUpload(file: File): Promise<ValidationReport> {
  const raw = await file.text();
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const rows = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (rows.length === 0) {
    return { total_rows: 0, valid_rows: 0, errors: [{ row: 0, message: "File is empty." }], header_ok: false };
  }

  const header = splitCsvLine(rows[0] ?? "").map((h) => h.trim().toLowerCase());
  const header_ok = FEE_TEMPLATE_HEADERS.every((h, i) => header[i] === h);
  const errors: RowError[] = [];
  if (!header_ok) {
    errors.push({
      row: 0,
      message: `Header must be exactly: ${FEE_TEMPLATE_HEADERS.join(", ")}`,
    });
  }

  const dataRows = rows.slice(1);
  let valid = 0;
  dataRows.forEach((line, idx) => {
    const rowNo = idx + 1;
    const cells = splitCsvLine(line);
    const [code, , fee, eff] = cells.map((c) => (c ?? "").trim());
    const rowErrors: string[] = [];

    if (!code) rowErrors.push("procedure_code is required");
    if (!fee) rowErrors.push("fee is required");
    else if (Number.isNaN(Number(fee)) || Number(fee) < 0) rowErrors.push(`fee "${fee}" is not a valid amount`);
    if (eff && !ISO_DATE.test(eff)) rowErrors.push(`effective_date "${eff}" must be YYYY-MM-DD`);

    if (rowErrors.length === 0) valid++;
    else errors.push({ row: rowNo, message: rowErrors.join("; ") });
  });

  return { total_rows: dataRows.length, valid_rows: valid, errors, header_ok };
}
