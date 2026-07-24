// Per-user, client-side persistence for the Direct Messaging simulation.
//
// The DentC backend has no messaging/conversation/presence resource (see
// docs/messaging/messaging_backend_devreport.md). Until it does, conversations,
// messages, drafts, and presence live in localStorage keyed PER USER, so two
// people sharing a browser keep separate inboxes. This file is the single swap
// point: when the real backend lands, realTransport.ts replaces these reads.
//
// Key convention (matches myPageStorage / lastPatientStorage):
//   dentc:messaging:<bucket>:<userId>

import type { Conversation, DirectMessage, PresenceInfo } from "../messagingModel";

const NS = "dentc:messaging";

function key(userId: string | undefined, bucket: string): string {
  return `${NS}:${bucket}:${userId ?? "anon"}`;
}

function read<T>(userId: string | undefined, bucket: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(userId, bucket));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(userId: string | undefined, bucket: string, value: T): void {
  try {
    localStorage.setItem(key(userId, bucket), JSON.stringify(value));
  } catch {
    /* quota / disabled storage — non-fatal, state simply won't persist */
  }
}

// ---------------------------------------------------------------------------
// Conversations (the inbox, without message bodies)
// ---------------------------------------------------------------------------

export function loadConversations(userId: string | undefined): Conversation[] {
  return read<Conversation[]>(userId, "conversations", []);
}

export function saveConversations(
  userId: string | undefined,
  conversations: Conversation[],
): void {
  write(userId, "conversations", conversations);
}

// ---------------------------------------------------------------------------
// Messages (one bucket per conversation to keep writes small)
// ---------------------------------------------------------------------------

export function loadMessages(
  userId: string | undefined,
  conversationId: string,
): DirectMessage[] {
  return read<DirectMessage[]>(userId, `messages:${conversationId}`, []);
}

export function saveMessages(
  userId: string | undefined,
  conversationId: string,
  messages: DirectMessage[],
): void {
  write(userId, `messages:${conversationId}`, messages);
}

export function clearMessages(
  userId: string | undefined,
  conversationId: string,
): void {
  try {
    localStorage.removeItem(key(userId, `messages:${conversationId}`));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Presence cache (my own last status + a small peer cache)
// ---------------------------------------------------------------------------

export function loadPresence(
  userId: string | undefined,
): Record<string, PresenceInfo> {
  return read<Record<string, PresenceInfo>>(userId, "presence", {});
}

export function savePresence(
  userId: string | undefined,
  presence: Record<string, PresenceInfo>,
): void {
  write(userId, "presence", presence);
}

// ---------------------------------------------------------------------------
// UI preferences (which surface, sound on/off, desktop notifications)
// ---------------------------------------------------------------------------

export interface MessagingPrefs {
  sound_enabled: boolean;
  desktop_notifications: boolean;
  enter_to_send: boolean;
}

export const DEFAULT_PREFS: MessagingPrefs = {
  sound_enabled: true,
  desktop_notifications: false,
  enter_to_send: true,
};

export function loadPrefs(userId: string | undefined): MessagingPrefs {
  return { ...DEFAULT_PREFS, ...read(userId, "prefs", {}) };
}

export function savePrefs(
  userId: string | undefined,
  prefs: MessagingPrefs,
): void {
  write(userId, "prefs", prefs);
}
