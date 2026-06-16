import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ShieldCheck, X, Save } from "lucide-react";
import { toast } from "sonner";
import {
  listProcedureInsuranceRules,
  createProcedureInsuranceRule,
  updateProcedureInsuranceRule,
  deleteProcedureInsuranceRule,
} from "@/api/generated/endpoints/procedures/procedures";
import type {
  ProcedureInsuranceRuleRead,
  ProcedureInsuranceRuleCreate,
} from "@/api/generated/model";

interface InsuranceTabProps {
  /** The procedure code; insurance rules hang off /procedure-codes/{code}/insurance-rules. */
  code: string;
}

interface RuleForm {
  coverage_pct: string;
  frequency_limit: string;
  age_limit: string;
  wait_period: string;
  notes: string;
  is_active: boolean;
}

const emptyRuleForm = (): RuleForm => ({
  coverage_pct: "",
  frequency_limit: "",
  age_limit: "",
  wait_period: "",
  notes: "",
  is_active: true,
});

const labelCls = "block text-[11px] font-bold text-[#1E293B] mb-1";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

const orNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

function buildBody(form: RuleForm): ProcedureInsuranceRuleCreate {
  return {
    coverage_pct: orNull(form.coverage_pct),
    frequency_limit: orNull(form.frequency_limit),
    age_limit: orNull(form.age_limit),
    wait_period: orNull(form.wait_period),
    notes: orNull(form.notes),
    is_active: form.is_active,
  };
}

function ruleToForm(r: ProcedureInsuranceRuleRead): RuleForm {
  return {
    coverage_pct: r.coverage_pct ?? "",
    frequency_limit: r.frequency_limit ?? "",
    age_limit: r.age_limit ?? "",
    wait_period: r.wait_period ?? "",
    notes: r.notes ?? "",
    is_active: Boolean(r.is_active),
  };
}

/**
 * Per-procedure insurance rules (PROC-3). CRUD against
 * /api/v1/procedure-codes/{code}/insurance-rules — coverage %, frequency/age
 * limits, waiting period, notes. The endpoint returns a plain array (not paged).
 */
export default function InsuranceTab({ code }: InsuranceTabProps) {
  const [rules, setRules] = useState<ProcedureInsuranceRuleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; form: RuleForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProcedureInsuranceRules(code);
      setRules(res ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load insurance rules");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id == null) {
        await createProcedureInsuranceRule(code, buildBody(editing.form));
        toast.success("Insurance rule added");
      } else {
        await updateProcedureInsuranceRule(code, editing.id, buildBody(editing.form));
        toast.success("Insurance rule updated");
      }
      setEditing(null);
      await load();
    } catch (e: unknown) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : "Could not save insurance rule",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: ProcedureInsuranceRuleRead) => {
    if (!confirm("Delete this insurance rule? This cannot be undone.")) return;
    setDeletingId(rule.id);
    try {
      await deleteProcedureInsuranceRule(code, rule.id);
      toast.success("Insurance rule deleted");
      await load();
    } catch (e: unknown) {
      toast.error("Delete failed", {
        description: e instanceof Error ? e.message : "Could not delete insurance rule",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const updateEditForm = (updates: Partial<RuleForm>) =>
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, ...updates } } : prev));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-[#64748B]">
        <Loader2 className="w-6 h-6 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading insurance rules…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm font-bold text-[#DC2626]">Unable to load insurance rules</p>
        <p className="text-xs text-[#64748B] max-w-md">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-1 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#64748B]">
          Insurance coverage rules for <span className="font-bold text-[#1F3A5F]">{code}</span> —
          coverage %, frequency/age limits and waiting periods used by claims &amp; estimation.
        </p>
        {!editing && (
          <button
            onClick={() => setEditing({ id: null, form: emptyRuleForm() })}
            className="flex items-center gap-2 px-3 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        )}
      </div>

      {/* Editor */}
      {editing && (
        <div className="rounded-lg border-2 border-[#3A6EA5]/30 bg-[#F7F9FC] p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#1F3A5F]">
              {editing.id == null ? "New Insurance Rule" : "Edit Insurance Rule"}
            </h4>
            <button
              onClick={() => setEditing(null)}
              className="p-1 hover:bg-[#E8EFF7] rounded"
              title="Cancel"
            >
              <X className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Coverage %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editing.form.coverage_pct}
                onChange={(e) => updateEditForm({ coverage_pct: e.target.value })}
                placeholder="e.g., 80"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Frequency Limit</label>
              <input
                type="text"
                value={editing.form.frequency_limit}
                onChange={(e) => updateEditForm({ frequency_limit: e.target.value })}
                placeholder="e.g., 2/year"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Age Limit</label>
              <input
                type="text"
                value={editing.form.age_limit}
                onChange={(e) => updateEditForm({ age_limit: e.target.value })}
                placeholder="e.g., ≤14"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Waiting Period</label>
              <input
                type="text"
                value={editing.form.wait_period}
                onChange={(e) => updateEditForm({ wait_period: e.target.value })}
                placeholder="e.g., 6 months"
                className={inputCls}
              />
            </div>
            <div className="md:col-span-3">
              <label className={labelCls}>Notes</label>
              <input
                type="text"
                value={editing.form.notes}
                onChange={(e) => updateEditForm({ notes: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                <input
                  type="checkbox"
                  checked={editing.form.is_active}
                  onChange={(e) => updateEditForm({ is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setEditing(null)}
              disabled={saving}
              className="px-3 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Rule
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {rules.length === 0 && !editing ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ShieldCheck className="w-10 h-10 text-[#CBD5E1]" />
          <p className="text-sm font-bold text-[#64748B]">No insurance rules for this code</p>
          <p className="text-xs text-[#94A3B8] max-w-md">
            Add a rule to define coverage %, limits and waiting periods for this procedure.
          </p>
        </div>
      ) : rules.length > 0 ? (
        <div className="overflow-auto rounded-lg border-2 border-[#E2E8F0]">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Coverage %", "Frequency", "Age", "Wait", "Notes", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rules.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setEditing({ id: r.id, form: ruleToForm(r) })}
                  className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-bold text-[#1E293B] tabular-nums">
                    {r.coverage_pct != null ? `${r.coverage_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">{r.frequency_limit || "—"}</td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">{r.age_limit || "—"}</td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">{r.wait_period || "—"}</td>
                  <td className="px-4 py-3 text-sm text-[#64748B]">{r.notes || "—"}</td>
                  <td className="px-4 py-3">
                    {r.is_active ? (
                      <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => void handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-[#DC2626]" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
