import type { ProcedureCodeForm } from "../procedureCodeData";
import type { ProviderRead, NoteMacroRead } from "@/api/generated/model";

interface MainTabProps {
  formData: ProcedureCodeForm;
  updateFormData: (updates: Partial<ProcedureCodeForm>) => void;
  /** Existing categories (derived from backend data) — power the category suggestions. */
  categories: string[];
  /** Lookup options for the default-provider / default-notes-macro selects. */
  providers: ProviderRead[];
  noteMacros: NoteMacroRead[];
  /** Code is immutable once the procedure exists. */
  codeLocked: boolean;
}

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm disabled:bg-[#F1F5F9] disabled:text-[#64748B]";
const checkCls = "flex items-center gap-2 text-sm font-semibold text-[#1E293B]";

export default function MainTab({
  formData,
  updateFormData,
  categories,
  providers,
  noteMacros,
  codeLocked,
}: MainTabProps) {
  return (
    <div className="space-y-6">
      {/* General information */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          General Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Code <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => updateFormData({ code: e.target.value })}
              disabled={codeLocked}
              placeholder="e.g., D0120"
              className={inputCls}
            />
            {codeLocked && (
              <p className="mt-1 text-[11px] text-[#94A3B8]">Code is the identifier and can't be changed.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Legacy / Other Code</label>
            <input
              type="text"
              value={formData.legacy_code}
              onChange={(e) => updateFormData({ legacy_code: e.target.value })}
              placeholder="Optional"
              className={inputCls}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>
              Description <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="e.g., Periodic Oral Evaluation"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Category <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              list="procedure-category-options"
              value={formData.category}
              onChange={(e) => updateFormData({ category: e.target.value })}
              placeholder="e.g., DIAGNOSTIC"
              className={inputCls}
            />
            <datalist id="procedure-category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Insurance Billing Order</label>
            <input
              type="text"
              value={formData.billing_order}
              onChange={(e) => updateFormData({ billing_order: e.target.value })}
              placeholder="e.g., Bill to Dental Insurance"
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Financial */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Financial Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Default Fee</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formData.default_fee}
                onChange={(e) => updateFormData({ default_fee: e.target.value })}
                placeholder="0.00"
                className={`${inputCls} pl-7`}
              />
            </div>
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              Office UCR fee. Per-schedule pricing lives in the Fee Schedules tab.
            </p>
          </div>
          <div className="flex items-end pb-1">
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.requires_lab}
                onChange={(e) => updateFormData({ requires_lab: e.target.checked })}
                className="w-4 h-4"
              />
              Requires lab work
            </label>
          </div>
        </div>
      </section>

      {/* Billing & Tax (PROC-4) */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Billing &amp; Tax Codes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Sales Tax Code</label>
            <input
              type="text"
              value={formData.sales_tax_code}
              onChange={(e) => updateFormData({ sales_tax_code: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Visit Code</label>
            <input
              type="text"
              value={formData.visit_code}
              onChange={(e) => updateFormData({ visit_code: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ledger Code</label>
            <input
              type="text"
              value={formData.ledger_code}
              onChange={(e) => updateFormData({ ledger_code: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>A/R Code</label>
            <input
              type="text"
              value={formData.ar_code}
              onChange={(e) => updateFormData({ ar_code: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 self-end pb-1">
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.taxable}
                onChange={(e) => updateFormData({ taxable: e.target.checked })}
                className="w-4 h-4"
              />
              Taxable
            </label>
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.is_post_op}
                onChange={(e) => updateFormData({ is_post_op: e.target.checked })}
                className="w-4 h-4"
              />
              Post-Op
            </label>
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.exempt_from_dental_max}
                onChange={(e) => updateFormData({ exempt_from_dental_max: e.target.checked })}
                className="w-4 h-4"
              />
              Exempt from dental max
            </label>
          </div>
        </div>
      </section>

      {/* Defaults (PROC-4) */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Provider &amp; Notes Defaults
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Default Provider</label>
            <select
              value={formData.default_provider_id}
              onChange={(e) => updateFormData({ default_provider_id: e.target.value })}
              className={inputCls}
            >
              <option value="">— None —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.short_id ? ` (${p.short_id})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Default Notes Macro</label>
            <select
              value={formData.default_notes_macro_id ?? ""}
              onChange={(e) =>
                updateFormData({
                  default_notes_macro_id: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={inputCls}
            >
              <option value="">— None —</option>
              {noteMacros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.lock_default_provider}
                onChange={(e) => updateFormData({ lock_default_provider: e.target.checked })}
                className="w-4 h-4"
              />
              Lock default provider
            </label>
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.show_ada_code_in_notes}
                onChange={(e) => updateFormData({ show_ada_code_in_notes: e.target.checked })}
                className="w-4 h-4"
              />
              Show ADA code &amp; description in auto-generated notes
            </label>
          </div>
        </div>
      </section>

      {/* Scheduling & recall */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Scheduling &amp; Recall
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Procedure Time (min)</label>
            <input
              type="number"
              min={0}
              step={5}
              value={formData.default_duration_minutes ?? ""}
              onChange={(e) =>
                updateFormData({
                  default_duration_minutes: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="e.g., 30"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-[#94A3B8]">Default chair time used by the Scheduler.</p>
          </div>
          <div>
            <label className={labelCls}>Recall Interval</label>
            <input
              type="number"
              min={0}
              value={formData.recall_interval ?? ""}
              onChange={(e) =>
                updateFormData({
                  recall_interval: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="e.g., 6"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Recall Unit</label>
            <select
              value={formData.recall_unit}
              onChange={(e) => updateFormData({ recall_unit: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
      </section>

      {/* NHS (PROC-4) */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          NHS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>NHS Treatment Category</label>
            <input
              type="text"
              value={formData.nhs_treatment_category}
              onChange={(e) => updateFormData({ nhs_treatment_category: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>NHS Clinical Data Set</label>
            <input
              type="text"
              value={formData.nhs_clinical_data_set}
              onChange={(e) => updateFormData({ nhs_clinical_data_set: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Flags */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Status &amp; Flags
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={formData.is_active ? "active" : "inactive"}
              onChange={(e) => updateFormData({ is_active: e.target.value === "active" })}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className={checkCls}>
              <input
                type="checkbox"
                checked={formData.is_ortho}
                onChange={(e) => updateFormData({ is_ortho: e.target.checked })}
                className="w-4 h-4"
              />
              Orthodontic procedure
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
