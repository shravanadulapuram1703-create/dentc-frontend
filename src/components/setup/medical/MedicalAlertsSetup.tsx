import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Pencil, Trash2, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { DefinitionGroupRead, DefinitionRead } from "@/api/generated/model";
import {
  GROUP_TYPE,
  listGroupsByType,
  listDefinitionsByGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  createDef,
  updateDef,
  deleteDef,
  makeGroupCode,
} from "./definitionsService";
import EditorModal from "./EditorModal";

// ============================================================================
// Medical Alerts Setup — mirrors the legacy "Medical Alerts Setup" screen.
// Headers (ALLERGIC TO / CHECK IF APPLICABLE / OTHER …) are definition-groups,
// alerts are definitions. `is_flash_alert` drives the "Flash Alert" star,
// `blocks_charges` the charge-block flag. Repurposes the generic definitions
// system (group_type = MEDALERT); backend gaps in
// docs/pick-list/pick_list_setup_backend_devreport.md (§3, MED-*).
// ============================================================================

const GTYPE = GROUP_TYPE.MEDICAL_ALERT;

type AlertForm = { description: string; is_flash_alert: boolean; blocks_charges: boolean; is_active: boolean };
type HeaderForm = { description: string };

export default function MedicalAlertsSetup() {
  const [groups, setGroups] = useState<DefinitionGroupRead[]>([]);
  const [defsByGroup, setDefsByGroup] = useState<Record<string, DefinitionRead[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Header modal.
  const [headerModal, setHeaderModal] = useState<{ id?: number; form: HeaderForm } | null>(null);
  // Alert modal (groupCode + optional existing definition).
  const [alertModal, setAlertModal] = useState<{ groupCode: string; def?: DefinitionRead; form: AlertForm } | null>(
    null,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const gs = await listGroupsByType(GTYPE);
      const entries = await Promise.all(
        gs.map(async (g) => [g.group_code, await listDefinitionsByGroup(g.group_code)] as const),
      );
      setGroups(gs);
      setDefsByGroup(Object.fromEntries(entries));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load medical alerts");
      setGroups([]);
      setDefsByGroup({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const groupOptions = useMemo(
    () => groups.map((g) => ({ code: g.group_code, label: g.description })),
    [groups],
  );

  // ---------- Header CRUD ----------
  const saveHeader = async () => {
    if (!headerModal) return;
    const desc = headerModal.form.description.trim();
    if (!desc) {
      toast.error("Validation Failed", { description: "Enter a header name" });
      return;
    }
    setSaving(true);
    try {
      if (headerModal.id != null) {
        await updateGroup(headerModal.id, { group_code: groups.find((g) => g.id === headerModal.id)!.group_code, description: desc, group_type: GTYPE });
        toast.success("Header updated");
      } else {
        await createGroup({ group_code: makeGroupCode(GTYPE, desc), description: desc, group_type: GTYPE, can_add: true });
        toast.success("Header added");
      }
      setHeaderModal(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save header" });
    } finally {
      setSaving(false);
    }
  };

  const removeHeader = async (g: DefinitionGroupRead) => {
    const count = defsByGroup[g.group_code]?.length ?? 0;
    if (!confirm(`Delete header "${g.description}"${count ? ` and its ${count} alert(s)` : ""}? This cannot be undone.`))
      return;
    try {
      for (const d of defsByGroup[g.group_code] ?? []) await deleteDef(d.id).catch(() => undefined);
      await deleteGroup(g.id);
      toast.success("Header deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Could not delete header" });
    }
  };

  // ---------- Alert CRUD ----------
  const saveAlert = async () => {
    if (!alertModal) return;
    const desc = alertModal.form.description.trim();
    if (!desc) {
      toast.error("Validation Failed", { description: "Enter an alert name" });
      return;
    }
    setSaving(true);
    try {
      if (alertModal.def) {
        await updateDef(alertModal.def.id, {
          group_code: alertModal.groupCode,
          key1: desc,
          description: desc,
          is_flash_alert: alertModal.form.is_flash_alert,
          blocks_charges: alertModal.form.blocks_charges,
          is_active: alertModal.form.is_active,
        });
        toast.success("Alert updated");
      } else {
        const order = (defsByGroup[alertModal.groupCode]?.length ?? 0) + 1;
        await createDef({
          group_code: alertModal.groupCode,
          key1: desc,
          description: desc,
          sort_order: order,
          is_flash_alert: alertModal.form.is_flash_alert,
          blocks_charges: alertModal.form.blocks_charges,
          is_active: alertModal.form.is_active,
        });
        toast.success("Alert added");
      }
      setAlertModal(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save alert" });
    } finally {
      setSaving(false);
    }
  };

  const removeAlert = async (d: DefinitionRead) => {
    if (!confirm(`Delete alert "${d.description}"? This cannot be undone.`)) return;
    try {
      await deleteDef(d.id);
      toast.success("Alert deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Could not delete alert" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">Medical Alerts Setup</h1>
                <p className="text-xs text-[#64748B] font-bold">
                  Manage medical alert headers and alerts &nbsp;·&nbsp;{" "}
                  <Zap className="inline w-3 h-3 text-[#D97706]" /> = Flash Alert
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHeaderModal({ form: { description: "" } })}
                className="flex items-center gap-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm"
              >
                <Plus className="w-4 h-4" /> Add New Header
              </button>
              <button
                onClick={() => {
                  const first = groupOptions[0];
                  if (!first) {
                    toast.error("Add a header first");
                    return;
                  }
                  setAlertModal({
                    groupCode: first.code,
                    form: { description: "", is_flash_alert: false, blocks_charges: false, is_active: true },
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
              >
                <Plus className="w-4 h-4" /> Add New Alert
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-[#64748B] text-sm font-bold">
                <Loader2 className="w-5 h-5 animate-spin text-[#3A6EA5]" /> Loading…
              </div>
            ) : loadError ? (
              <div className="py-16 text-center text-sm text-[#DC2626]">
                {loadError}
                <button
                  onClick={() => void loadData()}
                  className="mt-3 block mx-auto px-3 py-1 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded text-xs font-bold hover:bg-[#E8EFF7]"
                >
                  Retry
                </button>
              </div>
            ) : groups.length === 0 ? (
              <div className="py-16 text-center text-[#64748B]">
                <AlertTriangle className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-sm font-bold">No medical alert headers yet</p>
                <p className="text-xs">Use “Add New Header” to create the first section.</p>
              </div>
            ) : (
              groups.map((g) => {
                const defs = defsByGroup[g.group_code] ?? [];
                return (
                  <section key={g.id} className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-[#1B7BC0] text-white px-4 py-2.5">
                      <span className="text-sm font-bold uppercase tracking-wide">{g.description}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setAlertModal({
                              groupCode: g.group_code,
                              form: { description: "", is_flash_alert: false, blocks_charges: false, is_active: true },
                            })
                          }
                          title="Add alert to this header"
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setHeaderModal({ id: g.id, form: { description: g.description } })}
                          title="Edit header"
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => void removeHeader(g)} title="Delete header" className="p-1 hover:bg-white/20 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {defs.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">No alerts in this header.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {defs.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-r border-[#E2E8F0] text-sm"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              {d.is_flash_alert ? <Zap className="w-3.5 h-3.5 text-[#D97706] shrink-0" /> : null}
                              <span className={`truncate ${d.is_active ? "text-[#1E293B]" : "text-[#94A3B8] line-through"}`}>
                                {d.description}
                              </span>
                            </span>
                            <span className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() =>
                                  setAlertModal({
                                    groupCode: g.group_code,
                                    def: d,
                                    form: {
                                      description: d.description,
                                      is_flash_alert: d.is_flash_alert,
                                      blocks_charges: d.blocks_charges,
                                      is_active: d.is_active,
                                    },
                                  })
                                }
                                title="Edit alert"
                                className="p-1 text-[#3A6EA5] hover:text-[#1F3A5F]"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => void removeAlert(d)} title="Delete alert" className="p-1 text-[#64748B] hover:text-[#DC2626]">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Header modal */}
      {headerModal ? (
        <EditorModal
          title={headerModal.id != null ? "Edit Header" : "Add New Header"}
          onClose={() => setHeaderModal(null)}
          onSave={() => void saveHeader()}
          saving={saving}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Header Name</span>
            <input
              autoFocus
              type="text"
              value={headerModal.form.description}
              onChange={(e) => setHeaderModal({ ...headerModal, form: { description: e.target.value } })}
              className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
            />
          </label>
        </EditorModal>
      ) : null}

      {/* Alert modal */}
      {alertModal ? (
        <EditorModal
          title={alertModal.def ? "Edit Alert" : "Add New Alert"}
          onClose={() => setAlertModal(null)}
          onSave={() => void saveAlert()}
          saving={saving}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Header</span>
            <select
              value={alertModal.groupCode}
              onChange={(e) => setAlertModal({ ...alertModal, groupCode: e.target.value })}
              disabled={!!alertModal.def}
              className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white focus:outline-none focus:border-[#3A6EA5] disabled:bg-[#F1F5F9]"
            >
              {groupOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Alert Name</span>
            <input
              autoFocus
              type="text"
              value={alertModal.form.description}
              onChange={(e) => setAlertModal({ ...alertModal, form: { ...alertModal.form, description: e.target.value } })}
              className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
            />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alertModal.form.is_flash_alert}
                onChange={(e) => setAlertModal({ ...alertModal, form: { ...alertModal.form, is_flash_alert: e.target.checked } })}
                className="w-4 h-4 accent-[#3A6EA5]"
              />
              <span className="text-sm font-bold text-[#1F3A5F] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#D97706]" /> Flash Alert
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alertModal.form.blocks_charges}
                onChange={(e) => setAlertModal({ ...alertModal, form: { ...alertModal.form, blocks_charges: e.target.checked } })}
                className="w-4 h-4 accent-[#3A6EA5]"
              />
              <span className="text-sm font-bold text-[#1F3A5F]">Blocks Charges</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alertModal.form.is_active}
                onChange={(e) => setAlertModal({ ...alertModal, form: { ...alertModal.form, is_active: e.target.checked } })}
                className="w-4 h-4 accent-[#3A6EA5]"
              />
              <span className="text-sm font-bold text-[#1F3A5F]">Active</span>
            </label>
          </div>
        </EditorModal>
      ) : null}
    </div>
  );
}
