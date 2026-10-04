// The signed-in user's clock state — shared by the top-bar punch button and the
// My Time Clock page through one React Query entry, so a punch in either place
// updates both.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TimeClockEntryRead } from "@/api/generated/model";
import { useAuth } from "@/contexts/AuthContext";
import { resolveStamp, useOfficeScope } from "@/features/office-scope";
import { apiErrorMessage } from "@/features/progress-notes/progressNotesService";
import { parseServerDateTime } from "@/utils/datetime";
import { clockIn, clockOut, fetchActiveEntry, TimeClockConflictError } from "./timeClockService";

export const timeClockKeys = {
  all: ["time-clock"] as const,
  active: (user_id: number | null) => ["time-clock", "active", user_id] as const,
  range: (q: unknown) => ["time-clock", "range", q] as const,
  config: (user_id: number | null) => ["time-clock", "config", user_id] as const,
};

/** Re-render every `ms` while `enabled` (drives the elapsed-time readout). */
export function useNow(enabled: boolean, ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [enabled, ms]);
  return now;
}

function failureMessage(err: unknown, fallback: string): string {
  if (err instanceof TimeClockConflictError) return err.message;
  return apiErrorMessage(err) ?? (err instanceof Error && err.message ? err.message : fallback);
}

export interface TimeClockState {
  user_id: number | null;
  /** The running shift, or null when clocked out. */
  active: TimeClockEntryRead | null;
  is_clocked_in: boolean;
  loading: boolean;
  error: unknown;
  /** Milliseconds on the clock for the running shift (0 when clocked out). */
  elapsed_ms: number;
  pending: boolean;
  /** Resolve true when the punch was recorded (failures are toasted). */
  clockIn: () => Promise<boolean>;
  clockOut: () => Promise<boolean>;
}

export function useTimeClock(): TimeClockState {
  const { user } = useAuth();
  const { office_id } = useOfficeScope();
  const queryClient = useQueryClient();
  const parsed = Number(user?.id);
  const user_id = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  const activeQuery = useQuery({
    queryKey: timeClockKeys.active(user_id),
    queryFn: () => fetchActiveEntry(user_id as number),
    enabled: user_id != null,
    staleTime: 30_000,
    // Picks up a punch made in another tab / on another workstation.
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  const active = activeQuery.data ?? null;
  const now = useNow(active != null, 15_000);
  const started = parseServerDateTime(active?.clock_in);
  const elapsed_ms = started ? Math.max(0, now.getTime() - started.getTime()) : 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: timeClockKeys.all });

  const inMutation = useMutation({
    mutationFn: () =>
      clockIn({
        user_id: user_id as number,
        office_id: resolveStamp("time_clock", { working_office_id: office_id }),
      }),
    onSuccess: (entry) => {
      queryClient.setQueryData(timeClockKeys.active(user_id), entry);
      toast.success("Clocked in");
      void refresh();
    },
    onError: (err) => {
      toast.error(failureMessage(err, "Could not clock in."));
      void refresh();
    },
  });

  const outMutation = useMutation({
    mutationFn: (entry: TimeClockEntryRead) => clockOut(entry),
    onSuccess: (entry) => {
      queryClient.setQueryData(timeClockKeys.active(user_id), null);
      toast.success(`Clocked out — ${entry.total_hours ?? "0.00"} h this shift`);
      void refresh();
    },
    onError: (err) => {
      toast.error(failureMessage(err, "Could not clock out."));
      void refresh();
    },
  });

  return {
    user_id,
    active,
    is_clocked_in: active != null,
    loading: activeQuery.isLoading,
    error: activeQuery.error,
    elapsed_ms,
    pending: inMutation.isPending || outMutation.isPending,
    clockIn: async () => {
      if (user_id == null) return false;
      return inMutation.mutateAsync().then(() => true, () => false);
    },
    clockOut: async () => {
      if (!active) return false;
      return outMutation.mutateAsync(active).then(() => true, () => false);
    },
  };
}
