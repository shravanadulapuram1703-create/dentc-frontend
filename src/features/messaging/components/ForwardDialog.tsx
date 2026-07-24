import { useMemo, useRef, useState } from "react";
import { Search, Forward } from "lucide-react";
import type { ChatUser } from "../messagingModel";
import { useConversations } from "../hooks/useConversations";
import { useUserDirectory } from "../hooks/useUserDirectory";
import { usePresenceMap } from "../hooks/usePresence";
import MessagingDialog from "./MessagingDialog";
import UserAvatar from "./UserAvatar";

/**
 * Pick a person to forward the selected message(s) to. Merges existing
 * conversations with a live directory search, de-duplicated by user id.
 */
export default function ForwardDialog({
  open,
  count,
  onClose,
  onPick,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onPick: (peer: ChatUser) => void;
}) {
  const [search, setSearch] = useState("");
  const { visible } = useConversations();
  const directory = useUserDirectory(search, open);
  const presence = usePresenceMap();
  const scrollRef = useRef<HTMLDivElement>(null);

  const people = useMemo(() => {
    const map = new Map<string, ChatUser>();
    for (const c of visible) map.set(c.peer.id, c.peer);
    for (const u of directory.users) if (!map.has(u.id)) map.set(u.id, u);
    const list = Array.from(map.values());
    const q = search.trim().toLowerCase();
    return q
      ? list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : list;
  }, [visible, directory.users, search]);

  return (
    <MessagingDialog
      open={open}
      onClose={onClose}
      title={`Forward ${count > 1 ? `${count} messages` : "message"}`}
      icon={<Forward className="w-4 h-4 text-[#3A6EA5]" />}
    >
      <div className="p-3 border-b border-[#E2E8F0] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F7F9FC] focus:outline-none focus:bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 transition-colors"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-1.5">
        {people.length === 0 ? (
          <p className="text-center text-sm text-[#64748B] py-10 px-4">No people found</p>
        ) : (
          people.map((u) => (
            <button
              key={u.id}
              onClick={() => onPick(u)}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-[#F1F5F9] text-left transition-colors"
            >
              <UserAvatar user={u} size="sm" presence={presence[u.id]?.status} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#1E293B] truncate">{u.name}</span>
                <span className="block text-xs text-[#64748B] truncate capitalize">
                  {u.role?.replace(/_/g, " ")}
                </span>
              </span>
            </button>
          ))
        )}
        {directory.hasMore && (
          <button
            onClick={directory.loadMore}
            disabled={directory.isLoadingMore}
            className="w-full px-3 py-2.5 text-xs font-semibold text-[#3A6EA5] hover:bg-[#F1F5F9] transition-colors disabled:opacity-60"
          >
            {directory.isLoadingMore ? "Loading…" : "Load more people"}
          </button>
        )}
      </div>
    </MessagingDialog>
  );
}
