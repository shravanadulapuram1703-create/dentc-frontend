import type { AxiosError } from 'axios';
import type { PerioExamRead, PerioExamDetailRead, PerioExamComparisonEntry, PerioComparisonResult } from '@/api/generated/model';
import { comparePerioExams } from '@/api/generated/endpoints/clinical/clinical';
import { MEASURES, SITES_PER_SURFACE, boolAt, draftFromRead, numAt, type MeasureType, type PerioDetailDraft } from './perioModel';

// Compare-by-Dates series: one read-only snapshot per exam date, built from the
// flat PerioExamDetail rows, plus the set of measures that were actually
// recorded on that date (drives the "nothing recorded" empty state).
//
// Since backend round 2 (PERIO-BE-15..18, 2026-09-11) a single
// GET /perio-exams/compare?include_details=true returns the per-tooth rows,
// the per-exam roll-up (with honest percentages), the provider credited on
// each date, and `delta_vs_exam_id` naming the live baseline each delta was
// measured against. Voided exams must be asked for explicitly
// (`include_voided=true`); they come back flagged, with no delta, and are never
// a baseline.

export interface CompareSeries {
  examId: number;
  date: string;
  is_voided: boolean;
  provider_name: string | null;
  getDraft: (tooth: string) => PerioDetailDraft | undefined;
  /** Measures with at least one recorded value on this exam (drives the empty-state copy). */
  charted: Set<MeasureType>;
  /** Server-side roll-up for this date (summary + delta vs the previous LIVE exam). */
  summary: PerioExamComparisonEntry;
}

/** Measures offered by the comparison, in the order the tabs are shown. */
export const COMPARE_MEASURES: MeasureType[] = ['PD', 'CAL', 'FGM', 'MGJ', 'BLD', 'SUP', 'FUR', 'MOB'];

export const COMPARE_TITLE: Record<MeasureType, string> = {
  PD: 'Pocket Depth', CAL: 'CAL', FGM: 'FGM', MGJ: 'MGJ', BLD: 'Bleeding', SUP: 'Suppuration', FUR: 'Furcation', MOB: 'Mobility',
};

/** Build one comparison series from a compare entry and its (flat) detail rows. */
export function buildCompareSeries(entry: PerioExamComparisonEntry, rows: PerioExamDetailRead[]): CompareSeries {
  const map = new Map<string, PerioDetailDraft>();
  for (const d of rows) map.set(d.tooth_no, draftFromRead(d));
  const charted = new Set<MeasureType>();
  for (const draft of map.values()) {
    for (const m of COMPARE_MEASURES) {
      if (charted.has(m)) continue;
      const kind = MEASURES[m].kind;
      for (let site = 0; site < SITES_PER_SURFACE * 2; site++) {
        const has = kind === 'bool' ? boolAt(draft, m, site) : numAt(draft, m, site) != null;
        if (has) { charted.add(m); break; }
      }
    }
  }
  return {
    examId: entry.exam_id,
    date: entry.exam_date,
    is_voided: entry.is_voided,
    provider_name: entry.provider_name ?? null,
    getDraft: (t) => map.get(t),
    charted,
    summary: entry,
  };
}

/**
 * Load the comparison for a set of exams in ONE request. Exams are sent oldest
 * → newest so the response (which keeps request order) reads chronologically.
 * Voided exams are allowed through (the picker labels them), so
 * `include_voided` is always on.
 */
export async function loadComparison(patientId: number, exams: PerioExamRead[]): Promise<CompareSeries[]> {
  const ordered = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.id - b.id);
  const res: PerioComparisonResult = await comparePerioExams({
    patient_id: patientId,
    exam_ids: ordered.map((e) => e.id),
    include_details: true,
    include_voided: true,
  });
  return res.exams
    .slice()
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.exam_id - b.exam_id)
    .map((entry) => buildCompareSeries(entry, entry.details ?? []));
}

/**
 * Turn a failed compare call into a sentence for the clinician. The backend
 * answers a bad selection with a coded 404 / 422 (`perio_exam_not_found`,
 * `exam_not_owned_by_patient`, `perio_exam_voided`) — that is "fix the
 * selection", not "no data".
 */
export function describeCompareError(err: unknown): string {
  const ax = err as AxiosError<{ error?: { message?: string; details?: { code?: string } } }>;
  const status = ax?.response?.status;
  const code = ax?.response?.data?.error?.details?.code;
  const msg = ax?.response?.data?.error?.message;
  if (status === 404 || status === 422) {
    const why = code === 'perio_exam_not_found' ? 'One of the selected exams no longer exists.'
      : code === 'exam_not_owned_by_patient' ? 'One of the selected exams belongs to a different patient.'
      : code === 'perio_exam_voided' ? 'One of the selected exams is voided.'
      : msg || 'The selected exams could not be compared.';
    return `${why} Re-open Compare by Dates and pick again.`;
  }
  return 'Could not load the selected exams. Check the connection and try Compare by Dates again.';
}
