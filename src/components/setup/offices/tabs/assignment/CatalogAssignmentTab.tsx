import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../../../styles/theme";
import DualListPicker, { type DualListItem } from "../../DualListPicker";
import type { AssignmentResource, AssignmentRow } from "../../../../../services/officeAssignmentApi";

type CatalogAssignmentTabProps = {
  officeId: number;
  heading: string;
  /** List sub-heading, e.g. "These are the Procedure Codes the office uses." */
  subtitle: string;
  icon: React.ReactNode;
  resource: AssignmentResource;
  leftTitle?: string;
  rightTitle?: string;
  /** Singular noun for toasts, e.g. "procedure". */
  noun: string;
};

function activeBadge(active: boolean | null | undefined) {
  if (active == null) return undefined;
  return active ? (
    <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#059669] text-[10px] font-bold rounded">Active</span>
  ) : (
    <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-[10px] font-bold rounded">Inactive</span>
  );
}

function toItem(row: AssignmentRow): DualListItem {
  return { id: row.id, primary: row.primary, secondary: row.secondary, meta: activeBadge(row.active) };
}

/** Merge catalog + assigned rows by id (assigned wins; catalog is the superset). */
function mergeById(catalog: AssignmentRow[], assigned: AssignmentRow[]): Map<string, AssignmentRow> {
  const map = new Map<string, AssignmentRow>();
  for (const r of catalog) map.set(r.id, r);
  for (const r of assigned) if (!map.has(r.id)) map.set(r.id, r); // assigned-but-not-in-catalog safety
  return map;
}

/**
 * Generic editable office-assignment tab. Drives the medical-slate `DualListPicker`
 * from any `AssignmentResource` (Procedures, Exp Codes, Prod Types, Providers,
 * Notes Macros, RX, Letters). Self-fetching and self-saving (mirrors StatementTab):
 * loads the catalog + the office's assigned set, stages edits locally, and persists
 * the full assigned set via the resource's bulk `PUT` on Save.
 */
export default function CatalogAssignmentTab({
  officeId,
  heading,
  subtitle,
  icon,
  resource,
  leftTitle = "Available",
  rightTitle = "Assigned",
  noun,
}: CatalogAssignmentTabProps) {
  const [rowsById, setRowsById] = useState<Map<string, AssignmentRow>>(new Map());
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, assigned] = await Promise.all([
        resource.loadCatalog(),
        resource.loadAssigned(officeId),
      ]);
      setRowsById(mergeById(catalog, assigned));
      setAssignedIds(new Set(assigned.map((r) => r.id)));
      setDirty(false);
    } catch (e: unknown) {
      setLoadError(messageOf(e, "Failed to load"));
    } finally {
      setLoading(false);
    }
  }, [officeId, resource]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { available, assigned } = useMemo(() => {
    const avail: DualListItem[] = [];
    const asgn: DualListItem[] = [];
    for (const row of rowsById.values()) {
      (assignedIds.has(row.id) ? asgn : avail).push(toItem(row));
    }
    return { available: avail, assigned: asgn };
  }, [rowsById, assignedIds]);

  const handleChange = (ids: string[]) => {
    setAssignedIds(new Set(ids));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await resource.save(officeId, Array.from(assignedIds));
      toast.success(`${heading} saved`, { description: `${assignedIds.size} ${noun}(s) assigned.` });
      await reload();
    } catch (e: unknown) {
      toast.error("Save failed", { description: messageOf(e, "Request failed") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading {heading.toLowerCase()}…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-[#DC2626]" />
        <p className="text-sm font-bold text-[#1E293B]">Could not load {heading.toLowerCase()}</p>
        <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
        <button onClick={() => void reload()} className={components.buttonOutline + " inline-flex items-center gap-2 mt-2"}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1F3A5F] mb-1">
          {icon}
          {heading}
        </h3>
        <p className="text-xs text-[#64748B]">{subtitle}</p>
      </div>

      <DualListPicker
        available={available}
        assigned={assigned}
        onChange={handleChange}
        disabled={saving}
        leftTitle={leftTitle}
        rightTitle={rightTitle}
        emptyAvailableLabel={`No available ${noun}s`}
        emptyAssignedLabel={`No ${noun}s assigned`}
      />
      <p className="text-xs text-[#94A3B8] text-center">
        Click to select · Ctrl/Cmd-click to multi-select · double-click a row to move it
      </p>

      <div className="flex items-center justify-between border-t-2 border-[#E2E8F0] pt-4">
        <p className="text-xs text-[#64748B] font-bold">
          {assignedIds.size} {noun}(s) assigned
          {dirty && <span className="ml-2 text-[#DC2626]">• unsaved changes</span>}
        </p>
        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${!dirty || saving ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Save className="w-4 h-4" />
          Save {heading}
        </button>
      </div>
    </div>
  );
}

function messageOf(e: unknown, fallback: string): string {
  if (e && typeof e === "object") {
    const err = e as { response?: { data?: { detail?: string } }; message?: string };
    return err.response?.data?.detail || err.message || fallback;
  }
  return fallback;
}
