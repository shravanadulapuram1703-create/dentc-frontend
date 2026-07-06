// Generic utility runner route — /utilities/run/:utilityId. Looks the utility up
// in the catalog and hands it to the UtilityShell. Unknown ids fall back to a
// not-found notice. Page chrome (GlobalNav) is provided by AdminPageWrapper.
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import UtilityShell from "../UtilityShell";
import { getUtility } from "../utilityCatalog";

export default function UtilityRunnerPage() {
  const { utilityId } = useParams<{ utilityId: string }>();
  const navigate = useNavigate();
  const { currentOffice } = useAuth();
  const def = utilityId ? getUtility(utilityId) : undefined;

  if (!def) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          type="button"
          onClick={() => navigate("/utilities")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#3A6EA5] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Utilities
        </button>
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16 bg-white rounded-lg border border-[#E2E8F0]">
          <SearchX className="w-10 h-10 text-[#94A3B8]" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-[#1F3A5F]">Utility not found</h1>
          <p className="text-sm text-[#64748B] max-w-sm">
            No utility matches “{utilityId}”. It may have been renamed or removed.
          </p>
        </div>
      </div>
    );
  }

  return <UtilityShell def={def} currentOffice={currentOffice} />;
}
