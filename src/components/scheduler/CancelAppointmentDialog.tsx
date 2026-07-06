/**
 * Cancel Appointment dialog (PDF page 16).
 *
 * Collects a cancellation note (≤1000 chars), an "Add to Call List" flag and a
 * cancellation reason, then confirms. The appointment status is set to
 * "Cancelled" by the caller. NOTE: the backend status-PATCH contract accepts
 * only `{status}` — the note/reason/call-list are not persisted server-side yet
 * (documented gap SCHED-APPT-2). They are surfaced back to the caller so the UI
 * can act on them (and so they're ready to send once the backend supports them).
 */
import { useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { CANCELLATION_REASONS } from "./statusMeta";

export interface CancellationResult {
  note: string;
  addToCallList: boolean;
  reason: string;
}

interface Props {
  patientName: string;
  onConfirm: (result: CancellationResult) => void;
  onClose: () => void;
  busy?: boolean;
}

const MAX_NOTE = 1000;

export default function CancelAppointmentDialog({ patientName, onConfirm, onClose, busy }: Props) {
  const [note, setNote] = useState("");
  const [addToCallList, setAddToCallList] = useState(true);
  const [reason, setReason] = useState("No reason provided");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md border-2 border-[#1F3A5F]"
        role="dialog"
        aria-label="Cancel appointment"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-3 rounded-t-md flex items-center justify-between">
          <h3 className="font-bold text-sm">Do you really want to cancel this appointment?</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-[#64748B]">
            Cancelling the appointment for <span className="font-semibold text-[#1E293B]">{patientName}</span>.
          </p>

          {/* Cancellation note */}
          <div>
            <label className="block text-xs font-semibold text-[#1F3A5F] uppercase tracking-wide mb-1">
              Cancellation Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
              rows={3}
              className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
              placeholder="Enter cancellation details…"
            />
            <div className="text-[11px] text-[#94A3B8] mt-0.5">
              {MAX_NOTE - note.length} characters remaining
            </div>
          </div>

          {/* Add to call list */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addToCallList}
              onChange={(e) => setAddToCallList(e.target.checked)}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
            />
            <span className="text-sm text-[#1E293B]">Add to Call List</span>
          </label>

          {/* Cancellation reason */}
          <div>
            <label className="block text-xs font-semibold text-[#1F3A5F] uppercase tracking-wide mb-2">
              Cancellation Reason
            </label>
            <div className="space-y-1.5">
              {CANCELLATION_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelReason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-3.5 h-3.5 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">{r}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t-2 border-[#E2E8F0]">
          <button
            onClick={() => onConfirm({ note, addToCallList, reason })}
            disabled={busy}
            className="px-8 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold rounded-md disabled:opacity-50"
          >
            {busy ? "Cancelling…" : "Yes"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-8 py-2 bg-white border-2 border-[#CBD5E1] text-[#1E293B] text-sm font-semibold rounded-md hover:bg-[#F7F9FC] disabled:opacity-50"
          >
            No
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
