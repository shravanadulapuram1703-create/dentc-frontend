import { PatientFormData } from './types';
import { US_STATES } from './constants';

interface AddressSectionProps {
  formData: PatientFormData;
  onFieldChange: (field: keyof PatientFormData, value: any) => void;
}

export default function AddressSection({
  formData,
  onFieldChange,
}: AddressSectionProps) {
  return (
    <div className="space-y-4">
      {/* Address */}
      <div>
        <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="address1">
          Address <span className="text-[#EF4444]">*</span>
        </label>
        <input
          id="address1"
          type="text"
          value={formData.address1}
          onChange={(e) => onFieldChange('address1', e.target.value)}
          required
          aria-required="true"
          className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent mb-2 text-sm"
        />
        <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="address2">
          Address 2
        </label>
        <input
          id="address2"
          type="text"
          value={formData.address2}
          onChange={(e) => onFieldChange('address2', e.target.value)}
          className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
        />
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="city">
            City <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => onFieldChange('city', e.target.value)}
            required
            aria-required="true"
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="state">
            State <span className="text-[#EF4444]">*</span>
          </label>
          <select
            id="state"
            value={formData.state}
            onChange={(e) => onFieldChange('state', e.target.value)}
            required
            aria-required="true"
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          >
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="zip">
            Zip <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="zip"
            type="text"
            value={formData.zip}
            onChange={(e) => onFieldChange('zip', e.target.value)}
            required
            aria-required="true"
            maxLength={10}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Phone Numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="home-phone">
            Home Phone
          </label>
          <input
            id="home-phone"
            type="tel"
            value={formData.homePhone}
            onChange={(e) => onFieldChange('homePhone', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="cell-phone">
            Cell Phone
          </label>
          <input
            id="cell-phone"
            type="tel"
            value={formData.cellPhone}
            onChange={(e) => onFieldChange('cellPhone', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="work-phone">
            Work Phone
          </label>
          <input
            id="work-phone"
            type="tel"
            value={formData.workPhone}
            onChange={(e) => onFieldChange('workPhone', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  );
}
