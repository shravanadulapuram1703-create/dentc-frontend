// Small date/validation helpers for the public booking flow. Kept dependency-free
// and local-timezone-safe (parse/format ISO dates from calendar parts, never via
// `new Date("YYYY-MM-DD")` which is UTC and causes off-by-one day bugs).

import type { BookingContactDetails } from "../transport/types";

/** Today's local calendar date as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return toIso(d);
}

/** A Date → YYYY-MM-DD in local time. */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD → local Date (midnight). */
export function fromIso(iso: string): Date {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

/** Shift an ISO date by n days. */
export function addDaysIso(iso: string, n: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** "Mon, Jul 31" style label for a header. */
export function formatDateLong(iso: string): string {
  return fromIso(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "9:00 AM" from "09:00". */
export function formatTime12(hhmm: string): string {
  const parts = hhmm.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** True when the slot starts before noon. */
export function isMorning(hhmm: string): boolean {
  return Number(hhmm.split(":")[0]) < 12;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactErrors = Partial<Record<keyof BookingContactDetails, string>>;

/** Validate the public contact form; returns a map of field → message. */
export function validateContact(c: BookingContactDetails): ContactErrors {
  const errors: ContactErrors = {};
  if (!c.first_name.trim()) errors.first_name = "First name is required.";
  if (!c.last_name.trim()) errors.last_name = "Last name is required.";
  // Count total digits (formatted numbers have separators), require ≥ 7.
  const phoneDigits = c.phone.replace(/\D/g, "");
  if (!c.phone.trim()) errors.phone = "Phone number is required.";
  else if (phoneDigits.length < 7) errors.phone = "Enter a valid phone number.";
  if (!c.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(c.email)) errors.email = "Enter a valid email address.";
  return errors;
}
