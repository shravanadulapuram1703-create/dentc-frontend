// Shared helpers for the modernized, widget-based Dashboard.
// All API data is snake_case and bound directly to the generated Orval models.
import type { UserRole } from "../../../contexts/AuthContext.js";
import type { AppointmentSchedulerRead } from "@/api/generated/model";
import { components } from "../../../styles/theme.js";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Local calendar date as `YYYY-MM-DD` (matches the backend `date` strings). */
export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** `HH:MM` (24h) -> `h:MM AM/PM`. Accepts `HH:MM` or `HH:MM:SS`. */
export function formatTime(time?: string | null): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? "00"} ${period}`;
}

// ---------------------------------------------------------------------------
// Role buckets (drives role-based dashboard personalization)
// ---------------------------------------------------------------------------

export type DashboardRole = "front_desk" | "dentist" | "manager" | "admin";

/** Collapse the 7 backend roles into the 4 dashboard personas from the plan. */
export function roleBucket(role?: UserRole): DashboardRole {
  switch (role) {
    case "doctor":
    case "provider":
      return "dentist";
    case "manager":
      return "manager";
    case "admin":
    case "owner":
      return "admin";
    case "front_desk":
    case "staff":
    default:
      return "front_desk";
  }
}

export function roleLabel(role?: UserRole): string {
  switch (role) {
    case "owner":
      return "Organization Owner";
    case "admin":
      return "System Administrator";
    case "manager":
      return "Practice Manager";
    case "doctor":
    case "provider":
      return "Healthcare Provider";
    case "front_desk":
      return "Front Desk";
    case "staff":
      return "Team Member";
    default:
      return "Staff Member";
  }
}

// ---------------------------------------------------------------------------
// Appointment status derivation (from the reliable boolean/timestamp flags on
// AppointmentSchedulerRead — independent of the tenant's free-text status enum)
// ---------------------------------------------------------------------------

export type ApptTone = "teal" | "blue" | "amber" | "red" | "neutral";

export interface ApptDisplayStatus {
  label: string;
  tone: ApptTone;
  badgeClass: string;
}

const toneBadge: Record<ApptTone, string> = {
  teal: components.badgeSuccess,
  blue: components.badgeInfo,
  amber: components.badgeWarning,
  red: components.badgeError,
  neutral: components.badgeNeutral,
};

export function badgeClassForTone(tone: ApptTone): string {
  return toneBadge[tone];
}

/**
 * Derive a display status from the server-stamped flags. Prefers the canonical
 * booleans/timestamps over the free-text `status` string so it is correct
 * regardless of how each tenant labels its `appt_status` definitions.
 */
export function deriveApptStatus(a: AppointmentSchedulerRead): ApptDisplayStatus {
  if (a.is_blocked) return { label: "Blocked", tone: "neutral", badgeClass: toneBadge.neutral };
  if (a.is_cancelled) return { label: "Cancelled", tone: "red", badgeClass: toneBadge.red };
  if (a.is_missed) return { label: "No Show", tone: "red", badgeClass: toneBadge.red };
  if (a.checked_out_on) return { label: "Checked Out", tone: "teal", badgeClass: toneBadge.teal };
  if (a.checked_in_on) return { label: "Checked In", tone: "blue", badgeClass: toneBadge.blue };
  if (a.confirmed_on) return { label: a.status || "Confirmed", tone: "teal", badgeClass: toneBadge.teal };
  return { label: a.status || "Scheduled", tone: "amber", badgeClass: toneBadge.amber };
}

// ---------------------------------------------------------------------------
// KPI bucketing for "Today's Appointments"
// ---------------------------------------------------------------------------

export interface AppointmentKpis {
  total: number;
  checkedIn: number; // checked in, not yet checked out
  scheduled: number; // upcoming: not checked in / cancelled / missed
  completed: number; // checked out
  cancelled: number;
  noShow: number;
}

/** Bucket a day's denormalized scheduler feed into KPI counts (blocked slots excluded). */
export function bucketAppointmentKpis(rows: AppointmentSchedulerRead[]): AppointmentKpis {
  const kpis: AppointmentKpis = {
    total: 0,
    checkedIn: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  };
  for (const a of rows) {
    if (a.is_blocked) continue;
    kpis.total += 1;
    if (a.is_cancelled) {
      kpis.cancelled += 1;
      continue;
    }
    if (a.is_missed) {
      kpis.noShow += 1;
      continue;
    }
    if (a.checked_out_on) {
      kpis.completed += 1;
    } else if (a.checked_in_on) {
      kpis.checkedIn += 1;
    } else {
      kpis.scheduled += 1;
    }
  }
  return kpis;
}
