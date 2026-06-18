import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Save, X, Trash2, Loader2, Pencil, Pill } from "lucide-react";
import { toast } from "sonner";
import type { PrescriptionLibraryRead } from "@/api/generated/model";
import {
  listAllPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from "./prescriptionService";
import {
  type PrescriptionForm,
  SIG_MAX,
  emptyPrescriptionForm,
  prescriptionToForm,
  buildPrescriptionCreate,
  buildPrescriptionUpdate,
  yesNo,
  formatModified,
} from "./prescriptionData";

// ============================================================================
// Prescriptions Setup — master-detail screen mirroring the legacy "Prescriptions
// Setup". Left rail: Sort By (Drug Name / RX ID#) + search text + list (ADD NEW).
// Right pane: "Prescription Info" (RX ID#, Drug Name, Dispense, Sig, Refill,
// Dispense As Written) with a Modified-On badge and Edit/Delete footer. Add/Edit
// is an inline form with a 240-char Sig counter, matching the legacy editor.
//
// Backed by /api/v1/prescription-library (tag: Procedures). Backend gaps are
// documented in docs/pick-list/pick_list_setup_backend_devreport.md (§4, RX-*).
// ============================================================================

type Mode = "view" | "add" | "edit";
type SortBy = "drug_name" | "id";

function InfoRow({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[220px_1fr] border-b border-[#E2E8F0] last:border-b-0 odd:bg-[#F8FAFC]">
      <div className="px-4 py-2.5 text-sm text-[#1F3A5F] font-semibold border-r border-[#E2E8F0]">{label}</div>
      <div className={`px-4 py-2.5 text-sm text-[#1E293B] ${strong ? "font-bold" : ""}`}>{value || " "}</div>
    </div>
  );
}

export default function PrescriptionSetup() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionLibraryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Left rail controls.
  const [sortBy, setSortBy] = useState<SortBy>("drug_name");
  const [searchText, setSearchText] = useState("");

  // Detail state.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [form, setForm] = useState<PrescriptionForm>(() => emptyPrescriptionForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listAllPrescriptions();
      setPrescriptions(list);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load prescriptions");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return prescriptions
      .filter((p) => {
        if (!q) return true;
        return (
          (p.drug_name ?? "").toLowerCase().includes(q) ||
          (p.sig ?? "").toLowerCase().includes(q) ||
          (p.dispense ?? "").toLowerCase().includes(q) ||
          String(p.id).includes(q)
        );
      })
      .sort((a, b) =>
        sortBy === "id" ? a.id - b.id : (a.drug_name ?? "").localeCompare(b.drug_name ?? ""),
      );
  }, [prescriptions, searchText, sortBy]);

  const selected = useMemo(
    () => prescriptions.find((p) => p.id === selectedId) ?? null,
    [prescriptions, selectedId],
  );

  const updateForm = (updates: Partial<PrescriptionForm>) => setForm((p) => ({ ...p, ...updates }));

  const openPrescription = (p: PrescriptionLibraryRead) => {
    setSelectedId(p.id);
    setMode("view");
  };

  const openAdd = () => {
    setForm(emptyPrescriptionForm());
    setSelectedId(null);
    setMode("add");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm(prescriptionToForm(selected));
    setMode("edit");
  };

  const handleCancel = () => {
    if (saving) return;
    setMode("view");
    setForm(emptyPrescriptionForm());
  };

  const handleSave = async () => {
    if (!form.drug_name.trim()) {
      toast.error("Validation Failed", { description: "Enter a drug name" });
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        const created = await createPrescription(buildPrescriptionCreate(form));
        toast.success("Prescription created");
        await loadData();
        setSelectedId(created.id);
      } else if (selectedId != null) {
        await updatePrescription(selectedId, buildPrescriptionUpdate(form));
        toast.success("Prescription updated");
        await loadData();
      }
      setMode("view");
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save prescription",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete prescription "${selected.drug_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deletePrescription(selected.id);
      toast.success("Prescription deleted");
      setSelectedId(null);
      setMode("view");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete prescription",
      });
    } finally {
      setDeleting(false);
    }
  };

  const editing = mode === "add" || mode === "edit";
  const sigRemaining = SIG_MAX - form.sig.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Prescriptions Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">Manage the reusable prescription library</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
            {/* -------------------- LEFT SEARCH RAIL -------------------- */}
            <aside className="bg-[#F8FAFC] border-r-2 border-[#E2E8F0] flex flex-col min-h-[600px]">
              <div className="px-4 py-2.5 text-xs font-bold tracking-wide text-[#1F3A5F] uppercase border-b-2 border-[#E2E8F0] bg-white">
                Search
              </div>

              <div className="p-4 space-y-4 border-b border-[#E2E8F0]">
                {/* Sort By */}
                <div>
                  <div className="text-xs font-bold tracking-wide mb-2 text-[#1F3A5F]">SORT BY</div>
                  <div className="flex items-center gap-4 text-sm">
                    {([
                      ["drug_name", "Drug Name"],
                      ["id", "RX ID#"],
                    ] as [SortBy, string][]).map(([val, lbl]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === val}
                          onChange={() => setSortBy(val)}
                          className="accent-[#3A6EA5]"
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Search text */}
                <div>
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
              </div>

              {/* List */}
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
                  <div className="px-4 py-6 text-center text-sm text-[#64748B] font-bold">No prescriptions found</div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPrescription(p)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-[#E2E8F0] border-l-4 transition-colors ${
                        p.id === selectedId
                          ? "bg-[#E8EFF7] text-[#1F3A5F] font-bold border-l-[#3A6EA5]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9] border-l-transparent"
                      }`}
                    >
                      {p.drug_name} <span className="text-[#94A3B8] font-normal">({p.id})</span>
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
                  ADD NEW
                </button>
              </div>
            </aside>

            {/* -------------------- RIGHT DETAIL PANE -------------------- */}
            <section className="flex flex-col bg-white min-h-[600px]">
              {/* Title + modified badge */}
              <div className="flex items-start justify-between px-6 pt-4 pb-2">
                <div className="text-sm font-bold uppercase tracking-wide text-[#3A6EA5]">Prescription Info</div>
                {!editing && selected?.updated_at ? (
                  <div className="text-right text-[11px] text-[#64748B] font-semibold">
                    <div>Modified On: {formatModified(selected.updated_at)}</div>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {!selected && !editing ? (
                  <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#64748B]">
                    <Pill className="w-12 h-12 text-[#CBD5E1] mb-3" />
                    <p className="text-sm font-bold">Select a prescription from the list</p>
                    <p className="text-xs">or add a new prescription</p>
                  </div>
                ) : editing ? (
                  /* ---------- EDIT / ADD FORM ---------- */
                  <div className="space-y-4 max-w-3xl">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                        Drug Name <span className="text-[#DC2626]">*</span>
                      </span>
                      <input
                        type="text"
                        value={form.drug_name}
                        onChange={(e) => updateForm({ drug_name: e.target.value })}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Dispense</span>
                      <input
                        type="text"
                        value={form.dispense}
                        onChange={(e) => updateForm({ dispense: e.target.value })}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Sig</span>
                      <textarea
                        value={form.sig}
                        maxLength={SIG_MAX}
                        rows={4}
                        onChange={(e) => updateForm({ sig: e.target.value })}
                        className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 resize-y"
                      />
                      <span className="text-[10px] text-[#94A3B8]">
                        Allowed {SIG_MAX} characters · Remaining{" "}
                        <span className={sigRemaining < 0 ? "text-[#DC2626]" : "text-[#D97706]"}>{sigRemaining}</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                          Refill <span className="text-[#DC2626]">*</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={form.refills}
                            onChange={(e) => updateForm({ refills: e.target.value })}
                            className="w-28 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
                          />
                          <span className="text-sm text-[#64748B]">Times</span>
                        </div>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Dispense As Written</span>
                        <select
                          value={form.is_as_written ? "yes" : "no"}
                          onChange={(e) => updateForm({ is_as_written: e.target.value === "yes" })}
                          className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white focus:outline-none focus:border-[#3A6EA5]"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => updateForm({ is_active: e.target.checked })}
                        className="w-4 h-4 accent-[#3A6EA5]"
                      />
                      <span className="text-sm font-bold text-[#1F3A5F]">Active</span>
                    </label>
                  </div>
                ) : (
                  /* ---------- READ-ONLY VIEW ---------- */
                  <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <InfoRow label="RX ID#" value={String(selected?.id ?? "")} strong />
                    <InfoRow label="Drug Name" value={selected?.drug_name} strong />
                    <InfoRow label="Dispense" value={selected?.dispense} />
                    <InfoRow label="Sig" value={selected?.sig} />
                    <InfoRow label="Refill" value={String(selected?.refills ?? 0)} />
                    <InfoRow label="Dispense As Written" value={yesNo(selected?.is_as_written)} />
                    {selected && !selected.is_active ? <InfoRow label="Active" value="No" /> : null}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="border-t-2 border-[#E2E8F0] bg-white px-6 py-3 flex justify-end gap-2">
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
                      {mode === "add" ? "Create Prescription" : "Save Prescription"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={openEdit}
                      disabled={!selected}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-40"
                    >
                      <Pencil className="w-4 h-4" />
                      EDIT
                    </button>
                    <button
                      onClick={() => void handleDelete()}
                      disabled={!selected || deleting}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#FECACA] font-bold text-sm disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      DELETE
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
