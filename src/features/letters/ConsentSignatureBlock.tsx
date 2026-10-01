// Letters — the signature lines printed at the foot of a consent form, made
// live. Rendered inside the Report Viewer's paper sheet, directly under the
// consent text, so the patient reads the document and signs on it in the same
// view. Each line is the shared <SignatureCapture/> (Topaz pad when connected,
// on-screen otherwise); once accepted the image sits on the line exactly where
// it will print, and the viewer's footer commits it.

import { useEffect, useState } from 'react';
import { PenLine, RotateCcw } from 'lucide-react';
import SignatureCapture from '@/features/signature/SignatureCapture';
import { DEVICE_SOURCE, type SignatureResult } from '@/features/signature/signatureModel';
import { input_class } from '@/features/patient-overview/Modal';
import { SIGNATURE_METHOD_LABEL } from './lettersModel';

/** A signature already on the consent record (read-only). */
export interface StoredSignature {
  image: string | null;
  signer_name: string | null;
  signer_relationship: string | null;
  signed_at: string | null;
  method: string | null;
}

export const RELATIONSHIPS = [
  { value: 'self', label: 'Self' },
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Legal guardian' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'power_of_attorney', label: 'Power of attorney' },
] as const;

type LineKey = 'patient' | 'countersign';

interface Props {
  patient_name: string;
  /** The countersign line (Dentist / Hygienist / …), when the form has one. */
  countersign: { label: string; name: string } | null;
  /** Signature already recorded — the block becomes read-only. */
  stored: StoredSignature | null;
  /** Consent still accepts a signature (pending / printed). */
  editable: boolean;
  patient_sig: SignatureResult | null;
  countersign_sig: SignatureResult | null;
  onPatientSig: (r: SignatureResult | null) => void;
  onCountersignSig: (r: SignatureResult | null) => void;
  signer_name: string;
  onSignerName: (v: string) => void;
  relationship: string;
  onRelationship: (v: string) => void;
  /** Open the patient pad straight away (history "Sign" button). */
  auto_open?: boolean;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export default function ConsentSignatureBlock({
  patient_name,
  countersign,
  stored,
  editable,
  patient_sig,
  countersign_sig,
  onPatientSig,
  onCountersignSig,
  signer_name,
  onSignerName,
  relationship,
  onRelationship,
  auto_open = false,
}: Props) {
  const [open, setOpen] = useState<LineKey | null>(null);

  useEffect(() => {
    if (auto_open && editable && !stored && !patient_sig) setOpen('patient');
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stored_is_image = !!stored?.image && /^(data:|https?:)/.test(stored.image);

  return (
    <section
      className="consent-signature-block mt-8 border-t border-[#94A3B8] pt-5 font-sans text-[#1E293B]"
      aria-label="Signatures"
    >
      {/* ---- Patient / Guardian --------------------------------------- */}
      <SignatureLine
        label="Patient / Guardian"
        print_name={stored?.signer_name || (patient_sig ? signer_name : '') || patient_name}
        date={stored?.signed_at ?? patient_sig?.captured_at ?? null}
        image={stored ? (stored_is_image ? stored.image : null) : (patient_sig?.signature_data ?? null)}
        note={
          stored
            ? [
                stored.method ? SIGNATURE_METHOD_LABEL[stored.method] ?? stored.method : null,
                stored.signer_relationship && stored.signer_relationship !== 'self'
                  ? `as ${RELATIONSHIPS.find((r) => r.value === stored.signer_relationship)?.label ?? stored.signer_relationship}`
                  : null,
                !stored_is_image && stored.image ? 'Topaz signature on file (legacy data)' : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : patient_sig
              ? `${patient_sig.device_source === DEVICE_SOURCE.TOPAZ ? 'Signed on Topaz pad' : 'Signed on screen'} — not saved yet`
              : null
        }
        editable={editable && !stored}
        is_open={open === 'patient'}
        has_value={!!patient_sig}
        onOpen={() => setOpen('patient')}
        onRedo={() => {
          onPatientSig(null);
          setOpen('patient');
        }}
      >
        {open === 'patient' && (
          <div className="mt-2 rounded-lg border-2 border-[#3A6EA5] bg-[#F8FAFC] p-3 shadow-sm">
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                  Signed by
                </span>
                <input
                  className={input_class}
                  value={signer_name}
                  onChange={(e) => onSignerName(e.target.value)}
                  placeholder="Name of the person signing"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                  Relationship
                </span>
                <select
                  className={input_class}
                  value={relationship}
                  onChange={(e) => onRelationship(e.target.value)}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <SignatureCapture
              value={patient_sig}
              onChange={(r) => {
                onPatientSig(r);
                if (r) setOpen(null);
              }}
              always_open
              height={150}
              canvas_width={900}
              canvas_height={300}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="text-[11px] font-semibold text-[#64748B] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </SignatureLine>

      {/* ---- Countersign (Dentist / Hygienist / …) ---------------------- */}
      {countersign && (
        <SignatureLine
          label={countersign.label}
          print_name={countersign.name}
          date={countersign_sig?.captured_at ?? null}
          image={countersign_sig?.signature_data ?? null}
          note={
            countersign_sig
              ? `${countersign_sig.device_source === DEVICE_SOURCE.TOPAZ ? 'Signed on Topaz pad' : 'Signed on screen'} — printed on the PDF only`
              : null
          }
          editable={editable && !stored}
          is_open={open === 'countersign'}
          has_value={!!countersign_sig}
          onOpen={() => setOpen('countersign')}
          onRedo={() => {
            onCountersignSig(null);
            setOpen('countersign');
          }}
        >
          {open === 'countersign' && (
            <div className="mt-2 rounded-lg border-2 border-[#3A6EA5] bg-[#F8FAFC] p-3 shadow-sm">
              <SignatureCapture
                value={countersign_sig}
                onChange={(r) => {
                  onCountersignSig(r);
                  if (r) setOpen(null);
                }}
                always_open
                height={150}
                canvas_width={900}
                canvas_height={300}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="text-[11px] font-semibold text-[#64748B] hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SignatureLine>
      )}
    </section>
  );
}

function SignatureLine({
  label,
  print_name,
  date,
  image,
  note,
  editable,
  is_open,
  has_value,
  onOpen,
  onRedo,
  children,
}: {
  label: string;
  print_name: string;
  date: string | null;
  image: string | null;
  note: string | null;
  editable: boolean;
  is_open: boolean;
  has_value: boolean;
  onOpen: () => void;
  onRedo: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <span className="w-36 shrink-0 text-[12px] text-[#334155]">{label}</span>

        {/* the line itself */}
        <div className="relative flex-1 border-b border-[#334155]">
          <div className="flex h-16 items-end">
            {image ? (
              <img
                src={image}
                alt={`${label} signature`}
                className="max-h-16 max-w-full object-contain object-left-bottom"
              />
            ) : editable && !is_open ? (
              <button
                type="button"
                onClick={onOpen}
                className="mb-1 inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[#3A6EA5] bg-[#EFF6FF] px-3 py-1 text-[12px] font-bold text-[#1F3A5F] hover:bg-[#DBEAFE]"
              >
                <PenLine className="h-3.5 w-3.5" /> Sign here
              </button>
            ) : null}
          </div>
          {image && editable && has_value && (
            <button
              type="button"
              onClick={onRedo}
              title="Sign again"
              className="absolute right-0 top-0 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] hover:text-[#1F3A5F]"
            >
              <RotateCcw className="h-3 w-3" /> Redo
            </button>
          )}
        </div>

        <div className="flex items-end gap-2 sm:w-44">
          <span className="text-[12px] text-[#334155]">Date</span>
          <span className="flex-1 border-b border-[#334155] pb-0.5 text-[12px]">
            {fmt(date) || ' '}
          </span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 sm:pl-40">
        <span className="text-[10px] text-[#64748B]">Print name: {print_name}</span>
        {note && <span className="text-[10px] font-semibold text-[#166534]">{note}</span>}
      </div>
      {children}
    </div>
  );
}
