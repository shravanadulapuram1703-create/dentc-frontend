// Domain model for the patient SMS module (Messages inbox + SMS/Email log).
//
// Backend source of truth: `/api/v1/sms-messages` (`SmsMessageRead`). That
// table is legacy-shaped — ONE row per outbound text, with the patient's reply
// (if any) stored on the SAME row (`reply_text` / `reply_phone` /
// `reply_received_on`). A modern inbox needs one entry per direction, so
// {@link rowToEntries} fans a row out into up to two {@link SmsEntry} items.
//
// Field identifiers stay snake_case (CLAUDE.md). Status/type vocabularies are
// Twilio's, so the backend can persist Twilio callbacks verbatim
// (docs/sms/SMS_BACKEND_DEVREPORT.md, SMS-1..3).

import type { SmsMessageRead } from "@/api/generated/model";

export type SmsDirection = "outbound" | "inbound";

/**
 * Twilio message status vocabulary (+ `unknown` for legacy rows). Outbound
 * messages walk queued → sending → sent → delivered (or undelivered/failed);
 * inbound messages are always `received`.
 */
export type SmsStatus =
  | "queued"
  | "accepted"
  | "scheduled"
  | "sending"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "canceled"
  | "received"
  | "unknown";

/** What kind of text this is — drives filters, chips and template defaults. */
export type SmsMessageType =
  | "manual"
  | "appointment_reminder"
  | "appointment_confirmation"
  | "recall"
  | "balance"
  | "inbound_reply"
  | "other";

export const SMS_MESSAGE_TYPE_LABEL: Record<SmsMessageType, string> = {
  manual: "Manual",
  appointment_reminder: "Appt reminder",
  appointment_confirmation: "Confirmation request",
  recall: "Recall",
  balance: "Balance",
  inbound_reply: "Reply",
  other: "Other",
};

/**
 * How an inbound reply reads. The practice's texts ask for exactly three
 * responses (see {@link REPLY_KEYWORDS}): confirm, decline, or STOP. Anything
 * else is `other` and needs a human.
 */
export type ReplyIntent = "confirm" | "decline" | "opt_out" | "help" | "other";

/**
 * Keyword protocol shared with the backend webhook (SMS-2). Matching is
 * case-insensitive on the first word of the reply.
 *
 * NOTE: `CANCEL` is deliberately NOT a decline keyword — Twilio treats
 * STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT as carrier-level opt-outs, so a
 * patient who texts CANCEL is blocked from all future texts. Templates say
 * "NO to decline" for that reason.
 */
export const REPLY_KEYWORDS: Record<Exclude<ReplyIntent, "other">, string[]> = {
  confirm: ["yes", "y", "c", "confirm", "confirmed", "ok", "okay"],
  decline: ["no", "n", "d", "decline", "declined", "reschedule", "r"],
  opt_out: ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"],
  help: ["help", "info"],
};

export interface SmsEntry {
  /** Stable React key — `${row_id}:out` or `${row_id}:in`. */
  key: string;
  /** `sms_messages.id` of the backing row. */
  row_id: number;
  direction: SmsDirection;
  body: string;
  /** Counterparty phone (patient's number) as stored. */
  phone: string | null;
  status: SmsStatus;
  /** Raw `send_status` as the backend stored it (e.g. legacy "Success"). */
  raw_status: string | null;
  message_type: SmsMessageType;
  raw_message_type: string | null;
  /** ISO timestamp the entry is sorted/grouped by. */
  at: string;
  is_read: boolean;
  appointment_id: string | null;
  office_id: number | null;
  patient_id: number | null;
  legacy_id: string | null;
  created_by: number | null;
  /** Set on the outbound entry while the send is still in flight. */
  optimistic?: boolean;
  /** Human-readable failure reason (Twilio error text) when known. */
  error?: string | null;
  intent?: ReplyIntent;
}

/** Twilio's status vocabulary is lowercase; legacy rows say "Success"/null. */
export function normalizeStatus(raw: string | null | undefined, direction: SmsDirection): SmsStatus {
  if (direction === "inbound") return "received";
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "unknown";
  if (s === "success" || s === "ok" || s === "delivered") return "delivered";
  if (s === "error" || s === "failure") return "failed";
  const known: SmsStatus[] = [
    "queued",
    "accepted",
    "scheduled",
    "sending",
    "sent",
    "delivered",
    "undelivered",
    "failed",
    "canceled",
    "received",
  ];
  return (known as string[]).includes(s) ? (s as SmsStatus) : "unknown";
}

export function normalizeMessageType(raw: string | null | undefined, body: string): SmsMessageType {
  const s = (raw ?? "").trim().toLowerCase();
  const known: SmsMessageType[] = [
    "manual",
    "appointment_reminder",
    "appointment_confirmation",
    "recall",
    "balance",
    "inbound_reply",
    "other",
  ];
  if ((known as string[]).includes(s)) return s as SmsMessageType;
  // Legacy rows have message_type=null — infer from the text so filters work
  // on migrated history too.
  const b = body.toLowerCase();
  if (/reminder|your appointment/.test(b)) return "appointment_reminder";
  if (/confirm/.test(b)) return "appointment_confirmation";
  if (/cleaning|time to schedule|recall|check-?up/.test(b)) return "recall";
  if (/balance|payment|statement|due/.test(b)) return "balance";
  return s ? "other" : "manual";
}

/** Classify a patient reply by its first word (Twilio also handles STOP/HELP at the carrier). */
export function classifyReply(body: string): ReplyIntent {
  const first = body.trim().toLowerCase().replace(/[^a-z]/g, " ").trim().split(/\s+/)[0] ?? "";
  if (!first) return "other";
  for (const intent of ["opt_out", "confirm", "decline", "help"] as const) {
    if (REPLY_KEYWORDS[intent].includes(first)) return intent;
  }
  return "other";
}

/** Backend-classified intent (SMS-2) when present; falls back to client-side keywords. */
export function normalizeIntent(raw: string | null | undefined): ReplyIntent | null {
  const s = (raw ?? "").trim().toLowerCase();
  const known: ReplyIntent[] = ["confirm", "decline", "opt_out", "help", "other"];
  return (known as string[]).includes(s) ? (s as ReplyIntent) : null;
}

export const REPLY_INTENT_LABEL: Record<ReplyIntent, string> = {
  confirm: "Confirmed",
  decline: "Declined",
  opt_out: "Opted out (STOP)",
  help: "Asked for help",
  other: "Needs review",
};

/** Timestamp to sort/group an outbound entry by. */
function outboundAt(row: SmsMessageRead): string {
  // Migrated legacy rows carry the migration date in `created_at`; the real
  // send time is `delivered_on`. Newly created rows have `delivered_on=null`
  // until the Twilio status callback lands, so fall back to `created_at`.
  return row.delivered_on ?? row.created_at;
}

/** Fan a backend row out into its outbound and/or inbound inbox entries. */
export function rowToEntries(row: SmsMessageRead): SmsEntry[] {
  const out: SmsEntry[] = [];
  const base = {
    row_id: row.id,
    appointment_id: row.appointment_id ?? null,
    office_id: row.office_id ?? null,
    patient_id: row.patient_id ?? null,
    legacy_id: row.legacy_id ?? null,
    created_by: row.created_by ?? null,
    raw_message_type: row.message_type ?? null,
  };
  const sent = (row.sent_text ?? "").trim();
  if (sent) {
    out.push({
      ...base,
      key: `${row.id}:out`,
      direction: "outbound",
      body: sent,
      phone: row.sent_phone ?? null,
      status: normalizeStatus(row.send_status, "outbound"),
      raw_status: row.send_status ?? null,
      message_type: normalizeMessageType(row.message_type, sent),
      at: row.sent_at ?? outboundAt(row),
      // Outbound texts are "read" by definition; unread only applies to replies.
      is_read: true,
      // Twilio's failure reason, persisted by the gateway (SMS-1/SMS-3).
      error: row.error_message
        ? row.error_code
          ? `${row.error_message} (Twilio ${row.error_code})`
          : row.error_message
        : null,
    });
  }
  const reply = (row.reply_text ?? "").trim();
  if (reply) {
    out.push({
      ...base,
      key: `${row.id}:in`,
      direction: "inbound",
      body: reply,
      phone: row.reply_phone ?? row.sent_phone ?? null,
      status: "received",
      raw_status: row.send_status ?? null,
      message_type: "inbound_reply",
      at: row.reply_received_on ?? row.delivered_on ?? row.created_at,
      is_read: row.is_read,
      intent: normalizeIntent(row.reply_intent) ?? classifyReply(reply),
    });
  }
  return out;
}

export function rowsToEntries(rows: SmsMessageRead[]): SmsEntry[] {
  return rows
    .flatMap(rowToEntries)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.row_id - b.row_id);
}

/** Aggregate numbers for the header/stat strip. */
export interface SmsStats {
  total: number;
  sent: number;
  received: number;
  unread: number;
  failed: number;
  last_activity: string | null;
}

export function computeStats(entries: SmsEntry[]): SmsStats {
  const stats: SmsStats = { total: entries.length, sent: 0, received: 0, unread: 0, failed: 0, last_activity: null };
  for (const e of entries) {
    if (e.direction === "outbound") {
      stats.sent += 1;
      if (e.status === "failed" || e.status === "undelivered") stats.failed += 1;
    } else {
      stats.received += 1;
      if (!e.is_read) stats.unread += 1;
    }
    if (!stats.last_activity || e.at > stats.last_activity) stats.last_activity = e.at;
  }
  return stats;
}

/** Inbox filters shared by the thread view and the log table. */
export type SmsFilter =
  | "all"
  | "unread"
  | "inbound"
  | "outbound"
  | "appointment_reminder"
  | "appointment_confirmation"
  | "recall"
  | "balance"
  | "manual"
  | "failed";

export const SMS_FILTER_LABEL: Record<SmsFilter, string> = {
  all: "All messages",
  unread: "Unread replies",
  inbound: "Received",
  outbound: "Sent",
  appointment_reminder: "Appt reminders",
  appointment_confirmation: "Confirmations",
  recall: "Recalls",
  balance: "Balance",
  manual: "Manual",
  failed: "Failed",
};

export function applyFilter(entries: SmsEntry[], filter: SmsFilter, search: string): SmsEntry[] {
  const q = search.trim().toLowerCase();
  return entries.filter((e) => {
    if (q && !e.body.toLowerCase().includes(q) && !(e.phone ?? "").includes(q)) return false;
    switch (filter) {
      case "all":
        return true;
      case "unread":
        return e.direction === "inbound" && !e.is_read;
      case "inbound":
        return e.direction === "inbound";
      case "outbound":
        return e.direction === "outbound";
      case "failed":
        return e.status === "failed" || e.status === "undelivered";
      case "manual":
        return e.direction === "outbound" && (e.message_type === "manual" || e.message_type === "other");
      default:
        return e.direction === "outbound" && e.message_type === filter;
    }
  });
}
