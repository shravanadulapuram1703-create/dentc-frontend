// Saved filter combinations ("views") per report, persisted in localStorage.
// Optional convenience enhancement — lets a user re-run a frequent filter set in
// one click without any backend (no schedules endpoint exists; devreport gap #4).
import type { ReportFilters } from "../types";

/** The subset of filters we persist (the concrete date range is re-derived from preset unless custom). */
export interface SavedView {
  id: string;
  name: string;
  filters: ReportFilters;
  createdAt: string;
}

const KEY = (reportId: string) => `dentc:reports:views:${reportId}`;

export function loadViews(reportId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(KEY(reportId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(reportId: string, views: SavedView[]): void {
  try {
    localStorage.setItem(KEY(reportId), JSON.stringify(views));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

/** Add a view and return the updated list. Uses a time+counter id (Date.now allowed in app code). */
export function addView(reportId: string, name: string, filters: ReportFilters): SavedView[] {
  const views = loadViews(reportId);
  const view: SavedView = {
    id: `${Date.now()}-${views.length}`,
    name: name.trim() || "Untitled view",
    filters,
    createdAt: new Date().toISOString(),
  };
  const next = [...views, view];
  persist(reportId, next);
  return next;
}

export function removeView(reportId: string, viewId: string): SavedView[] {
  const next = loadViews(reportId).filter((v) => v.id !== viewId);
  persist(reportId, next);
  return next;
}
