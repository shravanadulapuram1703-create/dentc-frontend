/**
 * Medical Alert popover (PDF page 18) — opens when the red-cross badge on an
 * appointment block is clicked, listing the patient's active medical alerts.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  patientName: string;
  alerts: string[];
  anchor: { x: number; y: number };
  onClose: () => void;
}

const WIDTH = 260;

export default function MedicalAlertPopover({ patientName, alerts, anchor, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const left = Math.min(anchor.x, window.innerWidth - WIDTH - 12);
  const top = Math.min(anchor.y, window.innerHeight - 160);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-white border-2 border-red-400 rounded-lg shadow-2xl"
      style={{ left: Math.max(12, left), top: Math.max(12, top), width: WIDTH }}
      role="dialog"
      aria-label="Medical alerts"
    >
      <div className="bg-red-600 text-white px-3 py-1.5 rounded-t-md flex items-center justify-between">
        <span className="text-xs font-bold flex items-center gap-1">
          <span aria-hidden>⚕</span> Medical Alert
        </span>
        <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-2">
        <div className="text-[11px] text-[#64748B] mb-1">{patientName}</div>
        {alerts.length === 0 ? (
          <div className="text-sm text-[#64748B]">No active alerts.</div>
        ) : (
          <ul className="list-disc pl-4 space-y-0.5">
            {alerts.map((a, i) => (
              <li key={i} className="text-sm text-red-700 font-medium">
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
