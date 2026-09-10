import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useListTreatmentPlans,
  useCreateTreatmentPlan,
  useCreateTreatmentPlanItem,
  useUpdateTreatmentPlanItem,
  useDeleteTreatmentPlanItem,
  listTreatmentPlanItems,
  getListTreatmentPlansQueryKey,
} from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { useListPatientProcedures } from '@/api/generated/endpoints/clinical/clinical';
import { getOffice } from '@/api/generated/endpoints/organization/organization';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import {
  EMPTY_FEE_CONTEXT,
  loadFeeScheduleContext,
  resolveProcedureFee,
  type FeeScheduleContext,
} from '@/services/feeScheduleResolver';
import { EMPTY_COVERAGE_CONTEXT, loadCoverageContext, type CoverageContext } from '@/services/coverageResolver';
import { priceProcedure } from '@/services/procedurePricing';
import {
  planProcedure,
  postPlanItemToLedger,
  postedProcedureKeys,
  todayIso,
} from '@/features/procedures/procedureEntryService';
import { announceProcedureChange, invalidateProcedureQueries, useProcedureSync } from '@/features/procedures/procedureSync';
import { needsProcedureDetails } from '@/features/procedures/procedureRequirements';
import ProcedureDetailsDialog, { type ProcedureDetailsHeader, type ProcedureDetailsRowResult } from '@/features/procedures/ProcedureDetailsDialog';
import { useGetPatient, uploadPatientDocument } from '@/api/generated/endpoints/patients/patients';
import type { ProcedureCodeRead, TreatmentPlanItemRead } from '@/api/generated/model';
import {
  assignTids,
  buildRows,
  encodePhase,
  decodePhase,
  genId,
  planNameForTid,
  type TxStatus,
  type SettableTxStatus,
  type TxRow,
} from './txModel';
import {
  loadProcedureCodes,
  codeDescription,
  loadProviderEligibility,
  providerEligibleFor,
} from './treatmentPlanService';
import TxPlanGrid from './TxPlanGrid';
import TxPlanToolbar, { type IdChange, type ReEstimateArgs } from './TxPlanToolbar';
import ProcedureEntryPanel, { type EntryState } from './ProcedureEntryPanel';
import EditTreatmentModal, { type EditTreatmentSave } from './EditTreatmentModal';
import TxPlanReportModal from './TxPlanReportModal';
import { buildTxPlanPdf, filterReportRows, type ReportHeader, type ReportOptions } from './txReport';

interface OutletCtx {
  patient: { id: string; name: string; officeId?: string; age?: number };
}

const TX_ITEMS_KEY = 'tx-plan-items';
// Local calendar date — `toISOString()` is UTC and reads a day ahead in the US evening.
const today = todayIso;

export default function TreatmentPlanPage() {
  const { patient } = useOutletContext<OutletCtx>();
  const { patientId } = useParams<{ patientId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const numericId = Number(patient?.id ?? patientId);
  const validId = !Number.isNaN(numericId);
  const officeId = patient?.officeId ? Number(patient.officeId) : null;

  // ---- Data ---------------------------------------------------------------
  const plansQuery = useListTreatmentPlans({ patient_id: numericId, size: 200 }, { query: { enabled: validId } });
  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data]);
  const planIds = useMemo(() => plans.map((p) => p.id), [plans]);

  const itemsQuery = useQuery({
    queryKey: [TX_ITEMS_KEY, numericId, planIds],
    enabled: validId && planIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(planIds.map((id) => listTreatmentPlanItems({ plan_id: id, size: 200 })));
      return results.flatMap((r) => r.items ?? []);
    },
  });
  const items: TreatmentPlanItemRead[] = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  // Charges on the ledger that were posted from a plan (any screen). A planned
  // item they fulfil shows here as Completed — the same rule the Restorative
  // Chart uses to swap its red TX-PLAN glyph for a green COMPLETED one.
  const proceduresQuery = useListPatientProcedures({ patient_id: numericId, size: 200 }, { query: { enabled: validId } });
  const postedKeys = useMemo(() => postedProcedureKeys(proceduresQuery.data?.items ?? []), [proceduresQuery.data]);

  // Procedures added / posted on the chart, the ledger, the Transactions Entry
  // page or another browser tab land in this grid without a manual reload.
  useProcedureSync(validId ? numericId : null);

  // Shared provider directory — same list, order and labels as every other screen.
  const { providerRows: providers, providerLabel } = useProviderDirectory();

  // Fee schedules from Setup → Insurance → Fee Schedules, used to price added
  // procedures instead of falling back to the code's default fee.
  const [feeCtx, setFeeCtx] = useState<FeeScheduleContext>(EMPTY_FEE_CONTEXT);
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    loadFeeScheduleContext({ patient_id: numericId, office_id: officeId })
      .then((ctx) => alive && setFeeCtx(ctx))
      .catch(() => alive && setFeeCtx(EMPTY_FEE_CONTEXT));
    return () => {
      alive = false;
    };
  }, [validId, numericId, officeId]);
  // Primary plan coverage rules — Est Ins on a planned item then matches what
  // the chart and the Transactions Entry screen quote for the same code.
  const [coverageCtx, setCoverageCtx] = useState<CoverageContext>(EMPTY_COVERAGE_CONTEXT);
  useEffect(() => {
    if (!validId) return;
    let alive = true;
    loadCoverageContext({ patient_id: numericId })
      .then((ctx) => alive && setCoverageCtx(ctx))
      .catch(() => alive && setCoverageCtx(EMPTY_COVERAGE_CONTEXT));
    return () => {
      alive = false;
    };
  }, [validId, numericId]);

  const patientQuery = useGetPatient(numericId, { query: { enabled: validId } });

  // Procedure-code descriptions (cached; triggers a re-render when loaded).
  const [codesLoaded, setCodesLoaded] = useState(false);
  useEffect(() => {
    void loadProcedureCodes().then(() => setCodesLoaded(true));
  }, []);
  const codeMap = useMemo(() => {
    void codesLoaded; // dependency: rebuild resolver once codes finish loading
    return (code: string) => codeDescription(code);
  }, [codesLoaded]);

  // ---- Derived ------------------------------------------------------------
  const tidByPlan = useMemo(() => assignTids(plans), [plans]);
  const planByTid = useMemo(() => {
    const m = new Map<number, string>();
    for (const [planId, tid] of tidByPlan) m.set(tid, planId);
    return m;
  }, [tidByPlan]);

  const allRows = useMemo(
    () => buildRows(items, tidByPlan, providerLabel, codeMap, postedKeys),
    [items, tidByPlan, providerLabel, codeMap, postedKeys],
  );

  // ---- UI state -----------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<TxStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tranDate, setTranDate] = useState(today());
  const [entry, setEntry] = useState<EntryState>({
    diag_date: today(),
    tid: 1,
    phase: 1,
    order: 1,
    provider_id: '',
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [sortByTooth, setSortByTooth] = useState(false);
  // Edit Treatment modal — the item id being edited (legacy: click Diag Date).
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // Code waiting in the legacy "Add Procedure Details" pop-up for its tooth /
  // surfaces / quadrant / material — the same dialog the Transactions Entry,
  // Ledger and chart screens use, so a planned procedure carries everything
  // its code requires and the Restorative Chart can draw it.
  const [enforcing, setEnforcing] = useState<ProcedureCodeRead | null>(null);
  // Set once the user opens the Provider panel, so we only fetch provider
  // eligibility on demand (not on every page load).
  const [eligibilityWanted, setEligibilityWanted] = useState(false);

  const availableTids = useMemo(() => {
    const tids = [...new Set([...tidByPlan.values()])].sort((a, b) => a - b);
    return tids.length ? tids : [1];
  }, [tidByPlan]);

  const rows = useMemo(() => {
    const base = statusFilter === 'all' ? allRows : allRows.filter((r) => r.status === statusFilter);
    if (!sortByTooth) return base;
    return [...base].sort((a, b) => {
      const ta = parseInt(a.tooth, 10);
      const tb = parseInt(b.tooth, 10);
      const na = Number.isNaN(ta);
      const nb = Number.isNaN(tb);
      if (na && nb) return a.tooth.localeCompare(b.tooth);
      if (na) return 1;
      if (nb) return -1;
      return ta - tb;
    });
  }, [allRows, statusFilter, sortByTooth]);

  // Keep selection in sync with the visible rows.
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const selectedCodes = useMemo(
    () => [...new Set(selectedRows.map((r) => r.code))],
    [selectedRows],
  );

  // Provider eligibility for the legacy "Change Provider" restriction. Fetched
  // lazily (only after the Provider panel is first opened) and cached; each
  // provider's assigned procedure-code allow-list decides whether they can be
  // assigned to the selected procedures. See providerEligibleFor / PLAN-16.
  const providerIds = useMemo(() => providers.map((p) => p.id), [providers]);
  const eligibilityQuery = useQuery({
    queryKey: ['tx-provider-eligibility', providerIds],
    enabled: eligibilityWanted && providerIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: () => loadProviderEligibility(providerIds),
  });
  const eligibleProviders = useMemo(() => {
    if (selectedCodes.length === 0 || !eligibilityQuery.data) return providers;
    return providers.filter((p) => providerEligibleFor(eligibilityQuery.data, p.id, selectedCodes));
  }, [providers, selectedCodes, eligibilityQuery.data]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());

  // ---- Mutations ----------------------------------------------------------
  const createPlan = useCreateTreatmentPlan();
  const createItem = useCreateTreatmentPlanItem();
  const updateItem = useUpdateTreatmentPlanItem();
  const deleteItem = useDeleteTreatmentPlanItem();

  /** Guard for selection-dependent actions; toasts when nothing is checked. */
  const requireSelection = (): boolean => {
    if (selectedRows.length === 0) {
      toast.info('Select one or more procedures first');
      return false;
    }
    return true;
  };

  // Every plan / item / procedure cache for this patient — the chart's, the
  // ledger's and this page's — so a change here is visible everywhere.
  const invalidate = async () => {
    await invalidateProcedureQueries(numericId);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await invalidate();
    } catch (err) {
      console.error(err);
      toast.error(`${label} failed`);
    } finally {
      setBusy(false);
    }
  };

  /** Resolve (or create) the plan record backing a legacy Tx Plan ID. */
  const ensurePlanForTid = async (tid: number): Promise<string> => {
    const existing = planByTid.get(tid);
    if (existing) return existing;
    const id = genId();
    await createPlan.mutateAsync({
      data: { id, patient_id: numericId, office_id: officeId, name: planNameForTid(tid), status: 'active' },
    });
    await queryClient.invalidateQueries({ queryKey: getListTreatmentPlansQueryKey({ patient_id: numericId, size: 200 }) });
    return id;
  };

  /** Plan a procedure through the shared entry service (details already collected/validated). */
  const addPlannedProcedure = (
    code: ProcedureCodeRead,
    extras: { tooth?: string; surface?: string } = {},
    head: EntryState = entry,
  ) =>
    run('Add procedure', async () => {
      const plan_id = await ensurePlanForTid(head.tid);
      // Price from the fee schedule + plan coverage that apply to this patient/
      // office/provider, so a planned procedure carries the same patient/
      // insurance split the charge will — and the same one the chart quotes.
      const priced = await priceProcedure(feeCtx, coverageCtx, code.code, {
        default_fee: code.default_fee,
        on_date: head.diag_date || null,
      });
      await planProcedure({
        patient_id: numericId,
        office_id: officeId,
        plan_id,
        procedure_code: code.code,
        description: code.description,
        tooth: extras.tooth || null,
        surface: extras.surface || null,
        fee: priced.fee,
        insurance_estimate: priced.insurance_estimate,
        priority: head.order,
        phase_id: head.phase,
        provider_id: head.provider_id || null,
        diagnosed_date: head.diag_date || null,
      });
      setEnforcing(null);
      toast.success(`Added ${code.code} — ${code.description}`);
    });

  // Add procedure (exact-match auto-add or pick-list selection). Codes whose
  // procedure_codes row requires a tooth / surfaces / quadrant / material open
  // the legacy Add Procedure Details pop-up first, like every other screen.
  const onAdd = (code: ProcedureCodeRead) => {
    if (needsProcedureDetails(code)) setEnforcing(code);
    else void addPlannedProcedure(code);
  };

  /** Pop-up SAVE: adopt the header (provider / date / TID / phase) into the entry panel, then plan. */
  const onDetailsSave = (rows: ProcedureDetailsRowResult[], head: ProcedureDetailsHeader) => {
    const next: EntryState = {
      ...entry,
      provider_id: head.provider_id,
      diag_date: head.date,
      tid: head.tid ?? entry.tid,
      phase: head.phase ?? entry.phase,
    };
    setEntry(next);
    const r = rows[0];
    if (r) void addPlannedProcedure(r.code, { tooth: r.tooth, surface: r.surface }, next);
    // NOTE: quadrant / material_id are validated here but treatment_plan_items
    // has no column for them (PROC-INT-5) — they are carried by the charge when
    // the item is posted through the same pop-up on the ledger side.
  };

  const onChangeProvider = (providerId: string) => {
    if (!requireSelection()) return;
    void run('Update provider', async () => {
      for (const r of selectedRows) {
        // Dual-write: dedicated provider_id (new) + legacy diagnosed_by the grid reads.
        await updateItem.mutateAsync({ itemId: r.id, data: { provider_id: providerId, diagnosed_by: providerId } });
      }
      toast.success(`Provider updated on ${selectedRows.length} procedure(s)`);
    });
  };

  const onDelete = () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Delete ${selectedRows.length} selected procedure(s) from the treatment plan?`)) return;
    void run('Delete', async () => {
      for (const r of selectedRows) await deleteItem.mutateAsync({ itemId: r.id });
      setSelected(new Set());
      toast.success('Procedure(s) deleted');
    });
  };

  const onChangeStatus = (status: SettableTxStatus) => {
    if (!requireSelection()) return;
    void run('Change status', async () => {
      for (const r of selectedRows) await updateItem.mutateAsync({ itemId: r.id, data: { status } });
      toast.success(`Status changed on ${selectedRows.length} procedure(s)`);
    });
  };

  const onChangeIds = (change: IdChange) => {
    if (!requireSelection()) return;
    void run('Change IDs', async () => {
      const targetPlan = change.tid != null ? await ensurePlanForTid(change.tid) : null;
      for (const r of selectedRows) {
        const data: Record<string, unknown> = {};
        if (targetPlan && targetPlan !== r.plan_id) data.plan_id = targetPlan;
        if (change.phase != null) {
          // Dual-write: real phase_id (new) + legacy billing_order stopgap.
          data.phase_id = change.phase;
          data.billing_order = encodePhase(change.phase);
        }
        if (change.order != null) data.priority = change.order;
        if (Object.keys(data).length) await updateItem.mutateAsync({ itemId: r.id, data });
      }
      toast.success('Treatment plan organized');
    });
  };

  const onCopyAsNewPlan = (newTid: number) => {
    if (!requireSelection()) return;
    void run('Copy plan', async () => {
      const plan_id = await ensurePlanForTid(newTid);
      for (const r of selectedRows) {
        await createItem.mutateAsync({
          data: {
            id: genId(),
            plan_id,
            procedure_code: r.code,
            description: r.description,
            tooth: r.tooth || null,
            surface: r.surface || null,
            fee: r.fee,
            insurance_estimate: r.est_ins,
            priority: r.order,
            phase_id: r.phase,
            billing_order: encodePhase(r.phase),
            // A completed (posted) procedure copied to a new plan is planned afresh.
            status: r.status === 'completed' ? 'diagnosed' : r.status,
            provider_id: r.provider_id || null,
            diagnosed_by: r.provider_id || null,
          },
        });
      }
      toast.success(`Copied ${selectedRows.length} procedure(s) to Tx Plan ${newTid}`);
    });
  };

  const onReEstimate = (args: ReEstimateArgs) =>
    run('Re-estimate', async () => {
      const planId = planByTid.get(args.tid);
      if (!planId) {
        toast.error(`No Tx Plan ${args.tid}`);
        return;
      }
      const targets = items.filter(
        (it) => it.plan_id === planId && (args.phase == null || decodePhase(it.billing_order) === args.phase),
      );
      if (targets.length === 0) {
        toast.info('No procedures matched');
        return;
      }
      if (args.use_new_fees) {
        const map = await loadProcedureCodes();
        for (const it of targets) {
          const priced = await resolveProcedureFee(feeCtx, it.procedure_code, {
            default_fee: map.get(it.procedure_code)?.default_fee,
          });
          await updateItem.mutateAsync({
            itemId: it.id,
            data: { fee: priced.fee, insurance_estimate: priced.insurance_estimate },
          });
        }
        toast.success(`Refreshed fees on ${targets.length} procedure(s) from the current fee schedules`);
      }
      // The insurance figure above is the fee schedule's stated insurance portion.
      // Re-estimating against plan coverage %, deductibles and annual maximums
      // still needs a backend estimate endpoint (see PLAN-3 in the dev report).
    });

  // ---- Edit Treatment modal (click Diag Date) -----------------------------
  const editingItem = useMemo(
    () => (editingItemId ? items.find((it) => it.id === editingItemId) ?? null : null),
    [editingItemId, items],
  );
  const editingTid = editingItem ? tidByPlan.get(editingItem.plan_id) ?? 1 : 1;

  const onSaveEdit = (save: EditTreatmentSave) => {
    if (!editingItem) return;
    void run('Save treatment', async () => {
      const data: Record<string, unknown> = { ...save.patch };
      // Re-parent when the Tx Plan ID changed (creates the target plan if needed).
      if (save.targetTid != null) {
        const targetPlan = await ensurePlanForTid(save.targetTid);
        if (targetPlan !== editingItem.plan_id) data.plan_id = targetPlan;
      }
      await updateItem.mutateAsync({ itemId: editingItem.id, data });
      setEditingItemId(null);
      toast.success('Treatment updated');
    });
  };

  const onDeleteEdit = () => {
    if (!editingItem) return;
    if (!window.confirm(`Delete ${editingItem.procedure_code} from the treatment plan?`)) return;
    void run('Delete', async () => {
      await deleteItem.mutateAsync({ itemId: editingItem.id });
      setEditingItemId(null);
      toast.success('Procedure deleted');
    });
  };

  // ---- Toolbar: additional actions ----------------------------------------

  /** Clear All Filters — reset the status filter, tooth sort, and selection. */
  const onClearFilters = () => {
    setStatusFilter('all');
    setSortByTooth(false);
    setSelected(new Set());
    toast.success('Filters cleared');
  };

  /** Sort By Tooth Number — toggle the grid ordering by tooth. */
  const onSortByTooth = () => {
    const next = !sortByTooth;
    setSortByTooth(next);
    toast.success(next ? 'Sorted by tooth number' : 'Sorted by Tx Plan / Phase / Order');
  };

  /** Refer To — mark the selected procedures Referred Out. */
  const onReferTo = () => {
    if (!requireSelection()) return;
    void run('Refer out', async () => {
      for (const r of selectedRows) await updateItem.mutateAsync({ itemId: r.id, data: { status: 'referred_out' } });
      toast.success(`Marked ${selectedRows.length} procedure(s) as Referred Out`);
    });
  };

  /**
   * Post to Ledger — convert the selected planned procedures into ledger entries
   * (patient procedures) and mark the plan items Accepted. A provider is required
   * on each procedure (ledger constraint).
   */
  const onPostToLedger = () => {
    if (!requireSelection()) return;
    const postable = selectedRows.filter((r) => r.status !== 'completed');
    if (postable.length === 0) {
      toast.info('The selected procedure(s) are already posted to the ledger');
      return;
    }
    if (postable.length < selectedRows.length) {
      toast.info(`${selectedRows.length - postable.length} already-completed procedure(s) skipped`);
    }
    if (!window.confirm(`Post ${postable.length} selected procedure(s) to the ledger?`)) return;
    void run('Post to ledger', async () => {
      let posted = 0;
      for (const r of postable) {
        const provider_id = r.provider_id || entry.provider_id;
        if (!provider_id) {
          toast.error(`${r.code}: assign a provider before posting to the ledger`);
          continue;
        }
        const item = items.find((it) => it.id === r.id);
        if (!item) continue;
        // Shared Post to Ledger: the charge is linked to the plan and the item
        // is closed, so the chart shows it COMPLETED and this grid shows "C".
        await postPlanItemToLedger({
          patient_id: numericId,
          office_id: officeId ?? 0,
          item,
          provider_id,
          date_of_service: tranDate,
          announce: false,
        });
        posted += 1;
      }
      announceProcedureChange({ patient_id: numericId, kinds: ['procedure', 'plan_item'] });
      if (posted) toast.success(`Posted ${posted} procedure(s) to the ledger`);
    });
  };

  /** Save — changes persist immediately; this refreshes and confirms. */
  const onSave = () =>
    void run('Save', async () => {
      toast.success('All changes are saved');
    });

  /** New Appt — open the scheduler to book an appointment for these procedures. */
  const onNewAppt = () => {
    navigate('/scheduler');
  };

  // Actions with no backend support yet — enabled, but honestly flagged.
  const onPreAuth = () =>
    toast.info('Pre-authorization submission is not available yet (backend gap PLAN-9).');
  const onDiscount = () => toast.info('Treatment-plan discounts are not available yet (backend gap PLAN-10).');
  const onTxCounselor = () =>
    toast.info('Treatment Counselor presentation is not available yet (backend gap PLAN-11).');

  const buildHeader = async (): Promise<ReportHeader> => {
    const p = patientQuery.data;
    const offId = officeId ?? p?.home_office_id ?? null;
    let officeName = '';
    let officePhone = '';
    let officeFax = '';
    if (offId != null) {
      try {
        const o = await getOffice(offId);
        officeName = o?.name ?? '';
        officePhone = o?.phone ?? '';
        officeFax = o?.fax ?? '';
      } catch {
        /* office header is best-effort */
      }
    }
    const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : patient?.name ?? '';
    const addr = p
      ? [p.address_line1, p.address_line2, [p.city, p.state].filter(Boolean).join(', '), p.zip]
          .filter(Boolean)
          .join('  ')
      : '';
    return {
      officeName,
      officePhone,
      officeFax,
      patientName: name,
      patientId: numericId,
      dob: p?.dob ?? '',
      chartNo: p?.chart_no ?? '',
      address: addr,
      respParty: name,
      primaryInsurance: '', // PLAN-3: patient insurance not joined yet
    };
  };

  const onReport = async (opts: ReportOptions, mode: 'preview' | 'save') => {
    const reportRows = filterReportRows(allRows, opts);
    if (reportRows.length === 0) {
      toast.info('No procedures match the selected Tx Plan / phase / statuses.');
      return;
    }
    setBusy(true);
    try {
      const header = await buildHeader();
      const doc = buildTxPlanPdf(reportRows, header, opts);
      if (mode === 'preview') {
        const url = doc.output('bloburl');
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success('Treatment plan report generated');
      } else {
        const blob = doc.output('blob') as Blob;
        const file = new File([blob], `treatment-plan-${numericId}-${today()}.pdf`, { type: 'application/pdf' });
        await uploadPatientDocument({
          file,
          patient_id: numericId,
          office_id: officeId,
          document_type: 'treatment-plan',
          description: `Treatment Plan ${opts.tids.join(', ')}`,
        });
        toast.success('Treatment plan saved to patient documents');
      }
      setReportOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Report generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Treatment Plan</h1>
        <span className="text-xs text-slate-500">{patient?.name}</span>
      </div>

      <TxPlanToolbar
        selectedCount={selectedRows.length}
        providers={eligibleProviders}
        totalProviderCount={providers.length}
        eligibilityLoading={eligibilityQuery.isFetching}
        onProviderPanelOpen={() => setEligibilityWanted(true)}
        busy={busy}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        tranDate={tranDate}
        onTranDate={setTranDate}
        onChangeProvider={onChangeProvider}
        onDelete={onDelete}
        onChangeStatus={onChangeStatus}
        onChangeIds={onChangeIds}
        onCopyAsNewPlan={onCopyAsNewPlan}
        onReEstimate={onReEstimate}
        onPrint={() => setReportOpen(true)}
        sortByTooth={sortByTooth}
        onClearFilters={onClearFilters}
        onSortByTooth={onSortByTooth}
        onReferTo={onReferTo}
        onPostToLedger={onPostToLedger}
        onSave={onSave}
        onNewAppt={onNewAppt}
        onPreAuth={onPreAuth}
        onDiscount={onDiscount}
        onTxCounselor={onTxCounselor}
      />

      <TxPlanGrid
        rows={rows}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onEditRow={setEditingItemId}
        loading={plansQuery.isLoading || itemsQuery.isLoading}
      />

      <ProcedureEntryPanel
        entry={entry}
        onEntryChange={(patch) => setEntry((e) => ({ ...e, ...patch }))}
        providers={providers}
        busy={busy}
        onAdd={onAdd}
      />

      {enforcing && (
        <ProcedureDetailsDialog
          mode="plan"
          office_id={officeId}
          rows={[{ code: enforcing }]}
          header={{ provider_id: entry.provider_id, date: entry.diag_date, tid: entry.tid, phase: entry.phase }}
          busy={busy}
          onSave={onDetailsSave}
          onClose={() => setEnforcing(null)}
        />
      )}

      {editingItem && (
        <EditTreatmentModal
          item={editingItem}
          providers={providers}
          availableTids={availableTids}
          currentTid={editingTid}
          descriptionFallback={codeMap(editingItem.procedure_code)}
          busy={busy}
          onSave={onSaveEdit}
          onDelete={onDeleteEdit}
          onClose={() => setEditingItemId(null)}
        />
      )}

      {reportOpen && (
        <TxPlanReportModal
          availableTids={availableTids}
          defaultTid={availableTids[0] ?? 1}
          busy={busy}
          onClose={() => setReportOpen(false)}
          onSubmit={(opts, mode) => void onReport(opts, mode)}
        />
      )}
    </div>
  );
}
