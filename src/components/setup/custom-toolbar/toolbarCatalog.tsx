import {
  Calendar,
  Home,
  DollarSign,
  BookOpen,
  LayoutGrid,
  Activity,
  FileText,
  ClipboardList,
  UserPlus,
  Users,
  Pill,
  StickyNote,
  ScanLine,
  Mail,
  Bell,
  MessageSquare,
  Clock,
  Globe,
  Network,
  Image,
  ListChecks,
  Printer,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// Custom Toolbar — the catalog of toolbar functions a toolbar can contain.
// This is a FIXED, frontend-defined list (the legacy app ships these built-in
// functions); the backend has no toolbar-function registry. See gap TB-2.
// Each toolbar's chosen functions are stored as definitions (key1 = code).
// ============================================================================

export interface ToolbarFunction {
  code: string;
  label: string;
  icon: LucideIcon;
}

export const TOOLBAR_FUNCTIONS: ToolbarFunction[] = [
  { code: "SCHEDULER", label: "Scheduler", icon: Calendar },
  { code: "PATIENT_OVERVIEW", label: "Patient Overview", icon: Home },
  { code: "TRANSACTION_ENTRY", label: "Transaction Entry", icon: DollarSign },
  { code: "LEDGER", label: "Ledger", icon: BookOpen },
  { code: "RESTORATIVE_CHARTING", label: "Restorative Charting", icon: LayoutGrid },
  { code: "PERIODONTAL_CHARTING", label: "Periodontal Charting", icon: Activity },
  { code: "PROGRESS_NOTES", label: "Progress Notes", icon: FileText },
  { code: "TREATMENT_PLAN_ENTRY", label: "Treatment Plan Entry", icon: ClipboardList },
  { code: "ADD_NEW_PATIENT", label: "Add New Patient", icon: UserPlus },
  { code: "ADD_NEW_MEMBER", label: "Add New Member", icon: UserPlus },
  { code: "PRESCRIPTION", label: "Prescription", icon: Pill },
  { code: "PATIENT_NOTES", label: "Patient Notes", icon: StickyNote },
  { code: "DOCUMENT_SCAN", label: "Document Scan", icon: ScanLine },
  { code: "LETTERS", label: "Letters", icon: Mail },
  { code: "TICKLER", label: "Tickler", icon: Bell },
  { code: "TWO_WAY_COMMUNICATION", label: "Two Way Communication", icon: MessageSquare },
  { code: "TIME_CLOCK", label: "Time Clock", icon: Clock },
  { code: "ONLINE_REGISTERED_PATIENTS", label: "Online Registered Patients", icon: Globe },
  { code: "REFERRAL_MANAGEMENT", label: "Referral Management", icon: Network },
  { code: "IMAGING_SYSTEM_1", label: "Imaging System 1", icon: Image },
  { code: "IMAGING_SYSTEM_2", label: "Imaging System 2", icon: Image },
  { code: "IMAGING_SYSTEM_3", label: "Imaging System 3", icon: Image },
  { code: "WEBSITES", label: "Websites", icon: Globe },
  { code: "TASK_MANAGER", label: "Task Manager", icon: ListChecks },
  { code: "MEMBERS", label: "Members", icon: Users },
  { code: "PRINT_REPORTS", label: "Print Reports", icon: Printer },
];

const BY_CODE = new Map(TOOLBAR_FUNCTIONS.map((f) => [f.code, f]));

/** Resolve a function definition by its code (falls back to a generic entry). */
export function resolveFunction(code: string | null | undefined, label?: string | null): ToolbarFunction {
  const hit = code ? BY_CODE.get(code) : undefined;
  if (hit) return hit;
  return { code: code ?? "", label: label || code || "Unknown", icon: Wrench };
}
