// Personal, provider-scoped derivations for My Page, all built from data the
// office Dashboard already fetches (the denormalized scheduler feed + recalls),
// so opening My Page adds no new heavy requests when the Dashboard cache is warm.
import { useMemo } from "react";
import type { AppointmentSchedulerRead } from "@/api/generated/model";
import { useTodayScheduler } from "../../dashboard/lib/useDashboardData";
import { useRecallDue } from "../../dashboard/lib/useMetrics";

export interface MyScheduleResult {
  isLoading: boolean;
  isError: boolean;
  /** True when the feed was narrowed to this user's provider id. */
  scoped: boolean;
  /** Today's appointments for the current user (or the whole office if unscoped). */
  rows: AppointmentSchedulerRead[];
  /** Counts over `rows`. */
  total: number;
  remaining: number; // scheduled, not yet checked in / cancelled / missed
  checkedIn: number;
  completed: number;
}

/**
 * Today's schedule narrowed to the signed-in provider.
 *
 * `providerId` comes from the user's `report_access_provider_id`. When present
 * we filter the office feed to that provider (the user's own chair); when null
 * (front-desk / admin accounts, which aren't providers) we return the full
 * office feed and flag `scoped: false` so the UI can label it honestly.
 */
export function useMySchedule(
  currentOffice: string,
  providerId?: string | null,
): MyScheduleResult {
  const { rows, isLoading, isError } = useTodayScheduler(currentOffice);

  return useMemo(() => {
    const active = rows.filter((r) => !r.is_blocked);
    const scoped = Boolean(providerId);
    const mine = scoped
      ? active.filter((r) => String(r.provider_id) === String(providerId))
      : active;

    let remaining = 0;
    let checkedIn = 0;
    let completed = 0;
    for (const a of mine) {
      if (a.is_cancelled || a.is_missed) continue;
      if (a.checked_out_on) completed += 1;
      else if (a.checked_in_on) checkedIn += 1;
      else remaining += 1;
    }

    const sorted = [...mine].sort((a, b) => a.start_time.localeCompare(b.start_time));

    return {
      isLoading,
      isError,
      scoped,
      rows: sorted,
      total: mine.length,
      remaining,
      checkedIn,
      completed,
    };
  }, [rows, providerId, isLoading, isError]);
}

// ---------------------------------------------------------------------------
// Alerts — a prioritized feed derived from real data, no backend notif table
// ---------------------------------------------------------------------------

export type AlertTone = "red" | "amber" | "blue";

export interface MyAlert {
  id: string;
  tone: AlertTone;
  title: string;
  detail: string;
  to?: string;
  count?: number;
}

/**
 * Build the "Alerts & Reminders" feed from live office data: no-shows and
 * unconfirmed appointments from today's feed, plus overdue/due-today recalls.
 * Everything here is actionable and real — each alert links to where it's resolved.
 */
export function useMyAlerts(currentOffice: string): {
  alerts: MyAlert[];
  isLoading: boolean;
} {
  const { rows, isLoading: schedLoading } = useTodayScheduler(currentOffice);
  const recallQuery = useRecallDue(currentOffice);

  const alerts = useMemo<MyAlert[]>(() => {
    const out: MyAlert[] = [];
    const active = rows.filter((r) => !r.is_blocked);

    const noShow = active.filter((r) => r.is_missed).length;
    const unconfirmed = active.filter(
      (r) => !r.confirmed_on && !r.checked_in_on && !r.is_cancelled && !r.is_missed,
    ).length;

    const recall = recallQuery.data;
    const overdueRecall = recall?.overdue ?? 0;
    const dueTodayRecall = recall?.dueToday ?? 0;

    if (noShow > 0) {
      out.push({
        id: "no-shows",
        tone: "red",
        title: `${noShow} no-show${noShow > 1 ? "s" : ""} today`,
        detail: "Follow up to reschedule missed appointments.",
        to: "/scheduler",
        count: noShow,
      });
    }
    if (overdueRecall > 0) {
      out.push({
        id: "overdue-recalls",
        tone: "red",
        title: `${overdueRecall} overdue recall${overdueRecall > 1 ? "s" : ""}`,
        detail: "Patients past their hygiene recall date.",
        to: "/reports",
        count: overdueRecall,
      });
    }
    if (unconfirmed > 0) {
      out.push({
        id: "unconfirmed",
        tone: "amber",
        title: `${unconfirmed} unconfirmed appointment${unconfirmed > 1 ? "s" : ""}`,
        detail: "Confirm today's remaining appointments.",
        to: "/scheduler",
        count: unconfirmed,
      });
    }
    if (dueTodayRecall > 0) {
      out.push({
        id: "recalls-today",
        tone: "blue",
        title: `${dueTodayRecall} recall${dueTodayRecall > 1 ? "s" : ""} due today`,
        detail: "Reach out to schedule these patients.",
        to: "/reports",
        count: dueTodayRecall,
      });
    }

    return out;
  }, [rows, recallQuery.data]);

  return { alerts, isLoading: schedLoading || recallQuery.isLoading };
}
