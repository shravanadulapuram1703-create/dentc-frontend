import type { ProviderForm } from "../providerData";
import type { OfficeRead } from "@/api/generated/model";
import { useDefinitions } from "@/shared/hooks/useDefinitions";

interface InfoTabProps {
  formData: ProviderForm;
  updateFormData: (updates: Partial<ProviderForm>) => void;
  offices: OfficeRead[];
}

const labelCls = "block text-xs font-bold text-[#1E293B] mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

/**
 * A lookup-backed field. When the backing `definitions` group resolves to one or
 * more options it renders a <select>; otherwise it degrades to a free-text input
 * (the provider `role`/`specialty` columns are free strings, and the canonical
 * `group_code` values are unconfirmed — we never fabricate option lists).
 */
function DefinitionField({
  label,
  groupCode,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  groupCode: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { options, isLoading } = useDefinitions(groupCode);

  if (!isLoading && options.length > 0) {
    // Allow the existing value even if it isn't (yet) in the lookup set.
    const known = options.some((o) => o.value === value);
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Select {label}</option>
          {!known && value ? <option value={value}>{value}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

export default function InfoTab({ formData, updateFormData, offices }: InfoTabProps) {
  return (
    <div className="space-y-6">
      {/* Basic provider info */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Basic Provider Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>
              Provider Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="e.g., Ahmed, Meer (DDS)"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>First Name</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => updateFormData({ first_name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => updateFormData({ last_name: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Home Office <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={formData.office_id ?? ""}
              onChange={(e) =>
                updateFormData({ office_id: e.target.value ? Number(e.target.value) : null })
              }
              className={inputCls}
            >
              <option value="">Select Office</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="DDS, DMD, RDH…"
              className={inputCls}
            />
          </div>

          <DefinitionField
            label="Provider Type / Role"
            groupCode="provider_role"
            value={formData.role}
            onChange={(v) => updateFormData({ role: v })}
            placeholder="e.g., Dentist, Hygienist, Assistant"
          />
          <DefinitionField
            label="Specialty"
            groupCode="provider_specialty"
            value={formData.specialty}
            onChange={(v) => updateFormData({ specialty: v })}
            placeholder="e.g., General Practice, Orthodontist"
          />

          <div>
            <label className={labelCls}>Short ID</label>
            <input
              type="text"
              value={formData.short_id}
              onChange={(e) => updateFormData({ short_id: e.target.value })}
              placeholder="4–6 chars"
              className={inputCls}
            />
          </div>
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
        </div>
      </section>

      {/* Credentials */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Professional Credentials
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>NPI #</label>
            <input
              type="text"
              value={formData.npi}
              onChange={(e) => updateFormData({ npi: e.target.value })}
              placeholder="10-digit NPI"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>License #</label>
            <input
              type="text"
              value={formData.license}
              onChange={(e) => updateFormData({ license: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tax ID #</label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => updateFormData({ tax_id: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>DEA ID #</label>
            <input
              type="text"
              value={formData.dea_id}
              onChange={(e) => updateFormData({ dea_id: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Provider settings */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Provider Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Scheduler Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.scheduler_color || "#3A6EA5"}
                onChange={(e) => updateFormData({ scheduler_color: e.target.value })}
                className="h-10 w-12 rounded-lg border-2 border-[#CBD5E1] cursor-pointer"
                aria-label="Scheduler color"
              />
              <input
                type="text"
                value={formData.scheduler_color}
                onChange={(e) => updateFormData({ scheduler_color: e.target.value })}
                placeholder="#3A6EA5 or Blue"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Default Appointment Time (min)</label>
            <input
              type="number"
              min={0}
              step={5}
              value={formData.default_provider_time ?? ""}
              onChange={(e) =>
                updateFormData({
                  default_provider_time: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="e.g., 60"
              className={inputCls}
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
              <input
                type="checkbox"
                checked={formData.is_ortho_provider}
                onChange={(e) => updateFormData({ is_ortho_provider: e.target.checked })}
                className="w-4 h-4"
              />
              Ortho provider
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
              <input
                type="checkbox"
                checked={formData.visible_in_appointnow}
                onChange={(e) => updateFormData({ visible_in_appointnow: e.target.checked })}
                className="w-4 h-4"
              />
              Visible in AppointNow
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
              <input
                type="checkbox"
                checked={formData.is_billing_provider}
                onChange={(e) => updateFormData({ is_billing_provider: e.target.checked })}
                className="w-4 h-4"
              />
              Billing provider
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
              <input
                type="checkbox"
                checked={formData.print_separate_claim_form}
                onChange={(e) => updateFormData({ print_separate_claim_form: e.target.checked })}
                className="w-4 h-4"
              />
              Print separate claim form
            </label>
          </div>
        </div>
      </section>

      {/* Advanced / integrations */}
      <section>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide mb-3">
          Advanced &amp; Integrations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>DoseSpot User ID</label>
            <input
              type="text"
              value={formData.dosespot_user_id}
              onChange={(e) => updateFormData({ dosespot_user_id: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Updox Direct Address</label>
            <input
              type="text"
              value={formData.updox_direct_address}
              onChange={(e) => updateFormData({ updox_direct_address: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Denticon User ID</label>
            <input
              type="text"
              value={formData.denticon_user_id}
              onChange={(e) => updateFormData({ denticon_user_id: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ortho Questionnaire Template</label>
            <input
              type="text"
              value={formData.ortho_questionnaire_template}
              onChange={(e) => updateFormData({ ortho_questionnaire_template: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Custom 1</label>
            <input
              type="text"
              value={formData.custom_1}
              onChange={(e) => updateFormData({ custom_1: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Custom 2</label>
            <input
              type="text"
              value={formData.custom_2}
              onChange={(e) => updateFormData({ custom_2: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
