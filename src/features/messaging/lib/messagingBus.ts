// Thin wrapper over the native BroadcastChannel so messaging state syncs across
// browser tabs in the client-side simulation. If two tabs are open (e.g. the
// same user in two tabs, or two different users during a demo), a message sent
// in one tab shows up live in the other — no server round-trip.
//
// Degrades to a no-op where BroadcastChannel is unavailable (older browsers,
// some privacy modes); the app still works within a single tab.

const CHANNEL_NAME = "dentc:messaging";

/** Envelope broadcast between tabs. `payload` is a serializable MessagingEvent. */
export interface BusMessage {
  /** Sender tab's origin user id, so a tab can ignore its own echoes. */
  from_user_id: string;
  /** Unique per-tab sender id to drop self-delivered messages. */
  tab_id: string;
  payload: unknown;
}

type BusHandler = (msg: BusMessage) => void;

export class MessagingBus {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<BusHandler>();
  readonly tabId: string;

  constructor(tabId: string) {
    this.tabId = tabId;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (ev: MessageEvent<BusMessage>) => {
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
  post(fromUserId: string, payload: unknown): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage({
        from_user_id: fromUserId,
        tab_id: this.tabId,
        payload,
      } satisfies BusMessage);
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
