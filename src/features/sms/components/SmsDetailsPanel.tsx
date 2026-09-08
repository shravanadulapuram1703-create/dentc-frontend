// Right-hand details pane for the selected text: status timeline, numbers,
// linked appointment, log row id, read toggle — and, for a patient reply, the
// YES / NO / STOP action that reply calls for.

import { useState } from "react";
import {
  BellOff,
  CalendarCheck2,
  CalendarX2,
  Copy,
  Hash,
  Mail,
  MailOpen,
  Phone,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/components/ui/utils";
import { REPLY_INTENT_LABEL, SMS_MESSAGE_TYPE_LABEL, type ReplyIntent, type SmsEntry } from "../smsModel";
import { formatPhone } from "../phone";
import { fmtDateTime } from "../smsFormat";
import type { AppointmentOption } from "../hooks/useSmsMergeContext";
import { useReplyActions } from "../hooks/useReplyActions";
import SmsStatusBadge from "./SmsStatusBadge";

interface SmsDetailsPanelProps {
  entry: SmsEntry;
  patient_id: number;
  appointments: AppointmentOption[];
  patientOptedOut: boolean;
  onClose: () => void;
  onToggleRead: (entry: SmsEntry, is_read: boolean) => void;
  onResend: (entry: SmsEntry) => void;
  onReply: (entry: SmsEntry) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-start gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="break-words text-slate-800">{children}</span>
    </div>
  );
}

const INTENT_PANEL: Record<ReplyIntent, { tone: string; blurb: string }> = {
  confirm: { tone: "border-emerald-200 bg-emerald-50 text-emerald-900", blurb: "The patient replied YES — the appointment can be marked confirmed." },
  decline: { tone: "border-amber-200 bg-amber-50 text-amber-900", blurb: "The patient replied NO — cancel the slot and follow up from the call list." },
  opt_out: { tone: "border-red-200 bg-red-50 text-red-900", blurb: "The patient replied STOP — Twilio blocks further texts; turn on No Auto SMS so DentC stops too." },
  help: { tone: "border-sky-200 bg-sky-50 text-sky-900", blurb: "The patient asked for help — reply manually or call them." },
  other: { tone: "border-slate-200 bg-slate-50 text-slate-800", blurb: "Free-text reply — read it and respond manually." },
};

export default function SmsDetailsPanel({
  entry,
  patient_id,
  appointments,
  patientOptedOut,
  onClose,
  onToggleRead,
  onResend,
  onReply,
}: SmsDetailsPanelProps) {
  const out = entry.direction === "outbound";
  const actions = useReplyActions(patient_id);
  const [confirmDecline, setConfirmDecline] = useState(false);

  // The reply rides on the outbound row, so it inherits that row's appointment.
  // Fall back to the next upcoming appointment for stand-alone inbound rows.
  const linked = entry.appointment_id ? appointments.find((a) => a.id === entry.appointment_id) ?? null : null;
  const target = linked ?? appointments.find((a) => a.is_upcoming) ?? null;
  const intent = entry.intent ?? "other";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.body);
      toast.success("Message copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const actionBtn = "inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{out ? "Sent text" : "Patient reply"}</h3>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close details">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
          {entry.body}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SmsStatusBadge status={entry.status} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {out ? SMS_MESSAGE_TYPE_LABEL[entry.message_type] : REPLY_INTENT_LABEL[intent]}
          </span>
        </div>

        {/* Reply → action */}
        {!out && (
          <div className={cn("rounded-lg border p-3", INTENT_PANEL[intent].tone)}>
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Response: {REPLY_INTENT_LABEL[intent]}</p>
            <p className="mt-1 text-xs leading-relaxed">{INTENT_PANEL[intent].blurb}</p>
            {(intent === "confirm" || intent === "decline") && (
              <p className="mt-1.5 text-[11px] opacity-80">
                {target ? (
                  <>
                    Appointment: <b>{target.label}</b>
                    {!linked && " (next upcoming — reply was not linked to a specific text)"}
                  </>
                ) : (
                  "No upcoming appointment found for this patient."
                )}
              </p>
            )}
            <div className="mt-2.5">
              {intent === "confirm" && (
                <button
                  type="button"
                  disabled={!target || target.is_confirmed || actions.busy !== null}
                  onClick={() => target && void actions.confirmAppointment(target.id)}
                  className={cn(actionBtn, "bg-emerald-700 text-white hover:bg-emerald-800")}
                >
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  {target?.is_confirmed ? "Already confirmed" : actions.busy === "confirm" ? "Confirming…" : "Mark appointment confirmed"}
                </button>
              )}
              {intent === "decline" && (
                <button
                  type="button"
                  disabled={!target || actions.busy !== null}
                  onClick={() => setConfirmDecline(true)}
                  className={cn(actionBtn, "bg-amber-700 text-white hover:bg-amber-800")}
                >
                  <CalendarX2 className="h-3.5 w-3.5" />
                  {actions.busy === "decline" ? "Cancelling…" : "Cancel appointment + call list"}
                </button>
              )}
              {intent === "opt_out" && (
                <button
                  type="button"
                  disabled={patientOptedOut || actions.busy !== null}
                  onClick={() => void actions.optOutPatient()}
                  className={cn(actionBtn, "bg-red-700 text-white hover:bg-red-800")}
                >
                  <BellOff className="h-3.5 w-3.5" />
                  {patientOptedOut ? "No Auto SMS already on" : actions.busy === "opt_out" ? "Saving…" : "Turn on No Auto SMS"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Row label={out ? "Sent" : "Received"}>{fmtDateTime(entry.at)}</Row>
          <Row label={out ? "To" : "From"}>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" /> {entry.phone ? formatPhone(entry.phone) : "—"}
            </span>
          </Row>
          {entry.raw_status && entry.raw_status.toLowerCase() !== entry.status && (
            <Row label="Carrier status">{entry.raw_status}</Row>
          )}
          {entry.error && <Row label="Error">{entry.error}</Row>}
          <Row label="Appointment">{linked ? linked.label : entry.appointment_id ?? "—"}</Row>
          <Row label="Log row">
            <span className="inline-flex items-center gap-1 font-mono">
              <Hash className="h-3 w-3 text-slate-400" /> {entry.row_id > 0 ? entry.row_id : "pending"}
            </span>
          </Row>
          {entry.legacy_id && <Row label="Legacy id">{entry.legacy_id}</Row>}
          {entry.created_by != null && <Row label="Sent by">user #{entry.created_by}</Row>}
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          {!out && (
            <>
              <button type="button" onClick={() => onReply(entry)} className={cn(actionBtn, "bg-[#1F3A5F] text-white hover:bg-[#2d5080]")}>
                <Mail className="h-3.5 w-3.5" /> Reply
              </button>
              <button
                type="button"
                onClick={() => onToggleRead(entry, !entry.is_read)}
                className={cn(actionBtn, "border border-slate-300 font-medium text-slate-700 hover:bg-slate-50")}
              >
                <MailOpen className="h-3.5 w-3.5" /> Mark as {entry.is_read ? "unread" : "read"}
              </button>
            </>
          )}
          {out && entry.row_id > 0 && (
            <button type="button" onClick={() => onResend(entry)} className={cn(actionBtn, "border border-slate-300 font-medium text-slate-700 hover:bg-slate-50")}>
              <RotateCcw className="h-3.5 w-3.5" /> Load into composer
            </button>
          )}
          <button type="button" onClick={copy} className={cn(actionBtn, "border border-slate-300 font-medium text-slate-700 hover:bg-slate-50")}>
            <Copy className="h-3.5 w-3.5" /> Copy text
          </button>
        </div>
      </div>

      <Dialog open={confirmDecline} onOpenChange={setConfirmDecline}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
            <DialogDescription>
              {target?.label} will be marked cancelled with the reason "Patient declined via SMS" and the patient will be
              added to the call list so the front desk can rebook them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmDecline(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Keep appointment
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDecline(false);
                if (target) void actions.declineAppointment(target.id);
              }}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Cancel appointment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
