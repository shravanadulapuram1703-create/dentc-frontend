// Real backend transport — WebSocket + REST client targeting the contract in
// docs/api-contracts/MESSAGING_API_CONTRACT.md.
//
// This is INERT by default. It only activates when VITE_MESSAGING_BACKEND=api
// (see messagingService.ts). Until the backend team ships the messaging service,
// flipping the flag will surface connection/empty/error states — which is the
// point: the UI is already wired, so "going live" is a config + backend change,
// not a frontend rewrite. Every method maps 1:1 to an endpoint/event in the
// contract; adjust paths there if the backend finalizes different shapes.

import api from "@/services/api";
import type {
  ChatUser,
  Conversation,
  DirectMessage,
  PresenceInfo,
  PresenceStatus,
  Reaction,
} from "../messagingModel";
import type {
  MessagingEvent,
  MessagingEventHandler,
  MessagingTransport,
  Paginated,
  SendMessageInput,
} from "./types";

const API_PREFIX = "/api/v1/messaging";
const RECONNECT_MAX = 5;

function wsUrl(token: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const proto = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${proto}://${host}${API_PREFIX}/ws?token=${encodeURIComponent(token)}`;
}

export class RealMessagingTransport implements MessagingTransport {
  readonly isSimulated = false;
  /**
   * MSG-6 (attachment upload endpoints) has not shipped — the backend always
   * returns `attachments: []`. Keep this false until the two-phase upload
   * exists, so the composer doesn't offer a file picker that silently drops
   * the file.
   */
  readonly supportsAttachments = false;

  private me!: ChatUser;
  private ws: WebSocket | null = null;
  private handlers = new Set<MessagingEventHandler>();
  private reconnects = 0;
  private ping: ReturnType<typeof setInterval> | null = null;

  async init(me: ChatUser): Promise<void> {
    this.me = me;
    this.connect();
  }

  private connect(): void {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      this.ws = new WebSocket(wsUrl(token));
      this.ws.onopen = () => {
        this.reconnects = 0;
        this.emit({ type: "connection", connected: true });
        this.ping = setInterval(() => this.send({ type: "ping" }), 30_000);
      };
      this.ws.onmessage = (ev) => this.onServerEvent(ev.data);
      this.ws.onclose = () => {
        this.emit({ type: "connection", connected: false });
        if (this.ping) clearInterval(this.ping);
        this.ping = null;
        if (this.reconnects < RECONNECT_MAX) {
          this.reconnects += 1;
          setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.reconnects, 16_000));
        }
      };
      this.ws.onerror = () => this.emit({ type: "connection", connected: false });
    } catch {
      this.emit({ type: "connection", connected: false });
    }
  }

  dispose(): void {
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
    try {
      this.ws?.close(1000, "client dispose");
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.handlers.clear();
  }

  subscribe(handler: MessagingEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(e: MessagingEvent): void {
    this.handlers.forEach((h) => h(e));
  }

  private send(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  /** Translate server WS envelopes (see contract §"WebSocket Event Definitions"). */
  private onServerEvent(raw: string): void {
    let ev: Record<string, unknown>;
    try {
      ev = JSON.parse(raw);
    } catch {
      return;
    }
    const type = ev.type as string;
    switch (type) {
      case "connection.ack":
        this.emit({ type: "connection", connected: true });
        break;
      case "sync": {
        // Warm-up snapshot on connect — refresh the conversation list without
        // an extra REST round-trip.
        const convs = (ev.conversations as Conversation[]) ?? [];
        for (const conversation of convs) {
          this.emit({ type: "conversation:updated", conversation });
        }
        break;
      }
      case "pong":
        // Heartbeat reply — nothing to do.
        break;
      case "receipt.read":
        this.emit({
          type: "receipt:read",
          conversation_id: ev.conversation_id as string,
          reader_id: ev.reader_id as string,
          up_to_message_id: (ev.up_to_message_id as string) ?? null,
          read_at: (ev.read_at as string) ?? null,
        });
        break;
      case "message.new":
        this.emit({ type: "message:new", conversation_id: ev.conversation_id as string, message: ev.message as DirectMessage });
        break;
      case "message.updated":
        this.emit({ type: "message:updated", conversation_id: ev.conversation_id as string, message: ev.message as DirectMessage });
        break;
      case "message.deleted":
        this.emit({ type: "message:deleted", conversation_id: ev.conversation_id as string, message_id: ev.message_id as string, for_everyone: Boolean(ev.for_everyone) });
        break;
      case "message.status":
        this.emit({ type: "message:status", conversation_id: ev.conversation_id as string, message_id: ev.message_id as string, status: ev.status as DirectMessage["status"] });
        break;
      case "reaction.updated":
        this.emit({ type: "reaction:updated", conversation_id: ev.conversation_id as string, message_id: ev.message_id as string, reactions: ev.reactions as Reaction[] });
        break;
      case "typing":
        this.emit({ type: "typing", conversation_id: ev.conversation_id as string, user_id: ev.user_id as string, is_typing: Boolean(ev.is_typing) });
        break;
      case "presence":
        this.emit({ type: "presence", user_id: ev.user_id as string, status: ev.status as PresenceStatus, last_seen: (ev.last_seen as string) ?? null });
        break;
      case "conversation.updated":
        this.emit({ type: "conversation:updated", conversation: ev.conversation as Conversation });
        break;
    }
  }

  // -- REST calls (contract §"REST Endpoints") ------------------------------

  async listConversations(): Promise<Conversation[]> {
    const { data } = await api.get(`${API_PREFIX}/conversations`, { params: { size: 100 } });
    return (data?.items ?? []) as Conversation[];
  }

  async getOrCreateConversation(peer: ChatUser): Promise<Conversation> {
    const { data } = await api.post(`${API_PREFIX}/conversations`, { participant_id: peer.id });
    return data as Conversation;
  }

  async listMessages(
    conversationId: string,
    opts?: { before?: string | null; limit?: number },
  ): Promise<Paginated<DirectMessage>> {
    const { data } = await api.get(`${API_PREFIX}/conversations/${conversationId}/messages`, {
      params: { before: opts?.before ?? undefined, limit: opts?.limit ?? 30 },
    });
    return {
      items: (data?.items ?? []) as DirectMessage[],
      has_more: Boolean(data?.has_more),
      cursor: (data?.cursor as string) ?? null,
    };
  }

  // NOTE on the local `emit` calls below: the gateway fans out to *recipients*,
  // and does not guarantee an echo back to the actor. Without emitting locally
  // the sender would never see their own message/edit/delete/reaction. The
  // hooks de-dupe by message id, so a server echo (if one does arrive) is
  // harmless.

  async sendMessage(input: SendMessageInput): Promise<DirectMessage> {
    const { data } = await api.post(
      `${API_PREFIX}/conversations/${input.conversation_id}/messages`,
      {
        body: input.body,
        // Contract field is `attachment_ids`; the backend also tolerates a list
        // of objects, but send the documented shape.
        attachment_ids: (input.attachments ?? []).map((a) => a.id),
        reply_to_id: input.reply_to?.message_id ?? null,
        forwarded_from: input.forwarded_from ?? null,
        client_id: input.client_id,
      },
    );
    const message = data as DirectMessage;
    this.emit({ type: "message:new", conversation_id: input.conversation_id, message });
    return message;
  }

  async editMessage(conversationId: string, messageId: string, body: string): Promise<DirectMessage> {
    const { data } = await api.patch(`${API_PREFIX}/conversations/${conversationId}/messages/${messageId}`, { body });
    const message = data as DirectMessage;
    this.emit({ type: "message:updated", conversation_id: conversationId, message });
    return message;
  }

  async deleteMessage(conversationId: string, messageId: string, forEveryone: boolean): Promise<void> {
    await api.delete(`${API_PREFIX}/conversations/${conversationId}/messages/${messageId}`, {
      params: { for_everyone: forEveryone },
    });
    this.emit({
      type: "message:deleted",
      conversation_id: conversationId,
      message_id: messageId,
      for_everyone: forEveryone,
    });
  }

  async toggleReaction(conversationId: string, messageId: string, emoji: string): Promise<Reaction[]> {
    const { data } = await api.post(
      `${API_PREFIX}/conversations/${conversationId}/messages/${messageId}/reactions`,
      { emoji },
    );
    const reactions = (data?.reactions ?? []) as Reaction[];
    this.emit({ type: "reaction:updated", conversation_id: conversationId, message_id: messageId, reactions });
    return reactions;
  }

  async markRead(conversationId: string): Promise<void> {
    await api.post(`${API_PREFIX}/conversations/${conversationId}/read`, {});
  }

  setTyping(conversationId: string, isTyping: boolean): void {
    this.send({ type: "typing", conversation_id: conversationId, is_typing: isTyping });
  }

  async setPinned(conversationId: string, pinned: boolean): Promise<void> {
    await api.patch(`${API_PREFIX}/conversations/${conversationId}`, { pinned });
  }
  async setMuted(conversationId: string, muted: boolean): Promise<void> {
    await api.patch(`${API_PREFIX}/conversations/${conversationId}`, { muted });
  }
  async setArchived(conversationId: string, archived: boolean): Promise<void> {
    await api.patch(`${API_PREFIX}/conversations/${conversationId}`, { archived });
  }
  async setBlocked(conversationId: string, blocked: boolean): Promise<void> {
    await api.patch(`${API_PREFIX}/conversations/${conversationId}`, { blocked });
  }
  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`${API_PREFIX}/conversations/${conversationId}`);
  }
  saveDraft(): void {
    /* Drafts stay client-side even with a real backend; handled by the hook. */
  }

  async getPresence(userIds: string[]): Promise<Record<string, PresenceInfo>> {
    const { data } = await api.get(`${API_PREFIX}/presence`, { params: { user_ids: userIds.join(",") } });
    return (data ?? {}) as Record<string, PresenceInfo>;
  }
  setPresence(status: PresenceStatus): void {
    this.send({ type: "presence", status });
  }
}
