import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, Loader2, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  listInsuranceCoverageRules,
  createInsuranceCoverageRule,
  updateInsuranceCoverageRule,
  deleteInsuranceCoverageRule,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsuranceCoverageRuleRead } from "@/api/generated/model";
import {
  type CoverageRuleForm,
  emptyCoverageRuleForm,
  coverageRuleToForm,
  buildCoverageRuleCreate,
  buildCoverageRuleUpdate,
} from "./planData";
import DefinitionField from "./DefinitionField";
import { useDefinitionLabels } from "./useDefinitionLabels";

// Coverage rules for a single plan (ins_plan_id-scoped sub-resource). A plan's
// rule set maps procedure-code ranges → coverage %, deductible-waived, limits.

const INPUT_CLS =
  "w-full px-2 py-1.5 border-2 border-[#E2E8F0] rounded text-sm focus:outline-none focus:border-[#3A6EA5]";

export default function CoverageRulesSection({ insPlanId }: { insPlanId: number }) {
  const [rules, setRules] = useState<InsuranceCoverageRuleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<CoverageRuleForm>(() => emptyCoverageRuleForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const categoryLabel = useDefinitionLabels("coverage_category");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listInsuranceCoverageRules({
        ins_plan_id: insPlanId,
        size: 200,
        sort: "start_code",
        order: "asc",
      });
      setRules(res.items ?? []);
    } catch (e: unknown) {
      toast.error("Failed to load coverage rules", {
        description: e instanceof Error ? e.message : undefined,
      });
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [insPlanId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upd = (u: Partial<CoverageRuleForm>) => setForm((p) => ({ ...p, ...u }));

  const startAdd = () => {
    setForm(emptyCoverageRuleForm());
    setEditingId("new");
  };
  const startEdit = (r: InsuranceCoverageRuleRead) => {
    setForm(coverageRuleToForm(r));
    setEditingId(r.id);
  };
  const cancel = () => {
    setEditingId(null);
    setForm(emptyCoverageRuleForm());
  };

  const save = async () => {
    if (!form.start_code.trim()) {
      toast.error("Start code is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        await createInsuranceCoverageRule(buildCoverageRuleCreate(insPlanId, form));
        toast.success("Coverage rule added");
      } else if (typeof editingId === "number") {
        await updateInsuranceCoverageRule(editingId, buildCoverageRuleUpdate(form));
        toast.success("Coverage rule updated");
      }
      cancel();
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: InsuranceCoverageRuleRead) => {
    if (!confirm(`Delete coverage rule ${r.start_code}–${r.end_code}?`)) return;
    setDeletingId(r.id);
    try {
      await deleteInsuranceCoverageRule(r.id);
      toast.success("Coverage rule deleted");
      await load();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-[#E2E8F0] pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#3A6EA5] uppercase tracking-wide">
          Coverage Rules {rules.length > 0 && <span className="text-[#94A3B8]">({rules.length})</span>}
        </h3>
        <button
          onClick={startAdd}
          disabled={editingId !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-xs disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Rule
        </button>
      </div>

      {editingId === "new" && (
        <RuleEditor form={form} upd={upd} onSave={save} onCancel={cancel} saving={saving} />
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading rules…
        </div>
      ) : rules.length === 0 && editingId !== "new" ? (
        <p className="text-xs text-[#64748B] py-4">
          No coverage rules yet. Add a rule to map a procedure-code range to a coverage %.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Codes", "Category", "Coverage %", "Ded Waived", "Freq", "Age", "Wait", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rules.map((r) =>
                editingId === r.id ? (
                  <tr key={r.id}>
                    <td colSpan={8} className="p-0">
                      <RuleEditor form={form} upd={upd} onSave={save} onCancel={cancel} saving={saving} />
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="hover:bg-[#F7F9FC]">
                    <td className="px-2 py-2 font-semibold text-[#1E293B]">
                      {r.start_code}
                      {r.end_code && r.end_code !== r.start_code ? `–${r.end_code}` : ""}
                    </td>
                    <td className="px-2 py-2 text-[#64748B]">{categoryLabel(r.category)}</td>
                    <td className="px-2 py-2 text-[#64748B]">{r.coverage_pct != null ? `${r.coverage_pct}%` : "—"}</td>
                    <td className="px-2 py-2 text-[#64748B]">{r.ded_waived ? "Yes" : "No"}</td>
                    <td className="px-2 py-2 text-[#64748B]">{r.freq_limit || "—"}</td>
                    <td className="px-2 py-2 text-[#64748B]">{r.age_limit || "—"}</td>
                    <td className="px-2 py-2 text-[#64748B]">{r.wait_period || "—"}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(r)}
                        disabled={editingId !== null}
                        className="p-1.5 hover:bg-[#E8EFF7] rounded disabled:opacity-40"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#3A6EA5]" />
                      </button>
                      <button
                        onClick={() => void remove(r)}
                        disabled={deletingId === r.id}
                        className="p-1.5 hover:bg-[#FEE2E2] rounded disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                        )}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RuleEditor({
  form,
  upd,
  onSave,
  onCancel,
  saving,
}: {
  form: CoverageRuleForm;
  upd: (u: Partial<CoverageRuleForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="bg-[#F7F9FC] border-2 border-[#3A6EA5]/30 rounded-lg p-3 mb-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <label className="text-xs font-bold text-[#1F3A5F]">
          Start Code*
          <input value={form.start_code} onChange={(e) => upd({ start_code: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          End Code
          <input value={form.end_code} onChange={(e) => upd({ end_code: e.target.value })} className={INPUT_CLS} placeholder="= start" />
        </label>
        <div className="text-xs font-bold text-[#1F3A5F]">
          Category
          <DefinitionField groupCode="coverage_category" value={form.category} onChange={(v) => upd({ category: v })} placeholder="category" />
        </div>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Coverage %
          <input value={form.coverage_pct} onChange={(e) => upd({ coverage_pct: e.target.value })} className={INPUT_CLS} inputMode="decimal" />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Freq Limit
          <input value={form.freq_limit} onChange={(e) => upd({ freq_limit: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Age Limit
          <input value={form.age_limit} onChange={(e) => upd({ age_limit: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="text-xs font-bold text-[#1F3A5F]">
          Wait Period
          <input value={form.wait_period} onChange={(e) => upd({ wait_period: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-[#1F3A5F] mt-5">
          <input type="checkbox" checked={form.ded_waived} onChange={(e) => upd({ ded_waived: e.target.checked })} className="w-4 h-4 accent-[#3A6EA5]" />
          Ded Waived
        </label>
      </div>
      <div className="md:col-span-4 mb-2">
        <label className="text-xs font-bold text-[#1F3A5F] block">
          Description
          <input value={form.description} onChange={(e) => upd({ description: e.target.value })} className={INPUT_CLS} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg font-bold text-xs disabled:opacity-50">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg font-bold text-xs disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Rule
        </button>
      </div>
    </div>
  );
}
