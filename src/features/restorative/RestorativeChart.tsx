import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListChartConditions,
  useCreateChartCondition,
  useUpdateChartCondition,
  useDeleteChartCondition,
  useListPatientProcedures,
  useCreatePatientProcedure,
  useListProgressNotes,
  useCreateProgressNote,
  getListChartConditionsQueryKey,
  getListPatientProceduresQueryKey,
  getListProgressNotesQueryKey,
} from '@/api/generated/endpoints/clinical/clinical';
import { useListChartMaterials } from '@/api/generated/endpoints/procedures/procedures';
import { uploadPatientDocument } from '@/api/generated/endpoints/patients/patients';
import {
  useListTreatmentPlans,
  useCreateTreatmentPlan,
  useListTreatmentPlanItems,
  useCreateTreatmentPlanItem,
  getListTreatmentPlanItemsQueryKey,
} from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import type { ChartConditionRead, ChartMaterialRead, PatientProcedureRead, ProviderRead, TreatmentPlanItemRead } from '@/api/generated/model';
import AddAdaCodeModal, { type AdaEntry } from './AddAdaCodeModal';
import InsuranceBenefitsModal from './InsuranceBenefitsModal';
import { activePlan, genId, buildOverlayGlyphs, toothHasCode, SOURCE_COLOR, rgba, type ChartSource } from './txPlanModel';
import { loadProcedureCodes } from '@/components/setup/insurance/procedureCodeService';
import type { ProcedureCodeRead } from '@/api/generated/model';
import type { SurfaceKey } from './toothLayout';
import ToothFigure from './ToothFigure';
import SurfaceSelector from './SurfaceSelector';
import ChartToolbar from './ChartToolbar';
import ConditionPalette from './ConditionPalette';
import ChartGrid from './ChartGrid';
import ConditionsPopup from './ConditionsPopup';
import LegendOverlay from './LegendOverlay';
import ToothHistoryPopup, { type ProgressNoteRow } from './ToothHistoryPopup';
import MaterialPicker from './MaterialPicker';
import TemplatePicker from './TemplatePicker';
import ToothNotePopup from './ToothNotePopup';
import WholeToothMenu, { type SubOption } from './WholeToothMenu';
import RctMaterialPicker from './RctMaterialPicker';
import WatchEditor from './WatchEditor';
import WatchArrowMenu from './WatchArrowMenu';
import DrawLayer, { type Stroke } from './DrawLayer';
import { strokesToPngBlob } from './drawRaster';
import SaveDrawModal from './SaveDrawModal';
import EditConditionModal, { type EditableCondition } from './EditConditionModal';
import { isMaterialAware, lookupCondition, type ConditionDef } from './conditionTaxonomy';
import { toToothStates, expandTemplate, noteCreateBody, encodeRegion, type ToothState, type ToothGlyph } from './chartModel';
import {
  loadChartSettings, saveChartSettings, materialMetaResolver, materialIdByNameResolver, type ChartSettings,
} from './restorativeService';
import { toothLabel, type NumberingSystem } from './numbering';
import {
  upperTeeth, lowerTeeth, toothMeta, defaultDentition, isPrimaryId, toothSide, type DentitionMode,
} from './dentition';
import { toothAnatomy } from './toothAnatomy';
import type { RestorationTemplate } from './restorationTemplates';
import type { ActiveSelection, ChartTab, GridRow, PaletteItem, ToothArea } from './types';

interface OutletCtx {
  patient: { id: string; name: string; officeId?: string; age?: number };
}

const TAB_TITLE: Record<ChartTab, string> = {
  'pre-existing': 'Pre-existing Conditions',
  completed: 'Completed Procedures',
  'tx-plans': 'Treatment Plan',
};
const CHART_AS: Record<ChartTab, string> = { 'pre-existing': 'pre-existing', completed: 'completed', 'tx-plans': 'tx-plan' };
const WHOLE_TOOTH_MENU_CODES = new Set(['MISSING', 'IMPACTED', 'ERUPTED']);

// Legacy two-step whole-tooth sub-options.
const WHOLE_TOOTH_SUBOPTIONS: Record<string, SubOption[]> = {
  MISSING: [{ label: 'Permanent', sub: null }, { label: 'Unerupted Permanent', sub: 'unerupted' }],
  IMPACTED: [{ label: 'Permanent', sub: null }, { label: 'Deciduous', sub: 'deciduous' }],
  ERUPTED: [{ label: 'Deciduous (Over-retained)', sub: 'deciduous' }, { label: 'Supernumerary', sub: 'supernumerary' }],
};

export default function RestorativeChart() {
  const { patient } = useOutletContext<OutletCtx>();
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const numericId = Number(patient?.id ?? patientId);
  const validId = !Number.isNaN(numericId);
  const officeId = patient?.officeId ? Number(patient.officeId) : null;

  // ---- Data ---------------------------------------------------------------
  const conditionsParams = { patient_id: numericId, size: 200 };
  const conditionsQuery = useListChartConditions(conditionsParams, { query: { enabled: validId } });
  const proceduresQuery = useListPatientProcedures({ patient_id: numericId, size: 200 }, { query: { enabled: validId } });
  const materialsQuery = useListChartMaterials({ size: 200 });
  const progressQuery = useListProgressNotes({ patient_id: numericId, size: 200 }, { query: { enabled: validId } });
  const createCondition = useCreateChartCondition();
  const updateCondition = useUpdateChartCondition();
  const deleteCondition = useDeleteChartCondition();
  const createProcedure = useCreatePatientProcedure();
  const createProgressNote = useCreateProgressNote();
  const createPlan = useCreateTreatmentPlan();
  const createPlanItem = useCreateTreatmentPlanItem();

  const plansQuery = useListTreatmentPlans({ patient_id: numericId, size: 200 }, { query: { enabled: validId } });
  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data]);
  // Shared provider directory — same list, order and labels as every other screen.
  const { providerRows: providers } = useProviderDirectory();

  // Timeline filter: when a from/to range is set, every charted source (conditions,
  // procedures, plan items, progress notes) is limited to that window.
  const [timelineFrom, setTimelineFrom] = useState('');
  const [timelineTo, setTimelineTo] = useState('');

  const conditions = useMemo<ChartConditionRead[]>(
    () => (conditionsQuery.data?.items ?? []).filter((c) => inRange(c.activity_date ?? c.created_at, timelineFrom, timelineTo)),
    [conditionsQuery.data, timelineFrom, timelineTo],
  );
  const procedures = useMemo<PatientProcedureRead[]>(
    () => (proceduresQuery.data?.items ?? []).filter((p) => inRange(p.date_of_service, timelineFrom, timelineTo)),
    [proceduresQuery.data, timelineFrom, timelineTo],
  );
  const materials = useMemo<ChartMaterialRead[]>(() => materialsQuery.data?.items ?? [], [materialsQuery.data]);

  // ---- UI state -----------------------------------------------------------
  const [paletteTab, setPaletteTab] = useState<ChartTab>('pre-existing');
  const [selection, setSelection] = useState<ActiveSelection | null>(null);
  const [lastSelection, setLastSelection] = useState<ActiveSelection | null>(null);
  const [view, setView] = useState('current');
  const [drawMode, setDrawMode] = useState(false);
  const [showXray, setShowXray] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [showConditions, setShowConditions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [historyTeeth, setHistoryTeeth] = useState<string[] | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [noteTooth, setNoteTooth] = useState<string | null>(null);
  const [pendingMaterial, setPendingMaterial] = useState<{ code: string; description: string } | null>(null);
  const [wholeMenu, setWholeMenu] = useState<{ code: string; label: string } | null>(null);
  const [rctPending, setRctPending] = useState(false);
  const [watchTooth, setWatchTooth] = useState<string | null>(null);
  const [watchDir, setWatchDir] = useState<string | null>(null);
  const [watchPos, setWatchPos] = useState({ x: 50, y: 30 });
  const [watchNotesOpen, setWatchNotesOpen] = useState(false);
  const [editWatch, setEditWatch] = useState<{ id: number; tooth: string; note: string } | null>(null);
  const [pendingDraw, setPendingDraw] = useState<{ strokes: Stroke[]; box: { w: number; h: number } } | null>(null);
  const [editRow, setEditRow] = useState<EditableCondition | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [referredOut, setReferredOut] = useState(false);
  const [codeMap, setCodeMap] = useState<Map<string, ProcedureCodeRead>>(new Map());
  const [adaModal, setAdaModal] = useState<{ teeth: string[]; surface: string | null; presetQuery?: string; presetLabel?: string } | null>(null);
  const [insuranceType, setInsuranceType] = useState<'primary' | 'secondary' | null>(null);
  const [gridMax, setGridMax] = useState(false);
  // Per-tab toolbar metadata (Completed = transaction date; Tx Plans = proposal
  // date, phase, hide-unaccepted) + the shared preferred provider/hygienist.
  const today = new Date().toISOString().slice(0, 10);
  const [tranDate, setTranDate] = useState(today);
  const [propDate, setPropDate] = useState(today);
  const [prefProvider, setPrefProvider] = useState('');
  const [prefHygienist, setPrefHygienist] = useState('');
  const [phase, setPhase] = useState('ALL');
  const [hideUnaccepted, setHideUnaccepted] = useState(true);

  useEffect(() => { loadProcedureCodes().then(setCodeMap).catch(() => {}); }, []);

  // Active treatment plan (default = highest), overridable by the plan selector.
  const currentPlan = useMemo(() => (planId ? plans.find((p) => p.id === planId) ?? activePlan(plans) : activePlan(plans)), [plans, planId]);
  const planItemsQuery = useListTreatmentPlanItems(
    { plan_id: currentPlan?.id, size: 200 },
    { query: { enabled: !!currentPlan } },
  );
  const planItems = useMemo<TreatmentPlanItemRead[]>(
    () => (planItemsQuery.data?.items ?? [])
      .filter((it) => (referredOut ? true : (it.status ?? '').toLowerCase() !== 'referred-out'))
      .filter((it) => (hideUnaccepted ? !/unaccept|propos|pending/i.test(it.status ?? '') : true))
      .filter((it) => (phase === 'ALL' ? true : String(it.priority) === phase))
      .filter((it) => inRange(it.created_at, timelineFrom, timelineTo)),
    [planItemsQuery.data, referredOut, hideUnaccepted, phase, timelineFrom, timelineTo],
  );
  // Phase options = the distinct priorities present on the active plan's items.
  const phaseOptions = useMemo(
    () => Array.from(new Set((planItemsQuery.data?.items ?? []).map((it) => it.priority))).sort((a, b) => a - b),
    [planItemsQuery.data],
  );
  const [settings, setSettings] = useState<ChartSettings>(() => {
    const s = loadChartSettings(numericId);
    return { ...s, dentition: s.dentition ?? defaultDentition(patient?.age) };
  });

  const updateSettings = (patch: Partial<ChartSettings>) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveChartSettings(numericId, next);
      return next;
    });

  // ---- Derived ------------------------------------------------------------
  const resolveMaterial = useMemo(() => materialMetaResolver(materials), [materials]);
  const byTooth = useMemo(() => toToothStates(conditions, resolveMaterial), [conditions, resolveMaterial]);
  const matName = (id: number | null | undefined) => (id != null ? materials.find((m) => m.id === id)?.name ?? '' : '');

  // Merged per-tooth overlay: pre-existing conditions always; completed procedures
  // + planned items overlaid when not on the Pre-existing tab (legacy aggregate view).
  const overlay = useMemo(() => {
    const merged = new Map<string, ToothState>();
    for (const [tooth, st] of byTooth) merged.set(tooth, { ...st, glyphs: [...st.glyphs] });
    if (paletteTab !== 'pre-existing') {
      const procG = buildOverlayGlyphs(procedures, 'completed', codeMap);
      const planG = buildOverlayGlyphs(planItems, 'tx-plan', codeMap);
      for (const src of [procG, planG]) {
        for (const [tooth, glyphs] of src) {
          const st = merged.get(tooth) ?? { surfaces: new Set(), surfaceGlyphs: new Map(), glyphs: [], missing: false, groups: new Set() };
          merged.set(tooth, { ...st, glyphs: [...st.glyphs, ...glyphs] });
        }
      }
    }
    return merged;
  }, [byTooth, procedures, planItems, paletteTab, codeMap]);

  const gridRows = useMemo<GridRow[]>(() => {
    const condRows: GridRow[] = conditions
      .filter((c) => !c.is_inactive && (c.condition_code ?? '').toUpperCase() !== 'NOTE')
      .map((c) => ({
        id: `c-${c.id}`,
        source: 'condition',
        type: (c.chart_as ?? 'condition').toUpperCase(),
        date: fmtDate(c.activity_date ?? c.created_at),
        status: c.is_inactive ? 'I' : 'A',
        code: c.condition_code ?? c.procedure_code ?? '',
        description: [c.description ?? c.condition_code ?? '', matName(c.material_id)].filter(Boolean).join(' · '),
        tooth: c.tooth ?? '',
        surface: c.surface ?? '',
        provider: c.provider_id ?? '',
        est_ins: '$0.00',
        fee: '$0.00',
        office: officeId != null ? `O${officeId}` : '',
        notes: c.notes ?? undefined,
        inactive: c.is_inactive,
      }));
    const procRows: GridRow[] = procedures.map((p) => ({
      id: `p-${p.id}`,
      source: 'procedure',
      type: 'COMPLETED',
      date: fmtDate(p.date_of_service),
      status: p.is_void ? 'V' : 'C',
      code: p.procedure_code,
      description: p.procedure_code,
      tooth: p.tooth ?? '',
      surface: p.surface ?? '',
      provider: p.provider_id ?? '',
      est_ins: money(p.insurance_estimate),
      fee: money(p.fee),
      office: `O${p.office_id}`,
    }));
    const planRows: GridRow[] = planItems.map((it) => ({
      id: `t-${it.id}`,
      source: 'tx-plan',
      type: 'TX-PLAN',
      date: fmtDate(it.created_at),
      status: (it.status ?? 'planned').slice(0, 1).toUpperCase(),
      code: it.procedure_code,
      description: it.description ?? codeMap.get(it.procedure_code)?.description ?? it.procedure_code,
      tooth: it.tooth ?? '',
      surface: it.surface ?? '',
      provider: it.diagnosed_by ?? '',
      est_ins: money(it.insurance_estimate),
      fee: money(it.fee),
      office: officeId != null ? `O${officeId}` : '',
    }));
    return [...condRows, ...procRows, ...planRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [conditions, procedures, planItems, officeId, materials, codeMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressRows = useMemo<ProgressNoteRow[]>(
    () =>
      (progressQuery.data?.items ?? [])
        .filter((p) => !p.is_deleted)
        .filter((p) => inRange(p.note_date ?? p.created_at, timelineFrom, timelineTo))
        .map((p) => ({ id: `pn-${p.id}`, date: fmtDate(p.note_date ?? p.created_at), note: p.notes ?? '', tooth: p.tooth ?? '' })),
    [progressQuery.data, timelineFrom, timelineTo],
  );

  // Saved freehand drawings persisted as progress notes (notes_html = stroke JSON).
  const savedStrokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    for (const p of progressQuery.data?.items ?? []) {
      if (p.is_deleted || !p.notes_html) continue;
      try {
        const parsed = JSON.parse(p.notes_html);
        if (parsed?.type === 'rx-draw' && Array.isArray(parsed.strokes)) out.push(...parsed.strokes);
      } catch { /* not a drawing note */ }
    }
    return out;
  }, [progressQuery.data]);

  const saveDraw = async (note: string) => {
    if (!pendingDraw || !validId) return;
    const { strokes, box } = pendingDraw;
    const text = note || 'Saved from Restorative charting';
    try {
      // Rasterize the drawing to a PNG and attach it to the patient (binary store).
      let doc_id: number | undefined;
      try {
        const blob = await strokesToPngBlob(strokes, box.w, box.h);
        if (blob) {
          const file = new File([blob], `restorative-drawing-${Date.now()}.png`, { type: 'image/png' });
          const doc = await uploadPatientDocument({
            file, patient_id: numericId, office_id: officeId,
            document_type: 'restorative-drawing', description: text,
          });
          doc_id = doc?.id;
        }
      } catch {
        // Attachment is best-effort — the progress note (with vector strokes) is the source of truth.
      }
      await createProgressNote.mutateAsync({
        data: {
          patient_id: numericId, office_id: officeId, note_date: new Date().toISOString().slice(0, 10),
          notes: text,
          notes_html: JSON.stringify({ type: 'rx-draw', strokes, doc_id }),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListProgressNotesQueryKey({ patient_id: numericId, size: 200 }) });
    } finally {
      setPendingDraw(null);
      setDrawMode(false);
    }
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListChartConditionsQueryKey(conditionsParams) });

  // ---- Selection ----------------------------------------------------------
  const selectZone = (id: string, area: ToothArea, root?: string) => {
    setShowConditions(false);
    if (area === 'root') {
      // Toggle a specific root into the selection (multi-root on a single tooth).
      setSelection((prev) => {
        if (prev && prev.area === 'root' && prev.teeth[0] === id) {
          const set = new Set(prev.roots ?? []);
          if (root) { if (set.has(root)) set.delete(root); else set.add(root); }
          const roots = [...set];
          return roots.length ? { area: 'root', teeth: [id], surfaces: new Set(), roots } : null;
        }
        return { area: 'root', teeth: [id], surfaces: new Set(), roots: root ? [root] : [] };
      });
      return;
    }
    setSelection((prev) => {
      if (prev && prev.area === area && area !== 'surface') {
        const has = prev.teeth.includes(id);
        const teeth = has ? prev.teeth.filter((t) => t !== id) : [...prev.teeth, id];
        return teeth.length ? { area, teeth, surfaces: new Set() } : null;
      }
      return { area, teeth: [id], surfaces: new Set() };
    });
  };

  const toggleSurface = (id: string, s: SurfaceKey) => {
    setShowConditions(false);
    setSelection((prev) => {
      if (prev && prev.area === 'surface' && prev.teeth[0] === id) {
        const next = new Set(prev.surfaces);
        if (next.has(s)) next.delete(s);
        else next.add(s);
        return next.size ? { area: 'surface', teeth: [id], surfaces: next } : null;
      }
      return { area: 'surface', teeth: [id], surfaces: new Set([s]) };
    });
  };

  const selectArch = (teeth: string[]) => {
    setShowConditions(false);
    setSelection({ area: 'whole', teeth: [...teeth], surfaces: new Set() });
  };
  const clearSelection = () => {
    if (selection) setLastSelection(selection);
    setSelection(null);
    setShowConditions(false);
  };
  const restoreLastSelection = () => {
    if (lastSelection) setSelection({ ...lastSelection, surfaces: new Set(lastSelection.surfaces) });
  };

  // ---- Apply --------------------------------------------------------------
  const applyCondition = async (
    code: string,
    description: string,
    opts?: { materialId?: number | null; grade?: string | null; sub?: string | null; rctfill?: string | null },
  ) => {
    if (!selection || !validId) return;
    const surfaceStr = selection.area === 'surface' ? orderedSurfaces(selection.surfaces) : null;
    // One condition per (tooth × selected root); roots empty/non-root → a single row per tooth.
    const rootTargets = selection.area === 'root' && selection.roots?.length ? selection.roots : [null];
    const targets = selection.teeth.flatMap((tooth) => rootTargets.map((root) => ({ tooth, root })));
    try {
      await Promise.all(
        targets.map(({ tooth, root }) =>
          createCondition.mutateAsync({
            data: {
              patient_id: numericId, office_id: officeId, tooth,
              surface: surfaceStr, area: selection.area,
              region: encodeRegion({ grade: opts?.grade, sub: opts?.sub, rctfill: opts?.rctfill, root }),
              material_id: opts?.materialId ?? null, condition_code: code,
              chart_as: CHART_AS[paletteTab], description,
              activity_date: new Date().toISOString().slice(0, 10), is_inactive: false,
            },
          }),
        ),
      );
      invalidate();
      setLastSelection(selection);
      setSelection(null);
      setShowConditions(false);
    } catch {
      /* surfaced via createCondition.isError */
    }
  };

  // Route a chosen code through the right secondary step (legacy two-step flows).
  const requestApply = (code: string, label: string) => {
    if (!selection) return;
    const c = code.toUpperCase();
    if (selection.area === 'whole' && WHOLE_TOOTH_MENU_CODES.has(c)) {
      setWholeMenu({ code: c, label });
      return;
    }
    if (c === 'WATCH') {
      setWatchDir(null);
      setWatchNotesOpen(false);
      setWatchPos({ x: 50, y: 30 });
      setWatchTooth(selection.teeth[0] ?? null);
      return;
    }
    if (c === 'RCT' && selection.area === 'root') {
      setRctPending(true);
      return;
    }
    if (isMaterialAware(c) && materials.length > 0) {
      setPendingMaterial({ code: c, description: label });
      return;
    }
    const grade = lookupCondition(c)?.grade_aware ? promptGrade() : null;
    applyCondition(c, label, { grade });
  };

  // ---- Tx Plans / Completed: ADA code pop-out ----------------------------
  const planRef = useRef<string | null>(null);
  const ensurePlan = async (): Promise<string> => {
    if (currentPlan) return currentPlan.id;
    if (planRef.current) return planRef.current;
    const id = genId();
    await createPlan.mutateAsync({ data: { id, patient_id: numericId, office_id: officeId, name: 'Treatment Plan 1', status: 'active' } });
    planRef.current = id;
    setPlanId(id);
    queryClient.invalidateQueries({ queryKey: ['listTreatmentPlans'] });
    return id;
  };

  const openAda = (presetQuery: string, presetLabel: string) => {
    if (!selection) return;
    const t = selection.teeth[0]!;
    const glyphs = overlay.get(t)?.glyphs;
    if (/implant crown/i.test(presetLabel) && !toothHasCode(glyphs, /IMPLANT/)) {
      window.alert('Document an Implant Post first.');
      return;
    }
    if (/^implant/i.test(presetLabel) && !toothHasCode(glyphs, /(MISSING|EXTRACT)/)) {
      window.alert('Mark the tooth as missing or plan an extraction before charting an implant.');
      return;
    }
    setAdaModal({
      teeth: selection.teeth,
      surface: selection.area === 'surface' ? orderedSurfaces(selection.surfaces) : null,
      presetQuery: presetLabel === 'ADA Codes' ? '' : presetQuery,
      presetLabel: presetLabel === 'ADA Codes' ? undefined : presetLabel,
    });
  };

  const onAddAda = async (e: AdaEntry) => {
    if (paletteTab === 'completed') {
      await createProcedure.mutateAsync({
        data: {
          id: genId(), patient_id: numericId, office_id: officeId ?? 0, procedure_code: e.procedure_code,
          date_of_service: tranDate, provider_id: e.provider_id || prefProvider || '',
          tooth: e.tooth, surface: e.surface || null, fee: e.fee, insurance_estimate: e.insurance_estimate,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListPatientProceduresQueryKey({ patient_id: numericId, size: 200 }) });
    } else {
      const plan_id = await ensurePlan();
      await createPlanItem.mutateAsync({
        data: {
          id: genId(), plan_id, procedure_code: e.procedure_code, description: e.description,
          tooth: e.tooth, surface: e.surface || null, fee: e.fee, insurance_estimate: e.insurance_estimate,
          status: 'diagnosed', priority: phase === 'ALL' ? 1 : Number(phase) || 1,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListTreatmentPlanItemsQueryKey({ plan_id, size: 200 }) });
    }
  };

  const applyPaletteItem = (item: PaletteItem) => {
    if (item.action === 'open-legend') { setShowLegend(true); return; }
    if (item.action === 'open-conditions') { if (selection) setShowConditions((v) => !v); return; }
    if (item.action === 'open-explosion') { if (selection) openAda('', 'Explosion Code'); return; }
    // M06: on Completed / Tx Plans, every tool routes through the ADA pop-out.
    if (paletteTab !== 'pre-existing') {
      if (!selection) return;
      openAda(item.label, item.label);
      return;
    }
    if (item.condition_code) requestApply(item.condition_code, item.label);
  };
  const applyConditionDef = (def: ConditionDef) => requestApply(def.code, def.label);

  const onPickMaterial = (materialId: number | null) => {
    if (!pendingMaterial) return;
    applyCondition(pendingMaterial.code, pendingMaterial.description, { materialId });
    setPendingMaterial(null);
  };

  const applyTemplate = async (template: RestorationTemplate) => {
    if (!validId) return;
    const rows = expandTemplate(
      template,
      { patient_id: numericId, office_id: officeId, activity_date: new Date().toISOString().slice(0, 10), chart_as: CHART_AS[paletteTab] },
      materialIdByNameResolver(materials),
    );
    try {
      await Promise.all(rows.map((data) => createCondition.mutateAsync({ data })));
      invalidate();
      setShowTemplates(false);
      setSelection(null);
    } catch { /* surfaced */ }
  };

  const closeWatch = () => { setWatchTooth(null); setWatchDir(null); setWatchNotesOpen(false); };
  const saveWatch = async (note: string) => {
    if (!watchTooth || !watchDir || !validId) return;
    try {
      await createCondition.mutateAsync({
        data: {
          patient_id: numericId, office_id: officeId, tooth: watchTooth, area: 'whole',
          condition_code: 'WATCH', description: 'Watch', chart_as: CHART_AS[paletteTab],
          region: encodeRegion({ dir: watchDir, wx: watchPos.x, wy: watchPos.y }),
          notes: note || null, activity_date: new Date().toISOString().slice(0, 10), is_inactive: false,
        },
      });
      invalidate();
    } finally {
      closeWatch();
      setSelection(null);
    }
  };

  // Edit / delete a saved Watch arrow (clicked on the tooth).
  const saveEditWatch = async (note: string) => {
    if (!editWatch) return;
    try {
      await updateCondition.mutateAsync({ itemId: editWatch.id, data: { notes: note || null } });
      invalidate();
    } finally {
      setEditWatch(null);
    }
  };
  const deleteEditWatch = async () => {
    if (!editWatch) return;
    try {
      await deleteCondition.mutateAsync({ itemId: editWatch.id });
      invalidate();
    } finally {
      setEditWatch(null);
    }
  };

  const saveNote = async (tooth: string, note: string) => {
    const existing = conditions.filter((c) => !c.is_inactive && c.tooth === tooth && (c.condition_code ?? '').toUpperCase() === 'NOTE');
    try {
      await Promise.all(existing.map((c) => deleteCondition.mutateAsync({ itemId: c.id })));
      if (note) {
        await createCondition.mutateAsync({
          data: noteCreateBody(tooth, note, { patient_id: numericId, office_id: officeId, activity_date: new Date().toISOString().slice(0, 10) }),
        });
      }
      invalidate();
    } finally {
      setNoteTooth(null);
    }
  };


  const openEdit = (rowId: string) => {
    const c = conditions.find((x) => `c-${x.id}` === rowId);
    if (!c) return;
    setEditRow({
      id: c.id, description: c.description ?? c.condition_code ?? '', notes: c.notes ?? '',
      activity_date: (c.activity_date ?? c.created_at ?? '').slice(0, 10), is_inactive: c.is_inactive,
    });
  };
  const saveEdit = async (patch: { notes: string; activity_date: string; is_inactive: boolean }) => {
    if (!editRow) return;
    try {
      await updateCondition.mutateAsync({ itemId: editRow.id, data: patch });
      invalidate();
    } finally {
      setEditRow(null);
    }
  };

  const deleteSelectedRow = () => {
    if (!selectedRowId) return;
    const row = gridRows.find((r) => r.id === selectedRowId);
    if (!row || row.source !== 'condition') return;
    if (!window.confirm('Deleting this charted item may affect related records. Delete it?')) return;
    deleteCondition.mutate({ itemId: Number(row.id.replace('c-', '')) }, { onSuccess: () => { invalidate(); setSelectedRowId(null); } });
  };

  // ---- Derived view helpers ----------------------------------------------
  const loading = conditionsQuery.isLoading || proceduresQuery.isLoading;
  const figureArea = (id: string): ToothArea | null =>
    selection && selection.area !== 'surface' && selection.teeth.includes(id) ? selection.area : null;
  const figureRoots = (id: string): string[] =>
    selection?.area === 'root' && selection.teeth.includes(id) ? selection.roots ?? [] : [];
  const surfaceSel = (id: string): Set<SurfaceKey> =>
    selection?.area === 'surface' && selection.teeth[0] === id ? selection.surfaces : new Set();

  const upper = upperTeeth(settings.dentition).filter((t) => settings.wisdom_visible || isPrimaryId(t) || !WISDOM_TEETH.has(Number(t)));
  const lower = lowerTeeth(settings.dentition).filter((t) => settings.wisdom_visible || isPrimaryId(t) || !WISDOM_TEETH.has(Number(t)));
  // Full-arch selection (all upper or all lower whole teeth) — gates the Denture tool.
  const isArchSelection =
    !!selection &&
    selection.area === 'whole' &&
    ((upper.length > 0 && upper.every((t) => selection.teeth.includes(t))) ||
      (lower.length > 0 && lower.every((t) => selection.teeth.includes(t))));

  const historyRows = historyTeeth ? gridRows.filter((r) => historyTeeth.includes(r.tooth)) : [];
  const historyProgress = historyTeeth ? progressRows.filter((p) => historyTeeth.includes(p.tooth)) : [];

  // Active module colour (blue=pre-existing, green=completed, red=tx-plans) —
  // drives every selection highlight so you can tell which module you're charting in.
  const selColor = SOURCE_COLOR[CHART_AS[paletteTab] as ChartSource];

  const archProps = {
    selColor,
    byTooth: overlay, figureArea, figureRoots, surfaceSel,
    wholeSelected: (id: string) => selection?.area === 'whole' && selection.teeth.includes(id),
    blockSelected: (id: string) => !!selection?.teeth.includes(id),
    hoveredTooth,
    onHoverTooth: setHoveredTooth,
    onSelectZone: selectZone, onToggleSurface: toggleSurface,
    numberingSystem: settings.numbering_system, occlusalVisible: settings.occlusal_visible, edentulous: settings.edentulous,
    watchPlacement: (id: string) =>
      watchTooth === id && watchDir != null && !watchNotesOpen
        ? { dir: watchDir, x: watchPos.x, y: watchPos.y, onMove: (x: number, y: number) => setWatchPos({ x, y }) }
        : null,
    onWatchClick: (id: string, g: ToothGlyph) => {
      if (g.id != null) setEditWatch({ id: g.id, tooth: id, note: g.note ?? '' });
    },
  };

  // ---- Render -------------------------------------------------------------
  return (
    <div className="flex flex-col bg-slate-50" style={{ minHeight: 'calc(100vh - 260px)' }}>
      <div className="flex items-center px-5 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(180deg,#2566a8,#16406e)' }}>
        Restorative Chart
        <span className="ml-3 rounded bg-white/15 px-2 py-0.5 text-xs font-normal">{patient?.name}</span>
        <div className="ml-auto flex items-center gap-3 text-xs font-normal">
          <button onClick={() => setInsuranceType('primary')} className="text-cyan-200 underline-offset-2 hover:underline">Prim. Ins</button>
          <button onClick={() => setInsuranceType('secondary')} className="text-cyan-200 underline-offset-2 hover:underline">Sec. Ins</button>
        </div>
      </div>

      <ChartToolbar
        hasSelection={!!selection}
        onClearSelection={clearSelection}
        onLastSelection={restoreLastSelection}
        dentition={settings.dentition}
        onDentitionChange={(d: DentitionMode) => updateSettings({ dentition: d })}
        view={view}
        onViewChange={setView}
        drawMode={drawMode}
        onToggleDrawMode={() => setDrawMode((v) => !v)}
        showXray={showXray}
        onToggleXray={() => setShowXray((v) => !v)}
        canToothHistory={!!selection?.teeth.length}
        onToothHistory={() => selection?.teeth.length && setHistoryTeeth(selection.teeth)}
        lockSelectionTools={paletteTab === 'tx-plans'}
        onOpenAda={() => { if (selection) openAda('', 'ADA Code'); }}
        timelineFrom={timelineFrom}
        timelineTo={timelineTo}
        onTimelineChange={(from, to) => { setTimelineFrom(from); setTimelineTo(to); }}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 bg-[#e8f0f8] px-4 py-1.5 text-xs text-slate-700">
        <span className="text-sm font-semibold text-slate-700">{TAB_TITLE[paletteTab]}</span>

        {paletteTab === 'completed' && (
          <>
            <label className="flex items-center gap-1">Tran. Dt.
              <input type="date" value={tranDate} onChange={(e) => setTranDate(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1" />
            </label>
            <ProviderSelect value={prefProvider} onChange={setPrefProvider} providers={providers} placeholder="--Preferred Provider--" />
            <ProviderSelect value={prefHygienist} onChange={setPrefHygienist} providers={providers} placeholder="--Preferred Hygienist--" />
          </>
        )}

        {paletteTab === 'tx-plans' && (
          <>
            <label className="flex items-center gap-1">Prop. Dt.
              <input type="date" value={propDate} onChange={(e) => setPropDate(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1" />
            </label>
            <label className="flex items-center gap-1">Tx Plan ID
              <select value={currentPlan?.id ?? ''} onChange={(e) => setPlanId(e.target.value)} title="Treatment plan" className="rounded border border-slate-300 bg-white px-2 py-1">
                {plans.length === 0 && <option value="">1</option>}
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">Phase
              <select value={phase} onChange={(e) => setPhase(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1">
                <option value="ALL">ALL</option>
                {phaseOptions.map((p) => <option key={p} value={String(p)}>{p}</option>)}
              </select>
            </label>
            <ProviderSelect value={prefProvider} onChange={setPrefProvider} providers={providers} placeholder="--Preferred Provider--" />
            <ProviderSelect value={prefHygienist} onChange={setPrefHygienist} providers={providers} placeholder="--Preferred Hygienist--" />
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={referredOut} onChange={(e) => setReferredOut(e.target.checked)} /> Referred Out
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={hideUnaccepted} onChange={(e) => setHideUnaccepted(e.target.checked)} /> Hide Unaccepted
            </label>
            <button onClick={() => navigate('/scheduler')} className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50">New Appt.</button>
            <button onClick={() => navigate(`/patient/${patientId}/ledger`)} className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50">Post…</button>
            <button onClick={() => setReferredOut(true)} title="Mark plan items referred out" className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium hover:bg-slate-50">Refer To</button>
          </>
        )}

        <button onClick={deleteSelectedRow} disabled={!selectedRowId || deleteCondition.isPending} className="ml-auto flex items-center gap-1.5 rounded border border-rose-300 bg-white px-3 py-1 font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 6h10M8 6V4h4v2M6 6l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Delete…
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left column: chart on top, transaction table below — both the chart's width. */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-x-auto p-3">
            <div className="relative">
              <Arch teeth={upper} onSelectArch={() => selectArch(upper)} numbersFirst {...archProps} />
              <div className="h-2" />
              <Arch teeth={lower} onSelectArch={() => selectArch(lower)} numbersFirst={false} {...archProps} />

              {/* Saved freehand drawings (read-only overlay). */}
              {savedStrokes.length > 0 && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {savedStrokes.map((st, i) => (
                    <polyline key={i} points={st.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} fill="none" stroke={st.color} strokeWidth={st.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              )}

              {/* Live draw mode. */}
              {drawMode && <DrawLayer onSave={(s, box) => setPendingDraw({ strokes: s, box })} onCancel={() => setDrawMode(false)} />}
            </div>
            {createCondition.isError && <p className="mt-2 text-xs text-rose-600">Failed to save condition. Please try again.</p>}
          </div>

          {/* Bottom transaction table — the Maximize button lives in the header (front). */}
          <div className="shrink-0">
            <ChartGrid rows={gridRows} selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onRowDoubleClick={openEdit} loading={loading} onMaximize={() => setGridMax(true)} />
          </div>

          {showConditions && selection && (
            <ConditionsPopup selection={selection} onApply={applyConditionDef} onClose={() => setShowConditions(false)} />
          )}

          {/* Maximized table overlays the chart column (▼ to restore). */}
          {gridMax && (
            <div className="absolute inset-0 z-20 flex flex-col bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                Transaction Table
                <button onClick={() => setGridMax(false)} title="Restore chart" className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l5 5 5-5" /></svg> Restore Chart
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChartGrid rows={gridRows} selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onRowDoubleClick={openEdit} loading={loading} maxHeightPx={10000} />
              </div>
            </div>
          )}
        </div>

        {/* Right: condition palette — full height, down to the bottom. */}
        <div className="w-[320px] shrink-0">
          <ConditionPalette tab={paletteTab} onTabChange={setPaletteTab} onApply={applyPaletteItem} disabled={!selection} selectionArea={selection?.area ?? null} isArchSelection={isArchSelection} />
        </div>
      </div>

      {showLegend && <LegendOverlay onClose={() => setShowLegend(false)} />}
      {historyTeeth && <ToothHistoryPopup teeth={historyTeeth} rows={historyRows} progressNotes={historyProgress} onClose={() => setHistoryTeeth(null)} />}
      {showTemplates && <TemplatePicker onApply={applyTemplate} onClose={() => setShowTemplates(false)} />}
      {pendingMaterial && (
        <MaterialPicker conditionLabel={pendingMaterial.description} materials={materials} onPick={onPickMaterial} onClose={() => setPendingMaterial(null)} />
      )}
      {wholeMenu && (
        <WholeToothMenu
          title={wholeMenu.label}
          options={WHOLE_TOOTH_SUBOPTIONS[wholeMenu.code] ?? [{ label: 'Permanent', sub: null }]}
          onPick={(sub) => { applyCondition(wholeMenu.code, wholeMenu.label, { sub }); setWholeMenu(null); }}
          onClose={() => setWholeMenu(null)}
        />
      )}
      {rctPending && (
        <RctMaterialPicker
          materials={materials}
          onPick={({ materialId, rctfill }) => { applyCondition('RCT', 'Root Canal', { materialId, rctfill }); setRctPending(false); }}
          onClose={() => setRctPending(false)}
        />
      )}
      {watchTooth && watchDir == null && (
        <WatchArrowMenu tooth={watchTooth} onPick={(dir) => setWatchDir(dir)} onClose={() => setWatchTooth(null)} />
      )}
      {watchTooth && watchDir != null && !watchNotesOpen && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2 shadow-2xl">
          <span className="text-xs text-slate-600">Drag the red arrow onto tooth #{watchTooth}, then add notes.</span>
          <button onClick={() => setWatchNotesOpen(true)} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Add Watch Notes</button>
          <button onClick={closeWatch} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      )}
      {watchTooth && watchDir != null && watchNotesOpen && (
        <WatchEditor tooth={watchTooth} onSave={saveWatch} onClose={closeWatch} />
      )}
      {editWatch && (
        <WatchEditor tooth={editWatch.tooth} initialNote={editWatch.note} onSave={saveEditWatch} onDelete={deleteEditWatch} onClose={() => setEditWatch(null)} />
      )}
      {pendingDraw && (
        <SaveDrawModal saving={createProgressNote.isPending} onSave={saveDraw} onClose={() => setPendingDraw(null)} />
      )}
      {noteTooth != null && (
        <ToothNotePopup tooth={noteTooth} initialNote={byTooth.get(noteTooth)?.note ?? ''} onSave={(note) => saveNote(noteTooth, note)} onClose={() => setNoteTooth(null)} />
      )}
      {editRow && <EditConditionModal condition={editRow} saving={updateCondition.isPending} onSave={saveEdit} onClose={() => setEditRow(null)} />}
      {adaModal && (
        <AddAdaCodeModal
          mode={paletteTab === 'completed' ? 'completed' : 'tx-plans'}
          teeth={adaModal.teeth}
          surface={adaModal.surface}
          providers={providers}
          defaultProviderId={prefProvider}
          presetQuery={adaModal.presetQuery}
          presetLabel={adaModal.presetLabel}
          onAdd={onAddAda}
          onClose={() => { setAdaModal(null); setSelection(null); }}
        />
      )}
      {insuranceType && (
        <InsuranceBenefitsModal patientId={numericId} insuranceType={insuranceType} onTypeChange={setInsuranceType} onClose={() => setInsuranceType(null)} />
      )}
    </div>
  );
}

const WISDOM_TEETH = new Set([1, 16, 17, 32]);

function displayLabel(id: string, system: NumberingSystem): string {
  return isPrimaryId(id) ? id : toothLabel(Number(id), system);
}

// ---- Arch ----------------------------------------------------------------
interface ArchProps {
  teeth: string[];
  /** Active module colour (blue/green/red) for selection highlights. */
  selColor: string;
  byTooth: Map<string, ToothState>;
  figureArea: (id: string) => ToothArea | null;
  figureRoots: (id: string) => string[];
  surfaceSel: (id: string) => Set<SurfaceKey>;
  wholeSelected: (id: string) => boolean;
  /** Tooth is part of the active selection → outline the whole column as one block. */
  blockSelected: (id: string) => boolean;
  hoveredTooth: string | null;
  onHoverTooth: (id: string | null) => void;
  onSelectZone: (id: string, area: ToothArea, root?: string) => void;
  onToggleSurface: (id: string, s: SurfaceKey) => void;
  onSelectArch: () => void;
  numberingSystem: NumberingSystem;
  occlusalVisible: boolean;
  edentulous: boolean;
  watchPlacement: (id: string) => { dir: string; x: number; y: number; onMove: (x: number, y: number) => void } | null;
  onWatchClick: (id: string, g: ToothGlyph) => void;
  numbersFirst: boolean;
}

const COL = 72; // tooth column width (wider teeth)

function Arch(props: ArchProps) {
  const { teeth, selColor, byTooth, figureArea, figureRoots, surfaceSel, wholeSelected, blockSelected, hoveredTooth, onHoverTooth, onSelectZone, onToggleSurface, onSelectArch, numberingSystem, occlusalVisible, edentulous, watchPlacement, onWatchClick, numbersFirst } = props;
  const EMPTY: ToothState = { surfaces: new Set(), surfaceGlyphs: new Map(), glyphs: [], missing: false, groups: new Set() };
  // Selected whole-tooth → block outline in the active module's colour across the
  // column's 3 cells; hovered tooth → a light "tooltip" rectangle. Cells touch so
  // the borders join seamlessly.
  const cellStyle = (id: string, pos: 'top' | 'mid' | 'bottom'): React.CSSProperties => {
    const sel = blockSelected(id);
    const hov = hoveredTooth === id;
    if (!sel && !hov) return {};
    const c = sel ? selColor : '#94a3b8';
    const b = `2px solid ${c}`;
    return {
      boxSizing: 'border-box', // borders draw INSIDE the width → rows stay aligned, no gap
      borderLeft: b,
      borderRight: b,
      borderTop: pos === 'top' ? b : undefined,
      borderBottom: pos === 'bottom' ? b : undefined,
      background: sel ? rgba(selColor, 0.06) : 'rgba(148,163,184,0.10)',
    };
  };
  const toothPos: 'mid' | 'bottom' = numbersFirst ? 'mid' : 'bottom';
  const surfPos: 'mid' | 'bottom' = numbersFirst ? 'bottom' : 'mid';
  // Pink gingiva covers only the root half (top for upper, bottom for lower).
  const rootBand = numbersFirst
    ? 'linear-gradient(180deg,#f3bcbc 0 54%, transparent 54% 100%)'
    : 'linear-gradient(180deg,transparent 0 46%, #f1aeae 46% 100%)';

  // Vertical green midline where the arch crosses the dental midline (8|9, 25|24).
  const midIndex = Math.max(0, teeth.findIndex((id) => toothSide(id) === 'left'));
  const Mid = () => <div style={{ width: 3, alignSelf: 'stretch', background: '#16a34a', margin: '0 3px' }} />;

  const hov = (id: string) => ({ onMouseEnter: () => onHoverTooth(id), onMouseLeave: () => onHoverTooth(null) });

  const numbers = (
    <div className="flex items-stretch">
      <ArchButton onClick={onSelectArch} />
      {teeth.map((id, idx) => (
        <Fragment key={id}>
          {idx === midIndex && <Mid />}
          <div className="mx-0.5 flex-1" style={{ minWidth: COL, ...cellStyle(id, 'top') }} {...hov(id)}>
            <button
              onClick={() => onSelectZone(id, 'whole')}
              className="w-full rounded-sm border py-0.5 text-center text-[11px] font-semibold"
              style={{ borderColor: wholeSelected(id) ? selColor : '#cbd5e1', background: wholeSelected(id) ? rgba(selColor, 0.16) : 'linear-gradient(180deg,#f8fafc,#e2e8f0)', color: '#475569' }}
            >
              {displayLabel(id, numberingSystem)}
            </button>
          </div>
        </Fragment>
      ))}
    </div>
  );

  const toothRow = (
    <div className="flex" style={{ background: rootBand }}>
      <div style={{ width: 18, flexShrink: 0 }} />
      {teeth.map((id, idx) => {
        const st = byTooth.get(id) ?? EMPTY;
        const a = toothAnatomy(id);
        return (
          <Fragment key={id}>
            {idx === midIndex && <Mid />}
            <div
              className="mx-0.5 flex flex-1 cursor-pointer justify-center"
              style={{ minWidth: COL, ...cellStyle(id, toothPos) }}
              title={`Tooth ${id} — click the surround to select the whole tooth`}
              onClick={() => onSelectZone(id, 'whole')}
              {...hov(id)}
            >
              <ToothFigure
                id={id}
                type={a.type}
                arch={a.arch}
                rootLabels={a.rootLabels}
                selectedArea={figureArea(id)}
                selectedRoots={figureRoots(id)}
                glyphs={st.glyphs}
                missing={st.missing || edentulous}
                hasNote={!!st.note}
                selColor={selColor}
                onSelectSegment={onSelectZone}
                watchPlacement={watchPlacement(id)}
                onWatchClick={onWatchClick}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  const surfaceRow = occlusalVisible ? (
    <div className="flex items-center">
      <div style={{ width: 18, flexShrink: 0 }} />
      {teeth.map((id, idx) => {
        const st = byTooth.get(id) ?? EMPTY;
        const meta = toothMeta(id);
        // const big = idx < 3 || idx >= teeth.length - 3;
        const big = true;
        return (
          <Fragment key={id}>
            {idx === midIndex && <Mid />}
            <div className="mx-0.5 flex flex-1 justify-center py-1" style={{ minWidth: COL, ...cellStyle(id, surfPos) }} {...hov(id)}>
              <SurfaceSelector id={id} mesialOnRight={meta.mesialOnRight} posterior={meta.posterior} selected={surfaceSel(id)} surfaceGlyphs={st.surfaceGlyphs} onToggle={onToggleSurface} selColor={selColor} size={big ? 42 : 32} />
            </div>
          </Fragment>
        );
      })}
    </div>
  ) : null;

  // Upper: numbers → teeth → circles. Lower: numbers → circles → teeth.
  return numbersFirst ? <div>{numbers}{toothRow}{surfaceRow}</div> : <div>{numbers}{surfaceRow}{toothRow}</div>;
}

function ProviderSelect({ value, onChange, providers, placeholder }: { value: string; onChange: (v: string) => void; providers: ProviderRead[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title={placeholder} className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700">
      <option value="">{placeholder}</option>
      {providers.map((p) => (
        <option key={p.id} value={p.id}>{p.name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.id}</option>
      ))}
    </select>
  );
}

function ArchButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Select arch" className="mr-0.5 flex w-[16px] items-center justify-center rounded-sm bg-slate-300 hover:bg-blue-300" style={{ minWidth: 16 }}>
      <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,1 9,9 1,9" fill="#475569" /></svg>
    </button>
  );
}

// ---- helpers --------------------------------------------------------------
function promptGrade(): string | null {
  const g = window.prompt('Mobility grade (m1 / m2 / m3):', 'm1');
  return g ? g.trim().toLowerCase() : null;
}
function fmtDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}
/** Timeline range test on a YYYY-MM-DD(THH:..) date string; empty bounds = no filter. */
function inRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  const d = (iso ?? '').slice(0, 10);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
function money(v?: string | null): string {
  if (v == null) return '$0.00';
  const n = Number(v);
  return Number.isNaN(n) ? `$${v}` : `$${n.toFixed(2)}`;
}
function orderedSurfaces(set: Set<SurfaceKey>): string {
  const order: SurfaceKey[] = ['M', 'O', 'I', 'D', 'B', 'F', 'L'];
  return order.filter((k) => set.has(k)).join('');
}
