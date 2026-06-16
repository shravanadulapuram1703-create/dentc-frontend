import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Link2, Unlink, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { listUsers } from "@/api/generated/endpoints/users/users";
import {
  getProviderUser,
  setProviderUser,
} from "@/api/generated/endpoints/provider-setup/provider-setup";
import type { UserRead } from "@/api/generated/model";

interface UserTabProps {
  providerId: string;
}

const userLabel = (u: UserRead) => {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name ? `${name} (${u.username})` : u.username;
};

/**
 * Provider ↔ user-account link. Permissions themselves live on the user account
 * (Security → Users); this tab just associates a provider with a login.
 */
export default function UserTab({ providerId }: UserTabProps) {
  const [linkedUser, setLinkedUser] = useState<UserRead | null>(null);
  const [users, setUsers] = useState<UserRead[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [linked, usersRes] = await Promise.all([
        getProviderUser(providerId),
        listUsers({ size: 200, sort: "username", order: "asc" }),
      ]);
      setLinkedUser(linked ?? null);
      setSelectedId(linked?.id != null ? String(linked.id) : "");
      setUsers(usersRes.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load user link");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => selectedId !== (linkedUser?.id != null ? String(linkedUser.id) : ""),
    [selectedId, linkedUser],
  );

  const saveLink = async (userId: number | null) => {
    setSaving(true);
    try {
      const updated = await setProviderUser(providerId, { user_id: userId });
      setLinkedUser(updated ?? null);
      setSelectedId(updated?.id != null ? String(updated.id) : "");
      toast.success(userId == null ? "User unlinked" : "User linked");
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load user link</p>
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading user link…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">User Account &amp; Permissions</h3>
        <p className="text-xs text-[#64748B]">Associate this provider with a login account.</p>
      </div>

      {/* Linked user card */}
      <div className="border-2 border-[#E2E8F0] rounded-lg p-4 flex items-start gap-3">
        <UserCircle className="w-10 h-10 text-[#3A6EA5] shrink-0" />
        <div className="min-w-0">
          {linkedUser ? (
            <>
              <p className="text-sm font-bold text-[#1E293B]">{userLabel(linkedUser)}</p>
              <p className="text-xs text-[#64748B]">{linkedUser.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-[#E8EFF7] text-[#1F3A5F] font-bold">Role: {linkedUser.role}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    linkedUser.is_active ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#FEE2E2] text-[#DC2626]"
                  }`}
                >
                  {linkedUser.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#64748B] font-bold">No user account linked to this provider.</p>
          )}
        </div>
      </div>

      {/* Link picker */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Link to user</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
          >
            <option value="">(Not linked)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => void saveLink(selectedId ? Number(selectedId) : null)}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Save Link
        </button>
        {linkedUser && (
          <button
            onClick={() => void saveLink(null)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#DC2626] text-[#DC2626] rounded-lg text-sm font-bold hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
          >
            <Unlink className="w-4 h-4" />
            Unlink
          </button>
        )}
      </div>

      {/* Permissions pointer */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#E8EFF7] border border-[#B8D4EA] rounded-lg">
        <ShieldCheck className="w-4 h-4 text-[#3A6EA5] mt-0.5 shrink-0" />
        <p className="text-xs text-[#1F3A5F]">
          Permissions (role, office access, scheduler/clinical/financial/reporting access) are managed on
          the linked user account under <strong>Security → Users</strong>. Linking a provider here grants
          that user provider-level access in the scheduler and clinical modules.
        </p>
      </div>
    </div>
  );
}
