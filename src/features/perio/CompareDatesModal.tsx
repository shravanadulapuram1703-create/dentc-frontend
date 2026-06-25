import { useState } from 'react';
import type { PerioExamRead } from '@/api/generated/model';
import { toothLabel, type NumberingSystem } from '@/features/restorative/numbering';
import { isPrimaryId } from '@/features/restorative/dentition';
import { SITES_PER_SURFACE, numAt, type PerioDetailDraft } from './perioModel';
import { examDateLabel } from './perioService';

// Compare by Dates: pick up to three exam dates, then render the legacy
// "Pocket Depth Comparison" — PD values per tooth/site across the chosen dates,
// grouped Upper Facial / Upper Lingual / Lower Facial / Lower Lingual.

interface PickerProps {
  exams: PerioExamRead[];
  onCompare: (examIds: number[]) => void;
  onClose: () => void;
}

export function CompareDatesModal({ exams, onCompare, onClose }: PickerProps) {
  const [ids, setIds] = useState<(number | '')[]>(['', '', '']);
  const chosen = ids.filter((x): x is number => x !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[420px] rounded-lg bg-white p-5 shadow-2xl">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Compare Periodontal Chart by Date</h2>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <label key={i} className="flex items-center gap-2 text-xs">
              <span className="w-12 text-slate-500">Date {i + 1}</span>
              <select
                value={ids[i]}
                onChange={(e) => setIds((prev) => prev.map((v, j) => (j === i ? (e.target.value ? Number(e.target.value) : '') : v)))}
                className="flex-1 rounded border border-slate-300 px-2 py-1.5"
              >
                <option value="">—</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>{examDateLabel(ex.exam_date)}{ex.is_voided ? ' (voided)' : ''}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => chosen.length && onCompare(chosen)}
            disabled={chosen.length === 0}
            className="rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Compare
          </button>
          <button onClick={onClose} className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

export interface CompareSeries {
  examId: number;
  date: string;
  getDraft: (tooth: string) => PerioDetailDraft | undefined;
}

interface ComparisonProps {
  series: CompareSeries[];
  maxTeeth: string[];
  mandTeeth: string[];
  numberingSystem: NumberingSystem;
  onClose: () => void;
}

export function PerioComparison({ series, maxTeeth, mandTeeth, numberingSystem, onClose }: ComparisonProps) {
  const sections: { title: string; teeth: string[]; offset: number }[] = [
    { title: 'Upper Facial', teeth: maxTeeth, offset: 0 },
    { title: 'Upper Lingual', teeth: maxTeeth, offset: SITES_PER_SURFACE },
    { title: 'Lower Facial', teeth: mandTeeth, offset: 0 },
    { title: 'Lower Lingual', teeth: mandTeeth, offset: SITES_PER_SURFACE },
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        Pocket Depth Comparison
        <button onClick={onClose} className="rounded border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-50">Back to Chart</button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {series.length === 0 ? (
          <p className="p-4 text-xs text-slate-500">No exams selected.</p>
        ) : (
          sections.map((sec) => (
            <div key={sec.title} className="mb-5">
              <h3 className="mb-1 text-xs font-semibold text-[#1f4e79]">{sec.title}</h3>
              <div className="overflow-x-auto">
                <table className="border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-2 py-1 text-left">Date</th>
                      {sec.teeth.map((t) => (
                        <th key={t} className="border border-slate-300 bg-slate-100 px-1.5 py-1">
                          {isPrimaryId(t) ? t : toothLabel(Number(t), numberingSystem)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s) => (
                      <tr key={s.examId}>
                        <td className="sticky left-0 z-10 whitespace-nowrap border border-slate-300 bg-white px-2 py-1 font-medium">{examDateLabel(s.date)}</td>
                        {sec.teeth.map((t) => {
                          const draft = s.getDraft(t);
                          const vals = [0, 1, 2].map((i) => numAt(draft, 'PD', sec.offset + i));
                          return (
                            <td key={t} className="border border-slate-300 px-1.5 py-1 text-center">
                              {vals.every((v) => v == null) ? '' : vals.map((v) => (v ?? '-')).join(' ')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
