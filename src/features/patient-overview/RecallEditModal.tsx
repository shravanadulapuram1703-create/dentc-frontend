// Edit a single patient recall (legacy RECALLS > EDIT).
// Persists via PATCH /api/v1/patient-recalls/{id}.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal, { Field, input_class, PrimaryButton, SecondaryButton } from "./Modal";
import { useUpdatePatientRecall } from "@/api/generated/endpoints/patients/patients";
import type { PatientRecallRead } from "@/api/generated/model";

export default function RecallEditModal({
  recall,
  on_close,
  on_saved,
}: {
  recall: PatientRecallRead;
  on_close: () => void;
  on_saved: () => void;
}) {
  const [form, set_form] = useState({
    procedure_code: recall.procedure_code ?? "",
    recall_type: recall.recall_type ?? "",
    interval_months: recall.interval_months != null ? String(recall.interval_months) : "",
    interval_unit: recall.interval_unit ?? "month",
    due_date: recall.due_date ?? "",
    scheduled_date: recall.scheduled_date ?? "",
    scheduled_time: (recall.scheduled_time ?? "").slice(0, 5),
    status: recall.status ?? "Due",
  });
  const [error, set_error] = useState<string | null>(null);

  const update = useUpdatePatientRecall();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    set_form((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    set_error(null);
    const months = form.interval_months.trim() === "" ? null : Number(form.interval_months);
    if (months != null && (!Number.isFinite(months) || months < 0)) {
      set_error("Interval must be a positive number.");
      return;
    }
    try {
      await update.mutateAsync({
        itemId: recall.id,
        data: {
          procedure_code: form.procedure_code || null,
          recall_type: form.recall_type || null,
          interval_months: months,
          interval_unit: form.interval_unit || null,
          due_date: form.due_date || null,
          scheduled_date: form.scheduled_date || null,
          scheduled_time: form.scheduled_time || null,
          status: form.status || undefined,
        },
      });
      on_saved();
    } catch (err) {
      set_error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal
      title="Edit Recall"
      on_close={on_close}
      footer={
        <>
          <SecondaryButton onClick={on_close}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={update.isPending}>
            {update.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </span>
            ) : (
              "Save"
            )}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <input className={input_class} value={form.procedure_code} onChange={set("procedure_code")} />
        </Field>
        <Field label="Status">
          <select className={input_class} value={form.status} onChange={set("status")}>
            {["Due", "Scheduled", "Completed", "Inactive"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason">
          <input className={input_class} value={form.recall_type} onChange={set("recall_type")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Interval">
            <input
              className={input_class}
              inputMode="numeric"
              value={form.interval_months}
              onChange={set("interval_months")}
            />
          </Field>
          <Field label="Unit">
            <select className={input_class} value={form.interval_unit} onChange={set("interval_unit")}>
              {["day", "week", "month", "year"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Recall Date">
          <input type="date" className={input_class} value={form.due_date} onChange={set("due_date")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sch Date">
            <input
              type="date"
              className={input_class}
              value={form.scheduled_date}
              onChange={set("scheduled_date")}
            />
          </Field>
          <Field label="Sch Time">
            <input
              type="time"
              className={input_class}
              value={form.scheduled_time}
              onChange={set("scheduled_time")}
            />
          </Field>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-[#DC2626] bg-[#FEF2F2] border-2 border-[#FECACA] rounded px-2 py-1.5">
          {error}
        </p>
      )}
    </Modal>
  );
}
