import {
  Archive,
  ArchiveRestore,
  Ban,
  CheckSquare,
  ChevronLeft,
  Maximize2,
  Minimize2,
  MoreVertical,
  Phone,
  Pin,
  PinOff,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from "@/contexts/ChatContext";
import type { Conversation } from "../messagingModel";
import { usePresence } from "../hooks/usePresence";
import { formatLastSeen } from "../lib/time";
import UserAvatar from "./UserAvatar";

interface ConversationHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onClose?: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onStartSelect: () => void;
  onDeleted: () => void;
}

export default function ConversationHeader({
  conversation,
  onBack,
  onClose,
  onToggleExpand,
  isExpanded,
  onStartSelect,
  onDeleted,
}: ConversationHeaderProps) {
  const { transport } = useChat();
  const peer = conversation.peer;
  const presence = usePresence(peer.id);

  const subtitle =
    presence.status === "online"
      ? "Online"
      : presence.status === "away"
        ? "Away"
        : formatLastSeen(presence.last_seen);

  const planned = (feature: string) =>
    toast.info(`${feature} is a planned enhancement (see backend requirements).`);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E2E8F0] bg-white">
      {onBack && (
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] lg:hidden" title="Back">
          <ChevronLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
      )}

      <UserAvatar user={peer} size="md" presence={presence.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[#1E293B] truncate">{peer.name}</h3>
          {conversation.pinned && <Pin className="w-3 h-3 text-[#94A3B8]" />}
          {conversation.muted && <VolumeX className="w-3 h-3 text-[#94A3B8]" />}
        </div>
        <p className="text-xs text-[#64748B] truncate capitalize">
          {peer.role?.replace(/_/g, " ")} · {subtitle}
        </p>
      </div>

      <button onClick={() => planned("Voice calling")} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] hidden sm:inline-flex" title="Voice call">
        <Phone className="w-4 h-4 text-[#64748B]" />
      </button>
      <button onClick={() => planned("Video calling")} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] hidden sm:inline-flex" title="Video call">
        <Video className="w-4 h-4 text-[#64748B]" />
      </button>

      {onToggleExpand && (
        <button onClick={onToggleExpand} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] hidden lg:inline-flex" title={isExpanded ? "Restore" : "Expand"}>
          {isExpanded ? <Minimize2 className="w-4 h-4 text-[#64748B]" /> : <Maximize2 className="w-4 h-4 text-[#64748B]" />}
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-lg hover:bg-[#F1F5F9]" title="Conversation options">
            <MoreVertical className="w-5 h-5 text-[#64748B]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => transport.setPinned(conversation.id, !conversation.pinned)}>
            {conversation.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
            {conversation.pinned ? "Unpin" : "Pin"} conversation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transport.setMuted(conversation.id, !conversation.muted)}>
            {conversation.muted ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            {conversation.muted ? "Unmute" : "Mute"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStartSelect}>
            <CheckSquare className="w-4 h-4 mr-2" /> Select messages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transport.setArchived(conversation.id, !conversation.archived)}>
            {conversation.archived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            {conversation.archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              transport.setBlocked(conversation.id, !conversation.blocked);
              toast[conversation.blocked ? "success" : "warning"](
                conversation.blocked ? `Unblocked ${peer.name}` : `Blocked ${peer.name}`,
              );
            }}
            className="text-[#B45309] focus:text-[#B45309]"
          >
            <Ban className="w-4 h-4 mr-2" /> {conversation.blocked ? "Unblock" : "Block"} user
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              transport.deleteConversation(conversation.id);
              onDeleted();
              toast.success("Conversation deleted");
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onClose && (
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9]" title="Close">
          <X className="w-5 h-5 text-[#64748B]" />
        </button>
      )}
    </div>
  );
}
