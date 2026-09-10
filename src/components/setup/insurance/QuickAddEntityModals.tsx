// "CARRIER DETAILS" / "EMPLOYER DETAILS" quick-add popups — the legacy Denticon
// dialogs behind the **+ ADD NEW** buttons beside the Carrier and Employer
// pickers on the insurance-plan form. They create the entity, then hand the new
// record back so the caller can select it straight into the plan.
//
// These are deliberately the SHORT legacy forms, not the full Insurance Setup
// screens: the point is to unblock plan entry without leaving the plan. Anything
// not on the legacy dialog (fax, website, notes, contact, …) stays empty and is
// editable afterwards in Setup → Insurance → Carriers / Employers.

import { useState, type ReactNode } from "react";
import { Save, X, RotateCcw, Loader2, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import {
  createInsuranceCarrier,
  createEmployer,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsuranceCarrierRead, EmployerRead } from "@/api/generated/model";
import { US_STATES } from "@/components/modals/patient/constants";
import {
  type CarrierForm,
  type EmployerForm,
  emptyCarrierForm,
  emptyEmployerForm,
  buildCarrierCreate,
  buildEmployerCreate,
} from "./insuranceData";
import { invalidateCarriers } from "./carrierService";
import type { PlanCategory } from "./planData";

const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:bg-[#F1F5F9]";

// Claim types are stored as legacy CODES ("1"), and no definition group labels
// them — see devreport INS-PT-12. Offer the codes seen in the data as hints and
// keep the field free-text so nothing is lost.
const CLAIM_TYPE_HINTS = ["1", "2", "EClaim", "Paper"];

/* ========================================================================== */
/* Shared chrome                                                              */
/* ========================================================================== */

function Shell({
  title,
  icon,
  saving,
  onReset,
  onSave,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} />
      <div className="relative w-[720px] max-w-full rounded-lg border-2 border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded px-1.5 py-0.5 hover:bg-white/15 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3">
          <button
            onClick={onReset}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border-2 border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#3A6EA5] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F3A5F] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border-2 border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#1F3A5F] hover:bg-[#E8EFF7] disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** Legacy label-left / control-right row. */
function Row({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 border-b border-[#F1F5F9] py-2 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-3">
      <label className="pt-2 text-sm font-bold text-[#1F3A5F]">
        {label}
        {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
      </label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** City / State / Zip on one line, as the legacy dialogs lay it out. */
function CityStateZip({
  city,
  state,
  zip,
  onChange,
  disabled,
}: {
  city: string;
  state: string;
  zip: string;
  onChange: (patch: { city?: string; state?: string; zip?: string }) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_90px_110px] gap-2">
      <input
        value={city}
        onChange={(e) => onChange({ city: e.target.value })}
        disabled={disabled}
        className={INPUT_CLS}
        placeholder="City"
      />
      <select
        value={state}
        onChange={(e) => onChange({ state: e.target.value })}
        disabled={disabled}
        className={INPUT_CLS}
      >
        <option value="">—</option>
        {US_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        value={zip}
        onChange={(e) => onChange({ zip: e.target.value })}
        disabled={disabled}
        className={INPUT_CLS}
        placeholder="Zip"
      />
    </div>
  );
}

/* ========================================================================== */
/* CARRIER DETAILS                                                            */
/* ========================================================================== */

export function QuickAddCarrierModal({
  category,
  onClose,
  onCreated,
}: {
  /** Fixes `carrier_type` so the new carrier lands in the plan's partition. */
  category: PlanCategory;
  onClose: () => void;
  onCreated: (carrier: InsuranceCarrierRead) => void;
}) {
  const blank = () => emptyCarrierForm(category === "D" ? "dental" : "medical");
  const [form, setForm] = useState<CarrierForm>(blank);
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<CarrierForm>) => setForm((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    // Legacy marks Name, Address and City/State/Zip mandatory on this dialog.
    const missing = [
      !form.name.trim() && "Name",
      !form.address.trim() && "Address",
      !form.city.trim() && "City",
      !form.state.trim() && "State",
      !form.zip.trim() && "Zip",
    ].filter(Boolean);
    if (missing.length) {
      toast.error("Validation Failed", { description: `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required` });
      return;
    }
    setSaving(true);
    try {
      const created = await createInsuranceCarrier(buildCarrierCreate(form));
      invalidateCarriers();
      toast.success(`Carrier "${created.name}" created`);
      onCreated(created);
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not create carrier" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      title="Carrier Details"
      icon={<Building2 className="h-5 w-5" />}
      saving={saving}
      onReset={() => setForm(blank())}
      onSave={() => void handleSave()}
      onClose={onClose}
    >
      <Row label="Name" required>
        <input autoFocus value={form.name} onChange={(e) => update({ name: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="Address" required>
        <input value={form.address} onChange={(e) => update({ address: e.target.value })} disabled={saving} className={INPUT_CLS} />
        <input value={form.address2} onChange={(e) => update({ address2: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="City, State Zip" required>
        <CityStateZip city={form.city} state={form.state} zip={form.zip} onChange={update} disabled={saving} />
      </Row>
      <Row label="Phone">
        <input value={form.phone} onChange={(e) => update({ phone: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="Phone 2">
        <input value={form.phone2} onChange={(e) => update({ phone2: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="Payer ID">
        <input value={form.payer_id} onChange={(e) => update({ payer_id: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="Claim Type">
        <input
          list="quick-carrier-claim-types"
          value={form.claim_type}
          onChange={(e) => update({ claim_type: e.target.value })}
          disabled={saving}
          className={INPUT_CLS}
          placeholder="e.g. 1"
        />
        <datalist id="quick-carrier-claim-types">
          {CLAIM_TYPE_HINTS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Row>
      <p className="pt-3 text-xs text-[#64748B]">
        Saved as a <strong>{category === "D" ? "Dental" : "Medical"}</strong> carrier. Remaining details
        (fax, website, contact, notes) can be filled in under Setup → Insurance → Carriers.
      </p>
    </Shell>
  );
}

/* ========================================================================== */
/* EMPLOYER DETAILS                                                           */
/* ========================================================================== */

export function QuickAddEmployerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (employer: EmployerRead) => void;
}) {
  const [form, setForm] = useState<EmployerForm>(emptyEmployerForm);
  // `employers` has ONE address column but the legacy dialog shows two lines —
  // kept separate here and joined on save (devreport INS-PT-11).
  const [address2, setAddress2] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<EmployerForm>) => setForm((p) => ({ ...p, ...patch }));

  const reset = () => {
    setForm(emptyEmployerForm());
    setAddress2("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Failed", { description: "Name is required" });
      return;
    }
    setSaving(true);
    try {
      const address = [form.address.trim(), address2.trim()].filter(Boolean).join("\n");
      const created = await createEmployer(buildEmployerCreate({ ...form, address }));
      toast.success(`Employer "${created.name}" created`);
      onCreated(created);
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not create employer" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      title="Employer Details"
      icon={<Briefcase className="h-5 w-5" />}
      saving={saving}
      onReset={reset}
      onSave={() => void handleSave()}
      onClose={onClose}
    >
      <Row label="Name" required>
        <input autoFocus value={form.name} onChange={(e) => update({ name: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="Address">
        <input value={form.address} onChange={(e) => update({ address: e.target.value })} disabled={saving} className={INPUT_CLS} />
        <input value={address2} onChange={(e) => setAddress2(e.target.value)} disabled={saving} className={INPUT_CLS} />
      </Row>
      <Row label="City, State Zip">
        <CityStateZip city={form.city} state={form.state} zip={form.zip} onChange={update} disabled={saving} />
      </Row>
      <Row label="Phone">
        <input value={form.phone} onChange={(e) => update({ phone: e.target.value })} disabled={saving} className={INPUT_CLS} />
      </Row>
    </Shell>
  );
}
