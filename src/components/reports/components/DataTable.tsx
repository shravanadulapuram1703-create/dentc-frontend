// Sortable, searchable, client-paginated preview table for report rows. Purely
// presentational over already-fetched rows — the report's `fetch` owns data
// loading; this owns display (sort/search/paginate) so every report behaves the
// same. Large result sets stay responsive because only the current page renders.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cellText } from "../lib/exportMatrix";
import type { ColumnDef } from "../types";

interface Props<Row> {
  columns: ColumnDef<Row>[];
  rows: Row[];
  /** Rows per page. */
  pageSize?: number;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc";

const PAGE_SIZES = [25, 50, 100, 200];

export default function DataTable<Row>({
  columns,
  rows,
  pageSize = 50,
  emptyMessage = "No records match these filters.",
}: Props<Row>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  // --- Search (across every column's plain text) ---
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => cellText(c, row).toLowerCase().includes(q)),
    );
  }, [rows, columns, query]);

  // --- Sort ---
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      const na = typeof va === "number" ? va : Number.parseFloat(String(va ?? ""));
      const nb = typeof vb === "number" ? vb : Number.parseFloat(String(vb ?? ""));
      const bothNum = Number.isFinite(na) && Number.isFinite(nb);
      if (bothNum) return (na - nb) * dir;
      return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
    });
  }, [filtered, columns, sortKey, sortDir]);

  // --- Paginate ---
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((current - 1) * size, current * size),
    [sorted, current, size],
  );

  const toggleSort = (key: string, sortable?: boolean) => {
    if (sortable === false) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const start = sorted.length === 0 ? 0 : (current - 1) * size + 1;
  const end = Math.min(current * size, sorted.length);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + page size */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search results…"
            className="w-full pl-9 pr-3 py-2 border border-[#CBD5E1] rounded-lg text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
            aria-label="Search results"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <span>Rows:</span>
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1.5 border border-[#CBD5E1] rounded-lg text-sm text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-[#64748B] ml-auto tabular-nums">
          {sorted.length.toLocaleString()} record{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#1F3A5F] text-white sticky top-0">
            <tr>
              {columns.map((c) => {
                const sortable = c.sortable !== false;
                const active = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key, c.sortable)}
                    className={`px-3 py-2.5 font-bold uppercase tracking-wide text-[11px] whitespace-nowrap ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                    } ${sortable ? "cursor-pointer select-none hover:bg-[#2d5080]" : ""}`}
                    aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <span className={`inline-flex items-center gap-1 ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                      {c.header}
                      {sortable &&
                        (active ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[#64748B]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, ri) => (
                <tr
                  key={ri}
                  className={`border-b border-[#E2E8F0] ${ri % 2 ? "bg-[#F7F9FC]" : "bg-white"} hover:bg-[#EFF6FF]`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 text-[#1E293B] whitespace-nowrap ${
                        c.align === "right"
                          ? "text-right tabular-nums"
                          : c.align === "center"
                            ? "text-center"
                            : "text-left"
                      }`}
                    >
                      {c.render ? c.render(row) : cellText(c, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[#64748B] tabular-nums">
          {start.toLocaleString()}–{end.toLocaleString()} of {sorted.length.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={current <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm text-[#1F3A5F] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9]"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="px-3 text-sm text-[#64748B] tabular-nums">
            Page {current} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={current >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm text-[#1F3A5F] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9]"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
