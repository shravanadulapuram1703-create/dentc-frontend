// Small status pills shared across the Utilities hub: backend availability and
// run outcomes. Keeps colour + wording consistent everywhere.
import { CheckCircle2, AlertTriangle, XCircle, Wrench, ExternalLink, CircleDot } from "lucide-react";
import type { BackendStatus, RunStatus } from "../types";

const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold";

export function BackendBadge({ status }: { status: BackendStatus }) {
  if (status === "live") {
    return (
      <span className={`${base} bg-[#2FB9A7]/10 text-[#259688] border border-[#2FB9A7]/30`}>
        <CheckCircle2 className="w-3 h-3" /> Live
      </span>
    );
  }
  if (status === "external") {
    return (
      <span className={`${base} bg-[#3A6EA5]/10 text-[#3A6EA5] border border-[#3A6EA5]/30`}>
        <ExternalLink className="w-3 h-3" /> External
      </span>
    );
  }
  return (
    <span className={`${base} bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30`}>
      <Wrench className="w-3 h-3" /> Simulated
    </span>
  );
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  if (status === "success") {
    return (
      <span className={`${base} bg-[#2FB9A7]/10 text-[#259688] border border-[#2FB9A7]/30`}>
        <CheckCircle2 className="w-3 h-3" /> Success
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className={`${base} bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30`}>
        <AlertTriangle className="w-3 h-3" /> Warnings
      </span>
    );
  }
  return (
    <span className={`${base} bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/30`}>
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
}

export function RunningBadge() {
  return (
    <span className={`${base} bg-[#3A6EA5]/10 text-[#3A6EA5] border border-[#3A6EA5]/30`}>
      <CircleDot className="w-3 h-3 animate-pulse" /> Running
    </span>
  );
}
