/**
 * Appointment Details pop-out (PDF pages 5–7).
 *
 * Opens on left-click of an appointment block. Read-only. Shows the patient's
 * demographics + phones, current/preferred provider, responsible-party type,
 * preferred language, the appointment time + attached procedures with fees,
 * created/modified stamps, estimated patient responsibility, the status-
 * timestamp grid, and any upcoming / same-day family appointments.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import StatusIconBar from "./StatusIconBar";
import {
  fetchAppointmentDetails,
  type Appointment,
  type AppointmentDetails,
  type AppointmentStatusName,
} from "../../services/schedulerApi";

interface Props {
  appointment: Appointment;
  anchor: { x: number; y: number };
  onClose: () => void;
  onSetStatus: (status: AppointmentStatusName) => void;
  onCancelRequest: () => void;
  statusColors?: Map<string, string>;
}

const POPOVER_WIDTH = 560;
const POPOVER_MAX_HEIGHT = 640;

const ageFromDob = (dob?: string | null): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

const fmtMoney = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateUS = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US");
};

const fmtStamp = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const to12h = (hhmm?: string): string => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (h == null || Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
};

/** One labeled cell in the status-timestamp grid. */
function StatusCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border border-[#E2E8F0] px-2 py-1 min-h-[38px]">
      <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">
        {label}
      </div>
      <div className="text-[11px] text-[#1E293B] leading-tight">{value || ""}</div>
    </div>
  );
}

export default function AppointmentDetailsPopover({
  appointment,
  anchor,
  onClose,
  onSetStatus,
  onCancelRequest,
  statusColors,
}: Props) {
  const [details, setDetails] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAppointmentDetails(appointment)
      .then((d) => alive && setDetails(d))
      .catch(() => alive && setDetails(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [appointment]);

  // Close on outside click / Escape.
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

  // Keep the panel inside the viewport.
  const pos = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.x + 12;
    if (left + POPOVER_WIDTH + 12 > vw) left = Math.max(12, anchor.x - POPOVER_WIDTH - 12);
    let top = anchor.y;
    if (top + POPOVER_MAX_HEIGHT + 12 > vh) top = Math.max(12, vh - POPOVER_MAX_HEIGHT - 12);
    return { left, top };
  }, [anchor]);

  const patient = details?.patient ?? null;
  const age = ageFromDob(patient?.dob) ?? null;
  const headerName =
    (patient && `${patient.last_name ?? ""}, ${patient.first_name ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim()) ||
    appointment.patient_name ||
    "Patient";
  const headerMeta = [
    patient?.chart_no ? `#${patient.chart_no}` : null,
    patient?.gender || null,
    age != null ? `${age} yrs` : null,
    patient?.dob ? fmtDateUS(patient.dob) : null,
  ].filter(Boolean).join(" · ");

  const a = appointment;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9998] bg-[#FBF7EF] border-2 border-[#1F3A5F] rounded-lg shadow-2xl flex flex-col"
      style={{ left: pos.left, top: pos.top, width: POPOVER_WIDTH, maxHeight: POPOVER_MAX_HEIGHT }}
      role="dialog"
      aria-label="Appointment details"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2 rounded-t-md flex items-start justify-between">
        <div>
          <div className="font-bold leading-tight">{headerName}</div>
          {headerMeta && <div className="text-xs text-white/80">{headerMeta}</div>}
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white p-0.5" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick-status bar (PDF page 11 — Option 1) */}
      <div className="bg-white border-b border-[#E2E8F0] px-3 py-2">
        <StatusIconBar
          current={appointment.status}
          colors={statusColors}
          onSetStatus={(s) => onSetStatus(s)}
          onMissed={() => onSetStatus("Missed")}
          onCancelRequest={onCancelRequest}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-[#64748B]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading details…
        </div>
      ) : (
        <div className="overflow-y-auto px-4 py-3 text-sm text-[#1E293B]">
          {/* Contact + provider block */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mb-2">
            <div><span className="text-[#64748B]">H:</span> {details?.phones.home || "—"}</div>
            <div><span className="text-[#64748B]">Resp. Party:</span> {details?.responsible_party_type || "—"}</div>
            <div><span className="text-[#64748B]">W:</span> {details?.phones.work || "—"}</div>
            <div><span className="text-[#64748B]">Language:</span> {details?.preferred_language || "—"}</div>
            <div><span className="text-[#64748B]">C:</span> {details?.phones.cell || "—"}</div>
            <div><span className="text-[#64748B]">Provider:</span> {details?.provider_name || "—"}</div>
            <div><span className="text-[#64748B]">Pref. Prdr:</span> {details?.preferred_provider || "—"}</div>
            <div><span className="text-[#64748B]">Operatory:</span> {a.operatory_name || "—"}</div>
          </div>

          {/* Appointment time */}
          <div className="text-center font-semibold text-[#1F3A5F] bg-[#EEF2F7] rounded py-1 mb-2">
            {to12h(a.start_time)} – {to12h(a.end_time)} ({a.duration} mins.)
          </div>

          {/* Procedure grid */}
          <div className="border border-[#E2E8F0] rounded overflow-hidden mb-1">
            <table className="w-full text-xs">
              <thead className="bg-[#1F3A5F] text-white">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold w-10">Th</th>
                  <th className="px-2 py-1 text-left font-semibold w-20">Code</th>
                  <th className="px-2 py-1 text-left font-semibold">Description</th>
                  <th className="px-2 py-1 text-right font-semibold w-20">Fee</th>
                </tr>
              </thead>
              <tbody>
                {(details?.procedures ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-center text-[#94A3B8]">
                      {a.procedure_label || "No procedures attached"}
                    </td>
                  </tr>
                ) : (
                  details!.procedures.map((p) => (
                    <tr key={p.id} className="border-t border-[#E2E8F0]">
                      <td className="px-2 py-1">{p.tooth}</td>
                      <td className="px-2 py-1">{p.procedure_code}</td>
                      <td className="px-2 py-1">{p.description}</td>
                      <td className="px-2 py-1 text-right">{fmtMoney(p.fee)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Created / modified + est pat */}
          <div className="flex items-center justify-between text-[11px] italic text-[#64748B] mb-2">
            <span>
              {details?.created_at ? `Created: ${fmtDateUS(details.created_at)}` : ""}
              {details?.updated_at ? `  ·  Modified: ${fmtDateUS(details.updated_at)}` : ""}
            </span>
            <span className="not-italic font-semibold text-[#1F3A5F]">
              Est. Pat.: ${fmtMoney(details?.est_patient_total ?? 0)}
            </span>
          </div>

          {/* Account balance (the $ badge on the block reflects balance > 0) */}
          {details?.balance && details.balance.balance > 0 && (
            <div className="rounded border border-green-300 bg-green-50 px-3 py-2 mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-800">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px]">
                  $
                </span>
                Account Balance Due
              </span>
              <span className="text-sm font-bold text-green-800">
                ${fmtMoney(details.balance.balance)}
              </span>
            </div>
          )}
          {details?.balance && details.balance.balance > 0 && (
            <div className="grid grid-cols-3 gap-2 text-[11px] text-[#64748B] -mt-2 mb-3 px-1">
              <div>Patient: <span className="font-semibold text-[#1E293B]">${fmtMoney(details.balance.patient_balance)}</span></div>
              <div>Insurance: <span className="font-semibold text-[#1E293B]">${fmtMoney(details.balance.insurance_balance)}</span></div>
              <div>Charged: <span className="font-semibold text-[#1E293B]">${fmtMoney(details.balance.total_charged)}</span></div>
            </div>
          )}

          {/* Status timestamp grid */}
          <div className="grid grid-cols-3 gap-px bg-[#E2E8F0] mb-3 rounded overflow-hidden">
            <StatusCell label="Scheduled" value={a.status === "Scheduled" ? fmtStamp(details?.created_at) : ""} />
            <StatusCell label="Left Message" value={a.status === "Left Message" ? "✓" : ""} />
            <StatusCell label="Confirmed" value={fmtStamp(a.confirmed_on)} />
            <StatusCell label="Unconfirmed" value={a.status === "Unconfirmed" ? "✓" : ""} />
            <StatusCell label="Missed" value={a.missed ? "✓" : ""} />
            <StatusCell label="Cancelled" value={a.cancelled ? "✓" : ""} />
            <StatusCell label="In Reception" value={fmtStamp(a.checked_in_on)} />
            <StatusCell label="Available" value={a.status === "Available" ? "✓" : ""} />
            <StatusCell label="In Operatory" value={a.status === "In Operatory" ? "✓" : ""} />
            <StatusCell label="Checked Out" value={fmtStamp(a.checked_out_on)} />
            <StatusCell label="Posted" value="" />
            <StatusCell label="" value="" />
          </div>

          {/* Upcoming appointments */}
          <div className="font-semibold text-[#1F3A5F] text-xs mb-1">Upcoming Appointments</div>
          <div className="border border-[#E2E8F0] rounded overflow-hidden mb-3">
            <table className="w-full text-[11px]">
              <thead className="bg-[#EEF2F7] text-[#64748B]">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">Date</th>
                  <th className="px-2 py-1 text-left font-semibold">Time</th>
                  <th className="px-2 py-1 text-left font-semibold">Operatory</th>
                  <th className="px-2 py-1 text-left font-semibold">Status</th>
                  <th className="px-2 py-1 text-left font-semibold">Provider</th>
                  <th className="px-2 py-1 text-right font-semibold">Dur</th>
                </tr>
              </thead>
              <tbody>
                {(details?.upcoming ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-2 text-center text-[#94A3B8]">
                      No upcoming appointments
                    </td>
                  </tr>
                ) : (
                  details!.upcoming.map((u) => (
                    <tr key={u.id} className="border-t border-[#E2E8F0]">
                      <td className="px-2 py-1">{fmtDateUS(u.date)}</td>
                      <td className="px-2 py-1">{to12h(u.time)}</td>
                      <td className="px-2 py-1">{u.operatory_name}</td>
                      <td className="px-2 py-1">{u.status}</td>
                      <td className="px-2 py-1">{u.provider_name}</td>
                      <td className="px-2 py-1 text-right">{u.duration}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Medical alerts (also surfaced by the red-cross badge on the block) */}
          {(details?.alerts ?? []).length > 0 && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2">
              <div className="text-xs font-bold text-red-700 mb-0.5">⚕ Medical Alerts</div>
              <div className="text-xs text-red-700">
                {details!.alerts.map((al) => al.alert).join(", ")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
