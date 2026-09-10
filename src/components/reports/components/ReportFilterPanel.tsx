// Filter panel for a report — renders only the controls the report opts into
// (def.filters + def.extraFilters). Presentational: it edits a draft object that
// the ReportShell commits on "Run report".
import { Play, RotateCcw, Loader2 } from "lucide-react";
import { PRESET_LABELS, type RangePreset } from "../lib/reportRange";
import { useOffices, useProviders, officeName } from "../lib/useReportRefData";
import { providerOptionLabel } from "@/services/providerDirectory";
import type { AnyReportDefinition } from "../types";

export interface DraftFilters {
  preset: RangePreset;
  from: string;
  to: string;
  office: string; // "" = all offices
  provider: string; // "" = all providers
  status: string; // "" = all
  search: string;
  extra: Record<string, string>;
}

interface Props {
  def: AnyReportDefinition;
  draft: DraftFilters;
  onChange: (patch: Partial<DraftFilters>) => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
}

const fieldCls =
  "w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm text-[#1F3A5F] bg-white focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]";
const labelCls = "block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1";

export default function ReportFilterPanel({ def, draft, onChange, onRun, onReset, running }: Props) {
  const has = (k: string) => def.filters.includes(k as never);
  const officesQ = useOffices();
  const providersQ = useProviders(draft.office ? Number(draft.office) : null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
      className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {has("dateRange") && (
          <div>
            <label className={labelCls} htmlFor="rep-preset">
              Date range
            </label>
            <select
              id="rep-preset"
              value={draft.preset}
              onChange={(e) => onChange({ preset: e.target.value as RangePreset })}
              className={fieldCls}
            >
              {(Object.keys(PRESET_LABELS) as RangePreset[]).map((p) => (
                <option key={p} value={p}>
                  {PRESET_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        )}

        {has("dateRange") && draft.preset === "custom" && (
          <>
            <div>
              <label className={labelCls} htmlFor="rep-from">
                From
              </label>
              <input
                id="rep-from"
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => onChange({ from: e.target.value })}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rep-to">
                To
              </label>
              <input
                id="rep-to"
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => onChange({ to: e.target.value })}
                className={fieldCls}
              />
            </div>
          </>
        )}

        {has("office") && (
          <div>
            <label className={labelCls} htmlFor="rep-office">
              Office
            </label>
            <select
              id="rep-office"
              value={draft.office}
              onChange={(e) => onChange({ office: e.target.value, provider: "" })}
              className={fieldCls}
            >
              <option value="">All offices</option>
              {(officesQ.data ?? []).map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {officeName(o)}
                </option>
              ))}
            </select>
          </div>
        )}

        {has("provider") && (
          <div>
            <label className={labelCls} htmlFor="rep-provider">
              Provider
            </label>
            <select
              id="rep-provider"
              value={draft.provider}
              onChange={(e) => onChange({ provider: e.target.value })}
              className={fieldCls}
              disabled={providersQ.isLoading}
            >
              <option value="">All providers</option>
              {(providersQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {providerOptionLabel(p)}
                </option>
              ))}
            </select>
          </div>
        )}

        {has("status") && def.statusOptions && (
          <div>
            <label className={labelCls} htmlFor="rep-status">
              Status
            </label>
            <select
              id="rep-status"
              value={draft.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className={fieldCls}
            >
              <option value="">All statuses</option>
              {def.statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {(def.extraFilters ?? []).map((f) => (
          <div key={f.key}>
            <label className={labelCls} htmlFor={`rep-x-${f.key}`}>
              {f.label}
            </label>
            <select
              id={`rep-x-${f.key}`}
              value={draft.extra[f.key] ?? f.defaultValue ?? ""}
              onChange={(e) => onChange({ extra: { ...draft.extra, [f.key]: e.target.value } })}
              className={fieldCls}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {has("search") && (
          <div>
            <label className={labelCls} htmlFor="rep-search">
              Keyword
            </label>
            <input
              id="rep-search"
              type="text"
              value={draft.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Search…"
              className={fieldCls}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          type="submit"
          disabled={running}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#3A6EA5] hover:bg-[#2f5a8c] disabled:bg-[#94A3B8] disabled:cursor-not-allowed text-white text-sm font-bold"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Running…" : "Run report"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#CBD5E1] text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>
    </form>
  );
}
