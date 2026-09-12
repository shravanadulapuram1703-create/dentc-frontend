// Letters — patient tab (/patient/:id/letters).
//
// Legacy reached letters from the print menu only, with no record of what had
// been generated. Here the same "Letters (New)" dialog is one click away, and
// everything previously generated for the patient is listed underneath —
// consent forms (from /patient-consents, with their signature state) joined to
// their stored PDF, plus any other letter saved to /patient-documents.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CloudOff, Eye, FileSignature, FileText, Mail, PenLine, Plus } from 'lucide-react';
import { Panel, PanelButton } from '@/features/patient-overview/ui';
import { fmt_date } from '@/features/patient-overview/format';
import {
  CONSENT_STATUS_LABEL,
  SIGNATURE_METHOD_LABEL,
  is_signable,
} from './lettersModel';
import LetterDialog from './LetterDialog';
import LetterPreviewModal, { type ViewerSource } from './LetterPreviewModal';
import ConsentSignDialog from './ConsentSignDialog';
import { openAsset } from '@/services/documentAccess';
import { lettersKeys, loadLetterHistory, type LetterHistoryRow } from './lettersService';

/** Stable identity so the memo below doesn't recompute on every render. */
const NO_ROWS: LetterHistoryRow[] = [];

const STATUS_CLASS: Record<string, string> = {
  signed: 'bg-[#DCFCE7] text-[#166534]',
  declined: 'bg-[#FEE2E2] text-[#991B1B]',
  voided: 'bg-[#E2E8F0] text-[#475569]',
  printed: 'bg-[#FEF3C7] text-[#92400E]',
  pending: 'bg-[#F1F5F9] text-[#475569]',
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
  // The Report Viewer: a freshly generated letter, or a stored consent re-opened
  // from history (to read it again, or to sign it on the document).
  const [viewer, setViewer] = useState<{ source: ViewerSource; sign: boolean } | null>(null);
  // Fallback for consents with neither rendered HTML nor a PDF to show.
  const [signing, setSigning] = useState<LetterHistoryRow | null>(null);
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: lettersKeys.history(patient_id),
    queryFn: () => loadLetterHistory(patient_id),
    enabled: valid,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: lettersKeys.history(patient_id) });

  const rows = history.data ?? NO_ROWS;
  const counts = useMemo(() => {
    const consent = rows.filter((r) => r.kind === 'consent');
    return {
      consent: consent.length,
      signed: consent.filter((r) => r.status === 'signed').length,
      letters: rows.length - consent.length,
    };
  }, [rows]);

  /** A consent can be re-opened in the viewer when there is something to show. */
  const can_view = (row: LetterHistoryRow) =>
    row.kind === 'consent' && row.consent_id != null && (!!row.rendered_html || !!row.file_url);

  const open_stored = (row: LetterHistoryRow, sign: boolean) => {
    if (can_view(row)) setViewer({ source: { kind: 'stored', row }, sign });
    else setSigning(row);
  };

  // The stored PDF's `file_url` is either a signed bucket URL (opens as-is) or
  // the `/patient-documents/{id}/content` proxy, which only answers with the
  // bearer token — a bare `<a href>` gets `{"code":"missing_token"}`. openAsset
  // fetches through the authenticated client and hands the browser a blob.
  const open_pdf = (row: LetterHistoryRow) => {
    if (!row.file_url) return;
    openAsset(row.file_url).catch((err) => {
      console.error(err);
      toast.error('Could not open the stored PDF.');
    });
  };

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
          label={`Consent forms · ${counts.signed} signed`}
          value={counts.consent}
          icon={<FileSignature className="h-4 w-4" />}
        />
        <Stat
          label="Other letters"
          value={counts.letters}
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
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-[#F1F5F9] text-left text-[11px] uppercase tracking-wide text-[#475569]">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Letter</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Document</th>
                <th className="px-3 py-2 font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {history.isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#64748B]">
                    Loading…
                  </td>
                </tr>
              )}
              {!history.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[#64748B]">
                    No letters generated for this patient yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const href = r.file_url;
                return (
                  <tr key={r.key} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    {/* Timestamps carry an offset since LTR-11 — no UTC pinning needed. */}
                    <td className="whitespace-nowrap px-3 py-2">{fmt_date(r.created_at)}</td>
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
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          STATUS_CLASS[r.status] ?? 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {CONSENT_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {r.status === 'signed' && (
                        <span className="ml-1.5 text-[11px] text-[#64748B]">
                          {r.signer_name ? `${r.signer_name} · ` : ''}
                          {SIGNATURE_METHOD_LABEL[r.signature_method ?? ''] ?? ''}
                          {r.signed_at ? ` · ${fmt_date(r.signed_at)}` : ''}
                        </span>
                      )}
                      {r.status === 'declined' && r.declined_reason && (
                        <span className="ml-1.5 text-[11px] text-[#991B1B]">
                          {r.declined_reason}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {href ? (
                        <span className="inline-flex items-center gap-1">
                          {r.storage_backend === 'local' && (
                            <CloudOff
                              className="h-3 w-3 shrink-0 text-[#94A3B8]"
                              aria-label="Stored on the app server, not the documents bucket"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => open_pdf(r)}
                            title="Open the stored PDF in a new tab"
                            className="font-medium text-[#3A6EA5] hover:underline"
                          >
                            {r.file_name ?? 'Open PDF'}
                          </button>
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        {can_view(r) && (
                          <button
                            type="button"
                            onClick={() => open_stored(r, false)}
                            title="Open in the Report Viewer"
                            className="inline-flex items-center gap-1 rounded border-2 border-[#CBD5E1] bg-white px-2 py-1 text-[11px] font-bold text-[#1F3A5F] hover:bg-[#F1F5F9]"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                        )}
                        {r.consent_id != null && is_signable(r.status) && (
                          <button
                            type="button"
                            onClick={() => open_stored(r, true)}
                            title="Read the form and sign it on the document"
                            className="inline-flex items-center gap-1 rounded bg-[#1D4ED8] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#1E40AF]"
                          >
                            <PenLine className="h-3 w-3" /> Sign
                          </button>
                        )}
                      </span>
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
            setViewer({ source: { kind: 'generated', letter }, sign: false });
          }}
        />
      )}

      {viewer && (
        <LetterPreviewModal
          source={viewer.source}
          patient_id={patient_id}
          patient_name={patient.name}
          office_id={office_id}
          sign_on_open={viewer.sign}
          onClose={() => setViewer(null)}
          onSaved={refresh}
        />
      )}

      {signing?.consent_id != null && (
        <ConsentSignDialog
          consent_id={signing.consent_id}
          patient_id={patient_id}
          office_id={office_id}
          title={signing.title}
          patient_name={patient.name}
          onClose={() => setSigning(null)}
          onSigned={refresh}
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
