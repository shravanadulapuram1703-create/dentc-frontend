import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListPerioExams,
  useCreatePerioExam,
  useUpdatePerioExam,
  useDeletePerioExam,
  useListPerioExamDetails,
  useCreatePerioExamDetail,
  useUpdatePerioExamDetail,
  useListPerioChartTemplates,
  listPerioExamDetails,
  getListPerioExamsQueryKey,
  getListPerioExamDetailsQueryKey,
} from '@/api/generated/endpoints/clinical/clinical';
import type { PerioExamRead, PerioChartTemplateRead } from '@/api/generated/model';
import { PERMANENT_UPPER, PERMANENT_LOWER } from '@/features/restorative/dentition';
import PerioGrid from './PerioGrid';
import PerioDataEntryPanel from './PerioDataEntryPanel';
import PerioGraphicalView from './PerioGraphicalView';
import { ExamDetailsModal, NewExamPrompt } from './ExamDetailsModal';
import { CompareDatesModal, PerioComparison, type CompareSeries } from './CompareDatesModal';
import {
  MEASURES,
  buildCellOrder,
  cellKey,
  detailBody,
  draftFromRead,
  emptyDraft,
  carryForward,
  isDraftEmpty,
  setCell,
  type Cell,
  type MeasureType,
  type PerioDetailDraft,
} from './perioModel';
import {
  loadPerioPrefs, savePerioPrefs, resolveTemplate, prefsFromTemplate, examDateLabel, type PerioPrefs,
} from './perioService';

interface OutletCtx {
  patient: { id: string; name: string; officeId?: string; age?: number };
}

const MAX_TEETH = PERMANENT_UPPER;          // 1..16
const MAND_TEETH = PERMANENT_LOWER;         // 32..17 (operator view)
const FLUSH_MS = 700;

export default function PerioChart() {
  const { patient } = useOutletContext<OutletCtx>();
  const { patientId } = useParams<{ patientId: string }>();
  const queryClient = useQueryClient();

  const numericId = Number(patient?.id ?? patientId);
  const validId = !Number.isNaN(numericId);
  const officeId = patient?.officeId ? Number(patient.officeId) : null;

  // ---- Data ---------------------------------------------------------------
  const examsParams = { patient_id: numericId, size: 200 };
  const examsQuery = useListPerioExams(examsParams, { query: { enabled: validId } });
  const templatesQuery = useListPerioChartTemplates({ size: 200 });
  const createExam = useCreatePerioExam();
  const updateExam = useUpdatePerioExam();
  const deleteExam = useDeletePerioExam();
  const createDetail = useCreatePerioExamDetail();
  const updateDetail = useUpdatePerioExamDetail();

  const exams = useMemo<PerioExamRead[]>(
    () => [...(examsQuery.data?.items ?? [])].sort((a, b) => b.exam_date.localeCompare(a.exam_date)),
    [examsQuery.data],
  );
  const templates = useMemo<PerioChartTemplateRead[]>(() => templatesQuery.data?.items ?? [], [templatesQuery.data]);

  // ---- UI state -----------------------------------------------------------
  const [prefs, setPrefs] = useState<PerioPrefs>(() => loadPerioPrefs());
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [active, setActive] = useState<Cell | null>(null);
  const [showNewExam, setShowNewExam] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [comparison, setComparison] = useState<CompareSeries[] | null>(null);
  const [, setDraftsVersion] = useState(0); // re-render trigger for the mutable draft map

  const updatePrefs = useCallback((patch: Partial<PerioPrefs>) => {
    setPrefs((prev) => { const next = { ...prev, ...patch }; savePerioPrefs(next); return next; });
  }, []);

  // Default the active exam to the most recent once exams load.
  useEffect(() => {
    const first = exams[0];
    if (selectedExamId == null && first) setSelectedExamId(first.id);
  }, [exams, selectedExamId]);

  // Fold the active template's thresholds / show-MGJ into prefs once on load.
  const appliedTemplateRef = useRef(false);
  useEffect(() => {
    if (appliedTemplateRef.current || !templates.length) return;
    appliedTemplateRef.current = true;
    setPrefs((prev) => { const next = prefsFromTemplate(prev, resolveTemplate(templates, prev.template_name)); savePerioPrefs(next); return next; });
  }, [templates]);

  const selectedExam = useMemo(() => exams.find((e) => e.id === selectedExamId) ?? null, [exams, selectedExamId]);
  const readOnly = !!selectedExam?.is_voided;

  // ---- Per-tooth drafts (mutable map + version bump) ----------------------
  const detailsParams = { exam_id: selectedExamId ?? undefined, size: 200 };
  const detailsQuery = useListPerioExamDetails(detailsParams, { query: { enabled: selectedExamId != null } });
  const draftsRef = useRef<Map<string, PerioDetailDraft>>(new Map());
  const dirtyRef = useRef<Set<string>>(new Set());
  const flushTimer = useRef<number | null>(null);
  const flushBusy = useRef(false);
  // Tooth → detail-row id, kept OUTSIDE the draft objects so a draft rebuild can
  // never lose it. The flush consults this to decide create vs. update, which is
  // what prevents a stale refetch from causing a duplicate insert.
  const idByTooth = useRef<Map<string, number>>(new Map());

  // Rebuild drafts from the server whenever the exam changes or fresh details
  // arrive — but never mid-edit (dirty teeth pending flush would be clobbered).
  const rebuiltExam = useRef<number | null>(null);
  useEffect(() => {
    if (selectedExamId == null) { draftsRef.current = new Map(); idByTooth.current.clear(); rebuiltExam.current = null; setDraftsVersion((v) => v + 1); return; }
    if (dirtyRef.current.size) return;
    // On a same-exam refetch, MERGE onto the existing drafts so a just-created
    // row's value is never wiped by a stale list response. On an exam switch,
    // start fresh (clear the id map too).
    const sameExam = rebuiltExam.current === selectedExamId;
    if (!sameExam) idByTooth.current.clear();
    const map = sameExam ? new Map(draftsRef.current) : new Map<string, PerioDetailDraft>();
    for (const d of detailsQuery.data?.items ?? []) {
      map.set(d.tooth_no, draftFromRead(d));
      idByTooth.current.set(d.tooth_no, d.id);
    }
    draftsRef.current = map;
    rebuiltExam.current = selectedExamId;
    setDraftsVersion((v) => v + 1);
  }, [selectedExamId, detailsQuery.data]);

  const getDraft = useCallback((tooth: string) => draftsRef.current.get(tooth), []);

  // Persist every dirty tooth. Serialized by flushBusy so two flushes can't both
  // create a row for the same tooth before the first returns an id; the while-loop
  // drains teeth dirtied while a create/update was in flight.
  const flushDirty = useCallback(async () => {
    const examId = selectedExamId;
    if (examId == null || flushBusy.current) return;
    flushBusy.current = true;
    try {
      // `guard` caps the drain loop; on a persistent server rejection we re-mark
      // the failed teeth and BREAK (no same-flush retry) so a 4xx can't spin.
      let guard = 0;
      while (dirtyRef.current.size && guard++ < 40) {
        const teeth = [...dirtyRef.current];
        dirtyRef.current.clear();
        const failed: string[] = [];
        for (const tooth of teeth) {
          const d = draftsRef.current.get(tooth);
          if (!d) continue;
          const knownId = d.id ?? idByTooth.current.get(tooth);
          if (isDraftEmpty(d) && knownId == null) continue;
          try {
            if (knownId != null) {
              await updateDetail.mutateAsync({ itemId: knownId, data: detailBody(d, examId) });
              d.id = knownId;
            } else {
              const created = await createDetail.mutateAsync({ data: detailBody(d, examId) });
              d.id = created.id; // keep in place so the next edit routes to update
              idByTooth.current.set(tooth, created.id);
            }
          } catch {
            failed.push(tooth);
          }
        }
        if (failed.length) { failed.forEach((t) => dirtyRef.current.add(t)); break; }
      }
    } finally {
      flushBusy.current = false;
    }
    queryClient.invalidateQueries({ queryKey: getListPerioExamDetailsQueryKey(detailsParams) });
  }, [selectedExamId, createDetail, updateDetail, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pin the latest flush in a ref so the unmount/exam-switch effect can call it
  // without re-subscribing every render (flushDirty's identity changes often).
  const flushRef = useRef(flushDirty);
  flushRef.current = flushDirty;

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => { void flushRef.current(); }, FLUSH_MS);
  }, []);

  // Flush pending edits once, on unmount only.
  useEffect(() => () => { if (flushTimer.current) window.clearTimeout(flushTimer.current); void flushRef.current(); }, []);

  const editCell = useCallback((cell: Cell, value: number | boolean | null) => {
    if (readOnly) return;
    const cur = draftsRef.current.get(cell.tooth) ?? emptyDraft(cell.tooth, selectedExamId ?? undefined);
    draftsRef.current.set(cell.tooth, setCell(cur, cell.measure, cell.site, value));
    dirtyRef.current.add(cell.tooth);
    setDraftsVersion((v) => v + 1);
    scheduleFlush();
  }, [readOnly, selectedExamId, scheduleFlush]);

  // ---- Cell navigation ----------------------------------------------------
  const cellOrder = useMemo(() => buildCellOrder(prefs.active_measure, [MAX_TEETH, MAND_TEETH]), [prefs.active_measure]);
  const advance = useCallback((dir: 1 | -1) => {
    setActive((cur) => {
      if (!cur) return cellOrder[0] ?? null;
      const i = cellOrder.findIndex((c) => cellKey(c) === cellKey(cur));
      const next = cellOrder[(i + dir + cellOrder.length) % cellOrder.length];
      return next ?? cur;
    });
  }, [cellOrder]);

  const onNumber = useCallback((digit: number) => {
    if (!active || readOnly) return;
    const kind = MEASURES[active.measure].kind;
    if (kind === 'derived') return;
    if (kind === 'bool') editCell(active, digit !== 0);
    else editCell(active, digit);
    if (prefs.auto_advance) advance(1);
  }, [active, readOnly, editCell, prefs.auto_advance, advance]);

  const clearCell = useCallback(() => {
    if (!active || readOnly) return;
    editCell(active, MEASURES[active.measure].kind === 'bool' ? false : null);
  }, [active, readOnly, editCell]);

  // Set the active cell to an exact value from the measure pad (number, boolean
  // for Bld/Sup, or null for Reset), then auto-advance.
  const setActiveValue = useCallback((value: number | boolean | null) => {
    if (!active || readOnly) return;
    if (MEASURES[active.measure].kind === 'derived') return;
    editCell(active, value);
    if (prefs.auto_advance) advance(1);
  }, [active, readOnly, editCell, prefs.auto_advance, advance]);

  const onCellClick = useCallback((cell: Cell) => {
    setActive(cell);
    if (cell.measure !== prefs.active_measure) updatePrefs({ active_measure: cell.measure });
  }, [prefs.active_measure, updatePrefs]);

  const onToggleBool = useCallback((cell: Cell) => {
    setActive(cell);
    if (cell.measure !== prefs.active_measure) updatePrefs({ active_measure: cell.measure });
    const cur = draftsRef.current.get(cell.tooth);
    const on = !!(cur && cur[`${MEASURES[cell.measure].prefix}${cell.site + 1}`] === true);
    editCell(cell, !on);
  }, [editCell, prefs.active_measure, updatePrefs]);

  const onMeasure = useCallback((m: MeasureType) => {
    updatePrefs({ active_measure: m });
    setActive((cur) => (cur ? { tooth: cur.tooth, measure: m, site: cur.site } : null));
  }, [updatePrefs]);

  // ---- Keyboard entry -----------------------------------------------------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (/^[0-9]$/.test(e.key)) { onNumber(Number(e.key)); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { clearCell(); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') { advance(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { advance(-1); e.preventDefault(); }
  };

  // ---- Exam actions -------------------------------------------------------
  const onNewExam = () => setShowNewExam(true);
  const createNewExam = async (carry: boolean) => {
    setShowNewExam(false);
    if (!validId) return;
    const today = new Date().toISOString().slice(0, 10);
    const carried = carry ? carryForward([...draftsRef.current.values()]) : [];
    try {
      const exam = await createExam.mutateAsync({ data: { patient_id: numericId, office_id: officeId, exam_date: today, is_voided: false } });
      if (carry) {
        for (const d of carried) {
          if (isDraftEmpty(d)) continue;
          await createDetail.mutateAsync({ data: detailBody(d, exam.id) });
        }
      }
      queryClient.invalidateQueries({ queryKey: getListPerioExamsQueryKey(examsParams) });
      dirtyRef.current.clear();
      setSelectedExamId(exam.id);
      setActive(null);
    } catch { /* surfaced via createExam.isError */ }
  };

  const saveDetails = async (patch: { exam_date: string; notes: string }) => {
    if (!selectedExam) return;
    try {
      await updateExam.mutateAsync({ itemId: selectedExam.id, data: { exam_date: patch.exam_date, notes: patch.notes || null } });
      queryClient.invalidateQueries({ queryKey: getListPerioExamsQueryKey(examsParams) });
    } finally { setShowDetails(false); }
  };
  const voidExam = async () => {
    if (!selectedExam) return;
    try {
      await updateExam.mutateAsync({ itemId: selectedExam.id, data: { is_voided: true } });
      queryClient.invalidateQueries({ queryKey: getListPerioExamsQueryKey(examsParams) });
    } finally { setShowDetails(false); }
  };
  const deleteTodaysExam = async () => {
    if (!selectedExam) return;
    if (!window.confirm(`Delete the periodontal exam dated ${examDateLabel(selectedExam.exam_date)}? This cannot be undone.`)) return;
    await deleteExam.mutateAsync({ itemId: selectedExam.id });
    dirtyRef.current.clear();
    setSelectedExamId(null);
    queryClient.invalidateQueries({ queryKey: getListPerioExamsQueryKey(examsParams) });
  };

  // Compare: fetch details for each chosen exam and build read-only series.
  const runCompare = async (examIds: number[]) => {
    setShowCompare(false);
    const series: CompareSeries[] = [];
    for (const id of examIds) {
      const ex = exams.find((e) => e.id === id);
      if (!ex) continue;
      const res = await listPerioExamDetails({ exam_id: id, size: 200 });
      const map = new Map<string, PerioDetailDraft>();
      for (const d of res.items ?? []) map.set(d.tooth_no, draftFromRead(d));
      series.push({ examId: id, date: ex.exam_date, getDraft: (t) => map.get(t) });
    }
    setComparison(series);
  };

  // ---- Render -------------------------------------------------------------
  return (
    <div className="flex flex-col bg-slate-50" style={{ minHeight: 'calc(100vh - 260px)' }} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="flex items-center px-5 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(180deg,#2566a8,#16406e)' }}>
        Perio Chart
        <span className="ml-3 rounded bg-white/15 px-2 py-0.5 text-xs font-normal">{patient?.name}</span>
      </div>

      {/* Toolbar: date of service + exam actions */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#e8f0f8] px-4 py-2 text-xs text-slate-700">
        <label className="flex items-center gap-1.5 font-medium">Date of Service
          <select
            value={selectedExamId ?? ''}
            onChange={(e) => { void flushDirty(); setSelectedExamId(e.target.value ? Number(e.target.value) : null); setActive(null); }}
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            {exams.length === 0 && <option value="">No exams</option>}
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{examDateLabel(ex.exam_date)}{ex.is_voided ? ' (voided)' : ''}</option>)}
          </select>
        </label>
        <button onClick={onNewExam} disabled={!validId || createExam.isPending} className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-50">New Exam</button>
        <button onClick={() => setShowDetails(true)} disabled={!selectedExam} className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-50">
          Exam Details{selectedExam?.notes ? <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
        </button>
        <button onClick={deleteTodaysExam} disabled={!selectedExam} className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-50">Delete Exam</button>
        <button onClick={() => setShowCompare(true)} disabled={exams.length === 0} className="ml-auto rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-50">Compare by Dates</button>
        {readOnly && <span className="rounded bg-amber-100 px-2 py-1 font-medium text-amber-700">Voided — read only</span>}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 overflow-auto p-3">
          {comparison ? (
            <PerioComparison series={comparison} maxTeeth={MAX_TEETH} mandTeeth={MAND_TEETH} numberingSystem={prefs.numbering_system} onClose={() => setComparison(null)} />
          ) : selectedExam == null ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
              <p>No periodontal exam on file for {patient?.name}.</p>
              <button onClick={onNewExam} disabled={!validId} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">+ New Exam</button>
            </div>
          ) : prefs.graphical ? (
            <PerioGraphicalView
              maxTeeth={MAX_TEETH}
              mandTeeth={MAND_TEETH}
              getDraft={getDraft}
              numberingSystem={prefs.numbering_system}
              showLingual={prefs.show_lingual}
              showMgj={prefs.show_mgj}
              active={active}
              activeMeasure={prefs.active_measure}
              readOnly={readOnly}
              onCellClick={onCellClick}
              onToggleBool={onToggleBool}
            />
          ) : (
            <PerioGrid
              maxTeeth={MAX_TEETH}
              mandTeeth={MAND_TEETH}
              getDraft={getDraft}
              active={active}
              activeMeasure={prefs.active_measure}
              numberingSystem={prefs.numbering_system}
              showMgj={prefs.show_mgj}
              showLingual={prefs.show_lingual}
              pdWarn={prefs.pd_warning_level}
              calWarn={prefs.cal_warning_level}
              readOnly={readOnly}
              onCellClick={onCellClick}
              onToggleBool={onToggleBool}
            />
          )}
          {(createDetail.isError || updateDetail.isError) && <p className="mt-2 text-xs text-rose-600">Failed to save a measurement. It will retry on the next edit.</p>}
        </div>

        <div className="w-[260px] shrink-0">
          <PerioDataEntryPanel
            prefs={prefs}
            templates={templates}
            active={prefs.active_measure}
            readOnly={readOnly}
            onMeasure={onMeasure}
            onTemplate={(name) => updatePrefs(prefsFromTemplate(prefs, resolveTemplate(templates, name)))}
            onSetValue={setActiveValue}
            onPrev={() => advance(-1)}
            onNext={() => advance(1)}
            onToggleGraphical={() => updatePrefs({ graphical: !prefs.graphical })}
            onPrefChange={updatePrefs}
            onSetDefaults={() => updatePrefs(prefsFromTemplate(prefs, resolveTemplate(templates, prefs.template_name)))}
          />
        </div>
      </div>

      {showNewExam && <NewExamPrompt hasPrevious={exams.length > 0} onChoose={createNewExam} onClose={() => setShowNewExam(false)} />}
      {showDetails && selectedExam && (
        <ExamDetailsModal exam={selectedExam} saving={updateExam.isPending} onSave={saveDetails} onVoid={voidExam} onClose={() => setShowDetails(false)} />
      )}
      {showCompare && <CompareDatesModal exams={exams} onCompare={runCompare} onClose={() => setShowCompare(false)} />}
    </div>
  );
}
