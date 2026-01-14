import { useState } from 'react';
import { X, Calendar, User } from 'lucide-react';

interface AddAccountMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function AddAccountMemberModal({
  isOpen,
  onClose,
  onSave,
}: AddAccountMemberModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    sex: 'Male',
    relationship: 'Self',
    cellPhone: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    sameAddressAsGuarantor: false,
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.dob || !formData.sex) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-modal-title"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border-4 border-[#3A6EA5]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 id="add-member-modal-title" className="text-xl font-bold text-white">
                Add New Account Member
              </h2>
              <p className="text-sm text-white/80">Enter new member information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] rounded-lg p-4">
            <h3 className="text-[#1F3A5F] font-bold text-sm uppercase tracking-wide mb-4">
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                  placeholder="Enter last name"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) => handleFieldChange('dob', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none pr-10"
                    placeholder="MM/DD/YYYY"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                </div>
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  Sex <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) => handleFieldChange('sex', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  Relationship to Guarantor
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => handleFieldChange('relationship', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                >
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] rounded-lg p-4">
            <h3 className="text-[#1F3A5F] font-bold text-sm uppercase tracking-wide mb-4">
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cell Phone */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  Cell Phone
                </label>
                <input
                  type="tel"
                  value={formData.cellPhone}
                  onChange={(e) => handleFieldChange('cellPhone', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                  placeholder="(xxx) xxx-xxxx"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1F3A5F] font-bold text-sm uppercase tracking-wide">
                Address Information
              </h3>
              <label className="flex items-center gap-2 text-sm text-[#1E293B]">
                <input
                  type="checkbox"
                  checked={formData.sameAddressAsGuarantor}
                  onChange={(e) => handleFieldChange('sameAddressAsGuarantor', e.target.checked)}
                  className="w-4 h-4 text-[#3A6EA5] border-[#E2E8F0] rounded focus:ring-[#3A6EA5]"
                />
                Same as Guarantor
              </label>
            </div>
            
            {!formData.sameAddressAsGuarantor && (
              <div className="space-y-4">
                {/* Address Line 1 */}
                <div>
                  <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address1}
                    onChange={(e) => handleFieldChange('address1', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                    placeholder="Street address"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address2}
                    onChange={(e) => handleFieldChange('address2', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                    placeholder="Apt, Suite, etc."
                  />
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                      placeholder="State"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1E293B] mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => handleFieldChange('zip', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded focus:border-[#3A6EA5] focus:outline-none"
                      placeholder="ZIP"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-[#E2E8F0] px-6 py-4 flex items-center justify-between bg-[#F7F9FC] sticky bottom-0">
          <div className="text-sm text-[#64748B]">
            <span className="text-red-500">*</span> Required fields
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-[#E2E8F0] rounded text-[#64748B] hover:bg-[#F7F9FC] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#3A6EA5] text-white rounded hover:bg-[#2d5080] transition-colors font-medium shadow-md"
            >
              Add Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
