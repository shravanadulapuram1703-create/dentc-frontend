import { useState } from 'react';
import { Building2, User, Phone, Globe, AlertCircle, ArrowRight, ArrowLeft, Shield, Save, Edit, X } from 'lucide-react';
import { toast } from 'sonner';

interface Office {
  id: string;
  name: string;
  isModel: boolean;
}

export function CommunicationsTabContent() {
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Business Information
  const [businessName, setBusinessName] = useState('Smile Dental Group');
  const [regionOfOperations, setRegionOfOperations] = useState('United States');
  const [country, setCountry] = useState('United States');
  const [addressLine1, setAddressLine1] = useState('123 Main Street, Suite 200');
  const [city, setCity] = useState('Los Angeles');
  const [state, setState] = useState('CA');
  const [zip, setZip] = useState('90210');
  const [ein, setEin] = useState('XX-XXX1234'); // Masked by default
  const [website, setWebsite] = useState('https://www.smiledental.com');
  
  // Business Contact
  const [contactFirstName, setContactFirstName] = useState('John');
  const [contactLastName, setContactLastName] = useState('Smith');
  const [businessTitle, setBusinessTitle] = useState('Practice Owner');
  const [position, setPosition] = useState('DDS');
  const [contactEmail, setContactEmail] = useState('john.smith@smiledental.com');
  const [contactPhone, setContactPhone] = useState('+1 (310) 555-1234');
  
  // Phone Number Assignment
  const [officeSpecific, setOfficeSpecific] = useState<Office[]>([
    { id: '1', name: 'Main Office - Downtown LA', isModel: true },
    { id: '2', name: 'Westside Branch', isModel: false },
  ]);
  
  const [multiOfficeShared, setMultiOfficeShared] = useState<Office[]>([
    { id: '3', name: 'Beverly Hills Office', isModel: false },
    { id: '4', name: 'Santa Monica Office', isModel: false },
    { id: '5', name: 'Pasadena Office', isModel: false },
  ]);
  
  const [selectedOfficeSpecific, setSelectedOfficeSpecific] = useState<string[]>([]);
  const [selectedMultiOffice, setSelectedMultiOffice] = useState<string[]>([]);
  
  // Business Type
  const [businessType, setBusinessType] = useState('Corporation');
  const [companyStatus, setCompanyStatus] = useState('Privately Held');
  const [stockSymbol, setStockSymbol] = useState('');
  const [stockExchange, setStockExchange] = useState('');
  const [businessIdentity, setBusinessIdentity] = useState('Healthcare Provider');
  const [businessIndustry, setBusinessIndustry] = useState('Dental Practice');
  
  // Telecom Status
  const [telecomStatus, setTelecomStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset form values would go here in production
    toast.info('Changes cancelled');
  };

  const handleSave = () => {
    // Validation
    if (!businessName || !country || !addressLine1 || !city || !state || !zip || !website) {
      toast.error('Please fill in all required fields in Business Information');
      return;
    }
    
    if (!contactFirstName || !contactLastName || !contactEmail || !contactPhone) {
      toast.error('Please fill in all required fields in Business Contact');
      return;
    }
    
    if (officeSpecific.length > 5) {
      toast.error('Maximum 5 offices allowed for Office-Specific Number (Twilio toll-free limit)');
      return;
    }
    
    // In production: encrypt EIN, validate formats, trigger telecom sync
    setIsEditMode(false);
    toast.success('Communication settings saved successfully. Telecom provider sync initiated.');
  };

  const moveToOfficeSpecific = () => {
    const selected = multiOfficeShared.filter(o => selectedMultiOffice.includes(o.id));
    
    if (officeSpecific.length + selected.length > 5) {
      toast.error('Maximum 5 offices allowed for Office-Specific Number');
      return;
    }
    
    setOfficeSpecific([...officeSpecific, ...selected]);
    setMultiOfficeShared(multiOfficeShared.filter(o => !selectedMultiOffice.includes(o.id)));
    setSelectedMultiOffice([]);
  };

  const moveToMultiOfficeShared = () => {
    const selected = officeSpecific.filter(o => selectedOfficeSpecific.includes(o.id));
    
    // Check if any selected office is the model office
    if (selected.some(o => o.isModel)) {
      toast.error('Model office cannot be assigned to Multi-Office Shared Number');
      return;
    }
    
    setMultiOfficeShared([...multiOfficeShared, ...selected]);
    setOfficeSpecific(officeSpecific.filter(o => !selectedOfficeSpecific.includes(o.id)));
    setSelectedOfficeSpecific([]);
  };

  const toggleOfficeSpecificSelection = (id: string) => {
    if (selectedOfficeSpecific.includes(id)) {
      setSelectedOfficeSpecific(selectedOfficeSpecific.filter(sid => sid !== id));
    } else {
      setSelectedOfficeSpecific([...selectedOfficeSpecific, id]);
    }
  };

  const toggleMultiOfficeSelection = (id: string) => {
    if (selectedMultiOffice.includes(id)) {
      setSelectedMultiOffice(selectedMultiOffice.filter(sid => sid !== id));
    } else {
      setSelectedMultiOffice([...selectedMultiOffice, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Permission Notice */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-900">
            Restricted Access: Only Super Admin and Account Owner can modify communication settings.
          </p>
          <p className="text-xs text-amber-800 mt-1">
            These settings affect telecom compliance, SMS routing, and legal business identity.
          </p>
        </div>
      </div>

      {/* Telecom Status Badge */}
      {!isEditMode && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#1E293B]">Telecom Verification Status:</span>
          <span
            className={`px-3 py-1.5 text-xs font-bold rounded ${
              telecomStatus === 'approved'
                ? 'bg-green-100 text-green-700'
                : telecomStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {telecomStatus === 'approved' && '✓ Approved'}
            {telecomStatus === 'pending' && '⏳ Pending Verification'}
            {telecomStatus === 'rejected' && '✗ Rejected'}
          </span>
        </div>
      )}

      {/* BUSINESS INFORMATION SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Building2 className="w-4 h-4 text-[#3A6EA5]" />
          Business Information
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
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
                Business Region of Operations
              </label>
              <input
                type="text"
                value={regionOfOperations}
                onChange={(e) => setRegionOfOperations(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Physical Address Country <span className="text-red-500">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Physical Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={!isEditMode}
                placeholder="Street address, suite, etc."
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={!isEditMode}
                placeholder="CA"
                maxLength={2}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm uppercase ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={!isEditMode}
                placeholder="90210"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                EIN / SSN
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  disabled={!isEditMode}
                  placeholder={businessType === 'Sole Proprietor' ? 'XXX-XX-XXXX (SSN)' : 'XX-XXXXXXX (EIN)'}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
                <div className="absolute right-3 top-2.5">
                  <Shield className="w-4 h-4 text-[#64748B]" title="Encrypted at rest" />
                </div>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                {businessType === 'Corporation' ? 'EIN required for corporations' : 'Use EIN if available, otherwise SSN'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Website <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!isEditMode}
                placeholder="https://www.example.com"
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

      {/* BUSINESS CONTACT SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <User className="w-4 h-4 text-[#3A6EA5]" />
          Business Contact
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] mb-4 font-bold">
            Principal responsible contact for telecom registration, SMS compliance, and legal correspondence.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Contact First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
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
                Contact Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
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
                Business Title
              </label>
              <input
                type="text"
                value={businessTitle}
                onChange={(e) => setBusinessTitle(e.target.value)}
                disabled={!isEditMode}
                placeholder="e.g., Practice Owner"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Position
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={!isEditMode}
                placeholder="e.g., DDS, DMD"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!isEditMode}
                placeholder="contact@example.com"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!isEditMode}
                placeholder="+1 (555) 123-4567"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
              <p className="text-xs text-[#64748B] mt-1">E.164 format required</p>
            </div>
          </div>
        </div>
      </div>

      {/* PHONE NUMBER SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Phone className="w-4 h-4 text-[#3A6EA5]" />
          Phone Number Assignment
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-bold text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Maximum 5 offices for Office-Specific Number (Twilio toll-free limit). Model office (marked in red) cannot be assigned to Multi-Office Shared.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-start">
            {/* Office Specific List */}
            <div>
              <h4 className="text-xs font-bold text-[#1E293B] mb-2">
                Office Specific Number ({officeSpecific.length}/5)
              </h4>
              <div className="bg-white border-2 border-[#CBD5E1] rounded-lg p-3 min-h-[200px] space-y-2">
                {officeSpecific.map(office => (
                  <div
                    key={office.id}
                    onClick={() => isEditMode && toggleOfficeSpecificSelection(office.id)}
                    className={`p-2 rounded border-2 text-sm transition-all cursor-pointer ${
                      office.isModel
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : selectedOfficeSpecific.includes(office.id)
                        ? 'bg-[#3A6EA5] text-white border-[#3A6EA5]'
                        : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#1E293B] hover:border-[#3A6EA5]'
                    } ${!isEditMode ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{office.name}</span>
                      {office.isModel && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">MODEL</span>
                      )}
                    </div>
                  </div>
                ))}
                {officeSpecific.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center py-8">No offices assigned</p>
                )}
              </div>
            </div>

            {/* Arrow Buttons */}
            <div className="flex flex-col gap-2 items-center justify-center pt-8">
              <button
                onClick={moveToOfficeSpecific}
                disabled={!isEditMode || selectedMultiOffice.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  isEditMode && selectedMultiOffice.length > 0
                    ? 'bg-[#3A6EA5] text-white hover:bg-[#2C5282]'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
                title="Move to Office Specific"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={moveToMultiOfficeShared}
                disabled={!isEditMode || selectedOfficeSpecific.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  isEditMode && selectedOfficeSpecific.length > 0
                    ? 'bg-[#3A6EA5] text-white hover:bg-[#2C5282]'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
                title="Move to Multi-Office Shared"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Multi-Office Shared List */}
            <div>
              <h4 className="text-xs font-bold text-[#1E293B] mb-2">Multi-Office Shared Number</h4>
              <div className="bg-white border-2 border-[#CBD5E1] rounded-lg p-3 min-h-[200px] space-y-2">
                {multiOfficeShared.map(office => (
                  <div
                    key={office.id}
                    onClick={() => isEditMode && toggleMultiOfficeSelection(office.id)}
                    className={`p-2 rounded border-2 text-sm transition-all cursor-pointer ${
                      selectedMultiOffice.includes(office.id)
                        ? 'bg-[#3A6EA5] text-white border-[#3A6EA5]'
                        : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#1E293B] hover:border-[#3A6EA5]'
                    } ${!isEditMode ? 'cursor-default' : ''}`}
                  >
                    <span className="font-bold text-xs">{office.name}</span>
                  </div>
                ))}
                {multiOfficeShared.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center py-8">No offices assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BUSINESS TYPE SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Globe className="w-4 h-4 text-[#3A6EA5]" />
          Business Type
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] mb-4 font-bold">
            Required for telecom compliance and A2P campaign registration.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="Sole Proprietor">Sole Proprietor</option>
                <option value="Corporation">Corporation</option>
                <option value="LLC">LLC</option>
                <option value="Partnership">Partnership</option>
                <option value="Non-Profit">Non-Profit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Company Status
              </label>
              <select
                value={companyStatus}
                onChange={(e) => setCompanyStatus(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="Privately Held">Privately Held</option>
                <option value="Publicly Traded">Publicly Traded</option>
              </select>
            </div>
            {companyStatus === 'Publicly Traded' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">
                    Stock Symbol
                  </label>
                  <input
                    type="text"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="e.g., AAPL"
                    className={`w-full px-3 py-2 border-2 rounded-lg text-sm uppercase ${
                      isEditMode
                        ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                        : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">
                    Stock Exchange
                  </label>
                  <select
                    value={stockExchange}
                    onChange={(e) => setStockExchange(e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                      isEditMode
                        ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                        : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                    }`}
                  >
                    <option value="">Select...</option>
                    <option value="NYSE">NYSE</option>
                    <option value="NASDAQ">NASDAQ</option>
                    <option value="AMEX">AMEX</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Identity
              </label>
              <input
                type="text"
                value={businessIdentity}
                onChange={(e) => setBusinessIdentity(e.target.value)}
                disabled={!isEditMode}
                placeholder="e.g., Healthcare Provider"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Industry
              </label>
              <select
                value={businessIndustry}
                onChange={(e) => setBusinessIndustry(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="Dental Practice">Dental Practice</option>
                <option value="Medical Practice">Medical Practice</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-[#E2E8F0]">
        {!isEditMode ? (
          <button
            onClick={handleEdit}
            className="px-6 py-2.5 bg-[#3A6EA5] text-white text-sm font-bold rounded-lg hover:bg-[#2C5282] transition-colors inline-flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border-2 border-[#CBD5E1] text-[#1E293B] text-sm font-bold rounded-lg hover:bg-[#F7F9FC] transition-colors inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#0D9488] text-white text-sm font-bold rounded-lg hover:bg-[#0F766E] transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}
