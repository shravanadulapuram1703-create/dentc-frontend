import { useMemo, useState } from "react";
import { Search, Plus, Copy, Edit, Trash2, Shield, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUserGroups,
  deleteUserGroup,
} from "../../../../api/generated/endpoints/staff/staff";
import {
  useGetUserGroupRights,
  useListPermissions,
  copyUserGroup,
  getGetUserGroupRightsQueryKey,
} from "../../../../api/generated/endpoints/security/security";
import type { UserGroupRead } from "../../../../api/generated/model/userGroupRead";
import AddEditGroupModal from "./AddEditGroupModal";

export default function GroupSetup() {
  const queryClient = useQueryClient();
  // Backend DELETE /user-groups/{id} is a SOFT delete (sets is_active=false) and
  // the list endpoint does not exclude soft-deleted rows, so an unfiltered list
  // re-renders the just-deleted group and Delete looks like a no-op. Ask for
  // active groups only (same guard AddEditUserModal's group picker already uses).
  const groupsQ = useListUserGroups({ size: 200, is_active: true });
  const groups: UserGroupRead[] = useMemo(
    () => groupsQ.data?.items ?? [],
    [groupsQ.data],
  );

  // Global rights catalog — used to resolve right codes to display labels.
  const permsQ = useListPermissions({ query: { staleTime: 5 * 60_000 } });
  const labelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of permsQ.data ?? []) m.set(p.code, p.label);
    return m;
  }, [permsQ.data]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroupRead | null>(null);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter(
        (g) =>
          !q ||
          g.name.toLowerCase().includes(q) ||
          String(g.id).includes(q),
      )
      .sort((a, b) =>
        sortBy === "name"
          ? a.name.localeCompare(b.name)
          : a.id - b.id,
      );
  }, [groups, search, sortBy]);

  const selectedGroup = groups.find((g) => g.id === selectedId) ?? null;

  // Live-fetch the selected group's rights from the backend (KAN-15).
  // groupId=0 placeholder is safe because the query is disabled when no
  // selection — React Query won't fire the request.
  const rightsQ = useGetUserGroupRights(selectedId ?? 0, {
    query: { enabled: selectedId != null },
  });
  const selectedRights = useMemo(() => {
    const codes = rightsQ.data ?? [];
    return codes
      .map((code) => labelByCode.get(code) ?? code)
      .sort((a, b) => a.localeCompare(b));
  }, [rightsQ.data, labelByCode]);

  const openAdd = () => {
    setEditingGroup(null);
    setShowModal(true);
  };

  const openEdit = () => {
    if (!selectedGroup) return;
    setEditingGroup(selectedGroup);
    setShowModal(true);
  };

  const handleCopy = async () => {
    if (!selectedGroup) return;
    try {
      // Backend copies the group AND its rights in one transaction.
      const created = await copyUserGroup(selectedGroup.id);
      await groupsQ.refetch();
      setSelectedId(created.id);
      // New group id → its own rights query auto-fires; nothing to invalidate.
    } catch (e: any) {
      const detail = e?.response?.data?.error?.message || e?.response?.data?.detail;
      alert(detail || "Failed to copy group.");
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    if (!confirm(`Delete user group "${selectedGroup.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteUserGroup(selectedGroup.id);
      await groupsQ.refetch();
      setSelectedId(null);
    } catch (e: any) {
      const detail = e?.response?.data?.error?.message || e?.response?.data?.detail;
      alert(detail || "Failed to delete group.");
    }
  };

  const handleSaved = async (groupId: number) => {
    setShowModal(false);
    setEditingGroup(null);
    await groupsQ.refetch();
    setSelectedId(groupId);
    // Ensure the rights panel reflects the just-saved set even if the user
    // saved the group that was already selected (id unchanged → no auto-refetch).
    queryClient.invalidateQueries({ queryKey: getGetUserGroupRightsQueryKey(groupId) });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-[1800px] p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: groups list */}
          <div className="col-span-12 lg:col-span-4">
            <div className="overflow-hidden rounded-lg border-2 border-[#E2E8F0] bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-3">
                <h2 className="text-sm font-bold text-white">GROUPS</h2>
              </div>

              <div className="space-y-3 border-b-2 border-[#E2E8F0] bg-[#F7F9FC] p-3">
                {/* Sort by */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#1F3A5F]">Sort By:</label>
                  <div className="flex gap-4">
                    {(["name", "id"] as const).map((key) => (
                      <label key={key} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name="groupSort"
                          checked={sortBy === key}
                          onChange={() => setSortBy(key)}
                          className="h-3.5 w-3.5 text-[#3A6EA5]"
                        />
                        <span className="text-xs text-[#1E293B]">
                          {key === "name" ? "Group Name" : "Group ID"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search groups…"
                    className="w-full rounded-lg border-2 border-[#E2E8F0] py-1.5 pl-10 pr-3 text-sm focus:border-[#3A6EA5] focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]/20"
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-[560px] overflow-y-auto">
                {groupsQ.isLoading ? (
                  <div className="p-8 text-center text-sm text-[#64748B]">Loading groups…</div>
                ) : filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#64748B]">No groups found</div>
                ) : (
                  filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedId(g.id)}
                      className={`flex w-full items-center justify-between border-b border-[#E2E8F0] px-4 py-3 text-left transition-colors ${
                        selectedId === g.id
                          ? "border-l-4 border-l-[#3A6EA5] bg-[#E8EFF7]"
                          : "hover:bg-[#F7F9FC]"
                      }`}
                    >
                      <span className="font-bold text-[#1E293B]">{g.name}</span>
                      <span className="text-xs font-bold text-[#64748B]">({g.id})</span>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
                <button
                  onClick={openAdd}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#16A34A]"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Right: rights of selected group */}
          <div className="col-span-12 lg:col-span-8">
            {selectedGroup ? (
              <div className="overflow-hidden rounded-lg border-2 border-[#E2E8F0] bg-white shadow-sm">
                <div className="flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-3 text-white">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                    This group has the following rights
                  </h2>
                  <span className="text-xs text-[#E2E8F0]">
                    {selectedGroup.name} ({selectedGroup.id})
                  </span>
                </div>

                <div className="max-h-[560px] overflow-y-auto divide-y divide-[#F1F5F9]">
                  {rightsQ.isLoading || permsQ.isLoading ? (
                    <div className="py-16 text-center text-sm text-[#64748B]">
                      Loading assigned rights…
                    </div>
                  ) : selectedRights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Shield className="mb-2 h-10 w-10 text-[#CBD5E1]" />
                      <p className="text-sm font-bold text-[#64748B]">No rights assigned yet</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">
                        Use Edit User Group to assign access rights.
                      </p>
                    </div>
                  ) : (
                    selectedRights.map((label) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F7F9FC]"
                      >
                        <ShieldCheck className="h-4 w-4 shrink-0 text-[#22C55E]" />
                        {label}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t-2 border-[#E2E8F0] bg-[#F7F9FC] p-4">
                  <button
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#64748B] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#475569]"
                  >
                    <Copy className="h-4 w-4" />
                    Copy User Group
                  </button>
                  <button
                    onClick={openEdit}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#3A6EA5] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2d5080]"
                  >
                    <Edit className="h-4 w-4" />
                    Edit User Group
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#DC2626]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User Group
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
                <Shield className="mx-auto mb-4 h-16 w-16 text-[#CBD5E1]" />
                <p className="text-lg text-[#64748B]">
                  Select a group to view its access rights
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddEditGroupModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingGroup(null);
          }}
          editingGroup={editingGroup}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
