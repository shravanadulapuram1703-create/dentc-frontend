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

/**
 * Office → Advanced tab. A per-office replica of the production Advanced settings
 * screen (General Settings / Default Settings / Patient Check-In / Automated
 * Campaigns), reconciled to the REAL backend model
 * (`OfficeAdvancedSettingsRead` / `OfficeAdvancedSettingsUpdate`). Fields that the
 * API does not expose have been removed.
 */

/**
 * Stable UI enum option set for Place of Service. Presentation-only dropdown values
 * (CMS place-of-service codes), NOT business data fetched from the backend.
 */
const PLACE_OF_SERVICE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'office', label: 'Office' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'nursing_home', label: 'Nursing Home' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
];

/**
 * camelCase UI form model (decoupled from the snake_case API shape). All values are
 * string-backed; numeric/decimal fields are serialized back to the API on save.
 */
type AdvancedFormState = {
  // General settings
  financeChargePct: string;
  minBalance: string;
  minCharge: string;
  daysBeforeCharge: string;
  salesTaxPct: string;
  sendEcard: boolean;

  // Default settings
  defaultApptDuration: string;
  schedulerEndDate: string;
  schedulerEndDateNotApplicable: boolean;
  placeOfService: string;
  areaCode: string;
  defaultCity: string;
  defaultState: string;
  defaultZip: string;
  preferredProviderId: string;
  isOrtho: boolean;

  // Patient check-in
  hipaaNotice: string;
  consentForms: string;

  // Automated campaigns
  effectiveDate: string;
};

const EMPTY_FORM: AdvancedFormState = {
  financeChargePct: '',
  minBalance: '',
  minCharge: '',
  daysBeforeCharge: '',
  salesTaxPct: '',
  sendEcard: false,

  defaultApptDuration: '',
  schedulerEndDate: '',
  schedulerEndDateNotApplicable: false,
  placeOfService: '',
  areaCode: '',
  defaultCity: '',
  defaultState: '',
  defaultZip: '',
  preferredProviderId: '',
  isOrtho: false,

  hipaaNotice: '',
  consentForms: '',

  effectiveDate: '',
};

function valToStr(v: string | number | null | undefined): string {
  return v == null ? '' : String(v);
}

/** API (snake_case) -> UI (camelCase string-backed form model). */
function mapApiToForm(api: OfficeAdvancedSettingsApi): AdvancedFormState {
  return {
    financeChargePct: valToStr(api.finance_charge_pct),
    minBalance: valToStr(api.min_balance),
    minCharge: valToStr(api.min_charge),
    daysBeforeCharge: valToStr(api.days_before_charge),
    salesTaxPct: valToStr(api.sales_tax_pct),
    sendEcard: Boolean(api.send_ecard),

    defaultApptDuration: valToStr(api.default_appt_duration),
    schedulerEndDate: api.scheduler_end_date ?? '',
    schedulerEndDateNotApplicable: api.scheduler_end_date == null,
    placeOfService: api.place_of_service ?? '',
    areaCode: api.area_code ?? '',
    defaultCity: api.default_city ?? '',
    defaultState: api.default_state ?? '',
    defaultZip: api.default_zip ?? '',
    preferredProviderId: api.preferred_provider_id ?? '',
    isOrtho: Boolean(api.is_ortho),

    hipaaNotice: api.hipaa_notice ?? '',
    consentForms: api.consent_forms ?? '',

    effectiveDate: api.effective_date ?? '',
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

/** UI (camelCase) -> API (snake_case) PATCH body. */
function mapFormToApi(form: AdvancedFormState): OfficeAdvancedSettingsUpdate {
  return {
    finance_charge_pct: strOrNull(form.financeChargePct),
    min_balance: strOrNull(form.minBalance),
    min_charge: strOrNull(form.minCharge),
    days_before_charge: strToInt(form.daysBeforeCharge),
    sales_tax_pct: strOrNull(form.salesTaxPct),
    send_ecard: form.sendEcard,

    default_appt_duration: strToInt(form.defaultApptDuration),
    // "Not Applicable" toggle persists as null per the backend contract.
    scheduler_end_date: form.schedulerEndDateNotApplicable
      ? null
      : strOrNull(form.schedulerEndDate),
    place_of_service: strOrNull(form.placeOfService),
    area_code: strOrNull(form.areaCode),
    default_city: strOrNull(form.defaultCity),
    default_state: strOrNull(form.defaultState),
    default_zip: strOrNull(form.defaultZip),
    preferred_provider_id: strOrNull(form.preferredProviderId),
    is_ortho: form.isOrtho,

    hipaa_notice: strOrNull(form.hipaaNotice),
    consent_forms: strOrNull(form.consentForms),

    effective_date: strOrNull(form.effectiveDate),
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
              value={form.financeChargePct}
              onChange={(e) => setField('financeChargePct', e.target.value)}
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
              value={form.minBalance}
              onChange={(e) => setField('minBalance', e.target.value)}
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
              value={form.minCharge}
              onChange={(e) => setField('minCharge', e.target.value)}
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
              value={form.daysBeforeCharge}
              onChange={(e) => setField('daysBeforeCharge', e.target.value)}
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
              value={form.salesTaxPct}
              onChange={(e) => setField('salesTaxPct', e.target.value)}
              placeholder="8.5"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.sendEcard}
                onChange={(e) => setField('sendEcard', e.target.checked)}
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
              value={form.defaultApptDuration}
              onChange={(e) => setField('defaultApptDuration', e.target.value)}
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
              disabled={disabled || form.schedulerEndDateNotApplicable}
              value={form.schedulerEndDate}
              onChange={(e) => setField('schedulerEndDate', e.target.value)}
              className={inputClass}
            />
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.schedulerEndDateNotApplicable}
                onChange={(e) =>
                  setField('schedulerEndDateNotApplicable', e.target.checked)
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
              value={form.placeOfService}
              onChange={(e) => setField('placeOfService', e.target.value)}
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
              value={form.areaCode}
              onChange={(e) => setField('areaCode', e.target.value)}
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
                value={form.defaultCity}
                onChange={(e) => setField('defaultCity', e.target.value)}
                placeholder="City"
                className={inputClass}
              />
              <input
                type="text"
                disabled={disabled}
                value={form.defaultState}
                onChange={(e) => setField('defaultState', e.target.value)}
                placeholder="ST"
                maxLength={2}
                className={`${inputClass} uppercase`}
              />
              <input
                type="text"
                disabled={disabled}
                value={form.defaultZip}
                onChange={(e) => setField('defaultZip', e.target.value)}
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
            <input
              type="text"
              disabled={disabled}
              value={form.preferredProviderId}
              onChange={(e) => setField('preferredProviderId', e.target.value)}
              placeholder="Provider ID"
              className={inputClass}
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.isOrtho}
                onChange={(e) => setField('isOrtho', e.target.checked)}
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
              value={form.hipaaNotice}
              onChange={(e) => setField('hipaaNotice', e.target.value)}
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
              value={form.consentForms}
              onChange={(e) => setField('consentForms', e.target.value)}
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
              value={form.effectiveDate}
              onChange={(e) => setField('effectiveDate', e.target.value)}
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
