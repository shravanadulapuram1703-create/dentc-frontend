// Patient Prescriptions tab (legacy Denticon M11) — /patient/:id/prescriptions.
//
// Layout mirrors the legacy screen: a Prescription List grid on top, an
// Edit/Add panel below, and the footer toolbar
// (Strike-off | Quick Print | Print | Add New | Save | Cancel | ePrescribe).
//
// Wiring: /api/v1/prescriptions (tag Clinical) for list/create/strike-off;
// the Drug Name dropdown reuses the shared Rx library cache. A saved Rx is
// immutable (legacy) — only Add New creates, and Strike-off soft-deletes
// (PATCH is_active=false, irreversible).

import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Pill } from 'lucide-react';
import {
  useListPrescriptions,
  useCreatePrescription,
  useUpdatePrescription,
} from '@/api/generated/endpoints/clinical/clinical';
import { useGetPatient } from '@/api/generated/endpoints/patients/patients';
import { useListOffices } from '@/api/generated/endpoints/organization/organization';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import { formatProviderName } from '@/services/providerDirectory';
import type { PrescriptionLibraryRead, ProviderRead } from '@/api/generated/model';
import { loadRxLibrary } from './prescriptionsService';
import {
  applyLibraryDrug,
  blankDraft,
  isToday,
  sortRows,
  toCreateBody,
  type RxDraft,
} from './rxModel';
import {
  fmtSlipDate,
  printPrescriptions,
  type RxPrintOffice,
  type RxPrintPatient,
  type RxPrintPrescriber,
  type RxSlip,
} from './rxPrint';
import RxList from './RxList';
import RxEditPanel from './RxEditPanel';
import RxToolbar from './RxToolbar';
import RxPrintDialog, { type RxPrintRequest, type RxPrintScope } from './RxPrintDialog';

interface OutletContext {
  patient: { id: string; name: string; officeId?: string; age?: number; dob?: string };
}

export default function PrescriptionsPage() {
  const { patient } = useOutletContext<OutletContext>();
  const numericId = Number(patient.id);
  const validId = Number.isFinite(numericId) && numericId > 0;
  const officeId = patient.officeId ? Number(patient.officeId) : null;

  // ---- Data ----
  const rxQuery = useListPrescriptions(
    { patient_id: numericId, size: 200, sort: 'id', order: 'desc' },
    { query: { enabled: validId } },
  );
  const rows = useMemo(() => sortRows(rxQuery.data?.items ?? []), [rxQuery.data]);

  // Shared provider directory — same list, order and labels as every other screen.
  const { providerRows: providers, providerLabel } = useProviderDirectory();

  const [library, setLibrary] = useState<PrescriptionLibraryRead[]>([]);
  useEffect(() => {
    let alive = true;
    loadRxLibrary()
      .then((d) => alive && setLibrary(d))
      .catch(() => toast.error('Failed to load drug library'));
    return () => {
      alive = false;
    };
  }, []);

  const createRx = useCreatePrescription();
  const updateRx = useUpdatePrescription();

  // ePrescribe is only live with a DoseSpot subscription — inferred from any
  // provider carrying a dosespot_user_id.
  const ePrescribeEnabled = providers.some((p) => !!p.dosespot_user_id);

  // ---- Local UI state ----
  const [mode, setMode] = useState<'add' | 'view' | 'empty'>('empty');
  const [draft, setDraft] = useState<RxDraft>(blankDraft());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // ---- Selection / mode handlers ----
  const handleSelect = (id: number) => {
    setSelectedId(id);
    setMode('view');
  };
  const handleAddNew = () => {
    setDraft(blankDraft());
    setSelectedId(null);
    setMode('add');
  };
  const handleCancel = () => {
    setMode(selectedId ? 'view' : 'empty');
  };
  const handleChange = (patch: Partial<RxDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const handlePickDrug = (libraryId: number) => {
    const lib = library.find((d) => d.id === libraryId);
    if (lib) setDraft((d) => applyLibraryDrug(d, lib));
  };

  const toggleCheck = (id: number) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ---- Save (create only — a saved Rx is immutable) ----
  const canSave = mode === 'add' && !!draft.drug_name && !!draft.provider_id;
  const handleSave = async () => {
    if (!draft.provider_id) {
      toast.error('Select the prescribing Provider before saving.');
      return;
    }
    if (!draft.drug_name) {
      toast.error('Select a Drug Name.');
      return;
    }
    try {
      const created = await createRx.mutateAsync({
        data: toCreateBody(draft, numericId, officeId),
      });
      toast.success('Prescription saved.');
      await rxQuery.refetch();
      setSelectedId(created.id);
      setMode('view');
    } catch {
      toast.error('Failed to save prescription.');
    }
  };

  // ---- Strike-off (soft delete, irreversible) ----
  const canStrikeOff = mode === 'view' && !!selected && selected.is_active !== false;
  const handleStrikeOff = async () => {
    if (!selected) return;
    if (!window.confirm('Strike-off this prescription? Once saved, this cannot be undone.')) return;
    try {
      await updateRx.mutateAsync({ itemId: selected.id, data: { is_active: false } });
      toast.success('Prescription struck-off.');
      await rxQuery.refetch();
    } catch {
      toast.error('Failed to strike-off prescription.');
    }
  };

  // ---- Printing ----
  // The slip carries the practice letterhead and the prescriber's DEA / NPI /
  // License, so the print pulls the office and patient records the list itself
  // doesn't need (the shell context has neither an address nor an office row).
  const patientQuery = useGetPatient(numericId, { query: { enabled: validId } });
  const officesQuery = useListOffices({ size: 200 });

  const office = useMemo<RxPrintOffice>(() => {
    const o = officesQuery.data?.items.find(
      (x) => x.id === (patientQuery.data?.home_office_id ?? officeId),
    );
    return {
      name: o?.name ?? '',
      addressLine: [o?.address_line1, o?.address_line2].filter(Boolean).join(', '),
      cityStateZip: [o?.city, [o?.state, o?.zip].filter(Boolean).join(' ').trim()]
        .filter(Boolean)
        .join(', '),
      phone: o?.phone ?? '',
      fax: o?.fax ?? '',
    };
  }, [officesQuery.data, patientQuery.data, officeId]);

  const printPatient = useMemo<RxPrintPatient>(() => {
    const p = patientQuery.data;
    const street = [p?.address_line1, p?.address_line2].filter(Boolean).join(', ');
    const region = [p?.city, [p?.state, p?.zip].filter(Boolean).join(' ').trim()]
      .filter(Boolean)
      .join(', ');
    return {
      name: patient.name,
      dob: fmtSlipDate(p?.dob) || patient.dob || '',
      addressLines: [street, region].filter((l) => l.trim() !== ''),
    };
  }, [patientQuery.data, patient.name, patient.dob]);

  const prescriberFor = (providerId: string | null | undefined): RxPrintPrescriber => {
    const p: ProviderRead | undefined = providers.find((r) => String(r.id) === String(providerId ?? ''));
    return {
      name: p ? formatProviderName(p) : providerLabel(providerId),
      phone: p?.phone || office.phone,
      dea: p?.dea_id ?? '',
      npi: p?.npi ?? '',
      license: p?.license ?? '',
    };
  };

  const todaysRx = () => rows.filter((r) => isToday(r.rx_date) && r.is_active !== false);
  const scopeRows = (scope: RxPrintScope) => {
    if (scope === 'highlighted') return selected ? [selected] : [];
    if (scope === 'checked') return rows.filter((r) => checkedIds.has(r.id));
    return todaysRx();
  };

  const [printOpen, setPrintOpen] = useState(false);
  const printCounts = useMemo(
    () => ({
      highlighted: selected ? 1 : 0,
      checked: rows.filter((r) => checkedIds.has(r.id)).length,
      today: rows.filter((r) => isToday(r.rx_date) && r.is_active !== false).length,
    }),
    [rows, selected, checkedIds],
  );

  const runPrint = (list: typeof rows, opts: Parameters<typeof printPrescriptions>[3]) => {
    const slips: RxSlip[] = list.map((rx) => ({ rx, prescriber: prescriberFor(rx.provider_id) }));
    printPrescriptions(slips, office, printPatient, opts);
  };

  const handlePrintToday = () => {
    const list = todaysRx();
    if (!list.length) {
      toast.info('No prescriptions entered today.');
      return;
    }
    runPrint(list, undefined);
  };

  const handleDialogPrint = ({ scope, ...opts }: RxPrintRequest) => {
    const list = scopeRows(scope);
    if (!list.length) {
      toast.info('Nothing to print for that option.');
      return;
    }
    setPrintOpen(false);
    runPrint(list, opts);
  };

  const handleEprescribe = () => {
    if (!ePrescribeEnabled) return;
    toast.info('Opening the electronic prescription (DoseSpot) application…');
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow">
          <Pill className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Prescriptions</h1>
          <p className="text-xs text-slate-500">{patient.name}</p>
        </div>
      </div>

      <RxList
        rows={rows}
        selectedId={selectedId}
        checkedIds={checkedIds}
        providerLabel={providerLabel}
        onSelect={handleSelect}
        onToggleCheck={toggleCheck}
        loading={rxQuery.isLoading}
      />

      {mode !== 'empty' && (
        <RxEditPanel
          mode={mode}
          draft={draft}
          selected={selected}
          library={library}
          providers={providers}
          onChange={handleChange}
          onPickDrug={handlePickDrug}
        />
      )}

      <RxToolbar
        mode={mode}
        canStrikeOff={canStrikeOff}
        canSave={canSave}
        saving={createRx.isPending}
        ePrescribeEnabled={ePrescribeEnabled}
        onStrikeOff={handleStrikeOff}
        onPrintToday={handlePrintToday}
        onOpenPrintDialog={() => setPrintOpen(true)}
        onAddNew={handleAddNew}
        onSave={handleSave}
        onCancel={handleCancel}
        onEprescribe={handleEprescribe}
      />

      {printOpen && (
        <RxPrintDialog
          counts={printCounts}
          onPrint={handleDialogPrint}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
