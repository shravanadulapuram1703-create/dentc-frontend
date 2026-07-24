import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useChat } from "@/contexts/ChatContext";
import { fetchDirectory } from "../messagingService";
import type { ChatUser } from "../messagingModel";

/** Debounce a fast-changing value (search input) by `delay` ms. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Users per request. The backend caps list `size` at 200. */
const PAGE_SIZE = 100;

/**
 * How many users we'll pull automatically. The org directory is browsable in
 * full (the ask: "show all users"), but we stop auto-paging past this so a very
 * large tenant doesn't fire dozens of requests — beyond it, an explicit
 * "Load more" button (or a search) takes over.
 */
const AUTO_LOAD_MAX = 500;

export interface UserDirectoryResult {
  /** Every user loaded so far, across all fetched pages. */
  users: ChatUser[];
  /** Total matching users on the server (not just the loaded ones). */
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
}

/**
 * The org's user directory (real `GET /api/v1/users`).
 *
 * Paginated because the backend caps a single page — pages are accumulated and,
 * up to AUTO_LOAD_MAX, fetched automatically so the list shows *everyone*
 * without the user having to scroll-hunt. `search` is passed to the server, so
 * typing searches the entire directory, not just what's already loaded.
 *
 * Returns mapped `ChatUser`s excluding the signed-in user.
 */
export function useUserDirectory(rawSearch: string, enabled = true): UserDirectoryResult {
  const { me } = useChat();
  const search = useDebounced(rawSearch, 300);

  const query = useInfiniteQuery({
    queryKey: ["messaging", "directory", me?.id, search],
    queryFn: ({ pageParam }) =>
      fetchDirectory(me!.id, { search, page: pageParam as number, size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled: enabled && !!me,
    staleTime: 30_000,
  });

  const pages = query.data?.pages ?? [];
  const users = pages.flatMap((p) => p.users);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Walk the remaining pages automatically (one in flight at a time) so the
  // full directory is present without depending on scroll/IntersectionObserver,
  // which are unreliable in background tabs.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && users.length < AUTO_LOAD_MAX) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, users.length, fetchNextPage]);

  return {
    users,
    total: pages[0]?.total ?? 0,
    hasMore: Boolean(hasNextPage),
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    isLoading: query.isLoading,
    isLoadingMore: isFetchingNextPage,
    isError: query.isError,
  };
}
