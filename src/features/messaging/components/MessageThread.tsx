import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, MessagesSquare } from "lucide-react";
import type { Attachment, ChatUser, DirectMessage } from "../messagingModel";
import { isDifferentDay } from "../lib/time";
import MessageBubble from "./MessageBubble";
import DateSeparator from "./DateSeparator";
import TypingIndicator from "./TypingIndicator";

interface MessageThreadProps {
  messages: DirectMessage[];
  meId: string;
  peer: ChatUser;
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  peerTyping: boolean;
  loadOlder: () => void;
  selecting: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onReply: (m: DirectMessage) => void;
  onForward: (m: DirectMessage) => void;
  onReact: (id: string, emoji: string) => void;
  onEdit: (m: DirectMessage) => void;
  onDelete: (m: DirectMessage, forEveryone: boolean) => void;
  onOpenImage: (a: Attachment) => void;
}

export default function MessageThread(props: MessageThreadProps) {
  const {
    messages,
    meId,
    peer,
    loading,
    loadingOlder,
    hasMore,
    peerTyping,
    loadOlder,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [nearBottom, setNearBottom] = useState(true);

  // Preserve scroll position when older messages are prepended.
  const restoreRef = useRef<number | null>(null);
  const prevFirstId = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreRef.current != null) {
      el.scrollTop = el.scrollHeight - restoreRef.current;
      restoreRef.current = null;
    }
  }, [messages]);

  // Auto-scroll to the newest message when the user is already at the bottom.
  useEffect(() => {
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, peerTyping]);

  // Jump to bottom on first load / conversation switch.
  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
      setNearBottom(true);
    }
  }, [loading, peer.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setNearBottom(distanceFromBottom < 120);
    if (el.scrollTop < 64 && hasMore && !loadingOlder) {
      restoreRef.current = el.scrollHeight - el.scrollTop;
      prevFirstId.current = messages[0]?.id ?? null;
      loadOlder();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC]">
        <Loader2 className="w-6 h-6 text-[#3A6EA5] animate-spin" />
      </div>
    );
  }

  if (messages.length === 0 && !peerTyping) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F9FC] px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#EAF1F8] flex items-center justify-center mb-3">
          <MessagesSquare className="w-7 h-7 text-[#3A6EA5]" />
        </div>
        <p className="text-sm font-semibold text-[#1E293B]">No messages yet</p>
        <p className="text-sm text-[#64748B] mt-1 max-w-xs">
          Say hello to {peer.name.split(" ")[0]} — your conversation will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto bg-[#F7F9FC] px-3 py-3 space-y-1"
    >
      {loadingOlder && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 text-[#3A6EA5] animate-spin" />
        </div>
      )}
      {!hasMore && messages.length > 0 && (
        <p className="text-center text-[11px] text-[#94A3B8] py-1">Beginning of conversation</p>
      )}

      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const dayBreak = !prev || isDifferentDay(prev.created_at, m.created_at);
        // Show the peer avatar at the end of a consecutive incoming run.
        const isLastOfIncomingGroup =
          m.sender_id !== meId &&
          (!next || next.sender_id !== m.sender_id || isDifferentDay(m.created_at, next.created_at));
        return (
          <div key={m.id}>
            {dayBreak && <DateSeparator iso={m.created_at} />}
            <div className="py-0.5">
              <MessageBubble
                message={m}
                meId={meId}
                peer={peer}
                showAvatarSpace={isLastOfIncomingGroup}
                selecting={props.selecting}
                selected={props.selectedIds.has(m.id)}
                onToggleSelect={props.onToggleSelect}
                onReply={props.onReply}
                onForward={props.onForward}
                onReact={props.onReact}
                onEdit={props.onEdit}
                onDelete={props.onDelete}
                onOpenImage={props.onOpenImage}
              />
            </div>
          </div>
        );
      })}

      {peerTyping && (
        <div className="py-0.5 pl-1">
          <TypingIndicator peer={peer} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
