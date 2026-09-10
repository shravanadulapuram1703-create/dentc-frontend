// Patient → Messages: the SMS inbox for one patient (/patient/:id/messages).
//
// Three panes: contact/filters/appointments rail · conversation thread with
// composer · details pane for the selected text. Backed by
// /api/v1/sms-messages through usePatientSms; appointment reminders and
// confirmation requests are one click from the rail.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCheck, FlaskConical, MessageCircle, RefreshCw, Search, TableProperties } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/components/ui/utils";
import { applyFilter, type SmsEntry, type SmsFilter } from "./smsModel";
import { BUILTIN_TEMPLATES } from "./smsTemplates";
import { usePatientSms } from "./hooks/usePatientSms";
import { useFillHeight } from "./hooks/useFillHeight";
import { useSmsMergeContext, type AppointmentOption } from "./hooks/useSmsMergeContext";
import SmsSidebar from "./components/SmsSidebar";
import SmsThread from "./components/SmsThread";
import SmsComposer, { type ComposerHandle, type ComposerSubmit } from "./components/SmsComposer";
import SmsDetailsPanel from "./components/SmsDetailsPanel";
import SmsModeBanner from "./components/SmsModeBanner";

interface OutletContext {
  patient: { id: string; name: string; officeId?: string };
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

export default function PatientMessagesPage() {
  const { patient: shellPatient } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const patient_id = Number(shellPatient.id);
  const office_hint = shellPatient.officeId ? Number(shellPatient.officeId) : null;
  const [params, setParams] = useSearchParams();

  const sms = usePatientSms(patient_id);
  const fill = useFillHeight();
  const merge = useSmsMergeContext(patient_id, office_hint);

  const initialFilter = params.get("filter") as SmsFilter | null;
  const [filter, setFilter] = useState<SmsFilter>(
    initialFilter && VALID_FILTERS.includes(initialFilter) ? initialFilter : "all",
  );
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const composerRef = useRef<ComposerHandle>(null);

  const visible = useMemo(() => applyFilter(sms.entries, filter, search), [sms.entries, filter, search]);
  const selected = useMemo(() => sms.entries.find((e) => e.key === selectedKey) ?? null, [sms.entries, selectedKey]);

  // Keep the filter in the URL so the log page can deep-link ("?filter=unread").
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (filter === "all") next.delete("filter");
    else next.set("filter", filter);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const office_id = merge.office?.id ?? office_hint;

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

  const quickTemplate = (id: string, appt: AppointmentOption) => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    composerRef.current?.applyTemplate(t, appt);
    toast.info(`${t.name} loaded — review and press Send.`);
  };

  const handleRetry = (entry: SmsEntry) => {
    composerRef.current?.setBody(entry.body);
    composerRef.current?.focus();
    sms.dismissFailed(entry.key);
  };

  return (
    <div ref={fill.ref} style={fill.style} className="min-h-[520px] bg-[#F7F9FC]">
      <div className="flex h-full flex-col overflow-hidden border-t border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900">Text messages</h1>
            <p className="truncate text-[11px] text-slate-500">
              Two-way SMS with {shellPatient.name}
              {merge.office?.name ? ` · from ${merge.office.name}` : ""}
            </p>
          </div>

          <div className="relative ml-4 hidden max-w-xs flex-1 md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this conversation"
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
              onClick={() => void sms.refetch()}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50")}
              title="Refresh now (auto-refreshes every 15s)"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", sms.isFetching && "animate-spin")} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate(`/patient/${shellPatient.id}/communication`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="Open the SMS/Email log"
            >
              <TableProperties className="h-3.5 w-3.5" /> Log view
            </button>
          </div>
        </div>

        <SmsModeBanner mode={sms.mode} capability={sms.capability} />

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
            {filter !== "all" || search ? (
              <div className="flex items-center gap-2 border-b border-slate-200 bg-blue-50/60 px-4 py-1.5 text-[11px] text-blue-800">
                Showing {visible.length} of {sms.entries.length}
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="font-semibold hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col">
              {sms.error ? (
                <div className="m-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Could not load the SMS log. {String((sms.error as Error).message ?? "")}
                </div>
              ) : (
                <SmsThread
                  entries={visible}
                  loading={sms.isLoading}
                  selectedKey={selectedKey}
                  onSelect={(e) => setSelectedKey(e.key === selectedKey ? null : e.key)}
                  onRetry={handleRetry}
                  onDismiss={(e) => sms.dismissFailed(e.key)}
                  onMarkRead={(e) => {
                    if (e.row_id > 0) void sms.markRead(e.row_id, true);
                  }}
                  emptyHint={
                    filter === "all" && !search
                      ? "Send a reminder from the appointments on the left, or type a message below. Replies from the patient show up here automatically."
                      : "Nothing matches this filter."
                  }
                />
              )}
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
