import { READ_SCOPE_LABELS, type ReadScope, type ReadScopeMode } from "./useReadScope";

interface Props {
  scope: ReadScope;
  className?: string;
  /** Accessible name of the group (defaults to "Office scope"). */
  label?: string;
}

const HINTS: Record<ReadScopeMode, string> = {
  office: "Only records homed in the working office",
  my_offices: "Records in every office you are assigned to, plus the working office",
  all: "Every office in the practice",
};

/**
 * Segmented "This office · My offices · All offices" control bound to a
 * `useReadScope` result. Only the modes that screen offers are rendered
 * ("My offices" is omitted when it would add nothing beyond the working
 * office); renders nothing at all when there is only one choice.
 */
export function ScopeToggle({ scope, className = "", label = "Office scope" }: Props) {
  if (!scope.canToggle) return null;

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-[#E2E8F0] bg-white p-0.5 ${className}`}
    >
      {scope.modes.map((mode) => {
        const selected = scope.mode === mode;
        const title =
          mode === "office" && scope.office_name ? `Only ${scope.office_name}` : HINTS[mode];
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={selected}
            title={title}
            onClick={() => scope.setMode(mode)}
            className={`rounded-md px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A6EA5] ${
              selected
                ? "bg-[#3A6EA5] text-white shadow-sm"
                : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
            }`}
          >
            {READ_SCOPE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
