// RealBookingTransport — REST client for the real AppointNow backend.
//
// INERT until VITE_APPOINTNOW_BACKEND=api. None of these endpoints exist yet;
// they are specified in docs/appointnow/appointnow_backend_devreport.md (AN-1..7).
// When the backend ships, flip the env flag and this becomes the live transport
// with NO UI change.
//
// Two HTTP surfaces:
//   • PUBLIC reads/writes (office info, availability, submit) use a DEDICATED
//     bare axios instance with NO auth header and NO 401-redirect interceptor —
//     the shared src/services/api.ts interceptor would bounce an anonymous
//     visitor to /login, which must never happen on the public booking page.
//   • STAFF reads/writes (list, approve, decline) go through the shared authed
//     client so the Bearer token is attached.

import axios from "axios";
import { env } from "@/shared/config/env";
import api from "@/services/api";
import type {
  AvailabilityQuery,
  AvailableSlot,
  BookingEventHandler,
  BookingRequest,
  BookingRequestStatus,
  BookingTransport,
  PublicOfficeInfo,
  SubmitRequestInput,
} from "./types";

const BASE = "/api/v1/appointnow";

/** Public axios: base URL only, no interceptors (no auth, no 401 redirect). */
const publicApi = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export class RealBookingTransport implements BookingTransport {
  readonly isSimulated = false;

  init(): void {
    /* AN-6: open a WebSocket for push here once the gateway exists. */
  }

  dispose(): void {
    /* AN-6: close the socket. */
  }

  subscribe(_handler: BookingEventHandler): () => void {
    // Real-time push (AN-6) is a backend gap. Until it ships, the staff inbox
    // relies on manual refresh / polling; no events are delivered here.
    void _handler;
    return () => undefined;
  }

  // --- Public surface (anonymous) ------------------------------------------

  async getOfficeInfo(officeCode: string): Promise<PublicOfficeInfo> {
    const { data } = await publicApi.get<PublicOfficeInfo>(
      `${BASE}/offices/${encodeURIComponent(officeCode)}`,
    );
    return { ...data, is_simulated: false };
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const { data } = await publicApi.get<{ slots: AvailableSlot[] } | AvailableSlot[]>(
      `${BASE}/offices/${encodeURIComponent(query.office_code)}/availability`,
      {
        params: {
          date: query.date,
          provider_id: query.provider_id || undefined,
          duration_minutes: query.duration_minutes,
        },
      },
    );
    return Array.isArray(data) ? data : (data.slots ?? []);
  }

  async submitRequest(input: SubmitRequestInput): Promise<BookingRequest> {
    const { data } = await publicApi.post<BookingRequest>(
      `${BASE}/offices/${encodeURIComponent(input.office_code)}/requests`,
      input,
    );
    return data;
  }

  // --- Staff surface (authenticated) ---------------------------------------

  async listRequests(status?: BookingRequestStatus): Promise<BookingRequest[]> {
    const { data } = await api.get<{ items: BookingRequest[] } | BookingRequest[]>(
      `${BASE}/requests`,
      { params: { status: status || undefined } },
    );
    return Array.isArray(data) ? data : (data.items ?? []);
  }

  async approveRequest(
    id: string,
    appointmentId: string,
    actionedBy?: string,
  ): Promise<BookingRequest> {
    const { data } = await api.post<BookingRequest>(
      `${BASE}/requests/${encodeURIComponent(id)}/approve`,
      { appointment_id: appointmentId, actioned_by: actionedBy },
    );
    return data;
  }

  async declineRequest(
    id: string,
    reason?: string,
    actionedBy?: string,
  ): Promise<BookingRequest> {
    const { data } = await api.post<BookingRequest>(
      `${BASE}/requests/${encodeURIComponent(id)}/decline`,
      { reason, actioned_by: actionedBy },
    );
    return data;
  }
}
