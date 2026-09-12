// Patient Lab Tracking tab (legacy Denticon M12) — /patient/:id/lab-tracking.
//
// A "lab case" is an appointment with lab work attached. The page reads the
// patient's cases from the server-side lab view (`GET /appointments/lab-cases`
// — denormalised names, `lab_status`, per-status counts), lets staff edit the
// lab block (vendor from the `labs` catalog, DDS, cost, short notice, dates),
// check-in a returned case (Received-on + cost → PATCH appointment), remove a
// case (`has_lab:false` — the server clears the block), filter by the legacy
// Lab Report review types, and print / export through the server report
// endpoints (jsPDF builders remain as the offline fallback).

import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FlaskConical } from 'lucide-react';
import type { LabRead } from '@/api/generated/model';
import { openServerReport } from '@/features/print/serverReport';
import {
  dateOrderError,
  draftFromCase,
  inDateRange,
  matchesFilter,
  money,
  summarize,
  todayIso,
  toUpdateBody,
  type LabCase,
  type LabDraft,
  type LabFilter,
} from './labModel';
import {
  downloadBlob,
  fetchLabCasesCsv,
  fetchLabReportPdf,
  fetchPatientLabCases,
  loadLabVendors,
  removeLabCase,
  saveLabCase,
} from './labTrackingService';
import { printLabReport, printLabCostReport, type LabReportHeader } from './labReportPrint';
import LabCaseList from './LabCaseList';
import LabCaseEditPanel from './LabCaseEditPanel';
import LabTrackingToolbar from './LabTrackingToolbar';

interface OutletContext {
  patient: {
    id: string;
    name: string;
    officeId?: string;
    chartNo?: string;
    dob?: string;
    office?: string;
  };
}

/** Review filter → server `lab_status` param (the server also knows
 *  `not_received` = sent OR overdue). */
const FILTER_TO_STATUS: Record<LabFilter, 'not_sent' | 'not_received' | 'received' | undefined> = {
  all: undefined,
  not_sent: 'not_sent',
  not_received: 'not_received',
  received: 'received',
};

/** Extract the backend's error code / message from an axios failure. */
function describeError(err: unknown): string {
  const data = (err as { response?: { data?: { error?: { code?: string; message?: string; details?: unknown } } } })
    ?.response?.data?.error;
  if (!data) return 'Failed to save lab case.';
  if (data.code === 'lab_date_order') return 'Due / Received cannot be earlier than Sent on.';
  if (data.code === 'lab_vendor_inactive') return 'That lab is inactive — pick an active lab.';
  if (data.code === 'lab_vendor_not_found') return 'That lab no longer exists — pick another.';
  if (data.code === 'validation_error') {
    const d = data.details as { loc?: unknown[]; msg?: string }[] | undefined;
    const first = d?.[0];
    if (first?.loc?.length) return `${String(first.loc[first.loc.length - 1])}: ${first.msg ?? 'invalid value'}`;
  }
  return data.message || 'Failed to save lab case.';
}

export default function LabTrackingPage() {
  const { patient } = useOutletContext<OutletContext>();
  const numericId = Number(patient.id);
  const validId = Number.isFinite(numericId) && numericId > 0;

  const casesQuery = useQuery({
    queryKey: ['lab-cases', numericId],
    queryFn: () => fetchPatientLabCases(numericId),
    enabled: validId,
  });
  const allCases = useMemo(() => casesQuery.data?.cases ?? [], [casesQuery.data]);
  const counts = casesQuery.data?.counts;

  // Vendors: active catalog + any retired lab still attached to a case.
  const attachedVendorIds = useMemo(
    () => Array.from(new Set(allCases.map((c) => c.lab_vendor_id).filter((v): v is number => v != null))),
    [allCases],
  );
  const [vendors, setVendors] = useState<LabRead[]>([]);
  useEffect(() => {
    loadLabVendors(attachedVendorIds)
      .then(setVendors)
      .catch(() => setVendors([]));
  }, [attachedVendorIds]);

  // ---- Filters ----
  const [filter, setFilter] = useState<LabFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const rows = useMemo(
    () => allCases.filter((c) => matchesFilter(c, filter) && inDateRange(c, from, to)),
    [allCases, filter, from, to],
  );

  // ---- Selection / draft ----
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LabDraft>(draftFromCase(null));
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => allCases.find((c) => c.id === selectedId) ?? null,
    [allCases, selectedId],
  );

  const handleSelect = (id: string) => {
    const c = allCases.find((x) => x.id === id) ?? null;
    setSelectedId(id);
    setDraft(draftFromCase(c));
  };
  const handleChange = (patch: Partial<LabDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const handleCancel = () => {
    setSelectedId(null);
    setDraft(draftFromCase(null));
  };

  const persist = async (body: ReturnType<typeof toUpdateBody>, msg: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveLabCase(selected.id, body);
      toast.success(msg);
      await casesQuery.refetch();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const problem = dateOrderError(draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    return persist(toUpdateBody(draft), 'Lab case saved.');
  };

  const handleCheckIn = () => {
    // Check-in stamps today's Received date (keeping any cost the user typed).
    const next: LabDraft = {
      ...draft,
      lab_received_on: draft.lab_received_on || todayIso(),
    };
    setDraft(next);
    persist(toUpdateBody(next), 'Lab case checked-in.');
  };

  const handleRemove = async () => {
    if (!selected) return;
    if (!window.confirm('Remove this appointment from lab tracking? The lab vendor, DDS, cost and dates will be cleared.')) return;
    setSaving(true);
    try {
      await removeLabCase(selected.id);
      toast.success('Lab case removed.');
      handleCancel();
      await casesQuery.refetch();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  // ---- Reports: server PDFs with the current filters, jsPDF fallback ----
  const reportHeader: LabReportHeader = {
    officeName: patient.office ?? '',
    patientName: patient.name,
    patientId: patient.id,
    chartNo: patient.chartNo,
    dob: patient.dob,
  };
  const serverParams = {
    patient_id: numericId,
    lab_status: FILTER_TO_STATUS[filter],
    date_from: from || undefined,
    date_to: to || undefined,
    sort: 'date',
    order: 'desc' as const,
  };
  const guardEmpty = (): boolean => {
    if (rows.length === 0) {
      toast.info('No lab cases match the current filter.');
      return false;
    }
    return true;
  };
  const handleLabReport = () => {
    if (!guardEmpty()) return;
    void openServerReport({
      label: 'Lab Report',
      fetch_pdf: () => fetchLabReportPdf(serverParams),
      fallback: () => printLabReport(rows, reportHeader),
    });
  };
  // The server cost report (`/lab-cases/cost-report.pdf`) is tenant/office-wide
  // (no patient_id filter — gap LAB-13), so the patient tab keeps the local
  // builder over the patient's own rows.
  const handleCostReport = () => {
    if (!guardEmpty()) return;
    printLabCostReport(rows, reportHeader);
  };
  const handleExportCsv = async () => {
    if (!guardEmpty()) return;
    try {
      const blob = await fetchLabCasesCsv(serverParams);
      downloadBlob(blob, `lab-cases-${patient.id}-${todayIso()}.csv`);
    } catch {
      toast.error('CSV export failed.');
    }
  };

  const kpi = useMemo(() => summarize(allCases), [allCases]);
  const filterCounts = counts
    ? { all: counts.all, not_sent: counts.not_sent, not_received: counts.not_received, received: counts.received }
    : undefined;

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow">
          <FlaskConical className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-slate-800">Lab Tracking</h1>
          <p className="text-xs text-slate-500">{patient.name}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Lab Cases" value={String(counts?.all ?? kpi.total)} tone="slate" />
        <Kpi label="Not Received" value={String(counts?.not_received ?? kpi.notReceived)} tone="amber" />
        <Kpi label="Overdue" value={String(counts?.overdue ?? kpi.overdue)} tone="red" />
        <Kpi label="Total Lab Cost" value={money(casesQuery.data?.total_cost ?? kpi.totalCost)} tone="blue" />
      </div>

      <LabTrackingToolbar
        filter={filter}
        onFilter={setFilter}
        counts={filterCounts}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        hasSelected={!!selected}
        saving={saving}
        onSave={handleSave}
        onCheckIn={handleCheckIn}
        onRemove={handleRemove}
        onCancel={handleCancel}
        onPrintLabReport={handleLabReport}
        onPrintCostReport={handleCostReport}
        onExportCsv={handleExportCsv}
      />

      <LabCaseList
        rows={rows}
        selectedId={selectedId}
        onSelect={handleSelect}
        loading={casesQuery.isLoading}
      />

      {selected && (
        <LabCaseEditPanel
          selected={selected}
          draft={draft}
          vendors={vendors}
          onChange={handleChange}
        />
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: 'from-slate-50 to-slate-100 text-slate-700',
  amber: 'from-amber-50 to-amber-100 text-amber-800',
  red: 'from-red-50 to-red-100 text-red-700',
  blue: 'from-blue-50 to-blue-100 text-blue-700',
};

function Kpi({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-gradient-to-br p-3 shadow-sm ${TONES[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
