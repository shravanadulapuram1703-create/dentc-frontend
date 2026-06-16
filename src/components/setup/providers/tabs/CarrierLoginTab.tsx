import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  listProviderCarrierLogins,
  createProviderCarrierLogin,
  updateProviderCarrierLogin,
  deleteProviderCarrierLogin,
} from "@/api/generated/endpoints/provider-setup/provider-setup";
import { listInsuranceCarriers } from "@/api/generated/endpoints/insurance/insurance";
import type { ProviderCarrierLoginRead, InsuranceCarrierRead } from "@/api/generated/model";

interface CarrierLoginTabProps {
  providerId: string;
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

type Draft = {
  id: number | null;
  carrier_id: string;
  portal_name: string;
  portal_url: string;
  username: string;
  password: string; // write-only; left blank keeps the stored secret on edit
  notes: string;
  is_active: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  carrier_id: "",
  portal_name: "",
  portal_url: "",
  username: "",
  password: "",
  notes: "",
  is_active: true,
});

/** Per-provider carrier portal logins. Passwords are write-only (masked on read). */
export default function CarrierLoginTab({ providerId }: CarrierLoginTabProps) {
  const [rows, setRows] = useState<ProviderCarrierLoginRead[]>([]);
  const [carriers, setCarriers] = useState<InsuranceCarrierRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const carrierName = useCallback(
    (id?: number | null) => (id == null ? "—" : carriers.find((c) => c.id === id)?.name ?? `Carrier ${id}`),
    [carriers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loginRes, carrierRes] = await Promise.all([
        listProviderCarrierLogins({ provider_id: providerId }),
        carriers.length ? Promise.resolve({ items: carriers }) : listInsuranceCarriers({ size: 200 }),
      ]);
      setRows(loginRes ?? []);
      if (!carriers.length) setCarriers(carrierRes.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load carrier logins");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (r: ProviderCarrierLoginRead) =>
    setDraft({
      id: r.id,
      carrier_id: r.carrier_id != null ? String(r.carrier_id) : "",
      portal_name: r.portal_name ?? "",
      portal_url: r.portal_url ?? "",
      username: r.username ?? "",
      password: "",
      notes: r.notes ?? "",
      is_active: r.is_active,
    });

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const base = {
        carrier_id: draft.carrier_id ? Number(draft.carrier_id) : null,
        portal_name: draft.portal_name.trim() || null,
        portal_url: draft.portal_url.trim() || null,
        username: draft.username.trim() || null,
        notes: draft.notes.trim() || null,
        is_active: draft.is_active,
        // Only send password when the user typed one (blank keeps the stored secret).
        ...(draft.password ? { password: draft.password } : {}),
      };
      if (draft.id == null) {
        await createProviderCarrierLogin({ provider_id: providerId, ...base });
        toast.success("Carrier login added");
      } else {
        await updateProviderCarrierLogin(draft.id, base);
        toast.success("Carrier login updated");
      }
      setDraft(null);
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: ProviderCarrierLoginRead) => {
    if (!confirm(`Delete carrier login "${r.portal_name ?? carrierName(r.carrier_id)}"?`)) return;
    setBusyId(r.id);
    try {
      await deleteProviderCarrierLogin(r.id);
      toast.success("Carrier login deleted");
      await load();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load carrier logins</p>
        <p className="text-xs text-[#64748B] max-w-md">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Carrier Logins</h3>
          <p className="text-xs text-[#64748B]">Carrier portal credentials. Passwords are encrypted and never shown.</p>
        </div>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Login
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-[#64748B]">
          <Loader2 className="w-7 h-7 animate-spin text-[#3A6EA5]" />
          <span className="text-sm font-bold">Loading carrier logins…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-[#64748B] font-bold">
          No carrier logins for this provider yet.
        </div>
      ) : (
        <div className="overflow-auto border border-[#E2E8F0] rounded-lg">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Carrier / Portal", "URL", "Username", "Password", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                    {r.portal_name || carrierName(r.carrier_id)}
                    {r.portal_name && r.carrier_id != null && (
                      <span className="block text-xs text-[#94A3B8] font-normal">{carrierName(r.carrier_id)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748B] max-w-[220px] truncate">
                    {r.portal_url ? (
                      <a href={r.portal_url} target="_blank" rel="noreferrer" className="text-[#3A6EA5] hover:underline">
                        {r.portal_url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">{r.username || "—"}</td>
                  <td className="px-4 py-3 text-sm text-[#94A3B8] font-mono">{r.password_masked || "••••••"}</td>
                  <td className="px-4 py-3">
                    {r.is_active ? (
                      <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-[#E8EFF7]" title="Edit">
                        <Edit className="w-4 h-4 text-[#3A6EA5]" />
                      </button>
                      <button
                        onClick={() => void handleDelete(r)}
                        disabled={busyId === r.id}
                        className="p-2 rounded-lg hover:bg-[#FEE2E2] disabled:opacity-40"
                        title="Delete"
                      >
                        {busyId === r.id ? (
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

      {/* Add/Edit modal */}
      {draft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between bg-[#3A6EA5] text-white px-6 py-4 rounded-t-lg sticky top-0">
              <h3 className="text-lg font-bold">{draft.id == null ? "Add Carrier Login" : "Edit Carrier Login"}</h3>
              <button onClick={() => setDraft(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">Carrier</label>
                <select value={draft.carrier_id} onChange={(e) => setDraft({ ...draft, carrier_id: e.target.value })} className={inputCls}>
                  <option value="">(None / generic portal)</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">Portal Name</label>
                <input type="text" value={draft.portal_name} onChange={(e) => setDraft({ ...draft, portal_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">Portal URL</label>
                <input type="url" value={draft.portal_url} onChange={(e) => setDraft({ ...draft, portal_url: e.target.value })} placeholder="https://" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">Username</label>
                <input type="text" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className={inputCls} autoComplete="off" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                  Password {draft.id != null && <span className="text-[#94A3B8] font-normal">(blank = unchanged)</span>}
                </label>
                <input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className={inputCls} autoComplete="new-password" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#1E293B] mb-1.5">Notes</label>
                <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} className={inputCls} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="w-4 h-4" />
                Active
              </label>
            </div>
            <div className="bg-[#F7F9FC] px-6 py-4 rounded-b-lg flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setDraft(null)}
                disabled={saving}
                className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-sm hover:bg-[#E8EFF7] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg font-bold text-sm hover:bg-[#1F3A5F] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {draft.id == null ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
