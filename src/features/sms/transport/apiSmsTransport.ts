// Real transport: wraps the generated Orval client for `/api/v1/sms-messages`
// and the RingCentral send gateway (SMS-1).
//
// Send path:
//   1. POST /api/v1/sms/send  { patient_id, office_id, appointment_id, to_phone,
//                               body, message_type, client_id }
//      → backend calls RingCentral, persists the sms_messages row with the
//        provider message id + status, returns SmsMessageRead.
//   2. If the backend isn't configured (no RC_* credentials set — reported by
//      GET /api/v1/sms/gateway as mode: "log_only") we write the log row
//      ourselves with `send_status: "queued"` so the practice's intent is
//      recorded and the screen keeps working. The banner tells the user the
//      gateway isn't configured yet.
//
// Inbound replies + delivery status updates arrive ONLY through the backend's
// RingCentral webhook (SMS-2); the UI polls the list to pick them up.

import { isAxiosError } from "axios";
import api from "@/services/api";
import {
  createSmsMessage,
  getSmsGatewayStatus,
  listSmsMessages,
  updateSmsMessage,
} from "@/api/generated/endpoints/communications/communications";
import type { SmsMessageRead } from "@/api/generated/model";
import type { SmsSendCapability, SmsSendInput, SmsTransport } from "./types";

/** Gateway send route (SMS-1). */
export const SMS_SEND_PATH = "/api/v1/sms/send";

const PAGE_SIZE = 200; // backend max
const MAX_PAGES = 10; // 2,000 texts per patient is far beyond any real thread

let capability: SmsSendCapability = "unknown";
let probe: Promise<SmsSendCapability> | null = null;

function probeCapability(): Promise<SmsSendCapability> {
  if (capability !== "unknown") return Promise.resolve(capability);
  // Share one in-flight probe between concurrent callers (both pages mount it).
  probe ??= runProbe().finally(() => {
    probe = null;
  });
  return probe;
}

async function runProbe(): Promise<SmsSendCapability> {
  // Ask the backend directly rather than inferring from an HTTP status code:
  // GET /api/v1/sms/gateway reports real configuration state (RC_APP_CLIENT_ID
  // / RC_APP_CLIENT_SECRET / RC_USER_JWT all set), not just "does the route
  // exist" — the route always exists once the backend is deployed, so a
  // 404/405 probe can only ever tell you the deploy is stale, never whether
  // sends actually reach a carrier.
  try {
    const status = await getSmsGatewayStatus();
    capability = status.mode === "live" ? "live" : "log_only";
  } catch {
    // Backend unreachable or the route itself is genuinely missing (a stale
    // deploy) — fall back to the old route-existence probe so the banner at
    // least distinguishes "not deployed" from "assume it's fine".
    try {
      await api.get(SMS_SEND_PATH);
      capability = "live";
    } catch (err) {
      const httpStatus = isAxiosError(err) ? err.response?.status : undefined;
      capability = httpStatus === 404 ? "log_only" : "live";
    }
  }
  return capability;
}

export class ApiSmsTransport implements SmsTransport {
  readonly mode = "api" as const;

  getSendCapability(): Promise<SmsSendCapability> {
    return probeCapability();
  }

  async listForPatient(patient_id: number): Promise<SmsMessageRead[]> {
    const rows: SmsMessageRead[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await listSmsMessages({
        patient_id,
        page,
        size: PAGE_SIZE,
        sort: "id",
        order: "desc",
      });
      rows.push(...res.items);
      if (page >= res.meta.pages || res.items.length < PAGE_SIZE) break;
    }
    return rows;
  }

  async send(input: SmsSendInput): Promise<SmsMessageRead> {
    const cap = await probeCapability();
    if (cap === "live") {
      try {
        const { data } = await api.post<SmsMessageRead>(SMS_SEND_PATH, {
          patient_id: input.patient_id,
          office_id: input.office_id,
          appointment_id: input.appointment_id ?? null,
          to_phone: input.to_phone,
          body: input.body,
          message_type: input.message_type,
          client_id: input.client_id,
        });
        return data;
      } catch (err) {
        const status = isAxiosError(err) ? err.response?.status : undefined;
        if (status !== 404 && status !== 405) throw err;
        capability = "log_only";
      }
    }
    // Gateway not configured — record the intent in the log so it isn't lost.
    return createSmsMessage({
      patient_id: input.patient_id,
      office_id: input.office_id,
      appointment_id: input.appointment_id ?? null,
      sent_text: input.body,
      sent_phone: input.to_phone,
      send_status: "queued",
      message_type: input.message_type,
      is_read: true,
    });
  }

  markRead(row_id: number, is_read: boolean): Promise<SmsMessageRead> {
    return updateSmsMessage(row_id, { is_read });
  }
}
