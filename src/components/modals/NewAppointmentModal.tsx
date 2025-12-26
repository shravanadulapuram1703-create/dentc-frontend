import { X, Calendar, User, Clock } from 'lucide-react';
import { useState } from 'react';
import { components } from '../../styles/theme';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  selectedSlot: { time: string; operatory: string } | null;
  currentOffice: string;
}

export default function NewAppointmentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedSlot,
  currentOffice 
}: NewAppointmentModalProps) {
  const [appointmentType, setAppointmentType] = useState<'existing' | 'new' | 'family' | 'block' | 'quickfill'>('new');
  const [showPatientForm, setShowPatientForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Patient Information
    birthdate: '',
    lastName: '',
    firstName: '',
    email: '',
    phoneNumber: '',
    phoneType: 'Cell',
    bypassPhone: false,

    // Appointment Details
    date: new Date().toISOString().split('T')[0],
    time: selectedSlot?.time || '09:00',
    duration: 10,
    procedureType: 'New Patient',
    notes: '',
    operatory: selectedSlot?.operatory || 'OP1',
    provider: 'Dr. Jinna'
  });

  const procedureTypes = [
    { name: 'Cleaning', color: 'bg-blue-100' },
    { name: 'Consult', color: 'bg-purple-100' },
    { name: 'Crowns', color: 'bg-yellow-100' },
    { name: 'Emergency', color: 'bg-red-100' },
    { name: 'Endo / RCT', color: 'bg-pink-100' },
    { name: 'Extraction', color: 'bg-orange-100' },
    { name: 'Implants', color: 'bg-indigo-100' },
    { name: 'Lab Case', color: 'bg-cyan-100' },
    { name: 'New Patient', color: 'bg-green-100' },
    { name: 'Perio', color: 'bg-rose-100' },
    { name: 'Recall / Recare', color: 'bg-teal-100' },
    { name: 'Restorative', color: 'bg-amber-100' }
  ];

  const handleTypeSelection = (type: typeof appointmentType) => {
    setAppointmentType(type);
    if (type === 'new' || type === 'existing') {
      setShowPatientForm(true);
    }
  };

  const handleQuickSave = () => {
    // Validate required fields
    if (appointmentType === 'new') {
      if (!formData.birthdate || !formData.lastName || !formData.firstName || !formData.phoneNumber) {
        alert('Please fill in all required fields (Birthdate, Last Name, First Name, Phone Number)');
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  const handleContinue = () => {
    handleQuickSave();
    // In a real app, this would open additional screens for more details
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border-2 border-[#E2E8F0]">
        {/* Header - Medical Slate Theme */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-4 flex items-center justify-between z-10 border-b-2 border-[#162942]">
          <h2 className="font-bold text-white">NEW APPOINTMENT</h2>
          <button onClick={onClose} className="text-white hover:bg-[#162942] p-2 rounded transition-colors">
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Selected Slot Information - Medical Slate Theme */}
        {selectedSlot && (
          <div className="bg-[#E8EFF7] border-b-2 border-[#E2E8F0] p-4">
            <h3 className="font-bold text-[#1F3A5F] mb-2">Selected Appointment Slot</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#64748B] font-medium">Date:</span>
                <span className="ml-2 text-[#1E293B] font-semibold">{formData.date}</span>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">Time:</span>
                <span className="ml-2 text-[#1E293B] font-semibold">{selectedSlot.time}</span>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">Office:</span>
                <span className="ml-2 text-[#1E293B] font-semibold">{currentOffice}</span>
              </div>
              <div>
                <span className="text-[#64748B] font-medium">Operatory:</span>
                <span className="ml-2 text-[#1E293B] font-semibold">{selectedSlot.operatory}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {!showPatientForm ? (
            /* Appointment Type Selection */
            <div className="space-y-4">
              <h3 className="font-bold text-[#1F3A5F] mb-4">Select Appointment Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleTypeSelection('existing')}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <User className="w-8 h-8 text-[#EF4444] mb-2" strokeWidth={2} />
                  <div className="font-bold text-[#1E293B]">Existing Patient</div>
                  <div className="text-sm text-[#64748B] mt-1">Schedule appointment for existing patient</div>
                </button>
                <button
                  onClick={() => handleTypeSelection('new')}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <User className="w-8 h-8 text-[#2FB9A7] mb-2" strokeWidth={2} />
                  <div className="font-bold text-[#1E293B]">New Patient</div>
                  <div className="text-sm text-[#64748B] mt-1">Create new patient and schedule appointment</div>
                </button>
                <button
                  onClick={() => handleTypeSelection('family')}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <User className="w-8 h-8 text-[#3A6EA5] mb-2" strokeWidth={2} />
                  <div className="font-bold text-[#1E293B]">Family Appointment</div>
                  <div className="text-sm text-[#64748B] mt-1">Schedule for family member</div>
                </button>
                <button
                  onClick={() => handleTypeSelection('block')}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <Clock className="w-8 h-8 text-[#8B5CF6] mb-2" strokeWidth={2} />
                  <div className="font-bold text-[#1E293B]">Block Appointment</div>
                  <div className="text-sm text-[#64748B] mt-1">Block time on schedule</div>
                </button>
                <button
                  onClick={() => handleTypeSelection('quickfill')}
                  className="p-6 border-2 border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-colors text-left"
                >
                  <Calendar className="w-8 h-8 text-[#F59E0B] mb-2" strokeWidth={2} />
                  <div className="font-bold text-[#1E293B]">Quick Fill List</div>
                  <div className="text-sm text-[#64748B] mt-1">Select from quick fill patients</div>
                </button>
              </div>
            </div>
          ) : (
            /* Patient and Appointment Form */
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Birthdate <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                        required
                        className="flex-1 px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                      />
                      <button className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg hover:bg-[#F7F9FC] hover:border-[#3A6EA5] transition-all">
                        <Calendar className="w-5 h-5 text-[#64748B]" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Last Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      First Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">
                      Phone Number <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      required
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">Type</label>
                    <select
                      value={formData.phoneType}
                      onChange={(e) => setFormData({ ...formData, phoneType: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    >
                      <option value="Cell">Cell</option>
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.bypassPhone}
                        onChange={(e) => setFormData({ ...formData, bypassPhone: e.target.checked })}
                        className="w-4 h-4 rounded border-2 border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-[#1E293B] font-medium">Bypass</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div>
                <h3 className="font-bold text-[#1F3A5F] mb-4 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-2">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">Duration (minutes)</label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    >
                      <option value={10}>10 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                      <option value={120}>120 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">Procedure Type</label>
                    <select
                      value={formData.procedureType}
                      onChange={(e) => setFormData({ ...formData, procedureType: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    >
                      {procedureTypes.map((type) => (
                        <option key={type.name} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Procedure Type Color Preview */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-[#64748B] font-medium">Color:</span>
                  <div
                    className={`px-3 py-1 rounded font-medium text-sm ${
                      procedureTypes.find((t) => t.name === formData.procedureType)?.color || 'bg-gray-100'
                    }`}
                  >
                    {formData.procedureType}
                  </div>
                </div>

                {/* Appointment Notes */}
                <div className="mt-4">
                  <label className="block text-[#1E293B] font-medium mb-1">Appointment Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    placeholder="Enter any notes about this appointment..."
                  />
                </div>

                {/* Additional Options */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">Provider</label>
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    >
                      <option value="Dr. Jinna">Dr. Jinna</option>
                      <option value="Dr. Smith">Dr. Smith</option>
                      <option value="Dr. Jones">Dr. Jones</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-medium mb-1">Operatory</label>
                    <select
                      value={formData.operatory}
                      onChange={(e) => setFormData({ ...formData, operatory: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                    >
                      <option value="OP1">OP 1 - Hygiene</option>
                      <option value="OP2">OP 2 - Major</option>
                      <option value="OP3">OP 3 - Minor</option>
                    </select>
                  </div>
                </div>

                {/* Quick Buttons */}
                <div className="mt-4 flex gap-2">
                  <button className={components.buttonSecondary + " flex items-center gap-2"}>
                    NOTES MACRO
                  </button>
                  <button className={components.buttonSecondary + " flex items-center gap-2"}>
                    EXPLOSION CODES
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {showPatientForm && (
          <div className="sticky bottom-0 bg-[#F7F9FC] border-t-2 border-[#E2E8F0] p-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className={components.buttonSecondary + " flex items-center gap-2"}
            >
              CLOSE
            </button>
            <button
              onClick={handleContinue}
              className={components.buttonWarning + " flex items-center gap-2"}
            >
              CONTINUE
            </button>
            <button
              onClick={handleQuickSave}
              className={components.buttonPrimary + " flex items-center gap-2"}
            >
              QUICK SAVE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}