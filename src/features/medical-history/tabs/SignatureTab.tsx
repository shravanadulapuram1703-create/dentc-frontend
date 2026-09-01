import { useRef, useState } from "react";
import { Check, Eraser, PenLine } from "lucide-react";
import type { SignaturePair } from "../medicalHistoryService";

interface Props {
  signatures: SignaturePair;
  /** Staged (drawn but unsaved) images, committed by the screen's SAVE button. */
  staged: { patient: string | null; dentist: string | null };
  onStage: (which: "patient" | "dentist", dataUrl: string | null) => void;
  /** Pull the signed-in user's stored signature onto the dentist pad. */
  onLoadMySignature: () => void;
  loadingMySignature?: boolean;
}

/**
 * Tab — Signature. Legacy captures a patient signature and a dentist signature
 * side by side, plus a "Change User → LOAD MY SIG." panel.
 *
 * Legacy drives this from a Topaz hardware pad and tells the user to install a
 * browser plug-in. That plug-in is dead in modern browsers, so this draws on a
 * `<canvas>` with pointer events instead — which works with a mouse, a stylus
 * and a touchscreen, and needs nothing installed. The stored format is the same
 * either way: a PNG data URL in `patient_signatures.signature_data`.
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
          onStage={(d) => onStage("patient", d)}
        />
        <SignaturePanel
          title="Dentist Signature"
          stored={signatures.dentist?.signature_data ?? null}
          storedAt={signatures.dentist?.created_at ?? null}
          staged={staged.dentist}
          onStage={(d) => onStage("dentist", d)}
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
  staged: string | null;
  onStage: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [padOpen, setPadOpen] = useState(false);

  const shown = staged ?? stored;

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    dirty.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#11315c";
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onStage(null);
  };
  const done = () => {
    // An untouched pad would stage a blank white PNG that looks like a real
    // signature on every later read.
    if (!dirty.current) {
      setPadOpen(false);
      return;
    }
    const data = canvasRef.current?.toDataURL("image/png");
    if (data) onStage(data);
    setPadOpen(false);
  };

  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="bg-[#1D4ED8] text-white text-center font-semibold text-sm py-1.5">
        {title}
      </div>
      <div className="p-4 flex flex-col items-center gap-2">
        {padOpen ? (
          <canvas
            ref={canvasRef}
            width={480}
            height={160}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full h-[120px] border-2 border-dashed border-[#3A6EA5] rounded bg-white touch-none cursor-crosshair"
          />
        ) : (
          <div className="w-full h-[120px] border border-[#CBD5E1] rounded bg-white flex items-center justify-center overflow-hidden">
            {shown ? (
              <img src={shown} alt={title} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-[#94A3B8]">Not signed</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <PadButton onClick={() => setPadOpen(true)} disabled={padOpen}>
            <PenLine className="w-3.5 h-3.5" /> SIGN
          </PadButton>
          <PadButton onClick={clear}>
            <Eraser className="w-3.5 h-3.5" /> CLEAR
          </PadButton>
          <PadButton onClick={done} disabled={!padOpen}>
            <Check className="w-3.5 h-3.5" /> DONE
          </PadButton>
        </div>

        <span className="text-[11px] text-[#64748B] h-4">
          {staged
            ? "Captured — press Save to store it."
            : storedAt
              ? `Signed ${new Date(storedAt).toLocaleString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : ""}
        </span>
      </div>
    </div>
  );
}

function PadButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-3 py-1 rounded border border-[#CBD5E1] bg-[#F1F5F9] text-[11px] font-semibold text-[#334155] hover:bg-[#E2E8F0] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
