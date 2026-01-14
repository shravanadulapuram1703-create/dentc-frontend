import {
  Link2,
  Shield,
  Camera,
  MessageSquare,
  CreditCard,
  Globe,
} from "lucide-react";
import { type Office } from "../../../../data/officeData";

interface IntegrationTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}

export default function IntegrationTab({
  formData,
  updateFormData,
}: IntegrationTabProps) {
  // const eClaims = formData.eClaims ?? {};
  // const transworld = formData.transworld ?? {};
  // const imagingSystems = formData.imaging ?? [];
  // const textMessaging = formData.textMessaging ?? {};
  // const patientUrls = formData.patientUrls ?? {};
  // const acceptedCards = formData.acceptedCards ?? [];
  const integrations = formData.integrations ?? {};

  const eClaims = integrations.eClaims ?? {};
  const transworld = integrations.transworld ?? {};
  const imagingSystems = integrations.imaging ?? {};
  const textMessaging = integrations.textMessaging ?? {};
  const patientUrls = integrations.patientUrls ?? {};
  const acceptedCards = integrations.acceptedCards ?? [];


  // const updateEClaims = (field: string, value: string) => {
  //   updateFormData({
  //     eClaims: {
  //       ...formData.eClaims,
  //       [field]: value,
  //     } as any,
  //   });
  // };
  // const updateTransworld = (field: string, value: string | number) => {
  //   updateFormData({
  //     transworld: {
  //       ...formData.transworld,
  //       [field]: value,
  //     } as any,
  //   });
  // };

  // const updateImaging = (system: string, field: string, value: string) => {
  //   updateFormData({
  //     imaging: {
  //       ...formData.imaging,
  //       [system]: {
  //         ...(formData.imaging as any)?.[system],
  //         [field]: value,
  //       },
  //     } as any,
  //   });
  // };

  // const updateImagingSystem = (
  //   index: number,
  //   field: keyof ImagingSystemConfig,
  //   value: string
  // ) => {
  //   const updated = [...imagingSystems];
  //   const existing = updated.find((s) => s.index === index) || { index };
  //   const merged = { ...existing, [field]: value };

  //   updateFormData({
  //     imagingSystems: [
  //       ...updated.filter((s) => s.index !== index),
  //       merged,
  //     ],
  //   });
  // };


  // const updateTextMessaging = (field: string, value: string | boolean) => {
  //   updateFormData({
  //     textMessaging: {
  //       ...formData.textMessaging,
  //       [field]: value,
  //     } as any,
  //   });
  // };

  // const updatePatientUrls = (field: string, value: string) => {
  //   updateFormData({
  //     patientUrls: {
  //       ...formData.patientUrls,
  //       [field]: value,
  //     } as any,
  //   });
  // };

  
  const updateEClaims = (field: string, value: string) => {
    updateFormData({
      integrations: {
        ...formData.integrations,
        eClaims: {
          ...(formData.integrations?.eClaims ?? {}),
          [field]: value,
        },
      },
    });
  };

  const updateTransworld = (field: string, value: string | number) => {
    updateFormData({
      integrations: {
        ...formData.integrations,
        transworld: {
          ...(formData.integrations?.transworld ?? {}),
          [field]: value,
        },
      },
    });
  };


  // const updateImaging = (system: string, field: string, value: string) => {
  //   updateFormData({
  //     integrations: {
  //       ...formData.integrations,
  //       imaging: {
  //         ...(formData.integrations?.imaging ?? {}),
  //         [system]: {
  //           ...(formData.integrations?.imaging as any)?.[system],
  //           [field]: value,
  //         },
  //       },
  //     },
  //   });
  // };

  const updateImaging = (
    system: "system1" | "system2" | "system3",
    field: "name" | "linkType" | "mode",
    value: string
  ) => {
    updateFormData({
      integrations: {
        ...formData.integrations,
        imaging: {
          ...(formData.integrations?.imaging ?? {}),
          [system]: {
            ...(formData.integrations?.imaging?.[system] ?? {}),
            [field]: value,
          },
        },
      },
    });
  };


  const updateTextMessaging = (field: string, value: string | boolean) => {
    updateFormData({
      integrations: {
        ...formData.integrations,
        textMessaging: {
          ...(formData.integrations?.textMessaging ?? {}),
          [field]: value,
        },
      },
    });
  };

  const updatePatientUrls = (field: string, value: string) => {
    updateFormData({
      integrations: {
        ...formData.integrations,
        patientUrls: {
          ...(formData.integrations?.patientUrls ?? {}),
          [field]: value,
        },
      },
    });
  };

  
  
  const toggleCard = (card: string) => {
    const cards = integrations.acceptedCards ?? [];

    const updatedCards = cards.includes(card)
      ? cards.filter((c) => c !== card)
      : [...cards, card];

    updateFormData({
      integrations: {
        ...integrations,
        acceptedCards: updatedCards,
      },
    });
  };


  /* JSX BELOW REMAINS IDENTICAL — only bindings changed */


  return (
    <div className="space-y-6">
      {/* eClaims Integration */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Shield className="w-5 h-5 text-blue-600" />
          eClaims Integration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              EDI Vendor Type
            </label>
            <select
              value={eClaims?.vendorType || ""}
              onChange={(e) => updateEClaims("vendorType", e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Vendor</option>
              <option value="DentalXChange">DentalXChange</option>
              <option value="NEA">NEA</option>
              <option value="ClaimConnect">ClaimConnect</option>
              <option value="Tesia">Tesia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={eClaims?.username || ""}
              onChange={(e) => updateEClaims("username", e.target.value)}
              placeholder="Vendor username"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={eClaims?.password || ""}
              onChange={(e) => updateEClaims("password", e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Transworld Integration */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Link2 className="w-5 h-5 text-blue-600" />
          Transworld Integration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Accelerator Account
            </label>
            <input
              type="text"
              value={transworld?.acceleratorAccount || ""}
              onChange={(e) =>
                updateTransworld("acceleratorAccount", e.target.value)
              }
              placeholder="Account number"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Collections Account
            </label>
            <input
              type="text"
              value={transworld?.collectionsAccount || ""}
              onChange={(e) =>
                updateTransworld("collectionsAccount", e.target.value)
              }
              placeholder="Account number"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={transworld?.userId || ""}
              onChange={(e) => updateTransworld("userId", e.target.value)}
              placeholder="Transworld user ID"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={transworld?.password || ""}
              onChange={(e) => updateTransworld("password", e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Aging Days Threshold
            </label>
            <input
              type="number"
              value={transworld?.agingDays || ""}
              onChange={(e) =>
                updateTransworld("agingDays", parseInt(e.target.value))
              }
              placeholder="90"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Imaging Systems */}
      {/* <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Camera className="w-5 h-5 text-blue-600" />
          Imaging Systems
        </h3>

        <div className="space-y-6">
          {[1, 2, 3].map((num) => (
            <div key={num} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3">
                Imaging System {num}
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    X-Ray System
                  </label>
                  <select
                    value={
                      (imaging as any)?.[`system${num}`]?.name || ""
                    }
                    onChange={(e) =>
                      updateImaging(`system${num}`, "name", e.target.value)
                    }
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None</option>
                    <option value="Dentiray">Dentiray</option>
                    <option value="XVWeb">XVWeb</option>
                    <option value="Apteryx">Apteryx</option>
                    <option value="Dexis">Dexis</option>
                    <option value="Carestream">Carestream</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Link Type
                  </label>
                  <select
                    value={
                      (formData.imaging as any)?.[`system${num}`]?.linkType ||
                      ""
                    }
                    onChange={(e) =>
                      updateImaging(`system${num}`, "linkType", e.target.value)
                    }
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Patient ID">Patient ID</option>
                    <option value="Chart Number">Chart Number</option>
                    <option value="Account Number">Account Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mode
                  </label>
                  <select
                    value={
                      (formData.imaging as any)?.[`system${num}`]?.mode || ""
                    }
                    onChange={(e) =>
                      updateImaging(`system${num}`, "mode", e.target.value)
                    }
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Mode</option>
                    <option value="Default">Default</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div> */}
      {/* Imaging Systems */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Camera className="w-5 h-5 text-blue-600" />
          Imaging Systems
        </h3>

        <div className="space-y-6">
          {[1, 2, 3].map((num) => {
            const systemKey = `system${num}` as "system1" | "system2" | "system3";
            const system = integrations.imaging?.[systemKey] ?? {};

            return (
              <div
                key={num}
                className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200"
              >
                <h4 className="font-bold text-slate-900 mb-3">
                  Imaging System {num}
                </h4>

                <div className="grid grid-cols-3 gap-4">
                  {/* X-Ray System */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      X-Ray System
                    </label>
                    <select
                      value={system.name || ""}
                      onChange={(e) =>
                        updateImaging(systemKey, "name", e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg"
                    >
                      <option value="">None</option>
                      <option value="Dentiray">Dentiray</option>
                      <option value="XVWeb">XVWeb</option>
                      <option value="Apteryx">Apteryx</option>
                      <option value="Dexis">Dexis</option>
                      <option value="Carestream">Carestream</option>
                    </select>
                  </div>

                  {/* Link Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Link Type
                    </label>
                    <select
                      value={system.linkType || ""}
                      onChange={(e) =>
                        updateImaging(systemKey, "linkType", e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg"
                    >
                      <option value="">Select Type</option>
                      <option value="Patient ID">Patient ID</option>
                      <option value="Chart Number">Chart Number</option>
                      <option value="Account Number">Account Number</option>
                    </select>
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Mode
                    </label>
                    <select
                      value={system.mode || ""}
                      onChange={(e) =>
                        updateImaging(systemKey, "mode", e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg"
                    >
                      <option value="">Select Mode</option>
                      <option value="Default">Default</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Text Messaging */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Text Messaging
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Office SMS Number
            </label>
            <input
              type="tel"
              value={textMessaging?.phoneNumber || ""}
              onChange={(e) =>
                updateTextMessaging("phoneNumber", e.target.value)
              }
              placeholder="(555) 123-4567"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={textMessaging?.verified || false}
                onChange={(e) =>
                  updateTextMessaging("verified", e.target.checked)
                }
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                Number Verified
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Patient URLs */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Globe className="w-5 h-5 text-blue-600" />
          Patient Communication URLs
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Patient Forms URL
            </label>
            <input
              type="url"
              value={patientUrls?.formsUrl || ""}
              onChange={(e) => updatePatientUrls("formsUrl", e.target.value)}
              placeholder="https://forms.yourpractice.com"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Online Scheduling URL
            </label>
            <input
              type="url"
              value={patientUrls?.schedulingUrl || ""}
              onChange={(e) =>
                updatePatientUrls("schedulingUrl", e.target.value)
              }
              placeholder="https://schedule.yourpractice.com"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Financing URL
            </label>
            <input
              type="url"
              value={patientUrls?.financingUrl || ""}
              onChange={(e) =>
                updatePatientUrls("financingUrl", e.target.value)
              }
              placeholder="https://carecredit.com/yourpractice"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Custom URL 1
            </label>
            <input
              type="url"
              value={patientUrls?.customUrl1 || ""}
              onChange={(e) => updatePatientUrls("customUrl1", e.target.value)}
              placeholder="https://custom.yourpractice.com"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Custom URL 2
            </label>
            <input
              type="url"
              value={patientUrls?.customUrl2 || ""}
              onChange={(e) => updatePatientUrls("customUrl2", e.target.value)}
              placeholder="https://custom2.yourpractice.com"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Payment Portal */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Payment Portal - Accepted Credit Cards
        </h3>

        <div className="grid grid-cols-4 gap-4">
          {["Visa", "Mastercard", "American Express", "Discover"].map((card) => (
            <label
              key={card}
              className="flex items-center gap-2 cursor-pointer p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <input
                type="checkbox"
                // checked={(formData.acceptedCards || []).includes(card)}
                checked={(integrations.acceptedCards || []).includes(card)}
                onChange={() => toggleCard(card)}
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                {card}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
