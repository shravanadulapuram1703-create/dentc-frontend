import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  VolumeX,
  Volume2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { useChat } from "@/contexts/ChatContext";
import type { Conversation } from "../messagingModel";
import { messagePreview } from "../messagingModel";
import { usePresence } from "../hooks/usePresence";
import { formatListStamp } from "../lib/time";
import UserAvatar from "./UserAvatar";

/** One row in the conversation list rail. */
export default function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const { transport, me } = useChat();
  const presence = usePresence(conversation.peer.id);
  const last = conversation.last_message;
  const unread = conversation.unread_count;
  const outgoingLast = last && me && last.sender_id === me.id;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer border-l-2 transition-colors",
        active
          ? "bg-[#EAF1F8] border-[#3A6EA5]"
          : "border-transparent hover:bg-[#F7F9FC]",
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <UserAvatar user={conversation.peer} size="md" presence={presence.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="flex-1 min-w-0 flex items-center gap-1">
            <span className={cn("truncate text-sm", unread ? "font-bold text-[#1E293B]" : "font-semibold text-[#1E293B]")}>
              {conversation.peer.name}
            </span>
            {conversation.pinned && <Pin className="w-3 h-3 text-[#94A3B8] flex-shrink-0" />}
            {conversation.muted && <VolumeX className="w-3 h-3 text-[#94A3B8] flex-shrink-0" />}
          </span>
          <span className="text-[11px] text-[#94A3B8] flex-shrink-0">
            {formatListStamp(conversation.updated_at)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <p className={cn("flex-1 min-w-0 truncate text-xs", unread ? "text-[#334155] font-medium" : "text-[#64748B]")}>
            {outgoingLast && <span className="text-[#94A3B8]">You: </span>}
            {messagePreview(last) || <span className="italic text-[#94A3B8]">No messages yet</span>}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#3A6EA5] text-white text-[11px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>

      {/* row actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button
            className="absolute right-2 top-2 p-1 rounded-md bg-white/90 border border-[#E2E8F0] opacity-0 group-hover:opacity-100 transition-opacity"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4 text-[#64748B]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => transport.setPinned(conversation.id, !conversation.pinned)}>
            {conversation.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
            {conversation.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transport.setMuted(conversation.id, !conversation.muted)}>
            {conversation.muted ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            {conversation.muted ? "Unmute" : "Mute"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transport.setArchived(conversation.id, !conversation.archived)}>
            {conversation.archived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            {conversation.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => transport.deleteConversation(conversation.id)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
