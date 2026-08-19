// Letters — capture a signature against a printed consent (LTR-10).
//
// `POST /api/v1/patient-consents/{id}/sign` accepts three outcomes:
//   signed   — with EITHER a drawn signature image OR the id of an uploaded
//              patient-document holding the scanned wet-signed copy;
//   declined — with a reason;
//   voided   — neither.
// The endpoint stamps `signed_by` from the token (the staff user capturing it),
// while `signer_name` / `signer_relationship` describe who physically signed.
// Re-signing a signed consent is a 409 by design, so the caller only opens this
// for a consent still in `pending` / `printed`.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Eraser, Loader2, Upload } from 'lucide-react';
import { uploadPatientDocument } from '@/api/generated/endpoints/patients/patients';
import Modal, {
  Field,
  input_class,
  PrimaryButton,
  SecondaryButton,
} from '@/features/patient-overview/Modal';
import { DOC_TYPE_CONSENT } from './lettersModel';
import { signConsent } from './lettersService';

type Outcome = 'drawn' | 'scanned' | 'verbal' | 'declined' | 'voided';

const OUTCOMES: Array<{ value: Outcome; label: string; hint: string }> = [
  { value: 'drawn', label: 'Sign on screen', hint: 'Patient signs in the box below.' },
  { value: 'scanned', label: 'Upload signed copy', hint: 'Attach the scanned wet-signed form.' },
  { value: 'verbal', label: 'Verbal consent', hint: 'Recorded by the staff member signed in.' },
  { value: 'declined', label: 'Patient declined', hint: 'Records the refusal and the reason.' },
  { value: 'voided', label: 'Void', hint: 'Printed in error; no consent was given.' },
];

interface Props {
  consent_id: number;
  patient_id: number;
  office_id: number | null;
  title: string;
  patient_name: string;
  onClose: () => void;
  onSigned: () => void;
}

export default function ConsentSignDialog({
  consent_id,
  patient_id,
  office_id,
  title,
  patient_name,
  onClose,
  onSigned,
}: Props) {
  const [outcome, setOutcome] = useState<Outcome>('drawn');
  const [signer_name, setSignerName] = useState(patient_name);
  const [relationship, setRelationship] = useState('self');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [has_ink, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);

  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  // ---- Signature pad -------------------------------------------------------
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas_ref.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    // The canvas is drawn at its backing-store resolution but laid out by CSS,
    // so pointer coordinates have to be scaled or the ink lands off-cursor.
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = point(e);
    const ctx = canvas_ref.current?.getContext('2d');
    if (!p || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = point(e);
    const ctx = canvas_ref.current?.getContext('2d');
    if (!p || !ctx) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvas_ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  // ---- Submit --------------------------------------------------------------
  const submit = async () => {
    if (outcome === 'drawn' && !has_ink) {
      toast.error('Ask the patient to sign in the box first.');
      return;
    }
    if (outcome === 'scanned' && !file) {
      toast.error('Choose the scanned signed copy to upload.');
      return;
    }
    if (outcome === 'declined' && !reason.trim()) {
      toast.error('Record why the patient declined.');
      return;
    }

    setBusy(true);
    try {
      let document_id: number | undefined;
      if (outcome === 'scanned' && file) {
        // The scan is a patient document like any other; the sign endpoint
        // checks it belongs to this patient before accepting it.
        const doc = await uploadPatientDocument({
          file,
          patient_id,
          office_id: office_id ?? undefined,
          document_type: DOC_TYPE_CONSENT,
          description: `${title} (signed copy)`,
        });
        document_id = doc.id;
      }

      const status =
        outcome === 'declined' ? 'declined' : outcome === 'voided' ? 'voided' : 'signed';

      await signConsent(consent_id, {
        status,
        signature_method: status === 'signed' ? (outcome === 'drawn' ? 'drawn' : outcome) : null,
        signature_data:
          outcome === 'drawn'
            ? (canvas_ref.current?.toDataURL('image/png') ?? null)
            : null,
        document_id: document_id ?? null,
        signer_name: status === 'signed' ? signer_name.trim() || null : null,
        signer_relationship: status === 'signed' ? relationship.trim() || null : null,
        declined_reason: status === 'declined' ? reason.trim() : null,
      });

      toast.success(
        status === 'signed'
          ? 'Consent signed'
          : status === 'declined'
            ? 'Refusal recorded'
            : 'Consent voided',
      );
      onSigned();
      onClose();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('This consent has already been signed — the first signature is the record.');
      } else {
        console.error(err);
        toast.error('Could not record the signature.');
      }
    } finally {
      setBusy(false);
    }
  };

  const active = OUTCOMES.find((o) => o.value === outcome);

  return (
    <Modal title="Record Consent Signature" on_close={onClose} width="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-[#475569]">
          <span className="font-semibold text-[#1E293B]">{title}</span>
          <br />
          {patient_name}
        </p>

        <Field label="Outcome">
          <select
            className={input_class}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as Outcome)}
          >
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {active && <p className="-mt-2 text-[11px] text-[#64748B]">{active.hint}</p>}

        {outcome === 'drawn' && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                Signature
              </span>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3A6EA5] hover:underline"
              >
                <Eraser className="h-3 w-3" /> Clear
              </button>
            </div>
            <canvas
              ref={canvas_ref}
              width={900}
              height={260}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="h-[130px] w-full touch-none rounded border-2 border-dashed border-[#CBD5E1] bg-white"
            />
          </div>
        )}

        {outcome === 'scanned' && (
          <Field label="Scanned signed copy">
            <label className="flex cursor-pointer items-center gap-2 rounded border-2 border-dashed border-[#CBD5E1] px-3 py-2 text-sm text-[#475569] hover:bg-[#F8FAFC]">
              <Upload className="h-4 w-4 text-[#3A6EA5]" />
              {file ? file.name : 'Choose a PDF or image…'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
        )}

        {(outcome === 'drawn' || outcome === 'scanned' || outcome === 'verbal') && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Signed by">
              <input
                className={input_class}
                value={signer_name}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Name of the person signing"
              />
            </Field>
            <Field label="Relationship">
              <select
                className={input_class}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="self">Self</option>
                <option value="parent">Parent</option>
                <option value="guardian">Legal guardian</option>
                <option value="spouse">Spouse</option>
                <option value="power_of_attorney">Power of attorney</option>
              </select>
            </Field>
          </div>
        )}

        {outcome === 'declined' && (
          <Field label="Reason">
            <textarea
              className={`${input_class} min-h-[80px]`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why the patient declined this consent"
            />
          </Field>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t-2 border-[#E2E8F0] pt-4">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={submit} disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </span>
          ) : (
            'Record'
          )}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
