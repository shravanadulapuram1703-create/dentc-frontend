// Domain model + mappers for the user-to-user Direct Messaging module.
//
// Field identifiers are snake_case to stay parity-aligned with the (future)
// backend and the generated Orval client (see CLAUDE.md). The only real backend
// this module consumes today is the user directory (`GET /api/v1/users` →
// `UserRead`); everything else (conversations, messages, presence) runs on the
// client-side simulation transport until the messaging backend exists — see
// docs/messaging/MESSAGING_BACKEND_REQUIREMENTS.md.

import type { UserRead } from "@/api/generated/model";

/** Per-message delivery lifecycle, from the sender's point of view. */
export type DeliveryStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/** Coarse user presence shown as a dot + "last seen" text. */
export type PresenceStatus = "online" | "away" | "offline";

/** A person you can message. Derived from `UserRead` via {@link mapUserRead}. */
export interface ChatUser {
  /** String id — matches `useAuth().user.id` and the per-user storage keys. */
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar_url: string | null;
  /** Two-letter fallback for the avatar when there's no image. */
  initials: string;
}

/** An uploaded file or image riding along with a message. */
export interface Attachment {
  id: string;
  name: string;
  mime_type: string;
  /** Size in bytes. */
  size: number;
  kind: "image" | "file";
  /**
   * Simulation stores small images/files inline as a data URL (size-capped).
   * A real backend would populate `url` with an object-storage link instead.
   */
  data_url?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

/** An emoji reaction and the set of users who applied it. */
export interface Reaction {
  emoji: string;
  user_ids: string[];
}

/** Lightweight quote of the message being replied to. */
export interface ReplyRef {
  message_id: string;
  sender_id: string;
  sender_name: string;
  preview: string;
}

/** A single direct message within a conversation. */
export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  /** Markdown-capable text body. */
  body: string;
  created_at: string;
  edited_at?: string | null;
  status: DeliveryStatus;
  attachments: Attachment[];
  reactions: Reaction[];
  reply_to?: ReplyRef | null;
  /** Display name of the original sender when this message was forwarded. */
  forwarded_from?: string | null;
  /** True once "delete for everyone" tombstones the body. */
  deleted_for_everyone?: boolean;
  /**
   * Marks the scripted demo peer's replies so the UI can label them clearly as
   * simulated (no real messaging backend exists yet).
   */
  simulated?: boolean;
}

/** A 1:1 conversation between the signed-in user and one peer. */
export interface Conversation {
  id: string;
  /** [me, peer] — kept generic so group chats can extend it later. */
  participant_ids: string[];
  /** Denormalized peer for the conversation list row. */
  peer: ChatUser;
  last_message?: DirectMessage | null;
  unread_count: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  /** Unsent composer text, persisted per conversation. */
  draft?: string;
}

/** Someone started/stopped typing in a conversation. */
export interface TypingEvent {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

/** Presence snapshot for one user. */
export interface PresenceInfo {
  status: PresenceStatus;
  last_seen: string | null;
}

// ---------------------------------------------------------------------------
// Mappers / helpers
// ---------------------------------------------------------------------------

/** Best-effort display name from a `UserRead` (falls back to username/email). */
export function userDisplayName(u: UserRead): string {
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return full || u.username || u.email || `User ${u.id}`;
}

/** Derive up-to-two-letter initials from a display name. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

/** Map a directory `UserRead` DTO into the messaging `ChatUser` view model. */
export function mapUserRead(u: UserRead): ChatUser {
  const name = userDisplayName(u);
  return {
    id: String(u.id),
    name,
    username: u.username,
    email: u.email,
    role: u.role,
    avatar_url: u.image_url ?? null,
    initials: initialsOf(name),
  };
}

/** A minimal `ChatUser` for the signed-in user built from the auth context. */
export function selfChatUser(input: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}): ChatUser {
  return {
    id: input.id,
    name: input.name || "Me",
    username: input.email,
    email: input.email,
    role: input.role,
    avatar_url: input.avatar_url ?? null,
    initials: initialsOf(input.name || "Me"),
  };
}

/** Deterministic conversation id for a 1:1 pair (order-independent). */
export function conversationIdFor(aUserId: string, bUserId: string): string {
  return `dm_${[aUserId, bUserId].sort().join("_")}`;
}

/** Short one-line preview of a message for the conversation list / replies. */
export function messagePreview(m: DirectMessage | null | undefined): string {
  if (!m) return "";
  if (m.deleted_for_everyone) return "This message was deleted";
  if (m.body?.trim()) {
    // Strip the most common markdown emphasis for a clean preview.
    return m.body.replace(/[*_`>#~]/g, "").replace(/\s+/g, " ").trim();
  }
  if (m.attachments.length > 0) {
    const img = m.attachments.every((a) => a.kind === "image");
    const n = m.attachments.length;
    return img ? (n === 1 ? "📷 Photo" : `📷 ${n} photos`) : `📎 ${n === 1 ? "Attachment" : `${n} attachments`}`;
  }
  return "";
}

/** Whether a status counts as "the peer has seen it" for read-receipt UI. */
export function isRead(status: DeliveryStatus): boolean {
  return status === "read";
}
