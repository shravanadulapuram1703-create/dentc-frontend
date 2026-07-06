// The Utilities runner. Renders + executes ANY UtilityDefinition end-to-end:
//   RBAC gate → parameter form → confirm (for mutating ops) → progress/steps →
//   result summary + log → audit record.
// Special kinds branch to dedicated panels (launch, fee-schedule Excel template).
// Adding a utility requires no change here — only a new catalog entry.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, RotateCcw, ShieldX, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import WidgetCard from "../dashboard/components/WidgetCard";
import { toOfficeId } from "../dashboard/lib/useDashboardData";
import { useOffices, officeName } from "../reports/lib/useReportRefData";
import { canRunUtility, rolesLabel } from "./lib/rbac";
import { useUtilityRun, isUtilityRunning } from "./lib/useUtilityRun";
import {
  loadFavorites,
  toggleFavorite as toggleFav,
  appendHistory,
  pushRecent,
} from "./lib/utilitiesStorage";
import { BackendBadge } from "./components/StatusBadge";
import UtilityParamsForm from "./components/UtilityParamsForm";
import { paramsComplete } from "./lib/paramValidation";
import ConfirmDialog from "./components/ConfirmDialog";
import RunConsole from "./components/RunConsole";
import ExcelTemplatePanel from "./components/ExcelTemplatePanel";
import LaunchPanel from "./components/LaunchPanel";
import { CATEGORY_MAP } from "./utilityCatalog";
import type { AuditEntry, ParamValues, UtilityDefinition } from "./types";

interface Props {
  def: UtilityDefinition;
  currentOffice: string;
}

function initialValues(def: UtilityDefinition, currentOffice: string): ParamValues {
  const v: ParamValues = {};
  if (def.officeScoped) {
    const id = toOfficeId(currentOffice);
    v.__office = id != null ? String(id) : "";
  }
  for (const f of def.params ?? []) {
    if (f.defaultValue !== undefined) v[f.key] = f.defaultValue;
  }
  return v;
}

export default function UtilityShell({ def, currentOffice }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const officesQ = useOffices();

  const [values, setValues] = useState<ParamValues>(() => initialValues(def, currentOffice));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [favorite, setFavorite] = useState(() => loadFavorites(user?.id).includes(def.id));
  const [launchedAt, setLaunchedAt] = useState<string | null>(null);

  const run = useUtilityRun();
  const authorized = canRunUtility(def, user?.role);
  const cat = CATEGORY_MAP[def.category];
  const Icon = def.icon;

  const officeLabel = useMemo(() => {
    if (!def.officeScoped) return "";
    const id = values.__office ? Number(values.__office) : null;
    if (id == null) return "";
    const o = (officesQ.data ?? []).find((x) => x.id === id);
    return o ? officeName(o) : `Office ${id}`;
  }, [def.officeScoped, values.__office, officesQ.data]);

  const setValue = (key: string, value: ParamValues[string]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const paramSummary = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    if (def.officeScoped) out.push({ label: "Office", value: officeLabel || "—" });
    for (const f of def.params ?? []) {
      const raw = values[f.key];
      if (raw == null || raw === "") continue;
      let value: string;
      if (raw instanceof File) value = raw.name;
      else if (typeof raw === "boolean") value = raw ? "Yes" : "No";
      else if (f.kind === "select") value = f.options?.find((o) => o.value === String(raw))?.label ?? String(raw);
      else value = String(raw);
      out.push({ label: f.label, value });
    }
    return out;
  }, [def, values, officeLabel]);

  const ctx = {
    user_id: user?.id ?? "anon",
    user_name: user?.name || user?.email || "Unknown user",
    office: officeLabel || currentOffice || "—",
  };

  const complete = paramsComplete(def, values);
  const running = run.isRunning || isUtilityRunning(def.id);

  const doRun = () => {
    if (def.destructive) setConfirmOpen(true);
    else void run.start(def, values, ctx);
  };
  const confirmRun = () => {
    setConfirmOpen(false);
    void run.start(def, values, ctx);
  };

  const onToggleFavorite = () => setFavorite(toggleFav(user?.id, def.id).includes(def.id));

  const onLaunch = () => {
    if (def.launchUrl) window.open(def.launchUrl, "_blank", "noopener,noreferrer");
    const at = new Date().toISOString();
    setLaunchedAt(at);
    const entry: AuditEntry = {
      id: `run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      utility_id: def.id,
      utility_title: def.title,
      category: def.category,
      user_id: ctx.user_id,
      user_name: ctx.user_name,
      office: ctx.office,
      executed_at: at,
      params: { destination: def.launchUrl ?? "" },
      status: "success",
      processed: 0,
      succeeded: 0,
      failed: 0,
      duration_ms: 0,
    };
    appendHistory(user?.id, entry);
    pushRecent(user?.id, def.id);
  };

  // ---- RBAC gate ----------------------------------------------------------
  if (!authorized) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <button
          type="button"
          onClick={() => navigate("/utilities")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#3A6EA5] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Utilities
        </button>
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16 bg-white rounded-lg border border-[#E2E8F0]">
          <ShieldX className="w-10 h-10 text-[#DC2626]" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-[#1F3A5F]">Access restricted</h1>
          <p className="text-sm text-[#64748B] max-w-sm">
            You don't have permission to run <span className="font-semibold">{def.title}</span>. Allowed roles:{" "}
            {rolesLabel(def)}.
          </p>
        </div>
      </div>
    );
  }

  const isExcelTemplate = def.id === "fee-schedule-excel";
  const isLaunch = def.kind === "launch";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/utilities")}
            className="mt-1 p-2 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
            aria-label="Back to Utilities"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-[#EFF6FF] mt-0.5">
              <Icon className="w-6 h-6 text-[#3A6EA5]" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#1F3A5F]">{def.title}</h1>
                <BackendBadge status={def.backend} />
              </div>
              <p className="text-sm text-[#64748B]">{def.description}</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                {cat.label} · Allowed roles: {rolesLabel(def)}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]"
        >
          <Star className={`w-4 h-4 ${favorite ? "fill-[#F59E0B] text-[#F59E0B]" : ""}`} />
          {favorite ? "Favourited" : "Favourite"}
        </button>
      </div>

      {def.runNote && (
        <div className="rounded-lg border border-[#3A6EA5]/30 bg-[#3A6EA5]/5 px-4 py-2.5 text-sm text-[#1F3A5F]">
          {def.runNote}
        </div>
      )}

      {/* Body — branch by kind */}
      {isExcelTemplate ? (
        <ExcelTemplatePanel />
      ) : isLaunch ? (
        <WidgetCard title="Launch external application" icon={<Icon className="w-4 h-4" />}>
          <LaunchPanel def={def} rolesLabel={rolesLabel(def)} launchedAt={launchedAt} onLaunch={onLaunch} />
        </WidgetCard>
      ) : (
        <>
          <WidgetCard title="Parameters" icon={<Icon className="w-4 h-4" />}>
            <div className="space-y-4">
              <UtilityParamsForm def={def} values={values} onChange={setValue} disabled={running} />
              <div className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={doRun}
                  disabled={!complete || running}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {running ? "Running…" : def.confirmLabel ?? "Run utility"}
                </button>
                {run.phase === "done" && (
                  <button
                    type="button"
                    onClick={run.reset}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#CBD5E1] text-sm font-bold text-[#475569] hover:bg-[#F1F5F9]"
                  >
                    <RotateCcw className="w-4 h-4" /> Run again
                  </button>
                )}
                {!complete && (
                  <span className="text-xs text-[#94A3B8]">Complete the required fields to enable Run.</span>
                )}
                {running && (
                  <span className="text-xs text-[#94A3B8]">A run is already in progress — duplicate runs are blocked.</span>
                )}
              </div>
            </div>
          </WidgetCard>

          {(run.phase !== "idle") && (
            <WidgetCard title="Execution" icon={<Play className="w-4 h-4" />}>
              <RunConsole
                phase={run.phase}
                progress={run.progress}
                currentStep={run.currentStep}
                steps={def.steps ?? ["Processing"]}
                logs={run.logs}
                result={run.result}
                error={run.error}
              />
            </WidgetCard>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Run ${def.title}?`}
        message={
          values.dry_run === true
            ? "This will run in preview mode and will not post any changes."
            : "Review the parameters below before running this operation."
        }
        confirmLabel={def.confirmLabel ?? "Run"}
        destructive={def.destructive && values.dry_run !== true}
        paramSummary={paramSummary}
        onConfirm={confirmRun}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
