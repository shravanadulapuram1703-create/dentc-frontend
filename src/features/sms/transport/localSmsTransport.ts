// Labelled client-side simulation of the SMS backend + Twilio.
//
// Enabled with `VITE_SMS_BACKEND=local`. Rows persist in localStorage
// (`dentc:sms:sim:<patient_id>`) in the exact `SmsMessageRead` shape so the
// UI code path is identical to production. A send walks the Twilio lifecycle
// (queued → sent → delivered) on timers, and confirmation-style texts get a
// scripted patient reply so the inbound path is demonstrable offline.

import type { SmsMessageRead } from "@/api/generated/model";
import { classifyReply } from "../smsModel";
import type { SmsSendCapability, SmsSendInput, SmsTransport } from "./types";

const KEY = (patient_id: number) => `dentc:sms:sim:${patient_id}`;
const TENANT = 1;

function load(patient_id: number): SmsMessageRead[] {
  try {
    const raw = localStorage.getItem(KEY(patient_id));
    return raw ? (JSON.parse(raw) as SmsMessageRead[]) : [];
  } catch {
    return [];
  }
}

function save(patient_id: number, rows: SmsMessageRead[]): void {
  try {
    localStorage.setItem(KEY(patient_id), JSON.stringify(rows));
  } catch {
    /* ignore quota errors in demo mode */
  }
}

function nextId(rows: SmsMessageRead[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

function patch(patient_id: number, id: number, changes: Partial<SmsMessageRead>): void {
  const rows = load(patient_id);
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return;
  rows[i] = { ...rows[i], ...changes } as SmsMessageRead;
  save(patient_id, rows);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class LocalSmsTransport implements SmsTransport {
  readonly mode = "local" as const;

  async getSendCapability(): Promise<SmsSendCapability> {
    return "simulated";
  }

  async listForPatient(patient_id: number): Promise<SmsMessageRead[]> {
    await wait(120);
    return load(patient_id);
  }

  async send(input: SmsSendInput): Promise<SmsMessageRead> {
    await wait(250);
    const rows = load(input.patient_id);
    const row: SmsMessageRead = {
      id: nextId(rows),
      tenant_id: TENANT,
      office_id: input.office_id,
      patient_id: input.patient_id,
      appointment_id: input.appointment_id ?? null,
      legacy_id: null,
      sent_text: input.body,
      sent_phone: input.to_phone,
      send_status: "queued",
      delivered_on: null,
      reply_text: null,
      reply_phone: null,
      reply_received_on: null,
      message_type: input.message_type,
      is_read: true,
      needs_attention: false,
      direction: "outbound",
      created_by: input.created_by ?? null,
      created_at: new Date().toISOString(),
    };
    save(input.patient_id, [...rows, row]);

    // Scripted Twilio lifecycle.
    const pid = input.patient_id;
    const id = row.id;
    const failed = /\bfail\b/i.test(input.body); // type "fail" to demo an error
    void (async () => {
      await wait(900);
      patch(pid, id, { send_status: "sent" });
      await wait(1600);
      if (failed) {
        patch(pid, id, { send_status: "undelivered" });
        return;
      }
      patch(pid, id, { send_status: "delivered", delivered_on: new Date().toISOString() });
      // Scripted reply for confirmation-style texts.
      if (/reply\s+c\b/i.test(input.body) || input.message_type === "appointment_confirmation") {
        await wait(3500);
        patch(pid, id, {
          reply_text: "C",
          reply_phone: input.to_phone,
          reply_received_on: new Date().toISOString(),
          reply_intent: "confirm",
          needs_attention: false,
          is_read: false,
        });
      }
    })();

    return row;
  }

  async markRead(row_id: number, is_read: boolean): Promise<SmsMessageRead> {
    // Rows are keyed per patient; scan every sim bucket for the id.
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith("dentc:sms:sim:")) continue;
      const pid = Number(k.split(":").pop());
      const rows = load(pid);
      const hit = rows.find((r) => r.id === row_id);
      if (hit) {
        patch(pid, row_id, { is_read });
        return { ...hit, is_read };
      }
    }
    throw new Error(`sms row ${row_id} not found`);
  }

  async simulateInbound(patient_id: number, from_phone: string, body: string): Promise<void> {
    const rows = load(patient_id);
    // Twilio inbound webhook → backend stores a reply-only row.
    const now = new Date().toISOString();
    const intent = classifyReply(body);
    rows.push({
      id: nextId(rows),
      tenant_id: TENANT,
      office_id: rows[rows.length - 1]?.office_id ?? null,
      patient_id,
      appointment_id: null,
      legacy_id: null,
      sent_text: null,
      sent_phone: null,
      send_status: "received",
      delivered_on: null,
      reply_text: body,
      reply_phone: from_phone,
      reply_received_on: now,
      message_type: "inbound_reply",
      is_read: false,
      // The backend flags replies it could not classify for a human (SMS-2).
      reply_intent: intent,
      needs_attention: intent === "other",
      direction: "inbound",
      created_by: null,
      created_at: now,
    });
    save(patient_id, rows);
  }
}
