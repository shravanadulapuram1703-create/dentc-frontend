// Real transport: wraps the generated Orval client for `/api/v1/sms-messages`
// and the (pending) Twilio send gateway.
//
// Send path:
//   1. POST /api/v1/sms/send  { patient_id, office_id, appointment_id, to_phone,
//                               body, message_type, client_id }
//      → backend calls Twilio, persists the sms_messages row with the Twilio
//        SID + status, returns SmsMessageRead.               (gap SMS-1)
//   2. If that route is missing (404/405) we fall back to writing the log row
//      ourselves with `send_status: "queued"` so the practice's intent is
//      recorded and the screen keeps working. The banner tells the user the
//      gateway isn't deployed. Once SMS-1 ships, step 2 never runs.
//
// Inbound replies + delivery status updates arrive ONLY through the backend's
// Twilio webhooks (gaps SMS-2/SMS-3); the UI polls the list to pick them up.

import { isAxiosError } from "axios";
import api from "@/services/api";
import {
  createSmsMessage,
  listSmsMessages,
  updateSmsMessage,
} from "@/api/generated/endpoints/communications/communications";
import type { SmsMessageRead } from "@/api/generated/model";
import type { SmsSendCapability, SmsSendInput, SmsTransport } from "./types";

/** Gateway route the backend is expected to expose (SMS-1). */
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
  try {
    // GET on a POST-only FastAPI route is side-effect free: 405 when the route
    // exists, 404 when it doesn't. (Never probe with POST — an empty body
    // could be persisted by a lenient handler.)
    await api.get(SMS_SEND_PATH);
    capability = "twilio";
  } catch (err) {
    const status = isAxiosError(err) ? err.response?.status : undefined;
    capability = status === 404 ? "log_only" : "twilio";
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
    if (cap === "twilio") {
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
    // Gateway not deployed — record the intent in the log so it isn't lost.
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
