// LocalBookingTransport — the client-side AppointNow simulation (OPT-IN via
// VITE_APPOINTNOW_BACKEND=local; the default is the real backend).
//
// Demonstrates the whole flow in ONE browser profile with no backend: the public
// page fetches simulated availability and submits a request; the request is
// persisted to localStorage and broadcast over a BroadcastChannel; the app's
// staff inbox (another tab of the SAME browser) receives it live, and
// approve/decline update the same store. It can never see a request submitted
// from another device — that is exactly why production must run `api` mode.
// Everything here is labelled `isSimulated = true` so the UI can say so.

import {
  listOffices,
  listProviders,
} from "@/api/generated/endpoints/organization/organization";
import {
  computeAvailableSlots,
  defaultWindowForDay,
  type BookedRange,
} from "../lib/availability";
import { AppointNowBus } from "../lib/appointnowBus";
import { loadRequests, saveRequests, upsertRequest } from "../lib/appointnowStorage";
import type {
  ApproveOptions,
  AvailabilityQuery,
  AvailableSlot,
  BookingEvent,
  BookingEventHandler,
  BookingRequest,
  BookingRequestList,
  BookingTransport,
  ListRequestsParams,
  PublicOfficeInfo,
  SubmitRequestInput,
} from "./types";
import { countByStatus } from "./types";

/** Slot granularity for the simulation (minutes). */
const SIM_SLOT_INTERVAL = 30;

function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  return `${prefix}-${rand}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Brand fallback used when the real office name can't be resolved. */
const BRAND_NAME = "Reckon Dental";

/** True when a staff token is present (e.g. previewing the page from the app). */
function hasAuthToken(): boolean {
  try {
    return typeof localStorage !== "undefined" && !!localStorage.getItem("access_token");
  } catch {
    return false;
  }
}

export class LocalBookingTransport implements BookingTransport {
  readonly isSimulated = true;
  readonly supportsPush = true; // BroadcastChannel delivers cross-tab events
  readonly pollIntervalMs = null; // nothing to reconcile against
  readonly supportsReschedule = true;
  readonly booksOnApprove = false; // the caller books via the scheduler API first

  private bus: AppointNowBus | null = null;
  private handlers = new Set<BookingEventHandler>();

  init(): void {
    if (this.bus) return;
    this.bus = new AppointNowBus(uid("tab"));
    this.bus.subscribe((msg) => {
      // Cross-tab events: fan out to local subscribers (do NOT re-broadcast).
      this.notifyLocal(msg.payload as BookingEvent);
    });
  }

  dispose(): void {
    this.handlers.clear();
    this.bus?.dispose();
    this.bus = null;
  }

  subscribe(handler: BookingEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyLocal(event: BookingEvent): void {
    this.handlers.forEach((h) => {
      try {
        h(event);
      } catch {
        /* a bad subscriber must not break the rest */
      }
    });
  }

  /** Deliver locally AND broadcast to other tabs. */
  private emit(event: BookingEvent): void {
    this.notifyLocal(event);
    this.bus?.post(event);
  }

  // --- Public surface ------------------------------------------------------

  async getOfficeInfo(officeCode: string): Promise<PublicOfficeInfo> {
    const fallback: PublicOfficeInfo = {
      office_code: officeCode,
      office_id: null,
      name: BRAND_NAME,
      timezone: "America/New_York",
      phone: null,
      address: null,
      providers: [], // "any available provider" in the simulation
      is_simulated: true,
    };

    // Best-effort: when a staff token exists (e.g. previewing from the app),
    // resolve the REAL office so the page shows the true office NAME (never the
    // code/id) plus real phone/address and the AppointNow-visible providers.
    // Anonymous visitors (no token) get the brand fallback — the genuine public
    // office endpoint is a backend gap (AN-1); we do NOT hit the authed client
    // without a token to avoid tripping the 401→/login interceptor.
    if (!hasAuthToken()) return fallback;
    try {
      const offs = await listOffices({ size: 200 });
      const office = (offs?.items ?? []).find(
        (o) => o.office_code?.toUpperCase() === officeCode.toUpperCase(),
      );
      if (!office) return fallback;

      let providers: PublicOfficeInfo["providers"] = [];
      try {
        const provRes = await listProviders({ size: 200 });
        providers = (provRes?.items ?? [])
          .filter(
            (p) => p.office_id === office.id && p.is_active && p.visible_in_appointnow,
          )
          .map((p) => ({ id: p.id, name: p.name, title: p.title ?? null }));
      } catch {
        /* providers are optional — leave empty ("any available provider") */
      }

      const address =
        [office.address_line1, office.city, office.state].filter(Boolean).join(", ") ||
        null;

      return {
        office_code: officeCode,
        office_id: office.id,
        name: office.name || BRAND_NAME,
        timezone: office.timezone || "America/New_York",
        phone: office.phone ?? null,
        address,
        providers,
        is_simulated: true,
      };
    } catch {
      return fallback;
    }
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const { office_code, date, duration_minutes } = query;
    // Parse the ISO date as a local calendar day (avoid UTC off-by-one).
    const parts = date.split("-").map(Number);
    const day = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
    const window = defaultWindowForDay(day.getDay());

    // Subtract slots already taken by pending/approved requests for this day.
    const booked: BookedRange[] = loadRequests()
      .filter(
        (r) =>
          r.office_code === office_code &&
          r.slot.date === date &&
          (r.status === "pending" || r.status === "approved"),
      )
      .map((r) => ({ start_time: r.slot.start_time, end_time: r.slot.end_time }));

    // For "today", don't offer slots that already started.
    const today = new Date();
    const isToday =
      today.getFullYear() === day.getFullYear() &&
      today.getMonth() === day.getMonth() &&
      today.getDate() === day.getDate();
    const minStartTime = isToday
      ? `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`
      : null;

    const starts = computeAvailableSlots({
      window,
      booked,
      slotIntervalMinutes: SIM_SLOT_INTERVAL,
      durationMinutes: duration_minutes,
      minStartTime,
    });

    return starts.map((start_time) => {
      const [hh = 0, mm = 0] = start_time.split(":").map(Number);
      const endMin = hh * 60 + mm + duration_minutes;
      const end_time = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      return {
        date,
        start_time,
        end_time,
        duration_minutes,
        provider_id: query.provider_id ?? null,
        provider_name: null,
      };
    });
  }

  async submitRequest(input: SubmitRequestInput): Promise<BookingRequest> {
    const ts = nowIso();
    const request: BookingRequest = {
      id: uid("BR"),
      office_code: input.office_code,
      office_id: null,
      status: "pending",
      reason_id: input.reason_id,
      reason_label: input.reason_label,
      slot: input.slot,
      contact: input.contact,
      created_at: ts,
      updated_at: ts,
      appointment_id: null,
      actioned_by: null,
      decline_reason: null,
    };
    upsertRequest(request);
    this.emit({ type: "request:new", request });
    return request;
  }

  // --- Staff surface -------------------------------------------------------

  async listRequests(params: ListRequestsParams = {}): Promise<BookingRequestList> {
    // Office scoping: simulated requests usually carry office_id = null (no
    // authed lookup on the public page), so only filter rows that KNOW their
    // office — otherwise the demo inbox would look empty.
    const scoped = loadRequests().filter(
      (r) =>
        params.office_id == null || r.office_id == null || r.office_id === params.office_id,
    );
    const items = params.status ? scoped.filter((r) => r.status === params.status) : scoped;
    return { items, counts: countByStatus(scoped) };
  }

  async approveRequest(id: string, options: ApproveOptions = {}): Promise<BookingRequest> {
    return this.transition(id, (r) => ({
      ...r,
      status: "approved",
      appointment_id: options.appointment_id ?? null,
      patient_id: options.patient_id ?? r.patient_id ?? null,
      actioned_by: options.actioned_by ?? null,
      actioned_at: nowIso(),
      updated_at: nowIso(),
    }));
  }

  async declineRequest(
    id: string,
    reason?: string,
    actionedBy?: string,
  ): Promise<BookingRequest> {
    return this.transition(id, (r) => ({
      ...r,
      status: "declined",
      decline_reason: reason ?? null,
      actioned_by: actionedBy ?? null,
      actioned_at: nowIso(),
      updated_at: nowIso(),
    }));
  }

  async rescheduleRequest(
    id: string,
    slot: AvailableSlot,
    actionedBy?: string,
  ): Promise<BookingRequest> {
    return this.transition(id, (r) => {
      if (r.status !== "pending") {
        throw new Error(`Only pending requests can be rescheduled (status: ${r.status}).`);
      }
      return {
        ...r,
        slot,
        original_slot: r.original_slot ?? r.slot,
        actioned_by: actionedBy ?? r.actioned_by ?? null,
        updated_at: nowIso(),
      };
    });
  }

  async deleteRequest(id: string, force = false): Promise<void> {
    const all = loadRequests();
    const current = all.find((r) => r.id === id);
    if (!current) throw new Error(`Booking request ${id} not found`);
    if (current.status === "approved" && !force) {
      throw new Error("This request is linked to a booked appointment. Confirm to delete it anyway.");
    }
    saveRequests(all.filter((r) => r.id !== id));
    this.emit({ type: "request:deleted", request_id: id, office_id: current.office_id ?? null });
  }

  private transition(
    id: string,
    apply: (r: BookingRequest) => BookingRequest,
  ): BookingRequest {
    const current = loadRequests().find((r) => r.id === id);
    if (!current) throw new Error(`Booking request ${id} not found`);
    const updated = apply(current);
    upsertRequest(updated);
    this.emit({ type: "request:updated", request: updated });
    return updated;
  }
}
