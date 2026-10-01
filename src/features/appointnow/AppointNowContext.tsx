// AppointNowContext — the staff-side hub for incoming online-booking requests.
//
// Mounted app-wide (like ChatProvider) but INERT until authenticated. Owns the
// request list, the pending-count badge the nav bell reads, new-request
// notifications (toast + blip), and the approve/decline/reschedule/delete
// actions.
//
// Office scope: the working office comes from `useOfficeScope()` (never parsed
// from the "OFF-<id>" key here). How WIDE the inbox reads is a per-screen read
// scope (`useReadScope("appointnow-inbox")`, exposed as `inbox_scope`):
//   office      — the list, badge, notifications and socket events are scoped
//                 to the working office (the backend filters by `office_id`);
//                 with NO working office every office's requests show.
//   my_offices  — unscoped fetch, filtered client-side to the user's assigned
//                 offices ∪ the working office (no list endpoint takes a set).
//   all         — unscoped.
// Rows with no office_id (simulated / legacy) are never hidden by any mode.
//
// Realtime: the transport pushes BookingEvents — the real backend's
// `appointnow.request` envelopes on the messaging WebSocket (AN-6), or the
// simulation's BroadcastChannel. Push is best-effort (Redis fan-out / in-process
// on the server), so when the transport asks for it (`pollIntervalMs`) this
// context also re-polls the list on a slow timer and on tab focus, diffing the
// result to raise the same toast/blip for anything the socket missed.
//
// Approve: with `booksOnApprove` (real backend) the server re-checks the slot,
// books the appointment and links it atomically, returning 409 `slot_conflict`
// with the overlapping appointments — which the transport turns into a
// SlotConflictError for the red dialog. Without it (simulation) the client books
// through the scheduler API first and records the appointment id.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useOfficeScope,
  useReadScope,
  type ReadScope,
  type ReadScopeMode,
} from "@/features/office-scope";
import { getBookingTransport } from "./bookingService";
import { assertSlotAvailable, bookRequestIntoScheduler } from "./staffBooking";
import type {
  AvailableSlot,
  BookingRequest,
  BookingRequestStatus,
  StatusCounts,
} from "./transport/types";
import { EMPTY_COUNTS, countByStatus } from "./transport/types";

/** Reconciliation poll period used by the real transport (exported for the UI copy). */
export const POLL_INTERVAL_MS = 30_000;

/** What staff may steer when approving. */
export interface ApproveChoice {
  /** Provider to book against; null/undefined = let the backend pick. */
  provider_id?: string | null;
}

interface AppointNowContextValue {
  ready: boolean;
  isSimulated: boolean;
  /** True when this backend can move a pending request to another slot (AN-14). */
  supportsReschedule: boolean;
  /** True when the list is re-polled on a timer (reconciliation or fallback). */
  isPolling: boolean;
  /** The WORKING office (null = none selected). How wide the list reads is `inbox_scope`. */
  scopeOfficeId: number | null;
  /** Per-screen read scope of the inbox ("This office" / "My offices" / "All offices"). */
  inbox_scope: ReadScope;
  requests: BookingRequest[];
  /** Per-status totals for the current scope (server-side when available). */
  counts: StatusCounts;
  pendingCount: number;
  /** Last load/poll failure message (cleared on the next success). */
  loadError: string | null;
  refresh: () => Promise<void>;
  /**
   * Books the slot into the scheduler, then marks the request approved.
   * Throws SlotConflictError (from staffBooking) when the slot is double-booked.
   */
  approve: (id: string, choice?: ApproveChoice) => Promise<void>;
  decline: (id: string, reason?: string) => Promise<void>;
  /**
   * Move a pending request to a new slot. Throws SlotConflictError when the new
   * slot overlaps an existing appointment; the contact details are untouched.
   */
  reschedule: (id: string, slot: AvailableSlot) => Promise<void>;
  /** Permanently delete a request (spam/test). `force` also removes an approved one. */
  remove: (id: string, force?: boolean) => Promise<void>;
}

const AppointNowContext = createContext<AppointNowContextValue | undefined>(undefined);

interface InboxState {
  requests: BookingRequest[];
  counts: StatusCounts;
}

function describe(r: BookingRequest): string {
  const name = `${r.contact.first_name} ${r.contact.last_name}`.trim();
  return `${name || "New patient"} · ${r.reason_label} · ${r.slot.date} ${r.slot.start_time}`;
}

const byNewest = (a: BookingRequest, b: BookingRequest) =>
  (b.created_at || "").localeCompare(a.created_at || "");

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Move one unit between two status buckets (never below zero). */
function shiftCounts(c: StatusCounts, from: BookingRequestStatus | null, to: BookingRequestStatus | null): StatusCounts {
  const next = { ...c };
  if (from) next[from] = Math.max(0, next[from] - 1);
  if (to) next[to] += 1;
  if (from && !to) next.all = Math.max(0, next.all - 1);
  if (to && !from) next.all += 1;
  return next;
}

/** What the inbox currently reads — one object so an in-flight load can tell it changed. */
interface InboxScope {
  mode: ReadScopeMode;
  /** Server-side `office_id` filter for the list fetch; null = unscoped. */
  fetch_office_id: number | null;
  /** `assigned ∪ working` when mode === "my_offices". */
  office_ids: number[];
}

/**
 * Whether a request belongs in the inbox under `scope`. Used identically for
 * poll results and socket events. A row with no office_id (simulated / legacy)
 * is never hidden — nothing silently drops null-office rows.
 */
function requestInScope(office_id: number | null | undefined, scope: InboxScope): boolean {
  if (office_id == null) return true;
  if (scope.mode === "office") return scope.fetch_office_id == null || office_id === scope.fetch_office_id;
  if (scope.mode === "my_offices") return scope.office_ids.includes(office_id);
  return true;
}

/** Inert read scope for `useAppointNow()` outside the provider. */
const INERT_READ_SCOPE: ReadScope = {
  mode: "office",
  office_id: null,
  office_ids: [],
  setMode: () => undefined,
  canToggle: false,
  widestMode: "office",
  modes: ["office"],
  office_name: null,
};

export function AppointNowProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  // The working office — the office model, not a parse of the "OFF-<id>" key.
  const { office_id: scopeOfficeId } = useOfficeScope();
  // How wide the inbox reads, remembered per user for this screen.
  const inbox_scope = useReadScope("appointnow-inbox", { allow: "everyone", defaultMode: "office" });
  const { mode: inbox_mode, office_ids: inbox_office_ids } = inbox_scope;
  const transport = getBookingTransport();

  const [ready, setReady] = useState(false);
  // Requests + counts live in ONE state object and are only ever changed through
  // functional updates: the approve HTTP response and the matching push event
  // can arrive in the same tick, and each must see the true previous list so a
  // transition is counted exactly once.
  const [inbox, setInbox] = useState<InboxState>({ requests: [], counts: EMPTY_COUNTS });
  const { requests, counts } = inbox;
  const [loadError, setLoadError] = useState<string | null>(null);

  // The scope the LIST is fetched/filtered under. "office" = the working office
  // server-side (null = every office — the documented no-office behaviour);
  // "my_offices" / "all" fetch unscoped, "my_offices" then filters client-side.
  const office_ids_key = inbox_office_ids.join(",");
  // Only the office the list actually fetches under. In "all" mode this is
  // always null and in "my_offices" the working office rides in `office_ids_key`,
  // so keying the memo on this (not the raw working office) means switching the
  // top-bar office in all/my_offices mode no longer churns a new scope object —
  // which would otherwise tear down + reopen the push socket and refetch the
  // whole list for identical data (brief realtime blind spot until the poll).
  const fetch_office_id = inbox_mode === "office" ? scopeOfficeId : null;
  const scope = useMemo<InboxScope>(
    () => ({
      mode: inbox_mode,
      fetch_office_id,
      office_ids: inbox_office_ids,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inbox_mode, fetch_office_id, office_ids_key],
  );

  // Live refs so the stable handlers/pollers see current values.
  const scopeRef = useRef<InboxScope>(scope);
  useEffect(() => void (scopeRef.current = scope), [scope]);
  // The working office for booking fallbacks (simulation approve/reschedule) —
  // independent of how wide the list reads.
  const officeRef = useRef<number | null>(scopeOfficeId);
  useEffect(() => void (officeRef.current = scopeOfficeId), [scopeOfficeId]);
  const requestsRef = useRef<BookingRequest[]>([]);
  useEffect(() => void (requestsRef.current = requests), [requests]);
  // Ids already seen for the current scope — a poll result containing a
  // pending id NOT in here is a genuinely new request → notify.
  const knownIdsRef = useRef<Set<string> | null>(null);

  const notifyNew = useCallback((req: BookingRequest) => {
    toast.message("New booking request", { description: describe(req) });
    playBlip();
  }, []);

  /**
   * Apply a server-confirmed row (new or transitioned) to the list + counts.
   * Idempotent: applying the same row twice (HTTP response + push event) counts
   * the transition once, because the second application sees the first's result.
   */
  const applyUpdate = useCallback((after: BookingRequest) => {
    setInbox((prev) => {
      const before = prev.requests.find((r) => r.id === after.id);
      const rest = prev.requests.filter((r) => r.id !== after.id);
      const requests = [after, ...rest].sort(byNewest);
      let counts = prev.counts;
      if (!before) counts = shiftCounts(counts, null, after.status);
      else if (before.status !== after.status) counts = shiftCounts(counts, before.status, after.status);
      return { requests, counts };
    });
  }, []);

  const removeLocal = useCallback((id: string) => {
    knownIdsRef.current?.delete(id);
    setInbox((prev) => {
      const before = prev.requests.find((r) => r.id === id);
      if (!before) return prev;
      return {
        requests: prev.requests.filter((r) => r.id !== id),
        counts: shiftCounts(prev.counts, before.status, null),
      };
    });
  }, []);

  /**
   * Load the scoped list. `notify` raises a toast for pending requests that were
   * not in the previous snapshot (used by polls, never by the initial load).
   */
  const load = useCallback(
    async (notify: boolean) => {
      const current = scopeRef.current;
      const { items: rows, counts: server_counts } = await transport.listRequests({
        office_id: current.fetch_office_id,
      });
      // The scope may have changed while the request was in flight.
      if (scopeRef.current !== current) return;
      // "My offices" has no server-side equivalent: filter the unscoped rows
      // here and recount, so the tabs/bell match what is listed.
      const items =
        current.mode === "my_offices"
          ? rows.filter((r) => requestInScope(r.office_id, current))
          : rows;
      const c = current.mode === "my_offices" ? countByStatus(items) : server_counts;
      const known = knownIdsRef.current;
      if (notify && known) {
        const fresh = items.filter((r) => r.status === "pending" && !known.has(r.id));
        // Cap the burst so a long-offline tab doesn't fire dozens of toasts.
        fresh.slice(0, 5).forEach(notifyNew);
        if (fresh.length > 5) {
          toast.message(`${fresh.length} new booking requests`);
          playBlip();
        }
      }
      knownIdsRef.current = new Set(items.map((r) => r.id));
      setInbox({ requests: [...items].sort(byNewest), counts: c });
      setLoadError(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifyNew],
  );

  // Initial load + push subscription while authenticated (re-run on scope change).
  useEffect(() => {
    if (!isAuthenticated) {
      setReady(false);
      setInbox({ requests: [], counts: EMPTY_COUNTS });
      setLoadError(null);
      knownIdsRef.current = null;
      return;
    }
    let disposed = false;
    knownIdsRef.current = null;
    (async () => {
      try {
        await load(false);
      } catch (e) {
        if (!disposed) setLoadError(errorMessage(e, "Could not load booking requests."));
      } finally {
        if (!disposed) setReady(true);
      }
    })();

    const unsub = transport.subscribe((ev) => {
      if (ev.type === "request:deleted") {
        removeLocal(ev.request_id);
        return;
      }
      // Same rule as the list: ignore events outside the inbox's read scope
      // (rows with no office_id are kept so the demo still works).
      if (!requestInScope(ev.request.office_id, scopeRef.current)) return;
      if (ev.type === "request:new") {
        // Notify once per id — the reconciliation poll may also see it later.
        if (knownIdsRef.current?.has(ev.request.id)) return;
        knownIdsRef.current?.add(ev.request.id);
        notifyNew(ev.request);
        applyUpdate(ev.request);
      } else if (ev.type === "request:updated") {
        // An "updated" for a row this tab never loaded (e.g. created while the
        // socket was down) is still a new row for the list.
        knownIdsRef.current?.add(ev.request.id);
        applyUpdate(ev.request);
      }
    });

    return () => {
      disposed = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, scope]);

  // Reconciliation / fallback poll (real backend: push is best-effort — AN-6).
  const pollMs = transport.pollIntervalMs ?? (transport.supportsPush ? null : POLL_INTERVAL_MS);
  const isPolling = isAuthenticated && pollMs != null;
  useEffect(() => {
    if (!isPolling || pollMs == null) return;
    let inFlight = false;
    const tick = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        await load(true);
      } catch (e) {
        setLoadError(errorMessage(e, "Could not refresh booking requests."));
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(tick, pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isPolling, pollMs, load]);

  const refresh = useCallback(async () => {
    try {
      await load(true);
    } catch (e) {
      const msg = errorMessage(e, "Could not refresh booking requests.");
      setLoadError(msg);
      throw e;
    }
  }, [load]);

  const findRequest = useCallback(
    async (id: string): Promise<BookingRequest> => {
      const local = requestsRef.current.find((r) => r.id === id);
      if (local) return local;
      const { items } = await transport.listRequests({
        office_id: scopeRef.current.fetch_office_id,
      });
      const remote = items.find((r) => r.id === id);
      if (!remote) throw new Error("Request not found.");
      return remote;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const approve = useCallback(
    async (id: string, choice: ApproveChoice = {}) => {
      const req = await findRequest(id);
      const officeId = officeRef.current;
      let updated: BookingRequest;

      if (transport.booksOnApprove) {
        // The server is the single source of truth: it re-checks the slot,
        // books and links atomically, and answers 409 slot_conflict with the
        // overlapping appointments (→ SlotConflictError → red dialog).
        updated = await transport.approveRequest(id, {
          provider_id: choice.provider_id ?? null,
          actioned_by: user?.name ?? null,
          slot: req.slot,
        });
      } else {
        // Simulation: book into the real scheduler first; only then mark approved.
        const target = choice.provider_id
          ? { ...req, slot: { ...req.slot, provider_id: choice.provider_id } }
          : req;
        const booked = await bookRequestIntoScheduler(target, officeId);
        updated = await transport.approveRequest(id, {
          appointment_id: booked.appointment_id,
          actioned_by: user?.name ?? null,
        });
      }

      applyUpdate(updated);
      toast.success("Approved & booked", {
        description: `${describe(updated)} → appointment ${updated.appointment_id ?? ""}`.trim(),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findRequest, applyUpdate, user?.name],
  );

  const reschedule = useCallback(
    async (id: string, slot: AvailableSlot) => {
      if (!transport.supportsReschedule) {
        throw new Error(
          "Rescheduling a request is not supported by the connected backend yet. Decline the request and book the patient from the Scheduler instead.",
        );
      }
      const req = await findRequest(id);
      if (!transport.booksOnApprove) {
        // Simulation has no server-side check: consult the real scheduler first.
        await assertSlotAvailable(req, slot, officeRef.current);
      }
      const updated = await transport.rescheduleRequest(id, slot, user?.name);
      applyUpdate(updated);
      toast.success("Request rescheduled", { description: describe(updated) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findRequest, applyUpdate, user?.name],
  );

  const decline = useCallback(
    async (id: string, reason?: string) => {
      await findRequest(id); // surfaces "Request not found" before the call
      const updated = await transport.declineRequest(id, reason, user?.name);
      applyUpdate(updated);
      toast.message("Request declined");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findRequest, applyUpdate, user?.name],
  );

  const remove = useCallback(
    async (id: string, force = false) => {
      await transport.deleteRequest(id, force);
      removeLocal(id);
      toast.message("Request deleted");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeLocal],
  );

  const pendingCount = counts.pending;

  const value: AppointNowContextValue = useMemo(
    () => ({
      ready,
      isSimulated: transport.isSimulated,
      supportsReschedule: transport.supportsReschedule,
      isPolling,
      scopeOfficeId,
      inbox_scope,
      requests,
      counts,
      pendingCount,
      loadError,
      refresh,
      approve,
      decline,
      reschedule,
      remove,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, isPolling, scopeOfficeId, inbox_scope, requests, counts, pendingCount, loadError, refresh, approve, decline, reschedule, remove],
  );

  return (
    <AppointNowContext.Provider value={value}>{children}</AppointNowContext.Provider>
  );
}

/** Safe accessor — returns inert defaults when used outside the provider. */
export function useAppointNow(): AppointNowContextValue {
  const ctx = useContext(AppointNowContext);
  if (ctx) return ctx;
  return {
    ready: false,
    isSimulated: true,
    supportsReschedule: false,
    isPolling: false,
    scopeOfficeId: null,
    inbox_scope: INERT_READ_SCOPE,
    requests: [],
    counts: EMPTY_COUNTS,
    pendingCount: 0,
    loadError: null,
    refresh: async () => undefined,
    approve: async () => undefined,
    decline: async () => undefined,
    reschedule: async () => undefined,
    remove: async () => undefined,
  };
}

// A short, quiet notification blip via the Web Audio API (no asset needed).
let audioCtx: AudioContext | null = null;
function playBlip(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 720;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  } catch {
    /* audio unavailable — silent */
  }
}
