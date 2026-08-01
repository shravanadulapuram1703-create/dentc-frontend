// Thin wrapper over the native BroadcastChannel so AppointNow state syncs across
// browser tabs in the client-side simulation. The public booking page (one tab)
// submits a request; the app's staff inbox (another tab) sees it live — no
// server round-trip.
//
// Degrades to a no-op where BroadcastChannel is unavailable (older browsers,
// some privacy modes); the app still works within a single tab.

const CHANNEL_NAME = "dentc:appointnow";

/** Envelope broadcast between tabs. `payload` is a serializable BookingEvent. */
export interface BookingBusMessage {
  /** Unique per-tab sender id so a tab can ignore its own echoes. */
  tab_id: string;
  payload: unknown;
}

type BusHandler = (msg: BookingBusMessage) => void;

export class AppointNowBus {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<BusHandler>();
  readonly tabId: string;

  constructor(tabId: string) {
    this.tabId = tabId;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (ev: MessageEvent<BookingBusMessage>) => {
          const data = ev.data;
          if (!data || data.tab_id === this.tabId) return; // ignore our own posts
          this.handlers.forEach((h) => h(data));
        };
      }
    } catch {
      this.channel = null;
    }
  }

  /** Broadcast an event to other tabs. */
  post(payload: unknown): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage({
        tab_id: this.tabId,
        payload,
      } satisfies BookingBusMessage);
    } catch {
      /* channel closed / structured-clone failure — non-fatal */
    }
  }

  subscribe(handler: BusHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  dispose(): void {
    this.handlers.clear();
    try {
      this.channel?.close();
    } catch {
      /* ignore */
    }
    this.channel = null;
  }
}
