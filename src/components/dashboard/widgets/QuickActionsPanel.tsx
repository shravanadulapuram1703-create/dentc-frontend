import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  CalendarPlus,
  Search,
  LogIn,
  LogOut,
  DollarSign,
  ClipboardList,
  FileText,
  Footprints,
  type LucideIcon,
} from "lucide-react";
import WidgetCard from "../components/WidgetCard";
import { utils } from "../../../styles/theme.js";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  to?: string;
  hint?: string;
  disabled?: boolean;
  reason?: string;
}

interface Props {
  currentOffice: string;
}

/**
 * One-click actions. Actions with real routes navigate directly; patient-context
 * actions route to patient search first; actions with no backend (walk-in) are
 * disabled with an explanation rather than faked.
 */
export default function QuickActionsPanel(_props: Props) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    { label: "Create Patient", icon: UserPlus, to: "/patient/new" },
    { label: "Schedule Appt", icon: CalendarPlus, to: "/scheduler" },
    { label: "Search Patient", icon: Search, to: "/patient" },
    { label: "Check In", icon: LogIn, to: "/scheduler", hint: "On the schedule" },
    { label: "Checkout", icon: LogOut, to: "/scheduler", hint: "On the schedule" },
    { label: "Collect Payment", icon: DollarSign, to: "/patient", hint: "Select a patient" },
    { label: "Treatment Plan", icon: ClipboardList, to: "/patient", hint: "Select a patient" },
    { label: "Insurance Claim", icon: FileText, to: "/patient", hint: "Select a patient" },
    {
      label: "Register Walk-In",
      icon: Footprints,
      disabled: true,
      reason: "No walk-in endpoint yet (see dashboard dev report)",
    },
  ];

  return (
    <WidgetCard title="Quick Actions" icon={<CalendarPlus className="w-4 h-4" />}>
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              title={a.disabled ? a.reason : a.hint}
              onClick={() => a.to && navigate(a.to)}
              className={utils.cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-all",
                a.disabled
                  ? "border-[#E2E8F0] bg-[#F7F9FC] text-[#94A3B8] cursor-not-allowed"
                  : "border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#3A6EA5] hover:bg-[#3A6EA5]/5 hover:text-[#2f5a8c] cursor-pointer",
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={1.9} />
              <span className="text-[11px] font-bold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
}
