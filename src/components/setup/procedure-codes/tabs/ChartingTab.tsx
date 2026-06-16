import type { ProcedureCodeForm } from "../procedureCodeData";
import { PERMANENT_TEETH, PRIMARY_TEETH } from "../procedureCodeData";
import type { ChartMaterialRead } from "@/api/generated/model";

interface ChartingTabProps {
  formData: ProcedureCodeForm;
  updateFormData: (updates: Partial<ProcedureCodeForm>) => void;
  /** Chart materials for the default-material select. */
  materials: ChartMaterialRead[];
}

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

const REQUIREMENT_TOGGLES: Array<{
  key: "requires_tooth" | "requires_surface" | "requires_quadrant";
  label: string;
  hint: string;
}> = [
  {
    key: "requires_tooth",
    label: "Tooth Required",
    hint: "Charting and posting require a tooth number for this procedure.",
  },
  {
    key: "requires_surface",
    label: "Surface Required",
    hint: "Charting requires one or more tooth surfaces (M, O, D, B, L…).",
  },
  {
    key: "requires_quadrant",
    label: "Quadrant Required",
    hint: "Charting requires a quadrant (UR, UL, LR, LL) — e.g. scaling/root planing.",
  },
];

export default function ChartingTab({ formData, updateFormData, materials }: ChartingTabProps) {
  const toggleTooth = (tooth: string) => {
    const set = new Set(formData.valid_teeth);
    if (set.has(tooth)) set.delete(tooth);
    else set.add(tooth);
    updateFormData({ valid_teeth: [...set] });
  };

  const ToothButton = ({ tooth }: { tooth: string }) => {
    const selected = formData.valid_teeth.includes(tooth);
    return (
      <button
        type="button"
        onClick={() => toggleTooth(tooth)}
        className={`h-8 min-w-[2rem] px-1 rounded text-xs font-bold border-2 transition-colors ${
          selected
            ? "bg-[#3A6EA5] text-white border-[#3A6EA5]"
            : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#3A6EA5]"
        }`}
      >
        {tooth}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Requirement toggles */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Clinical Charting Requirements
        </h3>
        <p className="text-xs text-[#64748B] mb-4 max-w-2xl">
          These rules control what the clinician must select when charting or posting this procedure.
          They drive validation in the tooth chart, treatment planning, and the ledger.
        </p>
        <div className="space-y-3">
          {REQUIREMENT_TOGGLES.map((t) => (
            <label
              key={t.key}
              className="flex items-start gap-3 p-3 rounded-lg border-2 border-[#E2E8F0] hover:border-[#3A6EA5]/40 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={formData[t.key]}
                onChange={(e) => updateFormData({ [t.key]: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span>
                <span className="block text-sm font-bold text-[#1E293B]">{t.label}</span>
                <span className="block text-xs text-[#64748B]">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Chart display config */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Chart Display
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Chart Category</label>
            <input
              type="text"
              value={formData.chart_category}
              onChange={(e) => updateFormData({ chart_category: e.target.value })}
              placeholder="e.g., Restorative"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tooth Area</label>
            <input
              type="text"
              value={formData.tooth_area}
              onChange={(e) => updateFormData({ tooth_area: e.target.value })}
              placeholder="e.g., Crown, Root"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Draw Chart As</label>
            <input
              type="text"
              value={formData.draw_as}
              onChange={(e) => updateFormData({ draw_as: e.target.value })}
              placeholder="e.g., Filling, Crown"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Min. Surfaces</label>
            <input
              type="number"
              min={0}
              value={formData.min_surfaces ?? ""}
              onChange={(e) =>
                updateFormData({ min_surfaces: e.target.value === "" ? null : Number(e.target.value) })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max. Surfaces</label>
            <input
              type="number"
              min={0}
              value={formData.max_surfaces ?? ""}
              onChange={(e) =>
                updateFormData({ max_surfaces: e.target.value === "" ? null : Number(e.target.value) })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Default Material</label>
            <select
              value={formData.default_material_id ?? ""}
              onChange={(e) =>
                updateFormData({
                  default_material_id: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={inputCls}
            >
              <option value="">— None —</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Valid teeth */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Valid Teeth</h3>
          {formData.valid_teeth.length > 0 && (
            <button
              type="button"
              onClick={() => updateFormData({ valid_teeth: [] })}
              className="text-xs font-bold text-[#DC2626] hover:underline"
            >
              Clear ({formData.valid_teeth.length})
            </button>
          )}
        </div>
        <p className="text-xs text-[#64748B] mb-3 max-w-2xl">
          Restrict which teeth this procedure may be charted on (Universal numbering). Leave all
          unselected to allow any tooth.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase mb-1.5">Permanent (1–32)</p>
            <div className="flex flex-wrap gap-1.5">
              {PERMANENT_TEETH.map((t) => (
                <ToothButton key={t} tooth={t} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase mb-1.5">Primary (A–T)</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIMARY_TEETH.map((t) => (
                <ToothButton key={t} tooth={t} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
