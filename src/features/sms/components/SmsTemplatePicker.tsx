// Template picker + manager. Built-in templates ship with the app; practice
// templates persist in localStorage until the backend `sms-templates`
// resource exists (gap SMS-5).

import { useMemo, useState } from "react";
import { CalendarClock, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SMS_MESSAGE_TYPE_LABEL, type SmsMessageType } from "../smsModel";
import {
  allTemplates,
  loadCustomTemplates,
  MERGE_FIELDS,
  newTemplateId,
  renderTemplate,
  saveCustomTemplates,
  templateNeedsAppointment,
  type SmsMergeContext,
  type SmsTemplate,
} from "../smsTemplates";
import { countSegments } from "../smsSegments";

interface SmsTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mergeContext: SmsMergeContext;
  hasAppointment: boolean;
  onUse: (template: SmsTemplate) => void;
}

const TYPE_OPTIONS: SmsMessageType[] = [
  "appointment_reminder",
  "appointment_confirmation",
  "recall",
  "balance",
  "manual",
  "other",
];

export default function SmsTemplatePicker({
  open,
  onOpenChange,
  mergeContext,
  hasAppointment,
  onUse,
}: SmsTemplatePickerProps) {
  const [version, setVersion] = useState(0);
  const templates = useMemo(() => allTemplates(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? "");
  const [editing, setEditing] = useState<SmsTemplate | null>(null);

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;
  const preview = selected ? renderTemplate(selected.body, mergeContext) : "";
  const seg = countSegments(preview);

  const persist = (next: SmsTemplate[]) => {
    saveCustomTemplates(next);
    setVersion((v) => v + 1);
  };

  const startNew = () =>
    setEditing({
      id: newTemplateId(),
      name: "",
      message_type: "manual",
      body: "",
      builtin: false,
      needs_appointment: false,
    });

  const duplicate = (t: SmsTemplate) =>
    setEditing({ ...t, id: newTemplateId(), name: `${t.name} (copy)`, builtin: false });

  const remove = (t: SmsTemplate) => {
    persist(loadCustomTemplates().filter((x) => x.id !== t.id));
    if (selectedId === t.id) setSelectedId(templates[0]?.id ?? "");
    toast.success("Template deleted");
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.body.trim()) {
      toast.error("Give the template a name and a message.");
      return;
    }
    const custom = loadCustomTemplates().filter((x) => x.id !== editing.id);
    const saved: SmsTemplate = {
      ...editing,
      name: editing.name.trim(),
      body: editing.body.trim(),
      builtin: false,
      needs_appointment: templateNeedsAppointment(editing.body),
    };
    persist([...custom, saved]);
    setSelectedId(saved.id);
    setEditing(null);
    toast.success("Template saved (stored in this browser until the backend template API ships)");
  };

  const insertField = (key: string) => {
    if (!editing) return;
    setEditing({ ...editing, body: `${editing.body}${editing.body.endsWith(" ") || !editing.body ? "" : " "}{{${key}}}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle>Message templates</DialogTitle>
          <DialogDescription>
            Pick a template to drop it into the composer with this patient's details merged in.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="grid gap-4 px-5 py-4">
            <div className="grid grid-cols-[1fr_200px] gap-3">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Name
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Post-op check-in"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Type
                <select
                  value={editing.message_type}
                  onChange={(e) => setEditing({ ...editing, message_type: e.target.value as SmsMessageType })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {SMS_MESSAGE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Message
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={5}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-blue-500 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Insert field</span>
              {MERGE_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => insertField(f.key)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Preview</div>
              {renderTemplate(editing.body, mergeContext) || "—"}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-md bg-[#1F3A5F] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2d5080]"
              >
                Save template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[260px_1fr]">
            <div className="max-h-[420px] overflow-y-auto border-r border-slate-200">
              <button
                type="button"
                onClick={startNew}
                className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" /> New template
              </button>
              {templates.map((t) => {
                const disabled = t.needs_appointment && !hasAppointment;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-2.5 text-left hover:bg-slate-50",
                      selected?.id === t.id && "bg-blue-50/70",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      {t.needs_appointment && (
                        <CalendarClock className={cn("h-3.5 w-3.5", disabled ? "text-slate-300" : "text-blue-500")} />
                      )}
                      {t.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {SMS_MESSAGE_TYPE_LABEL[t.message_type]}
                      {t.builtin ? " · built-in" : " · custom"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 p-5">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{selected.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {seg.segments || 1} segment{seg.segments > 1 ? "s" : ""} · {seg.encoding} · {seg.length} chars
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Duplicate"
                        onClick={() => duplicate(selected)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!selected.builtin && (
                        <>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => setEditing(selected)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => remove(selected)}
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-800">
                    {preview}
                  </div>
                  <div className="rounded-md bg-white p-3 text-[11px] text-slate-500 ring-1 ring-slate-100">
                    <span className="font-semibold text-slate-600">Raw:</span> {selected.body}
                  </div>
                  {selected.needs_appointment && !hasAppointment && (
                    <p className="text-xs text-amber-700">
                      This template needs an appointment. Pick one in the composer first so the date, time and
                      provider merge in.
                    </p>
                  )}
                  <div className="mt-auto flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onUse(selected);
                        onOpenChange(false);
                      }}
                      className="rounded-md bg-[#1F3A5F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d5080]"
                    >
                      Use template
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">No templates.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
