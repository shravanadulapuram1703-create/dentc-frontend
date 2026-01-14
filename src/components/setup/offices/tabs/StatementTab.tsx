import { FileText, AlertCircle } from "lucide-react";
import { type Office } from "../../../../data/officeData";

interface StatementMessages {
  general?: string;
  current?: string;
  day30?: string;
  day60?: string;
  day90?: string;
  day120?: string;
}

interface StatementTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}

export default function StatementTab({
  formData,
  updateFormData,
}: StatementTabProps) {
  const messages: StatementMessages = formData.statementMessages ?? {};

  console.log("messages===>",messages)

  console.log("formData===>",formData)

  const updateStatementMessage = (
    field: keyof StatementMessages,
    value: string
  ) => {
    updateFormData({
      statementMessages: {
        ...messages,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Monthly Statement Messages */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <FileText className="w-5 h-5 text-blue-600" />
          Monthly Statement Messages
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Message Guidelines:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Maximum 100 characters per message</li>
                <li>No special characters (print limitation)</li>
                <li>Printed on patient statements</li>
              </ul>
            </div>
          </div>

          {(
            [
              ["general", "General Message"],
              ["current", "Current Balance Message"],
              ["day30", "30 Day Past Due Message"],
              ["day60", "60 Day Past Due Message"],
              ["day90", "90 Day Past Due Message"],
              ["day120", "120+ Day Past Due Message"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {label}
              </label>
              <textarea
                value={messages[key] || ""}
                onChange={(e) =>
                  updateStatementMessage(key, e.target.value)
                }
                maxLength={100}
                rows={2}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                {(messages[key] || "").length} / 100 characters
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Statement Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <FileText className="w-5 h-5 text-blue-600" />
          Statement Settings
        </h3>

        <div className="space-y-4">
          <Input
            label="Correspondence Name"
            value={formData.statementSettings?.correspondenceName?? ""}
            onChange={(v) =>
              updateFormData({
                statementSettings: {
                  ...formData.statementSettings,
                  correspondenceName: v,
                },
              })
            }
          />
          <Input
            label="Statement Name"
            value={formData.statementSettings?.statementName?? ""}
            onChange={(v) =>
              updateFormData({
                statementSettings: {
                  ...formData.statementSettings,
                  statementName: v,
                },
              })
            }
          />

          <Input
            label="Statement Address"
            value={formData.statementSettings?.statementAddress?? ""}
            onChange={(v) =>
              updateFormData({
                statementSettings: {
                  ...formData.statementSettings,
                  statementAddress: v,
                },
              })
            }
          />
          <Input
            label="Statement Phone"
            value={formData.statementSettings?.statementPhone?? ""}
            onChange={(v) =>
              updateFormData({
                statementSettings: {
                  ...formData.statementSettings,
                  statementPhone: v,
                },
              })
            }
          />

          {/* <Input
            label="Statement Name"
            value={formData.statementName}
            onChange={(v) => updateFormData({ statementName: v })}
          />

          <Textarea
            label="Statement Address"
            value={formData.statementAddress}
            onChange={(v) => updateFormData({ statementAddress: v })}
          /> */}
{/* 
          <Input
            label="Statement Phone"
            value={formData.statementPhone}
            onChange={(v) => updateFormData({ statementPhone: v })}
          /> */}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small helpers (optional, UI unchanged) ---------- */
function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}



// import { FileText, AlertCircle } from "lucide-react";
// import { type Office } from "../../../../data/officeData";

// interface StatementTabProps {
//   formData: Partial<Office>;
//   updateFormData: (updates: Partial<Office>) => void;
// }

// export default function StatementTab({
//   formData,
//   updateFormData,
// }: StatementTabProps) {
//   const updateStatementMessage = (field: string, value: string) => {
//     updateFormData({
//       statementMessages: {
//         ...formData.statementMessages,
//         [field]: value,
//       } as any,
//     });
//   };

//   return (
//     <div className="space-y-6">
//       {/* Monthly Statement Messages */}
//       <div>
//         <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
//           <FileText className="w-5 h-5 text-blue-600" />
//           Monthly Statement Messages
//         </h3>

//         <div className="space-y-4">
//           <div className="flex items-start gap-2 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
//             <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
//             <div className="text-sm text-yellow-800">
//               <p className="font-semibold">Message Guidelines:</p>
//               <ul className="list-disc list-inside mt-1 space-y-1">
//                 <li>Maximum 100 characters per message</li>
//                 <li>Special characters not allowed (print limitation)</li>
//                 <li>Messages appear on patient statements</li>
//               </ul>
//             </div>
//           </div>

//           {/* General Message */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               General Message
//             </label>
//             <textarea
//               value={formData.statementMessages?.general || ""}
//               onChange={(e) =>
//                 updateStatementMessage("general", e.target.value)
//               }
//               maxLength={100}
//               rows={2}
//               placeholder="Thank you for choosing our practice..."
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <p className="text-xs text-slate-500 mt-1">
//               {(formData.statementMessages?.general || "").length} / 100
//               characters
//             </p>
//           </div>

//           {/* Current Message */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               Current Balance Message
//             </label>
//             <textarea
//               value={formData.statementMessages?.current || ""}
//               onChange={(e) =>
//                 updateStatementMessage("current", e.target.value)
//               }
//               maxLength={100}
//               rows={2}
//               placeholder="Payment is due upon receipt..."
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <p className="text-xs text-slate-500 mt-1">
//               {(formData.statementMessages?.current || "").length} / 100
//               characters
//             </p>
//           </div>

//           {/* 30 Day Message */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               30 Day Past Due Message
//             </label>
//             <textarea
//               value={formData.statementMessages?.day30 || ""}
//               onChange={(e) => updateStatementMessage("day30", e.target.value)}
//               maxLength={100}
//               rows={2}
//               placeholder="Your account is 30 days past due..."
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <p className="text-xs text-slate-500 mt-1">
//               {(formData.statementMessages?.day30 || "").length} / 100
//               characters
//             </p>
//           </div>

//           {/* 60 Day Message */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               60 Day Past Due Message
//             </label>
//             <textarea
//               value={formData.statementMessages?.day60 || ""}
//               onChange={(e) => updateStatementMessage("day60", e.target.value)}
//               maxLength={100}
//               rows={2}
//               placeholder="Your account is 60 days past due..."
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <p className="text-xs text-slate-500 mt-1">
//               {(formData.statementMessages?.day60 || "").length} / 100
//               characters
//             </p>
//           </div>

//           {/* 90 Day Message */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               90 Day Past Due Message
//             </label>
//             <textarea
//               value={formData.statementMessages?.day90 || ""}
//               onChange={(e) => updateStatementMessage("day90", e.target.value)}
//               maxLength={100}
//               rows={2}
//               placeholder="Your account is 90 days past due. This is your final notice..."
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <p className="text-xs text-slate-500 mt-1">
//               {(formData.statementMessages?.day90 || "").length} / 100
//               characters
//             </p>
//           </div>

//           {/* 120 Day Message */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               120+ Day Past Due Message
//             </label>
//             <textarea
//               value={formData.statementMessages?.day120 || ""}
//               onChange={(e) =>
//                 updateStatementMessage("day120", e.target.value)
//               }
//               maxLength={100}
//               rows={2}
//               placeholder="Your account has been sent to collections..."
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <p className="text-xs text-slate-500 mt-1">
//               {(formData.statementMessages?.day120 || "").length} / 100
//               characters
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Statement Settings */}
//       <div>
//         <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
//           <FileText className="w-5 h-5 text-blue-600" />
//           Statement Settings
//         </h3>

//         <div className="space-y-4">
//           {/* Correspondence Name */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               Correspondence Name
//             </label>
//             <input
//               type="text"
//               value={formData.correspondenceName || ""}
//               onChange={(e) =>
//                 updateFormData({ correspondenceName: e.target.value })
//               }
//               placeholder="Practice name for correspondence"
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             />
//           </div>

//           {/* Logo Selection */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               Statement Logo
//             </label>
//             <div className="space-y-3">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="radio"
//                   name="logo-option"
//                   checked={!formData.logoUrl}
//                   onChange={() => updateFormData({ logoUrl: undefined })}
//                   className="w-4 h-4 text-blue-600"
//                 />
//                 <span className="text-sm font-medium text-slate-700">
//                   Use office default logo
//                 </span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="radio"
//                   name="logo-option"
//                   checked={!!formData.logoUrl}
//                   onChange={() => updateFormData({ logoUrl: "custom" })}
//                   className="w-4 h-4 text-blue-600"
//                 />
//                 <span className="text-sm font-medium text-slate-700">
//                   Upload custom logo
//                 </span>
//               </label>
//               {formData.logoUrl && (
//                 <div className="ml-6">
//                   <input
//                     type="file"
//                     accept="image/*"
//                     className="text-sm text-slate-600"
//                   />
//                   <p className="text-xs text-slate-500 mt-1">
//                     Accepted formats: JPG, PNG (max 2MB)
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Statement Name */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               Statement Name
//             </label>
//             <input
//               type="text"
//               value={formData.statementName || ""}
//               onChange={(e) =>
//                 updateFormData({ statementName: e.target.value })
//               }
//               placeholder="Name displayed on statements"
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             />
//           </div>

//           {/* Statement Address */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               Statement Address
//             </label>
//             <textarea
//               value={formData.statementAddress || ""}
//               onChange={(e) =>
//                 updateFormData({ statementAddress: e.target.value })
//               }
//               rows={3}
//               placeholder="Full address displayed on statements"
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//             />
//             <div className="mt-2">
//               <button
//                 type="button"
//                 onClick={() => {
//                   const address = `${formData.address1}${
//                     formData.address2 ? ", " + formData.address2 : ""
//                   }, ${formData.city}, ${formData.state} ${formData.zip}`;
//                   updateFormData({ statementAddress: address });
//                 }}
//                 className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
//               >
//                 Use treating office address
//               </button>
//             </div>
//           </div>

//           {/* Statement Phone */}
//           <div>
//             <label className="block text-sm font-semibold text-slate-700 mb-2">
//               Statement Phone
//             </label>
//             <input
//               type="tel"
//               value={formData.statementPhone || ""}
//               onChange={(e) =>
//                 updateFormData({ statementPhone: e.target.value })
//               }
//               placeholder="(555) 123-4567"
//               className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             />
//             <div className="mt-2">
//               <button
//                 type="button"
//                 onClick={() => {
//                   updateFormData({ statementPhone: formData.phone1 || "" });
//                 }}
//                 className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
//               >
//                 Use treating office phone
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
