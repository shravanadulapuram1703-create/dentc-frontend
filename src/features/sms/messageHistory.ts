// One timeline for the combined Messages window: texts + e-mails, newest first.

import type { EmailEntry } from "./emailModel";
import type { SmsEntry } from "./smsModel";

export type HistoryItem =
  | { channel: "sms"; key: string; at: string; sms: SmsEntry }
  | { channel: "email"; key: string; at: string; email: EmailEntry };

/** Merge both channels into one list, newest first. */
export function buildHistory(sms: SmsEntry[], email: EmailEntry[]): HistoryItem[] {
  const items: HistoryItem[] = [
    ...sms.map((e) => ({ channel: "sms" as const, key: `sms:${e.key}`, at: e.at, sms: e })),
    ...email.map((e) => ({ channel: "email" as const, key: e.key, at: e.at, email: e })),
  ];
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
