/**
 * Medical Alert popover (PDF page 18) — opens when the red-cross badge on an
 * appointment block is clicked, listing the patient's active medical alerts
 * grouped by their Medical History section (allergies first), plus the
 * free-text Additional Comments.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { isAllergySection } from "@/features/medical-alerts/patientMedicalAlerts";
import type { PatientMedicalAlert } from "../../services/schedulerApi";

interface Props {
  patient_id: number | null;
  patientName: string;
  alerts: PatientMedicalAlert[];
  comments?: string;
  /** True while the per-patient summary is still loading (feed flagged it first). */
  loading?: boolean;
  anchor: { x: number; y: number };
  onClose: () => void;
}

const WIDTH = 300;

export default function MedicalAlertPopover({
  patient_id,
  patientName,
  alerts,
  comments,
  loading,
  anchor,
  onClose,
}: Props) {
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
  const top = Math.min(anchor.y, window.innerHeight - 220);

  // Group by section in the order the alerts already arrive (allergies first).
  const groups: Array<{ section: string; items: PatientMedicalAlert[] }> = [];
  for (const a of alerts) {
    const last = groups[groups.length - 1];
    if (last && last.section === a.section) last.items.push(a);
    else groups.push({ section: a.section, items: [a] });
  }

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
          {alerts.length > 0 && <span className="font-normal opacity-90">· {alerts.length}</span>}
        </span>
        <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="text-[11px] text-[#64748B]">{patientName}</div>
        {alerts.length === 0 ? (
          <div className="text-sm text-[#64748B]">
            {loading ? "Loading alerts…" : "No active alerts."}
          </div>
        ) : (
          groups.map((g) => {
            const allergy = isAllergySection(g.section);
            return (
              <div key={g.section}>
                <div
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    allergy ? "text-red-700" : "text-red-800/70"
                  }`}
                >
                  {g.section}
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {g.items.map((a) => (
                    <li
                      key={a.id}
                      className={`text-sm font-medium ${allergy ? "text-red-700" : "text-red-800"}`}
                      title={a.comments || undefined}
                    >
                      {a.alert}
                      {a.blocks_charges && (
                        <span className="ml-1 text-[9px] font-extrabold uppercase text-red-600">
                          blocks charges
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
        {comments && (
          <div className="text-xs text-[#1E293B]">
            <span className="font-semibold">Comments:</span> {comments}
          </div>
        )}
        {patient_id != null && (
          <Link
            to={`/patient/${patient_id}/medical-history`}
            className="inline-block text-[11px] font-semibold text-red-700 underline underline-offset-2"
            onClick={onClose}
          >
            Open Medical History
          </Link>
        )}
      </div>
    </div>,
    document.body,
  );
}
