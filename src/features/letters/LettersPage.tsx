// Letters — patient tab (/patient/:id/letters).
//
// Legacy reached letters from the print menu only, with no record of what had
// been generated. Here the same "Letters (New)" dialog is one click away, and
// everything previously generated for the patient is listed underneath —
// consent forms (from /patient-consents) joined to their stored PDF, plus any
// other letter saved to /patient-documents.

import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, FileSignature, FileText, Plus } from 'lucide-react';
import { Panel, PanelButton } from '@/features/patient-overview/ui';
import { fmt_date } from '@/features/patient-overview/format';
import { env } from '@/shared/config/env';
import LetterDialog from './LetterDialog';
import LetterPreviewModal, { type GeneratedLetter } from './LetterPreviewModal';
import { lettersKeys, loadLetterHistory, type LetterHistoryRow } from './lettersService';

/** Stable identity so the memo below doesn't recompute on every render. */
const NO_ROWS: LetterHistoryRow[] = [];

/**
 * `created_at` comes back as a naive timestamp that is actually UTC
 * ("2026-08-19T02:05:11"), and `new Date()` would read it as local time — which
 * dates a letter printed at 22:05 on the 18th as the 19th. Pin it to UTC before
 * formatting.
 */
const fmt_stamp = (created_at: string): string => {
  const naive = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(created_at);
  const d = new Date(naive ? `${created_at}Z` : created_at);
  return Number.isNaN(d.getTime())
    ? fmt_date(created_at)
    : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

interface OutletContext {
  patient: { id: string; name: string; officeId?: string };
}

export default function LettersPage() {
  const { patient } = useOutletContext<OutletContext>();
  const patient_id = Number(patient.id);
  const office_id = patient.officeId ? Number(patient.officeId) : null;
  const valid = Number.isFinite(patient_id) && patient_id > 0;

  const [dialog_open, setDialogOpen] = useState(false);
  const [generated, setGenerated] = useState<GeneratedLetter | null>(null);
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: lettersKeys.history(patient_id),
    queryFn: () => loadLetterHistory(patient_id),
    enabled: valid,
  });

  const rows = history.data ?? NO_ROWS;
  const consent_count = useMemo(
    () => rows.filter((r) => r.kind === 'consent').length,
    [rows],
  );

  /** patient-documents stores a server-relative path; resolve it for the link. */
  const doc_href = (file_url: string | null) =>
    !file_url ? null : /^https?:/i.test(file_url) ? file_url : `${env.apiBaseUrl}${file_url}`;

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="inline-flex items-center gap-2 text-lg font-bold text-slate-800">
          <Mail className="h-5 w-5 text-[#3A6EA5]" /> Letters
        </h1>
        <span className="text-xs text-slate-500">{patient.name}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Generated" value={rows.length} icon={<FileText className="h-4 w-4" />} />
        <Stat
          label="Consent forms"
          value={consent_count}
          icon={<FileSignature className="h-4 w-4" />}
        />
        <Stat
          label="Other letters"
          value={rows.length - consent_count}
          icon={<Mail className="h-4 w-4" />}
        />
      </div>

      <Panel
        title="Letter History"
        actions={
          <PanelButton onClick={() => setDialogOpen(true)} disabled={!valid}>
            <Plus className="h-3 w-3" /> New Letter
          </PanelButton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-[#F1F5F9] text-left text-[11px] uppercase tracking-wide text-[#475569]">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Letter</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Document</th>
              </tr>
            </thead>
            <tbody>
              {history.isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[#64748B]">
                    Loading…
                  </td>
                </tr>
              )}
              {!history.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#64748B]">
                    No letters generated for this patient yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const href = doc_href(r.file_url);
                return (
                  <tr key={r.key} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="whitespace-nowrap px-3 py-2">{fmt_stamp(r.created_at)}</td>
                    <td className="px-3 py-2 font-medium text-[#1E293B]">{r.title}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          r.kind === 'consent'
                            ? 'bg-[#DBEAFE] text-[#1E40AF]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {r.kind === 'consent' ? 'Consent' : 'Letter'}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize text-[#475569]">{r.status}</td>
                    <td className="px-3 py-2">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#3A6EA5] hover:underline"
                        >
                          {r.file_name ?? 'Open PDF'}
                        </a>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {dialog_open && (
        <LetterDialog
          patient_id={patient_id}
          office_id={office_id}
          patient_name={patient.name}
          onClose={() => setDialogOpen(false)}
          onGenerated={(letter) => {
            setDialogOpen(false);
            setGenerated(letter);
          }}
        />
      )}

      {generated && (
        <LetterPreviewModal
          letter={generated}
          patient_id={patient_id}
          patient_name={patient.name}
          office_id={office_id}
          onClose={() => setGenerated(null)}
          onSaved={() =>
            queryClient.invalidateQueries({ queryKey: lettersKeys.history(patient_id) })
          }
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-[#E2E8F0] bg-white px-3 py-2.5">
      <span className="rounded bg-[#EFF6FF] p-1.5 text-[#3A6EA5]">{icon}</span>
      <div>
        <div className="text-lg font-bold leading-none text-[#1E293B]">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-[#64748B]">{label}</div>
      </div>
    </div>
  );
}
