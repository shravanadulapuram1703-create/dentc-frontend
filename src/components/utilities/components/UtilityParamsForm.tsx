// Renders a utility's parameter form from its declarative `params`. Handles the
// built-in office/provider pickers (backed by the shared reference-data hooks)
// plus text/number/date/select/checkbox/file inputs. Emits validation state so
// the shell can gate the Run button.
import { useMemo } from "react";
import { Loader2, Upload } from "lucide-react";
import { useOffices, useProviders, officeName } from "../../reports/lib/useReportRefData";
import { providerOptionLabel } from "@/services/providerDirectory";
import type { ParamValues, UtilityDefinition, UtilityParamField } from "../types";

interface Props {
  def: UtilityDefinition;
  values: ParamValues;
  onChange: (key: string, value: ParamValues[string]) => void;
  disabled?: boolean;
}

const labelCls = "block text-xs font-bold text-[#1E293B] uppercase tracking-wide mb-1.5";
const inputCls =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all disabled:bg-[#F7F9FC] disabled:text-[#94A3B8]";

function Field({ field, values, onChange, disabled }: { field: UtilityParamField } & Omit<Props, "def">) {
  const v = values[field.key];
  const providersQ = useProviders(values.__office ? Number(values.__office) : null);

  switch (field.kind) {
    case "provider":
      return (
        <div>
          <label className={labelCls}>{field.label}</label>
          <select
            className={inputCls}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
          >
            <option value="">All providers</option>
            {(providersQ.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>
          {field.help && <p className="text-[11px] text-[#94A3B8] mt-1">{field.help}</p>}
        </div>
      );
    case "select":
      return (
        <div>
          <label className={labelCls}>
            {field.label} {field.required && <span className="text-[#DC2626]">*</span>}
          </label>
          <select
            className={inputCls}
            value={typeof v === "string" ? v : String(field.defaultValue ?? "")}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
          >
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.help && <p className="text-[11px] text-[#94A3B8] mt-1">{field.help}</p>}
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none py-1.5">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
            checked={v === true}
            onChange={(e) => onChange(field.key, e.target.checked)}
            disabled={disabled}
          />
          <span className="text-sm text-[#1E293B]">{field.label}</span>
        </label>
      );
    case "file": {
      const fileName = v instanceof File ? v.name : "";
      return (
        <div>
          <label className={labelCls}>
            {field.label} {field.required && <span className="text-[#DC2626]">*</span>}
          </label>
          <label
            className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg text-sm cursor-pointer transition-colors ${
              disabled ? "border-[#E2E8F0] text-[#94A3B8]" : "border-[#CBD5E1] text-[#475569] hover:border-[#3A6EA5] hover:bg-[#EFF6FF]"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span className="truncate">{fileName || "Choose file…"}</span>
            <input
              type="file"
              className="hidden"
              accept={field.accept}
              disabled={disabled}
              onChange={(e) => onChange(field.key, e.target.files?.[0] ?? null)}
            />
          </label>
          {field.help && <p className="text-[11px] text-[#94A3B8] mt-1">{field.help}</p>}
        </div>
      );
    }
    case "number":
      return (
        <div>
          <label className={labelCls}>
            {field.label} {field.required && <span className="text-[#DC2626]">*</span>}
          </label>
          <input
            type="number"
            className={inputCls}
            placeholder={field.placeholder}
            value={v == null ? "" : String(v)}
            onChange={(e) => onChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
            disabled={disabled}
          />
        </div>
      );
    case "date":
      return (
        <div>
          <label className={labelCls}>
            {field.label} {field.required && <span className="text-[#DC2626]">*</span>}
          </label>
          <input
            type="date"
            className={inputCls}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
          />
        </div>
      );
    default: // text
      return (
        <div>
          <label className={labelCls}>
            {field.label} {field.required && <span className="text-[#DC2626]">*</span>}
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder={field.placeholder}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
          />
          {field.help && <p className="text-[11px] text-[#94A3B8] mt-1">{field.help}</p>}
        </div>
      );
  }
}

export default function UtilityParamsForm({ def, values, onChange, disabled }: Props) {
  const officesQ = useOffices();
  const offices = useMemo(() => officesQ.data ?? [], [officesQ.data]);

  const hasFields = def.officeScoped || (def.params?.length ?? 0) > 0;
  if (!hasFields) {
    return (
      <p className="text-sm text-[#64748B]">
        This utility takes no parameters — press Run to execute.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {def.officeScoped && (
        <div>
          <label className={labelCls}>
            Office <span className="text-[#DC2626]">*</span>
          </label>
          {officesQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#64748B] py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading offices…
            </div>
          ) : (
            <select
              className={inputCls}
              value={typeof values.__office === "string" ? values.__office : ""}
              onChange={(e) => onChange("__office", e.target.value)}
              disabled={disabled}
            >
              <option value="">Select an office…</option>
              {offices.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {officeName(o)}
                </option>
              ))}
            </select>
          )}
          <p className="text-[11px] text-[#94A3B8] mt-1">Changes affect only the selected office.</p>
        </div>
      )}

      {(def.params ?? []).map((f) => (
        <div key={f.key} className={f.kind === "checkbox" || f.kind === "file" ? "sm:col-span-2" : ""}>
          <Field field={f} values={values} onChange={onChange} disabled={disabled} />
        </div>
      ))}
    </div>
  );
}
