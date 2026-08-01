import { useEffect, useState } from "react";
import { StepSection, TextField, SelectField } from "../stepUi";
import {
  RESPONSIBLE_PARTY_SOURCES,
  LEGACY_RESP_PARTY_TYPES,
  MARITAL_OPTIONS,
  SEX_OPTIONS,
  defaultPatientRelationship,
  type ResponsiblePartyForm,
} from "../wizardModel";
import { listCollectionAgencies } from "@/api/generated/endpoints/imaging/imaging";
import { listDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import type { CollectionAgencyRead } from "@/api/generated/model";

/** Snapshot of the patient (from Step 1) used to auto-populate a self-responsible party. */
export interface PatientSnapshot {
  first_name: string;
  last_name: string;
  dob: string;
  sex: string;
  marital_status: string;
  ssn: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  cell_phone: string;
  work_phone: string;
  email: string;
}

interface Props {
  value: ResponsiblePartyForm;
  onChange: (next: ResponsiblePartyForm) => void;
  patient: PatientSnapshot;
  /** Patients already on this account (legacy "Responsible for following Patients"). */
  accountPatients?: Array<{ name: string; age: string; sex: string; balance: string }>;
}

/**
 * Step 2 — "Add Responsible Party Information" (legacy Denticon).
 * A self-responsible patient auto-populates the billing identity from Step 1;
 * any other source exposes an editable guarantor form. Billing behaviour toggles,
 * statement message and notes mirror the legacy screen.
 */
export default function ResponsiblePartyStep({ value, onChange, patient, accountPatients }: Props) {
  const isSelf = value.rp_source === "Self";
  const set = (patch: Partial<ResponsiblePartyForm>) => onChange({ ...value, ...patch });

  // LEG-11: collection agencies come from the backend lookup.
  const [agencies, setAgencies] = useState<CollectionAgencyRead[]>([]);
  // LEG-13: Resp. Party Type is a seeded `resp_party_type` definitions group;
  // fall back to the codes transcribed from the legacy screen if unseeded.
  const [respTypes, setRespTypes] =
    useState<Array<{ code: string; label: string }>>(LEGACY_RESP_PARTY_TYPES);

  useEffect(() => {
    let cancelled = false;
    listCollectionAgencies({ size: 200 })
      .then((res) => {
        if (!cancelled) setAgencies(res.items ?? []);
      })
      .catch(() => {
        /* leave empty — the select shows "None set up" */
      });
    listDefinitions({ group_code: "resp_party_type", is_active: true, size: 200 })
      .then((res) => {
        const items = (res.items ?? [])
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((d) => ({ code: d.key1, label: d.description }));
        if (!cancelled && items.length > 0) setRespTypes(items);
      })
      .catch(() => {
        /* keep the legacy fallback list */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When self-responsible, the displayed billing identity is the patient's.
  const shown: ResponsiblePartyForm = isSelf
    ? {
        ...value,
        first_name: patient.first_name,
        last_name: patient.last_name,
        relationship: "Self",
        dob: patient.dob,
        sex: patient.sex,
        marital_status: patient.marital_status || value.marital_status,
        ssn: patient.ssn,
        address_line1: patient.address_line1,
        address_line2: patient.address_line2,
        city: patient.city,
        state: patient.state,
        zip: patient.zip,
        home_phone: patient.phone,
        cell_phone: patient.cell_phone,
        work_phone: patient.work_phone,
        email: patient.email,
      }
    : value;

  const age = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(shown.dob);
    if (!m) return "";
    const [, y, mo, d] = m;
    const today = new Date();
    let a = today.getFullYear() - Number(y);
    const md = today.getMonth() + 1 - Number(mo);
    if (md < 0 || (md === 0 && today.getDate() < Number(d))) a--;
    return a >= 0 ? String(a) : "";
  })();

  return (
    <div className="space-y-3">
      <StepSection title="Responsible Party">
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="Responsible Party is"
            value={value.rp_source}
            // Switching the guarantor resets the patient's relationship to the
            // sensible inverse (Parent ⇒ the patient is their Child); the user can
            // still override it below.
            onChange={(v) => set({ rp_source: v, relationship: defaultPatientRelationship(v) })}
            options={RESPONSIBLE_PARTY_SOURCES.map((t) => ({ value: t, label: t }))}
          />
          {!isSelf && (
            <SelectField
              label="Patient's Relationship to Responsible Party"
              value={value.relationship}
              onChange={(v) => set({ relationship: v })}
              options={["Spouse", "Parent", "Guardian", "Child", "Other"].map((t) => ({
                value: t,
                label: t,
              }))}
            />
          )}
          <SelectField
            label="Resp. Party Type *"
            value={value.resp_party_type}
            onChange={(v) => set({ resp_party_type: v })}
            options={respTypes.map((t) => ({ value: t.code, label: t.label }))}
          />
        </div>
      </StepSection>

      <StepSection title="Responsible Party / Billing Information">
        {isSelf ? (
          <p className="text-xs text-[#64748B] mb-3">
            Auto-populated from the patient (self-responsible) — the patient is linked as their own
            guarantor. Choose another responsible party above to enter a different guarantor.
          </p>
        ) : (
          <p className="text-xs text-[#64748B] mb-3">
            This guarantor is created and linked to the patient when you Finish.
          </p>
        )}
        <div className="grid grid-cols-4 gap-3">
          <TextField label="Title" value={value.title} onChange={(v) => set({ title: v })} />
          <TextField
            label="Preferred Name"
            value={value.preferred_name}
            onChange={(v) => set({ preferred_name: v })}
          />
          <TextField label="Last Name *" value={shown.last_name} onChange={(v) => set({ last_name: v })} disabled={isSelf} />
          <div className="grid grid-cols-[1fr_60px] gap-2">
            <TextField label="First Name *" value={shown.first_name} onChange={(v) => set({ first_name: v })} disabled={isSelf} />
            <TextField label="MI" value={value.middle_initial} onChange={(v) => set({ middle_initial: v })} />
          </div>

          <div className="col-span-2">
            <TextField label="Address *" value={shown.address_line1} onChange={(v) => set({ address_line1: v })} disabled={isSelf} />
          </div>
          <div className="col-span-2">
            <TextField label="Address 2" value={shown.address_line2} onChange={(v) => set({ address_line2: v })} disabled={isSelf} />
          </div>

          <TextField label="City *" value={shown.city} onChange={(v) => set({ city: v })} disabled={isSelf} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="State *" value={shown.state} onChange={(v) => set({ state: v })} disabled={isSelf} />
            <TextField label="Zip *" value={shown.zip} onChange={(v) => set({ zip: v })} disabled={isSelf} />
          </div>
          <TextField label="Email" type="email" value={shown.email} onChange={(v) => set({ email: v })} disabled={isSelf} />
          <div className="grid grid-cols-[1fr_60px] gap-2">
            <TextField label="Birth Date" type="date" value={shown.dob} onChange={(v) => set({ dob: v })} disabled={isSelf} />
            <TextField label="Age" value={age} onChange={() => {}} disabled />
          </div>

          <SelectField
            label="Marital Status"
            value={shown.marital_status}
            onChange={(v) => set({ marital_status: v })}
            options={MARITAL_OPTIONS.map((m) => ({ value: m, label: m }))}
            disabled={isSelf}
          />
          <SelectField
            label="Sex"
            value={shown.sex}
            onChange={(v) => set({ sex: v })}
            options={[{ value: "", label: "Select" }, ...SEX_OPTIONS]}
            disabled={isSelf}
          />
          <TextField label="SSN" value={shown.ssn} onChange={(v) => set({ ssn: v })} disabled={isSelf} />
          <TextField label="Drive Lic" value={value.driver_license} onChange={(v) => set({ driver_license: v })} />

          <TextField label="Home #" type="tel" value={shown.home_phone} onChange={(v) => set({ home_phone: v })} disabled={isSelf} />
          <TextField label="Cell #" type="tel" value={shown.cell_phone} onChange={(v) => set({ cell_phone: v })} disabled={isSelf} />
          <TextField label="Work #" type="tel" value={shown.work_phone} onChange={(v) => set({ work_phone: v })} disabled={isSelf} />
          <TextField label="Employer" value={value.employer} onChange={(v) => set({ employer: v })} />
        </div>
      </StepSection>

      <div className="grid grid-cols-2 gap-3">
        <StepSection title="Billing Options">
          <div className="space-y-2">
            {(
              [
                ["send_statements", "Send Statements"],
                ["no_email_statement", "No Email Statement"],
                ["send_to_collection", "Send to Collection"],
                ["apply_finance_charge", "Apply Finance Charge"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value[key]}
                  onChange={(e) => set({ [key]: e.target.checked } as Partial<ResponsiblePartyForm>)}
                  className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                />
                <span className="text-sm text-[#1E293B]">{label}</span>
              </label>
            ))}
            <SelectField
              label="Coll Agency"
              value={value.collection_agency_id == null ? "" : String(value.collection_agency_id)}
              onChange={(v) => set({ collection_agency_id: v === "" ? null : Number(v) })}
              options={[
                {
                  value: "",
                  label: agencies.length === 0 ? "None set up" : "None",
                },
                ...agencies.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
            />
          </div>
        </StepSection>

        <StepSection title="Responsible for following Patients">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F9FC] border-b border-[#E2E8F0]">
                <tr>
                  {["Patient Name", "Age", "Sex", "Balance"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-semibold text-[#1F3A5F] text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E2E8F0]">
                  <td className="px-2 py-1.5 font-medium text-[#1F3A5F]">
                    {[patient.last_name, patient.first_name].filter(Boolean).join(", ") || "(this patient)"}
                  </td>
                  <td className="px-2 py-1.5">{age || "—"}</td>
                  <td className="px-2 py-1.5">{patient.sex || "—"}</td>
                  <td className="px-2 py-1.5">$0.00</td>
                </tr>
                {(accountPatients ?? []).map((p, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0]">
                    <td className="px-2 py-1.5">{p.name}</td>
                    <td className="px-2 py-1.5">{p.age}</td>
                    <td className="px-2 py-1.5">{p.sex}</td>
                    <td className="px-2 py-1.5">{p.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-[#64748B] mt-2">
              A new patient starts as the only member of their account. Additional members are added
              from the Patient Overview ("Add New Member").
            </p>
          </div>
        </StepSection>
      </div>

      <StepSection
        title="Custom Statement Message"
        right={
          <label className="flex items-center gap-2 text-xs text-[#64748B]">
            Print on statement for
            <input
              type="number"
              min={0}
              value={value.print_message_times}
              onChange={(e) => set({ print_message_times: e.target.value })}
              className="w-16 px-2 py-1 border border-[#E2E8F0] rounded text-sm"
            />
            times
          </label>
        }
      >
        <textarea
          value={value.custom_statement_message}
          onChange={(e) => set({ custom_statement_message: e.target.value })}
          rows={2}
          className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm resize-none"
        />
      </StepSection>

      <div className="grid grid-cols-2 gap-3">
        <StepSection title="Financial Notes">
          <textarea
            value={value.financial_notes}
            onChange={(e) => set({ financial_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm resize-none"
          />
        </StepSection>
        <StepSection title="Responsible Party Notes">
          <textarea
            value={value.responsible_party_notes}
            onChange={(e) => set({ responsible_party_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm resize-none"
          />
        </StepSection>
      </div>
    </div>
  );
}
