import { useEffect, useState } from "react";
import {
  formatUSPhone,
  isPartialUSPhone,
  US_PHONE_MAX_LENGTH,
} from "@/utils/phone";
import { emailError } from "@/utils/email";
import { Building2, MapPin, Phone, DollarSign, Clock, Plus, X, Info } from "lucide-react";
import {
  listOfficeGroups,
} from "@/api/generated/endpoints/organization/organization";
import { fetchProviderDirectory } from "@/services/providerDirectory";
import {
  listFeeSchedules,
  createFeeSchedule,
} from "@/api/generated/endpoints/procedures/procedures";
import { type OfficeForm } from "../../../../data/officeData";

/** Static IANA time zones — `getOfficeMetadata` also returns time_zones; this is a stable fallback. */
const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

interface InfoTabProps {
  formData: Partial<OfficeForm>;
  updateFormData: (updates: Partial<OfficeForm>) => void;
  mode?: "view" | "add" | "edit";
}

interface Provider {
  id: string;
  name: string;
}

interface FeeScheduleOption {
  id: number;
  name: string;
}

interface OfficeGroupOption {
  id: number;
  name: string;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function InfoTab({ formData, updateFormData, mode }: InfoTabProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [timeZones, setTimeZones] = useState<string[]>([]);
  const [officeGroups, setOfficeGroups] = useState<OfficeGroupOption[]>([]);

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddFeeSchedule, setShowAddFeeSchedule] = useState(false);
  const [showAddUCRFeeSchedule, setShowAddUCRFeeSchedule] = useState(false);

  const [newProvider, setNewProvider] = useState({ name: "", npi: "", license: "" });
  const [newFeeSchedule, setNewFeeSchedule] = useState("");
  const [newUCRFeeSchedule, setNewUCRFeeSchedule] = useState("");

  const [standardFeeSchedules, setStandardFeeSchedules] = useState<FeeScheduleOption[]>([]);
  const [ucrFeeSchedules, setUcrFeeSchedules] = useState<FeeScheduleOption[]>([]);

  /* -------------------- LOAD METADATA (real generated endpoints) -------------------- */
  useEffect(() => {
    listFeeSchedules({ size: 200 })
      .then((res) => {
        const all = res.items ?? [];
        const isUcr = (fs: { fee_type?: string | null }) => (fs.fee_type ?? "").toUpperCase() === "UCR";
        const toOpt = (fs: { id: number; name: string }): FeeScheduleOption => ({ id: fs.id, name: fs.name });
        setStandardFeeSchedules(all.filter((fs) => !isUcr(fs)).map(toOpt));
        setUcrFeeSchedules(all.filter(isUcr).map(toOpt));
      })
      .catch(() => {
        setStandardFeeSchedules([]);
        setUcrFeeSchedules([]);
      });

    // Shared provider directory (active, name-sorted) — same list as every other screen.
    fetchProviderDirectory()
      .then((rows) =>
        setProviders(rows.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }))),
      )
      .catch(() => setProviders([]));

    listOfficeGroups({ size: 200 })
      .then((res) => setOfficeGroups((res.items ?? []).map((g) => ({ id: g.id, name: g.name }))))
      .catch(() => setOfficeGroups([]));

    setTimeZones(TIME_ZONES);
  }, []);

  /* -------------------- ADD PROVIDER -------------------- */
  const handleAddProvider = () => {
    alert("Add new providers in Setup → Providers, then select them here.");
    setShowAddProvider(false);
    setNewProvider({ name: "", npi: "", license: "" });
  };

  /* -------------------- ADD FEE SCHEDULES (real /api/v1/fee-schedules) -------------------- */
  const handleAddFeeSchedule = async () => {
    if (!newFeeSchedule.trim()) {
      alert("Fee Schedule name is required");
      return;
    }
    try {
      const created = await createFeeSchedule({ name: newFeeSchedule, fee_type: "STANDARD" });
      setStandardFeeSchedules((prev) => [...prev, { id: created.id, name: created.name }]);
      updateFormData({ default_fee_schedule_id: created.id });
      alert(`Fee Schedule "${created.name}" added successfully`);
      setShowAddFeeSchedule(false);
      setNewFeeSchedule("");
    } catch (err: unknown) {
      alert(extractError(err) || "Failed to add fee schedule");
    }
  };

  const handleAddUCRFeeSchedule = async () => {
    if (!newUCRFeeSchedule.trim()) {
      alert("UCR Fee Schedule name is required");
      return;
    }
    try {
      const created = await createFeeSchedule({ name: newUCRFeeSchedule, fee_type: "UCR" });
      setUcrFeeSchedules((prev) => [...prev, { id: created.id, name: created.name }]);
      updateFormData({ default_ucr_fee_schedule_id: created.id });
      alert(`UCR Fee Schedule "${created.name}" added successfully`);
      setShowAddUCRFeeSchedule(false);
      setNewUCRFeeSchedule("");
    } catch (err: unknown) {
      alert(extractError(err) || "Failed to add UCR fee schedule");
    }
  };

  return (
    <div className="space-y-6">
      {/* Office Information Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
          <Building2 className="w-4 h-4 text-[#3A6EA5]" />
          Office Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Office ID (read-only) */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Office ID <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.id ?? ""}
              disabled
              className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-[#F7F9FC] text-[#64748B] cursor-not-allowed text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">Auto-generated, read-only</p>
          </div>

          {/* Office Name */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Office Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.name ?? ""}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="e.g., Main Street Dental"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Short ID */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Short ID <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.short_id ?? ""}
              onChange={(e) => updateFormData({ short_id: e.target.value.toUpperCase() })}
              placeholder="e.g., MSD"
              maxLength={6}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 uppercase text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">Used in UI, scheduler, reports (max 6 chars)</p>
          </div>

          {/* Opening Date */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Opening Date</label>
            <input
              type="date"
              value={formData.opening_date ?? ""}
              onChange={(e) => updateFormData({ opening_date: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Treating Address Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
          <MapPin className="w-4 h-4 text-[#3A6EA5]" />
          Treating Address
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Address Line 1 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.address_line1 ?? ""}
              onChange={(e) => updateFormData({ address_line1: e.target.value })}
              placeholder="Street address"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Address Line 2</label>
            <input
              type="text"
              value={formData.address_line2 ?? ""}
              onChange={(e) => updateFormData({ address_line2: e.target.value })}
              placeholder="Suite, Unit, Building, etc."
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              City <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.city ?? ""}
              onChange={(e) => updateFormData({ city: e.target.value })}
              placeholder="City"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              State <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.state ?? ""}
              onChange={(e) => updateFormData({ state: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              <option value="">Select State</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              ZIP Code <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.zip ?? ""}
              onChange={(e) => updateFormData({ zip: e.target.value })}
              placeholder="12345"
              maxLength={10}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Time Zone <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.timezone ?? ""}
              onChange={(e) => updateFormData({ timezone: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              <option value="">Select Time Zone</option>
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p className="text-xs text-[#64748B] mt-1">Drives scheduling &amp; timestamps</p>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
          <Phone className="w-4 h-4 text-[#3A6EA5]" />
          Contact Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Phone 1 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              maxLength={US_PHONE_MAX_LENGTH}
              value={formData.phone ?? ""}
              // Formats as typed: letters are dropped and anything past ten
              // digits is ignored, so the field cannot take "1234567890kjkjhkj".
              onChange={(e) => updateFormData({ phone: formatUSPhone(e.target.value) })}
              placeholder="(555) 123-4567"
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm ${
                isPartialUSPhone(formData.phone) ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#CBD5E1]"
              }`}
            />
            {isPartialUSPhone(formData.phone) && (
              <p className="text-xs text-[#DC2626] mt-1">
                Enter all 10 digits, e.g. (555) 123-4567.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Extension</label>
            <input
              type="text"
              value={formData.phone_ext ?? ""}
              onChange={(e) => updateFormData({ phone_ext: e.target.value })}
              placeholder="100"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Phone 2</label>
            <input
              type="tel"
              inputMode="tel"
              maxLength={US_PHONE_MAX_LENGTH}
              value={formData.phone_2 ?? ""}
              // Formats as typed: letters are dropped and anything past ten
              // digits is ignored, so the field cannot take "1234567890kjkjhkj".
              onChange={(e) => updateFormData({ phone_2: formatUSPhone(e.target.value) })}
              placeholder="(555) 123-4568"
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm ${
                isPartialUSPhone(formData.phone_2) ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#CBD5E1]"
              }`}
            />
            {isPartialUSPhone(formData.phone_2) && (
              <p className="text-xs text-[#DC2626] mt-1">
                Enter all 10 digits, e.g. (555) 123-4568.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Email <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="email"
              value={formData.email ?? ""}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="contact@example.com"
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm ${
                emailError(formData.email) ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#CBD5E1]"
              }`}
            />
            {emailError(formData.email) && (
              <p className="text-xs text-[#DC2626] mt-1">{emailError(formData.email)}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Fax</label>
            <input
              type="tel"
              inputMode="tel"
              maxLength={US_PHONE_MAX_LENGTH}
              value={formData.fax ?? ""}
              // Formats as typed: letters are dropped and anything past ten
              // digits is ignored, so the field cannot take "1234567890kjkjhkj".
              onChange={(e) => updateFormData({ fax: formatUSPhone(e.target.value) })}
              placeholder="(555) 123-4569"
              className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm ${
                isPartialUSPhone(formData.fax) ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#CBD5E1]"
              }`}
            />
            {isPartialUSPhone(formData.fax) && (
              <p className="text-xs text-[#DC2626] mt-1">
                Enter all 10 digits, e.g. (555) 123-4569.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Billing Configuration Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
          <DollarSign className="w-4 h-4 text-[#3A6EA5]" />
          Billing Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Insurance Billing Provider */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Insurance Billing Provider <span className="text-[#DC2626]">*</span>
            </label>

            {!showAddProvider ? (
              <select
                value={formData.billing_provider_id ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__ADD_NEW__") {
                    setShowAddProvider(true);
                  } else {
                    updateFormData({ billing_provider_id: e.target.value || null });
                  }
                }}
                className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              >
                <option value="">Select Provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
                <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">+ Add New Provider</option>
              </select>
            ) : (
              <div className="p-4 bg-[#E8F4FD] border-2 border-[#B8D4EA] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#1F3A5F]">Add New Provider</h4>
                  <button onClick={() => setShowAddProvider(false)} className="p-1 hover:bg-[#D4E3F3] rounded transition-colors">
                    <X className="w-4 h-4 text-[#64748B]" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">
                      Provider Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={newProvider.name}
                      onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                      placeholder="Dr. John Smith"
                      className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">NPI Number</label>
                    <input
                      type="text"
                      value={newProvider.npi}
                      onChange={(e) => setNewProvider({ ...newProvider, npi: e.target.value })}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">License Number</label>
                    <input
                      type="text"
                      value={newProvider.license}
                      onChange={(e) => setNewProvider({ ...newProvider, license: e.target.value })}
                      placeholder="LIC-12345"
                      className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAddProvider} className="flex items-center gap-2 px-3 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm">
                    <Plus className="w-4 h-4" />
                    Add Provider
                  </button>
                  <button
                    onClick={() => {
                      setShowAddProvider(false);
                      setNewProvider({ name: "", npi: "", license: "" });
                    }}
                    className="px-3 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-[#64748B] mt-1">Provider used for insurance claims</p>
          </div>

          {/* Use Billing License */}
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.use_billing_license ?? false}
                onChange={(e) => updateFormData({ use_billing_license: e.target.checked })}
                className="w-4 h-4 text-[#3A6EA5] border-2 border-[#CBD5E1] rounded focus:ring-2 focus:ring-[#3A6EA5]/20"
              />
              <span className="text-sm font-bold text-[#1E293B]">Use provider license in claims</span>
            </label>
          </div>

          {/* Tax ID */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Tax ID <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.tax_id ?? ""}
              onChange={(e) => updateFormData({ tax_id: e.target.value })}
              placeholder="12-3456789"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Office Group */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Office Group</label>
            <select
              value={formData.office_group_id != null ? String(formData.office_group_id) : ""}
              onChange={(e) => updateFormData({ office_group_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              <option value="">None</option>
              {officeGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <p className="text-xs text-[#64748B] mt-1">Optional grouping for enterprise reporting</p>
          </div>
        </div>
      </div>

      {/* Fee Schedules Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
          <DollarSign className="w-4 h-4 text-[#3A6EA5]" />
          Fee Schedules
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Default UCR Fee Schedule */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Default UCR Fee Schedule</label>

            {!showAddUCRFeeSchedule ? (
              <select
                value={formData.default_ucr_fee_schedule_id != null ? String(formData.default_ucr_fee_schedule_id) : ""}
                onChange={(e) => {
                  if (e.target.value === "__ADD_NEW__") {
                    setShowAddUCRFeeSchedule(true);
                  } else {
                    updateFormData({ default_ucr_fee_schedule_id: e.target.value ? Number(e.target.value) : null });
                  }
                }}
                className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
              >
                <option value="">Select UCR Fee Schedule</option>
                {ucrFeeSchedules.map((fs) => (
                  <option key={fs.id} value={fs.id}>{fs.name}</option>
                ))}
                <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">+ Add New UCR Fee Schedule</option>
              </select>
            ) : (
              <div className="p-3 bg-[#E8F4FD] border-2 border-[#B8D4EA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#1F3A5F]">Add UCR Fee Schedule</h4>
                  <button onClick={() => setShowAddUCRFeeSchedule(false)} className="p-1 hover:bg-[#D4E3F3] rounded transition-colors">
                    <X className="w-3 h-3 text-[#64748B]" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newUCRFeeSchedule}
                  onChange={(e) => setNewUCRFeeSchedule(e.target.value)}
                  placeholder="Fee Schedule Name"
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddUCRFeeSchedule} className="flex items-center gap-1 px-2 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-xs">
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddUCRFeeSchedule(false);
                      setNewUCRFeeSchedule("");
                    }}
                    className="px-2 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Default Fee Schedule */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Default Fee Schedule <span className="text-[#DC2626]">*</span>
            </label>

            {!showAddFeeSchedule ? (
              <select
                value={formData.default_fee_schedule_id != null ? String(formData.default_fee_schedule_id) : ""}
                onChange={(e) => {
                  if (e.target.value === "__ADD_NEW__") {
                    setShowAddFeeSchedule(true);
                  } else {
                    updateFormData({ default_fee_schedule_id: e.target.value ? Number(e.target.value) : null });
                  }
                }}
                className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
              >
                <option value="">Select Standard Fee Schedule</option>
                {standardFeeSchedules.map((fs) => (
                  <option key={fs.id} value={fs.id}>{fs.name}</option>
                ))}
                <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">+ Add New Fee Schedule</option>
              </select>
            ) : (
              <div className="p-3 bg-[#E8F4FD] border-2 border-[#B8D4EA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#1F3A5F]">Add Fee Schedule</h4>
                  <button onClick={() => setShowAddFeeSchedule(false)} className="p-1 hover:bg-[#D4E3F3] rounded transition-colors">
                    <X className="w-3 h-3 text-[#64748B]" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newFeeSchedule}
                  onChange={(e) => setNewFeeSchedule(e.target.value)}
                  placeholder="Fee Schedule Name"
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddFeeSchedule} className="flex items-center gap-1 px-2 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-xs">
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFeeSchedule(false);
                      setNewFeeSchedule("");
                    }}
                    className="px-2 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-[#64748B] mt-1">Used for new patients, ledger posting, clinical estimates</p>
          </div>
        </div>
      </div>

      {/* Scheduler Configuration Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
          <Clock className="w-4 h-4 text-[#3A6EA5]" />
          Scheduler Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Scheduler Time Interval (minutes) <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.slot_interval_minutes ?? 10}
              onChange={(e) => updateFormData({ slot_interval_minutes: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
            <p className="text-xs text-[#64748B] mt-1">Defines appointment grid resolution</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Schedule Start Hour</label>
            <input
              type="number"
              min={0}
              max={23}
              value={formData.schedule_start_hour ?? ""}
              onChange={(e) =>
                updateFormData({ schedule_start_hour: e.target.value === "" ? null : parseInt(e.target.value, 10) })
              }
              placeholder="8"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">First bookable hour (0–23)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">Schedule End Hour</label>
            <input
              type="number"
              min={0}
              max={23}
              value={formData.schedule_end_hour ?? ""}
              onChange={(e) =>
                updateFormData({ schedule_end_hour: e.target.value === "" ? null : parseInt(e.target.value, 10) })
              }
              placeholder="18"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">Last bookable hour (0–23)</p>
          </div>
        </div>
      </div>

      {/* Audit Information Section */}
      {mode === "view" && (formData.created_by != null || formData.created_at || formData.updated_at) && (
        <div className="bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
            <Info className="w-4 h-4 text-[#3A6EA5]" />
            Audit Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">CREATED BY</label>
              <p className="text-sm text-[#1E293B] font-medium">
                {formData.created_by != null ? String(formData.created_by) : "System"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">CREATED ON</label>
              <p className="text-sm text-[#1E293B] font-medium">{fmtDateTime(formData.created_at)}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">LAST UPDATED BY</label>
              {/* OfficeRead has no `updated_by` (backend gap #22) */}
              <p className="text-sm text-[#1E293B] font-medium">—</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">LAST UPDATED ON</label>
              <p className="text-sm text-[#1E293B] font-medium">{fmtDateTime(formData.updated_at)}</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748B] uppercase">OFFICE STATUS:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    formData.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {formData.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="text-xs text-[#64748B]">
                Office ID: <span className="font-bold text-[#1E293B]">{formData.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function extractError(err: unknown): string | undefined {
  if (err && typeof err === "object") {
    const e = err as { response?: { data?: { detail?: string } }; message?: string };
    return e.response?.data?.detail || e.message;
  }
  return undefined;
}
