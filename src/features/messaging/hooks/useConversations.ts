import { useMemo } from "react";
import { useChat } from "@/contexts/ChatContext";
import { messagePreview, type Conversation } from "../messagingModel";

export interface ConversationGroups {
  /** Pinned, non-archived — shown first. */
  pinned: Conversation[];
  /** Regular, non-archived. */
  direct: Conversation[];
  /** Archived conversations. */
  archived: Conversation[];
  /** Flat filtered list (pinned + direct), for keyboard nav. */
  visible: Conversation[];
  totalUnread: number;
}

function matches(conv: Conversation, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    conv.peer.name.toLowerCase().includes(needle) ||
    conv.peer.email.toLowerCase().includes(needle) ||
    conv.peer.role.toLowerCase().includes(needle) ||
    messagePreview(conv.last_message).toLowerCase().includes(needle)
  );
}

/**
 * Selector over the shared conversation list: applies search, splits into
 * pinned / direct / archived, and sorts each by recency (pinned float to top).
 */
export function useConversations(opts?: {
  search?: string;
  includeArchived?: boolean;
}): ConversationGroups {
  const { conversations } = useChat();
  const search = opts?.search?.trim() ?? "";
  const includeArchived = opts?.includeArchived ?? false;

  return useMemo(() => {
    const filtered = conversations.filter((c) => matches(c, search));
    const byRecency = (a: Conversation, b: Conversation) =>
      (b.updated_at || "").localeCompare(a.updated_at || "");

    const active = filtered.filter((c) => !c.archived);
    const pinned = active.filter((c) => c.pinned).sort(byRecency);
    const direct = active.filter((c) => !c.pinned).sort(byRecency);
    const archived = (includeArchived ? filtered : conversations.filter((c) => matches(c, search)))
      .filter((c) => c.archived)
      .sort(byRecency);

    const totalUnread = conversations
      .filter((c) => !c.archived && !c.muted)
      .reduce((n, c) => n + (c.unread_count || 0), 0);

    return {
      pinned,
      direct,
      archived,
      visible: [...pinned, ...direct],
      totalUnread,
    };
  }, [conversations, search, includeArchived]);
}
