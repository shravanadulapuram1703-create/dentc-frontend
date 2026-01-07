import { PatientFormData } from './types';
import {
  ETHNICITY_OPTIONS,
  REFERRAL_TYPE_OPTIONS,
  LANGUAGES,
  WEIGHT_UNITS,
  CONTACT_METHOD_OPTIONS,
} from './constants';

interface PatientStatusSectionProps {
  formData: PatientFormData;
  onFieldChange: (field: keyof PatientFormData, value: any) => void;
}

export default function PatientStatusSection({
  formData,
  onFieldChange,
}: PatientStatusSectionProps) {
  return (
    <div className="border-t-2 border-[#E2E8F0] pt-3">
      <h3 className="text-[#1F3A5F] font-bold mb-3 text-sm uppercase tracking-wide">
        PATIENT STATUS
      </h3>

      <div className="space-y-3">
        {/* Ethnicity & Referral Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="ethnicity">
              Ethnicity
            </label>
            <select
              id="ethnicity"
              value={formData.ethnicity}
              onChange={(e) => onFieldChange('ethnicity', e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            >
              {ETHNICITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="referral-type">
              Referral Type <span className="text-[#EF4444]">*</span>
            </label>
            <select
              id="referral-type"
              value={formData.referralType}
              onChange={(e) => onFieldChange('referralType', e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            >
              {REFERRAL_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Referred By & Language */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="referred-by">
              Referred By
            </label>
            <input
              id="referred-by"
              type="text"
              value={formData.referredBy}
              onChange={(e) => onFieldChange('referredBy', e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="preferred-language">
              Preferred Language
            </label>
            <select
              id="preferred-language"
              value={formData.preferredLanguage}
              onChange={(e) => onFieldChange('preferredLanguage', e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="height-ft">
              Height (ft)
            </label>
            <input
              id="height-ft"
              type="text"
              value={formData.heightFt}
              onChange={(e) => onFieldChange('heightFt', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="height-in">
              Height (in)
            </label>
            <input
              id="height-in"
              type="text"
              value={formData.heightIn}
              onChange={(e) => onFieldChange('heightIn', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="weight">
              Weight
            </label>
            <input
              id="weight"
              type="text"
              value={formData.weight}
              onChange={(e) => onFieldChange('weight', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="weight-unit">
              Unit
            </label>
            <select
              id="weight-unit"
              value={formData.weightUnit}
              onChange={(e) => onFieldChange('weightUnit', e.target.value)}
              className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            >
              {WEIGHT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preferred Contact Method */}
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="contact-method">
            Preferred Contact Method
          </label>
          <select
            id="contact-method"
            value={formData.preferredContactMethod}
            onChange={(e) => onFieldChange('preferredContactMethod', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          >
            {CONTACT_METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        {/* Communication Preferences */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.noAutoSMS}
              onChange={(e) => onFieldChange('noAutoSMS', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
            />
            <span className="text-[#1E293B] text-sm">No Auto SMS</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.noAutoEmail}
              onChange={(e) => onFieldChange('noAutoEmail', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
            />
            <span className="text-[#1E293B] text-sm">No Auto Email</span>
          </label>
        </div>
      </div>
    </div>
  );
}
