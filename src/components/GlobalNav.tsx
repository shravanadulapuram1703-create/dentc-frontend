import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  User,
  LogOut,
  ChevronDown,
  Search,
  UserPlus,
  Building2,
  DollarSign,
  Wrench,
  Shield,
  Stethoscope,
  Pill,
  Receipt,
  Bell,
  Activity,
  ClipboardList,
  FileSpreadsheet,
  ListChecks,
  FileCheck,
  Repeat,
  Database,
  Clock,
  Link2,
  UserCheck,
  CalendarClock,
  Heart,
  AlertCircle,
  Target,
  Ruler,
  Mail,
  UserX,
  MapPin,
  RotateCcw,
  MonitorPlay,
  Smartphone,
  Wallet,
  Clipboard,
  TrendingUp,
  Briefcase,
  Network,
  FileBarChart,
  Layers,
  Lock,
  FileEdit,
  Tag,
  Send,
  Star,
  SearchCheck,
  Archive,
  Package,
  UserCog,
  Phone,
  Globe,
  Zap,
  Download,
  Lightbulb,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { SubmenuPortal } from "./navigation/SubmenuPortal";
import { components } from "../styles/theme.js";
import OrganizationSwitcher from "./navigation/OrganizationSwitcher.js";
import { getOfficesForOrganization } from "../data/organizationData.js";
import { useAuth } from "../contexts/AuthContext.js";

interface GlobalNavProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

// State management for multi-level menu navigation
interface MenuPathNode {
  menuKey: string;
  itemIndex: number;
  position: { top: number; left: number };
  items: any[];
}

export default function GlobalNav({
  onLogout,
  currentOffice,
  setCurrentOffice,
}: GlobalNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showOfficeDropdown, setShowOfficeDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // CLICK-DRIVEN STATE MANAGEMENT
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeMenuPath, setActiveMenuPath] = useState<MenuPathNode[]>([]);
  
  // Track which submenu items are currently showing their submenus
  const [openSubmenus, setOpenSubmenus] = useState<{
    [key: string]: { items: any[]; position: { top: number; left: number } };
  }>({});

  const dropdownRefs = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({});
  
  // Track portal submenu refs for outside click detection
  const submenuRefs = useRef<{
    [key: string]: HTMLDivElement | null;
  }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let clickedInside = false;

      // Check if click is inside any main dropdown
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(target)) {
          clickedInside = true;
        }
      });

      // Check if click is inside any Portal submenu
      Object.values(submenuRefs.current).forEach((ref) => {
        if (ref && ref.contains(target)) {
          clickedInside = true;
        }
      });

      if (!clickedInside) {
        setActiveDropdown(null);
        setActiveMenuPath([]);
        setOpenSubmenus({}); // Close all Portal submenus
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  // Get Auth Context for current organization
  const { currentOrganization, user } = useAuth();

  // Get offices dynamically based on selected organization
  const organizationOffices = getOfficesForOrganization(
    currentOrganization,
  );
  const offices = organizationOffices.map(
    (office) => office.displayName,
  );

  // PATIENT DROPDOWN MENU (Patient Context)
  const patientMenuItems = [
    { label: "Search Patient", path: "/patient", icon: Search },
    {
      label: "Add New Patient",
      path: "/patient/new",
      icon: UserPlus,
    },
    {
      label: "Add New Member",
      path: "/patient/member/new",
      icon: Users,
    },
    {
      label: "Add / Link Ortho Patient",
      path: "/patient/ortho/link",
      icon: Link2,
    },
    { type: "divider" },
    {
      label: "Patient Overview",
      path: "/patient/:patientId/overview",
      icon: User,
    },
    {
      label: "Patient Information",
      path: "/patient/:patientId/information",
      icon: FileText,
    },
    {
      label: "Responsible Party",
      path: "/patient/:patientId/responsible-party",
      icon: UserCheck,
    },
    {
      label: "Recall Due Dates",
      path: "/patient/:patientId/recall",
      icon: CalendarClock,
    },
    {
      label: "Medical History",
      path: "/patient/:patientId/medical",
      icon: Heart,
    },
    {
      label: "Prescriptions",
      path: "/patient/:patientId/prescriptions",
      icon: Pill,
    },
    {
      label: "Payment Plan",
      icon: Receipt,
      submenu: [
        {
          label: "Regular Payment Plan",
          path: "/patient/:patientId/payment-plan/regular",
        },
        {
          label: "Ortho Payment Plan",
          path: "/patient/:patientId/payment-plan/ortho",
        },
      ],
    },
    {
      label: "Insurance Information",
      icon: Shield,
      submenu: [
        {
          label: "Dental Insurance",
          submenu: [
            {
              label: "Primary Dental",
              path: "/patient/:patientId/insurance/dental/primary",
            },
            {
              label: "Secondary Dental",
              path: "/patient/:patientId/insurance/dental/secondary",
            },
            {
              label: "Tertiary Dental",
              path: "/patient/:patientId/insurance/dental/tertiary",
            },
            {
              label: "Quaternary Dental",
              path: "/patient/:patientId/insurance/dental/quaternary",
            },
          ],
        },
        {
          label: "Medical Insurance",
          submenu: [
            {
              label: "Primary Medical",
              path: "/patient/:patientId/insurance/medical/primary",
            },
            {
              label: "Secondary Medical",
              path: "/patient/:patientId/insurance/medical/secondary",
            },
            {
              label: "Tertiary Medical",
              path: "/patient/:patientId/insurance/medical/tertiary",
            },
          ],
        },
      ],
    },
    {
      label: "Insurance Fill-Out Forms",
      icon: FileText,
      submenu: [
        {
          label: "Dental Forms",
          path: "/patient/:patientId/insurance-forms/dental",
        },
        {
          label: "Medical Forms",
          path: "/patient/:patientId/insurance-forms/medical",
        },
      ],
    },
    {
      label: "Notes",
      path: "/patient/:patientId/notes",
      icon: ClipboardList,
    },
    {
      label: "Flash Alerts",
      path: "/patient/:patientId/flash-alerts",
      icon: AlertCircle,
    },
    {
      label: "Status Tracker",
      path: "/patient/:patientId/status-tracker",
      icon: Activity,
    },
    {
      label: "Caries Risk Assessment",
      path: "/patient/:patientId/caries-risk",
      icon: Target,
    },
    {
      label: "Basic Measurements",
      path: "/patient/:patientId/measurements",
      icon: Ruler,
    },
    { type: "divider" },
    {
      label: "Email Patient",
      path: "/patient/:patientId/email",
      icon: Mail,
    },
    {
      label: "Change Patient Home Office",
      path: "/patient/:patientId/change-office",
      icon: Building2,
    },
    {
      label: "Assign to Restricted User",
      path: "/patient/:patientId/assign-restricted",
      icon: UserX,
    },
    {
      label: "Addresses",
      path: "/patient/:patientId/addresses",
      icon: MapPin,
    },
    {
      label: "Unclose Last Statement",
      path: "/patient/:patientId/unclose-statement",
      icon: RotateCcw,
    },
    {
      label: "Reallocate Account",
      path: "/patient/:patientId/reallocate",
      icon: Repeat,
    },
    { type: "divider" },
    {
      label: "Online Registered Patients",
      icon: MonitorPlay,
      submenu: [
        {
          label: "New",
          path: "/patient/online-registered/new",
        },
        {
          label: "Existing",
          path: "/patient/online-registered/existing",
        },
        {
          label: "Unarchive",
          path: "/patient/online-registered/unarchive",
        },
      ],
    },
    {
      label: "Patient Portal Signups",
      path: "/patient/portal-signups",
      icon: Smartphone,
    },
  ];

  // TRANSACTIONS DROPDOWN MENU (Patient Context)
  const transactionsMenuItems = [
    {
      label: "Transaction Entry",
      path: "/patient/:patientId/transaction",
      icon: CreditCard,
    },
    {
      label: "Insurance Payment",
      path: "/patient/:patientId/insurance-payment",
      icon: Shield,
    },
    {
      label: "Capitation Payment",
      path: "/patient/:patientId/capitation-payment",
      icon: Wallet,
    },
    {
      label: "Ledger",
      path: "/patient/:patientId/ledger",
      icon: FileSpreadsheet,
    },
    {
      label: "Treatment Plan",
      path: "/patient/:patientId/treatment-plan",
      icon: Clipboard,
    },
    {
      label: "Pre-Authorization List",
      path: "/patient/:patientId/preauth-list",
      icon: FileCheck,
    },
    {
      label: "Batch Patient Payment",
      path: "/transactions/batch-patient-payment",
      icon: Users,
    },
    {
      label: "Batch Insurance Payment",
      path: "/transactions/batch-insurance-payment",
      icon: Shield,
    },
  ];

  // CHARTING DROPDOWN MENU (Patient Context)
  const chartingMenuItems = [
    {
      label: "Advanced Charting",
      path: "/patient/:patientId/advanced-charting",
      icon: Activity,
    },
    {
      label: "Restorative Chart",
      path: "/patient/:patientId/restorative",
      icon: FileText,
    },
    {
      label: "Perio Chart",
      path: "/patient/:patientId/perio",
      icon: TrendingUp,
    },
    {
      label: "Perio Chart (Old)",
      path: "/patient/:patientId/perio-old",
      icon: BarChart3,
    },
  ];

  // REPORTS DROPDOWN MENU (Global Admin Context)
  const reportsMenuItems = [
    {
      label: "Daily Reports",
      path: "/reports/daily",
      icon: Calendar,
    },
    {
      label: "Monthly Reports",
      path: "/reports/monthly",
      icon: CalendarClock,
    },
    {
      label: "Ledger Reports",
      path: "/reports/ledger",
      icon: FileSpreadsheet,
    },
    {
      label: "Management Reports",
      path: "/reports/management",
      icon: Briefcase,
    },
    {
      label: "Insurance Reports",
      path: "/reports/insurance",
      icon: Shield,
    },
    {
      label: "Appointment Reports",
      path: "/reports/appointment",
      icon: Calendar,
    },
    {
      label: "Treatment Plan Reports",
      path: "/reports/treatment-plan",
      icon: Clipboard,
    },
    {
      label: "Referral Reports",
      path: "/reports/referral",
      icon: Network,
    },
    {
      label: "Recall Reports",
      path: "/reports/recall",
      icon: Bell,
    },
    {
      label: "Ortho Reports",
      path: "/reports/ortho",
      icon: Target,
    },
    {
      label: "Statements",
      path: "/reports/statements",
      icon: FileBarChart,
    },
    { type: "divider" },
    {
      label: "Lists",
      icon: ListChecks,
      submenu: [
        {
          label: "Patient List",
          path: "/reports/lists/patient-list",
        },
        {
          label: "Responsible Party List",
          path: "/reports/lists/responsible-party-list",
        },
        {
          label: "Provider List",
          path: "/reports/lists/provider-list",
        },
        {
          label: "Security List",
          path: "/reports/lists/security-list",
        },
        {
          label: "Setup List",
          path: "/reports/lists/setup-list",
        },
      ],
    },
    {
      label: "Interactive Reports",
      icon: Activity,
      submenu: [
        {
          label: "Unsigned Progress Notes",
          path: "/reports/interactive/unsigned-progress-notes",
        },
        {
          label: "Eligibility Verification",
          path: "/reports/interactive/eligibility-verification",
        },
      ],
    },
    {
      label: "Office Reports",
      icon: Building2,
      submenu: [
        {
          label: "Abbey Dental",
          path: "/reports/office/abbey-dental",
        },
        {
          label: "Access Dental Reports",
          path: "/reports/office/access-dental",
        },
        {
          label: "BrightNow Reports",
          path: "/reports/office/brightnow",
        },
        {
          label: "CHI St. Joseph Children's Health Reports",
          path: "/reports/office/chi-st-joseph",
        },
        { label: "DCA Reports", path: "/reports/office/dca" },
        {
          label: "Dental Care Reports",
          path: "/reports/office/dental-care",
        },
        { label: "DHA Reports", path: "/reports/office/dha" },
        {
          label: "Great Hills Reports",
          path: "/reports/office/great-hills",
        },
        {
          label: "Hawaii Family Dental Reports",
          path: "/reports/office/hawaii-family",
        },
        {
          label: "Healthy Smiles for Kids",
          path: "/reports/office/healthy-smiles",
        },
        {
          label: "Healthcare Network",
          path: "/reports/office/healthcare-network",
        },
        {
          label: "Kane Dental",
          path: "/reports/office/kane-dental",
        },
        {
          label: "Lumina Reports",
          path: "/reports/office/lumina",
        },
        {
          label: "Kansas Head Start",
          path: "/reports/office/kansas-head-start",
        },
        {
          label: "Mid Atlantic Reports",
          path: "/reports/office/mid-atlantic",
        },
        {
          label: "Nursing Home Dental Care",
          path: "/reports/office/nursing-home",
        },
        {
          label: "OnHealthCare Reports",
          path: "/reports/office/onhealthcare",
        },
        {
          label: "Ottawa Reports",
          path: "/reports/office/ottawa",
        },
        {
          label: "Pacific Center for Special Care",
          path: "/reports/office/pacific-center",
        },
        {
          label: "Premier Perio Reports",
          path: "/reports/office/premier-perio",
        },
        {
          label: "Snodgrass-King Reports",
          path: "/reports/office/snodgrass-king",
        },
        {
          label: "Tru Family Dental Reports",
          path: "/reports/office/tru-family",
        },
        {
          label: "Venture Health Reports",
          path: "/reports/office/venture-health",
        },
        {
          label: "Village Family Dental Reports",
          path: "/reports/office/village-family",
        },
      ],
    },
    { type: "divider" },
    { label: "Letters", path: "/reports/letters", icon: Mail },
    {
      label: "Postcards",
      path: "/reports/postcards",
      icon: Send,
    },
    { label: "Labels", path: "/reports/labels", icon: Tag },
    {
      label: "Custom Letter",
      path: "/reports/custom-letter",
      icon: FileEdit,
    },
    {
      label: "Advanced Custom Letter",
      path: "/reports/advanced-custom-letter",
      icon: FileText,
    },
    {
      label: "Custom Postcard",
      path: "/reports/custom-postcard",
      icon: Send,
    },
    { type: "divider" },
    {
      label: "My Reports",
      path: "/reports/my-reports",
      icon: Star,
    },
    {
      label: "Blank Insurance Forms",
      path: "/reports/blank-insurance-forms",
      icon: FileText,
    },
    {
      label: "Patient Registration / Medical Info Forms",
      path: "/reports/registration-forms",
      icon: ClipboardCheck,
    },
    {
      label: "My Favorites",
      path: "/reports/my-favorites",
      icon: Star,
    },
    {
      label: "Search Report",
      path: "/reports/search",
      icon: SearchCheck,
    },
    {
      label: "Reports (Old)",
      path: "/reports/old",
      icon: Archive,
    },
  ];

  // UTILITIES DROPDOWN MENU (Global Admin Context)
  const utilitiesMenuItems = [
    {
      label: "Batch & Claims",
      icon: Package,
      submenu: [
        {
          label: "Batch Claims Processing – EClaims (New)",
          path: "/utilities/batch-claims/eclaims-new",
        },
        {
          label:
            "Batch Claims Processing – Paper / Med EClaims",
          path: "/utilities/batch-claims/paper-med",
        },
        {
          label: "EClaims Management",
          path: "/utilities/batch-claims/eclaims-management",
        },
        {
          label: "Batch Eligibility",
          path: "/utilities/batch-claims/batch-eligibility",
        },
        {
          label: "Close Out Managed Care Claims",
          path: "/utilities/batch-claims/close-out-managed-care",
        },
        {
          label: "Referral Management",
          path: "/utilities/batch-claims/referral-management",
        },
      ],
    },
    {
      label: "Generate Contract Charges",
      icon: Receipt,
      submenu: [
        {
          label: "Ortho Payment Plan",
          path: "/utilities/generate-contract-charges/ortho-payment-plan",
        },
        {
          label: "Regular Payment Plan",
          path: "/utilities/generate-contract-charges/regular-payment-plan",
        },
        {
          label: "By Practice",
          path: "/utilities/generate-contract-charges/by-practice",
        },
      ],
    },
    {
      label: "Insurance / Procedure",
      icon: Shield,
      submenu: [
        {
          label: "Consolidate Duplicate Plans",
          path: "/utilities/insurance-procedure/consolidate-duplicate-plans",
        },
        {
          label: "Consolidate Duplicate Carriers",
          path: "/utilities/insurance-procedure/consolidate-duplicate-carriers",
        },
        {
          label: "New Plan Assignment",
          path: "/utilities/insurance-procedure/new-plan-assignment",
        },
        {
          label: "Procedure Code Replace",
          path: "/utilities/insurance-procedure/procedure-code-replace",
        },
        {
          label: "Coverage Category Copy",
          path: "/utilities/insurance-procedure/coverage-category-copy",
        },
      ],
    },
    {
      label: "Copy / Move / Change PGID Setup Data",
      icon: Database,
      submenu: [
        {
          label: "Change Future Appointments",
          path: "/utilities/pgid/change-future-appointments",
        },
        {
          label: "Data Conversion Mapping",
          path: "/utilities/pgid/data-conversion-mapping",
        },
        {
          label: "Change Patient Fee Schedule",
          path: "/utilities/pgid/change-patient-fee-schedule",
        },
        {
          label: "Change Patient Home Office",
          path: "/utilities/pgid/change-patient-home-office",
        },
      ],
    },
    {
      label: "Office Specific",
      icon: Building2,
      submenu: [
        {
          label: "Access Dental",
          submenu: [
            {
              label: "Direct Claims",
              path: "/utilities/office-specific/access-dental/direct-claims",
            },
            {
              label: "Encounter Info for Capitation Plans",
              path: "/utilities/office-specific/access-dental/encounter-info-cap-plans",
            },
          ],
        },
        {
          label: "DHA - Managed Care Claim Reset",
          path: "/utilities/office-specific/dha",
        },
        {
          label: "Universal",
          submenu: [
            {
              label: "Download 837D",
              path: "/utilities/office-specific/universal/download-837d",
            },
            {
              label: "Encounter Info for Capitation Plans",
              path: "/utilities/office-specific/universal/encounter-info",
            },
            {
              label: "837 Format (Generic)",
              path: "/utilities/office-specific/universal/837-format-generic",
            },
            {
              label: "837 Carrier Setup",
              path: "/utilities/office-specific/universal/837-carrier-setup",
            },
            {
              label: "837 Format",
              path: "/utilities/office-specific/universal/837-format",
            },
            {
              label: "Text Format",
              path: "/utilities/office-specific/universal/text-format",
            },
          ],
        },
        {
          label: "CS Benefits - Import Patients",
          path: "/utilities/office-specific/cs-benefits",
        },
        {
          label: "DCA",
          submenu: [
            {
              label: "NetSuite Download",
              path: "/utilities/office-specific/dca/netsuite-download",
            },
            {
              label: "Close Out Claims",
              path: "/utilities/office-specific/dca/close-out-claims",
            },
          ],
        },
        {
          label: "Corro Maduro",
          path: "/utilities/office-specific/corro-maduro",
        },
      ],
    },
    {
      label: "User Functions",
      icon: UserCog,
      submenu: [
        {
          label: "Tickler",
          path: "/utilities/user-functions/tickler",
        },
        {
          label: "TimeClock",
          path: "/utilities/user-functions/timeclock",
        },
        {
          label: "TimeClock Editor",
          path: "/utilities/user-functions/timeclock-editor",
        },
      ],
    },
    {
      label: "Fee Schedule",
      path: "/utilities/fee-schedule",
      icon: DollarSign,
    },
    {
      label: "Fee Schedule Excel Template",
      path: "/utilities/fee-schedule-excel",
      icon: FileSpreadsheet,
    },
    {
      label: "Televox",
      icon: Phone,
      submenu: [
        {
          label: "Televox Appointments Download",
          path: "/utilities/televox/appointments-download",
        },
      ],
    },
    {
      label: "Third-Party / Integrations",
      icon: Globe,
      submenu: [
        {
          label: "Transworld",
          path: "/utilities/integrations/transworld",
        },
        {
          label: "DPS Insurance Verifications",
          path: "/utilities/integrations/dps-insurance",
        },
        {
          label: "Denticon Download",
          path: "/utilities/integrations/denticon-download",
        },
      ],
    },
    {
      label: "Launch",
      icon: Zap,
      submenu: [
        {
          label: "AppointNow",
          path: "/utilities/launch/appointnow",
        },
        {
          label: "Automated Campaigns",
          path: "/utilities/launch/automated-campaigns",
        },
        {
          label: "Dentilytics Basic",
          path: "/utilities/launch/dentilytics",
        },
        {
          label: "Dentiray Classic",
          path: "/utilities/launch/dentiray",
        },
        {
          label: "Launch Imaging System – ApteryxDCV",
          path: "/utilities/launch/apteryx-dcv",
        },
        {
          label: "Launch Imaging System 2 – XVWeb",
          path: "/utilities/launch/xvw-web",
        },
      ],
    },
  ];

  // SETUP DROPDOWN MENU (Strict Admin Context)
  const setupMenuItems = [
    {
      label: "Account Info",
      path: "/setup/account-info",
      icon: User,
    },
    // Tenant option (Super Admin Only) - conditionally rendered
    ...(user?.role === "owner" || user?.email?.toLowerCase().includes("superadmin")
      ? [
          {
            label: "Tenant",
            path: "/setup/tenant",
            icon: Globe,
          },
        ]
      : []),
    {
      label: "Offices",
      icon: Building2,
      submenu: [
        {
          label: "Office Setup",
          path: "/setup/offices/office-setup",
        },
        {
          label: "Office Assignment",
          path: "/setup/offices/office-assignment",
        },
        {
          label: "Vendor API Settings (Legacy)",
          path: "/setup/offices/vendor-api-settings-legacy",
        },
        {
          label: "Vendor API Settings (New)",
          path: "/setup/offices/vendor-api-settings-new",
        },
      ],
    },
    {
      label: "Office Groups",
      icon: Layers,
      submenu: [
        {
          label: "Manage Office Groups",
          path: "/setup/office-groups/manage",
        },
        {
          label: "Assign Offices to Groups",
          path: "/setup/office-groups/assign",
        },
      ],
    },
    {
      label: "Security",
      icon: Lock,
      submenu: [
        { label: "Users", path: "/setup/security/users" },
        { label: "Groups", path: "/setup/security/groups" },
        {
          label: "Change My Password",
          path: "/setup/security/change-my-password",
        },
        {
          label: "My Settings",
          path: "/setup/security/my-settings",
        },
      ],
    },
    {
      label: "Providers",
      icon: Stethoscope,
      submenu: [
        {
          label: "Provider Setup",
          path: "/setup/providers/provider-setup",
        },
        {
          label: "Per Office Settings",
          path: "/setup/providers/per-office-settings",
        },
      ],
    },
    {
      label: "Insurance",
      icon: Shield,
      submenu: [
        {
          label: "Insurance Plans",
          path: "/setup/insurance/insurance-plans",
        },
        {
          label: "Custom Coverage",
          path: "/setup/insurance/custom-coverage",
        },
        {
          label: "Dental Carriers",
          path: "/setup/insurance/dental-carriers",
        },
        {
          label: "Medical Carriers",
          path: "/setup/insurance/medical-carriers",
        },
        {
          label: "Employees",
          path: "/setup/insurance/employees",
        },
        {
          label: "Employers",
          path: "/setup/insurance/employers",
        },
      ],
    },
    {
      label: "Referrals",
      icon: Network,
      submenu: [
        {
          label: "Referral Sources",
          path: "/setup/referrals/referral-sources",
        },
        {
          label: "Custom Demographics",
          path: "/setup/referrals/custom-demographics",
        },
      ],
    },
    {
      label: "Procedure Codes",
      icon: FileSpreadsheet,
      submenu: [
        {
          label: "Procedure Codes",
          path: "/setup/procedure-codes/procedure-codes",
        },
        {
          label: "Explosion Codes",
          path: "/setup/procedure-codes/explosion-codes",
        },
        {
          label: "ICD Codes",
          path: "/setup/procedure-codes/icd-codes",
        },
        {
          label: "Modifier Codes",
          path: "/setup/procedure-codes/modifier-codes",
        },
        {
          label: "Place of Service",
          path: "/setup/procedure-codes/place-of-service",
        },
        {
          label: "Type of Service",
          path: "/setup/procedure-codes/type-of-service",
        },
        {
          label: "CDT to CPT",
          path: "/setup/procedure-codes/cdt-to-cpt",
        },
        {
          label: "CPT to ICD",
          path: "/setup/procedure-codes/cpt-to-icd",
        },
        {
          label: "CDT to ICD",
          path: "/setup/procedure-codes/cdt-to-icd",
        },
      ],
    },
    {
      label: "Fee Schedules",
      icon: DollarSign,
      submenu: [
        {
          label: "Fee Schedule Setup",
          path: "/setup/fee-schedules/fee-schedule-setup",
        },
        {
          label: "Fee Schedule Assignments",
          path: "/setup/fee-schedules/fee-schedule-assignments",
        },
      ],
    },
    {
      label: "Charting",
      icon: Activity,
      submenu: [
        { label: "Colors", path: "/setup/charting/colors" },
        {
          label: "Materials",
          path: "/setup/charting/materials",
        },
        {
          label: "Per Use Templates",
          path: "/setup/charting/per-use-templates",
        },
      ],
    },
    {
      label: "Pick List",
      icon: ListChecks,
      submenu: [
        {
          label: "Manage Pick Lists",
          path: "/setup/pick-list/manage",
        },
        {
          label: "Custom Pick Lists",
          path: "/setup/pick-list/custom",
        },
      ],
    },
    {
      label: "Notes Macros",
      icon: FileEdit,
      submenu: [
        {
          label: "Create Notes Macros",
          path: "/setup/notes-macros/create",
        },
        {
          label: "Manage Macros",
          path: "/setup/notes-macros/manage",
        },
      ],
    },
    {
      label: "Medical Setup",
      icon: Stethoscope,
      submenu: [
        {
          label: "Medical Alerts",
          path: "/setup/medical/medical-alerts",
        },
        {
          label: "Medical Questionnaire",
          path: "/setup/medical/medical-questionnaire",
        },
        {
          label: "Dental Questionnaire",
          path: "/setup/medical/dental-questionnaire",
        },
      ],
    },
    {
      label: "Scheduler",
      icon: Calendar,
      submenu: [
        {
          label: "Scheduler View",
          path: "/setup/scheduler/scheduler-view",
        },
        {
          label: "Scheduler Template",
          path: "/setup/scheduler/scheduler-template",
        },
      ],
    },
    {
      label: "Collection Agencies",
      icon: Briefcase,
      submenu: [
        {
          label: "Agency Setup",
          path: "/setup/collection-agencies/agency-setup",
        },
        {
          label: "Assign Accounts",
          path: "/setup/collection-agencies/assign-accounts",
        },
      ],
    },
    {
      label: "Prescriptions",
      icon: Pill,
      submenu: [
        {
          label: "Prescription Setup",
          path: "/setup/prescriptions/prescription-setup",
        },
        {
          label: "Common Prescriptions",
          path: "/setup/prescriptions/common",
        },
      ],
    },
    {
      label: "Labs",
      icon: Activity,
      submenu: [
        { label: "Lab Setup", path: "/setup/labs/lab-setup" },
        {
          label: "Lab Assignments",
          path: "/setup/labs/lab-assignments",
        },
      ],
    },
    {
      label: "Payment / Adjustment Types",
      icon: DollarSign,
      submenu: [
        {
          label: "Payment Types",
          path: "/setup/payment-adjustment/payment-types",
        },
        {
          label: "Adjustment Types",
          path: "/setup/payment-adjustment/adjustment-types",
        },
      ],
    },
    {
      label: "Custom Toolbar",
      icon: Settings,
      submenu: [
        {
          label: "Configure Toolbar",
          path: "/setup/custom-toolbar/configure",
        },
        {
          label: "Reset to Default",
          path: "/setup/custom-toolbar/reset",
        },
      ],
    },
    {
      label: "Misc Setups",
      icon: Settings,
      submenu: [
        {
          label: "Collection Letters Setup",
          path: "/setup/misc/collection-letters",
        },
        { label: "Close Out", path: "/setup/misc/close-out" },
        {
          label: "Dentiray Classic Setup",
          path: "/setup/misc/dentiray-classic",
        },
      ],
    },
  ];

  // HELP DROPDOWN MENU
  const helpMenuItems = [
    {
      label: "Get Help",
      path: "/help/get-help",
      icon: HelpCircle,
    },
    {
      label: "Remote Support",
      path: "/help/remote-support",
      icon: MonitorPlay,
    },
    {
      label: "Imaging Remote Support",
      path: "/help/imaging-remote-support",
      icon: MonitorPlay,
    },
    {
      label: "Downloads and Links",
      path: "/help/downloads-links",
      icon: Download,
    },
    {
      label: "Submit Product Suggestion",
      path: "/help/submit-suggestion",
      icon: Lightbulb,
    },
    {
      label: "Denticon Learning Center",
      path: "/help/learning-center",
      icon: BookOpen,
    },
    {
      label: "Release Notes",
      path: "/help/release-notes",
      icon: FileText,
    },
    {
      label: "Dental Carrier Payer ID List",
      path: "/help/dental-payer-id",
      icon: ListChecks,
    },
    {
      label: "Medical Carrier Payer ID List",
      path: "/help/medical-payer-id",
      icon: ListChecks,
    },
    {
      label: "My Invoices",
      path: "/help/my-invoices",
      icon: Receipt,
    },
    {
      label: "About Denticon",
      path: "/help/about",
      icon: Activity,
    },
  ];

  const handleNavClick = (path: string) => {
    // Check if path requires patient ID
    if (path.includes(":patientId")) {
      // Try to get active patient from sessionStorage
      const activePatient =
        sessionStorage.getItem("activePatient");
      if (activePatient) {
        const patient = JSON.parse(activePatient);
        const resolvedPath = path.replace(
          ":patientId",
          patient.id,
        );
        navigate(resolvedPath);
      } else {
        // No active patient - show search modal or redirect to patient search
        alert("Please select a patient first");
        navigate("/patient");
      }
    } else {
      navigate(path);
    }
    setActiveDropdown(null);
    setActiveMenuPath([]);
  };

  const handleSchedulerClick = () => {
    navigate("/scheduler");
    setActiveDropdown(null);
    setActiveMenuPath([]);
  };

  const toggleDropdown = (menu: string) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
    setOpenSubmenus({}); // Clear all submenus when toggling main dropdown
  };

  const handleSubmenuClick = (
    e: React.MouseEvent,
    item: any,
    submenuKey: string
  ) => {
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    // If submenu is already open, close it
    if (openSubmenus[submenuKey]) {
      const newOpenSubmenus = { ...openSubmenus };
      delete newOpenSubmenus[submenuKey];
      setOpenSubmenus(newOpenSubmenus);
    } else {
      // Close all other submenus and open this one
      setOpenSubmenus({
        [submenuKey]: {
          items: item.submenu,
          position: {
            top: rect.top,
            left: rect.right + 8,
          },
        },
      });
    }
  };

  const renderSubmenu = (items: any[], level: number = 0, parentKey: string = "") => {
    return (
      <div className={`${level === 0 ? "py-1" : ""}`}>
        {items.map((item, index) => {
          const submenuKey = `${parentKey}-${index}`;
          
          if (item.type === "divider") {
            return (
              <div
                key={index}
                className="h-px bg-slate-200 my-1"
              />
            );
          }

          if (item.submenu) {
            const isOpen = !!openSubmenus[submenuKey];
            
            return (
              <div
                key={index}
                className="relative"
              >
                <button
                  onClick={(e) => handleSubmenuClick(e, item, submenuKey)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    isOpen
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon && (
                      <item.icon className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {item.label}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleNavClick(item.path)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const handleTransactionsClick = () => {
    // Check if path requires patient ID
    const path = "/patient/:patientId/transaction";
    if (path.includes(":patientId")) {
      // Try to get active patient from sessionStorage
      const activePatient =
        sessionStorage.getItem("activePatient");
      if (activePatient) {
        const patient = JSON.parse(activePatient);
        const resolvedPath = path.replace(
          ":patientId",
          patient.id,
        );
        navigate(resolvedPath);
      } else {
        // No active patient - show search modal or redirect to patient search
        alert("Please select a patient first");
        navigate("/patient");
      }
    } else {
      navigate(path);
    }
    setActiveDropdown(null);
    setActiveMenuPath([]);
  };

  const handleChartingClick = () => {
    // Check if path requires patient ID
    const path = "/patient/:patientId/advanced-charting";
    if (path.includes(":patientId")) {
      // Try to get active patient from sessionStorage
      const activePatient =
        sessionStorage.getItem("activePatient");
      if (activePatient) {
        const patient = JSON.parse(activePatient);
        const resolvedPath = path.replace(
          ":patientId",
          patient.id,
        );
        navigate(resolvedPath);
      } else {
        // No active patient - show search modal or redirect to patient search
        alert("Please select a patient first");
        navigate("/patient");
      }
    } else {
      navigate(path);
    }
    setActiveDropdown(null);
    setActiveMenuPath([]);
  };

  return (
    <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] border-b-2 border-[#162942] shadow-lg sticky top-0 z-50">
      {/* Top Bar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-white/10">
        {/* Logo & System Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Activity
                className="w-6 h-6 text-white"
                strokeWidth={2.5}
              />
            </div>
            {/* <div>
              <h1 className="text-lg font-bold text-white">DentalPMS</h1>
              <p className="text-xs text-white/70">Practice Management System</p>
            </div> */}
            <div
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer select-none"
            >
              <h1 className="text-lg font-bold text-white hover:underline">
                DentalPMS
              </h1>
              <p className="text-xs text-white/70 hover:text-white">
                Practice Management System
              </p>
            </div>
          </div>
        </div>

        {/* Office Selector & Organization Switcher */}
        <div className="flex items-center gap-3">
          {/* OWNER-ONLY: Organization Switcher */}
          <OrganizationSwitcher />

          {/* Office Selector (available to all users) */}
          <div
            className="relative"
            ref={(el) => (dropdownRefs.current["office"] = el)}
          >
            <button
              onClick={() =>
                setShowOfficeDropdown(!showOfficeDropdown)
              }
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/30 transition-all backdrop-blur-sm"
            >
              <Building2
                className="w-5 h-5 text-white"
                strokeWidth={2}
              />
              <div className="flex flex-col items-start">
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                  Office
                </span>
                <span className="font-bold text-white text-sm">
                  {currentOffice}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-white transition-transform ${showOfficeDropdown ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>
            {showOfficeDropdown && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50">
                <div className="py-1">
                  {offices.map((office, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentOffice(office);
                        setShowOfficeDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                        currentOffice === office
                          ? "bg-[#3A6EA5] text-white"
                          : "text-[#1E293B] hover:bg-[#F7F9FC] hover:text-[#3A6EA5]"
                      }`}
                    >
                      {office}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-6 py-2 flex items-center gap-1">
        {/* Scheduler - No Dropdown */}
        <button
          onClick={handleSchedulerClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
        >
          <Calendar className="w-5 h-5" strokeWidth={2} />
          Scheduler
        </button>

        {/* Patient - Dropdown */}
        <div
          className="relative"
          ref={(el) => (dropdownRefs.current["patient"] = el)}
        >
          <button
            onClick={() => toggleDropdown("patient")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <Users className="w-5 h-5" strokeWidth={2} />
            Patient
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "patient" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "patient" && (
            <div className="absolute top-full left-0 mt-1 min-w-[280px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(patientMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* Transactions - Dropdown (Patient Context) */}
        <div
          className="relative"
          ref={(el) =>
            (dropdownRefs.current["transactions"] = el)
          }
        >
          <button
            onClick={() => toggleDropdown("transactions")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <CreditCard className="w-5 h-5" strokeWidth={2} />
            Transactions
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "transactions" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "transactions" && (
            <div className="absolute top-full left-0 mt-1 min-w-[280px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(transactionsMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* Charting - Dropdown (Patient Context) */}
        <div
          className="relative"
          ref={(el) => (dropdownRefs.current["charting"] = el)}
        >
          <button
            onClick={() => toggleDropdown("charting")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <FileText className="w-5 h-5" strokeWidth={2} />
            Charting
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "charting" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "charting" && (
            <div className="absolute top-full left-0 mt-1 min-w-[280px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(chartingMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* Reports - Dropdown */}
        <div
          className="relative"
          ref={(el) => (dropdownRefs.current["reports"] = el)}
        >
          <button
            onClick={() => toggleDropdown("reports")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <BarChart3 className="w-5 h-5" strokeWidth={2} />
            Reports
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "reports" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "reports" && (
            <div className="absolute top-full left-0 mt-1 min-w-[280px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(reportsMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* Utilities - Dropdown */}
        <div
          className="relative"
          ref={(el) => (dropdownRefs.current["utilities"] = el)}
        >
          <button
            onClick={() => toggleDropdown("utilities")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <Wrench className="w-5 h-5" strokeWidth={2} />
            Utilities
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "utilities" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "utilities" && (
            <div className="absolute top-full left-0 mt-1 min-w-[320px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(utilitiesMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* Setup - Dropdown */}
        <div
          className="relative"
          ref={(el) => (dropdownRefs.current["setup"] = el)}
        >
          <button
            onClick={() => toggleDropdown("setup")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
            Setup
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "setup" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "setup" && (
            <div className="absolute top-full left-0 mt-1 min-w-[320px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(setupMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <div
          className="relative"
          ref={(el) => (dropdownRefs.current["help"] = el)}
        >
          <button
            onClick={() => toggleDropdown("help")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
          >
            <HelpCircle className="w-5 h-5" strokeWidth={2} />
            Help
            <ChevronDown
              className={`w-4 h-4 transition-transform ${activeDropdown === "help" ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {activeDropdown === "help" && (
            <div className="absolute top-full left-0 mt-1 min-w-[280px] bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-[80vh] overflow-y-auto">
                {renderSubmenu(helpMenuItems)}
              </div>
            </div>
          )}
        </div>

        {/* My Page */}
        <button
          onClick={() => navigate("/my-page")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white font-semibold transition-all"
        >
          <User className="w-5 h-5" strokeWidth={2} />
          My Page
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:bg-[#EF4444] font-semibold transition-all ml-auto"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          Logout
        </button>
      </div>
      
      {/* Render Portal Submenus */}
      {Object.entries(openSubmenus).map(([key, submenu]) => (
        <SubmenuPortal
          key={key}
          items={submenu.items}
          position={submenu.position}
          onItemClick={(item, index) => {
            if (item.path) {
              handleNavClick(item.path);
              setOpenSubmenus({}); // Close all submenus
            } else if (item.submenu) {
              // This is a nested submenu - handle its click
              const newKey = `${key}-${index}`;
              const buttonElement = document.querySelector(
                `[data-submenu-key="${newKey}"]`
              ) as HTMLElement;
              if (buttonElement) {
                const rect = buttonElement.getBoundingClientRect();
                setOpenSubmenus({
                  [newKey]: {
                    items: item.submenu,
                    position: {
                      top: rect.top,
                      left: rect.right + 8,
                    },
                  },
                });
              }
            }
          }}
          activeSubmenuIndex={null}
          ref={(el) => (submenuRefs.current[key] = el)}
        />
      ))}
    </div>
  );
}