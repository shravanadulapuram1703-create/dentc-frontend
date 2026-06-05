import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  AlertCircle,
  Loader2,
  Save,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  HeartPulse,
  FileText,
  ClipboardList,
  BookOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../../styles/theme";
import {
  fetchOfficeSmartAssist,
  saveOfficeSmartAssist,
} from "../../../../services/officeSmartAssistApi";
import type {
  SmartAssistRead,
  OfficeSmartAssistItemRead,
  SmartAssistItemInput,
} from "@/api/generated/model";

/**
 * Office → SmartAssist tab. A per-office configuration screen replicating the
 * production SmartAssist Setup table (Item | Description | Frequency | SMS Template).
 *
 * The data is fully server-driven: rows are rendered from the `items` array the
 * backend returns and are keyed by `item_code`. We never hardcode the catalog as
 * data — the static maps below provide only display metadata (label/icon).
 */

/** Item code the backend uses for the Payment automation (carries unpaid-balance). */
const PAYMENT_ITEM_CODE = "payment";

/**
 * Display-only label/icon map keyed by `item_code`. This is presentation
 * metadata, NOT business data — if the server returns an `item_code` not present
 * here we fall back to a humanized version of the code (see {@link humanizeItemCode}).
 * Backend should confirm these canonical `item_code` values.
 */
const ITEM_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  payment: { label: "Payment", icon: CreditCard },
  email: { label: "Email", icon: Mail },
  cell_phone: { label: "Cell Phone", icon: Phone },
  eligibility: { label: "Eligibility", icon: ShieldCheck },
  medical_history: { label: "Medical History", icon: HeartPulse },
  hipaa: { label: "HIPAA", icon: ShieldCheck },
  consent_form_1: { label: "Consent Form 1", icon: FileText },
  consent_form_2: { label: "Consent Form 2", icon: FileText },
  consent_form_3: { label: "Consent Form 3", icon: FileText },
  consent_form_4: { label: "Consent Form 4", icon: FileText },
  progress_note: { label: "Progress Note", icon: ClipboardList },
  ledger_posting: { label: "Ledger Posting", icon: BookOpen },
};

/** Humanize an unknown item_code, e.g. "consent_form_5" → "Consent Form 5". */
function humanizeItemCode(code: string): string {
  return code
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function labelFor(code: string): { label: string; icon: LucideIcon } {
  return ITEM_LABELS[code] ?? { label: humanizeItemCode(code), icon: Sparkles };
}

/**
 * Frequency options — UI presentation only. `frequency` is a free string on the
 * wire; we surface a small select of stable options here for a consistent UX.
 * Any server value outside this list is preserved as an extra option.
 */
const FREQUENCY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "EVERY_VISIT", label: "Every Visit" },
  { value: "EVERY_YEAR", label: "Every Year" },
];

/**
 * SMS template options — UI placeholder only. `sms_template_id` is a free string
 * on the wire and NO SMS-template lookup endpoint exists yet, so these are
 * placeholder ids. Replace with a real templates lookup once the backend exposes one.
 */
const SMS_TEMPLATE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "1", label: "Standard Medical History" },
  { value: "2", label: "HIPAA Consent 2024" },
  { value: "3", label: "Treatment Consent" },
  { value: "4", label: "Payment Agreement" },
];

/** Editable per-row UI state derived from a server item, keyed by item_code. */
type SmartAssistRow = {
  itemCode: string;
  description: string | null;
  frequency: string | null;
  smsTemplateId: string | null;
  includeUnpaidBalance: boolean;
  isEnabled: boolean;
};

type SmartAssistUi = {
  enabled: boolean;
  rows: SmartAssistRow[];
};

/** Map a server item into editable row state. */
function itemToRow(item: OfficeSmartAssistItemRead): SmartAssistRow {
  return {
    itemCode: item.item_code,
    description: item.description ?? null,
    frequency: item.frequency ?? null,
    smsTemplateId: item.sms_template_id ?? null,
    includeUnpaidBalance: Boolean(item.include_unpaid_balance),
    isEnabled: Boolean(item.is_enabled),
  };
}

/** Map the read shape into UI state (rows rendered exactly as the server returns). */
function mapReadToUi(read: SmartAssistRead): SmartAssistUi {
  return {
    enabled: Boolean(read.enabled),
    rows: (read.items ?? []).map(itemToRow),
  };
}

/** Map a UI row into the PATCH item input. */
function rowToInput(row: SmartAssistRow): SmartAssistItemInput {
  return {
    item_code: row.itemCode,
    description: row.description,
    frequency: row.frequency,
    sms_template_id: row.smsTemplateId,
    include_unpaid_balance: row.includeUnpaidBalance,
    is_enabled: row.isEnabled,
  };
}

type SmartAssistTabProps = {
  officeId: number;
};

export default function SmartAssistTab({ officeId }: SmartAssistTabProps) {
  const [state, setState] = useState<SmartAssistUi>(() => ({
    enabled: false,
    rows: [],
  }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const read = await fetchOfficeSmartAssist(officeId);
      setState(mapReadToUi(read));
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load SmartAssist settings";
      setLoadError(msg);
      toast.error("Could not load SmartAssist settings", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleMaster = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled }));
  }, []);

  const updateRow = useCallback(
    <K extends keyof SmartAssistRow>(
      itemCode: string,
      field: K,
      value: SmartAssistRow[K]
    ) => {
      setState((prev) => ({
        ...prev,
        rows: prev.rows.map((row) =>
          row.itemCode === itemCode ? { ...row, [field]: value } : row
        ),
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await saveOfficeSmartAssist(officeId, {
        enabled: state.enabled,
        items: state.rows.map(rowToInput),
      });
      setState(mapReadToUi(updated));
      toast.success("SmartAssist settings saved");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Request failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  }, [officeId, state]);

  const enabledCount = state.rows.filter((row) => row.isEnabled).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading SmartAssist settings…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="w-8 h-8 text-[#DC2626]" />
        <span className="text-sm font-bold text-[#1E293B]">
          Could not load SmartAssist settings
        </span>
        <span className="text-xs text-[#64748B]">{loadError}</span>
        <button onClick={() => void reload()} className={components.buttonOutline}>
          Retry
        </button>
      </div>
    );
  }

  const masterOff = !state.enabled;

  return (
    <div className="space-y-6 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      {/* SmartAssist Info */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-bold">SmartAssist Automation:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Automates pre-visit, visit, and post-visit workflows</li>
            <li>Runs automatically based on configuration</li>
            <li>Applies to Scheduler &amp; Patient workflows</li>
            <li>Respects consent &amp; communication rules</li>
          </ul>
        </div>
      </div>

      {/* Master Toggle (checkbox per screenshot) */}
      <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => toggleMaster(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
          />
          <span className="text-base font-bold text-[#1E293B]">Enable SmartAssist</span>
        </label>
      </div>

      {masterOff && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">SmartAssist is currently disabled</p>
            <p>Enable SmartAssist above to configure automation items.</p>
          </div>
        </div>
      )}

      {/* SmartAssist Items Table */}
      <div
        className={`bg-white rounded-lg border-2 border-[#E2E8F0] overflow-hidden ${
          masterOff ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 w-10" />
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">
                  SmartAssist Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">
                  SmartAssist Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">
                  SmartAssist Frequency
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#1E293B]">
                  SMS Template
                </th>
              </tr>
            </thead>
            <tbody>
              {state.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-[#94A3B8]"
                  >
                    No SmartAssist items configured for this office.
                  </td>
                </tr>
              )}
              {state.rows.map((row, index) => {
                const { label, icon: Icon } = labelFor(row.itemCode);
                const rowDisabled = !row.isEnabled;
                const isPayment = row.itemCode === PAYMENT_ITEM_CODE;
                // Preserve a server frequency value not in our presentation list.
                const showExtraFrequency =
                  row.frequency != null &&
                  !FREQUENCY_OPTIONS.some((o) => o.value === row.frequency);
                // Preserve a server template id not in our placeholder list.
                const showExtraTemplate =
                  row.smsTemplateId != null &&
                  !SMS_TEMPLATE_OPTIONS.some((o) => o.value === row.smsTemplateId);
                return (
                  <tr
                    key={row.itemCode}
                    className={`border-b border-[#E2E8F0] transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"
                    }`}
                  >
                    {/* Enable checkbox (bound to is_enabled) */}
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={row.isEnabled}
                        onChange={(e) =>
                          updateRow(row.itemCode, "isEnabled", e.target.checked)
                        }
                        className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                      />
                    </td>

                    {/* Item (icon + label from the static label map) */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#3A6EA5] flex-shrink-0" />
                        <span className="text-sm font-bold text-[#1E293B]">
                          {label}
                        </span>
                      </div>
                    </td>

                    {/* Description (Payment row carries the unpaid-balance checkbox) */}
                    <td className="px-4 py-3 align-top">
                      {row.description && (
                        <p className="text-sm text-[#64748B]">{row.description}</p>
                      )}
                      {isPayment && (
                        <label className="mt-2 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.includeUnpaidBalance}
                            disabled={rowDisabled}
                            onChange={(e) =>
                              updateRow(
                                row.itemCode,
                                "includeUnpaidBalance",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:opacity-50"
                          />
                          <span className="text-xs font-bold text-[#1E293B]">
                            Include selected Appointment&apos;s unpaid balance
                          </span>
                        </label>
                      )}
                    </td>

                    {/* Frequency (free string; presented as a small select) */}
                    <td className="px-4 py-3 align-top">
                      <select
                        value={row.frequency ?? ""}
                        disabled={rowDisabled}
                        onChange={(e) =>
                          updateRow(
                            row.itemCode,
                            "frequency",
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm disabled:opacity-50 disabled:bg-[#F7F9FC]"
                      >
                        <option value="">—</option>
                        {FREQUENCY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                        {showExtraFrequency && row.frequency != null && (
                          <option value={row.frequency}>{row.frequency}</option>
                        )}
                      </select>
                    </td>

                    {/* SMS Template (free string; placeholder select — no lookup yet) */}
                    <td className="px-4 py-3 align-top">
                      <select
                        value={row.smsTemplateId ?? ""}
                        disabled={rowDisabled}
                        onChange={(e) =>
                          updateRow(
                            row.itemCode,
                            "smsTemplateId",
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg text-sm disabled:opacity-50 disabled:bg-[#F7F9FC]"
                      >
                        <option value="">Select Template</option>
                        {SMS_TEMPLATE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                        {showExtraTemplate && row.smsTemplateId != null && (
                          <option value={row.smsTemplateId}>
                            {row.smsTemplateId}
                          </option>
                        )}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + Save */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-[#64748B] font-bold">
          {state.enabled
            ? `${enabledCount} of ${state.rows.length} automation items enabled`
            : "SmartAssist disabled"}
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${
            saving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
