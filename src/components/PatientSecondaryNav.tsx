import { useNavigate, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  User,
  CreditCard,
  BookOpen,
  Activity,
  Stethoscope,
  FileText,
  ClipboardList,
  UserPlus,
  Users,
  Pill,
  StickyNote,
  FolderOpen,
  Mail,
  MessageCircle,
  MessageSquare,
  Globe,
  Share2,
  Image as ImageIcon,
  Printer,
  History,
  Search,
  UserSearch,
  Phone,
  FlaskConical,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";

interface PatientSecondaryNavProps {
  patientId: string;
}

interface PatientAction {
  icon: LucideIcon;
  label: string;
  gradient: string;
  description: string;
  /** In-patient-context route segment — drives navigation + the active highlight. */
  path?: string;
  /** Optional prefix used for the active highlight when it differs from `path`
   *  (e.g. Insurance navigates to one slot but highlights for every slot). */
  activeMatch?: string;
  /** Custom handler for actions that don't navigate within the patient shell. */
  onClick?: () => void;
}

export default function PatientSecondaryNav({
  patientId,
}: PatientSecondaryNavProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSchedulerClick = () => {
    window.open("/scheduler", "_blank");
  };

  const handleNavigation = (path: string) => {
    navigate(`/patient/${patientId}${path}`);
  };

  // Order mirrors the legacy chart tab strip for the clinical group —
  // Restorative → Perio → X-Ray(Imaging) → Progress → Treatment — which now lives
  // only here (the duplicate in-chart tab row was removed).
  const patientActions: PatientAction[] = [
    {
      icon: Calendar,
      label: "Scheduler",
      gradient: "from-blue-600 to-cyan-600",
      onClick: handleSchedulerClick,
      description: "Open Scheduler (New Window)",
    },
    {
      icon: User,
      label: "Overview",
      gradient: "from-blue-600 to-cyan-600",
      path: "/overview",
      description: "Patient Overview",
    },
    {
      icon: CreditCard,
      label: "Transaction",
      gradient: "from-green-600 to-teal-600",
      path: "/transaction",
      description: "Transaction Entry",
    },
    {
      icon: BookOpen,
      label: "Ledger",
      gradient: "from-teal-600 to-cyan-600",
      path: "/account-ledger",
      activeMatch: "/account-ledger",
      description: "Ledger (Patient / Account)",
    },
    {
      icon: ShieldCheck,
      label: "Insurance",
      gradient: "from-emerald-600 to-green-600",
      path: "/insurance/dental/primary",
      activeMatch: "/insurance",
      description: "Insurance Plans (Dental / Medical)",
    },
    {
      icon: Activity,
      label: "Restorative",
      gradient: "from-blue-600 to-indigo-600",
      path: "/restorative",
      description: "Restorative Charting",
    },
    {
      icon: Stethoscope,
      label: "Perio",
      gradient: "from-purple-600 to-pink-600",
      path: "/perio",
      description: "Periodontal Charting",
    },
    {
      icon: ImageIcon,
      label: "X-Ray",
      gradient: "from-cyan-600 to-blue-600",
      path: "/imaging",
      description: "X-Ray / Imaging",
    },
    {
      icon: FileText,
      label: "Progress",
      gradient: "from-indigo-600 to-purple-600",
      path: "/progress-notes",
      description: "Clinical Progress Notes",
    },
    {
      icon: ClipboardList,
      label: "Treatment",
      gradient: "from-violet-600 to-purple-600",
      path: "/treatment",
      description: "Treatment Plan Entry",
    },
    {
      icon: Pill,
      label: "Prescriptions",
      gradient: "from-orange-600 to-amber-600",
      path: "/prescriptions",
      description: "Prescription Module",
    },
    {
      icon: FlaskConical,
      label: "Lab Tracking",
      gradient: "from-sky-600 to-blue-600",
      path: "/lab-tracking",
      description: "Lab Case Tracking",
    },
    {
      icon: HeartPulse,
      label: "Medical Hx",
      gradient: "from-rose-600 to-red-600",
      path: "/medical-history",
      description: "Medical Alerts, Questionnaires & Signature",
    },
    {
      icon: UserPlus,
      label: "New Patient",
      gradient: "from-green-600 to-emerald-600",
      onClick: () => {
        window.open("/patient/new", "_blank");
      },
      description: "Add New Patient",
    },
    {
      icon: Users,
      label: "New Member",
      gradient: "from-teal-600 to-cyan-600",
      onClick: () => {
        navigate("/patient?action=add-member&familyOf=" + patientId);
      },
      description: "Add Family Member",
    },
    {
      icon: StickyNote,
      label: "Notes",
      gradient: "from-amber-600 to-yellow-600",
      path: "/notes",
      description: "Patient Notes",
    },
    {
      icon: FolderOpen,
      label: "Documents",
      gradient: "from-slate-600 to-gray-600",
      path: "/documents",
      description: "Document Management",
    },
    {
      icon: Phone,
      label: "Emergency",
      gradient: "from-rose-600 to-red-600",
      path: "/emergency-contacts",
      description: "Emergency Contacts",
    },
    {
      icon: Mail,
      label: "Letters",
      gradient: "from-blue-600 to-indigo-600",
      path: "/letters",
      description: "Generate Letters",
    },
    {
      icon: MessageCircle,
      label: "Messages",
      gradient: "from-green-600 to-emerald-600",
      path: "/messages",
      description: "Internal Messaging",
    },
    {
      icon: MessageSquare,
      label: "SMS/Email",
      gradient: "from-teal-600 to-cyan-600",
      path: "/communication",
      description: "SMS & Email Communication",
    },
    {
      icon: Share2,
      label: "Referrals",
      gradient: "from-violet-600 to-purple-600",
      path: "/referrals",
      description: "Manage Referrals",
    },
    {
      icon: Globe,
      label: "Websites",
      gradient: "from-gray-600 to-slate-600",
      onClick: () => alert("Websites - Coming Soon"),
      description: "Quick Links",
    },
    {
      icon: Users,
      label: "Members",
      gradient: "from-indigo-600 to-purple-600",
      path: "/family",
      description: "View Family Members",
    },
    {
      icon: Printer,
      label: "Print",
      gradient: "from-gray-600 to-slate-700",
      onClick: () => alert("Print Reports - Coming Soon"),
      description: "Print Patient Reports",
    },
    {
      icon: History,
      label: "Recent",
      gradient: "from-amber-600 to-orange-600",
      onClick: () => navigate("/patient/recent"),
      description: "Recent Patients",
    },
    {
      icon: Search,
      label: "Search",
      gradient: "from-blue-600 to-cyan-600",
      onClick: () => navigate("/patient?switch=1"),
      description: "Search Patient",
    },
    {
      icon: UserSearch,
      label: "Search RP",
      gradient: "from-green-600 to-teal-600",
      onClick: () => alert("Search Responsible Party - Coming Soon"),
      description: "Search Responsible Party",
    },
  ];

  const base = `/patient/${patientId}`;

  return (
    <div className="bg-white border-t-2 border-slate-200">
      {/* Patient Action Icons - Medical Theme */}

      <div className="px-6 py-3 overflow-x-auto overflow-y-visible">
        <div className="flex items-center gap-2.5 min-w-max">
          {patientActions.map((action, index) => {
            const matchSeg = action.activeMatch ?? action.path;
            const isActive = !!matchSeg && pathname.startsWith(base + matchSeg);
            const onClick = action.onClick ?? (() => handleNavigation(action.path!));
            return (
              <button
                key={index}
                onClick={onClick}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex flex-col items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive ? "bg-blue-50 ring-2 ring-blue-500" : "hover:bg-slate-50"
                }`}
                title={action.description}
              >
                {/* Solid Icon with Gradient Background */}
                <div
                  className={`
                  relative flex items-center justify-center w-11 h-11 rounded-lg
                  bg-gradient-to-br ${action.gradient}
                  shadow-md group-hover:shadow-lg group-hover:scale-110
                  transition-all duration-200
                  ${isActive ? "ring-2 ring-white ring-offset-2 ring-offset-blue-50" : ""}
                `}
                >
                  <action.icon
                    className="w-6 h-6 text-white"
                    strokeWidth={2.5}
                  />
                </div>

                {/* Label - High Contrast */}
                <span
                  className={`text-[10px] whitespace-nowrap font-semibold tracking-wide transition-colors ${
                    isActive ? "text-blue-700" : "text-slate-700 group-hover:text-slate-900"
                  }`}
                >
                  {action.label}
                </span>

                {/* Tooltip */}
                <div
                  className="
                  absolute bottom-full mb-3 hidden group-hover:block
                  px-3 py-1.5 rounded-lg
                  bg-slate-900 border border-slate-800
                  text-white text-xs font-semibold whitespace-nowrap
                  shadow-xl z-50
                  animate-in fade-in slide-in-from-bottom-2 duration-200
                "
                >
                  {action.description}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-800" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
