// AppointNowContext — the staff-side hub for incoming online-booking requests.
//
// Mounted app-wide (like ChatProvider) but INERT until authenticated. Owns the
// request list, the pending-count badge the nav bell reads, new-request
// notifications (toast + blip), and the approve/decline actions. Approve books
// the slot into the real scheduler via staffBooking, then records the result on
// the request through the transport.

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
import { officeIdNum } from "@/services/schedulerApi";
import { getBookingTransport } from "./bookingService";
import { bookRequestIntoScheduler } from "./staffBooking";
import type { BookingRequest } from "./transport/types";

interface AppointNowContextValue {
  ready: boolean;
  isSimulated: boolean;
  requests: BookingRequest[];
  pendingCount: number;
  refresh: () => Promise<void>;
  /** Books the slot into the scheduler, then marks the request approved. */
  approve: (id: string) => Promise<void>;
  decline: (id: string, reason?: string) => Promise<void>;
}

const AppointNowContext = createContext<AppointNowContextValue | undefined>(undefined);

function describe(r: BookingRequest): string {
  const name = `${r.contact.first_name} ${r.contact.last_name}`.trim();
  return `${name || "New patient"} · ${r.reason_label} · ${r.slot.date} ${r.slot.start_time}`;
}

export function AppointNowProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, currentOffice } = useAuth();
  const transport = getBookingTransport();

  const [ready, setReady] = useState(false);
  const [requests, setRequests] = useState<BookingRequest[]>([]);

  // Keep a live ref to currentOffice so the (stable) approve handler sees it.
  const officeRef = useRef(currentOffice);
  useEffect(() => void (officeRef.current = currentOffice), [currentOffice]);

  const upsert = useCallback((req: BookingRequest) => {
    setRequests((prev) => {
      const rest = prev.filter((r) => r.id !== req.id);
      return [req, ...rest].sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || ""),
      );
    });
  }, []);

  // Load + subscribe while authenticated.
  useEffect(() => {
    if (!isAuthenticated) {
      setReady(false);
      setRequests([]);
      return;
    }
    let disposed = false;
    (async () => {
      const list = await transport.listRequests();
      if (disposed) return;
      setRequests(list);
      setReady(true);
    })();

    const unsub = transport.subscribe((ev) => {
      if (ev.type === "request:new") {
        // Only toast for genuinely-new requests (not ones we already have).
        setRequests((prev) => {
          if (prev.some((r) => r.id === ev.request.id)) return prev;
          toast.message("New booking request", { description: describe(ev.request) });
          playBlip();
          return [ev.request, ...prev].sort((a, b) =>
            (b.created_at || "").localeCompare(a.created_at || ""),
          );
        });
      } else if (ev.type === "request:updated") {
        upsert(ev.request);
      }
    });

    return () => {
      disposed = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    const list = await transport.listRequests();
    setRequests(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = useCallback(
    async (id: string) => {
      const req = requests.find((r) => r.id === id) ?? (await transport.listRequests()).find((r) => r.id === id);
      if (!req) throw new Error("Request not found.");
      // Book into the real scheduler first; only mark approved if that succeeds.
      const booked = await bookRequestIntoScheduler(req, officeIdNum(officeRef.current));
      const updated = await transport.approveRequest(id, booked.appointment_id, user?.name);
      upsert(updated);
      toast.success("Approved & booked", {
        description: `${describe(updated)} → appointment ${booked.appointment_id}`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requests, user?.name, upsert],
  );

  const decline = useCallback(
    async (id: string, reason?: string) => {
      const updated = await transport.declineRequest(id, reason, user?.name);
      upsert(updated);
      toast.message("Request declined");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.name, upsert],
  );

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  const value: AppointNowContextValue = {
    ready,
    isSimulated: transport.isSimulated,
    requests,
    pendingCount,
    refresh,
    approve,
    decline,
  };

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
    requests: [],
    pendingCount: 0,
    refresh: async () => undefined,
    approve: async () => undefined,
    decline: async () => undefined,
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
