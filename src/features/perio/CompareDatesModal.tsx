import { useMemo, useState } from 'react';
import type { PerioExamRead } from '@/api/generated/model';
import { toothLabel, type NumberingSystem } from '@/features/restorative/numbering';
import { isPrimaryId } from '@/features/restorative/dentition';
import { MEASURES, SITES_PER_SURFACE, boolAt, numAt, type MeasureType, type PerioDetailDraft } from './perioModel';
import { COMPARE_MEASURES, COMPARE_TITLE, type CompareSeries } from './perioCompare';
import { examDateLabel } from './perioService';
import { statusTooltip, type ToothClinicalStatus } from '@/features/charting/toothStatusBridge';

// Compare by Dates: pick up to three exam dates, then render the legacy
// "Pocket Depth Comparison" — values per tooth/site across the chosen dates,
// grouped Upper Facial / Upper Lingual / Lower Facial / Lower Lingual.
//
// The legacy screen only ever compared pocket depths. An exam that was charted
// with bleeding / suppuration / FGM / mobility but no PD therefore rendered as a
// grid of blanks — which reads as "the data is missing". The comparison now
// offers every measure, opens on the first one that actually has values, and
// says so explicitly when the chosen measure was not recorded on any date.

interface PickerProps {
  exams: PerioExamRead[];
  onCompare: (examIds: number[]) => void;
  onClose: () => void;
}

export function CompareDatesModal({ exams, onCompare, onClose }: PickerProps) {
  // Pre-fill the two most recent exams so the common case is a single click.
  const [ids, setIds] = useState<(number | '')[]>([exams[0]?.id ?? '', exams[1]?.id ?? '', '']);
  const chosen = [...new Set(ids.filter((x): x is number => x !== ''))];

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

// ---- Comparison view -------------------------------------------------------

interface ComparisonProps {
  series: CompareSeries[];
  maxTeeth: string[];
  mandTeeth: string[];
  numberingSystem: NumberingSystem;
  /** Restorative-chart status: teeth missing TODAY are greyed in the header. */
  getStatus?: (tooth: string) => ToothClinicalStatus | undefined;
  /** Load failure message (the exams could not be fetched). */
  error?: string | null;
  onClose: () => void;
}

/** Per-site values for one (tooth, surface) cell of a series, or null for "nothing recorded". */
function siteValues(draft: PerioDetailDraft | undefined, measure: MeasureType, offset: number): (number | boolean | null)[] | null {
  const kind = MEASURES[measure].kind;
  if (kind === 'mobility') {
    const v = numAt(draft, measure, offset);
    return v == null ? null : [v];
  }
  const vals = [0, 1, 2].map((i) => (kind === 'bool' ? boolAt(draft, measure, offset + i) : numAt(draft, measure, offset + i)));
  const any = kind === 'bool' ? vals.some((v) => v === true) : vals.some((v) => v != null);
  return any ? vals : null;
}

function formatSites(vals: (number | boolean | null)[] | null, measure: MeasureType): string {
  if (!vals) return '';
  if (MEASURES[measure].kind === 'bool') {
    const letter = measure === 'BLD' ? 'B' : 'S';
    return vals.map((v) => (v === true ? letter : '-')).join(' ');
  }
  return vals.map((v) => (v == null ? '-' : String(v))).join(' ');
}

/** Measures where a larger number is clinically worse (so an increase is shown in red). */
const HIGHER_IS_WORSE = new Set<MeasureType>(['PD', 'CAL', 'FUR', 'MOB']);

function deltaColor(d: number | null | undefined, worseWhenHigher: boolean): string | undefined {
  if (d == null || d === 0 || !worseWhenHigher) return undefined;
  return d > 0 ? '#b91c1c' : '#15803d';
}

export function PerioComparison({ series, maxTeeth, mandTeeth, numberingSystem, getStatus, error, onClose }: ComparisonProps) {
  // Open on PD when any date has pocket depths (legacy default), otherwise the
  // first measure that was actually recorded — never a grid of blanks.
  const available = useMemo(() => COMPARE_MEASURES.filter((m) => series.some((s) => s.charted.has(m))), [series]);
  const [picked, setPicked] = useState<MeasureType | null>(null);
  const measure: MeasureType = picked ?? (available.includes('PD') ? 'PD' : available[0] ?? 'PD');
  const kind = MEASURES[measure].kind;
  const numeric = kind !== 'bool';

  const sections: { title: string; teeth: string[]; offset: number }[] = [
    { title: 'Upper Facial', teeth: maxTeeth, offset: 0 },
    { title: 'Upper Lingual', teeth: maxTeeth, offset: SITES_PER_SURFACE },
    { title: 'Lower Facial', teeth: mandTeeth, offset: 0 },
    { title: 'Lower Lingual', teeth: mandTeeth, offset: SITES_PER_SURFACE },
  ];

  // "Change" = newest LIVE exam minus oldest LIVE exam — a voided exam is never
  // a baseline (same rule the server applies to its `delta`).
  const live = series.filter((s) => !s.is_voided);
  const first = live[0];
  const last = live[live.length - 1];
  const showChange = numeric && live.length >= 2 && !!first && !!last;

  const dateCell = (s: CompareSeries) => `${examDateLabel(s.date)}${s.is_voided ? ' (voided)' : ''}`;
  const dateOf = (examId: number | null | undefined) => {
    const s = series.find((x) => x.examId === examId);
    return s ? examDateLabel(s.date) : null;
  };
  const pct = (v: number | null | undefined) => (v == null ? '' : ` (${v.toFixed(v % 1 ? 1 : 0)}%)`);

  const SUMMARY_HEADERS = ['Date', 'Provider', 'Teeth charted', 'Sites w/ findings', 'Sites w/ PD', 'Mean PD', 'Max PD', 'Sites PD ≥ 4', 'Sites PD ≥ 6', 'Bleeding', 'Suppuration', 'Mean PD change'];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        <span>{COMPARE_TITLE[measure]} Comparison</span>
        <div className="ml-2 flex flex-wrap items-center gap-1" role="tablist" aria-label="Measurement to compare">
          {COMPARE_MEASURES.map((m) => {
            const has = available.includes(m);
            const on = m === measure;
            const cls = on
              ? 'border-blue-600 bg-blue-600 text-white'
              : has ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-dashed border-slate-300 bg-white text-slate-400';
            return (
              <button
                key={m}
                role="tab"
                aria-selected={on}
                onClick={() => setPicked(m)}
                title={has ? `Compare ${COMPARE_TITLE[m]}` : `${COMPARE_TITLE[m]}: nothing recorded on the selected dates`}
                className={`rounded border px-2 py-0.5 font-medium ${cls}`}
              >
                {COMPARE_TITLE[m]}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="ml-auto rounded border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-50">Back to Chart</button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {error ? (
          <p className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>
        ) : series.length === 0 ? (
          <p className="p-4 text-xs text-slate-500">No exams selected.</p>
        ) : (
          <>
            <div className="mb-4 overflow-x-auto">
              <table className="border-collapse text-[10px]">
                <thead>
                  <tr>
                    {SUMMARY_HEADERS.map((h) => (
                      <th key={h} className="border border-slate-300 bg-slate-100 px-2 py-1 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => {
                    const sm = s.summary.summary;
                    const delta = s.summary.delta?.mean_pd;
                    const baseline = dateOf(s.summary.delta_vs_exam_id);
                    const cells: (string | number)[] = [
                      s.provider_name ?? '—',
                      sm.teeth_charted,
                      sm.sites_with_findings,
                      sm.sites_measured,
                      sm.mean_pd != null ? sm.mean_pd.toFixed(1) : '—',
                      sm.max_pd ?? '—',
                      sm.sites_pd_4plus,
                      sm.sites_pd_6plus,
                      `${sm.bleeding_sites}${pct(sm.bleeding_pct)}`,
                      `${sm.suppuration_sites}${pct(sm.suppuration_pct)}`,
                    ];
                    return (
                      <tr key={s.examId}>
                        <td className="whitespace-nowrap border border-slate-300 px-2 py-1 font-medium">{dateCell(s)}</td>
                        {cells.map((c, i) => <td key={i} className="whitespace-nowrap border border-slate-300 px-2 py-1 text-center">{c}</td>)}
                        <td
                          className="whitespace-nowrap border border-slate-300 px-2 py-1 text-center"
                          style={{ color: deltaColor(delta, true) }}
                          title={baseline ? `vs ${baseline}` : s.is_voided ? 'Voided exams carry no change' : 'No earlier live exam in this comparison'}
                        >
                          {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${baseline ? ` vs ${baseline}` : ''}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!available.includes(measure) && (
              <p className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                No {COMPARE_TITLE[measure]} values were recorded on the selected date{series.length === 1 ? '' : 's'}.
                {available.length
                  ? ` Recorded on these dates: ${available.map((m) => COMPARE_TITLE[m]).join(', ')} — pick one above.`
                  : ' None of the selected exams has any measurement charted yet.'}
              </p>
            )}

            {available.includes(measure) && sections.map((sec) => (
              <div key={sec.title} className="mb-5">
                <h3 className="mb-1 text-xs font-semibold text-[#1f4e79]">{sec.title}</h3>
                <div className="overflow-x-auto">
                  <table className="border-collapse text-[10px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-2 py-1 text-left">Date</th>
                        {sec.teeth.map((t) => {
                          const s = getStatus?.(t);
                          const absent = !!s && !s.present;
                          return (
                            <th key={t} title={statusTooltip(s) || undefined} className="border border-slate-300 px-1.5 py-1" style={{ background: absent ? '#cbd5e1' : '#f1f5f9', color: absent ? '#64748b' : undefined, textDecoration: absent ? 'line-through' : undefined }}>
                              {isPrimaryId(t) ? t : toothLabel(Number(t), numberingSystem)}{s?.implant ? <sup className="text-[8px] text-sky-700">i</sup> : null}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((s) => (
                        <tr key={s.examId}>
                          <td className="sticky left-0 z-10 whitespace-nowrap border border-slate-300 bg-white px-2 py-1 font-medium">{dateCell(s)}</td>
                          {sec.teeth.map((t) => (
                            <td key={t} className="border border-slate-300 px-1.5 py-1 text-center">
                              {formatSites(siteValues(s.getDraft(t), measure, sec.offset), measure)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {showChange && (
                        <tr>
                          <td className="sticky left-0 z-10 whitespace-nowrap border border-slate-300 bg-slate-50 px-2 py-1 font-medium text-slate-600" title={`${examDateLabel(last.date)} minus ${examDateLabel(first.date)}`}>Change</td>
                          {sec.teeth.map((t) => {
                            const a = siteValues(first.getDraft(t), measure, sec.offset);
                            const b = siteValues(last.getDraft(t), measure, sec.offset);
                            const n = kind === 'mobility' ? 1 : 3;
                            const deltas = Array.from({ length: n }, (_, i) => {
                              const x = a?.[i];
                              const y = b?.[i];
                              return typeof x === 'number' && typeof y === 'number' ? y - x : null;
                            });
                            if (deltas.every((d) => d == null)) return <td key={t} className="border border-slate-300 bg-slate-50 px-1.5 py-1" />;
                            return (
                              <td key={t} className="border border-slate-300 bg-slate-50 px-1.5 py-1 text-center">
                                {deltas.map((d, i) => (
                                  <span key={i} style={{ color: deltaColor(d, HIGHER_IS_WORSE.has(measure)) }}>
                                    {i ? ' ' : ''}{d == null ? '-' : d > 0 ? `+${d}` : String(d)}
                                  </span>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
