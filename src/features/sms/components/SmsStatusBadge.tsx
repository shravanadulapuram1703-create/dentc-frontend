import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { SmsStatus } from "../smsModel";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  tone: string;
  spin?: boolean;
}

const STATUS_META: Record<SmsStatus, StatusMeta> = {
  queued: { label: "Queued", icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-200" },
  accepted: { label: "Accepted", icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-200" },
  scheduled: { label: "Scheduled", icon: Clock, tone: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  sending: { label: "Sending", icon: Loader2, tone: "text-slate-600 bg-slate-50 border-slate-200", spin: true },
  sent: { label: "Sent", icon: Check, tone: "text-slate-700 bg-slate-50 border-slate-200" },
  delivered: { label: "Delivered", icon: CheckCheck, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  undelivered: { label: "Undelivered", icon: AlertTriangle, tone: "text-red-700 bg-red-50 border-red-200" },
  failed: { label: "Failed", icon: XCircle, tone: "text-red-700 bg-red-50 border-red-200" },
  canceled: { label: "Canceled", icon: XCircle, tone: "text-slate-600 bg-slate-50 border-slate-200" },
  received: { label: "Received", icon: Inbox, tone: "text-sky-700 bg-sky-50 border-sky-200" },
  unknown: { label: "Sent (legacy)", icon: Send, tone: "text-slate-600 bg-slate-50 border-slate-200" },
};

export default function SmsStatusBadge({
  status,
  compact = false,
  className,
}: {
  status: SmsStatus;
  compact?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        meta.tone,
        className,
      )}
      title={meta.label}
    >
      <Icon className={cn("h-3 w-3", meta.spin && "animate-spin")} />
      {!compact && meta.label}
    </span>
  );
}

/** Tiny tick used inside an outbound bubble footer. */
export function SmsStatusTick({ status }: { status: SmsStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const color =
    status === "delivered"
      ? "text-emerald-300"
      : status === "failed" || status === "undelivered"
        ? "text-red-300"
        : "text-white/70";
  return (
    <span className={cn("inline-flex items-center gap-1", color)} title={meta.label}>
      <Icon className={cn("h-3.5 w-3.5", meta.spin && "animate-spin")} />
      <span className="text-[10px]">{meta.label}</span>
    </span>
  );
}
