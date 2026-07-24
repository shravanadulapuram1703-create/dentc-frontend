import { useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import type { PresenceInfo } from "../messagingModel";

const OFFLINE: PresenceInfo = { status: "offline", last_seen: null };

/**
 * Presence for a single user. Reads from the shared presence map and lazily
 * asks the transport to populate it the first time a user is referenced.
 */
export function usePresence(userId: string | null | undefined): PresenceInfo {
  const { presence, transport } = useChat();

  useEffect(() => {
    if (userId && !presence[userId]) {
      transport.getPresence([userId]).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (userId && presence[userId]) || OFFLINE;
}

/** The whole presence map (for lists that render many rows). */
export function usePresenceMap(): Record<string, PresenceInfo> {
  return useChat().presence;
}
