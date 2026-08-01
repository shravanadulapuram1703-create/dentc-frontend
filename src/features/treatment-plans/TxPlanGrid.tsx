import { useMemo } from 'react';
import { STATUS_ABBR, STATUS_COLOR, STATUS_LABEL, money, type TxRow } from './txModel';

interface TxPlanGridProps {
  rows: TxRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** Open the Edit Treatment modal for a row (legacy: click the Diag Date link). */
  onEditRow: (id: string) => void;
  loading: boolean;
}

const COLS: { label: string; w: string; align?: 'right' | 'center' }[] = [
  { label: 'Diag Date', w: '92px' },
  { label: 'TID', w: '40px', align: 'center' },
  { label: 'PID', w: '40px', align: 'center' },
  { label: 'Order', w: '48px', align: 'center' },
  { label: 'St', w: '44px', align: 'center' },
  { label: 'Code', w: '64px' },
  { label: 'Th', w: '42px', align: 'center' },
  { label: 'Surf', w: '60px', align: 'center' },
  { label: 'Description', w: 'auto' },
  { label: 'Prov', w: '76px' },
  { label: 'Est Pat', w: '82px', align: 'right' },
  { label: 'Est Ins', w: '82px', align: 'right' },
  { label: 'Fee', w: '82px', align: 'right' },
];

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US');
}

export default function TxPlanGrid({ rows, selected, onToggle, onToggleAll, onEditRow, loading }: TxPlanGridProps) {
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ pat: acc.pat + r.est_pat, ins: acc.ins + r.est_ins, fee: acc.fee + r.fee }),
        { pat: 0, ins: 0, fee: 0 },
      ),
    [rows],
  );
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="overflow-auto border border-slate-300 bg-white" style={{ maxHeight: 340 }}>
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr style={{ background: 'linear-gradient(180deg,#f3f5f8,#dfe4ea)' }}>
            <th className="border-b border-slate-300 px-2 py-1.5" style={{ width: '34px' }}>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allChecked}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            {COLS.map((c) => (
              <th
                key={c.label}
                className="border-b border-slate-300 px-2 py-1.5 font-semibold text-slate-600"
                style={{ width: c.w, textAlign: c.align ?? 'left' }}
              >
                {c.label}
              </th>
            ))}
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
                  className={`cursor-pointer border-b border-slate-100 ${isSel ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                  onClick={() => onToggle(r.id)}
                >
                  <td className="px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => onToggle(r.id)} aria-label={`Select ${r.code}`} />
                  </td>
                  <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="font-medium text-sky-600 underline decoration-dotted underline-offset-2 hover:text-sky-800"
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
                  <td className="px-2 py-1 font-mono text-slate-700">{r.code}</td>
                  <td className="px-2 py-1 text-center">{r.tooth}</td>
                  <td className="px-2 py-1 text-center">{r.surface}</td>
                  <td className="px-2 py-1 text-slate-700">{r.description}</td>
                  <td className="px-2 py-1 text-slate-600">{r.provider_label}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(r.est_pat)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(r.est_ins)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(r.fee)}</td>
                </tr>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="sticky bottom-0">
            <tr style={{ background: 'linear-gradient(180deg,#eef2f7,#dde3ea)' }} className="font-semibold text-slate-700">
              <td colSpan={10} className="px-2 py-1.5 text-right">
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
