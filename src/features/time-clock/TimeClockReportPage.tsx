// /time-clock/report — all-staff hours report + entry editor for managers
// (Denticon "TimeClock Editor" + time-clock report). Non-managers are pointed
// to their own time card.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import HoursReport from "./components/HoursReport";
import { canViewTeamTime } from "./timeClockAccess";

export default function TimeClockReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = canViewTeamTime(user?.role);

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <PageHeader
        title="Time Clock Report"
        subtitle="Hours worked by staff — review, correct and export"
        icon={<BarChart3 className="w-6 h-6 text-white" />}
        actions={
          <button
            type="button"
            onClick={() => navigate("/time-clock")}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" /> My time clock
          </button>
        }
      />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        {allowed ? (
          <HoursReport mode="team" />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white py-16 text-center">
            <ShieldAlert className="w-10 h-10 text-[#94A3B8]" strokeWidth={1.5} />
            <h2 className="text-lg font-bold text-[#1F3A5F]">Managers only</h2>
            <p className="max-w-sm text-sm text-[#64748B]">
              The all-staff hours report is available to owners, admins and office managers. You can review your own hours on your time card.
            </p>
            <button type="button" onClick={() => navigate("/time-clock")} className="rounded-md bg-[#3A6EA5] px-4 py-2 text-sm font-bold text-white hover:bg-[#2F5A88]">
              Open my time card
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
