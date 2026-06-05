import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Search, Plus, Save, X, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../styles/theme";
import { useAuth } from "../../../contexts/AuthContext";
import {
  listUserPreferences,
  createUserPreference,
  updateUserPreference,
  deleteUserPreference,
} from "@/api/generated/endpoints/staff/staff";
import type { UserPreferenceRead } from "@/api/generated/model";

// ========================================
// My Settings — current user's key/value preferences.
// Backed by /api/v1/user-preferences (filtered by user_id).
// See docs/setup/security/SECURITY_INTEGRATION.md.
// ========================================

const labelCls = "block text-xs font-bold text-[#1E293B] mb-2";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

export default function MySettings() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;
  const hasUser = userId != null && Number.isFinite(userId);

  const [prefs, setPrefs] = useState<UserPreferenceRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // null = closed; { id: null } = add; { id } = edit
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const [prefKey, setPrefKey] = useState("");
  const [prefValue, setPrefValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPrefs = useCallback(async () => {
    if (!hasUser || userId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listUserPreferences({ user_id: userId, size: 200, sort: "pref_key", order: "asc" });
      setPrefs(res.items ?? []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load settings";
      setLoadError(msg);
      setPrefs([]);
    } finally {
      setLoading(false);
    }
  }, [hasUser, userId]);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return prefs;
    return prefs.filter(
      (p) => p.pref_key.toLowerCase().includes(q) || (p.pref_value ?? "").toLowerCase().includes(q)
    );
  }, [prefs, searchQuery]);

  const openAdd = () => {
    setPrefKey("");
    setPrefValue("");
    setEditing({ id: null });
  };

  const openEdit = (p: UserPreferenceRead) => {
    setPrefKey(p.pref_key);
    setPrefValue(p.pref_value ?? "");
    setEditing({ id: p.id });
  };

  const closeModal = () => {
    if (saving) return;
    setEditing(null);
  };

  const handleSave = async () => {
    if (userId == null) return;
    if (!prefKey.trim()) {
      toast.error("Validation Failed", { description: "Setting key is required" });
      return;
    }
    setSaving(true);
    try {
      if (editing?.id == null) {
        await createUserPreference({
          user_id: userId,
          pref_key: prefKey.trim(),
          pref_value: prefValue,
        });
        toast.success("Setting added");
      } else {
        await updateUserPreference(editing.id, { pref_value: prefValue });
        toast.success("Setting updated");
      }
      setEditing(null);
      await loadPrefs();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Save failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: UserPreferenceRead) => {
    if (!confirm(`Delete setting "${p.pref_key}"?`)) return;
    setDeletingId(p.id);
    try {
      await deleteUserPreference(p.id);
      toast.success("Setting deleted");
      await loadPrefs();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Delete failed";
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeletingId(null);
    }
  };

  if (!hasUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <p className="text-sm font-bold text-[#64748B]">Sign in to manage your settings.</p>
      </div>
    );
  }

  const isAdding = editing?.id == null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1100px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">My Settings</h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Personal preferences for {user?.email}
                  </p>
                </div>
              </div>
              <button onClick={openAdd} className={components.buttonPrimary + " inline-flex items-center gap-2"}>
                <Plus className="w-4 h-4" />
                Add Setting
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              />
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
              <span className="text-sm font-bold">Loading settings…</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm font-bold text-[#DC2626]">Unable to load settings</p>
              <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
              <button onClick={() => void loadPrefs()} className={components.buttonOutline + " mt-2"}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Settings className="w-12 h-12 text-[#CBD5E1]" />
              <p className="text-[#64748B] font-bold text-sm">
                {prefs.length === 0 ? "No settings yet" : "No settings match your search"}
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F7F9FC] transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">{p.pref_key}</td>
                      <td className="px-4 py-3 text-sm text-[#64748B] break-all">{p.pref_value || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4 text-[#3A6EA5]" />
                          </button>
                          <button
                            onClick={() => void handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-[#DC2626]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between border-b-2 border-[#E2E8F0] p-4">
              <h2 className="text-lg font-bold text-[#1F3A5F]">{isAdding ? "Add Setting" : "Edit Setting"}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>
                  Key <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={prefKey}
                  onChange={(e) => setPrefKey(e.target.value)}
                  disabled={!isAdding}
                  placeholder="e.g., default_landing_page"
                  className={isAdding ? inputCls : inputCls + " bg-[#F7F9FC] text-[#64748B] cursor-not-allowed"}
                  autoFocus={isAdding}
                />
                {!isAdding && <p className="text-xs text-[#64748B] mt-1">Key is immutable; edit the value only.</p>}
              </div>
              <div>
                <label className={labelCls}>Value</label>
                <input
                  type="text"
                  value={prefValue}
                  onChange={(e) => setPrefValue(e.target.value)}
                  placeholder="Value"
                  className={inputCls}
                  autoFocus={!isAdding}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] p-4 bg-[#F7F9FC]">
              <button onClick={closeModal} disabled={saving} className={components.buttonOutline + " inline-flex items-center gap-2 disabled:opacity-50"}>
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className={components.buttonPrimary + " inline-flex items-center gap-2 disabled:opacity-50"}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAdding ? "Add Setting" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
