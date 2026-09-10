// Send a text message to a patient from the scheduler's Go To menu.
//
// The message is recorded against the real backend resource
// `/api/v1/sms-messages`, which carries patient_id / appointment_id /
// sent_phone / sent_text / send_status. That row is the practice's record of
// the message. Whether a gateway then dispatches it is a backend concern and is
// NOT confirmed from here — see gap SCHED-SMS-1 in
// docs/scheduler/add_edit_appointment_backend_devreport.md — so the wording
// says "queued", never "sent".

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageSquare, X } from "lucide-react";
import { createSmsMessage } from "@/api/generated/endpoints/communications/communications";
import { formatUSPhone, phoneDigits, isCompleteUSPhone } from "@/utils/phone";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: number | null;
  officeId: number | null;
  appointmentId?: string | null;
  /** Best number on file — the user can correct it. */
  defaultPhone?: string | null;
}

const MAX_CHARS = 320;

export default function SendSmsModal({
  isOpen,
  onClose,
  patientName,
  patientId,
  officeId,
  appointmentId,
  defaultPhone,
}: Props) {
  const [phone, setPhone] = useState(formatUSPhone(defaultPhone));
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  if (!isOpen) return null;

  const phoneOk = isCompleteUSPhone(phone);
  const canSend = phoneOk && text.trim().length > 0 && !saving;

  const handleSend = async () => {
    if (!canSend) return;
    setSaving(true);
    setError(null);
    try {
      await createSmsMessage({
        office_id: officeId,
        patient_id: patientId,
        appointment_id: appointmentId ?? null,
        sent_phone: phoneDigits(phone),
        sent_text: text.trim(),
        send_status: "queued",
        message_type: "manual",
        is_read: false,
      });
      setQueued(true);
    } catch (err: any) {
      console.error("Failed to record SMS:", err);
      setError(
        err?.response?.data?.detail || err?.message || "Could not queue the message",
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-3 text-white">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
            <MessageSquare className="h-4 w-4" />
            Send Text Message
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-[#162942]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm text-[#64748B]">
            To <span className="font-semibold text-[#1E293B]">{patientName}</span>
          </p>

          {queued ? (
            <div className="rounded border-l-4 border-[#2FB9A7] bg-[#ECFDF5] p-3 text-sm text-[#065F46]">
              Message queued and recorded on the patient&rsquo;s communication history.
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-[#1E293B]">
                Mobile number
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={14}
                  value={phone}
                  onChange={(e) => setPhone(formatUSPhone(e.target.value))}
                  placeholder="(555) 123-4567"
                  className={`mt-1 w-full rounded-lg border-2 px-3 py-2 text-sm focus:border-[#3A6EA5] focus:outline-none ${
                    phone && !phoneOk ? "border-[#EF4444] bg-[#FEF2F2]" : "border-[#CBD5E1]"
                  }`}
                />
              </label>
              {phone && !phoneOk && (
                <p className="text-xs text-[#EF4444]">
                  Enter all 10 digits, e.g. (555) 123-4567.
                </p>
              )}

              <label className="block text-sm font-medium text-[#1E293B]">
                Message
                <textarea
                  rows={4}
                  maxLength={MAX_CHARS}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message…"
                  className="mt-1 w-full rounded-lg border-2 border-[#CBD5E1] px-3 py-2 text-sm focus:border-[#3A6EA5] focus:outline-none"
                />
              </label>
              <p className="text-right text-xs text-[#64748B]">
                {text.length}/{MAX_CHARS}
              </p>

              {error && (
                <div className="rounded border-l-4 border-[#EF4444] bg-red-50 p-2 text-xs text-[#B91C1C]">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border-2 border-[#E2E8F0] bg-white px-4 py-1.5 text-sm font-medium text-[#64748B] hover:bg-[#F7F9FC]"
          >
            {queued ? "Close" : "Cancel"}
          </button>
          {!queued && (
            <button
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="flex items-center gap-2 rounded-lg bg-[#2FB9A7] px-5 py-1.5 text-sm font-semibold text-white hover:bg-[#26a396] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Queue Message
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
