// Combined text + e-mail history for one patient, NEWEST FIRST, grouped by day.
// Sits above the composer in the Messages window so staff read what was last
// said before they write.

import { Fragment } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCheck,
  Clock,
  Eye,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquareDashed,
  RotateCcw,
  Send,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { EmailEntry, EmailStatus } from "../emailModel";
import { REPLY_INTENT_LABEL, SMS_MESSAGE_TYPE_LABEL, type SmsEntry } from "../smsModel";
import { fmtClock, fmtDayLabel, sameDay } from "../smsFormat";
import { formatPhone } from "../phone";
import type { HistoryItem } from "../messageHistory";
import SmsStatusBadge from "./SmsStatusBadge";

const EMAIL_STATUS_META: Record<EmailStatus, { label: string; icon: LucideIcon; tone: string; spin?: boolean }> = {
  sending: { label: "Sending", icon: Loader2, tone: "text-slate-600 bg-slate-50 border-slate-200", spin: true },
  queued: { label: "Queued", icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-200" },
  sent: { label: "Sent", icon: Send, tone: "text-slate-700 bg-slate-50 border-slate-200" },
  delivered: { label: "Delivered", icon: CheckCheck, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  opened: { label: "Opened", icon: Eye, tone: "text-sky-700 bg-sky-50 border-sky-200" },
  failed: { label: "Failed", icon: XCircle, tone: "text-red-700 bg-red-50 border-red-200" },
};

function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const m = EMAIL_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium", m.tone)}>
      <m.icon className={cn("h-3 w-3", m.spin && "animate-spin")} /> {m.label}
    </span>
  );
}

interface MessageHistoryProps {
  items: HistoryItem[];
  loading: boolean;
  selectedKey: string | null;
  onSelectSms?: (entry: SmsEntry) => void;
  onMarkRead?: (entry: SmsEntry) => void;
  /** Load a failed message's text back into the composer. */
  onRetry?: (item: HistoryItem) => void;
  onDismiss?: (item: HistoryItem) => void;
  emptyHint: string;
}

export default function MessageHistory({
  items,
  loading,
  selectedKey,
  onSelectSms,
  onMarkRead,
  onRetry,
  onDismiss,
  emptyHint,
}: MessageHistoryProps) {
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200/70" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-slate-500">
        <MessageSquareDashed className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">No messages yet</p>
        <p className="max-w-xs text-xs">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-label="Message history, newest first">
      {items.map((item, i) => {
        const prev = items[i - 1];
        const newDay = !prev || !sameDay(prev.at, item.at);
        return (
          <Fragment key={item.key}>
            {newDay && (
              <div className="sticky top-0 z-[1] -mx-4 mb-2 mt-1 bg-[#F7F9FC]/95 px-4 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 backdrop-blur first:mt-0">
                {fmtDayLabel(item.at)}
              </div>
            )}
            {item.channel === "sms" ? (
              <SmsRow
                entry={item.sms}
                selected={selectedKey === item.sms.key}
                onSelect={onSelectSms}
                onMarkRead={onMarkRead}
                onRetry={onRetry ? () => onRetry(item) : undefined}
                onDismiss={onDismiss ? () => onDismiss(item) : undefined}
              />
            ) : (
              <EmailRow
                entry={item.email}
                onRetry={onRetry ? () => onRetry(item) : undefined}
                onDismiss={onDismiss ? () => onDismiss(item) : undefined}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function ChannelIcon({ channel, inbound }: { channel: "sms" | "email"; inbound?: boolean }) {
  const Icon = channel === "sms" ? MessageSquare : Mail;
  return (
    <div
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
        channel === "sms" ? "bg-gradient-to-br from-green-600 to-emerald-600" : "bg-gradient-to-br from-blue-600 to-indigo-600",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-slate-600 shadow">
        {inbound ? <ArrowDownLeft className="h-3 w-3 text-sky-600" /> : <ArrowUpRight className="h-3 w-3" />}
      </span>
    </div>
  );
}

function FailureLine({ error, fallback, onRetry, onDismiss }: { error?: string | null; fallback: string; onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-red-700">
      <Info className="h-3 w-3" />
      <span>{error ?? fallback}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold hover:underline">
          <RotateCcw className="h-3 w-3" /> Edit &amp; resend
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1 hover:underline">
          <X className="h-3 w-3" /> Dismiss
        </button>
      )}
    </div>
  );
}

function SmsRow({
  entry,
  selected,
  onSelect,
  onMarkRead,
  onRetry,
  onDismiss,
}: {
  entry: SmsEntry;
  selected: boolean;
  onSelect?: (e: SmsEntry) => void;
  onMarkRead?: (e: SmsEntry) => void;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const inbound = entry.direction === "inbound";
  const unread = inbound && !entry.is_read;
  const failed = entry.status === "failed" || entry.status === "undelivered";
  const phone = entry.phone ? formatPhone(entry.phone) : "";
  return (
    <div
      className={cn(
        "mb-2 flex gap-3 rounded-lg border bg-white px-3 py-2.5 shadow-sm transition-colors",
        inbound ? "border-sky-200" : "border-slate-200",
        unread && "ring-2 ring-blue-400/60",
        selected && "ring-2 ring-blue-500",
        entry.optimistic && "opacity-80",
      )}
    >
      <ChannelIcon channel="sms" inbound={inbound} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            onSelect?.(entry);
            if (unread) onMarkRead?.(entry);
          }}
          className="w-full text-left"
          title="Show details"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-semibold text-slate-800">
              {inbound ? `Text reply${phone ? ` from ${phone}` : ""}` : `Text${phone ? ` to ${phone}` : ""}`}
            </span>
            {!inbound && entry.message_type !== "manual" && (
              <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-600">{SMS_MESSAGE_TYPE_LABEL[entry.message_type]}</span>
            )}
            {inbound && entry.intent && entry.intent !== "other" && (
              <span className="rounded bg-sky-50 px-1.5 text-[10px] font-medium text-sky-700">{REPLY_INTENT_LABEL[entry.intent]}</span>
            )}
            {unread && <span className="rounded bg-blue-600 px-1.5 text-[10px] font-semibold text-white">New</span>}
            <span className="ml-auto flex items-center gap-2 text-slate-400">
              {!inbound && <SmsStatusBadge status={entry.status} compact />}
              {fmtClock(entry.at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{entry.body}</p>
        </button>
        {failed && (
          <FailureLine
            error={entry.error}
            fallback="Carrier could not deliver this text."
            onRetry={onRetry}
            onDismiss={entry.row_id < 0 ? onDismiss : undefined}
          />
        )}
      </div>
    </div>
  );
}

function EmailRow({ entry, onRetry, onDismiss }: { entry: EmailEntry; onRetry?: () => void; onDismiss?: () => void }) {
  const failed = entry.status === "failed";
  return (
    <div className={cn("mb-2 flex gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm", entry.optimistic && "opacity-80")}>
      <ChannelIcon channel="email" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="font-semibold text-slate-800">Email to {entry.to_email}</span>
          {entry.message_type !== "manual" && (
            <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-600">{SMS_MESSAGE_TYPE_LABEL[entry.message_type]}</span>
          )}
          <span className="ml-auto flex items-center gap-2 text-slate-400">
            <EmailStatusBadge status={entry.status} />
            {fmtClock(entry.at)}
          </span>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-slate-800">{entry.subject}</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{entry.body}</p>
        {failed && (
          <FailureLine
            error={entry.error}
            fallback="The email could not be delivered."
            onRetry={onRetry}
            onDismiss={entry.row_id < 0 ? onDismiss : undefined}
          />
        )}
      </div>
    </div>
  );
}
