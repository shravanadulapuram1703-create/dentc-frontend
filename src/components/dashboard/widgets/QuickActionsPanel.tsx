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
import { useAuth } from "../../../contexts/AuthContext";
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
 * One-click actions, laid out newest-useful first:
 *   row 1  actions that need no patient context
 *   row 2  actions that open the current patient's own screen
 *   row 3  actions with no dashboard-level entry point — disabled with a reason
 *          rather than faked
 *
 * The patient-context actions deep-link straight to the screen that does the
 * job (Transactions → Payments, Ledger, Treatment Plan) using the persisted
 * active patient. With no patient chosen yet they fall back to `/patient`,
 * which resumes the last one or opens the search picker.
 */
export default function QuickActionsPanel(_props: Props) {
  const navigate = useNavigate();
  const { activePatient } = useAuth();

  const patientId = activePatient?.id;
  /** Deep-link into the active patient's screen, or send them to pick one. */
  const forPatient = (suffix: string) =>
    patientId ? `/patient/${patientId}${suffix}` : "/patient";
  const patientHint = (screen: string) =>
    patientId
      ? `${activePatient?.name ?? "Current patient"} → ${screen}`
      : `Select a patient, then ${screen}`;

  const actions: QuickAction[] = [
    // Row 1 — no patient context needed.
    { label: "Create Patient", icon: UserPlus, to: "/patient/new" },
    { label: "Schedule Appt", icon: CalendarPlus, to: "/scheduler" },
    { label: "Search Patient", icon: Search, to: "/patient?switch=1" },

    // Row 2 — open the patient's own screen.
    {
      label: "Collect Payment",
      icon: DollarSign,
      to: forPatient("/transaction?tab=payments"),
      hint: patientHint("Transactions → Payments"),
    },
    {
      label: "Treatment Plan",
      icon: ClipboardList,
      to: forPatient("/treatment"),
      hint: patientHint("Treatment Plan"),
    },
    {
      label: "Insurance Claim",
      icon: FileText,
      to: forPatient("/account-ledger"),
      hint: patientHint("Ledger"),
    },

    // Row 3 — nothing meaningful to do from the dashboard.
    {
      label: "Check In",
      icon: LogIn,
      disabled: true,
      reason:
        "Check-in applies to a specific appointment — use the scheduler's status menu",
    },
    {
      label: "Checkout",
      icon: LogOut,
      disabled: true,
      reason:
        "Checkout applies to a specific appointment — use the scheduler's status menu",
    },
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
