// Saved filter combinations ("views") per report, persisted in localStorage.
// Optional convenience enhancement — lets a user re-run a frequent filter set in
// one click without any backend (no schedules endpoint exists; devreport gap #4).
//
// Storage is namespaced PER USER (`dentc:reports:views:<user_id>:<reportId>`),
// like the persistent last-patient / last-office keys, so two people sharing a
// browser never see each other's views. Pure functions take `user_id` so the
// caller (ReportShell) resolves it from `useAuth()`. Views saved under the old
// un-namespaced key are not migrated.
import type { ReportFilters } from "../types";

/** The subset of filters we persist (the concrete date range is re-derived from preset unless custom). */
export interface SavedView {
  id: string;
  name: string;
  filters: ReportFilters;
  createdAt: string;
}

/** Prefix for every per-user saved-views key. */
export const SAVED_VIEWS_PREFIX = "dentc:reports:views:";

/** Callers without a signed-in user (should not happen behind auth) share this bucket. */
const ANONYMOUS_USER = "anon";

export function savedViewsKey(user_id: string | null | undefined, reportId: string): string {
  return `${SAVED_VIEWS_PREFIX}${user_id || ANONYMOUS_USER}:${reportId}`;
}

export function loadViews(user_id: string | null | undefined, reportId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(savedViewsKey(user_id, reportId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(user_id: string | null | undefined, reportId: string, views: SavedView[]): void {
  try {
    localStorage.setItem(savedViewsKey(user_id, reportId), JSON.stringify(views));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

/** Add a view and return the updated list. Uses a time+counter id (Date.now allowed in app code). */
export function addView(
  user_id: string | null | undefined,
  reportId: string,
  name: string,
  filters: ReportFilters,
): SavedView[] {
  const views = loadViews(user_id, reportId);
  const view: SavedView = {
    id: `${Date.now()}-${views.length}`,
    name: name.trim() || "Untitled view",
    filters,
    createdAt: new Date().toISOString(),
  };
  const next = [...views, view];
  persist(user_id, reportId, next);
  return next;
}

export function removeView(user_id: string | null | undefined, reportId: string, viewId: string): SavedView[] {
  const next = loadViews(user_id, reportId).filter((v) => v.id !== viewId);
  persist(user_id, reportId, next);
  return next;
}
