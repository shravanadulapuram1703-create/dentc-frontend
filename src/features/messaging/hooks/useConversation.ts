import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import type {
  Attachment,
  DirectMessage,
  Reaction,
  ReplyRef,
} from "../messagingModel";

const TYPING_IDLE_MS = 2500;
const PEER_TYPING_TTL_MS = 5000;

export interface SendOptions {
  attachments?: Attachment[];
  replyTo?: ReplyRef | null;
  forwardedFrom?: string | null;
}

export interface UseConversationResult {
  messages: DirectMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  peerTyping: boolean;
  loadOlder: () => Promise<void>;
  send: (body: string, opts?: SendOptions) => Promise<void>;
  edit: (messageId: string, body: string) => Promise<void>;
  remove: (messageId: string, forEveryone: boolean) => Promise<void>;
  react: (messageId: string, emoji: string) => Promise<Reaction[]>;
  notifyTyping: () => void;
}

/**
 * Drives a single conversation thread: loads the newest page, subscribes to
 * live transport events for this conversation only, paginates older messages,
 * and exposes send/edit/delete/react + typing. Message state is append-driven
 * from transport events (send() does not double-insert).
 */
export function useConversation(
  conversationId: string | null,
): UseConversationResult {
  const { transport, me } = useChat();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);

  const typingOutRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load newest page + subscribe on conversation change.
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setCursor(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPeerTyping(false);
    transport
      .listMessages(conversationId)
      .then((page) => {
        if (cancelled) return;
        setMessages(page.items);
        setHasMore(page.has_more);
        setCursor(page.cursor);
      })
      .finally(() => !cancelled && setLoading(false));

    const unsub = transport.subscribe((ev) => {
      if ("conversation_id" in ev && ev.conversation_id !== conversationId) return;
      switch (ev.type) {
        case "message:new":
          setMessages((prev) =>
            prev.some((m) => m.id === ev.message.id) ? prev : [...prev, ev.message],
          );
          break;
        case "message:updated":
          setMessages((prev) =>
            prev.map((m) => (m.id === ev.message.id ? ev.message : m)),
          );
          break;
        case "message:deleted":
          setMessages((prev) =>
            ev.for_everyone
              ? prev.map((m) =>
                  m.id === ev.message_id
                    ? { ...m, deleted_for_everyone: true, body: "", attachments: [], reactions: [] }
                    : m,
                )
              : prev.filter((m) => m.id !== ev.message_id),
          );
          break;
        case "message:status":
          setMessages((prev) =>
            prev.map((m) => (m.id === ev.message_id ? { ...m, status: ev.status } : m)),
          );
          break;
        case "receipt:read":
          // Reads are cumulative: everything I sent up to `up_to_message_id`
          // has been seen. A null/unknown id means "all of it".
          setMessages((prev) => {
            const idx = ev.up_to_message_id
              ? prev.findIndex((m) => m.id === ev.up_to_message_id)
              : -1;
            const limit = idx >= 0 ? idx : prev.length - 1;
            return prev.map((m, i) =>
              i <= limit && me && m.sender_id === me.id && m.status !== "read"
                ? { ...m, status: "read" as const }
                : m,
            );
          });
          break;
        case "reaction:updated":
          setMessages((prev) =>
            prev.map((m) => (m.id === ev.message_id ? { ...m, reactions: ev.reactions } : m)),
          );
          break;
        case "typing":
          if (me && ev.user_id !== me.id) {
            if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
            if (ev.is_typing) {
              setPeerTyping(true);
              peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), PEER_TYPING_TTL_MS);
            } else {
              setPeerTyping(false);
            }
          }
          break;
        default:
          break;
      }
    });

    // Entering the thread marks it read.
    transport.markRead(conversationId).catch(() => undefined);

    return () => {
      cancelled = true;
      unsub();
      if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
    };
  }, [conversationId, transport, me]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await transport.listMessages(conversationId, { before: cursor });
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const older = page.items.filter((m) => !seen.has(m.id));
        return [...older, ...prev];
      });
      setHasMore(page.has_more);
      setCursor(page.cursor);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, cursor, hasMore, loadingOlder, transport]);

  const send = useCallback(
    async (body: string, opts?: SendOptions) => {
      if (!conversationId) return;
      const text = body.trim();
      if (!text && !(opts?.attachments?.length)) return;
      // Stop the typing indicator immediately on send.
      if (typingOutRef.current) {
        typingOutRef.current = false;
        transport.setTyping(conversationId, false);
      }
      await transport.sendMessage({
        conversation_id: conversationId,
        body: text,
        attachments: opts?.attachments,
        reply_to: opts?.replyTo ?? null,
        forwarded_from: opts?.forwardedFrom ?? null,
      });
    },
    [conversationId, transport],
  );

  const edit = useCallback(
    async (messageId: string, body: string) => {
      if (!conversationId) return;
      await transport.editMessage(conversationId, messageId, body.trim());
    },
    [conversationId, transport],
  );

  const remove = useCallback(
    async (messageId: string, forEveryone: boolean) => {
      if (!conversationId) return;
      await transport.deleteMessage(conversationId, messageId, forEveryone);
    },
    [conversationId, transport],
  );

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId) return [];
      return transport.toggleReaction(conversationId, messageId, emoji);
    },
    [conversationId, transport],
  );

  const notifyTyping = useCallback(() => {
    if (!conversationId) return;
    if (!typingOutRef.current) {
      typingOutRef.current = true;
      transport.setTyping(conversationId, true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingOutRef.current = false;
      transport.setTyping(conversationId, false);
    }, TYPING_IDLE_MS);
  }, [conversationId, transport]);

  // Cleanup typing on unmount.
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (conversationId && typingOutRef.current) {
        transport.setTyping(conversationId, false);
      }
    };
  }, [conversationId, transport]);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    peerTyping,
    loadOlder,
    send,
    edit,
    remove,
    react,
    notifyTyping,
  };
}
