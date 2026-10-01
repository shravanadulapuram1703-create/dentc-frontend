import { PenLine } from "lucide-react";
import type { SignaturePair } from "../medicalHistoryService";
import SignatureCapture from "@/features/signature/SignatureCapture";
import type { SignatureResult } from "@/features/signature/signatureModel";

export interface StagedSignatures {
  patient: SignatureResult | null;
  dentist: SignatureResult | null;
}

interface Props {
  signatures: SignaturePair;
  /** Staged (captured but unsaved) signatures, committed by the screen's SAVE button. */
  staged: StagedSignatures;
  onStage: (which: "patient" | "dentist", result: SignatureResult | null) => void;
  /** Pull the signed-in user's stored signature onto the dentist pad. */
  onLoadMySignature: () => void;
  loadingMySignature?: boolean;
}

/**
 * Tab — Signature. Legacy captures a patient signature and a dentist signature
 * side by side, plus a "Change User → LOAD MY SIG." panel.
 *
 * Both pads are the shared `SignatureCapture`: they stream from a Topaz pad
 * through SigPlusExtLite when one is connected to this workstation and fall
 * back to mouse / stylus / touch drawing otherwise. The stored format is the
 * same either way: an image data URL in `patient_signatures.signature_data`,
 * tagged with `device_source` so the record says which it was.
 */
export default function SignatureTab({
  signatures,
  staged,
  onStage,
  onLoadMySignature,
  loadingMySignature,
}: Props) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SignaturePanel
          title="Patient Signature"
          stored={signatures.patient?.signature_data ?? null}
          storedAt={signatures.patient?.created_at ?? null}
          staged={staged.patient}
          onStage={(r) => onStage("patient", r)}
        />
        <SignaturePanel
          title="Dentist Signature"
          stored={signatures.dentist?.signature_data ?? null}
          storedAt={signatures.dentist?.created_at ?? null}
          staged={staged.dentist}
          onStage={(r) => onStage("dentist", r)}
        />

        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="bg-[#1D4ED8] text-white text-center font-semibold text-sm py-1.5">
            Change User
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-[#64748B]">
              Loads the signature already on file for the signed-in user, so a
              provider does not have to re-draw it on every chart.
            </p>
            <button
              type="button"
              onClick={onLoadMySignature}
              disabled={loadingMySignature}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-[#14532D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-60"
            >
              <PenLine className="w-4 h-4" />
              {loadingMySignature ? "Loading…" : "LOAD MY SIG."}
            </button>
            <p className="text-xs text-[#64748B]">
              Signing in as a different user is done from the app&rsquo;s own
              sign-in — this screen never asks for another user&rsquo;s password.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#64748B]">
        Signatures are stored as images against the patient. The backend keeps no
        link between a signature and the exact answers it was given for, so a
        signature cannot yet prove <em>which</em> version of this history was
        signed — see gap MH-6 in the backend report.
      </p>
    </div>
  );
}

function SignaturePanel({
  title,
  stored,
  storedAt,
  staged,
  onStage,
}: {
  title: string;
  stored: string | null;
  storedAt: string | null;
  staged: SignatureResult | null;
  onStage: (result: SignatureResult | null) => void;
}) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="bg-[#1D4ED8] text-white text-center font-semibold text-sm py-1.5">
        {title}
      </div>
      <div className="p-4">
        <SignatureCapture
          value={staged}
          onChange={onStage}
          stored_image={stored}
          stored_at={storedAt}
          height={120}
          canvas_width={480}
          canvas_height={160}
          compact
          hint="Captured — press Save to store it."
        />
      </div>
    </div>
  );
}
