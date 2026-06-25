// SUBSCRIBER INFORMATION — demographics + "Patient Rel to Sub" (and, for
// non-primary slots, "Sec. Sub Rel to Prim. Sub"). The "Member Subscriber"
// dropdown lets staff pick an existing subscriber already on the selected plan
// (e.g. the policy-holder family member) instead of re-keying their details.

import { useEffect, useState } from "react";
import type { InsuranceForm, InsSlot, InsuranceSubscriberOption } from "./insuranceModel";
import {
  RELATIONSHIP_OPTIONS,
  SEC_REL_OPTIONS,
  MARITAL_OPTIONS,
  GENDER_OPTIONS,
} from "./insuranceModel";
import { listPlanSubscribers } from "./patientInsuranceService";
import { SectionTitle, INPUT_CLS, Field } from "./ui";

interface Props {
  slot: InsSlot;
  form: InsuranceForm;
  onChange: (patch: Partial<InsuranceForm>) => void;
  /** Apply a picked subscriber's details to the form. */
  onPickSubscriber: (subscriberId: number) => void;
}

export default function SubscriberInformation({ slot, form, onChange, onPickSubscriber }: Props) {
  const [members, setMembers] = useState<InsuranceSubscriberOption[]>([]);

  useEffect(() => {
    if (form.ins_plan_id == null) {
      setMembers([]);
      return;
    }
    let alive = true;
    listPlanSubscribers(form.ins_plan_id)
      .then((subs) => {
        if (!alive) return;
        setMembers(
          subs.map((s) => ({
            id: s.id,
            label: [s.sub_last_name, s.sub_first_name].filter(Boolean).join(", ") || `Subscriber #${s.id}`,
            sub: s.sub_member_id ?? undefined,
          })),
        );
      })
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [form.ins_plan_id]);

  const isPrimary = slot.order === "primary";

  return (
    <div>
      <SectionTitle>Subscriber Information</SectionTitle>
      <div className="border-2 border-[#E2E8F0] rounded-lg p-3 space-y-3">
        {/* Member Subscriber picker */}
        <Field label="Member Subscriber">
          <select
            value={form.subscriber_id ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onPickSubscriber(Number(v));
            }}
            className={INPUT_CLS}
            disabled={form.ins_plan_id == null}
          >
            <option value="">{form.ins_plan_id == null ? "Select a plan first" : "Select from List"}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.sub ? ` · ${m.sub}` : ""}
              </option>
            ))}
          </select>
        </Field>

        {/* Name + SubID */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Last" required>
              <input value={form.sub_last_name} onChange={(e) => onChange({ sub_last_name: e.target.value })} className={INPUT_CLS} />
            </Field>
            <Field label="First" required>
              <input value={form.sub_first_name} onChange={(e) => onChange({ sub_first_name: e.target.value })} className={INPUT_CLS} />
            </Field>
          </div>
          <Field label="SubID" required>
            <input value={form.sub_member_id} onChange={(e) => onChange({ sub_member_id: e.target.value })} className={INPUT_CLS} />
          </Field>
        </div>

        {/* Address + Birth/Sex */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div className="space-y-2">
            <Field label="Address" required>
              <input value={form.sub_address} onChange={(e) => onChange({ sub_address: e.target.value })} className={INPUT_CLS} />
            </Field>
            <input
              value={form.sub_address2}
              onChange={(e) => onChange({ sub_address2: e.target.value })}
              className={INPUT_CLS}
              placeholder="Address line 2"
            />
          </div>
          <div className="space-y-2">
            <Field label="Birth Date" required>
              <input type="date" value={form.sub_dob} onChange={(e) => onChange({ sub_dob: e.target.value })} className={INPUT_CLS} />
            </Field>
            <Field label="Sex">
              <select value={form.sub_gender} onChange={(e) => onChange({ sub_gender: e.target.value })} className={INPUT_CLS}>
                <option value="">—</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* City/St/Zip + Marital */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
            <Field label="City" required>
              <input value={form.sub_city} onChange={(e) => onChange({ sub_city: e.target.value })} className={INPUT_CLS} />
            </Field>
            <Field label="St" required>
              <input value={form.sub_state} maxLength={2} onChange={(e) => onChange({ sub_state: e.target.value.toUpperCase() })} className={INPUT_CLS} />
            </Field>
            <Field label="Zip" required>
              <input value={form.sub_zip} onChange={(e) => onChange({ sub_zip: e.target.value })} className={INPUT_CLS} />
            </Field>
          </div>
          <Field label="Marital Status">
            <select value={form.marital_status} onChange={(e) => onChange({ marital_status: e.target.value })} className={INPUT_CLS}>
              <option value="">—</option>
              {MARITAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Relationship + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <Field label="Patient Rel to Sub" required>
            <select value={form.relationship} onChange={(e) => onChange({ relationship: e.target.value })} className={INPUT_CLS}>
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phone">
            <input value={form.sub_phone} onChange={(e) => onChange({ sub_phone: e.target.value })} className={INPUT_CLS} />
          </Field>
        </div>

        {/* Secondary-only: relationship to the primary subscriber */}
        {!isPrimary && (
          <Field label="Sec. Sub Rel to Prim. Sub">
            <select value={form.sec_rel_to_prim} onChange={(e) => onChange({ sec_rel_to_prim: e.target.value })} className={INPUT_CLS}>
              <option value="">Please Select</option>
              {SEC_REL_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}
