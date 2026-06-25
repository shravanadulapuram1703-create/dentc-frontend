import type { GridRow } from './types';

interface ChartGridProps {
  rows: GridRow[];
  selectedRowId: string | null;
  onSelectRow: (id: string) => void;
  onRowDoubleClick?: (id: string) => void;
  loading: boolean;
  maxHeightPx?: number;
  /** When set, renders a Maximize button in the header (between Description and Th). */
  onMaximize?: () => void;
}

const COLS: { key: keyof GridRow | 'n'; label: string; w: string; align?: 'right' | 'center' }[] = [
  { key: 'type', label: 'Type', w: '110px' },
  { key: 'date', label: 'Date', w: '90px' },
  { key: 'status', label: 'St', w: '50px', align: 'center' },
  { key: 'code', label: 'Code', w: '80px' },
  { key: 'description', label: 'Description', w: 'auto' },
  { key: 'tooth', label: 'Th', w: '50px', align: 'center' },
  { key: 'surface', label: 'Surf', w: '70px', align: 'center' },
  { key: 'provider', label: 'Prdr', w: '70px' },
  { key: 'est_ins', label: 'Est. Ins.', w: '80px', align: 'right' },
  { key: 'fee', label: 'Fee', w: '80px', align: 'right' },
  { key: 'office', label: 'Office', w: '70px' },
  { key: 'n', label: 'N', w: '34px', align: 'center' },
];

export default function ChartGrid({ rows, selectedRowId, onSelectRow, onRowDoubleClick, loading, maxHeightPx = 170, onMaximize }: ChartGridProps) {
  return (
    <div className="overflow-auto border-t border-slate-300 bg-white" style={{ maxHeight: maxHeightPx }}>
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr style={{ background: 'linear-gradient(180deg,#f3f5f8,#dfe4ea)' }}>
            {COLS.map((c) => (
              <th
                key={c.label}
                className="border-b border-slate-300 px-2 py-1.5 font-semibold text-slate-600"
                style={{ width: c.w, textAlign: c.align ?? 'left' }}
              >
                {c.key === 'description' && onMaximize ? (
                  <div className="flex items-center justify-between">
                    <span>{c.label}</span>
                    <button
                      onClick={onMaximize}
                      title="Maximize table"
                      className="ml-2 flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-white shadow hover:bg-slate-900"
                    >
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5-5 5 5" /></svg>
                      Maximize
                    </button>
                  </div>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLS.length} className="px-3 py-6 text-center text-slate-400">
                Loading chart…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLS.length} className="px-3 py-6 text-center text-slate-400">
                No charted items for this patient.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const active = r.id === selectedRowId;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelectRow(r.id)}
                  onDoubleClick={() => onRowDoubleClick?.(r.id)}
                  className="cursor-pointer"
                  style={{
                    background: active ? '#dbeafe' : r.inactive ? '#f8fafc' : typeRowTint(r.type),
                    textDecoration: r.inactive ? 'line-through' : undefined,
                    color: r.inactive ? '#94a3b8' : undefined,
                  }}
                >
                  {COLS.map((c) => {
                    if (c.key === 'n') {
                      return (
                        <td key="n" className="border-b border-slate-100 px-2 py-1 text-center text-slate-400" title={r.notes || undefined}>
                          {r.notes ? 'N' : r.source === 'condition' ? '•' : ''}
                        </td>
                      );
                    }
                    const val = r[c.key as keyof GridRow];
                    const isType = c.key === 'type';
                    return (
                      <td
                        key={c.label}
                        className="border-b border-slate-100 px-2 py-1 text-slate-700"
                        style={{ textAlign: c.align ?? 'left', fontWeight: isType ? 600 : 400, color: isType && !r.inactive ? typeColor(r.type) : undefined }}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function typeColor(type: string): string {
  if (type.startsWith('PRE')) return '#1d4ed8';
  if (type.startsWith('COMP')) return '#15803d';
  if (type.startsWith('TX')) return '#dc2626';
  return '#334155';
}

// Subtle per-type row tint (consistent blue/green/red colour coding).
function typeRowTint(type: string): string | undefined {
  if (type.startsWith('PRE')) return '#f5f8ff';
  if (type.startsWith('COMP')) return '#f4fbf6';
  if (type.startsWith('TX')) return '#fef2f2';
  return undefined;
}
