import { X, Calendar, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SendEmailModal from './SendEmailModal';
import TxPlansTab from './TxPlansTab';
import DatePickerCalendar from './DatePickerCalendar';
import AddProcedure from '../patient/AddProcedure';
import { procedureCodes, type ProcedureCode } from '../../data/procedureCodes';

interface PatientSearchResult {
  patientId: string;
  name: string;
  gender: string;
  ssn: string;
  phone: string;
  birthdate: string;
  age: number;
  respId: string;
  chartNumber: string;
  patientType: string;
  office: string;
  email?: string;
  cellPhone?: string;
  workPhone?: string;
  homePhone?: string;
}

interface AddEditAppointmentFormProps {
  patient: PatientSearchResult;
  selectedSlot: { time: string; operatory: string } | null;
  currentOffice: string;
  onClose: () => void;
  onSave: (data: any) => void;
  onBack: () => void;
  editingAppointment?: any; // Optional: appointment data when editing
}

interface Treatment {
  id: string;
  status: string;
  code: string;
  th: string;
  surf: string;
  description: string;
  bill: string;
  duration: number;
  provider: string;
  providerUnits: number;
  estPatient: number;
  estInsurance: number;
  fee: number;
}

export default function AddEditAppointmentForm({
  patient,
  selectedSlot,
  currentOffice,
  onClose,
  onSave,
  onBack,
  editingAppointment
}: AddEditAppointmentFormProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get today's date in MM/DD/YYYY format
  const getTodayDate = () => {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  };

  // Operatory to Provider mapping
  const operatoryProviderMap: { [key: string]: string } = {
    'Hygiene': 'Dr. Sarah Johnson',
    'Major': 'Dr. Michael Chen',
    'Minor': 'Dr. Jinna',
    'Surgery': 'Dr. Robert Williams'
  };

  // Available providers list
  const availableProviders = [
    'Dr. Jinna',
    'Dr. Sarah Johnson',
    'Dr. Michael Chen',
    'Dr. Robert Williams',
    'Dr. Emily Davis',
    'Dr. James Anderson'
  ];

  // Get default provider based on operatory
  const getDefaultProvider = (operatory: string) => {
    return operatoryProviderMap[operatory] || 'Dr. Jinna';
  };

  // Appointment form state
  const [formData, setFormData] = useState({
    // Personal Information (read-only for existing patient)
    birthdate: patient.birthdate,
    lastName: patient.name.split(', ')[0],
    firstName: patient.name.split(', ')[1] || '',
    
    // Contact Information
    email: patient.email || 'john.smith@email.com',
    cellPhone: patient.cellPhone || patient.phone,
    workPhone: patient.workPhone || '',
    homePhone: patient.homePhone || '',
    bypassPhone: false,
    
    // Operatory & Scheduling
    appointmentDate: getTodayDate(), // NEW: Appointment date
    operatory: selectedSlot?.operatory || 'Hygiene',
    status: 'Scheduled',
    startsAt: selectedSlot?.time || '09:00 AM',
    duration: 30,
    procedureType: 'Cleaning',
    provider: getDefaultProvider(selectedSlot?.operatory || 'Hygiene'), // Auto-populate provider
    
    // Flags
    missed: false,
    cancelled: false,
    
    // Lab
    lab: false,
    labDDS: '',
    labCost: '',
    labSentOn: '',
    labDueOn: '',
    labRecvdOn: '',
    
    // Notes & Campaign
    notes: '',
    campaignId: ''
  });

  // Handle operatory change - update provider automatically
  const handleOperatoryChange = (newOperatory: string) => {
    setFormData({
      ...formData,
      operatory: newOperatory,
      provider: getDefaultProvider(newOperatory)
    });
  };

  // Phone validation errors state
  const [phoneErrors, setPhoneErrors] = useState({
    cellPhone: '',
    workPhone: '',
    homePhone: ''
  });

  // US Phone format validation (accepts (XXX) XXX-XXXX, XXX-XXX-XXXX, or XXXXXXXXXX)
  const validateUSPhoneFormat = (phone: string): boolean => {
    if (!phone || phone.trim() === '') return true; // Empty is OK
    const phoneRegex = /^(\([0-9]{3}\)\s?|[0-9]{3}[-\s]?)[0-9]{3}[-\s]?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Format phone to US standard (XXX) XXX-XXXX
  const formatUSPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Handle phone field changes with validation
  const handlePhoneChange = (field: 'cellPhone' | 'workPhone' | 'homePhone', value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Validate on blur or when user stops typing
    if (value && !validateUSPhoneFormat(value)) {
      setPhoneErrors({
        ...phoneErrors,
        [field]: 'Invalid US phone format. Use (XXX) XXX-XXXX'
      });
    } else {
      setPhoneErrors({
        ...phoneErrors,
        [field]: ''
      });
    }
  };

  // Handle phone field blur - format and validate
  const handlePhoneBlur = (field: 'cellPhone' | 'workPhone' | 'homePhone') => {
    const value = formData[field];
    if (value && validateUSPhoneFormat(value)) {
      const formatted = formatUSPhone(value);
      setFormData({ ...formData, [field]: formatted });
      setPhoneErrors({ ...phoneErrors, [field]: '' });
    } else if (value) {
      setPhoneErrors({
        ...phoneErrors,
        [field]: 'Invalid US phone format. Use (XXX) XXX-XXXX'
      });
    }
  };

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [treatmentTab, setTreatmentTab] = useState<'txplans' | 'quickadd'>('txplans');

  // 🔹 NEW: Quick Add state (procedure browser → AddProcedure modal)
  const [showAddProcedure, setShowAddProcedure] = useState(false);
  const [selectedProcedureForAdd, setSelectedProcedureForAdd] = useState<ProcedureCode | null>(null);
  const [searchCodeFilter, setSearchCodeFilter] = useState('');
  const [searchUserCodeFilter, setSearchUserCodeFilter] = useState('');
  const [searchDescriptionFilter, setSearchDescriptionFilter] = useState('');

  // 🔹 Mapping function: AddProcedure → Treatment
  const mapProcedureToTreatment = (proc: any): Treatment => {
    return {
      id: proc.id,
      status: editingAppointment ? "C" : "TP", // FIX 3: C if same-day appointment, TP if planning
      code: proc.code,
      th: proc.tooth || "",
      surf: proc.surfaces || "",
      description: proc.description,
      bill: "Patient",
      duration: proc.duration 
        ? Number(proc.duration) 
        : (proc.defaultDuration || 30), // FIX 4: User override → default → fallback
      provider: proc.provider || formData.provider, // FIX 2: Fallback to appointment provider
      providerUnits: 1,
      estPatient: proc.estPatient,
      estInsurance: proc.estInsurance,
      fee: proc.fee,
    };
  };

  const procedureTypes = [
    { name: 'Cleaning', color: '#FFE5E5' },
    { name: 'consult', color: '#2D5F4C' },
    { name: 'Crowns', color: '#D4F4DD' },
    { name: 'Emergency', color: '#C7E7FF' },
    { name: 'endo/rct', color: '#E5B3FF' },
    { name: 'Extraction', color: '#5B8FA3' },
    { name: 'Implants', color: '#FFF4C7' },
    { name: 'lab case', color: '#D4C5FF' },
    { name: 'New Patient', color: '#B8F4F4' },
    { name: 'Perio', color: '#E5D5C5' },
    { name: 'Recall/Rec', color: '#FFD5B5' },
    { name: 'Restorative', color: '#FFB5D5' }
  ];

  const statusOptions = [
    'Scheduled',
    'Confirmed',
    'Unconfirmed',
    'Left Msg',
    'In Operatory',
    'Available',
    'In Reception',
    'Checked Out'
  ];

  const procedureCategories = [
    'All',
    'Diagnostic',
    'Preventive',
    'Restorative',
    'Endodontics',
    'Periodontics',
    'Prosthodontics',
    'Oral Surgery',
    'Orthodontics',
    'Implant Services',
    'All Medical'
  ];

  const handleSave = () => {
    onSave({ ...formData, patient, treatments });
    alert('Appointment saved successfully!');
  };

  const handleDeleteAppointment = () => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      alert('Appointment deleted');
      onClose();
    }
  };

  const handleCalcTime = () => {
    const totalDuration = treatments.reduce((sum, t) => sum + t.duration, 0);
    setFormData({ ...formData, duration: totalDuration });
    alert(`Total duration calculated: ${totalDuration} minutes`);
  };

  const handleAddTreatment = () => {
    const newTreatment: Treatment = {
      id: Date.now().toString(),
      status: 'TP',
      code: 'D0120',
      th: '1',
      surf: '',
      description: 'Periodic Oral Evaluation',
      bill: 'Patient',
      duration: 15,
      provider: formData.provider,
      providerUnits: 1,
      estPatient: 50,
      estInsurance: 0,
      fee: 50
    };
    setTreatments([...treatments, newTreatment]);
  };

  const handleDeleteTreatment = (id: string) => {
    setTreatments(treatments.filter(t => t.id !== id));
  };

  const totalEstPatient = treatments.reduce((sum, t) => sum + t.estPatient, 0);
  const totalFee = treatments.reduce((sum, t) => sum + t.fee, 0);

  return (
    <>
      <div className="space-y-4">
        {/* Header with PGID and OID */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white p-3 flex items-center justify-between z-10 border-b-2 border-[#162942] -m-6 mb-3">
          <h2 className="font-bold text-white">ADD / EDIT APPOINTMENT</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-[#B0C4DE] font-medium">PGID:</span>
                <span className="ml-2 font-semibold">{patient.patientId}</span>
              </div>
              <div>
                <span className="text-[#B0C4DE] font-medium">OID:</span>
                <span className="ml-2 font-semibold">OFF-001</span>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-[#162942] p-2 rounded transition-colors">
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
            Personal Information
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Birthdate <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.birthdate}
                disabled
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
              />
            </div>
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                Last Name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                disabled
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
              />
            </div>
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">
                First Name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                disabled
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg bg-gray-100 text-[#64748B] cursor-not-allowed text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CONTACT INFORMATION & OPERATORY SCHEDULING - SIDE BY SIDE */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT: CONTACT INFORMATION */}
          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
            <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
              Contact Information
            </h3>
            
            {/* Email Row */}
            <div className="mb-3">
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">E-Mail</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
                <button
                  onClick={() => setShowEmailModal(true)}
                  disabled={!formData.email}
                  className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send Email"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSMSModal(true)}
                  disabled={!formData.email}
                  className="px-3 py-1.5 bg-[#2FB9A7] text-white rounded-lg hover:bg-[#26a396] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send SMS"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Phone Fields */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Cell Phone</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.cellPhone}
                    onChange={(e) => handlePhoneChange('cellPhone', e.target.value)}
                    onBlur={() => handlePhoneBlur('cellPhone')}
                    className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  />
                  <button
                    onClick={() => setShowSMSModal(true)}
                    disabled={!formData.cellPhone}
                    className="px-3 py-1.5 bg-[#2FB9A7] text-white rounded-lg hover:bg-[#26a396] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bypassPhone}
                    onChange={(e) => setFormData({ ...formData, bypassPhone: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-xs text-[#1E293B]">Bypass</span>
                </label>
                {phoneErrors.cellPhone && (
                  <p className="text-xs text-[#EF4444] mt-1">{phoneErrors.cellPhone}</p>
                )}
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Work Phone</label>
                <input
                  type="tel"
                  value={formData.workPhone}
                  onChange={(e) => handlePhoneChange('workPhone', e.target.value)}
                  onBlur={() => handlePhoneBlur('workPhone')}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
                {phoneErrors.workPhone && (
                  <p className="text-xs text-[#EF4444] mt-1">{phoneErrors.workPhone}</p>
                )}
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Home Phone</label>
                <input
                  type="tel"
                  value={formData.homePhone}
                  onChange={(e) => handlePhoneChange('homePhone', e.target.value)}
                  onBlur={() => handlePhoneBlur('homePhone')}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
                {phoneErrors.homePhone && (
                  <p className="text-xs text-[#EF4444] mt-1">{phoneErrors.homePhone}</p>
                )}
              </div>
            </div>

            {/* Provider Section - MOVED FROM OPERATORY SECTION */}
            <div className="mt-3 bg-[#E8F4F8] border-2 border-[#3A6EA5] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[#1F3A5F] font-bold text-xs uppercase tracking-wide">
                  Assigned Provider
                </label>
                <span className="text-[#2FB9A7] text-xs font-semibold">
                  Auto-populated from Operatory
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 px-3 py-1.5 bg-white border-2 border-[#3A6EA5] rounded-lg text-sm font-semibold text-[#1F3A5F]">
                  {formData.provider}
                </div>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-xs">Change Provider (Optional)</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm bg-white"
                >
                  {availableProviders.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT: OPERATORY & SCHEDULING */}
          <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
            <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
              Operatory & Scheduling
            </h3>
            
            {/* Date Field - FULL WIDTH */}
            <div className="mb-3 relative">
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">Date</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                  className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                  placeholder="MM/DD/YYYY"
                />
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="px-3 py-1.5 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors flex items-center gap-1"
                  title="Select Date"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
              
              {/* Calendar Picker */}
              {showDatePicker && (
                <DatePickerCalendar
                  selectedDate={formData.appointmentDate}
                  onSelectDate={(date) => {
                    setFormData({ ...formData, appointmentDate: date });
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Operatory</label>
                <select
                  value={formData.operatory}
                  onChange={(e) => handleOperatoryChange(e.target.value)}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                >
                  <option>Hygiene</option>
                  <option>Major</option>
                  <option>Minor</option>
                  <option>Surgery</option>
                </select>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Starts At</label>
                <input
                  type="text"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Duration (min)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
            </div>

            {/* Procedure Type */}
            <div className="mb-3">
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">Prod. Type</label>
              <div className="flex gap-2">
                <select
                  value={formData.procedureType}
                  onChange={(e) => setFormData({ ...formData, procedureType: e.target.value })}
                  className="flex-1 px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                >
                  {procedureTypes.map(type => (
                    <option key={type.name} value={type.name}>{type.name}</option>
                  ))}
                </select>
                <div
                  className="w-9 h-9 rounded border-2 border-[#CBD5E1]"
                  style={{ backgroundColor: procedureTypes.find(t => t.name === formData.procedureType)?.color || '#FFF' }}
                  title="Procedure Type Color"
                />
              </div>
            </div>

            {/* Flags Row */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.missed}
                  onChange={(e) => setFormData({ ...formData, missed: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                />
                <span className="text-[#1E293B] font-medium text-sm">Missed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cancelled}
                  onChange={(e) => setFormData({ ...formData, cancelled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                />
                <span className="text-[#1E293B] font-medium text-sm">Cancelled</span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 4: LAB SECTION */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.lab}
              onChange={(e) => setFormData({ ...formData, lab: e.target.checked })}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
            />
            <span className="text-[#1F3A5F] font-bold uppercase tracking-wide text-sm">Lab</span>
          </label>

          {formData.lab && (
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">DDS</label>
                <input
                  type="text"
                  value={formData.labDDS}
                  onChange={(e) => setFormData({ ...formData, labDDS: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Lab Cost</label>
                <input
                  type="number"
                  value={formData.labCost}
                  onChange={(e) => setFormData({ ...formData, labCost: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Sent On</label>
                <input
                  type="date"
                  value={formData.labSentOn}
                  onChange={(e) => setFormData({ ...formData, labSentOn: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Due On</label>
                <input
                  type="date"
                  value={formData.labDueOn}
                  onChange={(e) => setFormData({ ...formData, labDueOn: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[#1E293B] font-medium mb-1 text-sm">Recvd On</label>
                <input
                  type="date"
                  value={formData.labRecvdOn}
                  onChange={(e) => setFormData({ ...formData, labRecvdOn: e.target.value })}
                  className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: NOTES & CAMPAIGN */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <h3 className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide border-b-2 border-[#E2E8F0] pb-1.5 text-sm">
            Notes & Campaign
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">Appointment Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                placeholder="Enter appointment notes..."
              />
              <button className="mt-1.5 text-sm text-[#3A6EA5] hover:text-[#1F3A5F] font-medium">
                + Add Notes Macro
              </button>
            </div>
            <div>
              <label className="block text-[#1E293B] font-medium mb-1 text-sm">Campaign ID</label>
              <input
                type="text"
                value={formData.campaignId}
                onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                className="w-full px-3 py-1.5 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                placeholder="Optional campaign tracking"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: TREATMENTS GRID */}
        <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm">Treatments</h3>
            <div className="flex gap-2">
              <button
                onClick={handleAddTreatment}
                className="bg-[#2FB9A7] text-white px-3 py-1.5 rounded-lg hover:bg-[#26a396] transition-colors flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Add Procedure
              </button>
            </div>
          </div>

          {/* Treatments Table */}
          <div className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden mb-3">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1F3A5F] text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-bold">Status</th>
                    <th className="px-2 py-2 text-left font-bold">Code</th>
                    <th className="px-2 py-2 text-left font-bold">TH</th>
                    <th className="px-2 py-2 text-left font-bold">Surf</th>
                    <th className="px-2 py-2 text-left font-bold">Description</th>
                    <th className="px-2 py-2 text-left font-bold">Bill</th>
                    <th className="px-2 py-2 text-left font-bold">Duration</th>
                    <th className="px-2 py-2 text-left font-bold">Provider</th>
                    <th className="px-2 py-2 text-left font-bold">P. Units</th>
                    <th className="px-2 py-2 text-left font-bold">Est. Patient</th>
                    <th className="px-2 py-2 text-left font-bold">Est. Insurance</th>
                    <th className="px-2 py-2 text-left font-bold">Fee</th>
                    <th className="px-2 py-2 text-left font-bold"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {treatments.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-[#64748B]">
                        No treatments added. Click "Add Procedure" to add treatments.
                      </td>
                    </tr>
                  ) : (
                    treatments.map((treatment, index) => (
                      <tr key={treatment.id} className={`border-b border-[#E2E8F0] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F7F9FC]'}`}>
                        <td className="px-2 py-2">{treatment.status}</td>
                        <td className="px-2 py-2 text-[#3A6EA5] font-semibold">{treatment.code}</td>
                        <td className="px-2 py-2">{treatment.th}</td>
                        <td className="px-2 py-2">{treatment.surf}</td>
                        <td className="px-2 py-2">{treatment.description}</td>
                        <td className="px-2 py-2">{treatment.bill}</td>
                        <td className="px-2 py-2">{treatment.duration}</td>
                        <td className="px-2 py-2">{treatment.provider}</td>
                        <td className="px-2 py-2">{treatment.providerUnits}</td>
                        <td className="px-2 py-2">${treatment.estPatient.toFixed(2)}</td>
                        <td className="px-2 py-2">${treatment.estInsurance.toFixed(2)}</td>
                        <td className="px-2 py-2 font-semibold">${treatment.fee.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => handleDeleteTreatment(treatment.id)}
                            className="text-[#EF4444] hover:text-[#DC2626]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Procedures - REPLACED WITH TABBED INTERFACE */}
          <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-3">
            {/* Tab Headers */}
            <div className="flex gap-1 mb-3 border-b border-[#E2E8F0]">
              <button
                onClick={() => setTreatmentTab('txplans')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  treatmentTab === 'txplans'
                    ? 'bg-[#3A6EA5] text-white rounded-t-lg'
                    : 'text-[#1E293B] hover:bg-[#E2E8F0] rounded-t-lg'
                }`}
              >
                Tx Plans
              </button>
              <button
                onClick={() => setTreatmentTab('quickadd')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  treatmentTab === 'quickadd'
                    ? 'bg-[#3A6EA5] text-white rounded-t-lg'
                    : 'text-[#1E293B] hover:bg-[#E2E8F0] rounded-t-lg'
                }`}
              >
                Quick Add
              </button>
            </div>

            {/* Tab Content */}
            {treatmentTab === 'txplans' ? (
              <TxPlansTab
                onSelectProcedures={(procedures) => {
                  // Convert Tx Plan procedures to treatments
                  const newTreatments: Treatment[] = procedures.map(proc => ({
                    id: Date.now().toString() + Math.random(),
                    status: 'TP',
                    code: proc.code,
                    th: proc.tooth || '',
                    surf: proc.surface || '',
                    description: proc.description,
                    bill: 'Patient',
                    duration: 30,
                    provider: proc.diagnosedProvider,
                    providerUnits: 1,
                    estPatient: proc.fee - proc.insuranceEstimate,
                    estInsurance: proc.insuranceEstimate,
                    fee: proc.fee
                  }));
                  setTreatments([...treatments, ...newTreatments]);
                }}
              />
            ) : (
              <div>
                <h4 className="font-bold text-[#1F3A5F] mb-3 text-sm">QUICK ADD PROCEDURE</h4>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {procedureCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        selectedCategory === category
                          ? 'bg-[#3A6EA5] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#1E293B] hover:border-[#3A6EA5]'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <input
                    type="text"
                    placeholder="By Code"
                    value={searchCodeFilter}
                    onChange={(e) => setSearchCodeFilter(e.target.value)}
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <input
                    type="text"
                    placeholder="By User Code"
                    value={searchUserCodeFilter}
                    onChange={(e) => setSearchUserCodeFilter(e.target.value)}
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <input
                    type="text"
                    placeholder="By Description"
                    value={searchDescriptionFilter}
                    onChange={(e) => setSearchDescriptionFilter(e.target.value)}
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                  <input
                    type="text"
                    placeholder="By Explosion Code"
                    className="px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5]"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm mt-3">
                  {procedureCodes
                    .filter(proc => 
                      (selectedCategory === 'All' || proc.category === selectedCategory) && // FIX 1: Category filtering
                      (searchCodeFilter === '' || proc.code.includes(searchCodeFilter)) &&
                      (searchUserCodeFilter === '' || proc.userCode.includes(searchUserCodeFilter)) &&
                      (searchDescriptionFilter === '' || proc.description.includes(searchDescriptionFilter))
                    )
                    .map(proc => (
                      <button
                        key={proc.code}
                        onClick={() => {
                          setSelectedProcedureForAdd(proc);
                          setShowAddProcedure(true);
                        }}
                        className="px-3 py-2 bg-[#E8F4F8] border border-[#3A6EA5] rounded-lg text-[#1F3A5F] font-semibold"
                      >
                        {proc.code}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-3 bg-[#E8EFF7] border-2 border-[#3A6EA5] rounded-lg p-3">
            <div className="flex justify-end gap-8 font-semibold">
              <div>
                <span className="text-[#64748B]">Total Est. Patient:</span>
                <span className="ml-2 text-[#1F3A5F]">${totalEstPatient.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Total Fee:</span>
                <span className="ml-2 text-[#1F3A5F]">${totalFee.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-between pt-3 border-t-2 border-[#E2E8F0]">
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-5 py-1.5 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium text-sm"
            >
              BACK
            </button>
            <button
              onClick={handleDeleteAppointment}
              className="bg-[#EF4444] text-white px-5 py-1.5 rounded-lg hover:bg-[#DC2626] transition-colors font-medium text-sm"
            >
              Delete Appt
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCalcTime}
              className="bg-[#8B5CF6] text-white px-5 py-1.5 rounded-lg hover:bg-[#7C3AED] transition-colors font-medium text-sm"
            >
              Calc Time
            </button>
            <button
              onClick={() => alert('Insurance Verification opened')}
              className="bg-[#F59E0B] text-white px-5 py-1.5 rounded-lg hover:bg-[#D97706] transition-colors font-medium text-sm"
            >
              Insurance Verification
            </button>
            <button
              onClick={() => alert('Change Provider opened')}
              className="bg-[#6B7280] text-white px-5 py-1.5 rounded-lg hover:bg-[#4B5563] transition-colors font-medium text-sm"
            >
              Change Provider
            </button>
            <button
              onClick={() => alert('Post procedures')}
              className="bg-[#2FB9A7] text-white px-5 py-1.5 rounded-lg hover:bg-[#26a396] transition-colors font-medium text-sm"
            >
              Post
            </button>
            <button
              onClick={handleSave}
              className="bg-[#3A6EA5] text-white px-6 py-1.5 rounded-lg hover:bg-[#1F3A5F] transition-colors font-medium shadow-md text-sm"
            >
              SAVE
            </button>
            <button
              onClick={onClose}
              className="bg-white text-[#64748B] border-2 border-[#E2E8F0] px-5 py-1.5 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      {showEmailModal && (
        <SendEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          patientEmail={formData.email}
          patientName={`${formData.firstName} ${formData.lastName}`}
        />
      )}

      {/* Send SMS Modal (Placeholder) */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border-2 border-[#E2E8F0] p-6">
            <h3 className="font-bold text-[#1F3A5F] mb-4">SEND SMS</h3>
            <textarea
              rows={6}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg mb-4"
              placeholder="Type your message..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSMSModal(false)}
                className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-4 py-2 rounded-lg hover:bg-[#F7F9FC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('SMS sent successfully!');
                  setShowSMSModal(false);
                }}
                className="bg-[#2FB9A7] text-white px-6 py-2 rounded-lg hover:bg-[#26a396] transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Procedure Modal (NEW INTEGRATION) */}
      {showAddProcedure && selectedProcedureForAdd && (
        <AddProcedure
          isOpen={showAddProcedure}
          onClose={() => {
            setShowAddProcedure(false);
            setSelectedProcedureForAdd(null);
          }}
          patientName={patient.name}
          patientId={patient.patientId}
          office={currentOffice}
          initialProcedure={selectedProcedureForAdd}
          onSave={(procedure) => {
            const newTreatment = mapProcedureToTreatment(procedure);
            setTreatments([...treatments, newTreatment]);
            setShowAddProcedure(false);
            setSelectedProcedureForAdd(null);
          }}
        />
      )}
    </>
  );
}