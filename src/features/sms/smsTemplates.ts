// SMS templates + merge fields.
//
// There is no `sms-templates` backend resource yet (gap SMS-5 in
// docs/sms/SMS_BACKEND_DEVREPORT.md); the built-in templates below ship with
// the app and any practice-authored ones persist in localStorage
// (`dentc:sms:templates`) until the backend exists.

import type { SmsMessageType } from "./smsModel";

export interface SmsTemplate {
  id: string;
  name: string;
  message_type: SmsMessageType;
  body: string;
  /** Built-in templates cannot be deleted (they can be duplicated + edited). */
  builtin: boolean;
  /** True when the body references an appointment merge field. */
  needs_appointment: boolean;
}

/** Values available to `{{merge_field}}` placeholders. */
export interface SmsMergeContext {
  patient_first_name: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_datetime: string;
  provider_name: string;
  office_name: string;
  office_phone: string;
}

export const MERGE_FIELDS: { key: keyof SmsMergeContext; label: string; appointment: boolean }[] = [
  { key: "patient_first_name", label: "First name", appointment: false },
  { key: "patient_name", label: "Full name", appointment: false },
  { key: "appointment_datetime", label: "Appt date & time", appointment: true },
  { key: "appointment_date", label: "Appt date", appointment: true },
  { key: "appointment_time", label: "Appt time", appointment: true },
  { key: "provider_name", label: "Provider", appointment: true },
  { key: "office_name", label: "Office name", appointment: false },
  { key: "office_phone", label: "Office phone", appointment: false },
];

const APPT_KEYS = new Set(MERGE_FIELDS.filter((f) => f.appointment).map((f) => f.key));

export function templateNeedsAppointment(body: string): boolean {
  return [...body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].some((m) => APPT_KEYS.has(m[1] as keyof SmsMergeContext));
}

/**
 * The one line every appointment text ends with, so patients always know the
 * three replies the practice acts on. Keep it in sync with REPLY_KEYWORDS in
 * smsModel.ts and the backend webhook (SMS-2).
 */
export const REPLY_INSTRUCTIONS = "Reply YES to confirm, NO to decline, or STOP to opt out of texts.";

/** True when the body already carries (some form of) the reply instructions. */
export function hasReplyInstructions(body: string): boolean {
  return /\breply\s+(yes|y|c)\b/i.test(body) && /\bstop\b/i.test(body);
}

/** Append the standard instructions unless the text already explains how to reply. */
export function ensureReplyInstructions(body: string): string {
  const b = body.trim();
  if (!b || hasReplyInstructions(b)) return b;
  return `${b} ${REPLY_INSTRUCTIONS}`;
}

export const BUILTIN_TEMPLATES: SmsTemplate[] = [
  {
    id: "builtin:appointment_reminder",
    name: "Appointment reminder",
    message_type: "appointment_reminder",
    body:
      "Hi {{patient_first_name}}, this is {{office_name}}. Reminder: your appointment is {{appointment_datetime}} with {{provider_name}}. Reply YES to confirm, NO to decline, or STOP to opt out of texts. Questions? Call {{office_phone}}.",
    builtin: true,
    needs_appointment: true,
  },
  {
    id: "builtin:appointment_confirmation",
    name: "Confirmation request",
    message_type: "appointment_confirmation",
    body:
      "Hi {{patient_first_name}}, your appointment at {{office_name}} is booked for {{appointment_datetime}} with {{provider_name}}. Reply YES to confirm, NO to decline, or STOP to opt out of texts.",
    builtin: true,
    needs_appointment: true,
  },
  {
    id: "builtin:day_of",
    name: "Day-of reminder",
    message_type: "appointment_reminder",
    body:
      "See you today at {{appointment_time}}, {{patient_first_name}}! Please arrive 10 minutes early. Reply YES to confirm, NO to decline, or STOP to opt out of texts. {{office_name}} {{office_phone}}",
    builtin: true,
    needs_appointment: true,
  },
  {
    id: "builtin:recall",
    name: "Recall / due for cleaning",
    message_type: "recall",
    body:
      "Hi {{patient_first_name}}, it's time for your cleaning and check-up at {{office_name}}. Call {{office_phone}} or reply to this text to schedule.",
    builtin: true,
    needs_appointment: false,
  },
  {
    id: "builtin:balance",
    name: "Balance due",
    message_type: "balance",
    body:
      "Hi {{patient_first_name}}, {{office_name}} shows a balance on your account. Please call {{office_phone}} to make a payment or ask a question. Thank you!",
    builtin: true,
    needs_appointment: false,
  },
  {
    id: "builtin:thank_you",
    name: "Thank you for visiting",
    message_type: "manual",
    body:
      "Thank you for visiting {{office_name}} today, {{patient_first_name}}! If you have any questions about your visit, call {{office_phone}}.",
    builtin: true,
    needs_appointment: false,
  },
];

const STORAGE_KEY = "dentc:sms:templates";

export function loadCustomTemplates(): SmsTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SmsTemplate[];
    return Array.isArray(parsed) ? parsed.map((t) => ({ ...t, builtin: false })) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: SmsTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.filter((t) => !t.builtin)));
  } catch {
    /* storage unavailable — templates stay in memory for the session */
  }
}

export function allTemplates(): SmsTemplate[] {
  return [...BUILTIN_TEMPLATES, ...loadCustomTemplates()];
}

export function newTemplateId(): string {
  return `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Replace `{{merge_field}}` placeholders. Unknown / empty fields render as a
 * visible `[field]` marker so nobody sends a text with a blank in it.
 */
export function renderTemplate(body: string, ctx: Partial<SmsMergeContext>): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => {
    const v = ctx[key as keyof SmsMergeContext];
    return v && v.trim() ? v : `[${key.replace(/_/g, " ")}]`;
  });
}

/** True when a rendered body still contains an unfilled `[field]` marker. */
export function hasUnfilledMerge(rendered: string): boolean {
  return /\[(patient first name|patient name|appointment date|appointment time|appointment datetime|provider name|office name|office phone)\]/.test(
    rendered,
  );
}
