// Client-side CSV export of a patient's SMS log.

import { REPLY_INTENT_LABEL, SMS_MESSAGE_TYPE_LABEL, type SmsEntry } from "./smsModel";
import { formatPhone } from "./phone";
import { fmtDateTime } from "./smsFormat";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportSmsCsv(entries: SmsEntry[], patientLabel: string) {
  const header = ["When", "Direction", "Type", "Phone", "Status", "Message", "Appointment", "Log row"];
  const lines = entries.map((e) =>
    [
      fmtDateTime(e.at),
      e.direction,
      e.direction === "outbound" ? SMS_MESSAGE_TYPE_LABEL[e.message_type] : e.intent ? REPLY_INTENT_LABEL[e.intent] : "Reply",
      e.phone ? formatPhone(e.phone) : "",
      e.status,
      e.body,
      e.appointment_id ?? "",
      e.row_id,
    ]
      .map(csvEscape)
      .join(","),
  );
  const blob = new Blob([`${String.fromCharCode(0xfeff)}${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sms-log-${patientLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

