// Edit the account's responsible party (legacy RESPONSIBLE PARTY > EDIT).
// Persists via PATCH /api/v1/responsible-parties/{id}.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal, { Field, input_class, PrimaryButton, SecondaryButton } from "./Modal";
import { useUpdateResponsibleParty } from "@/api/generated/endpoints/patients/patients";
import type { ResponsiblePartyRead } from "@/api/generated/model";

export default function ResponsiblePartyModal({
  responsible_party,
  on_close,
  on_saved,
}: {
  responsible_party: ResponsiblePartyRead;
  on_close: () => void;
  on_saved: () => void;
}) {
  const rp = responsible_party;
  const [form, set_form] = useState({
    first_name: rp.first_name ?? "",
    last_name: rp.last_name ?? "",
    resp_party_type: rp.resp_party_type ?? "",
    email: rp.email ?? "",
    cell_phone: rp.cell_phone ?? "",
    home_phone: rp.home_phone ?? "",
    work_phone: rp.work_phone ?? "",
    address_line1: rp.address_line1 ?? "",
    city: rp.city ?? "",
    state: rp.state ?? "",
    zip: rp.zip ?? "",
    employer: rp.employer ?? "",
    financial_notes: rp.financial_notes ?? "",
  });
  const [error, set_error] = useState<string | null>(null);

  const update = useUpdateResponsibleParty();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    set_form((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    set_error(null);
    try {
      await update.mutateAsync({
        itemId: rp.id,
        data: Object.fromEntries(
          Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v]),
        ),
      });
      on_saved();
    } catch (err) {
      set_error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal
      title="Edit Responsible Party"
      on_close={on_close}
      width="max-w-2xl"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="First Name">
          <input className={input_class} value={form.first_name} onChange={set("first_name")} />
        </Field>
        <Field label="Last Name">
          <input className={input_class} value={form.last_name} onChange={set("last_name")} />
        </Field>
        <Field label="Type">
          <input className={input_class} value={form.resp_party_type} onChange={set("resp_party_type")} />
        </Field>
        <Field label="Cell">
          <input className={input_class} value={form.cell_phone} onChange={set("cell_phone")} />
        </Field>
        <Field label="Home">
          <input className={input_class} value={form.home_phone} onChange={set("home_phone")} />
        </Field>
        <Field label="Work">
          <input className={input_class} value={form.work_phone} onChange={set("work_phone")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Email">
            <input className={input_class} value={form.email} onChange={set("email")} />
          </Field>
        </div>
        <Field label="Employer">
          <input className={input_class} value={form.employer} onChange={set("employer")} />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Address">
            <input className={input_class} value={form.address_line1} onChange={set("address_line1")} />
          </Field>
        </div>
        <Field label="City">
          <input className={input_class} value={form.city} onChange={set("city")} />
        </Field>
        <Field label="State">
          <input className={input_class} value={form.state} onChange={set("state")} />
        </Field>
        <Field label="Zip">
          <input className={input_class} value={form.zip} onChange={set("zip")} />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Financial Notes">
            <textarea
              rows={3}
              className={input_class}
              value={form.financial_notes}
              onChange={set("financial_notes")}
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
