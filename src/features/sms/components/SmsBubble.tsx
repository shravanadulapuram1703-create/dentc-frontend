import { CalendarClock, Info, RotateCcw, X } from "lucide-react";
import { cn } from "@/components/ui/utils";
import {
  REPLY_INTENT_LABEL,
  SMS_MESSAGE_TYPE_LABEL,
  type SmsEntry,
} from "../smsModel";
import { fmtClock } from "../smsFormat";
import { SmsStatusTick } from "./SmsStatusBadge";

interface SmsBubbleProps {
  entry: SmsEntry;
  selected: boolean;
  onSelect: (entry: SmsEntry) => void;
  onRetry?: (entry: SmsEntry) => void;
  onDismiss?: (entry: SmsEntry) => void;
  onMarkRead?: (entry: SmsEntry) => void;
}

const INTENT_TONE: Record<NonNullable<SmsEntry["intent"]>, string> = {
  confirm: "bg-emerald-100 text-emerald-800 border-emerald-200",
  decline: "bg-amber-100 text-amber-800 border-amber-200",
  opt_out: "bg-red-100 text-red-800 border-red-200",
  help: "bg-sky-100 text-sky-800 border-sky-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function SmsBubble({ entry, selected, onSelect, onRetry, onDismiss, onMarkRead }: SmsBubbleProps) {
  const out = entry.direction === "outbound";
  const failed = entry.status === "failed" || entry.status === "undelivered";
  const unread = !out && !entry.is_read;

  return (
    <div className={cn("group flex w-full", out ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[78%] flex-col gap-1", out ? "items-end" : "items-start")}>
        {/* Type / intent chip above the bubble */}
        <div className={cn("flex items-center gap-1.5 px-1", out ? "flex-row-reverse" : "flex-row")}>
          {out ? (
            entry.message_type !== "manual" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {entry.appointment_id && <CalendarClock className="h-3 w-3" />}
                {SMS_MESSAGE_TYPE_LABEL[entry.message_type]}
              </span>
            )
          ) : (
            entry.intent && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  INTENT_TONE[entry.intent],
                )}
              >
                {REPLY_INTENT_LABEL[entry.intent]}
              </span>
            )
          )}
          {unread && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> New
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelect(entry);
            if (unread) onMarkRead?.(entry);
          }}
          className={cn(
            "relative whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[13.5px] leading-relaxed shadow-sm transition-all",
            out
              ? failed
                ? "rounded-br-sm bg-red-600 text-white"
                : "rounded-br-sm bg-gradient-to-br from-[#1F3A5F] to-[#2d5080] text-white"
              : "rounded-bl-sm border border-slate-200 bg-white text-slate-800",
            unread && "ring-2 ring-blue-400/60",
            selected && "ring-2 ring-offset-2 ring-blue-500",
            entry.optimistic && "opacity-80",
          )}
        >
          {entry.body}
          <div
            className={cn(
              "mt-1 flex items-center gap-2 text-[10px]",
              out ? "justify-end text-white/70" : "justify-start text-slate-400",
            )}
          >
            <span>{fmtClock(entry.at)}</span>
            {out && <SmsStatusTick status={entry.status} />}
          </div>
        </button>

        {failed && (
          <div className="flex items-center gap-2 px-1 text-[11px] text-red-700">
            <Info className="h-3 w-3" />
            <span>{entry.error ?? "Carrier could not deliver this text."}</span>
            {entry.optimistic === false && onRetry && (
              <button type="button" onClick={() => onRetry(entry)} className="inline-flex items-center gap-1 font-semibold hover:underline">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            )}
            {entry.row_id < 0 && onDismiss && (
              <button type="button" onClick={() => onDismiss(entry)} className="inline-flex items-center gap-1 hover:underline">
                <X className="h-3 w-3" /> Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
