// Left rail of the patient inbox: contact card, quick stats, filters, and the
// upcoming-appointment quick actions (send reminder / request confirmation).

import { BellRing, CalendarCheck2, CalendarClock, CheckCircle2, Mail, MessageSquareReply, Phone, ShieldAlert, Smartphone } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { PatientRead } from "@/api/generated/model";
import { SMS_FILTER_LABEL, type SmsFilter, type SmsStats } from "../smsModel";
import { fmtRelative } from "../smsFormat";
import type { AppointmentOption, PhoneOption } from "../hooks/useSmsMergeContext";

interface SmsSidebarProps {
  patient: PatientRead | null;
  phones: PhoneOption[];
  stats: SmsStats;
  filter: SmsFilter;
  onFilter: (f: SmsFilter) => void;
  appointments: AppointmentOption[];
  onSendReminder: (appt: AppointmentOption) => void;
  onRequestConfirmation: (appt: AppointmentOption) => void;
}

const FILTERS: SmsFilter[] = [
  "all",
  "unread",
  "inbound",
  "outbound",
  "appointment_reminder",
  "appointment_confirmation",
  "recall",
  "balance",
  "manual",
  "failed",
];

export default function SmsSidebar({
  patient,
  phones,
  stats,
  filter,
  onFilter,
  appointments,
  onSendReminder,
  onRequestConfirmation,
}: SmsSidebarProps) {
  const upcoming = appointments.filter((a) => a.is_upcoming).slice(0, 4);
  const initials = patient ? `${patient.first_name?.[0] ?? ""}${patient.last_name?.[0] ?? ""}`.toUpperCase() : "?";
  const counts: Partial<Record<SmsFilter, number>> = {
    all: stats.total,
    unread: stats.unread,
    inbound: stats.received,
    outbound: stats.sent,
    failed: stats.failed,
  };

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50/60">
      {/* Contact card */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {patient ? `${patient.first_name} ${patient.last_name}` : "Loading…"}
            </p>
            <p className="text-[11px] text-slate-500">
              {stats.last_activity ? `Last activity ${fmtRelative(stats.last_activity)}` : "No texts yet"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          {phones.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-amber-700">
              <ShieldAlert className="h-3.5 w-3.5" /> No phone number on file
            </p>
          )}
          {phones.map((p) => (
            <p key={p.value} className="flex items-center gap-2 text-xs text-slate-700">
              {p.kind === "cell" ? <Smartphone className="h-3.5 w-3.5 text-slate-400" /> : <Phone className="h-3.5 w-3.5 text-slate-400" />}
              <span className="font-medium">{p.display}</span>
              <span className="text-slate-400">{p.label}</span>
            </p>
          ))}
          {patient?.email && (
            <p className="flex items-center gap-2 truncate text-xs text-slate-700">
              <Mail className="h-3.5 w-3.5 text-slate-400" /> <span className="truncate">{patient.email}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
              patient?.no_auto_sms ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
            )}
          >
            {patient?.no_auto_sms ? "Auto-SMS: opted out" : "Auto-SMS: allowed"}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
              patient?.no_auto_email ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700",
            )}
          >
            {patient?.no_auto_email ? "Auto-email: opted out" : "Auto-email: allowed"}
          </span>
          {patient?.preferred_contact && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
              Prefers: {patient.preferred_contact}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-white">
        {[
          { label: "Sent", value: stats.sent },
          { label: "Received", value: stats.received },
          { label: "Unread", value: stats.unread, hot: stats.unread > 0 },
        ].map((s) => (
          <div key={s.label} className="px-3 py-2 text-center">
            <p className={cn("text-lg font-bold tabular-nums", s.hot ? "text-blue-700" : "text-slate-800")}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="border-b border-slate-200 p-3">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Filter</p>
        <div className="flex flex-col gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilter(f)}
              className={cn(
                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                filter === f ? "bg-white font-semibold text-blue-800 shadow-sm ring-1 ring-blue-200" : "text-slate-700 hover:bg-white",
              )}
            >
              <span>{SMS_FILTER_LABEL[f]}</span>
              {counts[f] != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] tabular-nums",
                    f === "unread" && counts[f] ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600",
                  )}
                >
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reply protocol legend */}
      <div className="border-b border-slate-200 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <MessageSquareReply className="h-3 w-3" /> Patient replies we act on
        </p>
        <div className="grid grid-cols-[44px_1fr] gap-x-2 gap-y-1 px-1 text-[11px]">
          <span className="rounded bg-emerald-100 px-1.5 text-center font-bold text-emerald-800">YES</span>
          <span className="text-slate-600">Confirms the appointment</span>
          <span className="rounded bg-amber-100 px-1.5 text-center font-bold text-amber-800">NO</span>
          <span className="text-slate-600">Declines — cancel + call list</span>
          <span className="rounded bg-red-100 px-1.5 text-center font-bold text-red-800">STOP</span>
          <span className="text-slate-600">Opts out of all texts</span>
        </div>
      </div>

      {/* Upcoming appointments → quick actions */}
      <div className="p-3">
        <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <CalendarClock className="h-3 w-3" /> Upcoming appointments
        </p>
        {upcoming.length === 0 ? (
          <p className="px-1 text-xs text-slate-500">None scheduled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{a.label.split(" · ").slice(0, 2).join(" · ")}</p>
                    <p className="truncate text-[11px] text-slate-500">{a.provider_name}</p>
                  </div>
                  {a.is_confirmed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Confirmed
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSendReminder(a)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-[#1F3A5F] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#2d5080]"
                  >
                    <BellRing className="h-3 w-3" /> Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestConfirmation(a)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarCheck2 className="h-3 w-3" /> Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
