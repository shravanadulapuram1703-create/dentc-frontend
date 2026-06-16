import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import {
  listProviderReferralOffices,
  setProviderReferralOffices,
} from "@/api/generated/endpoints/provider-setup/provider-setup";
import type { OfficeRead } from "@/api/generated/model";
import DualListPicker, { type DualListItem } from "../../offices/DualListPicker";

interface ReferralsTabProps {
  providerId: string;
}

/**
 * Offices at which this provider can receive referrals. The set is replaced
 * wholesale via PUT /providers/{id}/referral-offices ({ office_ids }).
 */
export default function ReferralsTab({ providerId }: ReferralsTabProps) {
  const [offices, setOffices] = useState<OfficeRead[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offRes, assigned] = await Promise.all([
        listOffices({ size: 200 }),
        listProviderReferralOffices(providerId),
      ]);
      setOffices(offRes.items ?? []);
      const ids = new Set((assigned ?? []).map((o) => o.id));
      setAssignedIds(new Set(ids));
      setOriginalIds(new Set(ids));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load referral offices");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toItem = (o: OfficeRead): DualListItem => ({
    id: String(o.id),
    primary: o.name,
    secondary: `Office ID: ${o.id}${o.short_id ? ` · ${o.short_id}` : ""}`,
  });

  const { available, assigned } = useMemo(() => {
    const av: DualListItem[] = [];
    const as: DualListItem[] = [];
    for (const o of offices) (assignedIds.has(o.id) ? as : av).push(toItem(o));
    return { available: av, assigned: as };
  }, [offices, assignedIds]);

  const dirty = useMemo(() => {
    if (assignedIds.size !== originalIds.size) return true;
    for (const id of assignedIds) if (!originalIds.has(id)) return true;
    return false;
  }, [assignedIds, originalIds]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setProviderReferralOffices(providerId, { office_ids: Array.from(assignedIds) });
      toast.success("Referral offices saved");
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load referral offices</p>
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
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Referral Offices</h3>
          <p className="text-xs text-[#64748B]">
            Offices where this provider can receive referrals.
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <DualListPicker
        available={available}
        assigned={assigned}
        onChange={(ids) => setAssignedIds(new Set(ids.map(Number)))}
        leftTitle="Available Offices"
        rightTitle="Referral Offices"
        loading={loading}
        disabled={saving}
        emptyAvailableLabel="No more offices"
        emptyAssignedLabel="No referral offices"
      />
    </div>
  );
}
