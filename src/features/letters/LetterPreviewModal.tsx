// Letters — the "Report Viewer" window (legacy Print / Preview result).
//
// Legacy opened a separate Chrome window titled "Report Viewer" showing the
// rendered letter with a "Save PDF file" button pinned to the bottom. This is
// that window, in-app: the merged letter on a paper sheet, a toggle to the real
// PDF, and the actions the legacy screen offered plus "Save to Chart", which
// stores the PDF against the patient (consent forms additionally get a
// /patient-consents record).

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Download, FileText, Loader2, Printer, Save, X } from 'lucide-react';
import type jsPDF from 'jspdf';
import type { LetterTemplateRead } from '@/api/generated/model';
import { blocks_to_html, type LetterBlock } from './letterHtml';
import type { SignatureType } from './lettersModel';
import { saveLetter } from './lettersService';

export interface GeneratedLetter {
  template: LetterTemplateRead;
  is_consent: boolean;
  blocks: LetterBlock[];
  doc: jsPDF;
  unresolved: string[];
  /** Placeholders that are not in the backend merge catalog — the drift alarm. */
  unknown: string[];
  file_name: string;
  envelope_printing: boolean;
  signature_type: SignatureType;
  signer_name: string;
}

interface Props {
  letter: GeneratedLetter;
  patient_id: number;
  patient_name: string;
  office_id: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function LetterPreviewModal({
  letter,
  patient_id,
  patient_name,
  office_id,
  onClose,
  onSaved,
}: Props) {
  const [view, setView] = useState<'page' | 'pdf'>('page');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const html = useMemo(() => blocks_to_html(letter.blocks), [letter.blocks]);

  // One blob per generated letter; revoked when the viewer closes so a long
  // session printing dozens of letters does not leak object URLs.
  const [blob_url, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = letter.doc.output('bloburl') as unknown as string;
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [letter]);

  const onSavePdf = () => {
    letter.doc.save(letter.file_name);
    toast.success('PDF downloaded');
  };

  const onPrint = () => {
    letter.doc.autoPrint();
    const url = letter.doc.output('bloburl') as unknown as string;
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) toast.error('Allow pop-ups to print this letter.');
  };

  const onSaveToChart = async () => {
    setSaving(true);
    try {
      const blob = letter.doc.output('blob') as Blob;
      const file = new File([blob], letter.file_name, { type: 'application/pdf' });
      const res = await saveLetter({
        patient_id,
        office_id,
        template: letter.template,
        is_consent: letter.is_consent,
        file,
        rendered_html: html,
      });
      setSaved(true);
      onSaved();
      toast.success(
        res.consent
          ? 'Consent form saved to the patient chart'
          : 'Letter saved to patient documents',
      );
    } catch (err) {
      console.error(err);
      toast.error('Could not save the letter to the chart.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-2 sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        {/* Legacy window chrome */}
        <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2.5">
          <h2 className="truncate text-sm font-bold uppercase tracking-wide text-white">
            Report Viewer — {letter.template.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2">
          <div className="inline-flex overflow-hidden rounded border-2 border-[#CBD5E1]">
            {(['page', 'pdf'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                  view === v
                    ? 'bg-[#3A6EA5] text-white'
                    : 'bg-white text-[#1F3A5F] hover:bg-[#F1F5F9]'
                }`}
              >
                {v === 'page' ? 'Letter' : 'PDF'}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#64748B]">
            {patient_name} · {letter.is_consent ? 'Consent form' : 'Letter'}
            {letter.envelope_printing ? ' · envelope included' : ''}
          </span>
        </div>

        {letter.unresolved.length > 0 && (
          <div className="border-b border-[#FDE68A] bg-[#FFFBEB] px-4 py-2 text-[11px] text-[#92400E]">
            <strong>{letter.unresolved.length} merge field(s) printed blank:</strong>{' '}
            {letter.unresolved.join(', ')}
          </div>
        )}

        {/* A placeholder the backend catalog does not know at all means the
            template and the merge engine have drifted — louder than a blank. */}
        {letter.unknown.length > 0 && (
          <div className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-[11px] text-[#991B1B]">
            <strong>{letter.unknown.length} unrecognised placeholder(s) removed:</strong>{' '}
            {letter.unknown.join(', ')} — not in the backend merge-field catalog.
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#525659] p-4">
          {view === 'pdf' ? (
            blob_url ? (
              <iframe
                title="Letter PDF"
                src={blob_url}
                className="h-full min-h-[60vh] w-full rounded bg-white"
              />
            ) : null
          ) : (
            <article
              className="letter-sheet mx-auto max-w-[8.5in] rounded bg-white p-[0.75in] shadow-lg"
              // Content is rebuilt from the whitelisted block structure in
              // letterHtml.blocks_to_html (tags: div/strong/u/span only) after
              // every merged value was HTML-escaped, so a template row cannot
              // inject markup here.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          {saved && (
            <span className="mr-auto text-[11px] font-semibold text-[#15803D]">
              Saved to chart
            </span>
          )}
          <button
            type="button"
            onClick={onSaveToChart}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1F3A5F] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save to Chart
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1F3A5F] hover:bg-[#F1F5F9]"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={onSavePdf}
            className="inline-flex items-center gap-1.5 rounded bg-[#3A6EA5] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#1F3A5F]"
          >
            <Download className="h-3.5 w-3.5" /> Save PDF file
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1F3A5F] hover:bg-[#F1F5F9]"
          >
            <FileText className="h-3.5 w-3.5" /> Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
