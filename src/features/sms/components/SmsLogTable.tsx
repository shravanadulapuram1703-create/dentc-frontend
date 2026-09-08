// Audit-style table of every text for the patient — the "log" view used by the
// SMS/Email screen. Row click opens the details pane; CSV export is client-side.

import { ArrowDownLeft, ArrowUpRight, Download } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { REPLY_INTENT_LABEL, SMS_MESSAGE_TYPE_LABEL, type SmsEntry } from "../smsModel";
import { formatPhone } from "../phone";
import { fmtDateTime } from "../smsFormat";
import SmsStatusBadge from "./SmsStatusBadge";
import { exportSmsCsv } from "../smsCsv";

interface SmsLogTableProps {
  entries: SmsEntry[];
  loading: boolean;
  selectedKey: string | null;
  onSelect: (entry: SmsEntry) => void;
  patientLabel: string;
}

export default function SmsLogTable({ entries, loading, selectedKey, onSelect, patientLabel }: SmsLogTableProps) {
  // Newest first for a log.
  const rows = [...entries].reverse();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <p className="text-xs text-slate-500">
          {loading ? "Loading…" : `${rows.length} message${rows.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => exportSmsCsv(entries, patientLabel)}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[860px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">When</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Dir</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Type</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Phone</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Message</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Status</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Appt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  No messages match the current filter.
                </td>
              </tr>
            )}
            {rows.map((e) => {
              const out = e.direction === "outbound";
              const unread = !out && !e.is_read;
              return (
                <tr
                  key={e.key}
                  onClick={() => onSelect(e)}
                  className={cn(
                    "cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/50",
                    selectedKey === e.key && "bg-blue-50",
                    unread && "font-semibold",
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{fmtDateTime(e.at)}</td>
                  <td className="px-3 py-2">
                    {out ? (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#1F3A5F]" /> Out
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sky-700">
                        <ArrowDownLeft className="h-3.5 w-3.5" /> In
                        {unread && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {out ? SMS_MESSAGE_TYPE_LABEL[e.message_type] : e.intent ? REPLY_INTENT_LABEL[e.intent] : "Reply"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-600">
                    {e.phone ? formatPhone(e.phone) : "—"}
                  </td>
                  <td className="max-w-[420px] px-3 py-2 text-slate-800">
                    <span className="line-clamp-2">{e.body}</span>
                  </td>
                  <td className="px-3 py-2">
                    <SmsStatusBadge status={e.status} />
                  </td>
                  <td className="px-3 py-2 text-slate-500">{e.appointment_id ? "Linked" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
