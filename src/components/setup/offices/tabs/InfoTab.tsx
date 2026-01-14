import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, DollarSign, Clock, Plus, X } from "lucide-react";
import api from "../../../../services/api";
import { type Office } from "../../../../data/officeData";

interface InfoTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
  mode?: "view" | "add" | "edit";
}

interface Provider {
  id: string;
  name: string;
  npi?: string;
  license?: string;
}

interface FeeSchedule {
  id: string;
  name: string;
  type: "STANDARD" | "UCR";
}




export default function InfoTab({ formData, updateFormData }: InfoTabProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [timeZones, setTimeZones] = useState<string[]>([]);

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddFeeSchedule, setShowAddFeeSchedule] = useState(false);
  const [showAddUCRFeeSchedule, setShowAddUCRFeeSchedule] = useState(false);

  const [newProvider, setNewProvider] = useState({ name: "", npi: "", license: "" });
  const [newFeeSchedule, setNewFeeSchedule] = useState("");
  const [newUCRFeeSchedule, setNewUCRFeeSchedule] = useState("");

  const [standardFeeSchedules, setStandardFeeSchedules] = useState<any[]>([]);
  const [ucrFeeSchedules, setUcrFeeSchedules] = useState<any[]>([]);


  const defaultFeeScheduleName = formData.defaultFeeSchedule;

  const defaultUCRFeeScheduleName = formData.defaultUCRFeeSchedule;

  console.log("defaultFeeScheduleId",defaultFeeScheduleName)

  console.log("defaultUCRFeeScheduleId",defaultUCRFeeScheduleName)

  /* -------------------- LOAD METADATA -------------------- */
  useEffect(() => {
    api.get("/api/v1/offices/metadata").then((res) => {
      setProviders(res.data.billing_providers);
      // setFeeSchedules(res.data.fee_schedules);
      setTimeZones(res.data.time_zones);

      const allFeeSchedules = res.data.fee_schedules || [];

      setStandardFeeSchedules(
        allFeeSchedules.filter((fs: any) => fs.type === "STANDARD")
      );

      setUcrFeeSchedules(
        allFeeSchedules.filter((fs: any) => fs.type === "UCR")
      );



    });
  }, []);

  useEffect(() => {
    if (!feeSchedules.length) return;

    // Map DEFAULT Fee Schedule
    if (formData.defaultFeeSchedule) {
      const standard = feeSchedules.find(
        (fs) => fs.name === formData.defaultFeeSchedule
      );

      if (standard && standard.id !== formData.defaultFeeSchedule) {
        updateFormData({ defaultFeeSchedule: standard.id });
      }
    }

    // Map UCR Fee Schedule
    if (formData.defaultUCRFeeSchedule) {
      const ucr = feeSchedules.find(
        (fs) => fs.name === formData.defaultUCRFeeSchedule
      );

      if (ucr && ucr.id !== formData.defaultUCRFeeSchedule) {
        updateFormData({ defaultUCRFeeSchedule: ucr.id });
      }
    }
  }, [feeSchedules]);

  console.log("SELECT VALUE", formData.defaultFeeSchedule);
  console.log("OPTION IDS", feeSchedules.map(f => f.id));

  /* -------------------- ADD PROVIDER -------------------- */
  const handleAddProvider = async () => {
    if (!newProvider.name.trim()) {
      alert("Provider name is required");
      return;
    }

    const res = await api.post("/api/v1/offices/billing-providers", newProvider);
    setProviders((p) => [...p, res.data]);
    

    updateFormData({
      billingProviderId: res.data.id,
      billingProviderName: res.data.name,
    });

    setShowAddProvider(false);
    setNewProvider({ name: "", npi: "", license: "" });
  };

  /* -------------------- ADD FEE SCHEDULE -------------------- */
  // const createFeeSchedule = async (name: string, type: "STANDARD" | "UCR") => {
  //   const res = await api.post("/api/v1/fee-schedules", { name, type });
  //   setFeeSchedules((f) => [...f, res.data]);
  //   setStandardFeeSchedules((prev) => [...prev, res.data]);


  //   if (type === "UCR") {
  //     updateFormData({ defaultUCRFeeSchedule: res.data.name });
  //     setUcrFeeSchedules((prev) => [...prev, res.data]);


  //   } else {
  //     updateFormData({ defaultFeeSchedule: res.data.name });
  //     setStandardFeeSchedules((prev) => [...prev, res.data]);

  //   }
  // };



  const createFeeSchedule = async (
    name: string,
    type: "STANDARD" | "UCR"
  ) => {
    const res = await api.post("/api/v1/fee-schedules", { name, type });
    const newSchedule = res.data;

    if (type === "UCR") {
      setUcrFeeSchedules((prev) =>
        prev.some((fs) => fs.id === newSchedule.id)
          ? prev
          : [...prev, newSchedule]
      );

      updateFormData({
        defaultUCRFeeSchedule: newSchedule.id,
      });
    } else {
      setStandardFeeSchedules((prev) =>
        prev.some((fs) => fs.id === newSchedule.id)
          ? prev
          : [...prev, newSchedule]
      );

      updateFormData({
        defaultFeeSchedule: newSchedule.id,
      });
    }
  };

  const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  // const TIME_ZONES = [
  //   "America/New_York",
  //   "America/Chicago",
  //   "America/Denver",
  //   "America/Phoenix",
  //   "America/Los_Angeles",
  //   "America/Anchorage",
  //   "Pacific/Honolulu",
  // ];

  /* -------------------- JSX BELOW (UNCHANGED UI) -------------------- */

  // ⬇️ All JSX from your original component remains the same
  // Only replace:
  // - mockProviders → providers
  // - mockFeeSchedules → feeSchedules
  // - TIME_ZONES → timeZones

  // const mockFeeSchedules = [
  //   "Standard Fee Schedule",
  //   "UCR California 2024",
  //   "PPO Network A",
  //   "Medicaid Schedule",
  //   "Pediatric Fee Schedule",
  // ];
  


  console.log("feeSchedules item:", feeSchedules);
  
  // const handleAddFeeSchedule = () => {
  //   if (!newFeeSchedule.trim()) {
  //     alert("Fee Schedule name is required");
  //     return;
  //   }
    
  //   updateFormData({ defaultFeeSchedule: newFeeSchedule });
  //   alert(`Fee Schedule "${newFeeSchedule}" added successfully!`);
  //   setShowAddFeeSchedule(false);
  //   setNewFeeSchedule("");
  // };



  const handleAddFeeSchedule = async () => {
    if (!newFeeSchedule.trim()) {
      alert("Fee Schedule name is required");
      return;
    }

    try {
      const res = await api.post("/api/v1/offices/fee-schedules", {
        name: newFeeSchedule,
        type: "STANDARD"
      });

      setStandardFeeSchedules((prev) => [...prev, res.data]);

      updateFormData({
        defaultFeeSchedule: res.data.id
      });

      alert(`Fee Schedule "${res.data.name}" added successfully`);
      setShowAddFeeSchedule(false);
      setNewFeeSchedule("");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add fee schedule");
    }
  };

  // const handleAddUCRFeeSchedule = () => {
  //   if (!newUCRFeeSchedule.trim()) {
  //     alert("UCR Fee Schedule name is required");
  //     return;
  //   }
    
  //   updateFormData({ defaultUCRFeeSchedule: newUCRFeeSchedule });
  //   alert(`UCR Fee Schedule "${newUCRFeeSchedule}" added successfully!`);
  //   setShowAddUCRFeeSchedule(false);
  //   setNewUCRFeeSchedule("");
  // };

  const handleAddUCRFeeSchedule = async () => {
    if (!newUCRFeeSchedule.trim()) {
      alert("UCR Fee Schedule name is required");
      return;
    }

    try {
      const res = await api.post("/api/v1/offices/fee-schedules", {
        name: newUCRFeeSchedule,
        type: "UCR"
      });

      setUcrFeeSchedules((prev) => [...prev, res.data]);

      updateFormData({
        defaultUCRFeeSchedule: res.data.id
      });

      alert(`UCR Fee Schedule "${res.data.name}" added successfully`);
      setShowAddUCRFeeSchedule(false);
      setNewUCRFeeSchedule("");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add UCR fee schedule");
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
              value={formData.officeId || ""}
              disabled
              className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-[#F7F9FC] text-[#64748B] cursor-not-allowed text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">
              Auto-generated, read-only
            </p>
          </div>

          {/* Office Name */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Office Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.officeName || ""}
              onChange={(e) => updateFormData({ officeName: e.target.value })}
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
              value={formData.shortId || ""}
              onChange={(e) =>
                updateFormData({ shortId: e.target.value.toUpperCase() })
              }
              placeholder="e.g., MSD"
              maxLength={6}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 uppercase text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">
              Used in UI, scheduler, reports (max 6 chars)
            </p>
          </div>

          {/* Opening Date */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Opening Date
            </label>
            <input
              type="date"
              value={formData.openingDate || ""}
              onChange={(e) => updateFormData({ openingDate: e.target.value })}
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
          {/* Address Line 1 */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Address Line 1 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.address1 || ""}
              onChange={(e) => updateFormData({ address1: e.target.value })}
              placeholder="Street address"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Address Line 2 */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address2 || ""}
              onChange={(e) => updateFormData({ address2: e.target.value })}
              placeholder="Suite, Unit, Building, etc."
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              City <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.city || ""}
              onChange={(e) => updateFormData({ city: e.target.value })}
              placeholder="City"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              State <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.state || ""}
              onChange={(e) => updateFormData({ state: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              <option value="">Select State</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* ZIP Code */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              ZIP Code <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.zip || ""}
              onChange={(e) => updateFormData({ zip: e.target.value })}
              placeholder="12345"
              maxLength={10}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Time Zone */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Time Zone <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.timeZone || ""}
              onChange={(e) => updateFormData({ timeZone: e.target.value })}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#64748B] mt-1">
              Drives scheduling & timestamps
            </p>
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
          {/* Phone 1 */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Phone 1 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone1 || ""}
              onChange={(e) => updateFormData({ phone1: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Phone 1 Extension */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Extension
            </label>
            <input
              type="text"
              value={formData.phone1Ext || ""}
              onChange={(e) => updateFormData({ phone1Ext: e.target.value })}
              placeholder="100"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Phone 2 */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Phone 2
            </label>
            <input
              type="tel"
              value={formData.phone2 || ""}
              onChange={(e) => updateFormData({ phone2: e.target.value })}
              placeholder="(555) 123-4568"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Email <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="contact@example.com"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
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
              <div className="flex gap-2">
                <select
                  value={formData.billingProviderId || ""}
                  onChange={(e) => {
                    if (e.target.value === "__ADD_NEW__") {
                      setShowAddProvider(true);
                    } else {
                      const selectedProvider = providers.find(
                        (p) => p.id === e.target.value
                      );
                      updateFormData({
                        billingProviderId: e.target.value,
                        billingProviderName: selectedProvider?.name || "",
                      });
                    }
                  }}
                  className="flex-1 px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                >
                  <option value="">Select Provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">
                    + Add New Provider
                  </option>
                </select>
              </div>
            ) : (
              <div className="p-4 bg-[#E8F4FD] border-2 border-[#B8D4EA] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#1F3A5F]">Add New Provider</h4>
                  <button
                    onClick={() => setShowAddProvider(false)}
                    className="p-1 hover:bg-[#D4E3F3] rounded transition-colors"
                  >
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
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">
                      NPI Number
                    </label>
                    <input
                      type="text"
                      value={newProvider.npi}
                      onChange={(e) => setNewProvider({ ...newProvider, npi: e.target.value })}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">
                      License Number
                    </label>
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
                  <button
                    onClick={handleAddProvider}
                    className="flex items-center gap-2 px-3 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                  >
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
            
            <p className="text-xs text-[#64748B] mt-1">
              Provider used for insurance claims
            </p>
          </div>

          {/* Use Billing License */}
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.useBillingLicense || false}
                onChange={(e) =>
                  updateFormData({ useBillingLicense: e.target.checked })
                }
                className="w-4 h-4 text-[#3A6EA5] border-2 border-[#CBD5E1] rounded focus:ring-2 focus:ring-[#3A6EA5]/20"
              />
              <span className="text-sm font-bold text-[#1E293B]">
                Use provider license in claims
              </span>
            </label>
          </div>

          {/* Tax ID */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Tax ID <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.taxId || ""}
              onChange={(e) => updateFormData({ taxId: e.target.value })}
              placeholder="12-3456789"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
          </div>

          {/* Office Group */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Office Group
            </label>
            <input
              type="text"
              value={formData.officeGroup || ""}
              onChange={(e) => updateFormData({ officeGroup: e.target.value })}
              placeholder="e.g., Bay Area Group"
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            />
            <p className="text-xs text-[#64748B] mt-1">
              Optional grouping for enterprise reporting
            </p>
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
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Default UCR Fee Schedule
            </label>
            
            {!showAddUCRFeeSchedule ? (
              // <select
              //   value={formData.defaultUCRFeeSchedule || ""}
              //   onChange={(e) => {
              //     if (e.target.value === "__ADD_NEW__") {
              //       setShowAddUCRFeeSchedule(true);
              //     } else {
              //       updateFormData({ defaultUCRFeeSchedule: e.target.value });
              //     }
              //   }}
              //   className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              // >
              //   <option value="">Select UCR Fee Schedule</option>
                
              //   {feeSchedules.map((schedule) => (
                  
              //     <option key={schedule.id} value={schedule.id}>
              //       {schedule.name}
              //       {/* {defaultFeeScheduleName} */}
                    
              //     </option>
              //   ))}
              //   <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">
              //     + Add New Fee Schedule
              //   </option>
              // </select>
              <select
                value={formData.defaultUCRFeeSchedule || ""}
                onChange={(e) =>{
                  if (e.target.value === "__ADD_NEW__") {
                    setShowAddUCRFeeSchedule(true);
                  } else {
                  updateFormData({ defaultUCRFeeSchedule: e.target.value })
                  }
                }}
                className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
              >
                <option value="">Select UCR Fee Schedule</option>

                {ucrFeeSchedules.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.name}
                  </option>
                ))}

                <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">
                  + Add New UCR Fee Schedule
                </option>
              </select>
            ) : (
              <div className="p-3 bg-[#E8F4FD] border-2 border-[#B8D4EA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#1F3A5F]">Add UCR Fee Schedule</h4>
                  <button
                    onClick={() => setShowAddUCRFeeSchedule(false)}
                    className="p-1 hover:bg-[#D4E3F3] rounded transition-colors"
                  >
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
                  <button
                    onClick={handleAddUCRFeeSchedule}
                    className="flex items-center gap-1 px-2 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-xs"
                  >
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
              // <select
              //   value={formData.defaultFeeSchedule || ""}
              //   onChange={(e) => {
              //     if (e.target.value === "__ADD_NEW__") {
              //       setShowAddFeeSchedule(true);
              //     } else {
              //       updateFormData({ defaultFeeSchedule: e.target.value });
              //     }
              //   }}
              //   className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
              // >
              //   <option value="">Select Fee Schedule</option>
              //   {feeSchedules.map((schedule) => (
              //     <option key={schedule.id} value={schedule.id}>
              //       {schedule.name}
              //       {/* {defaultUCRFeeScheduleName} */}
              //     </option>
              //   ))}
              //   <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">
              //     + Add New Fee Schedule
              //   </option>
              // </select>
              <select
                value={formData.defaultFeeSchedule || ""}
                onChange={(e) =>{
                  if (e.target.value === "__ADD_NEW__") {
                    setShowAddFeeSchedule(true);
                    
                  } else {
                  updateFormData({ defaultFeeSchedule: e.target.value })
                }
              }}
                className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm"
              >
                <option value="">Select Standard Fee Schedule</option>

                {standardFeeSchedules.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.name}
                  </option>
                ))}

                <option value="__ADD_NEW__" className="font-bold text-[#3A6EA5]">
                  + Add New Fee Schedule
                </option>
              </select>
            ) : (
              <div className="p-3 bg-[#E8F4FD] border-2 border-[#B8D4EA] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#1F3A5F]">Add Fee Schedule</h4>
                  <button
                    onClick={() => setShowAddFeeSchedule(false)}
                    className="p-1 hover:bg-[#D4E3F3] rounded transition-colors"
                  >
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
                  <button
                    onClick={handleAddFeeSchedule}
                    className="flex items-center gap-1 px-2 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-xs"
                  >
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
            
            <p className="text-xs text-[#64748B] mt-1">
              Used for new patients, ledger posting, clinical estimates
            </p>
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
          {/* Scheduler Time Interval */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Scheduler Time Interval (minutes){" "}
              <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.schedulerTimeInterval || 10}
              onChange={(e) =>
                updateFormData({
                  schedulerTimeInterval: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
            <p className="text-xs text-[#64748B] mt-1">
              Defines appointment grid resolution
            </p>
          </div>
        </div>
      </div>

      {/* 🔐 Audit Information Section */}
      {mode === "view" && formData.createdBy && (
        <div className="bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-3 pb-2 border-b-2 border-[#E2E8F0]">
            <Info className="w-4 h-4 text-[#3A6EA5]" />
            Audit Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Created By */}
            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">
                CREATED BY
              </label>
              <p className="text-sm text-[#1E293B] font-medium">
                {formData.createdBy || "System"}
              </p>
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">
                CREATED ON
              </label>
              <p className="text-sm text-[#1E293B] font-medium">
                {formData.createdDate
                  ? new Date(formData.createdDate).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </p>
            </div>

            {/* Last Modified By */}
            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">
                LAST UPDATED BY
              </label>
              <p className="text-sm text-[#1E293B] font-medium">
                {formData.modifiedBy || "—"}
              </p>
            </div>

            {/* Last Modified Date */}
            <div>
              <label className="block text-xs font-bold text-[#64748B] mb-1 uppercase tracking-wide">
                LAST UPDATED ON
              </label>
              <p className="text-sm text-[#1E293B] font-medium">
                {formData.modifiedDate
                  ? new Date(formData.modifiedDate).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748B] uppercase">
                  OFFICE STATUS:
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    formData.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {formData.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="text-xs text-[#64748B]">
                Office ID: <span className="font-bold text-[#1E293B]">{formData.officeId}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}