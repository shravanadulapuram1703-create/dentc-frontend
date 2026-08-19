// The "Report an Issue" form: user narrative + auto-captured context + files,
// submitted through the configurable jiraService. Renders three states inline —
// the form, a success confirmation (with the Jira issue ID), and a failure state
// with a one-click retry. Reusable anywhere the ReportIssueDialog is mounted.
import { useMemo, useState } from "react";
import {
  Paperclip,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  RotateCcw,
} from "lucide-react";
import { components, utils } from "../../../styles/theme";
import {
  ISSUE_TYPES,
  PRIORITIES,
  MODULES,
  DEFAULT_ISSUE_TYPE,
  DEFAULT_PRIORITY,
  isDemoMode,
  jiraConfig,
} from "../config/jiraConfig";
import { submitTicket } from "../services/jiraService";
import { env } from "@/shared/config/env";
import type {
  TicketAttachment,
  TicketContext,
  TicketFormValues,
  TicketSubmitResult,
} from "../types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB / file
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB total

interface Props {
  context: TicketContext;
  prefill?: Partial<TicketFormValues>;
  onSubmitted?: (result: TicketSubmitResult) => void;
  onClose: () => void;
}

const emptyValues = (context: TicketContext, prefill?: Partial<TicketFormValues>): TicketFormValues => ({
  title: prefill?.title ?? "",
  description: prefill?.description ?? "",
  issue_type: prefill?.issue_type ?? DEFAULT_ISSUE_TYPE,
  priority: prefill?.priority ?? DEFAULT_PRIORITY,
  module: prefill?.module ?? context.module,
  steps_to_reproduce: prefill?.steps_to_reproduce ?? "",
  expected_behavior: prefill?.expected_behavior ?? "",
  actual_behavior: prefill?.actual_behavior ?? "",
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportIssueForm({ context, prefill, onSubmitted, onClose }: Props) {
  const [values, setValues] = useState<TicketFormValues>(() => emptyValues(context, prefill));
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof TicketFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TicketSubmitResult | null>(null);

  const totalBytes = useMemo(
    () => attachments.reduce((sum, a) => sum + a.size, 0),
    [attachments],
  );

  const set = <K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);
    const next: TicketAttachment[] = [];
    let runningTotal = totalBytes;
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" is larger than 10 MB and was skipped.`);
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_BYTES) {
        setFileError("Attachments exceed the 25 MB total limit — some files were skipped.");
        break;
      }
      try {
        const data_base64 = await fileToBase64(file);
        next.push({ name: file.name, size: file.size, type: file.type, data_base64 });
        runningTotal += file.size;
      } catch {
        setFileError(`Couldn't read "${file.name}".`);
      }
    }
    if (next.length) setAttachments((a) => [...a, ...next]);
  };

  const removeAttachment = (name: string) =>
    setAttachments((a) => a.filter((x) => x.name !== name));

  const validate = (): boolean => {
    const e: Partial<Record<keyof TicketFormValues, string>> = {};
    if (!values.title.trim()) e.title = "A short title is required.";
    else if (values.title.trim().length < 5) e.title = "Give a little more detail (5+ characters).";
    if (!values.description.trim()) e.description = "Please describe the issue.";
    if (!values.issue_type) e.issue_type = "Select an issue type.";
    if (!values.priority) e.priority = "Select a priority.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    const res = await submitTicket({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      context,
      attachments,
    });
    setSubmitting(false);
    setResult(res);
    if (res.ok) onSubmitted?.(res);
  };

  // --- Success state --------------------------------------------------------
  if (result?.ok) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2FB9A7]/10">
          <CheckCircle2 className="h-8 w-8 text-[#2FB9A7]" />
        </div>
        <h3 className="text-lg font-bold text-[#1F3A5F]">Ticket submitted</h3>
        <p className="mt-1 text-sm text-[#64748B]">
          Thanks — your report was filed and our team can now track it.
        </p>
        {result.issue_key && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Ticket ID</span>
            <span className="font-mono text-sm font-bold text-[#1F3A5F]">{result.issue_key}</span>
            {result.issue_url && (
              <a
                href={result.issue_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#3A6EA5] hover:underline"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        {isDemoMode && (
          <p
            className={utils.cn(
              "mt-3 text-xs",
              env.isProd ? "font-semibold text-[#B91C1C]" : "text-[#94A3B8]",
            )}
          >
            {env.isProd
              ? "This ticket was NOT sent to Jira — it is stored in this browser only. Please report it to your administrator."
              : "Demo mode: this ticket is stored locally. Configure Jira to file real issues."}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setValues(emptyValues(context));
              setAttachments([]);
            }}
            className={components.buttonOutline}
          >
            File another
          </button>
          <button type="button" onClick={onClose} className={components.buttonPrimary}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all";
  const err = (k: keyof TicketFormValues) =>
    errors[k] ? <p className="mt-1 text-xs font-semibold text-[#DC2626]">{errors[k]}</p> : null;

  return (
    <div className="flex max-h-[calc(90vh-4rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {/* Failure banner + retry */}
        {result && !result.ok && (
          <div className={utils.cn(components.alertError, "flex items-start gap-3")}>
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" />
            <div className="flex-1">
              <p className="text-sm font-bold text-[#DC2626]">Couldn't submit your ticket</p>
              <p className="mt-0.5 text-xs text-[#7F1D1D]">{result.error}</p>
              <p className="mt-1 text-xs text-[#7F1D1D]">
                Your entries are preserved — try again, or contact support directly.
              </p>
            </div>
            <button
              type="button"
              onClick={doSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#B91C1C]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Title */}
        <div>
          <label className={components.label}>
            Issue title <span className="text-[#DC2626]">*</span>
          </label>
          <input
            className={inputCls}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Briefly summarize the problem"
            maxLength={160}
          />
          {err("title")}
        </div>

        {/* Type / Priority / Module */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={components.label}>
              Issue type <span className="text-[#DC2626]">*</span>
            </label>
            <select className={inputCls} value={values.issue_type} onChange={(e) => set("issue_type", e.target.value)}>
              {ISSUE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={components.label}>
              Priority <span className="text-[#DC2626]">*</span>
            </label>
            <select className={inputCls} value={values.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={components.label}>Module / screen</label>
            <select className={inputCls} value={values.module} onChange={(e) => set("module", e.target.value)}>
              {MODULES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={components.label}>
            Description <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            className={utils.cn(inputCls, "resize-y")}
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What happened? Include anything that helps us understand the problem."
          />
          {err("description")}
        </div>

        {/* Reproduction details */}
        <div>
          <label className={components.label}>Steps to reproduce</label>
          <textarea
            className={utils.cn(inputCls, "resize-y")}
            rows={3}
            value={values.steps_to_reproduce}
            onChange={(e) => set("steps_to_reproduce", e.target.value)}
            placeholder={"1. Go to…\n2. Click…\n3. See…"}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={components.label}>Expected behavior</label>
            <textarea
              className={utils.cn(inputCls, "resize-y")}
              rows={2}
              value={values.expected_behavior}
              onChange={(e) => set("expected_behavior", e.target.value)}
              placeholder="What should have happened?"
            />
          </div>
          <div>
            <label className={components.label}>Actual behavior</label>
            <textarea
              className={utils.cn(inputCls, "resize-y")}
              rows={2}
              value={values.actual_behavior}
              onChange={(e) => set("actual_behavior", e.target.value)}
              placeholder="What actually happened?"
            />
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className={components.label}>Attachments</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#CBD5E1] px-4 py-3 text-sm text-[#64748B] transition-colors hover:border-[#3A6EA5] hover:bg-[#F1F5F9]">
            <Paperclip className="h-4 w-4" />
            <span>Add screenshots, logs, or files (10 MB each, 25 MB total)</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {fileError && <p className="mt-1 text-xs font-semibold text-[#D97706]">{fileError}</p>}
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {attachments.map((a) => (
                <li
                  key={a.name}
                  className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-[#1E293B]">{a.name}</span>
                  <span className="mx-2 shrink-0 text-xs text-[#94A3B8]">{humanSize(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.name)}
                    className="shrink-0 rounded p-0.5 text-[#94A3B8] hover:bg-[#E2E8F0] hover:text-[#DC2626]"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Auto-captured context */}
        <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1F3A5F]">
            <Info className="h-3.5 w-3.5" /> Captured automatically
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#475569] sm:grid-cols-3">
            <ContextItem label="User" value={context.user_name} />
            <ContextItem label="Role" value={context.user_role} />
            <ContextItem label="Office" value={context.office} />
            <ContextItem label="Version" value={context.app_version} />
            <ContextItem label="Browser" value={context.browser} />
            <ContextItem label="OS" value={context.operating_system} />
          </dl>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F7F9FC] px-6 py-3">
        <span
          className={utils.cn(
            "text-xs",
            // Demo mode in production is a misconfiguration, not a feature: the
            // reporter would otherwise get a friendly grey note while their ticket
            // quietly dies in localStorage.
            isDemoMode && env.isProd
              ? "font-semibold text-[#B91C1C]"
              : "text-[#94A3B8]",
          )}
        >
          {isDemoMode
            ? env.isProd
              ? "Not connected to Jira — this ticket will only be stored in this browser"
              : "Demo mode — stored locally"
            : `Filing to Jira project ${jiraConfig.projectKey}`}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={components.buttonGhost} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            onClick={doSubmit}
            disabled={submitting}
            className={utils.cn(components.buttonPrimary, "inline-flex items-center gap-2 disabled:opacity-60")}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit ticket"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-bold text-[#64748B]">{label}</dt>
      <dd className="truncate text-[#1E293B]" title={value}>{value}</dd>
    </div>
  );
}
