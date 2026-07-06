// Local, per-user ticket log. Serves two jobs:
//   1. AUDIT — every submission attempt (success or failure) is appended here
//      and mirrored to console.info, so support flow issues are traceable.
//   2. "My Tickets" store — in demo mode this IS the source of truth; in
//      proxy/direct mode it's a local cache/fallback when the remote list
//      can't be fetched (permissions/CORS).
import type { TicketPayload, TicketRecord, TicketStatus } from "../types";

const LOG_KEY = "dentc:help:ticket_log";
const SEQ_KEY = "dentc:help:demo_seq";

function readAll(): TicketRecord[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as TicketRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: TicketRecord[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(records));
  } catch {
    /* storage full / unavailable — non-fatal for the audit trail */
  }
}

/** Tickets filed by the given user, newest first. */
export function listTickets(reporterId: string): TicketRecord[] {
  return readAll()
    .filter((r) => r.reporter_id === reporterId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Next synthetic Jira-style key for demo mode, e.g. "SUP-1", "SUP-2". */
export function nextDemoKey(projectKey: string): string {
  let n = 0;
  try {
    n = Number(localStorage.getItem(SEQ_KEY) ?? "0") || 0;
  } catch {
    n = 0;
  }
  n += 1;
  try {
    localStorage.setItem(SEQ_KEY, String(n));
  } catch {
    /* ignore */
  }
  return `${projectKey}-${n}`;
}

/**
 * Append a submission attempt to the audit log and return the stored record.
 * Called for BOTH outcomes so failures are visible + retryable.
 */
export function recordAttempt(
  payload: TicketPayload,
  outcome: {
    issue_key: string | null;
    issue_url: string | null;
    mode: "proxy" | "direct" | "demo";
    status: TicketStatus;
    error?: string;
  },
): TicketRecord {
  const record: TicketRecord = {
    id: `${payload.context.timestamp}-${Math.abs(hash(payload.title + payload.context.timestamp))}`,
    issue_key: outcome.issue_key,
    issue_url: outcome.issue_url,
    title: payload.title,
    issue_type: payload.issue_type,
    priority: payload.priority,
    module: payload.module,
    status: outcome.status,
    mode: outcome.mode,
    created_at: payload.context.timestamp,
    reporter_id: payload.context.user_id,
    error: outcome.error,
  };

  const all = readAll();
  all.push(record);
  writeAll(all);

  // Mirror to console for troubleshooting/auditing (no PII beyond what the
  // user already entered; attachments are intentionally omitted).
  const tag = outcome.status === "Failed" ? "error" : "info";
  console[tag === "error" ? "error" : "info"](
    `[help] ticket ${outcome.status.toLowerCase()} (${outcome.mode})`,
    {
      issue_key: outcome.issue_key,
      title: payload.title,
      issue_type: payload.issue_type,
      priority: payload.priority,
      module: payload.module,
      context: payload.context,
      error: outcome.error,
    },
  );

  return record;
}

/** Small, stable string hash for building a local record id. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
