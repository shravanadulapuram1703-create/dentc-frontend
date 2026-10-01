// AppointNowSocket — receives the backend's `appointnow.request` push envelopes
// (AN-6). The backend publishes them on the TENANT topic of the messaging
// WebSocket (`/api/v1/messaging/ws?token=`), the same channel as
// `procedures.changed` / `sms.inbound`. Direct Messaging may run in its
// client-side simulation (VITE_MESSAGING_BACKEND unset), in which case no
// messaging socket exists — so AppointNow opens its own lightweight connection
// to that endpoint and ignores everything that is not an AppointNow envelope.
//
// Best-effort by design: delivery is Redis fan-out across workers when Redis is
// up and in-process otherwise, so the staff context keeps its slow reconciliation
// poll regardless. The socket connects lazily (first subscriber) and closes when
// the last subscriber leaves; it reads the access token from localStorage at
// each (re)connect so a refreshed token is picked up automatically.

import { env } from "@/shared/config/env";
import type { BookingRequestRead } from "@/api/generated/model/bookingRequestRead";

export type AppointNowPushEvent = "created" | "updated" | "rescheduled" | "expired" | "deleted";

/** Wire envelope published by `appointnow_service._publish_event`. */
export interface AppointNowEnvelope {
  type: "appointnow.request";
  event: AppointNowPushEvent;
  office_id: number;
  request_id: string;
  status: string;
  /** Full read shape; null for `deleted`. */
  request: BookingRequestRead | null;
}

type EnvelopeHandler = (envelope: AppointNowEnvelope) => void;

const WS_PATH = "/api/v1/messaging/ws";
const PING_MS = 30_000;
const MAX_RETRIES = 10;
const MAX_BACKOFF_MS = 30_000;

function wsUrl(token: string): string {
  const base = env.apiBaseUrl;
  const proto = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${proto}://${host}${WS_PATH}?token=${encodeURIComponent(token)}`;
}

function readToken(): string | null {
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

export class AppointNowSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<EnvelopeHandler>();
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private wanted = false;
  private focusBound = false;
  private _connected = false;

  /** True while the socket is open. */
  get connected(): boolean {
    return this._connected;
  }

  subscribe(handler: EnvelopeHandler): () => void {
    this.handlers.add(handler);
    this.wanted = true;
    this.ensureFocusListener();
    this.connect();
    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0) this.dispose();
    };
  }

  private ensureFocusListener(): void {
    if (this.focusBound || typeof window === "undefined") return;
    this.focusBound = true;
    // A tab that gave up reconnecting gets another go when the user comes back.
    window.addEventListener("focus", this.onFocus);
  }

  private onFocus = (): void => {
    if (!this.wanted) return;
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;
    this.retries = 0;
    this.connect();
  };

  private connect(): void {
    if (!this.wanted || typeof WebSocket === "undefined") return;
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;
    const token = readToken();
    if (!token) return; // not authenticated (e.g. the public booking page)
    try {
      const ws = new WebSocket(wsUrl(token));
      this.ws = ws;
      ws.onopen = () => {
        this._connected = true;
        this.retries = 0;
        this.ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, PING_MS);
      };
      ws.onmessage = (ev) => this.onMessage(ev.data);
      ws.onclose = () => {
        this._connected = false;
        if (this.ping) clearInterval(this.ping);
        this.ping = null;
        if (this.ws === ws) this.ws = null;
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        /* onclose follows and drives the reconnect */
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.wanted || this.retryTimer) return;
    if (this.retries >= MAX_RETRIES) return; // resumed by the focus listener
    this.retries += 1;
    const delay = Math.min(1000 * 2 ** this.retries, MAX_BACKOFF_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private onMessage(raw: unknown): void {
    if (typeof raw !== "string") return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;
    const env_ = data as Partial<AppointNowEnvelope>;
    if (env_.type !== "appointnow.request" || !env_.event || !env_.request_id) return;
    const envelope: AppointNowEnvelope = {
      type: "appointnow.request",
      event: env_.event,
      office_id: Number(env_.office_id),
      request_id: String(env_.request_id),
      status: String(env_.status ?? ""),
      request: (env_.request as BookingRequestRead | null | undefined) ?? null,
    };
    this.handlers.forEach((h) => {
      try {
        h(envelope);
      } catch {
        /* a bad subscriber must not break the rest */
      }
    });
  }

  dispose(): void {
    this.wanted = false;
    this.handlers.clear();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
    if (this.focusBound && typeof window !== "undefined") {
      window.removeEventListener("focus", this.onFocus);
      this.focusBound = false;
    }
    try {
      this.ws?.close(1000, "client dispose");
    } catch {
      /* ignore */
    }
    this.ws = null;
    this._connected = false;
  }
}
