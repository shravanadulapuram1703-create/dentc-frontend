// Patient → Messages: ONE window for texting and e-mailing a patient
// (/patient/:id/messages). Replaces the separate "Messages" + "SMS/Email" tabs.
//
// Three panes: contact/filters/appointments rail · message history (text +
// e-mail, NEWEST FIRST) with the composer under it · details pane for the
// selected text. The composer's Send asks "Text message (SMS)" or "Email".
// Backed by /api/v1/sms-messages (usePatientSms) and /api/v1/email-messages +
// /api/v1/email/send (usePatientEmail).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCheck, FlaskConical, Mail, MessageCircle, MessageSquare, RefreshCw, Search, ServerOff, TableProperties } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { usePatientOffice } from "@/features/office-scope";
import { applyFilter, type SmsFilter } from "./smsModel";
import { applyEmailFilter } from "./emailModel";
import { BUILTIN_TEMPLATES } from "./smsTemplates";
import { usePatientSms } from "./hooks/usePatientSms";
import { usePatientEmail } from "./hooks/usePatientEmail";
import { useFillHeight } from "./hooks/useFillHeight";
import { useSmsMergeContext, type AppointmentOption } from "./hooks/useSmsMergeContext";
import SmsSidebar from "./components/SmsSidebar";
import MessageHistory from "./components/MessageHistory";
import { buildHistory, type HistoryItem } from "./messageHistory";
import SmsComposer, { type ComposerHandle, type ComposerSubmit, type EmailComposerSubmit } from "./components/SmsComposer";
import SmsDetailsPanel from "./components/SmsDetailsPanel";
import SmsModeBanner from "./components/SmsModeBanner";

interface OutletContext {
  patient: { id: string; name: string };
}

const VALID_FILTERS: SmsFilter[] = [
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

type Channel = "all" | "sms" | "email";

export default function PatientMessagesPage() {
  const { patient: shellPatient } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const patient_id = Number(shellPatient.id);
  const { posting_office_id: office_hint } = usePatientOffice();
  const [params, setParams] = useSearchParams();

  const sms = usePatientSms(patient_id);
  const email = usePatientEmail(patient_id);
  const fill = useFillHeight();
  const merge = useSmsMergeContext(patient_id, office_hint);

  const initialFilter = params.get("filter") as SmsFilter | null;
  const [filter, setFilter] = useState<SmsFilter>(
    initialFilter && VALID_FILTERS.includes(initialFilter) ? initialFilter : "all",
  );
  const [channel, setChannel] = useState<Channel>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const composerRef = useRef<ComposerHandle>(null);

  const history = useMemo(
    () =>
      buildHistory(
        channel === "email" ? [] : applyFilter(sms.entries, filter, search),
        channel === "sms" ? [] : applyEmailFilter(email.entries, filter, search),
      ),
    [sms.entries, email.entries, filter, search, channel],
  );
  const total = sms.entries.length + email.entries.length;
  const selected = useMemo(() => sms.entries.find((e) => e.key === selectedKey) ?? null, [sms.entries, selectedKey]);

  // Keep the filter in the URL so the log page can deep-link ("?filter=unread").
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (filter === "all") next.delete("filter");
    else next.set("filter", filter);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const office_id = merge.office?.id ?? office_hint;
  const email_address = merge.patient?.email?.trim() || null;

  const handleSend = useCallback(
    async (payload: ComposerSubmit) => {
      const row = await sms.send({ ...payload, office_id });
      if (row) {
        if (sms.capability === "log_only") toast.warning("Saved to the SMS log as Queued — the Twilio gateway is not deployed yet.");
        else if (sms.capability === "simulated") toast.success("Demo text sent");
        else toast.success("Text sent");
      }
    },
    [sms, office_id],
  );

  const handleSendEmail = useCallback(
    async (payload: EmailComposerSubmit) => {
      const row = await email.send({ ...payload, office_id });
      if (row) {
        if (email.capability === "log_only") toast.warning("Saved to the email log as Queued — the email gateway (SendGrid) is not configured.");
        else toast.success("Email sent");
      }
    },
    [email, office_id],
  );

  const quickTemplate = (id: string, appt: AppointmentOption) => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    composerRef.current?.applyTemplate(t, appt);
    toast.info(`${t.name} loaded — review and press Send.`);
  };

  const handleRetry = (item: HistoryItem) => {
    composerRef.current?.setBody(item.channel === "sms" ? item.sms.body : item.email.body);
    composerRef.current?.focus();
    handleDismiss(item);
  };

  const handleDismiss = (item: HistoryItem) => {
    if (item.channel === "sms") sms.dismissFailed(item.sms.key);
    else email.dismissFailed(item.email.key);
  };

  return (
    <div ref={fill.ref} style={fill.style} className="min-h-[520px] bg-[#F7F9FC]">
      <div className="flex h-full flex-col overflow-hidden border-t border-slate-200 bg-white">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900">Messages</h1>
            <p className="truncate text-[11px] text-slate-500">
              Text &amp; email with {shellPatient.name}
              {merge.office?.name ? ` · from ${merge.office.name}` : ""}
            </p>
          </div>

          <div className="ml-2 flex rounded-lg bg-slate-100 p-0.5" role="tablist" aria-label="Channel">
            {(
              [
                { id: "all", label: "All", icon: MessageCircle, count: total },
                { id: "sms", label: "Text", icon: MessageSquare, count: sms.entries.length },
                { id: "email", label: "Email", icon: Mail, count: email.entries.length },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={channel === t.id}
                onClick={() => setChannel(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                  channel === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                <span className="rounded-full bg-slate-200 px-1.5 text-[10px] tabular-nums text-slate-600">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="relative hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages"
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {sms.stats.unread > 0 && (
              <button
                type="button"
                onClick={() => void sms.markAllRead().then(() => toast.success("All replies marked read"))}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            {sms.canSimulate && (
              <button
                type="button"
                onClick={() => void sms.simulateInbound(merge.phones[0]?.value ?? "+15555550100", "Can I move it to Thursday?")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
                title="Demo only: inject a patient reply"
              >
                <FlaskConical className="h-3.5 w-3.5" /> Simulate reply
              </button>
            )}
            <button
              type="button"
              onClick={() => void Promise.all([sms.refetch(), email.refetch()])}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="Refresh now (auto-refreshes every 15s)"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (sms.isFetching || email.isFetching) && "animate-spin")} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate(`/patient/${shellPatient.id}/communication`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="Open the SMS/Email log table (filters, CSV export)"
            >
              <TableProperties className="h-3.5 w-3.5" /> Log view
            </button>
          </div>
        </div>

        <SmsModeBanner mode={sms.mode} capability={sms.capability} />
        {email.capability === "log_only" && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-800">
            <ServerOff className="h-3.5 w-3.5" />
            <span>
              <b>Email gateway not configured</b> — emails are saved to the log as <i>Queued</i> and will not reach the
              patient until SendGrid is set up on the server.
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          <SmsSidebar
            patient={merge.patient}
            phones={merge.phones}
            stats={sms.stats}
            filter={filter}
            onFilter={setFilter}
            appointments={merge.appointments}
            onSendReminder={(a) => quickTemplate("builtin:appointment_reminder", a)}
            onRequestConfirmation={(a) => quickTemplate("builtin:appointment_confirmation", a)}
          />

          <section className="flex min-w-0 flex-1 flex-col bg-[#F7F9FC]">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white/70 px-4 py-1.5 text-[11px] text-slate-500">
              <span className="font-semibold uppercase tracking-wide">Message history</span>
              <span>· newest first</span>
              {(filter !== "all" || search || channel !== "all") && (
                <>
                  <span className="text-blue-800">
                    · showing {history.length} of {total}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("all");
                      setSearch("");
                      setChannel("all");
                    }}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {sms.error || email.error ? (
                <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {sms.error && <div>Could not load the SMS log. {String((sms.error as Error).message ?? "")}</div>}
                  {email.error && <div>Could not load the email log. {String((email.error as Error).message ?? "")}</div>}
                </div>
              ) : null}
              <MessageHistory
                items={history}
                loading={sms.isLoading || email.isLoading}
                selectedKey={selectedKey}
                onSelectSms={(e) => setSelectedKey(e.key === selectedKey ? null : e.key)}
                onMarkRead={(e) => {
                  if (e.row_id > 0) void sms.markRead(e.row_id, true);
                }}
                onRetry={handleRetry}
                onDismiss={handleDismiss}
                emptyHint={
                  filter === "all" && !search && channel === "all"
                    ? "Type a message below (or pick a template) and press Send to text or email the patient. Replies show up here automatically."
                    : "Nothing matches this filter."
                }
              />
            </div>
            <SmsComposer
              ref={composerRef}
              phones={merge.phones}
              appointments={merge.appointments}
              buildContext={merge.buildContext}
              optedOut={merge.sms_opted_out}
              capability={sms.capability}
              sending={sms.sending}
              onSend={handleSend}
              email={{
                address: email_address,
                opted_out: !!merge.patient?.no_auto_email,
                capability: email.capability,
                sending: email.sending,
                onSend: handleSendEmail,
              }}
            />
          </section>

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
                composerRef.current?.setBody(e.body);
                composerRef.current?.focus();
              }}
              onReply={() => composerRef.current?.focus()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
