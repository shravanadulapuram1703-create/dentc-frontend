import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  UserPlus,
  FileBarChart,
  DollarSign,
  ClipboardList,
  Settings,
  Wrench,
  LifeBuoy,
  FlaskConical,
  Star,
  Plus,
  X,
  Check,
  type LucideIcon,
} from "lucide-react";
import WidgetCard from "../../dashboard/components/WidgetCard";
import { utils } from "../../../styles/theme.js";
import type { QuickLink } from "../lib/myPageStorage";

interface QuickLinksWidgetProps {
  links: QuickLink[];
  onChange: (links: QuickLink[]) => void;
}

/** Catalog of shortcuts the user can pin. Icon keys are stored, not components. */
const CATALOG: Array<{ id: string; label: string; icon: string; to: string }> = [
  { id: "ql-scheduler", label: "Scheduler", icon: "calendar", to: "/scheduler" },
  { id: "ql-patients", label: "Patients", icon: "users", to: "/patient?switch=1" },
  { id: "ql-new-patient", label: "New Patient", icon: "userPlus", to: "/patient/new" },
  { id: "ql-reports", label: "Reports", icon: "reports", to: "/reports" },
  { id: "ql-transactions", label: "Billing", icon: "dollar", to: "/patient" },
  { id: "ql-treatment", label: "Treatment", icon: "clipboard", to: "/patient" },
  { id: "ql-setup", label: "Setup", icon: "settings", to: "/setup" },
  { id: "ql-utilities", label: "Utilities", icon: "wrench", to: "/utilities" },
  { id: "ql-lab", label: "Lab Tracking", icon: "flask", to: "/patient" },
  { id: "ql-help", label: "Help", icon: "help", to: "/help" },
];

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  users: Users,
  userPlus: UserPlus,
  reports: FileBarChart,
  dollar: DollarSign,
  clipboard: ClipboardList,
  settings: Settings,
  wrench: Wrench,
  flask: FlaskConical,
  help: LifeBuoy,
};

function iconFor(key: string): LucideIcon {
  return ICONS[key] ?? Star;
}

/**
 * User-customizable module shortcuts. Click to navigate; toggle "Edit" to pin or
 * unpin links from the catalog. The chosen set persists per-user (myPageStorage).
 */
export default function QuickLinksWidget({ links, onChange }: QuickLinksWidgetProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const pinnedIds = useMemo(() => new Set(links.map((l) => l.id)), [links]);
  const available = CATALOG.filter((c) => !pinnedIds.has(c.id));

  const unpin = (id: string) => onChange(links.filter((l) => l.id !== id));
  const pin = (item: (typeof CATALOG)[number]) => onChange([...links, item]);

  return (
    <WidgetCard
      title="Quick Links"
      icon={<Star className="w-4 h-4" />}
      actions={
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={utils.cn(
            "inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-1 transition-colors",
            editing
              ? "bg-[#3A6EA5] text-white"
              : "text-[#3A6EA5] hover:bg-[#3A6EA5]/10",
          )}
        >
          {editing ? (
            <>
              <Check className="w-3.5 h-3.5" /> Done
            </>
          ) : (
            "Edit"
          )}
        </button>
      }
    >
      {links.length === 0 && !editing ? (
        <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
          <Star className="w-7 h-7 text-[#94A3B8]" strokeWidth={1.75} />
          <p className="text-sm text-[#64748B]">No shortcuts pinned. Tap Edit to add some.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {links.map((l) => {
            const Icon = iconFor(l.icon);
            return (
              <div key={l.id} className="relative">
                <button
                  type="button"
                  onClick={() => (editing ? unpin(l.id) : navigate(l.to))}
                  className="w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white p-3 text-center hover:border-[#3A6EA5] hover:bg-[#3A6EA5]/5 hover:text-[#2f5a8c] transition-all"
                >
                  <Icon className="w-5 h-5 text-[#3A6EA5]" strokeWidth={1.9} />
                  <span className="text-[11px] font-bold leading-tight text-[#1E293B]">
                    {l.label}
                  </span>
                </button>
                {editing && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center shadow pointer-events-none">
                    <X className="w-3 h-3" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && available.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2">
            Add a shortcut
          </p>
          <div className="flex flex-wrap gap-2">
            {available.map((item) => {
              const Icon = iconFor(item.icon);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pin(item)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F7F9FC] px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:border-[#3A6EA5] hover:text-[#3A6EA5] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
