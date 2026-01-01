import { Settings, DollarSign, Shield, Calendar, User, FileCheck } from "lucide-react";
import { type Office } from "../../../../data/officeData";

interface AdvancedTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}

export default function AdvancedTab({
  formData,
  updateFormData,
}: AdvancedTabProps) {
  const advanced = formData.advanced || {};

  const updateAdvanced = (field: string, value: any) => {
    updateFormData({
      advanced: {
        ...advanced,
        [field]: value,
      } as any,
    });
  };

  return (
    <div className="space-y-6">
      {/* Financial Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <DollarSign className="w-5 h-5 text-blue-600" />
          Financial Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Annual Finance Charge %
            </label>
            <input
              type="number"
              step="0.1"
              value={advanced.annualFinanceChargePercent || ""}
              onChange={(e) =>
                updateAdvanced("annualFinanceChargePercent", parseFloat(e.target.value))
              }
              placeholder="18.0"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Minimum Balance for Finance Charge
            </label>
            <input
              type="number"
              step="0.01"
              value={advanced.minimumBalance || ""}
              onChange={(e) =>
                updateAdvanced("minimumBalance", parseFloat(e.target.value))
              }
              placeholder="50.00"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Minimum Finance Charge
            </label>
            <input
              type="number"
              step="0.01"
              value={advanced.minimumFinanceCharge || ""}
              onChange={(e) =>
                updateAdvanced("minimumFinanceCharge", parseFloat(e.target.value))
              }
              placeholder="2.00"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Days Before Finance Charge
            </label>
            <input
              type="number"
              value={advanced.daysBeforeFinanceCharge || ""}
              onChange={(e) =>
                updateAdvanced("daysBeforeFinanceCharge", parseInt(e.target.value))
              }
              placeholder="30"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Sales Tax %
            </label>
            <input
              type="number"
              step="0.1"
              value={advanced.salesTaxPercent || ""}
              onChange={(e) =>
                updateAdvanced("salesTaxPercent", parseFloat(e.target.value))
              }
              placeholder="8.5"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Insurance & Scheduler Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Shield className="w-5 h-5 text-blue-600" />
          Insurance & Scheduler Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Insurance Group
            </label>
            <input
              type="text"
              value={advanced.insuranceGroup || ""}
              onChange={(e) => updateAdvanced("insuranceGroup", e.target.value)}
              placeholder="e.g., PPO Network A"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Scheduler End Date
            </label>
            <input
              type="date"
              value={advanced.schedulerEndDate || ""}
              onChange={(e) =>
                updateAdvanced("schedulerEndDate", e.target.value)
              }
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Eligibility Check Threshold (days)
            </label>
            <input
              type="number"
              value={advanced.eligibilityThresholdDays || ""}
              onChange={(e) =>
                updateAdvanced("eligibilityThresholdDays", parseInt(e.target.value))
              }
              placeholder="30"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={advanced.sendECard || false}
                onChange={(e) => updateAdvanced("sendECard", e.target.checked)}
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                Send eCard
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Default Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Settings className="w-5 h-5 text-blue-600" />
          Default Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Place of Service
            </label>
            <select
              value={advanced.defaultPlaceOfService || ""}
              onChange={(e) =>
                updateAdvanced("defaultPlaceOfService", e.target.value)
              }
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Office">Office</option>
              <option value="Hospital">Hospital</option>
              <option value="Nursing Home">Nursing Home</option>
              <option value="School">School</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Appointment Duration (minutes)
            </label>
            <input
              type="number"
              value={advanced.defaultAppointmentDuration || ""}
              onChange={(e) =>
                updateAdvanced("defaultAppointmentDuration", parseInt(e.target.value))
              }
              placeholder="60"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Area Code
            </label>
            <input
              type="text"
              value={advanced.defaultAreaCode || ""}
              onChange={(e) => updateAdvanced("defaultAreaCode", e.target.value)}
              placeholder="415"
              maxLength={3}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default City
            </label>
            <input
              type="text"
              value={advanced.defaultCity || ""}
              onChange={(e) => updateAdvanced("defaultCity", e.target.value)}
              placeholder="City"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default State
            </label>
            <input
              type="text"
              value={advanced.defaultState || ""}
              onChange={(e) => updateAdvanced("defaultState", e.target.value)}
              placeholder="CA"
              maxLength={2}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default ZIP Code
            </label>
            <input
              type="text"
              value={advanced.defaultZip || ""}
              onChange={(e) => updateAdvanced("defaultZip", e.target.value)}
              placeholder="12345"
              maxLength={10}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Preferred Provider
            </label>
            <select
              value={advanced.preferredProvider || ""}
              onChange={(e) =>
                updateAdvanced("preferredProvider", e.target.value)
              }
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Provider</option>
              <option value="Dr. Sarah Johnson">Dr. Sarah Johnson</option>
              <option value="Dr. Michael Chen">Dr. Michael Chen</option>
              <option value="Dr. Emily Rodriguez">Dr. Emily Rodriguez</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Coverage Type
            </label>
            <select
              value={advanced.defaultCoverageType || ""}
              onChange={(e) =>
                updateAdvanced("defaultCoverageType", e.target.value)
              }
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PPO">PPO</option>
              <option value="HMO">HMO</option>
              <option value="Indemnity">Indemnity</option>
              <option value="Medicaid">Medicaid</option>
              <option value="Medicare">Medicare</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={advanced.isOrthoOffice || false}
                onChange={(e) =>
                  updateAdvanced("isOrthoOffice", e.target.checked)
                }
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                Orthodontic Office
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Patient Check-In Defaults */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <FileCheck className="w-5 h-5 text-blue-600" />
          Patient Check-In Defaults
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={advanced.hipaaNotice || false}
              onChange={(e) => updateAdvanced("hipaaNotice", e.target.checked)}
              className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-slate-700">
              HIPAA Notice
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={advanced.consentForm || false}
              onChange={(e) => updateAdvanced("consentForm", e.target.checked)}
              className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-slate-700">
              Consent Form
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={advanced.additionalConsentForm || false}
              onChange={(e) =>
                updateAdvanced("additionalConsentForm", e.target.checked)
              }
              className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-slate-700">
              Additional Consent Form
            </span>
          </label>
        </div>
      </div>

      {/* Automated Campaigns */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Calendar className="w-5 h-5 text-blue-600" />
          Automated Campaigns
        </h3>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Effective Date for Automation Rules
          </label>
          <input
            type="date"
            value={advanced.automatedCampaignsEffectiveDate || ""}
            onChange={(e) =>
              updateAdvanced("automatedCampaignsEffectiveDate", e.target.value)
            }
            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
