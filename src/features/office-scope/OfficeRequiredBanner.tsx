import { Building2 } from "lucide-react";
import { useOfficeScope } from "./OfficeScopeContext";

/**
 * "Select an office to continue" for screens that cannot run tenant-wide
 * (Scheduler, patient registration, quick-save, utilities). It is a banner, not
 * a route gate: the page renders underneath and the switcher stays reachable.
 */
export function OfficeRequiredBanner({ action = "continue" }: { action?: string }) {
  const { office_id, status } = useOfficeScope();
  if (office_id != null) return null;
  const unassigned = status === "unassigned";
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <p className="font-semibold">Select an office to {action}.</p>
        <p className="text-amber-800">
          {unassigned
            ? "No office is assigned to your user — pick one from the OFFICE menu, or ask an administrator to assign you."
            : "Use the OFFICE menu in the top bar."}
        </p>
      </div>
    </div>
  );
}

/** Top-of-app notice when the user has no assignments at all (tenant-wide mode). */
export function OfficeUnassignedBanner() {
  const { status, office_id } = useOfficeScope();
  if (status !== "unassigned" || office_id != null) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900"
    >
      <Building2 className="h-3.5 w-3.5" />
      No office assigned — showing all offices. Ask an administrator to assign your user to an office.
    </div>
  );
}
