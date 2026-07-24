import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import {
  conversationIdFor,
  messagePreview,
  selfChatUser,
  type ChatUser,
  type Conversation,
  type DirectMessage,
  type PresenceInfo,
} from "@/features/messaging/messagingModel";
import {
  getMessagingTransport,
} from "@/features/messaging/messagingService";
import type { MessagingTransport } from "@/features/messaging/transport/types";
import {
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  type MessagingPrefs,
} from "@/features/messaging/lib/messagingStorage";

/**
 * ChatContext — the hub for the user-to-user Direct Messaging module (replaces
 * the old AIChatContext). Owns the transport lifecycle, the shared conversation
 * list + presence map, the floating-panel UI state, and new-message
 * notifications. Both the slide-in panel and the full-page /messages route read
 * from here so they stay in sync.
 */
interface ChatContextValue {
  me: ChatUser | null;
  ready: boolean;
  isSimulated: boolean;
  transport: MessagingTransport;

  // Panel UI state
  isOpen: boolean;
  isExpanded: boolean;
  /** Kept for legacy layout consumers (GlobalNav/AppContent). The panel overlays,
   *  so this stays 0 and never squishes page content. */
  chatWidth: number;
  activeConversationId: string | null;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleExpanded: () => void;
  setActiveConversation: (id: string | null) => void;

  // Shared data
  conversations: Conversation[];
  presence: Record<string, PresenceInfo>;
  unreadTotal: number;

  // Actions
  startConversation: (peer: ChatUser) => Promise<string>;
  refresh: () => Promise<void>;

  // Preferences
  prefs: MessagingPrefs;
  updatePrefs: (patch: Partial<MessagingPrefs>) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const transport = getMessagingTransport();

  const me: ChatUser | null = useMemo(
    () =>
      user
        ? selfChatUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          })
        : null,
    [user],
  );

  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceInfo>>({});
  const [prefs, setPrefs] = useState<MessagingPrefs>(DEFAULT_PREFS);

  // Panel UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Refs so the (stable) event handler always sees current UI state.
  const isOpenRef = useRef(isOpen);
  const activeRef = useRef(activeConversationId);
  const prefsRef = useRef(prefs);
  useEffect(() => void (isOpenRef.current = isOpen), [isOpen]);
  useEffect(() => void (activeRef.current = activeConversationId), [activeConversationId]);
  useEffect(() => void (prefsRef.current = prefs), [prefs]);

  const upsertConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const rest = prev.filter((c) => c.id !== conv.id);
      const next = [conv, ...rest];
      // Keep most-recently-updated first.
      next.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      return next;
    });
  }, []);

  // --- Transport lifecycle + global event subscription --------------------
  useEffect(() => {
    if (!isAuthenticated || !me) {
      setReady(false);
      setConversations([]);
      setPresence({});
      return;
    }

    let disposed = false;
    setPrefs(loadPrefs(me.id));

    const boot = async () => {
      await transport.init(me);
      if (disposed) return;
      const convs = await transport.listConversations();
      if (disposed) return;
      setConversations(convs);
      const ids = Array.from(new Set(convs.map((c) => c.peer.id)));
      if (ids.length) {
        const pres = await transport.getPresence(ids);
        if (!disposed) setPresence((p) => ({ ...p, ...pres }));
      }
      setReady(true);
    };
    boot();

    const unsub = transport.subscribe((ev) => {
      switch (ev.type) {
        case "conversation:updated":
          upsertConversation(ev.conversation);
          break;
        case "conversation:removed":
          setConversations((prev) => prev.filter((c) => c.id !== ev.conversation_id));
          break;
        case "presence":
          setPresence((p) => ({
            ...p,
            [ev.user_id]: { status: ev.status, last_seen: ev.last_seen },
          }));
          break;
        case "message:new":
          maybeNotify(ev.conversation_id, ev.message);
          break;
        default:
          break;
      }
    });

    // Presence follows tab visibility (online ↔ away).
    const onVisibility = () => {
      transport.setPresence(document.visibilityState === "visible" ? "online" : "away");
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      unsub();
      document.removeEventListener("visibilitychange", onVisibility);
      transport.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, me?.id]);

  // New-message notification (toast + sound), skipped for the active/open thread.
  const maybeNotify = useCallback(
    (conversationId: string, message: DirectMessage) => {
      if (!me || message.sender_id === me.id) return;
      const isActive = isOpenRef.current && activeRef.current === conversationId;
      if (isActive) return;
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === conversationId);
        if (conv && conv.muted) return prev;
        const name = conv?.peer.name ?? "New message";
        toast.message(name, {
          description: messagePreview(message) || "sent you a message",
        });
        return prev;
      });
      if (prefsRef.current.sound_enabled) playBlip();
    },
    [me],
  );

  // Title badge with total unread while the panel is closed.
  const unreadTotal = useMemo(
    () =>
      conversations
        .filter((c) => !c.archived && !c.muted)
        .reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations],
  );

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = unreadTotal > 0 && !isOpen ? `(${unreadTotal}) ${base}` : base;
  }, [unreadTotal, isOpen]);

  // --- Panel actions -------------------------------------------------------
  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((o) => !o), []);
  const toggleExpanded = useCallback(() => setIsExpanded((e) => !e), []);
  /** Zero the local unread badge immediately — the server's `receipt.read`
   *  broadcast goes to the *peer*, not back to us, so don't wait for an echo. */
  const clearUnreadLocally = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id && c.unread_count ? { ...c, unread_count: 0 } : c)),
    );
  }, []);

  const setActiveConversation = useCallback(
    (id: string | null) => {
      setActiveConversationId(id);
      if (id) {
        clearUnreadLocally(id);
        transport.markRead(id).catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearUnreadLocally],
  );

  /**
   * Open a conversation with `peer` — resumes the existing thread if there is
   * one (the transport's get-or-create is keyed on a deterministic pair id),
   * otherwise creates it. Deliberately does NOT force the floating panel open:
   * the caller owns its own surface (the panel rail is already open; the
   * /messages page must not pop the overlay).
   */
  const startConversation = useCallback(
    async (peer: ChatUser) => {
      const conv = await transport.getOrCreateConversation(peer);
      upsertConversation(conv);
      setActiveConversationId(conv.id);
      clearUnreadLocally(conv.id);
      transport.markRead(conv.id).catch(() => undefined);
      const pres = await transport.getPresence([peer.id]);
      setPresence((p) => ({ ...p, ...pres }));
      return conv.id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upsertConversation, clearUnreadLocally],
  );

  const refresh = useCallback(async () => {
    const convs = await transport.listConversations();
    setConversations(convs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePrefs = useCallback(
    (patch: Partial<MessagingPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        if (me) savePrefs(me.id, next);
        return next;
      });
    },
    [me],
  );

  // Keep legacy global in sync (GlobalNav reads it); panel overlays → 0.
  useEffect(() => {
    (window as unknown as { __chatWidth__?: number }).__chatWidth__ = 0;
  }, []);

  const value: ChatContextValue = {
    me,
    ready,
    isSimulated: transport.isSimulated,
    transport,
    isOpen,
    isExpanded,
    chatWidth: 0,
    activeConversationId,
    openPanel,
    closePanel,
    togglePanel,
    toggleExpanded,
    setActiveConversation,
    conversations,
    presence,
    unreadTotal,
    startConversation,
    refresh,
    prefs,
    updatePrefs,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (ctx === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}

/** Legacy-compatible alias so existing chatWidth consumers keep working. */
export function useMessagingContext(): ChatContextValue {
  return useChat();
}

/** Convenience: the deterministic conversation id for the signed-in user + peer. */
export function useConversationIdFor(peerId: string | null): string | null {
  const { me } = useChat();
  return me && peerId ? conversationIdFor(me.id, peerId) : null;
}

// A short, quiet notification blip synthesized via the Web Audio API (no asset).
let audioCtx: AudioContext | null = null;
function playBlip(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    /* audio unavailable — silent */
  }
}
