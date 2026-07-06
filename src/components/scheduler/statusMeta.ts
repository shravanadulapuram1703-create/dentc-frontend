/**
 * Appointment status metadata — the legacy Denticon "Set Status" vocabulary.
 *
 * The PDF (M03 Understanding Appointments) splits statuses into three groups:
 *  - Confirmation statuses: Scheduled, Confirmed, Unconfirmed, Left Message
 *  - Same-day statuses:     In Reception, Available, In Operatory, Checked Out
 *  - Terminal statuses:     Missed (strikethrough, stays on grid), Cancelled
 *
 * Each status has a single-letter icon (the S·C·U·L·R·A·O·H quick-status bar in
 * the toolbar) and a color. Colors here are legacy-faithful defaults; when the
 * backend `definitions` (group_code `appt_status`) supplies a `color`, that wins
 * — see `statusColorFor` which the Scheduler feeds from fetchAppointmentStatuses.
 */
import type { AppointmentStatusName } from "../../services/schedulerApi";

export type StatusGroup = "confirmation" | "sameday" | "terminal";

export interface StatusMeta {
  name: AppointmentStatusName;
  /** Single-char badge used in the quick-status bar and on appointment blocks. */
  letter: string;
  /** Context-menu label ("Set as …"). */
  label: string;
  /** Default background hex (overridable by backend definition color). */
  color: string;
  /** Readable foreground for `color`. */
  text: string;
  group: StatusGroup;
}

export const STATUS_META: Record<AppointmentStatusName, StatusMeta> = {
  Scheduled: { name: "Scheduled", letter: "S", label: "Set as Scheduled", color: "#94A3B8", text: "#FFFFFF", group: "confirmation" },
  Confirmed: { name: "Confirmed", letter: "C", label: "Set as Confirmed", color: "#2563EB", text: "#FFFFFF", group: "confirmation" },
  Unconfirmed: { name: "Unconfirmed", letter: "U", label: "Set as Unconfirmed", color: "#F59E0B", text: "#FFFFFF", group: "confirmation" },
  "Left Message": { name: "Left Message", letter: "L", label: "Set as Left Message", color: "#EAB308", text: "#1E293B", group: "confirmation" },
  "In Reception": { name: "In Reception", letter: "R", label: "Set as In Reception", color: "#8B5CF6", text: "#FFFFFF", group: "sameday" },
  Available: { name: "Available", letter: "A", label: "Set as Available", color: "#EF4444", text: "#FFFFFF", group: "sameday" },
  "In Operatory": { name: "In Operatory", letter: "O", label: "Set as In Operatory", color: "#F97316", text: "#FFFFFF", group: "sameday" },
  "Checked Out": { name: "Checked Out", letter: "H", label: "Set as Checked Out", color: "#16A34A", text: "#FFFFFF", group: "sameday" },
  Missed: { name: "Missed", letter: "M", label: "Set as Missed", color: "#DC2626", text: "#FFFFFF", group: "terminal" },
  Cancelled: { name: "Cancelled", letter: "X", label: "Set as Cancelled", color: "#64748B", text: "#FFFFFF", group: "terminal" },
};

/** Order of the quick-status toolbar (Option 1 in the PDF): S C U L R A O H. */
export const QUICK_STATUS_ORDER: AppointmentStatusName[] = [
  "Scheduled",
  "Confirmed",
  "Unconfirmed",
  "Left Message",
  "In Reception",
  "Available",
  "In Operatory",
  "Checked Out",
];

export const CONFIRMATION_STATUSES: AppointmentStatusName[] = [
  "Scheduled",
  "Confirmed",
  "Unconfirmed",
  "Left Message",
];

export const SAMEDAY_STATUSES: AppointmentStatusName[] = [
  "In Reception",
  "Available",
  "In Operatory",
  "Checked Out",
];

export const TERMINAL_STATUSES: AppointmentStatusName[] = ["Missed", "Cancelled"];

/** Cancellation reasons from the legacy cancel dialog (PDF page 16). */
export const CANCELLATION_REASONS: string[] = [
  "Automated cancellation",
  "Cancelled and rescheduled",
  "Cancelled by email",
  "Cancelled by office",
  "Cancelled NOT rescheduled",
  "Cancelled same day",
  "No reason provided",
];

const isKnownStatus = (name: string): name is AppointmentStatusName =>
  Object.prototype.hasOwnProperty.call(STATUS_META, name);

export const statusMetaFor = (name: string | null | undefined): StatusMeta =>
  (name && isKnownStatus(name) && STATUS_META[name]) || STATUS_META.Scheduled;

/**
 * Resolve the color for a status, preferring a backend-supplied color (from the
 * `appt_status` definitions) and falling back to the legacy default.
 */
export const statusColorFor = (
  name: string | null | undefined,
  backendColors?: Map<string, string>,
): string => {
  const fromBackend = name ? backendColors?.get(name) : undefined;
  return fromBackend || statusMetaFor(name).color;
};
