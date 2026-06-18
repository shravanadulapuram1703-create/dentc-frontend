import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Save, X, Trash2, Loader2, Pencil, Activity, Check } from "lucide-react";
import { toast } from "sonner";
import {
  listPerioChartTemplates,
  createPerioChartTemplate,
  updatePerioChartTemplate,
  deletePerioChartTemplate,
} from "@/api/generated/endpoints/clinical/clinical";
import type {
  PerioChartTemplateRead,
  PerioChartTemplateCreate,
  PerioChartTemplateUpdate,
} from "@/api/generated/model";
import {
  PERIO_AUTO_ADVANCE_REGIONS,
  PERIO_DEFAULT_AUTO_ADVANCE,
  PERIO_LEVEL_OPTIONS,
  fmtDirection,
  fmtDateTime,
} from "./chartingAssets";

// ============================================================================
// Perio Setup Templates — master-detail screen on /api/v1/perio-chart-templates
// (Orval tag Clinical). Left rail = named template list (search + ADD TEMPLATE);
// right pane = "Template Info" + the 8-region "Auto Advance Direction" grid, with
// an EDIT / DELETE footer in view mode and SAVE / CANCEL in add/edit mode —
// mirroring the legacy Denticon "Perio Setup Templates" screen.
//
// Backs the new CHART-1 resource (named, tenant-scoped template with
// cal_warning_level / fgm_level / start_voice + the auto_advance JSON grid).
// snake_case forms bind directly to the generated client. The region structure,
// level option list and color palette are FE-owned presentation
// (chartingAssets.ts). Remaining backend gaps are tracked in
// docs/charthing/charting_setup_backend_devreport.md.
// ============================================================================

type Mode = "view" | "add" | "edit";

interface PerioForm {
  name: string;
  show_mgj: boolean;
  pd_warning_level: number;
  cal_warning_level: number;
  bp_level: number;
  ip_level: number;
  fgm_level: number;
  start_voice: boolean;
  auto_advance: Record<string, string>;
}

// Legacy defaults (see backend dev report CHART-1 column defaults).
const emptyForm = (): PerioForm => ({
  name: "",
  show_mgj: false,
  pd_warning_level: 4,
  cal_warning_level: 4,
  bp_level: 2,
  ip_level: 3,
  fgm_level: 2,
  start_voice: false,
  auto_advance: { ...PERIO_DEFAULT_AUTO_ADVANCE },
});

// auto_advance arrives as a free-form JSON object ({ [k]: unknown } | null).
// Coerce to a region→direction string map, falling back to the forward sweep.
function readAutoAdvance(raw: unknown): Record<string, string> {
  const out: Record<string, string> = { ...PERIO_DEFAULT_AUTO_ADVANCE };
  if (raw && typeof raw === "object") {
    for (const region of PERIO_AUTO_ADVANCE_REGIONS) {
      const v = (raw as Record<string, unknown>)[region.key];
      if (typeof v === "string" && v) out[region.key] = v;
    }
  }
  return out;
}

const templateToForm = (t: PerioChartTemplateRead): PerioForm => ({
  name: t.name,
  show_mgj: t.show_mgj,
  pd_warning_level: t.pd_warning_level,
  cal_warning_level: t.cal_warning_level,
  bp_level: t.bp_level,
  ip_level: t.ip_level,
  fgm_level: t.fgm_level,
  start_voice: t.start_voice,
  auto_advance: readAutoAdvance(t.auto_advance),
});

const labelCls = "text-xs font-bold text-[#1F3A5F] uppercase tracking-wide";
const selectCls =
  "px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

// Read-only "Template Info" row (label | value), matching ReferralSetup's InfoRow.
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_1fr] border-b border-[#E2E8F0] last:border-b-0 odd:bg-[#F8FAFC]">
      <div className="px-4 py-2.5 text-sm text-[#1F3A5F] font-semibold border-r border-[#E2E8F0]">
        {label}
      </div>
      <div className="px-4 py-2.5 text-sm text-[#1E293B] font-bold">{value}</div>
    </div>
  );
}

function YesNo({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1 text-[#15803D]">
      <Check className="w-4 h-4" /> Yes
    </span>
  ) : (
    <span className="text-[#94A3B8]">No</span>
  );
}

const TEMPLATE_INFO_ROWS: { label: string; key: keyof PerioForm }[] = [
  { label: "Pocket Depth Warning Level", key: "pd_warning_level" },
  { label: "CAL Warning Level", key: "cal_warning_level" },
  { label: "Default Buccal and Palatal Level for Pocket Depth", key: "bp_level" },
  { label: "Default Inter-proximal Level for Pocket Depth", key: "ip_level" },
  { label: "Default Level for FGM", key: "fgm_level" },
];

export default function PerioTemplateSetup() {
  const [rows, setRows] = useState<PerioChartTemplateRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<PerioForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listPerioChartTemplates({ size: 200, sort: "name", order: "asc" });
      setRows(res.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load perio templates");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows
      .filter((r) => (!q ? true : r.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, searchText]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const editing = mode === "add" || mode === "edit";

  const updateForm = (u: Partial<PerioForm>) => setForm((p) => ({ ...p, ...u }));
  const setRegion = (key: string, value: string) =>
    setForm((p) => ({ ...p, auto_advance: { ...p.auto_advance, [key]: value } }));

  const openTemplate = (t: PerioChartTemplateRead) => {
    setSelectedId(t.id);
    setMode("view");
  };

  const openAdd = () => {
    setForm(emptyForm());
    setSelectedId(null);
    setMode("add");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm(templateToForm(selected));
    setMode("edit");
  };

  const handleCancel = () => {
    if (saving) return;
    setMode("view");
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Template Name is required" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        show_mgj: form.show_mgj,
        pd_warning_level: form.pd_warning_level,
        cal_warning_level: form.cal_warning_level,
        bp_level: form.bp_level,
        ip_level: form.ip_level,
        fgm_level: form.fgm_level,
        start_voice: form.start_voice,
        auto_advance: form.auto_advance,
      };
      if (mode === "add") {
        const created = await createPerioChartTemplate(body as PerioChartTemplateCreate);
        toast.success("Perio template created");
        await loadData();
        setSelectedId(created.id);
      } else if (selectedId != null) {
        await updatePerioChartTemplate(selectedId, body as PerioChartTemplateUpdate);
        toast.success("Perio template updated");
        await loadData();
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save perio template",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete perio template "${selected.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deletePerioChartTemplate(selected.id);
      toast.success("Perio template deleted");
      setSelectedId(null);
      setMode("view");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete perio template",
      });
    } finally {
      setDeleting(false);
    }
  };

  // The auto_advance grid — interactive (radios) when editing, read-only ticks otherwise.
  const autoAdvance = editing ? form.auto_advance : readAutoAdvance(selected?.auto_advance);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Perio Setup Templates</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Named periodontal charting templates — warning levels, defaults and auto-advance direction
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* -------------------- LEFT RAIL -------------------- */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Perio Templates
              </div>

              <div className="p-4 border-b border-[#E2E8F0]">
                <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SEARCH TEXT</div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 border-2 border-[#E2E8F0] rounded-lg bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-[#64748B] text-sm font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" /> Loading…
                  </div>
                ) : loadError ? (
                  <div className="px-4 py-6 text-center text-sm text-[#DC2626]">
                    {loadError}
                    <button
                      onClick={() => void loadData()}
                      className="mt-2 block mx-auto px-3 py-1 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded text-xs font-bold hover:bg-[#E8EFF7]"
                    >
                      Retry
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[#64748B] font-bold">
                    {rows.length === 0 ? "No templates yet" : "No templates match your search"}
                  </div>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTemplate(t)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-[#E2E8F0] border-l-4 transition-colors ${
                        t.id === selectedId
                          ? "bg-[#E8EFF7] text-[#1F3A5F] font-bold border-l-[#3A6EA5]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9] border-l-transparent"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[#E2E8F0]">
                <button
                  onClick={openAdd}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3A6EA5] text-white hover:bg-[#1F3A5F] rounded-lg font-bold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  ADD TEMPLATE
                </button>
              </div>
            </aside>

            {/* -------------------- RIGHT DETAIL PANE -------------------- */}
            <section className="flex flex-col bg-white min-h-[600px]">
              {!selected && !editing ? (
                <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#64748B]">
                  <Activity className="w-12 h-12 text-[#CBD5E1] mb-3" />
                  <p className="text-sm font-bold">Select a template from the list</p>
                  <p className="text-xs">or add a new perio template</p>
                </div>
              ) : (
                <>
                  {/* Modified stamp */}
                  {mode === "view" && selected && (
                    <div className="flex justify-end px-6 pt-4">
                      <div className="text-right text-xs text-[#64748B] font-bold leading-5">
                        <div>Modified On: {fmtDateTime(selected.updated_at ?? selected.created_at)}</div>
                        {/* CHART-1: updated_by/created_by are user FKs (ids); name lookup pending */}
                        <div>Modified By: {selected.updated_by ?? selected.created_by ?? "—"}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* ---------------- TEMPLATE INFO ---------------- */}
                    <div>
                      <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-3">
                        Template Info
                      </h3>

                      {editing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-[#E2E8F0] rounded-lg p-4 bg-[#F8FAFC]">
                          <label className="flex flex-col gap-1 md:col-span-2">
                            <span className={labelCls}>
                              Template Name <span className="text-[#DC2626]">*</span>
                            </span>
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) => updateForm({ name: e.target.value })}
                              placeholder="Enter Template Name"
                              className={`${selectCls} w-full`}
                            />
                          </label>

                          <label className="flex items-center gap-2 md:col-span-2">
                            <input
                              type="checkbox"
                              checked={form.show_mgj}
                              onChange={(e) => updateForm({ show_mgj: e.target.checked })}
                              className="w-4 h-4 accent-[#3A6EA5]"
                            />
                            <span className={labelCls}>Show MGJ</span>
                          </label>

                          {TEMPLATE_INFO_ROWS.map(({ label, key }) => (
                            <label key={key} className="flex flex-col gap-1">
                              <span className={labelCls}>{label}</span>
                              <select
                                value={form[key] as number}
                                onChange={(e) => updateForm({ [key]: Number(e.target.value) } as Partial<PerioForm>)}
                                className={selectCls}
                              >
                                {PERIO_LEVEL_OPTIONS.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}

                          <label className="flex items-center gap-2 md:col-span-2">
                            <input
                              type="checkbox"
                              checked={form.start_voice}
                              onChange={(e) => updateForm({ start_voice: e.target.checked })}
                              className="w-4 h-4 accent-[#3A6EA5]"
                            />
                            <span className={labelCls}>Start Voice</span>
                          </label>
                        </div>
                      ) : selected ? (
                        <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                          <InfoRow label="Template Name" value={selected.name} />
                          <InfoRow label="Show MGJ" value={<YesNo on={selected.show_mgj} />} />
                          {TEMPLATE_INFO_ROWS.map(({ label, key }) => (
                            <InfoRow key={key} label={label} value={String(selected[key as keyof PerioChartTemplateRead])} />
                          ))}
                          <InfoRow label="Start Voice" value={<YesNo on={selected.start_voice} />} />
                        </div>
                      ) : null}
                    </div>

                    {/* ---------------- AUTO ADVANCE DIRECTION ---------------- */}
                    <div>
                      <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide mb-3">
                        Auto Advance Direction
                      </h3>
                      <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                        {PERIO_AUTO_ADVANCE_REGIONS.map((region) => {
                          const current = autoAdvance[region.key];
                          return (
                            <div
                              key={region.key}
                              className="grid grid-cols-[140px_1fr_1fr] items-center border-b border-[#E2E8F0] last:border-b-0 odd:bg-[#F8FAFC]"
                            >
                              <div className="px-4 py-2.5 text-sm font-semibold text-[#1F3A5F] border-r border-[#E2E8F0]">
                                {region.label}
                              </div>
                              {[region.forward, region.reverse].map((dir) => (
                                <label
                                  key={dir}
                                  className={`px-4 py-2.5 flex items-center gap-2 text-sm ${
                                    editing ? "cursor-pointer" : "cursor-default"
                                  } ${current === dir ? "text-[#1F3A5F] font-bold" : "text-[#64748B]"}`}
                                >
                                  <input
                                    type="radio"
                                    name={`aa-${region.key}`}
                                    checked={current === dir}
                                    disabled={!editing}
                                    onChange={() => setRegion(region.key, dir)}
                                    className="accent-[#3A6EA5]"
                                  />
                                  {fmtDirection(dir)}
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ---------------- FOOTER ---------------- */}
                  <div className="flex items-center justify-end gap-2 px-6 py-4 border-t-2 border-[#E2E8F0] bg-[#F7F9FC]">
                    {editing ? (
                      <>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => void handleDelete()}
                          disabled={deleting || !selected}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-[#FCA5A5] text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] font-bold text-sm disabled:opacity-50"
                        >
                          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Delete Template
                        </button>
                        <button
                          onClick={openEdit}
                          disabled={!selected}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Template
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
