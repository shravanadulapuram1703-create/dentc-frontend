import { useEffect, useMemo, useRef, useState } from 'react';
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
  getListChartConditionsQueryKey,
  getListPatientProceduresQueryKey,
} from '@/api/generated/endpoints/clinical/clinical';
import { useListChartMaterials } from '@/api/generated/endpoints/procedures/procedures';
import {
  useListTreatmentPlans,
  useCreateTreatmentPlan,
  useListTreatmentPlanItems,
  useCreateTreatmentPlanItem,
  getListTreatmentPlanItemsQueryKey,
} from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { useListProviders } from '@/api/generated/endpoints/organization/organization';
import type { ChartConditionRead, ChartMaterialRead, PatientProcedureRead, ProviderRead, TreatmentPlanItemRead } from '@/api/generated/model';
import AddAdaCodeModal, { type AdaEntry } from './AddAdaCodeModal';
import InsuranceBenefitsModal from './InsuranceBenefitsModal';
import { activePlan, genId, buildOverlayGlyphs, toothHasCode } from './txPlanModel';
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
import EditConditionModal, { type EditableCondition } from './EditConditionModal';
import { isMaterialAware, lookupCondition, type ConditionDef } from './conditionTaxonomy';
import { toToothStates, expandTemplate, noteCreateBody, encodeRegion, type ToothState } from './chartModel';
import {
  loadChartSettings, saveChartSettings, materialMetaResolver, materialIdByNameResolver, type ChartSettings,
} from './restorativeService';
import { toothLabel, type NumberingSystem } from './numbering';
import {
  upperTeeth, lowerTeeth, toothMeta, defaultDentition, isMultiRooted, isPrimaryId, type DentitionMode,
} from './dentition';
import type { RestorationTemplate } from './restorationTemplates';
import type { ActiveSelection, ChartTab, GridRow, PaletteItem, ToothArea } from './types';

interface OutletCtx {
  patient: { id: string; name: string; officeId?: string; age?: number };
}

const HEADER_TABS = [
  { label: 'Restorative Chart', route: 'restorative', active: true },
  { label: 'Perio Chart', route: 'perio' },
  { label: 'X-Ray', route: 'imaging' },
  { label: 'Progress Notes', route: 'overview' },
  { label: 'Treatment Plan', route: 'treatment' },
  { label: 'Medical History', route: 'overview' },
];

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
  IMPACTED: [{ label: 'Permanent', sub: null }],
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
  const createPlan = useCreateTreatmentPlan();
  const createPlanItem = useCreateTreatmentPlanItem();

  const plansQuery = useListTreatmentPlans({ patient_id: numericId, size: 200 }, { query: { enabled: validId } });
  const providersQuery = useListProviders({ size: 200 });
  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data]);
  const providers = useMemo<ProviderRead[]>(() => providersQuery.data?.items ?? [], [providersQuery.data]);

  const conditions = useMemo<ChartConditionRead[]>(() => conditionsQuery.data?.items ?? [], [conditionsQuery.data]);
  const procedures = useMemo<PatientProcedureRead[]>(() => proceduresQuery.data?.items ?? [], [proceduresQuery.data]);
  const materials = useMemo<ChartMaterialRead[]>(() => materialsQuery.data?.items ?? [], [materialsQuery.data]);

  // ---- UI state -----------------------------------------------------------
  const [paletteTab, setPaletteTab] = useState<ChartTab>('pre-existing');
  const [selection, setSelection] = useState<ActiveSelection | null>(null);
  const [lastSelection, setLastSelection] = useState<ActiveSelection | null>(null);
  const [rootScope, setRootScope] = useState<'all' | 'single'>('single');
  const [view, setView] = useState('current');
  const [drawMode, setDrawMode] = useState(false);
  const [showXray, setShowXray] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showConditions, setShowConditions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [historyTeeth, setHistoryTeeth] = useState<string[] | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [noteTooth, setNoteTooth] = useState<string | null>(null);
  const [pendingMaterial, setPendingMaterial] = useState<{ code: string; description: string } | null>(null);
  const [wholeMenu, setWholeMenu] = useState<{ code: string; label: string } | null>(null);
  const [rctPending, setRctPending] = useState(false);
  const [watchTooth, setWatchTooth] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<EditableCondition | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [referredOut, setReferredOut] = useState(false);
  const [codeMap, setCodeMap] = useState<Map<string, ProcedureCodeRead>>(new Map());
  const [adaModal, setAdaModal] = useState<{ teeth: string[]; surface: string | null; presetQuery?: string; presetLabel?: string } | null>(null);
  const [insuranceType, setInsuranceType] = useState<'primary' | 'secondary' | null>(null);

  useEffect(() => { loadProcedureCodes().then(setCodeMap).catch(() => {}); }, []);

  // Active treatment plan (default = highest), overridable by the plan selector.
  const currentPlan = useMemo(() => (planId ? plans.find((p) => p.id === planId) ?? activePlan(plans) : activePlan(plans)), [plans, planId]);
  const planItemsQuery = useListTreatmentPlanItems(
    { plan_id: currentPlan?.id, size: 200 },
    { query: { enabled: !!currentPlan } },
  );
  const planItems = useMemo<TreatmentPlanItemRead[]>(
    () => (planItemsQuery.data?.items ?? []).filter((it) => (referredOut ? true : (it.status ?? '').toLowerCase() !== 'referred-out')),
    [planItemsQuery.data, referredOut],
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
          const st = merged.get(tooth) ?? { surfaces: new Set(), glyphs: [], missing: false, groups: new Set() };
          merged.set(tooth, { ...st, glyphs: [...st.glyphs, ...glyphs] });
        }
      }
    }
    return merged;
  }, [byTooth, procedures, planItems, paletteTab, codeMap]);

  const gridRows = useMemo<GridRow[]>(() => {
    const condRows: GridRow[] = conditions
      .filter((c) => (c.condition_code ?? '').toUpperCase() !== 'NOTE')
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
        .map((p) => ({ id: `pn-${p.id}`, date: fmtDate(p.note_date ?? p.created_at), note: p.notes ?? '', tooth: p.tooth ?? '' })),
    [progressQuery.data],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListChartConditionsQueryKey(conditionsParams) });

  // ---- Selection ----------------------------------------------------------
  const selectZone = (id: string, area: ToothArea) => {
    setShowConditions(false);
    if (area === 'root') {
      if (isMultiRooted(id)) {
        setRootScope(window.confirm('This tooth has multiple roots. Apply to ALL roots?\n\nOK = all roots · Cancel = a specific root') ? 'all' : 'single');
      } else {
        setRootScope('single');
      }
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
    const region = encodeRegion({
      grade: opts?.grade,
      sub: opts?.sub,
      rctfill: opts?.rctfill,
      roots: selection.area === 'root' ? rootScope : null,
    });
    try {
      await Promise.all(
        selection.teeth.map((id) =>
          createCondition.mutateAsync({
            data: {
              patient_id: numericId, office_id: officeId, tooth: id,
              surface: surfaceStr, area: selection.area, region,
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
          date_of_service: new Date().toISOString().slice(0, 10), provider_id: e.provider_id ?? '',
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
          status: 'planned', priority: 1,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListTreatmentPlanItemsQueryKey({ plan_id, size: 200 }) });
    }
  };

  const applyPaletteItem = (item: PaletteItem) => {
    if (item.action === 'open-legend') { setShowLegend(true); return; }
    if (item.action === 'open-conditions') { if (selection) setShowConditions((v) => !v); return; }
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

  const saveWatch = async (data: { dir: string; x: number; y: number; note: string }) => {
    if (!watchTooth || !validId) return;
    try {
      await createCondition.mutateAsync({
        data: {
          patient_id: numericId, office_id: officeId, tooth: watchTooth, area: 'whole',
          condition_code: 'WATCH', description: 'Watch', chart_as: CHART_AS[paletteTab],
          region: encodeRegion({ dir: data.dir, wx: data.x, wy: data.y }),
          notes: data.note || null, activity_date: new Date().toISOString().slice(0, 10), is_inactive: false,
        },
      });
      invalidate();
    } finally {
      setWatchTooth(null);
      setSelection(null);
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

  const toggleSupernumerary = async (id: string) => {
    const existing = conditions.find(
      (c) => !c.is_inactive && c.tooth === id && (c.condition_code ?? '').toUpperCase() === 'ERUPTED' && /sub=supernumerary/.test(c.region ?? ''),
    );
    try {
      if (existing) {
        await deleteCondition.mutateAsync({ itemId: existing.id });
      } else {
        await createCondition.mutateAsync({
          data: {
            patient_id: numericId, office_id: officeId, tooth: id, area: 'whole',
            condition_code: 'ERUPTED', description: 'Supernumerary', region: encodeRegion({ sub: 'supernumerary' }),
            chart_as: 'pre-existing', activity_date: new Date().toISOString().slice(0, 10), is_inactive: false,
          },
        });
      }
      invalidate();
    } catch { /* surfaced */ }
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
  const surfaceSel = (id: string): Set<SurfaceKey> =>
    selection?.area === 'surface' && selection.teeth[0] === id ? selection.surfaces : new Set();
  const hasSupernumerary = (id: string): boolean =>
    (byTooth.get(id)?.glyphs ?? []).some((g) => g.code === 'ERUPTED' && g.sub === 'supernumerary');
  const summaryFor = (st: ToothState): string =>
    st.glyphs.map((g) => lookupCondition(g.code)?.label ?? g.code).join(', ');

  const singleTooth = selection?.teeth.length === 1 ? selection.teeth[0]! : null;
  const upper = upperTeeth(settings.dentition).filter((t) => settings.wisdom_visible || isPrimaryId(t) || !WISDOM_TEETH.has(Number(t)));
  const lower = lowerTeeth(settings.dentition).filter((t) => settings.wisdom_visible || isPrimaryId(t) || !WISDOM_TEETH.has(Number(t)));

  const historyRows = historyTeeth ? gridRows.filter((r) => historyTeeth.includes(r.tooth)) : [];
  const historyProgress = historyTeeth ? progressRows.filter((p) => historyTeeth.includes(p.tooth)) : [];

  const archProps = {
    byTooth: overlay, figureArea, surfaceSel,
    wholeSelected: (id: string) => selection?.area === 'whole' && selection.teeth.includes(id),
    onSelectZone: selectZone, onToggleSurface: toggleSurface,
    numberingSystem: settings.numbering_system, occlusalVisible: settings.occlusal_visible, edentulous: settings.edentulous,
    hasSupernumerary, onToggleSupernumerary: toggleSupernumerary, summaryFor,
  };

  // ---- Render -------------------------------------------------------------
  return (
    <div className="flex flex-col bg-slate-50" style={{ minHeight: 'calc(100vh - 260px)' }}>
      <div className="flex items-center px-5 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(180deg,#2566a8,#16406e)' }}>
        Restorative Chart
        <span className="ml-3 rounded bg-white/15 px-2 py-0.5 text-xs font-normal">{patient?.name}</span>
      </div>

      <div className="flex gap-1 bg-slate-200 px-2 pt-2">
        {HEADER_TABS.map((t) => (
          <button key={t.label} onClick={() => !t.active && navigate(`/patient/${patientId}/${t.route}`)} className="rounded-t-md px-4 py-2 text-xs font-semibold" style={{ background: t.active ? '#ffffff' : 'linear-gradient(180deg,#3b7ec0,#2563a6)', color: t.active ? '#16406e' : '#eaf2fb' }}>
            {t.label}
          </button>
        ))}
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
        numberingSystem={settings.numbering_system}
        onNumberingChange={(n: NumberingSystem) => updateSettings({ numbering_system: n })}
        wisdomVisible={settings.wisdom_visible}
        onToggleWisdom={() => updateSettings({ wisdom_visible: !settings.wisdom_visible })}
        occlusalVisible={settings.occlusal_visible}
        onToggleOcclusal={() => updateSettings({ occlusal_visible: !settings.occlusal_visible })}
        edentulous={settings.edentulous}
        onToggleEdentulous={() => updateSettings({ edentulous: !settings.edentulous })}
        onOpenTemplates={() => setShowTemplates(true)}
        canNote={singleTooth != null}
        onOpenNote={() => singleTooth != null && setNoteTooth(singleTooth)}
        lockSelectionTools={paletteTab === 'tx-plans'}
        onOpenInsurance={() => setInsuranceType('primary')}
      />

      <div className="flex items-center justify-between border-b border-slate-200 bg-[#e8f0f8] px-4 py-1.5">
        <span className="text-sm font-semibold text-slate-700">
          {TAB_TITLE[paletteTab]}
          {selection && (
            <span className="ml-2 font-normal text-slate-500">· {selection.area} · {selection.teeth.map((t) => `#${displayLabel(t, settings.numbering_system)}`).join(', ')}</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {paletteTab === 'tx-plans' && (
            <>
              {plans.length > 0 && (
                <select value={currentPlan?.id ?? ''} onChange={(e) => setPlanId(e.target.value)} title="Treatment plan" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={referredOut} onChange={(e) => setReferredOut(e.target.checked)} /> Referred Out
              </label>
            </>
          )}
          <button onClick={deleteSelectedRow} disabled={!selectedRowId || deleteCondition.isPending} className="flex items-center gap-1.5 rounded border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 6h10M8 6V4h4v2M6 6l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Delete…
          </button>
        </div>
      </div>

      <div className="relative flex flex-1">
        <div className="flex-1 overflow-x-auto p-3">
          <Arch teeth={upper} onSelectArch={() => selectArch(upper)} numbersFirst {...archProps} />
          <div className="my-1 border-t-2 border-dashed border-emerald-500" />
          <Arch teeth={lower} onSelectArch={() => selectArch(lower)} numbersFirst={false} {...archProps} />
          {createCondition.isError && <p className="mt-2 text-xs text-rose-600">Failed to save condition. Please try again.</p>}
        </div>

        <div className="w-[320px] shrink-0">
          <ConditionPalette tab={paletteTab} onTabChange={setPaletteTab} onApply={applyPaletteItem} disabled={!selection} />
        </div>

        {showConditions && selection && (
          <ConditionsPopup selection={selection} onApply={applyConditionDef} onClose={() => setShowConditions(false)} />
        )}
      </div>

      <ChartGrid rows={gridRows} selectedRowId={selectedRowId} onSelectRow={setSelectedRowId} onRowDoubleClick={openEdit} loading={loading} />

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
      {watchTooth && <WatchEditor tooth={watchTooth} onSave={saveWatch} onClose={() => setWatchTooth(null)} />}
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
  byTooth: Map<string, ToothState>;
  figureArea: (id: string) => ToothArea | null;
  surfaceSel: (id: string) => Set<SurfaceKey>;
  wholeSelected: (id: string) => boolean;
  onSelectZone: (id: string, area: ToothArea) => void;
  onToggleSurface: (id: string, s: SurfaceKey) => void;
  onSelectArch: () => void;
  numberingSystem: NumberingSystem;
  occlusalVisible: boolean;
  edentulous: boolean;
  hasSupernumerary: (id: string) => boolean;
  onToggleSupernumerary: (id: string) => void;
  summaryFor: (st: ToothState) => string;
  numbersFirst: boolean;
}

function Arch(props: ArchProps) {
  const { teeth, byTooth, figureArea, surfaceSel, wholeSelected, onSelectZone, onToggleSurface, onSelectArch, numberingSystem, occlusalVisible, edentulous, hasSupernumerary, onToggleSupernumerary, summaryFor, numbersFirst } = props;
  const EMPTY: ToothState = { surfaces: new Set(), glyphs: [], missing: false, groups: new Set() };

  const numbers = (
    <div className="flex items-stretch">
      <ArchButton onClick={onSelectArch} />
      {teeth.map((id) => (
        <div key={id} className="relative mx-0.5 flex-1" style={{ minWidth: 44 }}>
          <button
            onClick={() => onSelectZone(id, 'whole')}
            className="w-full rounded-sm border py-0.5 text-center text-[11px] font-semibold"
            style={{ borderColor: wholeSelected(id) ? '#2f7ff0' : '#cbd5e1', background: wholeSelected(id) ? '#dbeafe' : 'linear-gradient(180deg,#f8fafc,#e2e8f0)', color: '#475569' }}
          >
            {displayLabel(id, numberingSystem)}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSupernumerary(id); }}
            title="Toggle supernumerary"
            className="absolute -right-0.5 -top-1 h-2.5 w-2.5 rounded-full border"
            style={{ background: hasSupernumerary(id) ? '#2f7ff0' : '#fff', borderColor: '#2f7ff0' }}
          />
        </div>
      ))}
    </div>
  );

  const toothRow = (
    <div className="flex" style={{ background: 'linear-gradient(180deg,#f6c4c4,#efb0b0)' }}>
      <div style={{ width: 18 }} />
      {teeth.map((id) => {
        const st = byTooth.get(id) ?? EMPTY;
        const meta = toothMeta(id);
        return (
          <div key={id} className="mx-0.5 flex flex-1 justify-center" style={{ minWidth: 44 }}>
            <ToothFigure id={id} assetSrc={meta.assetSrc} arch={meta.arch} selectedArea={figureArea(id)} glyphs={st.glyphs} missing={st.missing || edentulous} hasNote={!!st.note} summary={summaryFor(st)} onSelectZone={onSelectZone} />
          </div>
        );
      })}
    </div>
  );

  const surfaceRow = occlusalVisible ? (
    <div className="flex">
      <div style={{ width: 18 }} />
      {teeth.map((id) => {
        const st = byTooth.get(id) ?? EMPTY;
        const meta = toothMeta(id);
        return (
          <div key={id} className="mx-0.5 flex flex-1 justify-center py-1" style={{ minWidth: 44 }}>
            <SurfaceSelector id={id} mesialOnRight={meta.mesialOnRight} posterior={meta.posterior} selected={surfaceSel(id)} charted={st.surfaces} onToggle={onToggleSurface} />
          </div>
        );
      })}
    </div>
  ) : null;

  return numbersFirst ? <div>{numbers}{toothRow}{surfaceRow}</div> : <div>{surfaceRow}{numbers}{toothRow}</div>;
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
function money(v?: string | null): string {
  if (v == null) return '$0.00';
  const n = Number(v);
  return Number.isNaN(n) ? `$${v}` : `$${n.toFixed(2)}`;
}
function orderedSurfaces(set: Set<SurfaceKey>): string {
  const order: SurfaceKey[] = ['M', 'O', 'I', 'D', 'B', 'F', 'L'];
  return order.filter((k) => set.has(k)).join('');
}
