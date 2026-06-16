import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import {
  listOfficeProviders,
  setOfficeProviders,
} from "@/api/generated/endpoints/office-assignment/office-assignment";
import type { OfficeRead } from "@/api/generated/model";
import DualListPicker, { type DualListItem } from "../../offices/DualListPicker";

interface WorksAtTabProps {
  providerId: string;
  /** The provider's primary office_id — always assigned, shown locked. */
  homeOfficeId: number | null;
}

/**
 * The provider↔office "Works At" join is stored office-side: each office owns the
 * full set of provider ids (`PUT /offices/{id}/providers`). To present it from the
 * provider's perspective we read every office's provider set, mark the offices that
 * already include this provider as assigned, and on save re-PUT only the offices
 * whose membership changed — re-sending each office's full set so other providers
 * are preserved.
 */
export default function WorksAtTab({ providerId, homeOfficeId }: WorksAtTabProps) {
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  // officeId -> full provider-id set currently assigned to that office (server truth).
  const [officeProviderIds, setOfficeProviderIds] = useState<Map<number, string[]>>(new Map());
  const [originalAssigned, setOriginalAssigned] = useState<Set<number>>(new Set());
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offRes = await listOffices({ size: 200 });
      const offList = offRes.items ?? [];
      const sets = await Promise.all(
        offList.map((o) =>
          listOfficeProviders(o.id)
            .then((providers) => ({ id: o.id, ids: providers.map((p) => p.id) }))
            .catch(() => ({ id: o.id, ids: [] as string[] })),
        ),
      );
      const map = new Map<number, string[]>();
      const assigned = new Set<number>();
      for (const s of sets) {
        map.set(s.id, s.ids);
        if (s.ids.includes(providerId)) assigned.add(s.id);
      }
      // The home office is always part of the provider's working set.
      if (homeOfficeId != null) assigned.add(homeOfficeId);

      setOffices(offList);
      setOfficeProviderIds(map);
      setOriginalAssigned(new Set(assigned));
      setAssignedIds(new Set(assigned));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load office assignments");
    } finally {
      setLoading(false);
    }
  }, [providerId, homeOfficeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const officeName = useCallback(
    (id: number) => offices.find((o) => o.id === id)?.name ?? String(id),
    [offices],
  );

  const toItem = useCallback(
    (o: OfficeRead): DualListItem => ({
      id: String(o.id),
      primary: o.name,
      secondary: `Office ID: ${o.id}${o.short_id ? ` · ${o.short_id}` : ""}`,
      meta:
        o.id === homeOfficeId ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8EFF7] text-[#1F3A5F] text-[10px] font-bold">
            <Lock className="w-3 h-3" /> Home
          </span>
        ) : undefined,
    }),
    [homeOfficeId],
  );

  const { available, assigned } = useMemo(() => {
    const av: DualListItem[] = [];
    const as: DualListItem[] = [];
    for (const o of offices) {
      (assignedIds.has(o.id) ? as : av).push(toItem(o));
    }
    return { available: av, assigned: as };
  }, [offices, assignedIds, toItem]);

  const dirty = useMemo(() => {
    if (assignedIds.size !== originalAssigned.size) return true;
    for (const id of assignedIds) if (!originalAssigned.has(id)) return true;
    return false;
  }, [assignedIds, originalAssigned]);

  const handleChange = (ids: string[]) => {
    const next = new Set(ids.map(Number));
    // Home office can't be unassigned from here.
    if (homeOfficeId != null) next.add(homeOfficeId);
    setAssignedIds(next);
  };

  const handleSave = async () => {
    const changedOffices = offices.filter(
      (o) => assignedIds.has(o.id) !== originalAssigned.has(o.id),
    );
    if (changedOffices.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        changedOffices.map((o) => {
          const current = officeProviderIds.get(o.id) ?? [];
          const without = current.filter((pid) => pid !== providerId);
          const nextIds = assignedIds.has(o.id) ? [...without, providerId] : without;
          return setOfficeProviders(o.id, { ids: nextIds });
        }),
      );
      toast.success("Office assignments saved", {
        description: `Updated ${changedOffices.length} office(s).`,
      });
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not update office assignments",
      });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load office assignments</p>
        <p className="text-xs text-[#64748B] max-w-md">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Works At</h3>
          <p className="text-xs text-[#64748B]">
            Offices this provider works at. The home office{" "}
            {homeOfficeId != null ? `(${officeName(homeOfficeId)})` : ""} is always included.
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Assignments
        </button>
      </div>

      <DualListPicker
        available={available}
        assigned={assigned}
        onChange={handleChange}
        leftTitle="Available Offices"
        rightTitle="Assigned Offices"
        loading={loading}
        disabled={saving}
        emptyAvailableLabel="No more offices to assign"
        emptyAssignedLabel="Not assigned to any office"
      />
    </div>
  );
}
