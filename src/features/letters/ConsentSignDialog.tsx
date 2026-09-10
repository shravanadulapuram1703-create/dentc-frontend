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
import { Loader2, Upload } from 'lucide-react';
import { uploadPatientDocument } from '@/api/generated/endpoints/patients/patients';
import Modal, {
  Field,
  input_class,
  PrimaryButton,
  SecondaryButton,
} from '@/features/patient-overview/Modal';
import { DOC_TYPE_CONSENT } from './lettersModel';
import { signConsent } from './lettersService';
import SignatureCapture, { type SignatureCaptureHandle } from '@/features/signature/SignatureCapture';
import { DEVICE_SOURCE, type SignatureResult } from '@/features/signature/signatureModel';

type Outcome = 'drawn' | 'scanned' | 'verbal' | 'declined' | 'voided';

const OUTCOMES: Array<{ value: Outcome; label: string; hint: string }> = [
  { value: 'drawn', label: 'Sign now', hint: 'Patient signs on the Topaz pad, or on screen when no pad is connected.' },
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
  const [signature, setSignature] = useState<SignatureResult | null>(null);
  const [busy, setBusy] = useState(false);
  const pad_ref = useRef<SignatureCaptureHandle | null>(null);

  // ---- Signature pad -------------------------------------------------------
  // The pad itself is the shared <SignatureCapture/>: Topaz when a pad is
  // connected to this workstation, mouse / touch drawing otherwise.

  // ---- Submit --------------------------------------------------------------
  const submit = async () => {
    // Accept whatever is on the pad if the user went straight to Record.
    let sig = signature;
    if (outcome === 'drawn' && !sig) {
      sig = (await pad_ref.current?.finish()) ?? null;
    }
    if (outcome === 'drawn' && !sig) {
      toast.error('Ask the patient to sign first.');
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

      // `signature_method` tells the record which device captured it; the
      // SigString itself has nowhere to go yet (gap SIG-1).
      const drawn_method = sig?.device_source === DEVICE_SOURCE.TOPAZ ? 'topaz' : 'drawn';
      await signConsent(consent_id, {
        status,
        signature_method: status === 'signed' ? (outcome === 'drawn' ? drawn_method : outcome) : null,
        signature_data: outcome === 'drawn' ? (sig?.signature_data ?? null) : null,
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
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
              Signature
            </span>
            <SignatureCapture
              ref={pad_ref}
              value={signature}
              onChange={setSignature}
              always_open
              height={150}
              canvas_width={900}
              canvas_height={300}
              hint="Accepted — press Record to store it."
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
