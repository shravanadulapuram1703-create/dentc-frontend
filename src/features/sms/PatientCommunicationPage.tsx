// Patient → SMS/Email: the communication LOG (/patient/:id/communication).
//
// Same data as the Messages inbox, presented as an auditable table with
// filters, search, CSV export and a details pane; "New text" opens the shared
// composer in a dialog. The Email tab is a labelled placeholder — there is no
// email log/send resource in the backend yet (gap EMAIL-1).

import { useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Mail, MessageSquare, MessageSquarePlus, RefreshCw, Search } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyFilter, SMS_FILTER_LABEL, type SmsFilter } from "./smsModel";
import { usePatientSms } from "./hooks/usePatientSms";
import { useFillHeight } from "./hooks/useFillHeight";
import { useSmsMergeContext } from "./hooks/useSmsMergeContext";
import SmsLogTable from "./components/SmsLogTable";
import SmsDetailsPanel from "./components/SmsDetailsPanel";
import SmsComposer, { type ComposerHandle, type ComposerSubmit } from "./components/SmsComposer";
import SmsModeBanner from "./components/SmsModeBanner";

interface OutletContext {
  patient: { id: string; name: string; officeId?: string };
}

type Tab = "sms" | "email";

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

export default function PatientCommunicationPage() {
  const { patient: shellPatient } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const patient_id = Number(shellPatient.id);
  const office_hint = shellPatient.officeId ? Number(shellPatient.officeId) : null;

  const sms = usePatientSms(patient_id);
  const fill = useFillHeight();
  const merge = useSmsMergeContext(patient_id, office_hint);

  const [tab, setTab] = useState<Tab>("sms");
  const [filter, setFilter] = useState<SmsFilter>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const composerRef = useRef<ComposerHandle>(null);

  const visible = useMemo(() => {
    let list = applyFilter(sms.entries, filter, search);
    if (from) list = list.filter((e) => e.at.slice(0, 10) >= from);
    if (to) list = list.filter((e) => e.at.slice(0, 10) <= to);
    return list;
  }, [sms.entries, filter, search, from, to]);
  const selected = useMemo(() => sms.entries.find((e) => e.key === selectedKey) ?? null, [sms.entries, selectedKey]);

  const office_id = merge.office?.id ?? office_hint;

  const handleSend = async (payload: ComposerSubmit) => {
    const row = await sms.send({ ...payload, office_id });
    if (row) {
      setComposeOpen(false);
      if (sms.capability === "log_only") toast.warning("Saved to the SMS log as Queued — the Twilio gateway is not deployed yet.");
      else toast.success(sms.capability === "simulated" ? "Demo text sent" : "Text sent");
    }
  };

  return (
    <div ref={fill.ref} style={fill.style} className="min-h-[520px] bg-[#F7F9FC]">
      <div className="flex h-full flex-col overflow-hidden border-t border-slate-200 bg-white">
        {/* Header + tabs */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">SMS / Email log</h1>
            <p className="text-[11px] text-slate-500">Every automated and manual message exchanged with {shellPatient.name}</p>
          </div>

          <div className="ml-6 flex rounded-lg bg-slate-100 p-0.5">
            {(
              [
                { id: "sms", label: "SMS", icon: MessageSquare, count: sms.stats.total },
                { id: "email", label: "Email", icon: Mail, count: 0 },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                  tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                <span className="rounded-full bg-slate-200 px-1.5 text-[10px] tabular-nums text-slate-600">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void sms.refetch()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", sms.isFetching && "animate-spin")} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate(`/patient/${shellPatient.id}/messages`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Conversation view
            </button>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              disabled={merge.phones.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1F3A5F] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#2d5080] disabled:opacity-50"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" /> New text
            </button>
          </div>
        </div>

        <SmsModeBanner mode={sms.mode} capability={sms.capability} />

        {tab === "sms" ? (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search text or phone"
                    className="h-8 w-56 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as SmsFilter)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  {FILTERS.map((f) => (
                    <option key={f} value={f}>
                      {SMS_FILTER_LABEL[f]}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  From
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs" />
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  To
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs" />
                </label>
                {(filter !== "all" || search || from || to) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("all");
                      setSearch("");
                      setFrom("");
                      setTo("");
                    }}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
                <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
                  <span>
                    <b className="text-slate-800">{sms.stats.sent}</b> sent
                  </span>
                  <span>
                    <b className="text-slate-800">{sms.stats.received}</b> received
                  </span>
                  <span className={cn(sms.stats.unread > 0 && "text-blue-700")}>
                    <b>{sms.stats.unread}</b> unread
                  </span>
                  <span className={cn(sms.stats.failed > 0 && "text-red-700")}>
                    <b>{sms.stats.failed}</b> failed
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <SmsLogTable
                  entries={visible}
                  loading={sms.isLoading}
                  selectedKey={selectedKey}
                  onSelect={(e) => {
                    setSelectedKey(e.key === selectedKey ? null : e.key);
                    if (e.direction === "inbound" && !e.is_read && e.row_id > 0) void sms.markRead(e.row_id, true);
                  }}
                  patientLabel={shellPatient.name}
                />
              </div>
            </div>

            {selected && (
              <SmsDetailsPanel
                entry={selected}
                patient_id={patient_id}
                patientOptedOut={merge.sms_opted_out}
                appointments={merge.appointments}
                onClose={() => setSelectedKey(null)}
                onToggleRead={(e, is_read) => {
                  if (e.row_id > 0) void sms.markRead(e.row_id, is_read);
                }}
                onResend={(e) => {
                  setComposeOpen(true);
                  requestAnimationFrame(() => composerRef.current?.setBody(e.body));
                }}
                onReply={() => setComposeOpen(true)}
              />
            )}
          </div>
        ) : (
          <EmailPlaceholder email={merge.patient?.email ?? null} optedOut={!!merge.patient?.no_auto_email} />
        )}
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New text message</DialogTitle>
            <DialogDescription>To {shellPatient.name}. The message is recorded in the SMS log.</DialogDescription>
          </DialogHeader>
          <SmsComposer
            ref={composerRef}
            compact
            phones={merge.phones}
            appointments={merge.appointments}
            buildContext={merge.buildContext}
            optedOut={merge.sms_opted_out}
            capability={sms.capability}
            sending={sms.sending}
            onSend={handleSend}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmailPlaceholder({ email, optedOut }: { email: string | null; optedOut: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Mail className="h-7 w-7" />
      </div>
      <h2 className="text-base font-semibold text-slate-800">Email log is not available yet</h2>
      <p className="max-w-md text-sm text-slate-500">
        The backend has no email send/log resource (gap EMAIL-1 in docs/sms/SMS_BACKEND_DEVREPORT.md). Once it ships, this
        tab will list every automated and manual email the same way the SMS tab does.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{email ? `Patient email: ${email}` : "No email on file"}</span>
        <span className={cn("rounded-full px-2.5 py-1 font-semibold", optedOut ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
          {optedOut ? "Auto-email: opted out" : "Auto-email: allowed"}
        </span>
      </div>
      {email && (
        <a
          href={`mailto:${email}`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Mail className="h-3.5 w-3.5" /> Open in your mail app
        </a>
      )}
    </div>
  );
}
