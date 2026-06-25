// Patient Lab Tracking tab (legacy Denticon M12) — /patient/:id/lab-tracking.
//
// A "lab case" is an appointment with lab work attached, so this page lists the
// patient's has_lab appointments, lets staff book/edit the lab fields and
// check-in a returned case (set Received-on + cost → PATCH appointment), filters
// by the legacy Lab Report review types, and prints the Lab Report / Lab Cost
// Report client-side. Lab data lives on the appointment; backend gaps (no lab
// vendor field, no lab filters/report endpoints) are in
// docs/lab-tracking/lab_tracking_backend_devreport.md.

import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FlaskConical } from 'lucide-react';
import {
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
import { fetchPatientLabCases, loadLabVendors, saveLabCase } from './labTrackingService';
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

export default function LabTrackingPage() {
  const { patient } = useOutletContext<OutletContext>();
  const numericId = Number(patient.id);
  const validId = Number.isFinite(numericId) && numericId > 0;

  const casesQuery = useQuery({
    queryKey: ['lab-cases', numericId],
    queryFn: () => fetchPatientLabCases(numericId),
    enabled: validId,
  });
  const allCases = useMemo(() => casesQuery.data ?? [], [casesQuery.data]);

  const [vendors, setVendors] = useState<string[]>([]);
  useEffect(() => {
    loadLabVendors().then(setVendors).catch(() => setVendors([]));
  }, []);

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
    } catch {
      toast.error('Failed to save lab case.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => persist(toUpdateBody(draft), 'Lab case saved.');

  const handleCheckIn = () => {
    // Check-in stamps today's Received date (keeping any cost the user typed).
    const next: LabDraft = {
      ...draft,
      lab_received_on: draft.lab_received_on || todayIso(),
    };
    setDraft(next);
    persist(toUpdateBody(next), 'Lab case checked-in.');
  };

  // ---- Reports (use the currently filtered rows) ----
  const reportHeader: LabReportHeader = {
    officeName: patient.office ?? '',
    patientName: patient.name,
    patientId: patient.id,
    chartNo: patient.chartNo,
    dob: patient.dob,
  };
  const doReport = (fn: (c: LabCase[], h: LabReportHeader) => void) => {
    if (rows.length === 0) {
      toast.info('No lab cases match the current filter.');
      return;
    }
    fn(rows, reportHeader);
  };

  const kpi = useMemo(() => summarize(allCases), [allCases]);

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
        <Kpi label="Lab Cases" value={String(kpi.total)} tone="slate" />
        <Kpi label="Not Received" value={String(kpi.notReceived)} tone="amber" />
        <Kpi label="Overdue" value={String(kpi.overdue)} tone="red" />
        <Kpi label="Total Lab Cost" value={money(kpi.totalCost)} tone="blue" />
      </div>

      <LabTrackingToolbar
        filter={filter}
        onFilter={setFilter}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        hasSelected={!!selected}
        saving={saving}
        onSave={handleSave}
        onCheckIn={handleCheckIn}
        onCancel={handleCancel}
        onPrintLabReport={() => doReport(printLabReport)}
        onPrintCostReport={() => doReport(printLabCostReport)}
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
