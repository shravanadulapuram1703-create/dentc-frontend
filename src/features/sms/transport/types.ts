// The SmsTransport interface — the single seam between the patient SMS UI and
// its backend. Two implementations:
//
//   - apiSmsTransport.ts   — the default. Reads/writes the real
//                            `/api/v1/sms-messages` log and sends through
//                            `POST /api/v1/sms/send` (the Twilio gateway the
//                            backend still has to build — gap SMS-1). Until
//                            that route exists, sends are persisted as
//                            `send_status: "queued"` log rows so nothing is lost.
//   - localSmsTransport.ts — labelled client-side simulation (localStorage) that
//                            fakes the Twilio lifecycle + patient replies so the
//                            whole screen can be demoed offline.
//
// Selected by `VITE_SMS_BACKEND` in ../smsService.ts.

import type { SmsMessageRead } from "@/api/generated/model";
import type { SmsMessageType } from "../smsModel";

export type SmsTransportMode = "api" | "local";

/** Whether outbound texts actually reach a carrier right now. */
export type SmsSendCapability =
  /** Backend Twilio gateway is live — texts are really delivered. */
  | "twilio"
  /** Gateway route missing (404/405) — sends are logged as `queued` only. */
  | "log_only"
  /** Client-side simulation. */
  | "simulated"
  | "unknown";

export interface SmsSendInput {
  patient_id: number;
  office_id: number | null;
  appointment_id?: string | null;
  /** E.164 destination. */
  to_phone: string;
  body: string;
  message_type: SmsMessageType;
  created_by?: number | null;
  /** Client-generated id for optimistic rendering / idempotent retries. */
  client_id: string;
}

export interface SmsTransport {
  readonly mode: SmsTransportMode;
  /** Resolve (and cache) whether real sending is available. */
  getSendCapability(): Promise<SmsSendCapability>;
  /** Every row for the patient (all pages), oldest → newest not guaranteed. */
  listForPatient(patient_id: number): Promise<SmsMessageRead[]>;
  /** Send (or log) an outbound text; resolves with the persisted row. */
  send(input: SmsSendInput): Promise<SmsMessageRead>;
  /** Flip the read flag on a row (replies only carry unread state). */
  markRead(row_id: number, is_read: boolean): Promise<SmsMessageRead>;
  /** Simulation only: inject an inbound reply for demos. */
  simulateInbound?(patient_id: number, from_phone: string, body: string): Promise<void>;
}
