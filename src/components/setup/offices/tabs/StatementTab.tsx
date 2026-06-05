import { useState, useEffect, useCallback } from "react";
import { FileText, AlertCircle, Loader2, Save, Upload, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../../styles/theme";
import {
  fetchOfficeStatementSettings,
  saveOfficeStatementSettings,
  uploadOfficeStatementLogo,
  deleteOfficeStatementLogo,
  emptyOfficeStatementSettings,
  type OfficeStatementSettings,
  type LogoOption,
  type AddressSource,
} from "../../../../services/officeStatementApi";

/**
 * Office → Statement tab. A per-office replica of the production Office Statement
 * screen: six Monthly Statement Messages + the Statement Settings block
 * (correspondence name, logo option/upload, statement address source + address).
 *
 * Backed by the deployed office statement-settings endpoints via
 * `officeStatementApi`, which wraps the generated Orval client.
 */

const MESSAGE_FIELDS: { key: keyof OfficeStatementSettings; label: string }[] = [
  { key: "message_general", label: "General Message" },
  { key: "message_current", label: "Current Message" },
  { key: "message_30", label: "30 Day Message" },
  { key: "message_60", label: "60 Day Message" },
  { key: "message_90", label: "90 Day Message" },
  { key: "message_120", label: "120 Day Message" },
];

// logo_option / address_source are plain strings in the API (no enum). The
// values below are a UI assumption to confirm with backend.
const LOGO_OPTIONS: { value: LogoOption; label: string }[] = [
  { value: "OFFICE", label: "Use office logo" },
  { value: "CUSTOM", label: "Use custom logo" },
  { value: "NONE", label: "No logo" },
];

const ADDRESS_SOURCES: { value: AddressSource; label: string }[] = [
  { value: "OFFICE", label: "Use office statement address and phone" },
  { value: "CUSTOM", label: "Use custom statement address and phone" },
];

const MAX_MESSAGE_LEN = 100;

type StatementTabProps = {
  officeId: number;
};

export default function StatementTab({ officeId }: StatementTabProps) {
  const [settings, setSettings] = useState<OfficeStatementSettings>(emptyOfficeStatementSettings());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchOfficeStatementSettings(officeId);
      setSettings(data);
      setDirty(false);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load statement settings";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = <K extends keyof OfficeStatementSettings>(key: K, value: OfficeStatementSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveOfficeStatementSettings(officeId, settings);
      setSettings(saved);
      setDirty(false);
      toast.success("Statement settings saved");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo too large", { description: "Maximum size is 2 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? "");
      setSaving(true);
      try {
        const { logo_url } = await uploadOfficeStatementLogo(officeId, dataUrl);
        setSettings((prev) => ({ ...prev, logo_url, logo_option: "CUSTOM" }));
        setDirty(true);
        toast.success("Logo uploaded");
      } catch (e: unknown) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
        toast.error("Upload failed", { description: msg });
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = async () => {
    setSaving(true);
    try {
      await deleteOfficeStatementLogo(officeId);
      setSettings((prev) => ({ ...prev, logo_url: null }));
      setDirty(true);
      toast.success("Logo removed");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Request failed";
      toast.error("Remove failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading statement settings…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-[#DC2626]" />
        <p className="text-sm font-bold text-[#1E293B]">Could not load statement settings</p>
        <p className="text-xs text-[#64748B] max-w-md">{loadError}</p>
        <button onClick={() => void reload()} className={components.buttonOutline + " inline-flex items-center gap-2 mt-2"}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const isCustomAddress = settings.address_source === "CUSTOM";

  return (
    <div className="space-y-6 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      {/* Monthly Statement Messages */}
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <FileText className="w-5 h-5 text-[#3A6EA5]" />
          Monthly Statement Messages
        </h3>

        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Message Guidelines:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Maximum {MAX_MESSAGE_LEN} characters per message</li>
              <li>Avoid special characters (print limitation)</li>
              <li>Printed on patient statements by aging bucket</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MESSAGE_FIELDS.map(({ key, label }) => {
            const value = String(settings[key] ?? "");
            return (
              <div key={key}>
                <label className="block text-xs font-bold text-[#1E293B] mb-1">{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => update(key, e.target.value as OfficeStatementSettings[typeof key])}
                  maxLength={MAX_MESSAGE_LEN}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm resize-none focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                />
                <p className="text-[10px] text-[#64748B] mt-1">{value.length} / {MAX_MESSAGE_LEN} characters</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statement Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <FileText className="w-5 h-5 text-[#3A6EA5]" />
          Statement Settings
        </h3>

        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] divide-y divide-[#E2E8F0]">
          {/* Correspondence Name */}
          <Row label="Correspondence Name">
            <input
              type="text"
              value={settings.correspondence_name}
              onChange={(e) => update("correspondence_name", e.target.value)}
              className={inputCls}
            />
          </Row>

          {/* Current Logo Option */}
          <Row label="Current Logo Option">
            <select
              value={settings.logo_option}
              onChange={(e) => update("logo_option", e.target.value as LogoOption)}
              className={inputCls}
            >
              {LOGO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Row>

          {/* Logo */}
          <Row label="Logo">
            {settings.logo_option === "CUSTOM" ? (
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Statement logo" className="h-12 w-auto border border-[#E2E8F0] rounded bg-white object-contain" />
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">No custom logo uploaded</span>
                )}
                <label className={components.buttonOutline + " inline-flex items-center gap-2 cursor-pointer text-sm"}>
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {settings.logo_url && (
                  <button
                    onClick={() => void handleLogoRemove()}
                    className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                    title="Remove logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <span className="text-[10px] text-[#94A3B8]">JPG/PNG, max 2 MB</span>
              </div>
            ) : (
              <span className="text-sm text-[#64748B]">
                {settings.logo_option === "OFFICE" ? "Office logo will be used." : "No logo will be printed."}
              </span>
            )}
          </Row>

          {/* Statement Name, Address and Phone (source) */}
          <Row label="Statement Name, Address and Phone">
            <select
              value={settings.address_source}
              onChange={(e) => update("address_source", e.target.value as AddressSource)}
              className={inputCls}
            >
              {ADDRESS_SOURCES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Row>

          {/* Statement Address */}
          <Row label="Statement Address">
            {isCustomAddress ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={settings.statement_address_1}
                  onChange={(e) => update("statement_address_1", e.target.value)}
                  placeholder="Address line 1"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={settings.statement_address_2}
                  onChange={(e) => update("statement_address_2", e.target.value)}
                  placeholder="Address line 2 (suite, etc.)"
                  className={inputCls}
                />
              </div>
            ) : (
              <span className="text-sm text-[#64748B] italic">Resolved from the office statement address.</span>
            )}
          </Row>

          {/* Statement City, State Zip */}
          <Row label="Statement City, State Zip">
            {isCustomAddress ? (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={settings.statement_city}
                  onChange={(e) => update("statement_city", e.target.value)}
                  placeholder="City"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={settings.statement_state}
                  onChange={(e) => update("statement_state", e.target.value)}
                  placeholder="State"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={settings.statement_zip}
                  onChange={(e) => update("statement_zip", e.target.value)}
                  placeholder="ZIP"
                  className={inputCls}
                />
              </div>
            ) : (
              <span className="text-sm text-[#64748B] italic">Resolved from the office statement address.</span>
            )}
          </Row>

          {/* Statement Phone */}
          <Row
            label="Statement Phone"
            hint="The phone number printed on patient statements."
          >
            {isCustomAddress ? (
              <input
                type="tel"
                value={settings.statement_phone}
                onChange={(e) => update("statement_phone", e.target.value)}
                placeholder="(555) 123-4567"
                className={inputCls}
              />
            ) : (
              <span className="text-sm text-[#64748B] italic">Resolved from the office statement phone.</span>
            )}
          </Row>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${!dirty || saving ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Save className="w-4 h-4" />
          Save Statement Settings
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-2 md:gap-4 px-4 py-3 items-start">
      <div className="flex items-center gap-1.5 text-sm font-bold text-[#1E293B]">
        {label}
        {hint && <AlertCircle className="w-3.5 h-3.5 text-[#94A3B8]" aria-label={hint} />}
      </div>
      <div>{children}</div>
    </div>
  );
}
