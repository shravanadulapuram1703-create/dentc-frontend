import { Zap, AlertCircle } from "lucide-react";
import { type Office } from "../../../../data/officeData";

interface SmartAssistTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}

const SMARTASSIST_ITEMS = [
  { key: "payment", label: "Payment", hasBalance: true, hasTemplate: false },
  { key: "email", label: "Email", hasBalance: false, hasTemplate: false },
  { key: "cellPhone", label: "Cell Phone", hasBalance: false, hasTemplate: false },
  { key: "eligibility", label: "Eligibility", hasBalance: false, hasTemplate: false },
  { key: "medicalHistory", label: "Medical History", hasBalance: false, hasTemplate: true },
  { key: "hipaa", label: "HIPAA", hasBalance: false, hasTemplate: true },
  { key: "consentForm1", label: "Consent Form 1", hasBalance: false, hasTemplate: true },
  { key: "consentForm2", label: "Consent Form 2", hasBalance: false, hasTemplate: true },
  { key: "consentForm3", label: "Consent Form 3", hasBalance: false, hasTemplate: true },
  { key: "consentForm4", label: "Consent Form 4", hasBalance: false, hasTemplate: true },
  { key: "progressNotes", label: "Progress Notes", hasBalance: false, hasTemplate: false },
  { key: "ledgerPosting", label: "Ledger Posting", hasBalance: false, hasTemplate: false },
];

const DEFAULT_ITEM = {
  enabled: false,
  frequency: "Every Visit",
  includeBal: false,
  template: "",
};


export default function SmartAssistTab({
  formData,
  updateFormData,
}: SmartAssistTabProps) {
  // const smartAssist = formData.smartAssist ?? {
  //   enabled: false,
  //   items: {},
  // };

  const smartAssist = {
    enabled: formData.smartAssist?.enabled ?? false,
    items: formData.smartAssist?.items ?? {},
  };
  

  const toggleSmartAssist = (enabled: boolean) => {
    updateFormData({
      smartAssist: {
        ...smartAssist,
        enabled,
      },
    });
  };

  const updateItem = (itemKey: string, field: string, value: any) => {
    const existingItem = smartAssist.items[itemKey] ?? DEFAULT_ITEM;
    updateFormData({
      smartAssist: {
        ...smartAssist,
        items: {
          ...smartAssist.items,
          [itemKey]: {
            ...(smartAssist.items as any)[itemKey],
            [field]: value,
          },
        },
      },
    });
  };


  return (
    <div className="space-y-6">
      {/* SmartAssist Info */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">SmartAssist Automation:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Automates pre-visit, visit, and post-visit workflows</li>
            <li>Runs automatically based on configuration</li>
            <li>Applies to Scheduler & Patient workflows</li>
            <li>Respects consent & communication rules</li>
          </ul>
        </div>
      </div>

      {/* Master Toggle */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-blue-900 mb-1">
              Enable SmartAssist
            </h3>
            <p className="text-sm text-blue-700">
              Master toggle for all SmartAssist automation features
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smartAssist.enabled}
              onChange={(e) => toggleSmartAssist(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-16 h-8 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {!smartAssist.enabled && (
        <div className="flex items-start gap-2 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold">SmartAssist is currently disabled</p>
            <p>Enable SmartAssist above to configure automation items</p>
          </div>
        </div>
      )}

      {/* SmartAssist Items Configuration */}
      {smartAssist.enabled && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            SmartAssist Items Configuration
          </h3>

          <div className="space-y-3">
            {SMARTASSIST_ITEMS.map((item) => {
              const itemData = (smartAssist.items as any)?.[item.key] 
              || {
                enabled: false,
                frequency: "Every Visit",
                includeBal: false,
                template: "",
              };

              return (
                <div
                  key={item.key}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    itemData.enabled
                      ? "bg-blue-50 border-blue-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Enable Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={itemData.enabled}
                        onChange={(e) =>
                          updateItem(item.key, "enabled", e.target.checked)
                        }
                        className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    {/* Item Configuration */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-slate-900">
                          {item.label}
                        </h4>
                      </div>

                      {itemData.enabled && (
                        <div className="grid grid-cols-3 gap-3">
                          {/* Frequency */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Frequency
                            </label>
                            <select
                              value={itemData.frequency}
                              onChange={(e) =>
                                updateItem(item.key, "frequency", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="Every Visit">Every Visit</option>
                              <option value="Every Year">Every Year</option>
                            </select>
                          </div>

                          {/* SMS Template (if applicable) */}
                          {item.hasTemplate && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                SMS Template
                              </label>
                              <select
                                value={itemData.template || ""}
                                onChange={(e) =>
                                  updateItem(item.key, "template", e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Template</option>
                                <option value="Standard Medical History">
                                  Standard Medical History
                                </option>
                                <option value="HIPAA Consent 2024">
                                  HIPAA Consent 2024
                                </option>
                                <option value="Treatment Consent">
                                  Treatment Consent
                                </option>
                                <option value="Payment Agreement">
                                  Payment Agreement
                                </option>
                              </select>
                            </div>
                          )}

                          {/* Include Unpaid Balance (for Payment) */}
                          {item.hasBalance && (
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={itemData.includeBal}
                                  onChange={(e) =>
                                    updateItem(
                                      item.key,
                                      "includeBal",
                                      e.target.checked
                                    )
                                  }
                                  className="w-4 h-4 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">
                                  Include Unpaid Balance
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {smartAssist.enabled && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <h4 className="font-bold text-green-900 mb-2">
            SmartAssist Summary
          </h4>
          <div className="text-sm text-green-800">
            <p>
              <span className="font-semibold">
                {
                  SMARTASSIST_ITEMS.filter(
                    (item) => (smartAssist.items as any)?.[item.key]?.enabled
                  ).length
                }
              </span>{" "}
              of {SMARTASSIST_ITEMS.length} automation items enabled
            </p>
            <p className="mt-1 text-xs">
              SmartAssist will automatically run these workflows based on visit
              schedules
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
