// Patient e-mail log entries (EMAIL-1) — the e-mail half of the combined
// Messages window. One `email_messages` row = one outbound e-mail; SendGrid's
// event webhook moves `send_status` along queued → processed → delivered → open.

import type { EmailMessageRead } from "@/api/generated/model";
import { parseServerDateTime } from "@/utils/datetime";
import { normalizeMessageType, type SmsFilter, type SmsMessageType } from "./smsModel";

export type EmailStatus = "sending" | "queued" | "sent" | "delivered" | "opened" | "failed";

export interface EmailEntry {
  /** Stable React key — `email:${row_id}` (or `email:tmp:<client_id>` while sending). */
  key: string;
  /** `email_messages.id`; -1 for an optimistic send. */
  row_id: number;
  to_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  raw_status: string | null;
  message_type: SmsMessageType;
  /** ISO (UTC) timestamp the entry is sorted/grouped by. */
  at: string;
  appointment_id: string | null;
  error?: string | null;
  optimistic?: boolean;
}

/** SendGrid event vocabulary → the five states the UI distinguishes. */
export function normalizeEmailStatus(raw: string | null | undefined): EmailStatus {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "queued":
    case "deferred":
      return "queued";
    case "processed":
      return "sent";
    case "delivered":
      return "delivered";
    case "open":
    case "click":
      return "opened";
    case "bounce":
    case "dropped":
    case "spamreport":
    case "unsubscribe":
    case "failed":
      return "failed";
    default:
      return "sent";
  }
}

/** Rows written by the backend are naive UTC — pin them before sorting with SMS. */
function toIso(value: string | null | undefined): string {
  return parseServerDateTime(value)?.toISOString() ?? new Date(0).toISOString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function rowToEmailEntry(row: EmailMessageRead): EmailEntry {
  const body = (row.body_text ?? "").trim() || stripHtml(row.body_html ?? "");
  return {
    key: `email:${row.id}`,
    row_id: row.id,
    to_email: row.to_email,
    subject: row.subject,
    body,
    status: normalizeEmailStatus(row.send_status),
    raw_status: row.send_status ?? null,
    message_type: normalizeMessageType(row.message_type, body),
    at: toIso(row.sent_at ?? row.created_at),
    appointment_id: row.appointment_id ?? null,
    error: row.error_message ?? null,
  };
}

/** The SMS rail's filters, applied to e-mail (outbound-only, no unread state). */
export function applyEmailFilter(entries: EmailEntry[], filter: SmsFilter, search: string): EmailEntry[] {
  const q = search.trim().toLowerCase();
  return entries.filter((e) => {
    if (q && ![e.subject, e.body, e.to_email].some((s) => s.toLowerCase().includes(q))) return false;
    switch (filter) {
      case "all":
      case "outbound":
        return true;
      case "unread":
      case "inbound":
        return false;
      case "failed":
        return e.status === "failed";
      case "manual":
        return e.message_type === "manual" || e.message_type === "other";
      default:
        return e.message_type === filter;
    }
  });
}

/** Plain text → minimal HTML body (escaped, line breaks kept). */
export function textToEmailHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escaped.replace(/\n/g, "<br>")}</div>`;
}
