// bookingService — the single swap point between the AppointNow UI (public
// booking screen + staff inbox) and its backend.
//
//   • Transport: LocalBookingTransport (default, client-side simulation) or
//     RealBookingTransport (when VITE_APPOINTNOW_BACKEND=api). The public page
//     and the staff context both talk to `getBookingTransport()`, never to a
//     concrete transport.
//
// See docs/appointnow/appointnow_backend_devreport.md for the backend that makes
// RealBookingTransport light up.

import { env } from "@/shared/config/env";
import type { BookingTransport } from "./transport/types";
import { LocalBookingTransport } from "./transport/localTransport";
import { RealBookingTransport } from "./transport/realTransport";

/** True when the app is configured to talk to a real AppointNow backend. */
export const USE_REAL_BACKEND: boolean = env.appointNowBackend === "api";

let transport: BookingTransport | null = null;

/** Singleton transport for the app lifetime (survives page/panel navigation). */
export function getBookingTransport(): BookingTransport {
  if (!transport) {
    transport = USE_REAL_BACKEND
      ? new RealBookingTransport()
      : new LocalBookingTransport();
    transport.init();
  }
  return transport;
}
