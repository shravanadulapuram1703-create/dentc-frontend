// The MessagingTransport interface — the single seam between the messaging UI
// and its backend. Two implementations exist:
//
//   - localTransport.ts  — client-side simulation (localStorage + BroadcastChannel
//                          + a scripted echo peer). The default; makes every
//                          real-time state demonstrable with a single logged-in user.
//   - realTransport.ts   — env-gated WebSocket + REST client that targets the
//                          contract in docs/api-contracts/MESSAGING_API_CONTRACT.md.
//
// Swapping between them is a config change (VITE_MESSAGING_BACKEND) in
// messagingService.ts — no UI change. Keep this interface backend-shaped so the
// real implementation is a drop-in.

import type {
  Attachment,
  ChatUser,
  Conversation,
  DirectMessage,
  DeliveryStatus,
  PresenceInfo,
  PresenceStatus,
  Reaction,
  ReplyRef,
} from "../messagingModel";

/** A page of messages, newest-last, with a cursor for scrolling further back. */
export interface Paginated<T> {
  items: T[];
  has_more: boolean;
  /** Opaque cursor for the next (older) page; null when exhausted. */
  cursor: string | null;
}

/** Payload for sending a new message. */
export interface SendMessageInput {
  conversation_id: string;
  body: string;
  attachments?: Attachment[];
  reply_to?: ReplyRef | null;
  forwarded_from?: string | null;
  /** Client-generated id for optimistic rendering + de-dupe on ack. */
  client_id?: string;
}

/** Real-time events the transport pushes to subscribers. */
export type MessagingEvent =
  | { type: "message:new"; conversation_id: string; message: DirectMessage }
  | { type: "message:updated"; conversation_id: string; message: DirectMessage }
  | {
      type: "message:deleted";
      conversation_id: string;
      message_id: string;
      for_everyone: boolean;
    }
  | {
      type: "message:status";
      conversation_id: string;
      message_id: string;
      status: DeliveryStatus;
    }
  /**
   * The peer read the conversation up to `up_to_message_id` (cumulative).
   * Distinct from `message:status` because the server reports reads per
   * conversation, not per message — the thread marks everything up to that
   * point as read. `up_to_message_id: null` means "everything".
   */
  | {
      type: "receipt:read";
      conversation_id: string;
      reader_id: string;
      up_to_message_id: string | null;
      read_at: string | null;
    }
  | {
      type: "reaction:updated";
      conversation_id: string;
      message_id: string;
      reactions: Reaction[];
    }
  | { type: "typing"; conversation_id: string; user_id: string; is_typing: boolean }
  | {
      type: "presence";
      user_id: string;
      status: PresenceStatus;
      last_seen: string | null;
    }
  | { type: "conversation:updated"; conversation: Conversation }
  | { type: "conversation:removed"; conversation_id: string }
  | { type: "connection"; connected: boolean };

export type MessagingEventHandler = (event: MessagingEvent) => void;

/** Backend-shaped contract implemented by both transports. */
export interface MessagingTransport {
  /** Bind the signed-in user and start any connection / listeners. */
  init(me: ChatUser): Promise<void> | void;
  /** Tear down listeners, timers, sockets. */
  dispose(): void;
  /** Subscribe to real-time events; returns an unsubscribe fn. */
  subscribe(handler: MessagingEventHandler): () => void;

  /** True when the transport is a labelled client-side simulation. */
  readonly isSimulated: boolean;

  /**
   * Whether the backend can actually store attachments. The real backend has
   * not shipped MSG-6 (upload endpoints) yet and always returns
   * `attachments: []`, so the composer hides its attach/drag-drop affordances
   * rather than silently discarding a user's file. Flip to `true` in
   * realTransport once upload endpoints exist.
   */
  readonly supportsAttachments: boolean;

  // --- Conversations -------------------------------------------------------
  listConversations(): Promise<Conversation[]>;
  getOrCreateConversation(peer: ChatUser): Promise<Conversation>;
  setPinned(conversationId: string, pinned: boolean): Promise<void>;
  setMuted(conversationId: string, muted: boolean): Promise<void>;
  setArchived(conversationId: string, archived: boolean): Promise<void>;
  setBlocked(conversationId: string, blocked: boolean): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;
  saveDraft(conversationId: string, draft: string): void;

  // --- Messages ------------------------------------------------------------
  listMessages(
    conversationId: string,
    opts?: { before?: string | null; limit?: number },
  ): Promise<Paginated<DirectMessage>>;
  sendMessage(input: SendMessageInput): Promise<DirectMessage>;
  editMessage(
    conversationId: string,
    messageId: string,
    body: string,
  ): Promise<DirectMessage>;
  deleteMessage(
    conversationId: string,
    messageId: string,
    forEveryone: boolean,
  ): Promise<void>;
  toggleReaction(
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<Reaction[]>;
  markRead(conversationId: string): Promise<void>;
  setTyping(conversationId: string, isTyping: boolean): void;

  // --- Presence ------------------------------------------------------------
  getPresence(userIds: string[]): Promise<Record<string, PresenceInfo>>;
  setPresence(status: PresenceStatus): void;
}
