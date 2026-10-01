// Letters — the "Report Viewer" window (legacy Print / Preview result).
//
// Legacy opened a separate Chrome window titled "Report Viewer" showing the
// rendered letter with a "Save PDF file" button pinned to the bottom. This is
// that window, in-app: the merged letter on a paper sheet, a toggle to the real
// PDF, and the actions the legacy screen offered plus "Save to Chart", which
// stores the PDF against the patient (consent forms additionally get a
// /patient-consents record).
//
// Consent forms are signed HERE, on the document: the signature lines at the
// foot of the sheet are live (Topaz pad or on-screen), the captured signature
// is stamped into the PDF that gets stored, and the consent record is marked
// signed in the same action. The viewer opens for two sources:
//   • generated — a letter just merged in LetterDialog (in-memory jsPDF);
//   • stored    — a consent from Letter History (rendered HTML + stored PDF),
//                 so a form printed earlier can be signed later on screen.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  PenLine,
  Printer,
  Save,
  X,
} from 'lucide-react';
import type jsPDF from 'jspdf';
import type { LetterTemplateRead } from '@/api/generated/model';
import { DEVICE_SOURCE, signatureBodyFields, type SignatureResult } from '@/features/signature/signatureModel';
import { blocks_to_html, parse_letter_html, type LetterBlock } from './letterHtml';
import { build_letter_pdf, type LetterPdfHeader, type LetterPdfOptions } from './letterPdf';
import { is_signable, signature_line, type SignatureType } from './lettersModel';
import { useAssetObjectUrl } from '@/services/documentAccess';
import { saveLetter, signConsent, type LetterHistoryRow } from './lettersService';
import ConsentSignatureBlock, { type StoredSignature } from './ConsentSignatureBlock';
import ConsentSignDialog from './ConsentSignDialog';

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
  /** Inputs of `build_letter_pdf`, kept so the PDF can be rebuilt with signatures stamped on. */
  pdf_header: LetterPdfHeader;
  pdf_opts: LetterPdfOptions;
}

export type ViewerSource =
  | { kind: 'generated'; letter: GeneratedLetter }
  | { kind: 'stored'; row: LetterHistoryRow };

interface Props {
  source: ViewerSource;
  patient_id: number;
  patient_name: string;
  office_id: number | null;
  onClose: () => void;
  onSaved: () => void;
  /** Open the patient signature pad as soon as the viewer shows (history "Sign"). */
  sign_on_open?: boolean;
}

export default function LetterPreviewModal({
  source,
  patient_id,
  patient_name,
  office_id,
  onClose,
  onSaved,
  sign_on_open = false,
}: Props) {
  const generated = source.kind === 'generated' ? source.letter : null;
  const stored = source.kind === 'stored' ? source.row : null;

  const title = generated ? generated.template.name : (stored?.title ?? 'Letter');
  const is_consent = generated ? generated.is_consent : stored?.kind === 'consent' && stored.consent_id != null;

  // ---- document body -------------------------------------------------------
  const blocks = useMemo<LetterBlock[]>(() => {
    if (generated) return generated.blocks;
    return stored?.rendered_html ? parse_letter_html(stored.rendered_html) : [];
  }, [generated, stored]);
  const html = useMemo(() => blocks_to_html(blocks), [blocks]);
  const has_page = blocks.length > 0;
  // The stored PDF. `file_url` is a signed bucket URL (usable as-is) or the
  // authenticated `/patient-documents/{id}/content` proxy, which an <iframe>
  // or window.open cannot send the bearer token to — so it is fetched through
  // the API client and rendered from a blob URL (revoked on close).
  const stored_pdf = useAssetObjectUrl(stored?.file_url);
  const stored_pdf_href = stored_pdf.src || null;

  const [view, setView] = useState<'page' | 'pdf'>(has_page ? 'page' : 'pdf');

  // ---- signing state -------------------------------------------------------
  const already_signed: StoredSignature | null =
    stored && stored.status === 'signed'
      ? {
          image: stored.signature_data,
          signer_name: stored.signer_name,
          signer_relationship: stored.signer_relationship,
          signed_at: stored.signed_at,
          method: stored.signature_method,
        }
      : null;
  const [recorded, setRecorded] = useState<StoredSignature | null>(already_signed);
  const signable = is_consent && !recorded && (generated ? true : is_signable(stored?.status ?? ''));

  const [patient_sig, setPatientSig] = useState<SignatureResult | null>(null);
  const [countersign_sig, setCountersignSig] = useState<SignatureResult | null>(null);
  const [signer_name, setSignerName] = useState(patient_name);
  const [relationship, setRelationship] = useState('self');
  const [other_outcome, setOtherOutcome] = useState(false);

  const countersign =
    generated && generated.is_consent && signature_line(generated.signature_type)
      ? { label: signature_line(generated.signature_type), name: generated.signer_name }
      : null;

  // The PDF shown / stored: rebuilt with the signatures stamped on the lines.
  const doc = useMemo<jsPDF | null>(() => {
    if (!generated) return null;
    if (!patient_sig && !countersign_sig) return generated.doc;
    const stamp = (r: SignatureResult | null, name?: string) =>
      r ? { image_data_url: r.signature_data, signed_at: r.captured_at, signer_name: name ?? null } : null;
    return build_letter_pdf(generated.blocks, generated.pdf_header, {
      ...generated.pdf_opts,
      signatures: { patient: stamp(patient_sig, signer_name), countersign: stamp(countersign_sig) },
    });
  }, [generated, patient_sig, countersign_sig, signer_name]);

  // One blob per rendered PDF; revoked on change/close so a long session
  // printing dozens of letters does not leak object URLs.
  const [blob_url, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!doc) {
      setBlobUrl(null);
      return;
    }
    const url = doc.output('bloburl') as unknown as string;
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc]);

  // ---- persistence ---------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consent_id, setConsentId] = useState<number | null>(stored?.consent_id ?? null);

  const record_signature = async (id: number) => {
    if (!patient_sig) return;
    await signConsent(id, {
      status: 'signed',
      signature_method: patient_sig.device_source === DEVICE_SOURCE.TOPAZ ? 'topaz' : 'drawn',
      ...signatureBodyFields(patient_sig),
      signer_name: signer_name.trim() || patient_name,
      signer_relationship: relationship,
    });
    setRecorded({
      image: patient_sig.signature_data,
      signer_name: signer_name.trim() || patient_name,
      signer_relationship: relationship,
      signed_at: patient_sig.captured_at,
      method: patient_sig.device_source === DEVICE_SOURCE.TOPAZ ? 'topaz' : 'drawn',
    });
  };

  /** Generated letter: store the (signed) PDF, then record the signature. */
  const onSaveToChart = async () => {
    if (!generated || !doc) return;
    setSaving(true);
    try {
      let id = consent_id;
      if (!saved) {
        const blob = doc.output('blob') as Blob;
        const file = new File([blob], generated.file_name, { type: 'application/pdf' });
        const res = await saveLetter({
          patient_id,
          office_id,
          template: generated.template,
          is_consent: generated.is_consent,
          file,
          rendered_html: html,
        });
        id = res.consent?.id ?? null;
        setConsentId(id);
        setSaved(true);
      }
      if (patient_sig && id != null) {
        await record_signature(id);
        toast.success('Consent signed and saved to the patient chart');
      } else {
        toast.success(
          generated.is_consent ? 'Consent form saved to the patient chart' : 'Letter saved to patient documents',
        );
      }
      onSaved();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      console.error(err);
      toast.error(
        status === 409
          ? 'This consent has already been signed — the first signature is the record.'
          : 'Could not save the letter to the chart.',
      );
    } finally {
      setSaving(false);
    }
  };

  /** Stored consent: only the signature is recorded (the PDF stays as printed). */
  const onRecordStored = async () => {
    if (!stored || consent_id == null || !patient_sig) return;
    setSaving(true);
    try {
      await record_signature(consent_id);
      toast.success('Consent signed');
      onSaved();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      console.error(err);
      toast.error(
        status === 409
          ? 'This consent has already been signed — the first signature is the record.'
          : 'Could not record the signature.',
      );
    } finally {
      setSaving(false);
    }
  };

  const onSavePdf = () => {
    if (doc && generated) {
      doc.save(generated.file_name);
      toast.success('PDF downloaded');
    } else if (stored_pdf_href) {
      window.open(stored_pdf_href, '_blank', 'noopener,noreferrer');
    } else if (stored_pdf.error) {
      toast.error('Could not load the stored PDF.');
    }
  };

  const onPrint = () => {
    let url: string | null = null;
    if (doc) {
      doc.autoPrint();
      url = doc.output('bloburl') as unknown as string;
    } else {
      url = stored_pdf_href;
    }
    if (!url) return;
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) toast.error('Allow pop-ups to print this letter.');
  };

  const primary_label = generated
    ? patient_sig && !recorded
      ? saved
        ? 'Record Signature'
        : 'Sign & Save to Chart'
      : 'Save to Chart'
    : 'Record Signature';
  const primary_disabled = saving || (generated ? saved && (!patient_sig || !!recorded) : !patient_sig || !!recorded);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-0 sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-lg sm:border-2 sm:border-[#E2E8F0]">
        {/* Legacy window chrome */}
        <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2.5">
          <h2 className="truncate text-sm font-bold uppercase tracking-wide text-white">
            Report Viewer — {title}
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
                disabled={v === 'page' ? !has_page : !(blob_url || stored_pdf_href)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40 ${
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
            {patient_name} · {is_consent ? 'Consent form' : 'Letter'}
            {generated?.envelope_printing ? ' · envelope included' : ''}
          </span>
          {recorded && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
              <CheckCircle2 className="h-3 w-3" /> Signed
            </span>
          )}
          {!recorded && signable && !patient_sig && (
            <button
              type="button"
              onClick={() => {
                setView('page');
                document
                  .querySelector('.consent-signature-block')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="ml-auto inline-flex items-center gap-1 rounded bg-[#1D4ED8] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1E40AF]"
            >
              <PenLine className="h-3 w-3" /> Sign this form
            </button>
          )}
        </div>

        {generated && generated.unresolved.length > 0 && (
          <div className="border-b border-[#FDE68A] bg-[#FFFBEB] px-4 py-2 text-[11px] text-[#92400E]">
            <strong>{generated.unresolved.length} merge field(s) printed blank:</strong>{' '}
            {generated.unresolved.join(', ')}
          </div>
        )}

        {/* A placeholder the backend catalog does not know at all means the
            template and the merge engine have drifted — louder than a blank. */}
        {generated && generated.unknown.length > 0 && (
          <div className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-[11px] text-[#991B1B]">
            <strong>{generated.unknown.length} unrecognised placeholder(s) removed:</strong>{' '}
            {generated.unknown.join(', ')} — not in the backend merge-field catalog.
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#525659] p-2 sm:p-4">
          {view === 'pdf' ? (
            blob_url || stored_pdf_href ? (
              <iframe
                title="Letter PDF"
                src={(blob_url ?? stored_pdf_href) as string}
                className="h-full min-h-[60vh] w-full rounded bg-white"
              />
            ) : null
          ) : (
            <article className="letter-sheet mx-auto max-w-[8.5in] rounded bg-white p-5 shadow-lg sm:p-[0.75in]">
              {/* Content is rebuilt from the whitelisted block structure in
                  letterHtml.blocks_to_html (tags: div/strong/u/span only) after
                  every merged value was HTML-escaped, so a template row cannot
                  inject markup here. */}
              <div dangerouslySetInnerHTML={{ __html: html }} />
              {is_consent && (
                <ConsentSignatureBlock
                  patient_name={patient_name}
                  countersign={countersign}
                  stored={recorded}
                  editable={signable}
                  patient_sig={patient_sig}
                  countersign_sig={countersign_sig}
                  onPatientSig={setPatientSig}
                  onCountersignSig={setCountersignSig}
                  signer_name={signer_name}
                  onSignerName={setSignerName}
                  relationship={relationship}
                  onRelationship={setRelationship}
                  auto_open={sign_on_open}
                />
              )}
            </article>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 sm:px-4">
          {(saved || recorded) && (
            <span className="mr-auto text-[11px] font-semibold text-[#15803D]">
              {recorded ? 'Signed' : 'Saved to chart'}
              {saved ? ' · saved to chart' : ''}
            </span>
          )}
          {patient_sig && !recorded && (
            <span className="mr-auto text-[11px] font-semibold text-[#92400E]">
              Signature captured — press {primary_label} to store it
            </span>
          )}

          {stored && signable && (
            <button
              type="button"
              onClick={() => setOtherOutcome(true)}
              className="rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1F3A5F] hover:bg-[#F1F5F9]"
              title="Upload a scanned copy, record verbal consent, a refusal, or void the form"
            >
              Other outcome…
            </button>
          )}

          {(generated || (stored && signable)) && (
            <button
              type="button"
              onClick={generated ? onSaveToChart : onRecordStored}
              disabled={primary_disabled}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-bold disabled:opacity-50 ${
                patient_sig && !recorded
                  ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                  : 'border-2 border-[#CBD5E1] bg-white text-[#1F3A5F] hover:bg-[#F1F5F9]'
              }`}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : patient_sig && !recorded ? (
                <PenLine className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {primary_label}
            </button>
          )}
          <button
            type="button"
            onClick={onPrint}
            disabled={!doc && !stored_pdf_href}
            className="inline-flex items-center gap-1.5 rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1F3A5F] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={onSavePdf}
            disabled={!doc && !stored_pdf_href}
            className="inline-flex items-center gap-1.5 rounded bg-[#3A6EA5] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#1F3A5F] disabled:opacity-50"
          >
            {generated ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            {generated ? 'Save PDF file' : 'Open PDF'}
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

      {other_outcome && stored && consent_id != null && (
        <ConsentSignDialog
          consent_id={consent_id}
          patient_id={patient_id}
          office_id={office_id}
          title={title}
          patient_name={patient_name}
          onClose={() => setOtherOutcome(false)}
          onSigned={() => {
            onSaved();
            onClose();
          }}
        />
      )}
    </div>,
    document.body,
  );
}
