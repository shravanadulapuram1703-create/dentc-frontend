// Compose + send one text to the patient.
//
// Controls: destination number (mobile/home/work), optional appointment (for
// merge fields + `appointment_id` on the log row), template picker, merge-field
// chips, live GSM-7/UCS-2 segment counter, consent guard (`no_auto_sms`), and
// Send (Ctrl/⌘+Enter).

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronDown, LayoutTemplate, MessageSquareReply, Send, ShieldAlert, Smartphone, Tag, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import { SMS_MESSAGE_TYPE_LABEL, type SmsMessageType } from "../smsModel";
import { countSegments, SMS_MAX_CHARS } from "../smsSegments";
import {
  ensureReplyInstructions,
  hasReplyInstructions,
  hasUnfilledMerge,
  MERGE_FIELDS,
  renderTemplate,
  REPLY_INSTRUCTIONS,
  type SmsMergeContext,
  type SmsTemplate,
} from "../smsTemplates";
import type { AppointmentOption, PhoneOption } from "../hooks/useSmsMergeContext";
import type { SmsSendCapability } from "../transport/types";
import SmsTemplatePicker from "./SmsTemplatePicker";

export interface ComposerHandle {
  /** Load a template (rendered with the given appointment) into the editor. */
  applyTemplate: (template: SmsTemplate, appointment?: AppointmentOption | null) => void;
  setBody: (body: string) => void;
  focus: () => void;
}

export interface ComposerSubmit {
  body: string;
  to_phone: string;
  message_type: SmsMessageType;
  appointment_id: string | null;
}

interface SmsComposerProps {
  phones: PhoneOption[];
  appointments: AppointmentOption[];
  buildContext: (appt: AppointmentOption | null) => SmsMergeContext;
  optedOut: boolean;
  capability: SmsSendCapability;
  sending: boolean;
  onSend: (payload: ComposerSubmit) => Promise<unknown>;
  /** Compact = inside a dialog (no outer border). */
  compact?: boolean;
}

/**
 * Captioned select: the wrapper paints the border, icon and caption so the
 * selected value is always legible (the global `select` rule forces large
 * padding; `sms-select` in globals.css neutralises it inside this wrapper).
 */
function ComposerSelect({
  icon: Icon,
  caption,
  value,
  onChange,
  ariaLabel,
  children,
  className,
}: {
  icon: LucideIcon;
  caption: string;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white pl-2.5 text-xs text-slate-700 focus-within:border-blue-500",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{caption}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className="sms-select min-w-0 text-xs font-medium text-slate-800">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
    </label>
  );
}

const APPOINTMENT_TYPES: SmsMessageType[] = ["appointment_reminder", "appointment_confirmation"];

const SmsComposer = forwardRef<ComposerHandle, SmsComposerProps>(function SmsComposer(
  { phones, appointments, buildContext, optedOut, capability, sending, onSend, compact },
  ref,
) {
  const [body, setBody] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [apptId, setApptId] = useState<string>("");
  const [messageType, setMessageType] = useState<SmsMessageType>("manual");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOptOut, setConfirmOptOut] = useState(false);
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Default to the mobile number (first option) once phones load.
  useEffect(() => {
    if (!phone && phones[0]) setPhone(phones[0].value);
  }, [phones, phone]);

  const upcoming = useMemo(() => appointments.filter((a) => a.is_upcoming), [appointments]);
  const appt = useMemo(() => appointments.find((a) => a.id === apptId) ?? null, [appointments, apptId]);
  const ctx = useMemo(() => buildContext(appt), [buildContext, appt]);
  const seg = countSegments(
    APPOINTMENT_TYPES.includes(messageType) && includeInstructions && body.trim() && !hasReplyInstructions(body)
      ? ensureReplyInstructions(body)
      : body,
  );

  const applyTemplate = (t: SmsTemplate, a?: AppointmentOption | null) => {
    const chosen = a ?? appt ?? (t.needs_appointment ? upcoming[0] ?? null : null);
    if (chosen && chosen.id !== apptId) setApptId(chosen.id);
    setBody(renderTemplate(t.body, buildContext(chosen)));
    setMessageType(t.message_type);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  useImperativeHandle(ref, () => ({
    applyTemplate,
    setBody: (b) => setBody(b),
    focus: () => textareaRef.current?.focus(),
  }));

  const insertField = (key: keyof SmsMergeContext) => {
    const value = ctx[key];
    if (!value) {
      toast.error(key.startsWith("appointment") || key === "provider_name" ? "Pick an appointment first." : "That field is empty for this patient.");
      return;
    }
    const el = textareaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${value}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + value.length, start + value.length);
    });
  };

  const isAppointmentText = APPOINTMENT_TYPES.includes(messageType);
  const willAppend = isAppointmentText && includeInstructions && !!body.trim() && !hasReplyInstructions(body);
  const finalBody = willAppend ? ensureReplyInstructions(body) : body.trim();
  const trimmed = finalBody;
  const blocked = !phone || !trimmed || sending || trimmed.length > SMS_MAX_CHARS || (optedOut && !confirmOptOut);

  const submit = async () => {
    if (blocked) return;
    if (hasUnfilledMerge(trimmed)) {
      toast.error("The message still has an unfilled [field]. Pick an appointment or edit the text.");
      return;
    }
    await onSend({ body: trimmed, to_phone: phone, message_type: messageType, appointment_id: appt?.id ?? null });
    setBody("");
    setConfirmOptOut(false);
  };

  const sendLabel =
    capability === "twilio" ? "Send" : capability === "simulated" ? "Send (demo)" : capability === "log_only" ? "Log only" : "Send";

  return (
    <div className={cn("flex flex-col gap-2 bg-white", !compact && "border-t border-slate-200 px-4 py-3")}>
      {optedOut && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">This patient has opted out of automated texts</span> (No Auto SMS is on).
            Only send if they asked for this message.
            <label className="mt-1 flex items-center gap-2 font-medium">
              <input type="checkbox" checked={confirmOptOut} onChange={(e) => setConfirmOptOut(e.target.checked)} />
              The patient requested this text
            </label>
          </div>
        </div>
      )}

      {/* Row 1: destination + appointment + type */}
      <div className="flex flex-wrap items-center gap-2">
        <ComposerSelect icon={Smartphone} caption="To" value={phone} onChange={setPhone} ariaLabel="Send to">
          {phones.length === 0 && <option value="">No phone on file</option>}
          {phones.map((p) => (
            <option key={p.value} value={p.value}>
              {p.display} ({p.label})
            </option>
          ))}
        </ComposerSelect>

        <ComposerSelect icon={CalendarClock} caption="Appt" value={apptId} onChange={setApptId} ariaLabel="Appointment" className="max-w-[340px]">
          <option value="">None</option>
          {upcoming.length > 0 && (
            <optgroup label="Upcoming">
              {upcoming.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </optgroup>
          )}
          {appointments.some((a) => !a.is_upcoming) && (
            <optgroup label="Past">
              {appointments
                .filter((a) => !a.is_upcoming)
                .slice(0, 10)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
            </optgroup>
          )}
        </ComposerSelect>

        <ComposerSelect icon={Tag} caption="Type" value={messageType} onChange={(v) => setMessageType(v as SmsMessageType)} ariaLabel="Message type">
          {(["manual", "appointment_reminder", "appointment_confirmation", "recall", "balance", "other"] as SmsMessageType[]).map((t) => (
            <option key={t} value={t}>
              {SMS_MESSAGE_TYPE_LABEL[t]}
            </option>
          ))}
        </ComposerSelect>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50"
        >
          <LayoutTemplate className="h-3.5 w-3.5" /> Templates
        </button>
      </div>

      {/* Row 2: editor */}
      <div
        className={cn(
          "rounded-xl border bg-white transition-shadow focus-within:ring-2 focus-within:ring-blue-500/30",
          trimmed.length > SMS_MAX_CHARS ? "border-red-300" : "border-slate-300",
        )}
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={phones.length ? "Type a text message…  (Ctrl+Enter to send)" : "Add a mobile number to the patient record to text them."}
          rows={3}
          disabled={phones.length === 0}
          className="w-full resize-none bg-transparent px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
        {isAppointmentText && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[11px]">
            <label className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <input type="checkbox" checked={includeInstructions} onChange={(e) => setIncludeInstructions(e.target.checked)} />
              <MessageSquareReply className="h-3.5 w-3.5 text-slate-400" /> Add reply instructions
            </label>
            <span className={cn("truncate text-slate-500", hasReplyInstructions(body) && "italic")}>
              {hasReplyInstructions(body)
                ? "Message already tells the patient how to reply."
                : includeInstructions
                  ? `Appends: "${REPLY_INSTRUCTIONS}"`
                  : "Patients won't know that YES / NO / STOP are recognised."}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2">
          {MERGE_FIELDS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => insertField(f.key)}
              disabled={f.appointment && !appt}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] text-slate-600 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={f.appointment && !appt ? "Pick an appointment to use this field" : `Insert ${f.label}`}
            >
              {f.label}
            </button>
          ))}
          <div className={cn("ml-auto flex items-center gap-3", !compact && "lg:mr-16")}>
            <span
              className={cn(
                "text-[11px] tabular-nums",
                trimmed.length > SMS_MAX_CHARS ? "font-semibold text-red-600" : seg.segments > 1 ? "text-amber-700" : "text-slate-400",
              )}
              title={`${seg.encoding} encoding · ${seg.per_segment} chars per segment`}
            >
              {seg.length}/{seg.per_segment} · {seg.segments || 1} seg{seg.segments > 1 ? "s" : ""}
              {seg.encoding === "UCS-2" && " · emoji/unicode"}
            </span>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={blocked}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1F3A5F] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#2d5080] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : sendLabel}
            </button>
          </div>
        </div>
      </div>

      <SmsTemplatePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mergeContext={ctx}
        hasAppointment={!!appt || upcoming.length > 0}
        onUse={(t) => applyTemplate(t)}
      />
    </div>
  );
});

export default SmsComposer;
