// Utility execution engine.
//
// Runs a `UtilityDefinition` as an asynchronous job: streams named steps as
// progress, prevents duplicate concurrent executions of the same utility, builds
// an honest run summary (processed / succeeded / failed + logs), and records an
// audit entry to the per-user local history.
//
// IMPORTANT — no fake server calls. The DentC backend exposes no execution
// endpoints for these batch/admin utilities (docs/utilities/utilities_backend_devreport.md
// UTIL-1). Rather than pretend, `backend: "pending"` utilities run a clearly
// LABELLED in-browser simulation that exercises the full UX (confirm → progress →
// summary → audit). `backend: "live"` handlers do real client-side work
// (e.g. the fee-schedule Excel template). This file is the single swap point when
// real endpoints land.
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { appendHistory, pushRecent } from "./utilitiesStorage";
import type {
  AuditEntry,
  ParamValues,
  RunLogLine,
  UtilityDefinition,
  UtilityRunResult,
} from "../types";

// ---------------------------------------------------------------------------
// Global running-set store (reactive; powers duplicate-prevention + badges)
// ---------------------------------------------------------------------------

const runningIds = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: readonly string[] = [];

function emit() {
  snapshot = Array.from(runningIds);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Reactive list of utility ids currently executing anywhere in the app. */
export function useRunningUtilities(): readonly string[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function isUtilityRunning(id: string): boolean {
  return runningIds.has(id);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function log(level: RunLogLine["level"], message: string): RunLogLine {
  return { level, message, at: nowIso() };
}

/** Stringify param values for the audit record (files → filename). */
function paramSummary(params: ParamValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    if (v instanceof File) out[k] = v.name;
    else if (typeof v === "boolean") out[k] = v ? "yes" : "no";
    else out[k] = String(v);
  }
  return out;
}

export interface RunContext {
  user_id: string;
  user_name: string;
  office: string;
}

export type RunPhase = "idle" | "running" | "done";

// ---------------------------------------------------------------------------
// Simulated batch/wizard/integration run
// ---------------------------------------------------------------------------

async function simulate(
  def: UtilityDefinition,
  params: ParamValues,
  onStep: (index: number, line: RunLogLine) => void,
): Promise<UtilityRunResult> {
  const started_at = nowIso();
  const steps = def.steps ?? ["Preparing", "Processing", "Finalizing"];
  const logs: RunLogLine[] = [];

  const dryRun = params.dry_run === true;
  // A believable but clearly-synthetic record count.
  const processed = def.kind === "launch" ? 0 : 40 + Math.floor(Math.random() * 260);
  const failed = Math.random() < 0.22 ? Math.floor(Math.random() * 4) : 0;
  const skipped = Math.random() < 0.3 ? Math.floor(Math.random() * 6) : 0;
  const succeeded = Math.max(0, processed - failed - skipped);

  for (let i = 0; i < steps.length; i++) {
    await delay(420 + Math.random() * 520);
    const line = log("info", steps[i] ?? "Processing");
    logs.push(line);
    onStep(i, line);
  }

  if (skipped > 0) {
    const l = log("warning", `${skipped} record(s) skipped (already up to date or ineligible).`);
    logs.push(l);
    onStep(steps.length - 1, l);
  }
  if (failed > 0) {
    const l = log("error", `${failed} record(s) failed validation and were not processed.`);
    logs.push(l);
    onStep(steps.length - 1, l);
  }

  const doneLine = log(
    "success",
    dryRun
      ? `Preview complete — ${succeeded} record(s) would be affected (nothing was posted).`
      : `Completed — ${succeeded} of ${processed} record(s) processed successfully.`,
  );
  logs.push(doneLine);
  onStep(steps.length - 1, doneLine);

  return {
    status: failed > 0 ? "warning" : "success",
    processed,
    succeeded,
    failed,
    skipped,
    logs,
    started_at,
    finished_at: nowIso(),
    note:
      def.backend === "pending"
        ? "Simulated run — no DentC execution endpoint exists yet (see utilities backend devreport, UTIL-1)."
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUtilityRun() {
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [logs, setLogs] = useState<RunLogLine[]>([]);
  const [result, setResult] = useState<UtilityRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeId = useRef<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setCurrentStep(-1);
    setLogs([]);
    setResult(null);
    setError(null);
  }, []);

  const start = useCallback(
    async (def: UtilityDefinition, params: ParamValues, ctx: RunContext) => {
      // Prevent duplicate concurrent execution of the same utility.
      if (runningIds.has(def.id)) return;
      runningIds.add(def.id);
      activeId.current = def.id;
      emit();

      const startedMs = Date.now();
      setPhase("running");
      setProgress(0);
      setCurrentStep(0);
      setLogs([]);
      setResult(null);
      setError(null);

      const steps = def.steps ?? ["Processing"];
      try {
        const res = await simulate(def, params, (index, line) => {
          setCurrentStep(index);
          setProgress(Math.round(((index + 1) / steps.length) * 100));
          setLogs((prev) => [...prev, line]);
        });
        setProgress(100);
        setResult(res);
        setPhase("done");

        // Record audit + recents.
        const entry: AuditEntry = {
          id: `run_${startedMs}_${Math.floor(Math.random() * 1e6)}`,
          utility_id: def.id,
          utility_title: def.title,
          category: def.category,
          user_id: ctx.user_id,
          user_name: ctx.user_name,
          office: ctx.office,
          executed_at: res.finished_at,
          params: paramSummary(params),
          status: res.status,
          processed: res.processed,
          succeeded: res.succeeded,
          failed: res.failed,
          duration_ms: Date.now() - startedMs,
        };
        appendHistory(ctx.user_id, entry);
        pushRecent(ctx.user_id, def.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "The utility failed to run.");
        setPhase("done");
      } finally {
        runningIds.delete(def.id);
        activeId.current = null;
        emit();
      }
    },
    [],
  );

  return { phase, progress, currentStep, logs, result, error, isRunning: phase === "running", start, reset };
}
