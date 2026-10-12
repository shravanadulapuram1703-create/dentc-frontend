import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings,
  DollarSign,
  FileCheck,
  Calendar,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { components } from '../../../../styles/theme';
import {
  fetchOfficeAdvancedSettings,
  updateOfficeAdvancedSettings,
  type OfficeAdvancedSettingsApi,
  type OfficeAdvancedSettingsUpdate,
} from '../../../../services/officeAdvancedApi';
import { fetchProviders, type Provider } from '../../../../services/schedulerApi';
import { ProviderOptionGroups } from '@/features/office-scope';

/**
 * Office → Advanced tab. A per-office replica of the production Advanced settings
 * screen (General Settings / Default Settings / Patient Check-In / Automated
 * Campaigns), reconciled to the REAL backend model
 * (`OfficeAdvancedSettingsRead` / `OfficeAdvancedSettingsUpdate`). Fields that the
 * API does not expose have been removed.
 */

/**
 * Place of Service — stored as the 2-digit CMS place-of-service code, the same
 * value ADA claim Item 38 (place of treatment) prints and validates.
 */
const PLACE_OF_SERVICE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '11', label: '11 — Office' },
  { value: '22', label: '22 — On-campus outpatient hospital' },
  { value: '21', label: '21 — Inpatient hospital' },
  { value: '31', label: '31 — Skilled nursing facility' },
  { value: '32', label: '32 — Nursing facility' },
  { value: '03', label: '03 — School' },
  { value: '99', label: '99 — Other place of service' },
];

/** Earlier builds stored word values; read them back as their CMS code. */
const LEGACY_PLACE_OF_SERVICE: Record<string, string> = {
  office: '11',
  hospital: '22',
  nursing_home: '32',
  school: '03',
  other: '99',
};

/**
 * Form model keyed by the API's snake_case field names. All values are
 * string-backed; numeric/decimal fields are serialized back to the API on save.
 * `scheduler_end_date_not_applicable` is UI-only (persists as a null date).
 */
type AdvancedFormState = {
  // General settings
  finance_charge_pct: string;
  min_balance: string;
  min_charge: string;
  days_before_charge: string;
  sales_tax_pct: string;
  send_ecard: boolean;

  // Default settings
  default_appt_duration: string;
  scheduler_end_date: string;
  scheduler_end_date_not_applicable: boolean;
  place_of_service: string;
  area_code: string;
  default_city: string;
  default_state: string;
  default_zip: string;
  preferred_provider_id: string;
  is_ortho: boolean;

  // Patient check-in
  hipaa_notice: string;
  consent_forms: string;

  // Automated campaigns
  effective_date: string;
};

const EMPTY_FORM: AdvancedFormState = {
  finance_charge_pct: '',
  min_balance: '',
  min_charge: '',
  days_before_charge: '',
  sales_tax_pct: '',
  send_ecard: false,

  default_appt_duration: '',
  scheduler_end_date: '',
  scheduler_end_date_not_applicable: false,
  place_of_service: '',
  area_code: '',
  default_city: '',
  default_state: '',
  default_zip: '',
  preferred_provider_id: '',
  is_ortho: false,

  hipaa_notice: '',
  consent_forms: '',

  effective_date: '',
};

function valToStr(v: string | number | null | undefined): string {
  return v == null ? '' : String(v);
}

/** API read model -> string-backed form model. */
function mapApiToForm(api: OfficeAdvancedSettingsApi): AdvancedFormState {
  return {
    finance_charge_pct: valToStr(api.finance_charge_pct),
    min_balance: valToStr(api.min_balance),
    min_charge: valToStr(api.min_charge),
    days_before_charge: valToStr(api.days_before_charge),
    sales_tax_pct: valToStr(api.sales_tax_pct),
    send_ecard: Boolean(api.send_ecard),

    default_appt_duration: valToStr(api.default_appt_duration),
    scheduler_end_date: api.scheduler_end_date ?? '',
    scheduler_end_date_not_applicable: api.scheduler_end_date == null,
    place_of_service: LEGACY_PLACE_OF_SERVICE[api.place_of_service ?? ''] ?? api.place_of_service ?? '',
    area_code: api.area_code ?? '',
    default_city: api.default_city ?? '',
    default_state: api.default_state ?? '',
    default_zip: api.default_zip ?? '',
    preferred_provider_id: api.preferred_provider_id ?? '',
    is_ortho: Boolean(api.is_ortho),

    hipaa_notice: api.hipaa_notice ?? '',
    consent_forms: api.consent_forms ?? '',

    effective_date: api.effective_date ?? '',
  };
}

/** Decimal/string-typed financial field: keep as a string, empty -> null. */
function strOrNull(v: string): string | null {
  return v.trim() === '' ? null : v.trim();
}

/** Integer-typed field (days_before_charge, default_appt_duration). */
function strToInt(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Form model -> API PATCH body. */
function mapFormToApi(form: AdvancedFormState): OfficeAdvancedSettingsUpdate {
  return {
    finance_charge_pct: strOrNull(form.finance_charge_pct),
    min_balance: strOrNull(form.min_balance),
    min_charge: strOrNull(form.min_charge),
    days_before_charge: strToInt(form.days_before_charge),
    sales_tax_pct: strOrNull(form.sales_tax_pct),
    send_ecard: form.send_ecard,

    default_appt_duration: strToInt(form.default_appt_duration),
    // "Not Applicable" toggle persists as null per the backend contract.
    scheduler_end_date: form.scheduler_end_date_not_applicable
      ? null
      : strOrNull(form.scheduler_end_date),
    place_of_service: strOrNull(form.place_of_service),
    area_code: strOrNull(form.area_code),
    default_city: strOrNull(form.default_city),
    default_state: strOrNull(form.default_state),
    default_zip: strOrNull(form.default_zip),
    preferred_provider_id: strOrNull(form.preferred_provider_id),
    is_ortho: form.is_ortho,

    hipaa_notice: strOrNull(form.hipaa_notice),
    consent_forms: strOrNull(form.consent_forms),

    effective_date: strOrNull(form.effective_date),
  };
}

const inputClass =
  'w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400';

type AdvancedTabProps = {
  officeId: number;
};

export default function AdvancedTab({ officeId }: AdvancedTabProps) {
  const [form, setForm] = useState<AdvancedFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<AdvancedFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProviders(officeId)
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        // Picker falls back to keeping the stored id selectable (keep_id).
      });
    return () => {
      cancelled = true;
    };
  }, [officeId]);

  const setField = useCallback(
    <K extends keyof AdvancedFormState>(field: K, value: AdvancedFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const api = await fetchOfficeAdvancedSettings(officeId);
      const mapped = mapApiToForm(api);
      setForm(mapped);
      setInitialForm(mapped);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as Error).message)
          : 'Failed to load advanced settings';
      toast.error('Could not load advanced settings', { description: msg });
      setLoadError(true);
      setForm(EMPTY_FORM);
      setInitialForm(EMPTY_FORM);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateOfficeAdvancedSettings(officeId, mapFormToApi(form));
      const mapped = mapApiToForm(updated);
      setForm(mapped);
      setInitialForm(mapped);
      toast.success('Advanced settings saved');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as Error).message)
          : 'Request failed';
      toast.error('Save failed', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading advanced settings…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#64748B]">
        <span className="text-sm font-bold">Could not load advanced settings.</span>
        <button onClick={() => void reload()} className={components.buttonOutline}>
          Retry
        </button>
      </div>
    );
  }

  const disabled = saving;

  return (
    <div className="space-y-6 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      {/* General Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <DollarSign className="w-5 h-5 text-blue-600" />
          General Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Annual Fin. Charge %
            </label>
            <input
              type="number"
              step="0.1"
              disabled={disabled}
              value={form.finance_charge_pct}
              onChange={(e) => setField('finance_charge_pct', e.target.value)}
              placeholder="18.0"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Minimum Balance ($)
            </label>
            <input
              type="number"
              step="0.01"
              disabled={disabled}
              value={form.min_balance}
              onChange={(e) => setField('min_balance', e.target.value)}
              placeholder="50.00"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Minimum Fin. Charge ($)
            </label>
            <input
              type="number"
              step="0.01"
              disabled={disabled}
              value={form.min_charge}
              onChange={(e) => setField('min_charge', e.target.value)}
              placeholder="2.00"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              # of Days Before Applying Fin. Charge
            </label>
            <input
              type="number"
              disabled={disabled}
              value={form.days_before_charge}
              onChange={(e) => setField('days_before_charge', e.target.value)}
              placeholder="30"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Sales Tax %
            </label>
            <input
              type="number"
              step="0.1"
              disabled={disabled}
              value={form.sales_tax_pct}
              onChange={(e) => setField('sales_tax_pct', e.target.value)}
              placeholder="8.5"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.send_ecard}
                onChange={(e) => setField('send_ecard', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">Send Ecard</span>
            </label>
          </div>
        </div>
      </div>

      {/* Default Settings */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Settings className="w-5 h-5 text-blue-600" />
          Default Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Pat. Request Appt. Duration (mins)
            </label>
            <input
              type="number"
              disabled={disabled}
              value={form.default_appt_duration}
              onChange={(e) => setField('default_appt_duration', e.target.value)}
              placeholder="60"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Scheduler End Date
            </label>
            <input
              type="date"
              disabled={disabled || form.scheduler_end_date_not_applicable}
              value={form.scheduler_end_date}
              onChange={(e) => setField('scheduler_end_date', e.target.value)}
              className={inputClass}
            />
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.scheduler_end_date_not_applicable}
                onChange={(e) =>
                  setField('scheduler_end_date_not_applicable', e.target.checked)
                }
                className="w-4 h-4 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Not Applicable
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Place Of Service
            </label>
            <select
              disabled={disabled}
              value={form.place_of_service}
              onChange={(e) => setField('place_of_service', e.target.value)}
              className={inputClass}
            >
              <option value="">Select Place of Service</option>
              {PLACE_OF_SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Area Code
            </label>
            <input
              type="text"
              disabled={disabled}
              value={form.area_code}
              onChange={(e) => setField('area_code', e.target.value)}
              placeholder="415"
              maxLength={3}
              className={inputClass}
            />
          </div>

          {/* Default City, State Zip — grouped per the screenshot. */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default City, State Zip
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                disabled={disabled}
                value={form.default_city}
                onChange={(e) => setField('default_city', e.target.value)}
                placeholder="City"
                className={inputClass}
              />
              <input
                type="text"
                disabled={disabled}
                value={form.default_state}
                onChange={(e) => setField('default_state', e.target.value)}
                placeholder="ST"
                maxLength={2}
                className={`${inputClass} uppercase`}
              />
              <input
                type="text"
                disabled={disabled}
                value={form.default_zip}
                onChange={(e) => setField('default_zip', e.target.value)}
                placeholder="ZIP"
                maxLength={10}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Preferred Provider
            </label>
            {/* This office's roster first, everyone else below (prefer, never exclude). */}
            <select
              disabled={disabled}
              value={form.preferred_provider_id}
              onChange={(e) => setField('preferred_provider_id', e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              <ProviderOptionGroups providers={providers} keep_id={form.preferred_provider_id || null} />
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.is_ortho}
                onChange={(e) => setField('is_ortho', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                Is Ortho Office
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Patient Check-In */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <FileCheck className="w-5 h-5 text-blue-600" />
          Patient Check-In
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              HIPAA Notice
            </label>
            <input
              type="text"
              disabled={disabled}
              value={form.hipaa_notice}
              onChange={(e) => setField('hipaa_notice', e.target.value)}
              placeholder="HIPAA notice"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Consent Forms
            </label>
            <input
              type="text"
              disabled={disabled}
              value={form.consent_forms}
              onChange={(e) => setField('consent_forms', e.target.value)}
              placeholder="Consent forms"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Automated Campaigns */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Calendar className="w-5 h-5 text-blue-600" />
          Automated Campaigns
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Effective Date
            </label>
            <input
              type="date"
              disabled={disabled}
              value={form.effective_date}
              onChange={(e) => setField('effective_date', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t-2 border-slate-200">
        <button
          onClick={() => void handleSave()}
          disabled={disabled || !isDirty}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${
            disabled || !isDirty ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Advanced Settings
        </button>
      </div>
    </div>
  );
}
