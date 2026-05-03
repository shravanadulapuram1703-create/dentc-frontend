import { useState } from 'react';
import { Save, X, Edit, Upload, Building2, Mail, Phone, Globe, Calendar, User, Activity, Settings, AlertCircle, Network, CreditCard, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { components } from '../../../styles/theme';
import { HolidaysTabContent } from './HolidaysTabContent';
import { CommunicationsTabContent } from './CommunicationsTabContent';
import { OnlineRegistrationTabContent } from './OnlineRegistrationTabContent';

// ========================================
// TYPES
// ========================================

interface AccountData {
  id: string;
  accountNumber: string;
  accountName: string;
  accountShortId: string;
  contactFirstName: string;
  contactLastName: string;
  corporateAddress: string;
  corporateCity: string;
  corporateState: string;
  corporateZip: string;
  statementAddress: string;
  statementCity: string;
  statementState: string;
  statementZip: string;
  email: string;
  phone: string;
  phone2: string;
  cultureCode: string;
  logoUrl: string;
  custom1: string;
  custom2: string;
  pgid: string;
  oid: string;
  updatedAt: string;
  updatedBy: string;
}

type TabName = 'basic' | 'advanced' | 'holidays' | 'communications' | 'online-registration';

// ========================================
// MOCK DATA
// ========================================

const mockAccountData: AccountData = {
  id: 'acc-001',
  accountNumber: '100123',
  accountName: 'Smile Bright Dental Group',
  accountShortId: 'smilebright',
  contactFirstName: 'Sarah',
  contactLastName: 'Johnson',
  corporateAddress: '1234 Main Street, Suite 100',
  corporateCity: 'San Francisco',
  corporateState: 'CA',
  corporateZip: '94102',
  statementAddress: '1234 Main Street, Suite 100',
  statementCity: 'San Francisco',
  statementState: 'CA',
  statementZip: '94102',
  email: 'billing@smilebright.com',
  phone: '(415) 555-1234',
  phone2: '(415) 555-5678',
  cultureCode: 'en-US',
  logoUrl: '',
  custom1: '',
  custom2: '',
  pgid: 'PG-5001',
  oid: 'OFF-101',
  updatedAt: '2024-02-28 10:45:00',
  updatedBy: 'admin@smilebright.com',
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const CULTURE_OPTIONS = [
  { code: 'en-US', label: 'English - United States' },
  { code: 'en-GB', label: 'English - United Kingdom' },
  { code: 'es-US', label: 'Spanish - United States' },
  { code: 'fr-CA', label: 'French - Canada' },
  { code: 'zh-CN', label: 'Chinese - Simplified' },
];

// ========================================
// BASIC TAB COMPONENT
// ========================================

function BasicTab({ 
  formData, 
  updateFormData, 
  isEditMode 
}: { 
  formData: AccountData; 
  updateFormData: (updates: Partial<AccountData>) => void;
  isEditMode: boolean;
}) {
  const [logoPreview, setLogoPreview] = useState<string>(formData.logoUrl);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Logo must be less than 2MB',
      });
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Only JPG and PNG files are allowed',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      updateFormData({ logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* LEFT PANEL - Account Information */}
      <div className="space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
            <Building2 className="w-4 h-4 text-[#3A6EA5]" />
            Account Information
          </h3>

          <div className="space-y-4">
            {/* Dental Account # */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Dental Account # <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                disabled
                className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-[#F7F9FC] text-[#64748B] cursor-not-allowed text-sm"
              />
              <p className="text-xs text-[#64748B] mt-1">
                Auto-generated, read-only
              </p>
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Account Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => updateFormData({ accountName: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            {/* Account Short ID */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Account Short ID <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={formData.accountShortId}
                onChange={(e) => updateFormData({ accountShortId: e.target.value.toLowerCase() })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm lowercase ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
              <p className="text-xs text-[#64748B] mt-1">
                Used for subdomain, login prefix, file storage
              </p>
            </div>

            {/* Contact Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Contact Last Name
                </label>
                <input
                  type="text"
                  value={formData.contactLastName}
                  onChange={(e) => updateFormData({ contactLastName: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Contact First Name
                </label>
                <input
                  type="text"
                  value={formData.contactFirstName}
                  onChange={(e) => updateFormData({ contactFirstName: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
              </div>
            </div>

            {/* Corporate Address */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Corporate Address
              </label>
              <input
                type="text"
                value={formData.corporateAddress}
                onChange={(e) => updateFormData({ corporateAddress: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            {/* Corporate City, State, Zip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.corporateCity}
                  onChange={(e) => updateFormData({ corporateCity: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  State
                </label>
                <select
                  value={formData.corporateState}
                  onChange={(e) => updateFormData({ corporateState: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                >
                  <option value="">State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.corporateZip}
                onChange={(e) => updateFormData({ corporateZip: e.target.value })}
                disabled={!isEditMode}
                maxLength={10}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Email <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            {/* Phone Numbers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  Phone 2
                </label>
                <input
                  type="tel"
                  value={formData.phone2}
                  onChange={(e) => updateFormData({ phone2: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
              </div>
            </div>

            {/* Current Culture */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Current Culture
              </label>
              <select
                value={formData.cultureCode}
                onChange={(e) => updateFormData({ cultureCode: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                {CULTURE_OPTIONS.map((culture) => (
                  <option key={culture.code} value={culture.code}>
                    {culture.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#64748B] mt-1">
                Controls date format, currency, language
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Logo, Statement Address, Custom Fields */}
      <div className="space-y-6">
        {/* Corporate Logo */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
            <Building2 className="w-4 h-4 text-[#3A6EA5]" />
            Corporate Logo
          </h3>

          <div className="p-6 border-2 border-dashed border-[#CBD5E1] rounded-lg bg-[#F7F9FC]">
            {logoPreview ? (
              <div className="space-y-3">
                <img 
                  src={logoPreview} 
                  alt="Corporate Logo" 
                  className="max-w-full h-32 object-contain mx-auto"
                />
                {isEditMode && (
                  <button
                    onClick={() => {
                      setLogoPreview('');
                      updateFormData({ logoUrl: '' });
                    }}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] font-bold transition-all text-sm"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#64748B] mb-2">
                  No logo uploaded
                </p>
                {isEditMode && (
                  <label className={components.buttonPrimary + " inline-flex items-center gap-2 cursor-pointer"}>
                    <Upload className="w-4 h-4" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            Max size: 2MB • Formats: JPG, PNG
          </p>
        </div>

        {/* Statement Address */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
            <Mail className="w-4 h-4 text-[#3A6EA5]" />
            Corporate Statement Address & Phone
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Statement Address
              </label>
              <input
                type="text"
                value={formData.statementAddress}
                onChange={(e) => updateFormData({ statementAddress: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.statementCity}
                  onChange={(e) => updateFormData({ statementCity: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-2">
                  State
                </label>
                <select
                  value={formData.statementState}
                  onChange={(e) => updateFormData({ statementState: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                >
                  <option value="">State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.statementZip}
                onChange={(e) => updateFormData({ statementZip: e.target.value })}
                disabled={!isEditMode}
                maxLength={10}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
            <Globe className="w-4 h-4 text-[#3A6EA5]" />
            Custom Fields
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Custom 1
              </label>
              <input
                type="text"
                value={formData.custom1}
                onChange={(e) => updateFormData({ custom1: e.target.value })}
                disabled={!isEditMode}
                placeholder="Custom field 1"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Custom 2
              </label>
              <input
                type="text"
                value={formData.custom2}
                onChange={(e) => updateFormData({ custom2: e.target.value })}
                disabled={!isEditMode}
                placeholder="Custom field 2"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// PLACEHOLDER TABS
// ========================================

function AdvancedTab({ 
  formData, 
  updateFormData, 
  isEditMode 
}: { 
  formData: any; 
  updateFormData: (updates: any) => void;
  isEditMode: boolean;
}) {
  // Predefined color palette for ledger colors
  const colorMaster = [
    { name: 'Blue', hex: '#2563EB' },
    { name: 'Black', hex: '#000000' },
    { name: 'Aqua', hex: '#00FFFF' },
    { name: 'CadetBlue', hex: '#5F9EA0' },
    { name: 'Chartreuse', hex: '#7FFF00' },
    { name: 'Chocolate', hex: '#D2691E' },
    { name: 'Brown', hex: '#A52A2A' },
    { name: 'OrangeRed', hex: '#FF4500' },
    { name: 'DarkGray', hex: '#1F2937' },
    { name: 'Teal', hex: '#0D9488' },
    { name: 'Purple', hex: '#7C3AED' },
    { name: 'Green', hex: '#16A34A' },
    { name: 'Amber', hex: '#D97706' },
    { name: 'LightGray', hex: '#9CA3AF' },
    { name: 'Crimson', hex: '#DC143C' },
    { name: 'DarkGreen', hex: '#006400' },
    { name: 'DarkOrange', hex: '#FF8C00' },
    { name: 'DeepPink', hex: '#FF1493' },
    { name: 'DodgerBlue', hex: '#1E90FF' },
    { name: 'Fuchsia', hex: '#FF00FF' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Indigo', hex: '#4B0082' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Navy', hex: '#000080' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Coral', hex: '#FF7F50' },
  ];

  const ledgerColors = [
    { key: 'procedureColor', label: 'Procedures', default: 'DarkGray', description: 'Doctor posts treatment' },
    { key: 'insurancePaymentColor', label: 'Insurance Payments', default: 'Teal', description: 'Insurance EOB posted' },
    { key: 'claimLinesColor', label: 'Claim Lines', default: 'Purple', description: 'Claim created/sent' },
    { key: 'patientPaymentColor', label: 'Patient Payments', default: 'Green', description: 'Front desk payment' },
    { key: 'adjustmentColor', label: 'Adjustments', default: 'Amber', description: 'Courtesy, write-off' },
    { key: 'statementLinesColor', label: 'Statement Lines', default: 'Blue', description: 'Statement generated' },
    { key: 'notesLinesColor', label: 'Notes Lines', default: 'LightGray', description: 'Internal ledger notes' },
  ];

  // Helper function to get hex color from color name
  const getColorHex = (colorName: string) => {
    const color = colorMaster.find(c => c.name === colorName);
    return color?.hex || '#000000';
  };

  const chartingOptions = [
    { value: 'modal', label: 'Modal Style' },
    { value: 'submenu', label: 'Submenu Style' },
    { value: 'tabbed', label: 'Tabbed Style' },
  ];

  const chartingTabs = [
    { value: 'pre-existing', label: 'Pre-Existing' },
    { value: 'conditions', label: 'Conditions' },
    { value: 'treatment', label: 'Treatment' },
  ];

  return (
    <div className="space-y-6">
      {/* LEDGER COLORS SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Activity className="w-4 h-4 text-[#3A6EA5]" />
          Ledger Colors
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] mb-4 font-bold">
            Configure colors for different transaction types in patient ledgers. These colors apply account-wide across all offices.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {ledgerColors.map((color) => {
              const selectedColor = formData[color.key] || color.default;
              const selectedHex = getColorHex(selectedColor);
              
              return (
                <div key={color.key} className="space-y-2">
                  <label className="block text-xs font-bold text-[#1E293B]">
                    {color.label}
                  </label>
                  <p className="text-xs text-[#64748B]">{color.description}</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border-2 border-[#CBD5E1] flex-shrink-0"
                      style={{ backgroundColor: selectedHex }}
                      title={selectedColor}
                    />
                    <select
                      value={selectedColor}
                      onChange={(e) => updateFormData({ [color.key]: e.target.value })}
                      disabled={!isEditMode}
                      className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm ${
                        isEditMode
                          ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                          : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                      }`}
                    >
                      {colorMaster.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* OPTIONS SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Settings className="w-4 h-4 text-[#3A6EA5]" />
          Options
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Enable Full Screen */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Enable Full Screen
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Allow full-screen mode in scheduler
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enableFullScreen || false}
                onChange={(e) => updateFormData({ enableFullScreen: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>

            {/* Maximum Treatment Plan Discount */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Maximum Treatment Plan Discount (%)
              </label>
              <input
                type="number"
                value={formData.maxTreatmentPlanDiscount || 0}
                onChange={(e) => updateFormData({ maxTreatmentPlanDiscount: parseFloat(e.target.value) })}
                disabled={!isEditMode}
                min="0"
                max="100"
                step="0.1"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
              <p className="text-xs text-[#64748B] mt-1">
                Protects revenue by limiting maximum discount allowed
              </p>
            </div>

            {/* Only Show Office Items */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Only Show Office Items in Default Patient Fee Schedule
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Show only procedures assigned to patient's office
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.onlyShowOfficeItems || false}
                onChange={(e) => updateFormData({ onlyShowOfficeItems: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>

            {/* Statement Close Out */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Statement Close Out Individual Statement
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Close ledger individually per statement
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.statementCloseOutIndividual || false}
                onChange={(e) => updateFormData({ statementCloseOutIndividual: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Auto-post periodic contract charges */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Auto-post Periodic Contract Charges
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Automatically generate recurring charges
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoPostPeriodicCharges || false}
                onChange={(e) => updateFormData({ autoPostPeriodicCharges: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>

            {/* Flash Alerts for Insurance */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Show Patient Flash Alerts if Insurance is Not Eligible
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Display alert when insurance eligibility fails
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showFlashAlertsInsurance || false}
                onChange={(e) => updateFormData({ showFlashAlertsInsurance: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>

            {/* Pronoun Field Visible */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Pronoun Field Visible
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Show pronoun field in patient forms
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.pronounFieldVisible || false}
                onChange={(e) => updateFormData({ pronounFieldVisible: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DEFAULT SETTINGS SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Settings className="w-4 h-4 text-[#3A6EA5]" />
          Default Settings
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Charting Option */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Charting Option
              </label>
              <select
                value={formData.chartingOption || 'modal'}
                onChange={(e) => updateFormData({ chartingOption: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                {chartingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Charting Tab */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Default Charting Tab
              </label>
              <select
                value={formData.defaultChartingTab || 'treatment'}
                onChange={(e) => updateFormData({ defaultChartingTab: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                {chartingTabs.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User Password Expiration */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                User Password Expiration Limit (days)
              </label>
              <input
                type="number"
                value={formData.passwordExpirationDays || 90}
                onChange={(e) => updateFormData({ passwordExpirationDays: parseInt(e.target.value) })}
                disabled={!isEditMode}
                min="0"
                max="365"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
              <p className="text-xs text-[#64748B] mt-1">
                0 = Never expire
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Scheduler Show Non Working Days */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#1E293B]">
                  Scheduler – Show Non Working Days
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Display non-working days in scheduler view
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.schedulerShowNonWorkingDays || false}
                onChange={(e) => updateFormData({ schedulerShowNonWorkingDays: e.target.checked })}
                disabled={!isEditMode}
                className={`w-5 h-5 rounded border-2 ${
                  isEditMode
                    ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] opacity-50'
                }`}
              />
            </div>

            {/* Default Fee Increase Code */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Default Fee Increase Code
              </label>
              <input
                type="text"
                value={formData.defaultFeeIncreaseCode || ''}
                onChange={(e) => updateFormData({ defaultFeeIncreaseCode: e.target.value })}
                disabled={!isEditMode}
                placeholder="ADJ-INC"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>

            {/* Default Write Off Code */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Default Write Off Code
              </label>
              <input
                type="text"
                value={formData.defaultWriteOffCode || ''}
                onChange={(e) => updateFormData({ defaultWriteOffCode: e.target.value })}
                disabled={!isEditMode}
                placeholder="ADJ-WO"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* REQUIRED FIELDS SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <AlertCircle className="w-4 h-4 text-[#3A6EA5]" />
          Required Fields
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] mb-4 font-bold">
            Configure which fields are required when creating or editing patient records.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'patientDobRequired', label: 'Patient DOB' },
              { key: 'patientSsnRequired', label: 'Patient SSN' },
              { key: 'patientEmailRequired', label: 'Patient Email' },
              { key: 'patientPhoneRequired', label: 'Patient Phone' },
              { key: 'patientAddressRequired', label: 'Patient Address' },
              { key: 'responsiblePartyRequired', label: 'Responsible Party' },
            ].map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData[field.key] || false}
                  onChange={(e) => updateFormData({ [field.key]: e.target.checked })}
                  disabled={!isEditMode}
                  className={`w-4 h-4 rounded border-2 ${
                    isEditMode
                      ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] opacity-50'
                  }`}
                />
                <label className="text-xs font-bold text-[#1E293B]">
                  {field.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THIRD PARTY SETTINGS SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Network className="w-4 h-4 text-[#3A6EA5]" />
          Third Party Settings
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* EDI Vendor */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                EDI Vendor
              </label>
              <select
                value={formData.ediVendor || ''}
                onChange={(e) => updateFormData({ ediVendor: e.target.value })}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="">Select EDI Vendor</option>
                <option value="nea">NEA</option>
                <option value="dentrix">Dentrix Ascend</option>
                <option value="healthicity">Healthicity</option>
                <option value="waystar">Waystar</option>
              </select>
            </div>

            {/* Transworld */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Transworld (Collection Agency)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.transworldEnabled || false}
                  onChange={(e) => updateFormData({ transworldEnabled: e.target.checked })}
                  disabled={!isEditMode}
                  className={`w-4 h-4 rounded border-2 ${
                    isEditMode
                      ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] opacity-50'
                  }`}
                />
                <span className="text-xs font-bold text-[#1E293B]">Enabled</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* XVWeb */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                XVWeb (Imaging)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.xvwebEnabled || false}
                  onChange={(e) => updateFormData({ xvwebEnabled: e.target.checked })}
                  disabled={!isEditMode}
                  className={`w-4 h-4 rounded border-2 ${
                    isEditMode
                      ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] opacity-50'
                  }`}
                />
                <span className="text-xs font-bold text-[#1E293B]">Enabled</span>
              </div>
            </div>

            {/* Cloud 9 */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Cloud 9 (Ortho Software)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cloud9Enabled || false}
                  onChange={(e) => updateFormData({ cloud9Enabled: e.target.checked })}
                  disabled={!isEditMode}
                  className={`w-4 h-4 rounded border-2 ${
                    isEditMode
                      ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] opacity-50'
                  }`}
                />
                <span className="text-xs font-bold text-[#1E293B]">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT PORTAL SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <CreditCard className="w-4 h-4 text-[#3A6EA5]" />
          Payment Portal
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Posting Office
            </label>
            <select
              value={formData.paymentPortalPostingOffice || ''}
              onChange={(e) => updateFormData({ paymentPortalPostingOffice: e.target.value })}
              disabled={!isEditMode}
              className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                isEditMode
                  ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
              }`}
            >
              <option value="">Select Office</option>
              <option value="main">Main Office</option>
              <option value="branch1">Branch Office 1</option>
              <option value="branch2">Branch Office 2</option>
            </select>
            <p className="text-xs text-[#64748B] mt-1">
              Which office ledger receives online payments
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0]">
            <div>
              <label className="block text-xs font-bold text-[#1E293B]">
                Post Payment to Responsible Party
              </label>
              <p className="text-xs text-[#64748B] mt-1">
                Apply payments to responsible party ledger
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.postPaymentToResponsibleParty || false}
              onChange={(e) => updateFormData({ postPaymentToResponsibleParty: e.target.checked })}
              disabled={!isEditMode}
              className={`w-5 h-5 rounded border-2 ${
                isEditMode
                  ? 'border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  : 'border-[#E2E8F0] opacity-50'
              }`}
            />
          </div>
        </div>
      </div>

      {/* AI ASSIST SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Lock className="w-4 h-4 text-[#3A6EA5]" />
          AI Assist
        </h3>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Security Notice</p>
              <p className="text-xs text-amber-700 mt-1">
                API credentials are encrypted at rest and never exposed in the frontend. For security, credentials are managed by administrators only.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Organization ID
            </label>
            <input
              type="text"
              value={formData.aiAssistOrgId || ''}
              onChange={(e) => updateFormData({ aiAssistOrgId: e.target.value })}
              disabled={!isEditMode}
              placeholder="org-xxxxxxxxxx"
              className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-mono ${
                isEditMode
                  ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Client ID
            </label>
            <input
              type="text"
              value={formData.aiAssistClientId || ''}
              onChange={(e) => updateFormData({ aiAssistClientId: e.target.value })}
              disabled={!isEditMode}
              placeholder="client-xxxxxxxxxx"
              className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-mono ${
                isEditMode
                  ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
              }`}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Client Secret
            </label>
            <input
              type="password"
              value={formData.aiAssistClientSecret || ''}
              onChange={(e) => updateFormData({ aiAssistClientSecret: e.target.value })}
              disabled={!isEditMode}
              placeholder="••••••••••••••••"
              className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-mono ${
                isEditMode
                  ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
              }`}
            />
            <p className="text-xs text-[#DC2626] mt-1 font-bold">
              ⚠️ This credential is encrypted and stored securely
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HolidaysTab() {
  return <HolidaysTabContent />;
}

function CommunicationsTab() {
  return <CommunicationsTabContent />;
}

function OnlineRegistrationTab() {
  return <OnlineRegistrationTabContent />;
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function AccountSetup() {
  const [activeTab, setActiveTab] = useState<TabName>('basic');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<AccountData>(mockAccountData);
  const [originalData, setOriginalData] = useState<AccountData>(mockAccountData);

  const tabs = [
    { id: 'basic' as TabName, label: 'BASIC' },
    { id: 'advanced' as TabName, label: 'ADVANCED' },
    { id: 'holidays' as TabName, label: 'HOLIDAYS' },
    { id: 'communications' as TabName, label: 'COMMUNICATIONS' },
    { id: 'online-registration' as TabName, label: 'ONLINE REGISTRATION' },
  ];

  const updateFormData = (updates: Partial<AccountData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleEdit = () => {
    setOriginalData(formData);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditMode(false);
  };

  const handleSave = () => {
    // Validation
    const errors: string[] = [];

    if (!formData.accountName?.trim()) {
      errors.push('Account Name is required');
    }
    if (!formData.accountShortId?.trim()) {
      errors.push('Account Short ID is required');
    }
    if (!formData.email?.trim()) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.push('Please enter a valid email address');
      }
    }

    if (errors.length > 0) {
      toast.error('Validation Failed', {
        description: errors[0],
        duration: 4000,
      });
      return;
    }

    // Update audit fields
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedFormData = {
      ...formData,
      updatedAt: now,
      updatedBy: 'admin@smilebright.com', // Replace with actual user
    };

    setFormData(updatedFormData);
    setOriginalData(updatedFormData);
    setIsEditMode(false);

    console.log('Saving account data:', updatedFormData);
    
    toast.success('Account Updated Successfully', {
      description: 'Account information has been saved',
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1F3A5F]">
                    Account Setup
                  </h1>
                  <p className="text-xs text-[#64748B] font-bold">
                    Manage account configuration and settings
                  </p>
                </div>
              </div>

              {/* Audit Info */}
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="font-bold text-[#64748B]">PGID:</span>{' '}
                  <span className="font-bold text-[#1E293B]">{formData.pgid}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B]">OID:</span>{' '}
                  <span className="font-bold text-[#1E293B]">{formData.oid}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#64748B]" />
                  <span className="font-bold text-[#64748B]">Modified On:</span>{' '}
                  <span className="font-bold text-[#1E293B]">{formData.updatedAt}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-[#64748B]" />
                  <span className="font-bold text-[#64748B]">Modified By:</span>{' '}
                  <span className="font-bold text-[#1E293B]">{formData.updatedBy}</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-semibold text-xs whitespace-nowrap rounded-t-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-[#3A6EA5] border-t-4 border-[#3A6EA5]'
                      : 'text-[#64748B] hover:text-[#1F3A5F] hover:bg-[#E8EFF7]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'basic' && (
              <BasicTab 
                formData={formData} 
                updateFormData={updateFormData} 
                isEditMode={isEditMode}
              />
            )}
            {activeTab === 'advanced' && (
              <AdvancedTab 
                formData={formData} 
                updateFormData={updateFormData} 
                isEditMode={isEditMode}
              />
            )}
            {activeTab === 'holidays' && <HolidaysTab />}
            {activeTab === 'communications' && <CommunicationsTab />}
            {activeTab === 'online-registration' && <OnlineRegistrationTab />}
          </div>

          {/* Footer Actions */}
          <div className="border-t-2 border-[#E2E8F0] p-4 bg-[#F7F9FC]">
            <div className="flex justify-end gap-3">
              {!isEditMode ? (
                <button
                  onClick={handleEdit}
                  className={components.buttonPrimary + " inline-flex items-center gap-2"}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className={components.buttonOutline + " inline-flex items-center gap-2"}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className={components.buttonPrimary + " inline-flex items-center gap-2"}
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
