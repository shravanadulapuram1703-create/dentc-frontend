// RealBookingTransport — REST + push client for the shipped AppointNow backend
// (/api/v1/appointnow/*). This is the DEFAULT transport: a request submitted from
// a patient's phone on the public page is stored in the tenant's
// `booking_requests` table and shows up in every staff session for that office.
//
// Two HTTP surfaces:
//   • PUBLIC reads/writes (office info, availability, submit) use a DEDICATED
//     bare axios instance with NO auth header and NO 401-redirect interceptor —
//     the shared src/services/api.ts interceptor would bounce an anonymous
//     visitor to /login, which must never happen on the public booking page
//     (the backend guarantees these routes never answer 401 — AN-12).
//   • STAFF reads/writes (list, approve, decline, reschedule, purge) go through
//     the generated Orval client (shared authed axios, Bearer token attached).
//
// Realtime (AN-6): the backend publishes `appointnow.request` envelopes on the
// messaging WebSocket's tenant topic; `AppointNowSocket` receives them and this
// transport translates them into BookingEvents. Delivery is best-effort, so the
// staff context keeps a slow reconciliation poll (`pollIntervalMs`).
//
// Backend round 2 (2026-09-12) closed the contract deltas this file used to
// paper over: staff reads carry `office_code`, actor names and `original_slot`;
// the intake persists `insurance_info` / `disclaimer_accepted` /
// `consent_accepted` (422 `acknowledgement_required` when not both true);
// reschedule + purge exist; 409 `slot_conflict` carries `details.conflicts[]`.
// See docs/appointnow/appointnow_backend_devreport.md.

import axios, { AxiosError } from "axios";
import { env } from "@/shared/config/env";
import {
  appointnowApproveRequest,
  appointnowDeclineRequest,
  appointnowListRequests,
  appointnowPurgeRequest,
  appointnowRescheduleRequest,
} from "@/api/generated/endpoints/appointments/appointments";
import { listOfficeOptions } from "@/services/officeLookup";
import type { BookingRequestRead } from "@/api/generated/model/bookingRequestRead";
import type { ContactOut } from "@/api/generated/model/contactOut";
import type { ErrorResponse } from "@/api/generated/model/errorResponse";
import type { PublicOfficeInfo as PublicOfficeInfoRead } from "@/api/generated/model/publicOfficeInfo";
import type { AvailabilityResponse } from "@/api/generated/model/availabilityResponse";
import type { SlotOut } from "@/api/generated/model/slotOut";
import type { SubmitRequestInput as SubmitRequestBody } from "@/api/generated/model/submitRequestInput";
import { SlotConflictError, type SlotConflict } from "../staffBooking";
import { AppointNowSocket, type AppointNowEnvelope } from "../lib/appointnowSocket";
import type {
  ApproveOptions,
  AvailabilityQuery,
  AvailableSlot,
  BookingContactDetails,
  BookingEvent,
  BookingEventHandler,
  BookingRequest,
  BookingRequestList,
  BookingRequestStatus,
  BookingTransport,
  ListRequestsParams,
  PublicOfficeInfo,
  StatusCounts,
  SubmitRequestInput,
} from "./types";
import { EMPTY_COUNTS } from "./types";

const BASE = "/api/v1/appointnow";

/** Backend cap on `size` for list endpoints. */
const PAGE_SIZE = 200;
/** Hard stop so a runaway inbox can't page forever (200 × 10 = 2 000 rows). */
const MAX_PAGES = 10;
/** Reconciliation poll while push is best-effort (backend recommendation). */
const RECONCILE_POLL_MS = 30_000;

/** Public axios: base URL only, no interceptors (no auth, no 401 redirect). */
const publicApi = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Errors — surface the backend's human message (`{ error: { code, message,
// details } }`) so the public page can say "That time was just taken" instead
// of a generic failure, and staff see "Request is already approved" etc. A 409
// `slot_conflict` becomes a SlotConflictError so the inbox shows the red dialog
// listing the overlapping appointments.
// ---------------------------------------------------------------------------

/** Thrown for any backend error; carries the API error code + HTTP status. */
export class AppointNowApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly details: unknown;
  constructor(message: string, status: number | null, code: string | null, details?: unknown) {
    super(message);
    this.name = "AppointNowApiError";
    this.status = status;
    this.code = code;
    this.details = details ?? null;
  }
}

interface ServerConflict {
  appointment_id?: string;
  patient_name?: string | null;
  provider_id?: string | null;
  provider_name?: string | null;
  operatory_id?: string | null;
  operatory_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  procedure_label?: string | null;
  kind?: string;
}

function toSlotConflicts(details: unknown): SlotConflict[] | null {
  if (!details || typeof details !== "object") return null;
  const raw = (details as { conflicts?: unknown }).conflicts;
  if (!Array.isArray(raw)) return null;
  return raw.map((c: ServerConflict) => ({
    appointment_id: String(c.appointment_id ?? ""),
    patient_name: c.patient_name || "Unnamed",
    provider_name: c.provider_name ?? "",
    operatory_name: c.operatory_name ?? "",
    start_time: c.start_time ?? "",
    end_time: c.end_time ?? "",
    procedure_label: c.procedure_label ?? "",
    kind: c.kind === "operatory" ? "operatory" : "provider",
  }));
}

function toApiError(err: unknown, fallback: string, slot?: AvailableSlot): Error {
  if (err instanceof AppointNowApiError || err instanceof SlotConflictError) return err;
  const ax = err as AxiosError<ErrorResponse | { detail?: unknown }>;
  const status = ax?.response?.status ?? null;
  const body = ax?.response?.data as ErrorResponse | { detail?: unknown } | undefined;
  let message = fallback;
  let code: string | null = null;
  let details: unknown = null;
  if (body && typeof body === "object") {
    if ("error" in body && body.error && typeof body.error === "object") {
      message = body.error.message || fallback;
      code = body.error.code ?? null;
      details = body.error.details ?? null;
    } else if ("detail" in body && typeof body.detail === "string") {
      message = body.detail;
    }
  }
  if (code === "slot_conflict" && slot) {
    const conflicts = toSlotConflicts(details);
    if (conflicts) return new SlotConflictError(slot, conflicts);
  }
  return new AppointNowApiError(message, status, code, details);
}

// ---------------------------------------------------------------------------
// Contact extras — persisted as real columns since backend round 2 (AN-16).
// The interim `notes` markers the frontend used to write are still understood
// by the backend and were back-filled by its migration; the parser below is
// kept only as a read-side fallback for a backend that has not been upgraded
// yet (it returns no `disclaimer_accepted` key at all in that case).
// ---------------------------------------------------------------------------

const MARK_INSURANCE = "Insurance:";
const MARK_DISCLAIMER = "Disclaimer accepted:";
const MARK_CONSENT = "Contact consent (calls/texts):";

/** Read-side fallback: lift the legacy markers out of a notes blob. */
export function parseContactExtrasFromNotes(notes: string | null | undefined): {
  notes: string | null;
  insurance_info: string | null;
  disclaimer_accepted: boolean | null;
  consent_accepted: boolean | null;
} {
  const out = {
    notes: null as string | null,
    insurance_info: null as string | null,
    disclaimer_accepted: null as boolean | null,
    consent_accepted: null as boolean | null,
  };
  if (!notes) return out;
  const keep: string[] = [];
  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith(MARK_INSURANCE)) {
      out.insurance_info = line.slice(MARK_INSURANCE.length).trim() || null;
    } else if (line.startsWith(MARK_DISCLAIMER)) {
      out.disclaimer_accepted = /yes/i.test(line.slice(MARK_DISCLAIMER.length));
    } else if (line.startsWith(MARK_CONSENT)) {
      out.consent_accepted = /yes/i.test(line.slice(MARK_CONSENT.length));
    } else if (line) {
      keep.push(raw);
    }
  }
  out.notes = keep.join("\n").trim() || null;
  return out;
}

const VALID_STATUS: ReadonlySet<string> = new Set(["pending", "approved", "declined", "expired"]);

function normaliseStatus(s: string): BookingRequestStatus {
  return (VALID_STATUS.has(s) ? s : "pending") as BookingRequestStatus;
}

function normaliseContact(c: ContactOut | undefined): BookingContactDetails {
  // A round-2 backend always returns the three columns (booleans, never null);
  // an older backend returns none of them → fall back to the legacy markers.
  const hasColumns = c != null && typeof c.disclaimer_accepted === "boolean";
  const legacy = hasColumns ? null : parseContactExtrasFromNotes(c?.notes ?? null);
  return {
    first_name: c?.first_name ?? "",
    last_name: c?.last_name ?? "",
    phone: c?.phone ?? "",
    email: c?.email ?? "",
    date_of_birth: c?.date_of_birth ?? null,
    is_new_patient: c?.is_new_patient ?? true,
    notes: legacy ? legacy.notes : (c?.notes ?? null),
    insurance_info: legacy ? legacy.insurance_info : (c?.insurance_info ?? null),
    disclaimer_accepted: legacy ? legacy.disclaimer_accepted : (c?.disclaimer_accepted ?? false),
    consent_accepted: legacy ? legacy.consent_accepted : (c?.consent_accepted ?? false),
  };
}

function normaliseSlot(s: SlotOut): AvailableSlot {
  return {
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    duration_minutes: s.duration_minutes,
    provider_id: s.provider_id ?? null,
    provider_name: s.provider_name ?? null,
  };
}

/** Server row → UI `BookingRequest`. `officeCode` fills the field if the server omitted it. */
export function normaliseRequest(
  r: BookingRequestRead,
  officeCode: string | null,
): BookingRequest {
  return {
    id: r.id,
    office_code: r.office_code ?? officeCode ?? "",
    office_id: r.office_id,
    status: normaliseStatus(r.status),
    reason_id: r.reason_id ?? "",
    reason_label: r.reason_label ?? "",
    slot: normaliseSlot(r.slot),
    contact: normaliseContact(r.contact),
    created_at: r.created_at,
    updated_at: r.updated_at ?? r.actioned_at ?? r.created_at,
    appointment_id: r.appointment_id ?? null,
    patient_id: r.patient_id ?? null,
    actioned_by: r.actioned_by_name ?? null,
    actioned_at: r.actioned_at ?? null,
    decline_reason: r.decline_reason ?? null,
    original_slot: r.original_slot ? normaliseSlot(r.original_slot) : null,
    rescheduled_by: r.rescheduled_by_name ?? null,
    rescheduled_at: r.rescheduled_at ?? null,
    reschedule_count: r.reschedule_count ?? 0,
    contact_notified_via: r.contact_notified_via ?? null,
    contact_notified_at: r.contact_notified_at ?? null,
  };
}

function normaliseCounts(c: Partial<StatusCounts> | undefined): StatusCounts {
  return {
    pending: c?.pending ?? 0,
    approved: c?.approved ?? 0,
    declined: c?.declined ?? 0,
    expired: c?.expired ?? 0,
    all: c?.all ?? 0,
  };
}

export class RealBookingTransport implements BookingTransport {
  readonly isSimulated = false;
  readonly supportsPush = true; // AN-6: `appointnow.request` envelopes on the messaging socket
  readonly pollIntervalMs = RECONCILE_POLL_MS; // push is best-effort → keep reconciling
  readonly supportsReschedule = true; // AN-14 shipped
  readonly booksOnApprove = true; // AN-5: approve books atomically server-side

  /** office_id → office_code, filled lazily from the shared office catalog (authed). */
  private officeCodes: Map<number, string> | null = null;
  private officeCodesPromise: Promise<Map<number, string>> | null = null;

  private socket = new AppointNowSocket();
  private handlers = new Set<BookingEventHandler>();
  private unsubscribeSocket: (() => void) | null = null;

  init(): void {
    /* the socket connects lazily on the first subscribe() */
  }

  dispose(): void {
    this.unsubscribeSocket?.();
    this.unsubscribeSocket = null;
    this.handlers.clear();
    this.officeCodes = null;
    this.officeCodesPromise = null;
  }

  subscribe(handler: BookingEventHandler): () => void {
    this.handlers.add(handler);
    if (!this.unsubscribeSocket) {
      this.unsubscribeSocket = this.socket.subscribe((envelope) => this.onEnvelope(envelope));
    }
    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0) {
        this.unsubscribeSocket?.();
        this.unsubscribeSocket = null;
      }
    };
  }

  /** True while the push socket is open (diagnostic; polling covers gaps). */
  get pushConnected(): boolean {
    return this.socket.connected;
  }

  private emit(event: BookingEvent): void {
    this.handlers.forEach((h) => {
      try {
        h(event);
      } catch {
        /* a bad subscriber must not break the rest */
      }
    });
  }

  private onEnvelope(envelope: AppointNowEnvelope): void {
    if (envelope.event === "deleted" || !envelope.request) {
      this.emit({
        type: "request:deleted",
        request_id: envelope.request_id,
        office_id: Number.isFinite(envelope.office_id) ? envelope.office_id : null,
      });
      return;
    }
    const code = this.officeCodes?.get(envelope.request.office_id) ?? null;
    const request = normaliseRequest(envelope.request, code);
    this.emit({
      type: envelope.event === "created" ? "request:new" : "request:updated",
      request,
    });
  }

  // --- Public surface (anonymous) ------------------------------------------

  async getOfficeInfo(officeCode: string): Promise<PublicOfficeInfo> {
    try {
      const { data } = await publicApi.get<PublicOfficeInfoRead>(
        `${BASE}/offices/${encodeURIComponent(officeCode)}`,
      );
      return {
        office_code: data.office_code,
        office_id: data.office_id,
        name: data.name,
        timezone: data.timezone,
        phone: data.phone ?? null,
        address: data.address ?? null,
        providers: (data.providers ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          title: p.title ?? null,
        })),
        reasons: (data.reasons ?? []).map((r) => ({
          id: r.id,
          label: r.label,
          duration_minutes: r.duration_minutes,
          requires_provider: r.requires_provider ?? false,
        })),
        is_simulated: false,
      };
    } catch (e) {
      throw toApiError(e, "This booking page is not available.");
    }
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    try {
      const { data } = await publicApi.get<AvailabilityResponse>(
        `${BASE}/offices/${encodeURIComponent(query.office_code)}/availability`,
        {
          params: {
            date: query.date,
            provider_id: query.provider_id || undefined,
            duration_minutes: query.duration_minutes,
          },
        },
      );
      return (data.slots ?? []).map(normaliseSlot);
    } catch (e) {
      throw toApiError(e, "Could not load open times.");
    }
  }

  async submitRequest(input: SubmitRequestInput): Promise<BookingRequest> {
    const body: SubmitRequestBody = {
      reason_id: input.reason_id,
      reason_label: input.reason_label,
      slot: {
        date: input.slot.date,
        start_time: input.slot.start_time,
        end_time: input.slot.end_time,
        duration_minutes: input.slot.duration_minutes,
        provider_id: input.slot.provider_id ?? null,
        provider_name: input.slot.provider_name ?? null,
      },
      contact: {
        first_name: input.contact.first_name.trim(),
        last_name: input.contact.last_name.trim(),
        phone: input.contact.phone.trim(),
        email: input.contact.email.trim() || null,
        date_of_birth: input.contact.date_of_birth || null,
        is_new_patient: input.contact.is_new_patient,
        notes: input.contact.notes?.trim() || null,
        // AN-16: real columns since backend round 2. The backend refuses intake
        // (422 acknowledgement_required) unless both acknowledgements are true —
        // `validateContact` already enforces that client-side.
        insurance_info: input.contact.insurance_info?.trim() || null,
        disclaimer_accepted: input.contact.disclaimer_accepted === true,
        consent_accepted: input.contact.consent_accepted === true,
      },
    };
    try {
      const { data } = await publicApi.post<BookingRequestRead>(
        `${BASE}/offices/${encodeURIComponent(input.office_code)}/requests`,
        body,
      );
      return normaliseRequest(data, input.office_code);
    } catch (e) {
      throw toApiError(e, "Could not submit your request. Please try again.");
    }
  }

  // --- Staff surface (authenticated) ---------------------------------------

  private async getOfficeCodes(): Promise<Map<number, string>> {
    if (this.officeCodes) return this.officeCodes;
    if (!this.officeCodesPromise) {
      this.officeCodesPromise = listOfficeOptions()
        .then((offices) => {
          const map = new Map<number, string>();
          for (const o of offices) if (o.office_code) map.set(o.id, o.office_code);
          this.officeCodes = map;
          return map;
        })
        .catch(() => {
          // Non-fatal: the backend sends office_code itself since round 2.
          this.officeCodesPromise = null;
          return new Map<number, string>();
        });
    }
    return this.officeCodesPromise;
  }

  private async normaliseWithOffice(r: BookingRequestRead): Promise<BookingRequest> {
    if (r.office_code) return normaliseRequest(r, r.office_code);
    const codes = await this.getOfficeCodes();
    return normaliseRequest(r, codes.get(r.office_id) ?? null);
  }

  async listRequests(params: ListRequestsParams = {}): Promise<BookingRequestList> {
    const codes = await this.getOfficeCodes();
    const items: BookingRequest[] = [];
    let counts: StatusCounts = EMPTY_COUNTS;
    try {
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const res = await appointnowListRequests({
          status: params.status ?? undefined,
          office_id: params.office_id ?? undefined,
          sort: "created_desc",
          page,
          size: PAGE_SIZE,
        });
        counts = normaliseCounts(res.counts);
        const rows = res.items ?? [];
        for (const r of rows) items.push(normaliseRequest(r, codes.get(r.office_id) ?? null));
        if (rows.length < PAGE_SIZE || items.length >= res.total) break;
      }
    } catch (e) {
      throw toApiError(e, "Could not load booking requests.");
    }
    return { items, counts };
  }

  async approveRequest(id: string, options: ApproveOptions = {}): Promise<BookingRequest> {
    try {
      const data = await appointnowApproveRequest(id, {
        appointment_id: options.appointment_id ?? null,
        patient_id: options.patient_id ?? null,
        provider_id: options.provider_id ?? null,
        operatory_id: options.operatory_id ?? null,
      });
      return this.normaliseWithOffice(data);
    } catch (e) {
      throw toApiError(e, "Could not approve the request.", options.slot);
    }
  }

  async declineRequest(id: string, reason?: string): Promise<BookingRequest> {
    try {
      const data = await appointnowDeclineRequest(id, { reason: reason ?? null });
      return this.normaliseWithOffice(data);
    } catch (e) {
      throw toApiError(e, "Could not decline the request.");
    }
  }

  async rescheduleRequest(id: string, slot: AvailableSlot): Promise<BookingRequest> {
    // AN-14: server re-checks the slot (409 slot_conflict + conflicts[]), freezes
    // the patient's original slot, re-takes the hold and notifies the contact.
    try {
      const data = await appointnowRescheduleRequest(id, {
        slot: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration_minutes: slot.duration_minutes,
          provider_id: slot.provider_id ?? null,
        },
      });
      return this.normaliseWithOffice(data);
    } catch (e) {
      throw toApiError(e, "Could not reschedule the request.", slot);
    }
  }

  async deleteRequest(id: string, force = false): Promise<void> {
    try {
      await appointnowPurgeRequest(id, { force: force || undefined });
    } catch (e) {
      throw toApiError(e, "Could not delete the request.");
    }
  }
}
