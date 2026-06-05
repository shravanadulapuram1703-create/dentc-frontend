import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, AlertCircle, Loader2, Save, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../../../styles/theme";
import DualListPicker, { type DualListItem } from "../../DualListPicker";
import {
  loadOfficeUserAssignment,
  saveOfficeUserAssignment,
  copyOfficeUsers,
  type OfficeUserAssignment,
} from "../../../../../services/officeUserAssignmentApi";
import type { OfficeRead, UserRead } from "@/api/generated/model";

type ActiveFilter = "active" | "inactive" | "all";

type UsersAssignmentTabProps = {
  /** The office whose user assignments are being edited. */
  officeId: number;
  /** All offices (for the "Copy Users From" dropdown). */
  offices: OfficeRead[];
};

/** Display name for a user row: "First Last" falling back to the username. */
function userName(u: UserRead): string {
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.username;
}

function activeBadge(isActive: boolean) {
  return isActive ? (
    <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#059669] text-[10px] font-bold rounded">Active</span>
  ) : (
    <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-[10px] font-bold rounded">Inactive</span>
  );
}

/**
 * Office Assignment → Users tab. Reproduces the legacy "Available Users ↔ Assigned
 * Users" picker with an Active/Inactive/All filter and a "Copy Users From" dropdown.
 *
 * Backed by the dedicated office-user endpoints (gap #27): the assigned set is read
 * denormalized (`GET /offices/{id}/users`), Save is a single atomic bulk reconcile
 * (`PUT … { user_ids }`), and Copy is a server-side union (`POST …/copy-from/{src}`)
 * that persists immediately. No client-side diffing/join/emulation.
 */
export default function UsersAssignmentTab({ officeId, offices }: UsersAssignmentTabProps) {
  const [snapshot, setSnapshot] = useState<OfficeUserAssignment | null>(null);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [copyFromId, setCopyFromId] = useState<string>("");
  const [copying, setCopying] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await loadOfficeUserAssignment(officeId);
      setSnapshot(data);
      setAssignedIds(new Set(data.assigned_user_ids));
      setDirty(false);
    } catch (e: unknown) {
      setLoadError(messageOf(e, "Failed to load user assignments"));
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const usersById = useMemo(() => {
    const m = new Map<number, UserRead>();
    snapshot?.users.forEach((u) => m.set(u.id, u));
    return m;
  }, [snapshot]);

  const toItem = useCallback(
    (u: UserRead): DualListItem => ({
      id: String(u.id),
      primary: userName(u),
      secondary: `@${u.username} · ${u.role}`,
      meta: activeBadge(u.is_active),
    }),
    [],
  );

  // Available pane: users not yet assigned, narrowed by the Active/Inactive/All filter.
  const available = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.users
      .filter((u) => !assignedIds.has(u.id))
      .filter((u) =>
        activeFilter === "all" ? true : activeFilter === "active" ? u.is_active : !u.is_active,
      )
      .map(toItem);
  }, [snapshot, assignedIds, activeFilter, toItem]);

  // Assigned pane: every assigned user (no Active filter).
  const assigned = useMemo(() => {
    return Array.from(assignedIds)
      .map((id) => usersById.get(id))
      .filter((u): u is UserRead => Boolean(u))
      .map(toItem);
  }, [assignedIds, usersById, toItem]);

  const handleChange = (ids: string[]) => {
    setAssignedIds(new Set(ids.map(Number)));
    setDirty(true);
  };

  const handleCopyFrom = async () => {
    const sourceId = Number(copyFromId);
    if (!sourceId) return;
    setCopying(true);
    try {
      // Server-side copy persists the union immediately and returns the new set.
      const newIds = await copyOfficeUsers(officeId, sourceId);
      setAssignedIds(new Set(newIds));
      setDirty(false);
      const sourceName = offices.find((o) => o.id === sourceId)?.name ?? `office ${sourceId}`;
      toast.success("Users copied", {
        description: `Copied users from ${sourceName} into this office (${newIds.length} now assigned).`,
      });
    } catch (e: unknown) {
      toast.error("Copy failed", { description: messageOf(e, "Could not copy users") });
    } finally {
      setCopying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newIds = await saveOfficeUserAssignment(officeId, Array.from(assignedIds));
      setAssignedIds(new Set(newIds));
      setDirty(false);
      toast.success("User assignments saved", { description: `${newIds.length} user(s) assigned.` });
    } catch (e: unknown) {
      toast.error("Save failed", { description: messageOf(e, "Request failed") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading user assignments…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-[#DC2626]" />
        <p className="text-sm font-bold text-[#1E293B]">Could not load user assignments</p>
        <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
        <button onClick={() => void reload()} className={components.buttonOutline + " inline-flex items-center gap-2 mt-2"}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const otherOffices = offices.filter((o) => o.id !== officeId);
  const activeCount = snapshot
    ? Array.from(assignedIds).filter((id) => usersById.get(id)?.is_active).length
    : 0;

  return (
    <div className="space-y-5 relative">
      {(saving || copying) && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1F3A5F] mb-1">
          <Users className="w-5 h-5 text-[#3A6EA5]" />
          Assigned Users
        </h3>
        <p className="text-xs text-[#64748B]">
          Remove the users from “Assigned Users” whom you do not want to give access to this office.
        </p>
      </div>

      {/* Toolbar: Copy From + Active filter */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 bg-[#F7F9FC] border-2 border-[#E2E8F0] rounded-lg p-3">
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1.5">Copy Users From</label>
            <select
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
              disabled={saving || copying}
              className="px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm bg-white focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 min-w-[240px] disabled:bg-[#F7F9FC]"
            >
              <option value="">Please Select</option>
              {otherOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyFrom()}
            disabled={!copyFromId || saving || copying}
            className={`${components.buttonOutline} inline-flex items-center gap-2 text-sm py-2 ${
              !copyFromId || saving || copying ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            Copy
          </button>
        </div>

        <div>
          <span className="block text-xs font-bold text-[#1E293B] mb-1.5">Show Available</span>
          <div className="flex items-center gap-4 text-sm">
            {(["active", "inactive", "all"] as ActiveFilter[]).map((f) => (
              <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="userActiveFilter"
                  checked={activeFilter === f}
                  onChange={() => setActiveFilter(f)}
                  className="w-4 h-4 text-[#3A6EA5] border-2 border-[#CBD5E1] focus:ring-2 focus:ring-[#3A6EA5]/20"
                />
                <span className="font-bold text-[#1E293B] capitalize">{f}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <DualListPicker
        available={available}
        assigned={assigned}
        onChange={handleChange}
        disabled={saving || copying}
        leftTitle="Available Users"
        rightTitle="Assigned Users"
        emptyAvailableLabel="No available users"
        emptyAssignedLabel="No users assigned"
      />
      <p className="text-xs text-[#94A3B8] text-center">
        Click to select · Ctrl/Cmd-click to multi-select · double-click a row to move it · Copy applies immediately
      </p>

      <div className="flex items-center justify-between border-t-2 border-[#E2E8F0] pt-4">
        <p className="text-xs text-[#64748B] font-bold">
          {assignedIds.size} user(s) assigned{" "}
          <span className="text-[#94A3B8]">({activeCount} active)</span>
          {dirty && <span className="ml-2 text-[#DC2626]">• unsaved changes</span>}
        </p>
        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${!dirty || saving ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Save className="w-4 h-4" />
          Save User Assignments
        </button>
      </div>
    </div>
  );
}

function messageOf(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const err = e as { response?: { data?: { detail?: string } }; message?: string };
    return err.response?.data?.detail || err.message || fallback;
  }
  return fallback;
}
