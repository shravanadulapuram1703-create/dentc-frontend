import { Calendar, Eye, EyeOff } from 'lucide-react';
import { PatientFormData } from './types';
import { TITLES, PRONOUNS, SEX_OPTIONS, MARITAL_STATUS_OPTIONS } from './constants';

interface PatientIdentitySectionProps {
  formData: PatientFormData;
  onFieldChange: (field: keyof PatientFormData, value: any) => void;
  showSSN: boolean;
  onToggleSSN: () => void;
}

export default function PatientIdentitySection({
  formData,
  onFieldChange,
  showSSN,
  onToggleSSN,
}: PatientIdentitySectionProps) {
  return (
    <div className="space-y-4">
      {/* Patient ID and Resp Party ID */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm">
            Patient ID
          </label>
          <input
            type="text"
            value={formData.patientId}
            readOnly
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
            aria-readonly="true"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm">
            Resp Party ID
          </label>
          <input
            type="text"
            value={formData.respPartyId}
            readOnly
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
            aria-readonly="true"
          />
        </div>
      </div>

      {/* Title, Preferred Name, Pronouns */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="title">
            Title
          </label>
          <select
            id="title"
            value={formData.title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          >
            {TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="preferred-name">
            Preferred Name
          </label>
          <input
            id="preferred-name"
            type="text"
            value={formData.preferredName}
            onChange={(e) => onFieldChange('preferredName', e.target.value)}
            placeholder="Nick"
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="pronouns">
            Pronouns
          </label>
          <select
            id="pronouns"
            value={formData.pronouns}
            onChange={(e) => onFieldChange('pronouns', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          >
            {PRONOUNS.map((pronoun) => (
              <option key={pronoun} value={pronoun}>
                {pronoun}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* First Name, Last Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="last-name">
            Last Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="last-name"
            type="text"
            value={formData.lastName}
            onChange={(e) => onFieldChange('lastName', e.target.value)}
            required
            aria-required="true"
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="first-name">
            First Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="first-name"
            type="text"
            value={formData.firstName}
            onChange={(e) => onFieldChange('firstName', e.target.value)}
            required
            aria-required="true"
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* DOB, Age, Sex */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="dob">
            Birth Date <span className="text-[#EF4444]">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="dob"
              type="text"
              value={formData.dob}
              onChange={(e) => onFieldChange('dob', e.target.value)}
              placeholder="MM/DD/YYYY"
              required
              aria-required="true"
              className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
            />
            <button
              className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors"
              aria-label="Open calendar"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm">Age</label>
          <input
            type="text"
            value="32"
            readOnly
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
            aria-readonly="true"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="sex">
            Sex <span className="text-[#EF4444]">*</span>
          </label>
          <select
            id="sex"
            value={formData.sex}
            onChange={(e) => onFieldChange('sex', e.target.value)}
            required
            aria-required="true"
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          >
            {SEX_OPTIONS.map((sex) => (
              <option key={sex} value={sex}>
                {sex}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Marital Status, Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="marital-status">
            Marital Status
          </label>
          <select
            id="marital-status"
            value={formData.maritalStatus}
            onChange={(e) => onFieldChange('maritalStatus', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          >
            {MARITAL_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* SSN, Chart #, Drivers License, Medi ID */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="ssn">
            SSN
          </label>
          <div className="flex gap-2">
            <input
              id="ssn"
              type={showSSN ? 'text' : 'password'}
              value={formData.ssn}
              onChange={(e) => onFieldChange('ssn', e.target.value)}
              className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
              autoComplete="off"
            />
            <button
              onClick={onToggleSSN}
              className="px-2 py-1.5 bg-[#E2E8F0] hover:bg-[#CBD5E1] rounded transition-colors"
              aria-label={showSSN ? 'Hide SSN' : 'Show SSN'}
            >
              {showSSN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="chart-num">
            Chart #
          </label>
          <input
            id="chart-num"
            type="text"
            value={formData.chartNum}
            onChange={(e) => onFieldChange('chartNum', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="driver-license">
            Driver's License
          </label>
          <input
            id="driver-license"
            type="text"
            value={formData.driverLicense}
            onChange={(e) => onFieldChange('driverLicense', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-[#1E293B] font-medium mb-1 text-sm" htmlFor="medi-id">
            Medi ID
          </label>
          <input
            id="medi-id"
            type="text"
            value={formData.mediId}
            onChange={(e) => onFieldChange('mediId', e.target.value)}
            className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  );
}
