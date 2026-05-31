import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

/** Best-effort extraction of a human-readable message from any error. */
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: { message?: string }; detail?: string; message?: string }
      | undefined;
    return (
      data?.error?.message ??
      data?.detail ??
      data?.message ??
      error.message ??
      "Request failed"
    );
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

/** 401 is handled centrally by the axios interceptor (logout + redirect). */
function isUnauthorized(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 401;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toast.error(getErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toast.error(getErrorMessage(error));
    },
  }),
});
