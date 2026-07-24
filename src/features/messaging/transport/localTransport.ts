// Client-side simulation transport (the default).
//
// Implements the full MessagingTransport contract against localStorage +
// BroadcastChannel + a scripted echo peer, so the entire real-time lifecycle —
// sending → sent → delivered → read, typing indicators, presence, reactions,
// edits, deletes — is demonstrable with a SINGLE logged-in user. Open a second
// tab as a different user and the two talk for real over BroadcastChannel (the
// echo peer stands down when it detects a live peer). Everything is clearly
// labelled as simulated; this is not a fake server, it is genuine local state.
//
// This file + realTransport.ts are the only messaging code that would change
// when the backend ships. See docs/messaging/MESSAGING_BACKEND_REQUIREMENTS.md.

import {
  conversationIdFor,
  type ChatUser,
  type Conversation,
  type DeliveryStatus,
  type DirectMessage,
  type PresenceInfo,
  type PresenceStatus,
  type Reaction,
} from "../messagingModel";
import {
  loadConversations,
  saveConversations,
  loadMessages,
  saveMessages,
  clearMessages,
  loadPresence,
  savePresence,
} from "../lib/messagingStorage";
import { MessagingBus } from "../lib/messagingBus";
import { scriptEchoResponse, type PeerStep } from "../lib/echoPeer";
import type {
  MessagingEvent,
  MessagingEventHandler,
  MessagingTransport,
  Paginated,
  SendMessageInput,
} from "./types";

const PAGE_SIZE = 30;
const HEARTBEAT_MS = 15_000;
const PEER_TTL_MS = 45_000;

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Deterministic simulated presence for a peer we've never seen live. */
function simulatedPresence(userId: string): PresenceStatus {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  const m = h % 10;
  if (m < 6) return "online"; // ~60%
  if (m < 8) return "away"; // ~20%
  return "offline"; // ~20%
}

/** Cross-tab payloads. `to` is the recipient user id, or "*" for broadcast. */
type BusPayload =
  | { k: "presence"; to: "*"; user: ChatUser; status: PresenceStatus; last_seen: string | null }
  | { k: "incoming"; to: string; from: ChatUser; message: DirectMessage }
  | { k: "status"; to: string; conversation_id: string; message_id: string; status: DeliveryStatus }
  | { k: "read_all"; to: string; conversation_id: string }
  | { k: "typing"; to: string; conversation_id: string; user_id: string; is_typing: boolean }
  | { k: "reaction"; to: string; conversation_id: string; message_id: string; reactions: Reaction[] }
  | { k: "edit"; to: string; conversation_id: string; message: DirectMessage }
  | { k: "delete"; to: string; conversation_id: string; message_id: string; for_everyone: boolean };

export class LocalMessagingTransport implements MessagingTransport {
  readonly isSimulated = true;
  /** The simulation stores attachments inline as size-capped data URLs. */
  readonly supportsAttachments = true;

  private me!: ChatUser;
  private bus: MessagingBus | null = null;
  private handlers = new Set<MessagingEventHandler>();

  private conversations: Conversation[] = [];
  private messages = new Map<string, DirectMessage[]>();
  private presence: Record<string, PresenceInfo> = {};
  private myStatus: PresenceStatus = "online";

  /** userId → last-heard epoch; presence within TTL means "real tab is live". */
  private livePeers = new Map<string, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  // -- lifecycle ------------------------------------------------------------

  init(me: ChatUser): void {
    this.me = me;
    this.conversations = loadConversations(me.id);
    this.presence = loadPresence(me.id);
    for (const c of this.conversations) {
      this.messages.set(c.id, loadMessages(me.id, c.id));
    }

    this.bus = new MessagingBus(uid("tab"));
    this.bus.subscribe((msg) => this.onBus(msg.payload as BusPayload));

    // Announce presence and keep it fresh so peers can detect us.
    this.broadcastPresence("online");
    this.heartbeat = setInterval(() => {
      this.broadcastPresence(this.myStatus);
      this.expireLivePeers();
    }, HEARTBEAT_MS);
  }

  dispose(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.broadcastPresence("offline");
    this.bus?.dispose();
    this.bus = null;
    this.handlers.clear();
  }

  subscribe(handler: MessagingEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(e: MessagingEvent): void {
    this.handlers.forEach((h) => h(e));
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  // -- conversations --------------------------------------------------------

  async listConversations(): Promise<Conversation[]> {
    return [...this.conversations];
  }

  async getOrCreateConversation(peer: ChatUser): Promise<Conversation> {
    const id = conversationIdFor(this.me.id, peer.id);
    let conv = this.conversations.find((c) => c.id === id);
    if (!conv) {
      conv = {
        id,
        participant_ids: [this.me.id, peer.id],
        peer,
        last_message: null,
        unread_count: 0,
        pinned: false,
        muted: false,
        archived: false,
        blocked: false,
        created_at: nowIso(),
        updated_at: nowIso(),
        draft: "",
      };
      this.conversations.unshift(conv);
      this.messages.set(id, []);
      this.ensurePresence(peer.id);
      this.persistConversations();
      this.emit({ type: "conversation:updated", conversation: conv });
    }
    return conv;
  }

  private mutateConv(id: string, patch: Partial<Conversation>): void {
    const conv = this.conversations.find((c) => c.id === id);
    if (!conv) return;
    Object.assign(conv, patch, { updated_at: nowIso() });
    this.persistConversations();
    this.emit({ type: "conversation:updated", conversation: { ...conv } });
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    this.mutateConv(id, { pinned });
  }
  async setMuted(id: string, muted: boolean): Promise<void> {
    this.mutateConv(id, { muted });
  }
  async setArchived(id: string, archived: boolean): Promise<void> {
    this.mutateConv(id, { archived });
  }
  async setBlocked(id: string, blocked: boolean): Promise<void> {
    this.mutateConv(id, { blocked });
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations = this.conversations.filter((c) => c.id !== id);
    this.messages.delete(id);
    clearMessages(this.me.id, id);
    this.persistConversations();
    this.emit({ type: "conversation:removed", conversation_id: id });
  }

  saveDraft(id: string, draft: string): void {
    const conv = this.conversations.find((c) => c.id === id);
    if (!conv) return;
    conv.draft = draft;
    this.persistConversations();
  }

  // -- messages -------------------------------------------------------------

  async listMessages(
    conversationId: string,
    opts?: { before?: string | null; limit?: number },
  ): Promise<Paginated<DirectMessage>> {
    const all = this.messages.get(conversationId) ?? [];
    const limit = opts?.limit ?? PAGE_SIZE;
    let end = all.length;
    if (opts?.before) {
      const idx = all.findIndex((m) => m.id === opts.before);
      if (idx >= 0) end = idx;
    }
    const start = Math.max(0, end - limit);
    return {
      items: all.slice(start, end),
      has_more: start > 0,
      cursor: start > 0 ? (all[start]?.id ?? null) : null,
    };
  }

  async sendMessage(input: SendMessageInput): Promise<DirectMessage> {
    const conv = this.conversations.find((c) => c.id === input.conversation_id);
    const message: DirectMessage = {
      id: input.client_id ?? uid("msg"),
      conversation_id: input.conversation_id,
      sender_id: this.me.id,
      body: input.body,
      created_at: nowIso(),
      status: "sending",
      attachments: input.attachments ?? [],
      reactions: [],
      reply_to: input.reply_to ?? null,
      forwarded_from: input.forwarded_from ?? null,
    };
    this.appendMessage(input.conversation_id, message);
    this.emit({ type: "message:new", conversation_id: input.conversation_id, message });
    this.touchConversation(input.conversation_id, message);

    const peer = conv?.peer;
    const peerLive = peer ? this.isLive(peer.id) : false;
    const peerStatus = peer ? this.presenceStatus(peer.id) : "offline";

    // sending → sent (always), → delivered (only if the peer can receive)
    this.later(() => this.updateStatus(input.conversation_id, message.id, "sent"), 280);
    if (peerLive || peerStatus !== "offline") {
      this.later(() => this.updateStatus(input.conversation_id, message.id, "delivered"), 720);
    }

    // Deliver to a live peer tab, else run the labelled echo simulation.
    if (peer && peerLive) {
      this.bus?.post(this.me.id, {
        k: "incoming",
        to: peer.id,
        from: this.me,
        message,
      } satisfies BusPayload);
    } else if (peer) {
      this.runEcho(conv!, message, peerStatus !== "offline");
    }

    return message;
  }

  private runEcho(conv: Conversation, myMessage: DirectMessage, peerOnline: boolean): void {
    const steps: PeerStep[] = scriptEchoResponse(myMessage.body, peerOnline);
    for (const step of steps) {
      this.later(() => {
        if (step.type === "read") {
          this.markOutgoingRead(conv.id);
        } else if (step.type === "typing") {
          this.emit({
            type: "typing",
            conversation_id: conv.id,
            user_id: conv.peer.id,
            is_typing: step.on,
          });
        } else if (step.type === "reply") {
          const reply: DirectMessage = {
            id: uid("msg"),
            conversation_id: conv.id,
            sender_id: conv.peer.id,
            body: step.text,
            created_at: nowIso(),
            status: "read",
            attachments: [],
            reactions: [],
            simulated: true,
          };
          this.appendMessage(conv.id, reply);
          this.bumpUnread(conv.id);
          this.emit({ type: "message:new", conversation_id: conv.id, message: reply });
          this.touchConversation(conv.id, reply);
        }
      }, step.at);
    }
  }

  async editMessage(
    conversationId: string,
    messageId: string,
    body: string,
  ): Promise<DirectMessage> {
    const list = this.messages.get(conversationId) ?? [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg) throw new Error("Message not found");
    msg.body = body;
    msg.edited_at = nowIso();
    this.persistMessages(conversationId);
    this.emit({ type: "message:updated", conversation_id: conversationId, message: { ...msg } });
    this.refreshLastMessage(conversationId);
    if (msg.sender_id === this.me.id) {
      const conv = this.conversations.find((c) => c.id === conversationId);
      if (conv && this.isLive(conv.peer.id)) {
        this.bus?.post(this.me.id, {
          k: "edit",
          to: conv.peer.id,
          conversation_id: conversationId,
          message: { ...msg },
        } satisfies BusPayload);
      }
    }
    return { ...msg };
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
    forEveryone: boolean,
  ): Promise<void> {
    const list = this.messages.get(conversationId) ?? [];
    if (forEveryone) {
      const msg = list.find((m) => m.id === messageId);
      if (msg) {
        msg.deleted_for_everyone = true;
        msg.body = "";
        msg.attachments = [];
        msg.reactions = [];
      }
    } else {
      this.messages.set(
        conversationId,
        list.filter((m) => m.id !== messageId),
      );
    }
    this.persistMessages(conversationId);
    this.emit({
      type: "message:deleted",
      conversation_id: conversationId,
      message_id: messageId,
      for_everyone: forEveryone,
    });
    this.refreshLastMessage(conversationId);

    const conv = this.conversations.find((c) => c.id === conversationId);
    if (forEveryone && conv && this.isLive(conv.peer.id)) {
      this.bus?.post(this.me.id, {
        k: "delete",
        to: conv.peer.id,
        conversation_id: conversationId,
        message_id: messageId,
        for_everyone: true,
      } satisfies BusPayload);
    }
  }

  async toggleReaction(
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<Reaction[]> {
    const list = this.messages.get(conversationId) ?? [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return [];
    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      if (existing.user_ids.includes(this.me.id)) {
        existing.user_ids = existing.user_ids.filter((u) => u !== this.me.id);
        if (existing.user_ids.length === 0) {
          msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existing.user_ids.push(this.me.id);
      }
    } else {
      msg.reactions.push({ emoji, user_ids: [this.me.id] });
    }
    this.persistMessages(conversationId);
    this.emit({
      type: "reaction:updated",
      conversation_id: conversationId,
      message_id: messageId,
      reactions: [...msg.reactions],
    });
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (conv && this.isLive(conv.peer.id)) {
      this.bus?.post(this.me.id, {
        k: "reaction",
        to: conv.peer.id,
        conversation_id: conversationId,
        message_id: messageId,
        reactions: [...msg.reactions],
      } satisfies BusPayload);
    }
    return [...msg.reactions];
  }

  async markRead(conversationId: string): Promise<void> {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    if (conv.unread_count !== 0) {
      conv.unread_count = 0;
      this.persistConversations();
      this.emit({ type: "conversation:updated", conversation: { ...conv } });
    }
    // Tell the peer their messages to me were read (real read-receipt).
    if (this.isLive(conv.peer.id)) {
      this.bus?.post(this.me.id, {
        k: "read_all",
        to: conv.peer.id,
        conversation_id: conversationId,
      } satisfies BusPayload);
    }
  }

  setTyping(conversationId: string, isTyping: boolean): void {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    if (this.isLive(conv.peer.id)) {
      this.bus?.post(this.me.id, {
        k: "typing",
        to: conv.peer.id,
        conversation_id: conversationId,
        user_id: this.me.id,
        is_typing: isTyping,
      } satisfies BusPayload);
    }
  }

  // -- presence -------------------------------------------------------------

  async getPresence(userIds: string[]): Promise<Record<string, PresenceInfo>> {
    const out: Record<string, PresenceInfo> = {};
    for (const id of userIds) {
      out[id] = this.presence[id] ?? this.ensurePresence(id);
    }
    return out;
  }

  setPresence(status: PresenceStatus): void {
    this.myStatus = status;
    this.broadcastPresence(status);
  }

  private ensurePresence(userId: string): PresenceInfo {
    if (!this.presence[userId]) {
      const status = simulatedPresence(userId);
      this.presence[userId] = {
        status,
        last_seen: status === "online" ? nowIso() : new Date(Date.now() - (1 + (userId.length % 8)) * 3600_000).toISOString(),
      };
      savePresence(this.me.id, this.presence);
    }
    return this.presence[userId];
  }

  private presenceStatus(userId: string): PresenceStatus {
    return this.ensurePresence(userId).status;
  }

  private broadcastPresence(status: PresenceStatus): void {
    this.bus?.post(this.me.id, {
      k: "presence",
      to: "*",
      user: this.me,
      status,
      last_seen: nowIso(),
    } satisfies BusPayload);
  }

  private isLive(userId: string): boolean {
    const t = this.livePeers.get(userId);
    return t != null && Date.now() - t < PEER_TTL_MS;
  }

  private expireLivePeers(): void {
    const cutoff = Date.now() - PEER_TTL_MS;
    for (const [id, t] of this.livePeers) {
      if (t < cutoff) {
        this.livePeers.delete(id);
        const info: PresenceInfo = { status: "offline", last_seen: nowIso() };
        this.presence[id] = info;
        this.emit({ type: "presence", user_id: id, status: "offline", last_seen: info.last_seen });
      }
    }
  }

  // -- cross-tab bus handling ----------------------------------------------

  private onBus(p: BusPayload): void {
    if (!p || (p.to !== "*" && p.to !== this.me.id)) return;
    switch (p.k) {
      case "presence": {
        this.livePeers.set(p.user.id, Date.now());
        const info: PresenceInfo = { status: p.status, last_seen: p.last_seen };
        this.presence[p.user.id] = info;
        savePresence(this.me.id, this.presence);
        this.emit({ type: "presence", user_id: p.user.id, status: p.status, last_seen: p.last_seen });
        break;
      }
      case "incoming": {
        this.receiveIncoming(p.from, p.message);
        break;
      }
      case "status": {
        this.applyStatus(p.conversation_id, p.message_id, p.status);
        break;
      }
      case "read_all": {
        this.markOutgoingRead(p.conversation_id);
        break;
      }
      case "typing": {
        this.emit({
          type: "typing",
          conversation_id: p.conversation_id,
          user_id: p.user_id,
          is_typing: p.is_typing,
        });
        break;
      }
      case "reaction": {
        const list = this.messages.get(p.conversation_id) ?? [];
        const msg = list.find((m) => m.id === p.message_id);
        if (msg) {
          msg.reactions = p.reactions;
          this.persistMessages(p.conversation_id);
          this.emit({
            type: "reaction:updated",
            conversation_id: p.conversation_id,
            message_id: p.message_id,
            reactions: p.reactions,
          });
        }
        break;
      }
      case "edit": {
        const list = this.messages.get(p.conversation_id) ?? [];
        const i = list.findIndex((m) => m.id === p.message.id);
        if (i >= 0) {
          list[i] = { ...p.message };
          this.persistMessages(p.conversation_id);
          this.emit({ type: "message:updated", conversation_id: p.conversation_id, message: list[i] });
          this.refreshLastMessage(p.conversation_id);
        }
        break;
      }
      case "delete": {
        this.deleteMessage(p.conversation_id, p.message_id, p.for_everyone).catch(() => undefined);
        break;
      }
    }
  }

  private receiveIncoming(from: ChatUser, message: DirectMessage): void {
    // Ensure a conversation exists on my side (id is symmetric).
    let conv = this.conversations.find((c) => c.id === message.conversation_id);
    if (!conv) {
      conv = {
        id: message.conversation_id,
        participant_ids: [this.me.id, from.id],
        peer: from,
        last_message: null,
        unread_count: 0,
        pinned: false,
        muted: false,
        archived: false,
        blocked: false,
        created_at: nowIso(),
        updated_at: nowIso(),
        draft: "",
      };
      this.conversations.unshift(conv);
      this.messages.set(conv.id, []);
    }
    const incoming: DirectMessage = { ...message, status: "read" };
    this.appendMessage(conv.id, incoming);
    this.bumpUnread(conv.id);
    this.emit({ type: "message:new", conversation_id: conv.id, message: incoming });
    this.touchConversation(conv.id, incoming);

    // Acknowledge delivery back to the sender.
    this.bus?.post(this.me.id, {
      k: "status",
      to: from.id,
      conversation_id: conv.id,
      message_id: message.id,
      status: "delivered",
    } satisfies BusPayload);
  }

  // -- internal helpers -----------------------------------------------------

  private appendMessage(conversationId: string, message: DirectMessage): void {
    const list = this.messages.get(conversationId) ?? [];
    list.push(message);
    this.messages.set(conversationId, list);
    this.persistMessages(conversationId);
  }

  private updateStatus(conversationId: string, messageId: string, status: DeliveryStatus): void {
    this.applyStatus(conversationId, messageId, status);
  }

  private applyStatus(conversationId: string, messageId: string, status: DeliveryStatus): void {
    const list = this.messages.get(conversationId) ?? [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg || msg.sender_id !== this.me.id) return;
    if (!shouldAdvance(msg.status, status)) return;
    msg.status = status;
    this.persistMessages(conversationId);
    this.emit({ type: "message:status", conversation_id: conversationId, message_id: messageId, status });
  }

  private markOutgoingRead(conversationId: string): void {
    const list = this.messages.get(conversationId) ?? [];
    let changed = false;
    for (const m of list) {
      if (m.sender_id === this.me.id && m.status !== "read") {
        m.status = "read";
        changed = true;
        this.emit({ type: "message:status", conversation_id: conversationId, message_id: m.id, status: "read" });
      }
    }
    if (changed) this.persistMessages(conversationId);
  }

  private bumpUnread(conversationId: string): void {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    conv.unread_count += 1;
    this.persistConversations();
  }

  private touchConversation(conversationId: string, last: DirectMessage): void {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    conv.last_message = last;
    conv.updated_at = last.created_at;
    // Bubble most-recent conversation to the top.
    this.conversations = [conv, ...this.conversations.filter((c) => c.id !== conversationId)];
    this.persistConversations();
    this.emit({ type: "conversation:updated", conversation: { ...conv } });
  }

  private refreshLastMessage(conversationId: string): void {
    const list = this.messages.get(conversationId) ?? [];
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    conv.last_message = list.length ? list[list.length - 1] : null;
    this.persistConversations();
    this.emit({ type: "conversation:updated", conversation: { ...conv } });
  }

  private persistConversations(): void {
    saveConversations(this.me.id, this.conversations);
  }

  private persistMessages(conversationId: string): void {
    saveMessages(this.me.id, conversationId, this.messages.get(conversationId) ?? []);
  }
}

/** Delivery status only moves forward: sending < sent < delivered < read. */
const ORDER: Record<DeliveryStatus, number> = {
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 0,
};
function shouldAdvance(current: DeliveryStatus, next: DeliveryStatus): boolean {
  if (next === "failed") return current === "sending";
  return ORDER[next] > ORDER[current];
}
