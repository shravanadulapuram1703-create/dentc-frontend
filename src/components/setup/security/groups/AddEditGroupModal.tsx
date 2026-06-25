import { useEffect, useMemo, useState } from "react";
import { X, Loader2, ShieldCheck, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import DualListPicker, {
  type DualListItem,
} from "../../offices/DualListPicker";
import {
  createUserGroup,
  updateUserGroup,
} from "../../../../api/generated/endpoints/staff/staff";
import {
  getUserGroupRights,
  setUserGroupRights,
  useListPermissions,
  getGetUserGroupRightsQueryKey,
} from "../../../../api/generated/endpoints/security/security";
import type { UserGroupRead } from "../../../../api/generated/model/userGroupRead";

interface AddEditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null → add mode; a group → edit mode. */
  editingGroup: UserGroupRead | null;
  /** Called with the saved group's id after a successful save. */
  onSaved: (groupId: number) => void;
}

export default function AddEditGroupModal({
  isOpen,
  onClose,
  editingGroup,
  onSaved,
}: AddEditGroupModalProps) {
  const mode = editingGroup ? "edit" : "add";
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [assigned, setAssigned] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rightsLoading, setRightsLoading] = useState(false);

  // Rights catalog — drives both pickers and the "Save with Full Access" button.
  // 5-minute staleTime: catalog is global and rarely changes within a session.
  const permsQ = useListPermissions({
    query: { enabled: isOpen, staleTime: 5 * 60_000 },
  });
  const catalog = permsQ.data ?? [];
  const ALL_RIGHT_CODES = useMemo(() => catalog.map((p) => p.code), [catalog]);
  const RIGHT_ITEMS: DualListItem[] = useMemo(
    () => catalog.map((p) => ({ id: p.code, primary: p.label })),
    [catalog],
  );

  // Hydrate on open. In edit mode, load the group's current rights from the
  // backend (GET /user-groups/{id}/rights) so the picker reflects persisted state.
  useEffect(() => {
    if (!isOpen) return;
    if (editingGroup) {
      setName(editingGroup.name ?? "");
      setRightsLoading(true);
      getUserGroupRights(editingGroup.id)
        .then((codes) => setAssigned(codes ?? []))
        .catch((e) => {
          console.error("Failed to load group rights:", e);
          setAssigned([]);
        })
        .finally(() => setRightsLoading(false));
    } else {
      setName("");
      setAssigned([]);
      setRightsLoading(false);
    }
  }, [isOpen, editingGroup]);

  const assignedSet = useMemo(() => new Set(assigned), [assigned]);
  const availableItems = useMemo(
    () => RIGHT_ITEMS.filter((i) => !assignedSet.has(i.id)),
    [RIGHT_ITEMS, assignedSet],
  );
  const assignedItems = useMemo(
    () => RIGHT_ITEMS.filter((i) => assignedSet.has(i.id)),
    [RIGHT_ITEMS, assignedSet],
  );

  const persist = async (rightCodes: string[]) => {
    if (!name.trim()) {
      alert("Group Name is required.");
      return;
    }
    setSaving(true);
    try {
      let groupId: number;
      if (mode === "edit" && editingGroup) {
        await updateUserGroup(editingGroup.id, { name: name.trim() });
        groupId = editingGroup.id;
      } else {
        const created = await createUserGroup({ name: name.trim(), is_active: true });
        groupId = created.id;
      }
      // Persist rights via the backend (KAN-15). PUT replaces the full set.
      await setUserGroupRights(groupId, { right_codes: rightCodes });
      // Refresh any cached rights query for this group so the detail panel updates.
      queryClient.invalidateQueries({ queryKey: getGetUserGroupRightsQueryKey(groupId) });
      onSaved(groupId);
    } catch (e: any) {
      const detail = e?.response?.data?.error?.message || e?.response?.data?.detail;
      alert(detail || "Failed to save group.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[95vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-lg border-2 border-[#E2E8F0] bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[#162942] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] p-4 text-white">
          <h2 className="font-bold">{mode === "edit" ? "EDIT GROUP" : "GROUP SETUP"}</h2>
          <button
            onClick={onClose}
            className="rounded p-2 text-white transition-colors hover:bg-[#162942]"
          >
            <X className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Group name */}
          <div className="max-w-md">
            <label className="mb-1 block text-sm font-bold text-[#1E293B]">
              Group Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Office Manager"
              className="w-full rounded-lg border-2 border-[#E2E8F0] px-3 py-2 focus:border-[#3A6EA5] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]/20"
            />
          </div>

          {/* Access rights */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">
                User Group Access Rights
              </h3>
              <span className="text-xs font-bold text-[#64748B]">
                {assigned.length} of {ALL_RIGHT_CODES.length} assigned
              </span>
            </div>
            {(permsQ.isLoading || rightsLoading) ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E2E8F0] py-12 text-sm text-[#64748B]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {rightsLoading ? "Loading assigned rights…" : "Loading rights catalog…"}
              </div>
            ) : (
              <DualListPicker
                available={availableItems}
                assigned={assignedItems}
                onChange={setAssigned}
                leftTitle="Available Rights"
                rightTitle="Assigned Rights"
                disabled={saving}
                emptyAvailableLabel="All rights assigned"
                emptyAssignedLabel="No rights assigned"
              />
            )}
            <p className="mt-2 text-center text-xs text-[#64748B]">
              Use <span className="font-bold">Ctrl + click</span> to multi-select; double-click a row to move it.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
          <button
            onClick={() => void persist(ALL_RIGHT_CODES)}
            disabled={saving || permsQ.isLoading || rightsLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3A6EA5] px-5 py-2.5 font-bold text-white transition-colors hover:bg-[#2d5080] disabled:opacity-50"
            title="Assign every right and save"
          >
            <ShieldCheck className="h-4 w-4" />
            Save with Full Access
          </button>
          <button
            onClick={() => void persist(assigned)}
            disabled={saving || permsQ.isLoading || rightsLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#22C55E] px-6 py-2.5 font-bold text-white transition-colors hover:bg-[#16A34A] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg bg-[#64748B] px-6 py-2.5 font-bold text-white transition-colors hover:bg-[#475569] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
