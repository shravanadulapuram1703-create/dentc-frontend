import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { STATUS_ABBR, STATUS_COLOR, STATUS_LABEL, money, type TxRow } from './txModel';
import { uiZoom } from '../../utils/uiZoom';
import type { TxSort, TxSortKey } from './txSort';

interface TxPlanGridProps {
  rows: TxRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** Open the Edit Treatment window for a row (double-click anywhere on the row, or click the Diag Date link). */
  onEditRow: (id: string) => void;
  loading: boolean;
  sort: TxSort;
  /** Header click: asc → desc → back to the default order. */
  onSortChange: (sort: TxSort) => void;
}

const HEADER_BG = 'linear-gradient(180deg,#2a4a73,#1d3a5f)';

const COLS: { key: TxSortKey; label: string; w: number; align?: 'right' | 'center' }[] = [
  { key: 'diag_date', label: 'Diag Date', w: 96 },
  { key: 'tid', label: 'TID', w: 52, align: 'center' },
  { key: 'phase', label: 'PID', w: 52, align: 'center' },
  { key: 'order', label: 'Order', w: 64, align: 'center' },
  { key: 'status', label: 'St', w: 50, align: 'center' },
  { key: 'code', label: 'Code', w: 72 },
  { key: 'tooth', label: 'Th', w: 52, align: 'center' },
  { key: 'surface', label: 'Surf', w: 64, align: 'center' },
  { key: 'description', label: 'Description', w: 340 },
  { key: 'provider_label', label: 'Prov', w: 150 },
  { key: 'est_pat', label: 'Est Pat', w: 90, align: 'right' },
  { key: 'est_ins', label: 'Est Ins', w: 90, align: 'right' },
  { key: 'fee', label: 'Fee', w: 90, align: 'right' },
];

const MIN_COL_W = 36;
const CHECK_COL_W = 34;
const WIDTHS_STORAGE_KEY = 'dentc:tx_plan_grid:col_widths';

type Widths = Record<TxSortKey, number>;

function defaultWidths(): Widths {
  return Object.fromEntries(COLS.map((c) => [c.key, c.w])) as Widths;
}

function loadWidths(): Widths {
  const base = defaultWidths();
  try {
    const raw = localStorage.getItem(WIDTHS_STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Record<string, unknown>>;
    for (const c of COLS) {
      const v = saved[c.key];
      if (typeof v === 'number' && Number.isFinite(v) && v >= MIN_COL_W) base[c.key] = v;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return base;
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  // A date-only value ("2026-09-06") must not go through `new Date` — that is UTC
  // midnight and renders as the previous day in US time zones. Format the parts.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US');
}

export default function TxPlanGrid({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onEditRow,
  loading,
  sort,
  onSortChange,
}: TxPlanGridProps) {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ pat: acc.pat + r.est_pat, ins: acc.ins + r.est_ins, fee: acc.fee + r.fee }),
        { pat: 0, ins: 0, fee: 0 },
      ),
    [rows],
  );
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  // ---- Column widths (drag the right edge of a header; persisted) ----------
  const [widths, setWidths] = useState<Widths>(loadWidths);
  const dragRef = useRef<{ key: TxSortKey; startX: number; startW: number } | null>(null);
  // Set when a drag just ended so the trailing click doesn't also sort.
  const justResizedRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(widths));
    } catch {
      /* storage full / disabled — widths just won't persist */
    }
  }, [widths]);

  const onResizeStart = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>, key: TxSortKey) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { key, startX: e.clientX, startW: widths[key] };
      const zoom = uiZoom();
      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        // clientX is in viewport px; widths are layout px under the root CSS zoom.
        const next = Math.max(MIN_COL_W, Math.round(d.startW + (ev.clientX - d.startX) / zoom));
        setWidths((w) => (w[d.key] === next ? w : { ...w, [d.key]: next }));
      };
      const onUp = () => {
        dragRef.current = null;
        justResizedRef.current = true;
        window.setTimeout(() => {
          justResizedRef.current = false;
        }, 0);
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      document.body.style.cursor = 'col-resize';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [widths],
  );

  const resetWidth = (key: TxSortKey) => {
    const def = COLS.find((c) => c.key === key)?.w ?? 80;
    setWidths((w) => ({ ...w, [key]: def }));
  };

  const onHeaderClick = (key: TxSortKey) => {
    if (justResizedRef.current) return;
    if (!sort || sort.key !== key) onSortChange({ key, dir: 'asc' });
    else if (sort.dir === 'asc') onSortChange({ key, dir: 'desc' });
    else onSortChange(null);
  };

  const tableWidth = CHECK_COL_W + COLS.reduce((sum, c) => sum + widths[c.key], 0);
  // Footer: label spans everything before the money columns.
  const labelSpan = 1 + COLS.findIndex((c) => c.key === 'est_pat');

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm" style={{ maxHeight: 340 }}>
      <table
        className="border-collapse text-xs"
        style={{ tableLayout: 'fixed', width: tableWidth, minWidth: '100%' }}
      >
        <colgroup>
          <col style={{ width: CHECK_COL_W }} />
          {COLS.map((c) => (
            <col key={c.key} style={{ width: widths[c.key] }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="text-white" style={{ background: HEADER_BG }}>
            <th className="px-2 py-2">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allChecked}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            {COLS.map((c) => {
              const active = sort?.key === c.key;
              const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
              const justify =
                c.align === 'right' ? 'justify-end' : c.align === 'center' ? 'justify-center' : 'justify-start';
              return (
                <th
                  key={c.key}
                  className={`group relative select-none whitespace-nowrap p-0 text-[11px] font-bold uppercase tracking-wide ${active ? 'bg-white/10' : ''}`}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    className={`flex w-full items-center gap-1 overflow-hidden px-2 py-2 uppercase hover:bg-white/10 ${justify}`}
                    title={
                      active
                        ? sort.dir === 'asc'
                          ? `Sorted by ${c.label} (ascending) — click for descending`
                          : `Sorted by ${c.label} (descending) — click to restore default order`
                        : `Sort by ${c.label}`
                    }
                    onClick={() => onHeaderClick(c.key)}
                  >
                    <span className="truncate">{c.label}</span>
                    <Icon
                      size={11}
                      className={`shrink-0 ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}
                      aria-hidden
                    />
                  </button>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${c.label} column`}
                    title="Drag to resize · double-click to reset"
                    className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize border-r border-white/20 hover:bg-white/40"
                    onPointerDown={(e) => onResizeStart(e, c.key)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      resetWidth(c.key);
                    }}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLS.length + 1} className="px-3 py-6 text-center text-slate-400">
                Loading treatment plan…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLS.length + 1} className="px-3 py-6 text-center text-slate-400">
                No procedures in this treatment plan. Add one below.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const isSel = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={`cursor-pointer select-none border-b border-slate-100 ${isSel ? 'bg-[#EFF6FE]' : 'hover:bg-slate-50'}`}
                  title="Click to select · double-click to edit"
                  onClick={() => onToggle(r.id)}
                  onDoubleClick={() => onEditRow(r.id)}
                >
                  <td className="px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => onToggle(r.id)} aria-label={`Select ${r.code}`} />
                  </td>
                  <td className="truncate px-2 py-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="font-medium text-[#3A6EA5] underline decoration-dotted underline-offset-2 hover:text-[#1F3A5F]"
                      title="Edit this procedure"
                      onClick={() => onEditRow(r.id)}
                    >
                      {fmtDate(r.diag_date) || 'Edit'}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-center">{r.tid}</td>
                  <td className="px-2 py-1 text-center">{r.phase}</td>
                  <td className="px-2 py-1 text-center">{r.order}</td>
                  <td className="px-2 py-1 text-center">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: STATUS_COLOR[r.status] }}
                      title={STATUS_LABEL[r.status]}
                    >
                      {STATUS_ABBR[r.status]}
                    </span>
                  </td>
                  <td className="truncate px-2 py-1 font-mono text-slate-700">{r.code}</td>
                  <td className="truncate px-2 py-1 text-center">{r.tooth}</td>
                  <td className="truncate px-2 py-1 text-center">{r.surface}</td>
                  <td className="truncate px-2 py-1 text-slate-700" title={r.description}>
                    {r.description}
                  </td>
                  <td className="truncate px-2 py-1 text-slate-600" title={r.provider_label}>
                    {r.provider_label}
                  </td>
                  <td className="truncate px-2 py-1 text-right tabular-nums">{money(r.est_pat)}</td>
                  <td className="truncate px-2 py-1 text-right tabular-nums">{money(r.est_ins)}</td>
                  <td className="truncate px-2 py-1 text-right tabular-nums">{money(r.fee)}</td>
                </tr>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="sticky bottom-0">
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-800">
              <td colSpan={labelSpan} className="px-2 py-1.5 text-right">
                Totals ({rows.length} {rows.length === 1 ? 'procedure' : 'procedures'})
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{money(totals.pat)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{money(totals.ins)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{money(totals.fee)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
