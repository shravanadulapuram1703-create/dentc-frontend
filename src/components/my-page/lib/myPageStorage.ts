// Per-user, client-side persistence for the personalized My Page.
//
// The DentC backend has no "my page" resource — no personal task list, favorite
// links, dashboard layout, or notification-preference endpoints (see
// docs/dashboard/dashboard_backend_devreport.md). Rather than fake this data,
// My Page persists these genuinely-user-owned bits to localStorage, keyed per
// user so two people sharing a browser keep separate task lists / favorites.
//
// Everything here is real, durable state the user controls — not mock data.
// When the backend grows real endpoints these helpers become the swap point.

const NS = "dentc:my-page";

function key(userId: string | undefined, bucket: string): string {
  return `${NS}:${bucket}:${userId ?? "anon"}`;
}

function read<T>(userId: string | undefined, bucket: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(userId, bucket));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(userId: string | undefined, bucket: string, value: T): void {
  try {
    localStorage.setItem(key(userId, bucket), JSON.stringify(value));
  } catch {
    /* quota / disabled storage — non-fatal, state simply won't persist */
  }
}

// ---------------------------------------------------------------------------
// Personal tasks (a private to-do list on the user's home page)
// ---------------------------------------------------------------------------

export type TaskPriority = "high" | "normal" | "low";

export interface MyTask {
  id: string;
  title: string;
  priority: TaskPriority;
  done: boolean;
  /** `YYYY-MM-DD`, optional soft due date. */
  due?: string | null;
  created_at: string;
}

export function loadTasks(userId?: string): MyTask[] {
  return read<MyTask[]>(userId, "tasks", []);
}

export function saveTasks(userId: string | undefined, tasks: MyTask[]): void {
  write(userId, "tasks", tasks);
}

// ---------------------------------------------------------------------------
// Quick links / favorites (the user's own shortcuts to modules)
// ---------------------------------------------------------------------------

export interface QuickLink {
  id: string;
  label: string;
  /** Key into the QUICK_LINK_CATALOG icon map. */
  icon: string;
  to: string;
}

/** First-run default shortcuts — the user can add/remove freely thereafter. */
export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: "ql-scheduler", label: "Scheduler", icon: "calendar", to: "/scheduler" },
  { id: "ql-patients", label: "Patients", icon: "users", to: "/patient?switch=1" },
  { id: "ql-new-patient", label: "New Patient", icon: "userPlus", to: "/patient/new" },
  { id: "ql-reports", label: "Reports", icon: "reports", to: "/reports" },
];

export function loadQuickLinks(userId?: string): QuickLink[] {
  return read<QuickLink[]>(userId, "quick-links", DEFAULT_QUICK_LINKS);
}

export function saveQuickLinks(userId: string | undefined, links: QuickLink[]): void {
  write(userId, "quick-links", links);
}

// ---------------------------------------------------------------------------
// Notification preferences (local until a backend prefs endpoint exists)
// ---------------------------------------------------------------------------

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  appointment_reminders: boolean;
  task_reminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  sms: false,
  appointment_reminders: true,
  task_reminders: true,
};

export function loadNotificationPrefs(userId?: string): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...read(userId, "notif-prefs", {}) };
}

export function saveNotificationPrefs(userId: string | undefined, prefs: NotificationPrefs): void {
  write(userId, "notif-prefs", prefs);
}

// ---------------------------------------------------------------------------
// Collapsed-section memory (which panels the user has folded away)
// ---------------------------------------------------------------------------

export function loadCollapsed(userId?: string): Record<string, boolean> {
  return read<Record<string, boolean>>(userId, "collapsed", {});
}

export function saveCollapsed(userId: string | undefined, state: Record<string, boolean>): void {
  write(userId, "collapsed", state);
}
