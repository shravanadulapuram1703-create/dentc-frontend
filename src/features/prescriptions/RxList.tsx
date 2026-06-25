// Prescription List — the legacy M11 grid.
//
// Columns mirror Denticon: ☐ | Rx ID | Rx Date | Drug Name | Dispense | SIG |
// Refill | Provider | DoseSpot? | Status. Clicking a row selects it (loads into
// the panel for view); the checkbox marks rows for Print. Struck-off rows
// (is_active = false) render with a line through the whole row.

import { fmtRxDate } from './rxModel';
import type { RxRow } from './rxModel';

interface Props {
  rows: RxRow[];
  selectedId: number | null;
  checkedIds: Set<number>;
  providerLabel: (id: string | null | undefined) => string;
  onSelect: (id: number) => void;
  onToggleCheck: (id: number) => void;
  loading?: boolean;
}

const COLS = [
  'Rx ID',
  'Rx Date',
  'Drug Name',
  'Dispense',
  'SIG',
  'Refill',
  'Provider',
  'DoseSpot?',
  'Status',
];

export default function RxList({
  rows,
  selectedId,
  checkedIds,
  providerLabel,
  onSelect,
  onToggleCheck,
  loading,
}: Props) {
  return (
    <div className="overflow-auto border border-slate-300 rounded-md bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-200 text-slate-700">
            <th className="w-8 px-2 py-1.5 text-left font-semibold border-b border-slate-300" />
            {COLS.map((c) => (
              <th
                key={c}
                className="px-3 py-1.5 text-left font-semibold border-b border-slate-300 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={COLS.length + 1} className="px-3 py-6 text-center text-slate-400">
                Loading prescriptions…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={COLS.length + 1} className="px-3 py-6 text-center text-slate-400">
                No prescriptions on file. Click <span className="font-semibold">Add New</span> to create one.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const struck = r.is_active === false;
            const selected = r.id === selectedId;
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={[
                  'cursor-pointer border-b border-slate-100',
                  selected ? 'bg-blue-100' : 'hover:bg-slate-50',
                  struck ? 'text-slate-400 line-through' : 'text-slate-700',
                ].join(' ')}
              >
                <td className="px-2 py-1.5 no-underline" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checkedIds.has(r.id)}
                    onChange={() => onToggleCheck(r.id)}
                    aria-label={`Select prescription ${r.id}`}
                  />
                </td>
                <td className="px-3 py-1.5 text-blue-700 font-medium">{r.id}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{fmtRxDate(r.rx_date)}</td>
                <td className="px-3 py-1.5">{r.drug_name}</td>
                <td className="px-3 py-1.5">{r.dispense || ''}</td>
                <td className="px-3 py-1.5">{r.sig || ''}</td>
                <td className="px-3 py-1.5 text-center">{r.refills ?? 0}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{providerLabel(r.provider_id)}</td>
                <td className="px-3 py-1.5">{r.dosespot_rx_id ? 'Yes' : 'No'}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {struck ? 'Struck-off' : 'Active'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
