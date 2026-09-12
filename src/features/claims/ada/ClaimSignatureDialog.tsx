// Capture one ADA claim-form signature (Item 36 / 37 / 53) with the shared
// Topaz / on-screen pad and store it via POST /patient-signatures.

import { useRef, useState } from "react";
import { Loader2, PenLine, X } from "lucide-react";
import SignatureCapture, { type SignatureCaptureHandle } from "@/features/signature/SignatureCapture";
import type { SignatureResult } from "@/features/signature/signatureModel";
import { CLAIM_SIGNATURE_LABEL, saveClaimSignature, type ClaimSignature, type ClaimSignatureKey } from "./adaClaimSignatures";

interface Props {
  patient_id: number;
  signature_key: ClaimSignatureKey;
  /** Who is signing — patient name, subscriber name or the treating dentist. */
  signer_name: string;
  /** Signed-in user id for attribution (treating dentist / over-the-shoulder). */
  signed_by_user_id: number | null;
  onSaved: (sig: ClaimSignature) => void;
  onClose: () => void;
}

export default function ClaimSignatureDialog({ patient_id, signature_key, signer_name, signed_by_user_id, onSaved, onClose }: Props) {
  const [value, setValue] = useState<SignatureResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pad = useRef<SignatureCaptureHandle | null>(null);
  const meta = CLAIM_SIGNATURE_LABEL[signature_key];

  const save = async () => {
    setError(null);
    let sig = value;
    if (!sig) sig = (await pad.current?.finish()) ?? null;
    if (!sig) {
      setError("Sign on the pad first.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveClaimSignature({ patient_id, key: signature_key, result: sig, signed_by_user_id });
      onSaved(saved);
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      setError(status?.data?.detail || (status?.status ? `Could not store the signature (HTTP ${status.status}).` : "Could not store the signature."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-2xl flex flex-col">
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2 flex items-center justify-between rounded-t">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <PenLine className="w-4 h-4" strokeWidth={2} />
            Item {meta.item} — {meta.title}
          </h2>
          <button onClick={onClose} className="p-1 text-white hover:bg-white/20 rounded" title="Close" disabled={busy}>
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="text-slate-700">
            <span className="font-semibold">{signer_name || "Signer"}</span> — {meta.who} Signs on the Topaz pad when one is connected to this
            workstation, otherwise on screen.
          </div>
          <SignatureCapture
            ref={pad}
            value={value}
            onChange={setValue}
            always_open
            height={150}
            canvas_width={900}
            canvas_height={300}
            hint="Accepted — press Save signature to store it on the patient record."
          />
          {error && <div className="border border-red-200 bg-red-50 text-red-700 rounded px-3 py-2">{error}</div>}
        </div>
        <div className="bg-slate-100 border-t-2 border-slate-300 px-4 py-2 flex items-center justify-end gap-2 rounded-b">
          <button onClick={onClose} disabled={busy} className="px-3 py-1.5 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600 font-semibold uppercase tracking-wide disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide flex items-center gap-1 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" strokeWidth={2} />}
            Save signature
          </button>
        </div>
      </div>
    </div>
  );
}
