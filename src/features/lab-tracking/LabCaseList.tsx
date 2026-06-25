// Lab case grid — mirrors the legacy "Lab Cases" / Lab Report columns:
// Appt Date · Time · Provider · Description · Lab Cost · Sent · Due · Received · Status.

import { FlaskConical } from 'lucide-react';
import {
  deriveStatus,
  fmtDate,
  fmtTime,
  money,
  STATUS_META,
  type LabCase,
} from './labModel';

interface Props {
  rows: LabCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function LabCaseList({ rows, selectedId, onSelect, loading }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <th className="px-3 py-2">Appt Date</th>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Provider</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">Lab Cost</th>
            <th className="px-3 py-2">Sent</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Received</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                Loading lab cases…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                <FlaskConical className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                No lab cases for this patient.
              </td>
            </tr>
          ) : (
            rows.map((c) => {
              const meta = STATUS_META[deriveStatus(c)];
              const active = c.id === selectedId;
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`cursor-pointer transition-colors ${
                    active ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">{fmtDate(c.date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmtTime(c.start_time)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">{c.provider_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{c.procedure_label || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-slate-700">
                    {money(c.lab_cost)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmtDate(c.lab_sent_on)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmtDate(c.lab_due_on)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmtDate(c.lab_received_on)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
