import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search, X } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useChat } from "@/contexts/ChatContext";
import { useConversations } from "../hooks/useConversations";
import { useUserDirectory } from "../hooks/useUserDirectory";
import { usePresenceMap } from "../hooks/usePresence";
import ConversationListItem from "./ConversationListItem";
import UserAvatar from "./UserAvatar";
import type { ChatUser, Conversation } from "../messagingModel";

/**
 * The left rail: one search box that searches BOTH your conversations and the
 * whole org directory, your existing conversations (pinned / recent / archived),
 * and an inline "People" list so you can start a chat without a separate
 * "new message" step. Picking a person resumes the existing conversation if one
 * exists, otherwise starts a new one.
 *
 * The directory is paginated — scrolling loads more so every user is reachable,
 * and typing searches the full list server-side (not just what's loaded).
 */
export default function ConversationList({
  activeConversationId,
  onSelect,
  onClose,
}: {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onClose?: () => void;
}) {
  const { isSimulated, conversations, startConversation } = useChat();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const { pinned, direct, archived } = useConversations({ search });
  const directory = useUserDirectory(search);
  const presence = usePresenceMap();

  const searching = search.trim().length > 0;

  // People you don't already have a conversation with (avoid duplicate rows).
  const existingPeerIds = useMemo(
    () => new Set(conversations.map((c) => c.peer.id)),
    [conversations],
  );
  const people = useMemo(
    () => directory.users.filter((u) => !existingPeerIds.has(u.id)),
    [directory.users, existingPeerIds],
  );

  const pickPerson = async (user: ChatUser) => {
    setStartingId(user.id);
    try {
      const id = await startConversation(user);
      onSelect(id);
      setSearch("");
    } finally {
      setStartingId(null);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const hasConversations = pinned.length + direct.length > 0;
  const nothingAtAll = !hasConversations && people.length === 0 && !directory.isLoading;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* header + unified search */}
      <div className="px-3 py-3 border-b border-[#E2E8F0] shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-bold text-[#1E293B]">Messages</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people or conversations"
            className="w-full pl-8 pr-8 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F7F9FC] focus:outline-none focus:bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 transition-colors"
          />
          {searching && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#94A3B8] hover:text-[#64748B]"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isSimulated && (
        <div className="px-3 py-1.5 bg-[#FEF3C7]/70 border-b border-[#FDE68A] text-[11px] text-[#92400E] shrink-0">
          Demo mode — messages are simulated locally (no messaging backend yet).
        </div>
      )}

      {/* single scrolling list: conversations then people */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {pinned.length > 0 && (
          <Section label="Pinned">
            {pinned.map((c) => (
              <Row key={c.id} c={c} active={activeConversationId} onSelect={onSelect} />
            ))}
          </Section>
        )}

        {direct.length > 0 && (
          <Section label={searching ? "Conversations" : pinned.length ? "Recent" : undefined}>
            {direct.map((c) => (
              <Row key={c.id} c={c} active={activeConversationId} onSelect={onSelect} />
            ))}
          </Section>
        )}

        {archived.length > 0 && (
          <div className="border-t border-[#E2E8F0]">
            <button
              onClick={() => setShowArchived((s) => !s)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#64748B] uppercase tracking-wide hover:bg-[#F7F9FC]"
            >
              {showArchived ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Archived ({archived.length})
            </button>
            {showArchived &&
              archived.map((c) => (
                <Row key={c.id} c={c} active={activeConversationId} onSelect={onSelect} />
              ))}
          </div>
        )}

        {/* People — start a new chat inline, no separate dialog */}
        {(people.length > 0 || directory.isLoading) && (
          <div className={cn(hasConversations && "border-t border-[#E2E8F0] mt-1")}>
            <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">
              People{directory.total > 0 && ` (${directory.total})`}
            </p>
            {directory.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#3A6EA5] animate-spin" />
              </div>
            ) : (
              people.map((u) => (
                <PersonRow
                  key={u.id}
                  user={u}
                  presence={presence[u.id]?.status}
                  busy={startingId === u.id}
                  onPick={pickPerson}
                />
              ))
            )}
            {directory.isLoadingMore && (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 text-[#3A6EA5] animate-spin" />
              </div>
            )}
            {directory.hasMore && !directory.isLoadingMore && (
              <button
                onClick={directory.loadMore}
                className="w-full px-3 py-2.5 text-xs font-semibold text-[#3A6EA5] hover:bg-[#F1F5F9] transition-colors"
              >
                Load more people
              </button>
            )}
            {!directory.hasMore && people.length > 8 && (
              <p className="px-3 py-2 text-center text-[11px] text-[#94A3B8]">
                That's everyone ({directory.total}).
              </p>
            )}
          </div>
        )}

        {directory.isError && (
          <p className="px-4 py-3 text-center text-xs text-[#EF4444]">
            Couldn't load the directory.
          </p>
        )}

        {nothingAtAll && (
          <p className="px-6 py-12 text-center text-sm text-[#64748B]">
            {searching ? "No people or conversations match your search." : "No other users found."}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function Row({
  c,
  active,
  onSelect,
}: {
  c: Conversation;
  active: string | null;
  onSelect: (id: string) => void;
}) {
  return <ConversationListItem conversation={c} active={c.id === active} onSelect={onSelect} />;
}

/** A directory person you can start (or resume) a conversation with. */
function PersonRow({
  user,
  presence,
  busy,
  onPick,
}: {
  user: ChatUser;
  presence?: "online" | "away" | "offline";
  busy: boolean;
  onPick: (u: ChatUser) => void;
}) {
  return (
    <button
      onClick={() => onPick(user)}
      disabled={busy}
      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F7F9FC] transition-colors disabled:opacity-60"
    >
      <UserAvatar user={user} size="md" presence={presence} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#1E293B] truncate">{user.name}</span>
        <span className="block text-xs text-[#64748B] truncate">
          <span className="capitalize">{user.role?.replace(/_/g, " ")}</span> · {user.email}
        </span>
      </span>
      {busy && <Loader2 className="w-4 h-4 text-[#3A6EA5] animate-spin shrink-0" />}
    </button>
  );
}
