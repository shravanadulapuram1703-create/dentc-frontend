import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { utils } from "../../../styles/theme.js";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  /** Right-aligned header content (e.g. an action button). */
  actions?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * A card whose body the user can fold away. Header stays clickable (chevron
 * rotates); used for the heavier My Page panels (Account Settings) so the page
 * can lead with the dashboard and keep forms tucked below until needed.
 */
export default function CollapsibleSection({
  title,
  icon,
  actions,
  open,
  onToggle,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <section
      className={utils.cn(
        "bg-white rounded-lg shadow-md border border-[#E2E8F0] overflow-hidden",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 bg-[#F1F5F9] border-b-2 border-[#E2E8F0]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-2 min-w-0 flex-1 px-4 py-3 text-left hover:bg-[#E9EEF5] transition-colors"
        >
          <ChevronDown
            className={utils.cn(
              "w-4 h-4 text-[#1F3A5F] shrink-0 transition-transform",
              open ? "" : "-rotate-90",
            )}
          />
          {icon && <span className="text-[#1F3A5F] shrink-0">{icon}</span>}
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide truncate">
            {title}
          </h3>
        </button>
        {actions && <div className="flex items-center gap-2 shrink-0 pr-4">{actions}</div>}
      </header>

      {open && <div className="p-4 sm:p-6">{children}</div>}
    </section>
  );
}
