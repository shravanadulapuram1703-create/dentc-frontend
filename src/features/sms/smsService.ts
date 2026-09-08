// Transport selection for the patient SMS module.
//
//   VITE_SMS_BACKEND=local → client-side simulation (offline demo)
//   anything else          → real backend (`/api/v1/sms-messages` + Twilio gateway)

import { ApiSmsTransport } from "./transport/apiSmsTransport";
import { LocalSmsTransport } from "./transport/localSmsTransport";
import type { SmsTransport, SmsTransportMode } from "./transport/types";

export const SMS_MODE: SmsTransportMode =
  (import.meta.env.VITE_SMS_BACKEND as string | undefined)?.toLowerCase() === "local" ? "local" : "api";

let instance: SmsTransport | null = null;

export function getSmsTransport(): SmsTransport {
  if (!instance) {
    instance = SMS_MODE === "local" ? new LocalSmsTransport() : new ApiSmsTransport();
  }
  return instance;
}

/** Poll cadence for picking up Twilio webhooks (replies / status) — gap SMS-4 is push. */
export const SMS_POLL_MS = 15_000;

export function newClientId(): string {
  return `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
