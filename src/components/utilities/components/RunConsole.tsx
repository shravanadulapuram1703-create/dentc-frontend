// Live execution console: a step tracker + progress bar while running, then the
// run summary (processed / succeeded / failed) and a scrollable, level-coloured
// log. Consistent success / warning / error presentation.
import { CheckCircle2, Circle, Loader2, AlertTriangle, XCircle, Info } from "lucide-react";
import KpiStat from "../../dashboard/components/KpiStat";
import { RunStatusBadge } from "./StatusBadge";
import type { RunLogLine, UtilityRunResult } from "../types";
import type { RunPhase } from "../lib/useUtilityRun";

interface Props {
  phase: RunPhase;
  progress: number;
  currentStep: number;
  steps: string[];
  logs: RunLogLine[];
  result: UtilityRunResult | null;
  error: string | null;
}

const logIcon = {
  info: <Info className="w-3.5 h-3.5 text-[#3A6EA5]" />,
  success: <CheckCircle2 className="w-3.5 h-3.5 text-[#259688]" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />,
  error: <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />,
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export default function RunConsole({ phase, progress, currentStep, steps, logs, result, error }: Props) {
  const running = phase === "running";

  return (
    <div className="space-y-5">
      {/* Progress bar + steps */}
      {(running || (phase === "done" && steps.length > 1)) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
              {running ? "Processing…" : "Steps"}
            </span>
            <span className="text-xs font-bold tabular-nums text-[#3A6EA5]">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3A6EA5] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-3 space-y-1.5">
            {steps.map((s, i) => {
              const done = phase === "done" || i < currentStep;
              const active = running && i === currentStep;
              return (
                <li key={s} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#259688] shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-[#3A6EA5] animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                  )}
                  <span className={done ? "text-[#475569]" : active ? "text-[#1F3A5F] font-semibold" : "text-[#94A3B8]"}>
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border-2 border-[#EF4444]/40 bg-[#EF4444]/10 p-3">
          <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Result summary */}
      {result && !error && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RunStatusBadge status={result.status} />
            {result.note && <span className="text-[11px] text-[#94A3B8]">{result.note}</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiStat label="Processed" value={result.processed.toLocaleString()} tone="blue" />
            <KpiStat label="Succeeded" value={result.succeeded.toLocaleString()} tone="teal" />
            <KpiStat label="Skipped" value={result.skipped.toLocaleString()} tone="neutral" />
            <KpiStat label="Failed" value={result.failed.toLocaleString()} tone={result.failed > 0 ? "red" : "neutral"} />
          </div>
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#64748B] mb-2">Execution log</p>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#0F172A] max-h-64 overflow-y-auto p-3 font-mono text-xs space-y-1">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-px">{logIcon[l.level]}</span>
                <span className="text-[#64748B] shrink-0 tabular-nums">{fmtTime(l.at)}</span>
                <span
                  className={
                    l.level === "error"
                      ? "text-[#FCA5A5]"
                      : l.level === "warning"
                        ? "text-[#FCD34D]"
                        : l.level === "success"
                          ? "text-[#6EE7B7]"
                          : "text-[#CBD5E1]"
                  }
                >
                  {l.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
