// Per-user, client-side persistence for the Utilities hub.
//
// The DentC backend has no utility-execution, favourites, or audit-log endpoints
// (see docs/utilities/utilities_backend_devreport.md — UTIL-1..3). Rather than
// fake server state, the hub persists the genuinely user-owned bits — favourite
// utilities, recently-run ids, and a local execution/audit history — to
// localStorage, keyed per user so people sharing a browser stay separate.
//
// This is real, durable state the user controls. When the backend grows the
// endpoints these helpers become the swap point.
import type { AuditEntry } from "../types";

const NS = "dentc:utilities";
const MAX_RECENTS = 8;
const MAX_HISTORY = 100;

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
// Favourites (starred utility ids)
// ---------------------------------------------------------------------------

export function loadFavorites(userId?: string): string[] {
  return read<string[]>(userId, "favorites", []);
}

export function saveFavorites(userId: string | undefined, ids: string[]): void {
  write(userId, "favorites", ids);
}

export function toggleFavorite(userId: string | undefined, id: string): string[] {
  const cur = loadFavorites(userId);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  saveFavorites(userId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Recently executed (most-recent-first utility ids)
// ---------------------------------------------------------------------------

export function loadRecents(userId?: string): string[] {
  return read<string[]>(userId, "recents", []);
}

export function pushRecent(userId: string | undefined, id: string): string[] {
  const cur = loadRecents(userId).filter((x) => x !== id);
  const next = [id, ...cur].slice(0, MAX_RECENTS);
  write(userId, "recents", next);
  return next;
}

// ---------------------------------------------------------------------------
// Execution / audit history
// ---------------------------------------------------------------------------

export function loadHistory(userId?: string): AuditEntry[] {
  return read<AuditEntry[]>(userId, "history", []);
}

export function appendHistory(userId: string | undefined, entry: AuditEntry): AuditEntry[] {
  const next = [entry, ...loadHistory(userId)].slice(0, MAX_HISTORY);
  write(userId, "history", next);
  return next;
}

export function clearHistory(userId: string | undefined): void {
  write(userId, "history", []);
}
