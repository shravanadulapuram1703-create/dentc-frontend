import { X, Calendar, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
// import exampleImage from 'figma:asset/90bc5cb3077c325dbfe1f94d3a79e1997276e001.png';
// import ImageWithFallback from '../figma/ImageWithFallback'

const exampleImage = "C:/Users/Sravan/Pictures/NARENDER_PIC.jpeg";

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  patientData?: any;
}

export default function EditPatientModal({ isOpen, onClose, onSave, patientData }: EditPatientModalProps) {
  const [showSSN, setShowSSN] = useState(false);
  const [showAppointmentTimes, setShowAppointmentTimes] = useState(false);
  const [patientNote, setPatientNote] = useState('');
  const [hipaaNote, setHipaaNote] = useState('');
  const [isOrthoPatient, setIsOrthoPatient] = useState(false);
  const [studentStatus, setStudentStatus] = useState('No');

  // Form state
  const [formData, setFormData] = useState({
    patientId: '900097',
    respPartyId: '900068',
    title: '',
    preferredName: 'Nick',
    pronouns: 'Please Select',
    firstName: 'Nicolas',
    lastName: 'Miller',
    dob: '12/08/1993',
    sex: 'Male',
    email: '',
    address1: '910 Watson St.',
    address2: '',
    city: 'Coraopolis',
    state: 'PA',
    zip: '15108',
    maritalStatus: 'Single',
    ethnicity: 'Nothing selected',
    referralType: 'Patient',
    referredBy: '',
    preferredLanguage: 'English',
    heightFt: '0',
    heightIn: '0.00',
    weight: '0',
    weightUnit: 'lbs',
    chartNum: '',
    ssn: '',
    driverLicense: '',
    mediId: '',
    homePhone: '814-473-3058',
    cellPhone: '814-473-3058',
    workPhone: '',
    preferredContactMethod: 'No Preference',
    schoolName: '',
    active: true,
    noAutoSMS: false,
    noAutoEmail: false,
    assignBenefitsToPatient: false,
    noCorrespondence: false,
    hipaaAgreement: true,
    addToQuickFill: false,
    preferredAppointmentTimes: 'Please Select',
    healthcareGuardianName: '',
    healthcareGuardianPhone: '',
    emergencyContact: '',
    emergencyPhone: '',
    feeSchedule: 'United Concordia PPO Plans - Excel',
    preferredProvider: '2022 - Jinna, Dhileep',
    preferredHygienist: 'None',
    referredTo: 'Please Select',
    referredToDate: ''
  });

  const [patientTypes, setPatientTypes] = useState({
    child: false,
    collectionProblem: false,
    employeeFamily: false,
    geriatric: false,
    shortNoticeAppointment: false,
    singleParent: false,
    spanishSpeaking: false
  });

  const [appointmentPreferences, setAppointmentPreferences] = useState({
    mon: { am: false, pm: false },
    tue: { am: false, pm: false },
    wed: { am: false, pm: false },
    thu: { am: false, pm: false },
    fri: { am: false, pm: false },
    sat: { am: false, pm: false },
    sun: { am: false, pm: false }
  });

  const ethnicityOptions = [
    'Nothing selected',
    'Hispanic or Latino',
    'Not Hispanic or Latino',
    'Declined to Specify'
  ];

  const referralTypeOptions = [
    'Patient',
    'Doctor',
    'Friend/Family',
    'Insurance',
    'Website',
    'Social Media',
    'Advertisement',
    'Walk-in',
    'Other'
  ];

  const contactMethodOptions = [
    'No Preference',
    'Home Phone',
    'Cell Phone',
    'Work Phone',
    'Email',
    'Text Message'
  ];

  const handleAppointmentTimeCheckAll = () => {
    const allChecked = {
      mon: { am: true, pm: true },
      tue: { am: true, pm: true },
      wed: { am: true, pm: true },
      thu: { am: true, pm: true },
      fri: { am: true, pm: true },
      sat: { am: true, pm: true },
      sun: { am: true, pm: true }
    };
    setAppointmentPreferences(allChecked);
  };

  const handleAppointmentTimeReset = () => {
    const allUnchecked = {
      mon: { am: false, pm: false },
      tue: { am: false, pm: false },
      wed: { am: false, pm: false },
      thu: { am: false, pm: false },
      fri: { am: false, pm: false },
      sat: { am: false, pm: false },
      sun: { am: false, pm: false }
    };
    setAppointmentPreferences(allUnchecked);
  };

  const handleSave = () => {
    // Validation for required fields
    if (!formData.firstName || !formData.lastName || !formData.dob || !formData.sex || 
        !formData.address1 || !formData.city || !formData.state || !formData.zip) {
      alert('Please fill in all required fields marked with *');
      return;
    }
    
    onSave({
      ...formData,
      patientTypes,
      appointmentPreferences,
      patientNote,
      hipaaNote
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      // Delete logic here
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-red-600 text-white p-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-white">PATIENT INFORMATION</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOrthoPatient}
                  onChange={(e) => setIsOrthoPatient(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Ortho Patient</span>
              </label>
            </div>
            <div className="text-white text-sm mt-1">
              Modified By: UDAFIX Modified On: 12/21/2025 10:23 AM PT
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-red-700 p-2 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Top Bar Info */}
        <div className="bg-gray-100 p-3 border-b flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>Home Office: <span className="text-gray-900">MOON</span></div>
            <div>First Visit: <span className="text-gray-900">09/08/2015</span></div>
            <div>Exit Pnt: <span className="text-gray-900">-1639.69</span></div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 p-6">
          {/* Left Column - Main Form */}
          <div className="col-span-8 space-y-6">
            {/* Patient ID and Resp Party ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">Patient ID</label>
                <input
                  type="text"
                  value={formData.patientId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Resp Party ID</label>
                <input
                  type="text"
                  value={formData.respPartyId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
                />
              </div>
            </div>

            {/* Title, Preferred Name, Pronouns */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">Title</label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value=""></option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Preferred Name</label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="Nick"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Pronouns</label>
                <select
                  value={formData.pronouns}
                  onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Please Select">Please Select</option>
                  <option value="He/Him">He/Him</option>
                  <option value="She/Her">She/Her</option>
                  <option value="They/Them">They/Them</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* First Name, Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* DOB, Age, Sex */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-gray-700 mb-1">
                  Birth Date <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    placeholder="MM/DD/YYYY"
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Age</label>
                <input
                  type="text"
                  value="32"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Sex <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Marital Status, Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-gray-700 mb-1">
                Address <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.address1}
                onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
              />
              <label className="block text-gray-700 mb-1">Address 2</label>
              <input
                type="text"
                value={formData.address2}
                onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* City, State, Zip */}
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3">
                <label className="block text-gray-700 mb-1">
                  City, State & Zip <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-gray-700 mb-1">&nbsp;</label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="PA">PA</option>
                  <option value="OH">OH</option>
                  <option value="NY">NY</option>
                  <option value="NJ">NJ</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 mb-1">&nbsp;</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* PATIENT STATUS Section */}
            <div className="border-t pt-4">
              <h3 className="text-red-600 mb-4">PATIENT STATUS</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Ethnicity</label>
                  <select
                    value={formData.ethnicity}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {ethnicityOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Referral Type <span className="text-red-600">*</span></label>
                  <select
                    value={formData.referralType}
                    onChange={(e) => setFormData({ ...formData, referralType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {referralTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Referred By</label>
                  <input
                    type="text"
                    value={formData.referredBy}
                    onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Preferred Language</label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-gray-700 mb-1">Height & Weight</label>
                  <input
                    type="text"
                    value={formData.heightFt}
                    onChange={(e) => setFormData({ ...formData, heightFt: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">&nbsp;</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.heightIn}
                      onChange={(e) => setFormData({ ...formData, heightIn: e.target.value })}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-600">in</span>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">&nbsp;</label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">&nbsp;</label>
                  <select
                    value={formData.weightUnit}
                    onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PATIENT NOTE Section */}
            <div className="border-t pt-4">
              <h3 className="text-red-600 mb-4">PATIENT NOTE</h3>
              <div className="space-y-4">
                {/* Identity & Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Chart #</label>
                    <input
                      type="text"
                      value={formData.chartNum}
                      onChange={(e) => setFormData({ ...formData, chartNum: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">SSN</label>
                    <div className="flex gap-2">
                      <input
                        type={showSSN ? 'text' : 'password'}
                        value={formData.ssn}
                        onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                        placeholder="***-**-****"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSSN(!showSSN)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {showSSN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span className="ml-2">SHOW</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Driver License</label>
                    <input
                      type="text"
                      value={formData.driverLicense}
                      onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Medi ID</label>
                    <input
                      type="text"
                      value={formData.mediId}
                      onChange={(e) => setFormData({ ...formData, mediId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Home #</label>
                    <input
                      type="text"
                      value={formData.homePhone}
                      onChange={(e) => setFormData({ ...formData, homePhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Cell #</label>
                    <input
                      type="text"
                      value={formData.cellPhone}
                      onChange={(e) => setFormData({ ...formData, cellPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Work #</label>
                    <input
                      type="text"
                      value={formData.workPhone}
                      onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Pref Contact Method</label>
                    <select
                      value={formData.preferredContactMethod}
                      onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {contactMethodOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Student Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Student</label>
                    <select
                      value={studentStatus}
                      onChange={(e) => setStudentStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="No">No</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Full-time">Full-time</option>
                    </select>
                  </div>
                  {studentStatus !== 'No' && (
                    <div>
                      <label className="block text-gray-700 mb-1">School Name</label>
                      <input
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noAutoSMS}
                      onChange={(e) => setFormData({ ...formData, noAutoSMS: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">No Auto SMS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignBenefitsToPatient}
                      onChange={(e) => setFormData({ ...formData, assignBenefitsToPatient: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">Assign Benefits to Patient</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noAutoEmail}
                      onChange={(e) => setFormData({ ...formData, noAutoEmail: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">No Auto Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noCorrespondence}
                      onChange={(e) => setFormData({ ...formData, noCorrespondence: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">No Correspondence</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hipaaAgreement}
                      onChange={(e) => setFormData({ ...formData, hipaaAgreement: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">HIPAA Agreement</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.addToQuickFill}
                      onChange={(e) => setFormData({ ...formData, addToQuickFill: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">Add Patient to Quick-Fill List</span>
                  </label>
                </div>

                {/* Preferred Appointment Times */}
                <div>
                  <label className="block text-gray-700 mb-1">Preferred Appointment Times</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.preferredAppointmentTimes}
                      onChange={(e) => setFormData({ ...formData, preferredAppointmentTimes: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Please Select">Please Select</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAppointmentTimes(true)}
                      className="px-4 py-2 text-red-600 hover:underline"
                    >
                      Preferred Appointment Times
                    </button>
                  </div>
                </div>

                {/* Patient Note */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-700">Allowed 1000 Characters</label>
                    <span className="text-gray-500">Remaining {1000 - patientNote.length} Characters</span>
                  </div>
                  <textarea
                    value={patientNote}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        setPatientNote(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 h-24"
                  />
                </div>

                {/* HIPAA Information Sharing */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-red-600">HIPAA INFORMATION SHARING</label>
                    <span className="text-gray-500">Allowed 1000 Characters</span>
                  </div>
                  <div className="text-right mb-1">
                    <span className="text-gray-500">Remaining {1000 - hipaaNote.length} Characters</span>
                  </div>
                  <textarea
                    value={hipaaNote}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        setHipaaNote(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 h-24"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Patient Type & Office Settings */}
          <div className="col-span-4 space-y-6">
            {/* Patient Type */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-gray-900 mb-3">Patient Type</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.child}
                    onChange={(e) => setPatientTypes({ ...patientTypes, child: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">CH - Child</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.collectionProblem}
                    onChange={(e) => setPatientTypes({ ...patientTypes, collectionProblem: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">CP - Collection Problem, See Notes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.employeeFamily}
                    onChange={(e) => setPatientTypes({ ...patientTypes, employeeFamily: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">EF - Employee & Family</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.geriatric}
                    onChange={(e) => setPatientTypes({ ...patientTypes, geriatric: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">GR - Geriatric</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.shortNoticeAppointment}
                    onChange={(e) => setPatientTypes({ ...patientTypes, shortNoticeAppointment: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">SN - Short Notice Appointment</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.singleParent}
                    onChange={(e) => setPatientTypes({ ...patientTypes, singleParent: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">SP - Single Parent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientTypes.spanishSpeaking}
                    onChange={(e) => setPatientTypes({ ...patientTypes, spanishSpeaking: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">SS - Spanish Speaking</span>
                </label>
              </div>
            </div>

            {/* Health Care Guardian */}
            <div>
              <label className="block text-gray-700 mb-1">Health Care Guardian Name</label>
              <input
                type="text"
                value={formData.healthcareGuardianName}
                onChange={(e) => setFormData({ ...formData, healthcareGuardianName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
              />
              <label className="block text-gray-700 mb-1">Health Care Guardian Phone</label>
              <input
                type="text"
                value={formData.healthcareGuardianPhone}
                onChange={(e) => setFormData({ ...formData, healthcareGuardianPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-gray-700 mb-1">Emergency Contact</label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
              />
              <label className="block text-gray-700 mb-1">Emergency Phone</label>
              <input
                type="text"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* OFFICE Section */}
            <div className="border-t pt-4">
              <h3 className="text-red-600 mb-3">OFFICE</h3>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 text-gray-700 mb-1">
                    Fee Schedule
                    <span className="text-blue-600 cursor-pointer hover:underline">ℹ️</span>
                  </label>
                  <select
                    value={formData.feeSchedule}
                    onChange={(e) => setFormData({ ...formData, feeSchedule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="United Concordia PPO Plans - Excel">United Concordia PPO Plans - Excel</option>
                    <option value="Standard Fee">Standard Fee</option>
                    <option value="PPO Plan">PPO Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Pref Provider</label>
                  <select
                    value={formData.preferredProvider}
                    onChange={(e) => setFormData({ ...formData, preferredProvider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="2022 - Jinna, Dhileep">2022 - Jinna, Dhileep</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Pref Hygienist</label>
                  <select
                    value={formData.preferredHygienist}
                    onChange={(e) => setFormData({ ...formData, preferredHygienist: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Referred To</label>
                  <select
                    value={formData.referredTo}
                    onChange={(e) => setFormData({ ...formData, referredTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Please Select">Please Select</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Ref To Date</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.referredToDate}
                      onChange={(e) => setFormData({ ...formData, referredToDate: e.target.value })}
                      placeholder="MM/DD/YYYY"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between">
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              UPDATE ADDRESSES
            </button>
            <button className="px-4 py-2 bg-yellow-500 text-gray-900 rounded hover:bg-yellow-600">
              MOVE PATIENTS
            </button>
            <button 
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              DELETE PATIENT
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              PATIENT PICTURE
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              PATIENT FINGERPRINT
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              SAVE
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Times Popup */}
      {showAppointmentTimes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="bg-red-600 text-white p-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-white">Preferred Appointment Times</h3>
              <button onClick={() => setShowAppointmentTimes(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2">Day</th>
                    <th className="border border-gray-300 px-4 py-2">AM</th>
                    <th className="border border-gray-300 px-4 py-2">PM</th>
                  </tr>
                </thead>
                <tbody>
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                    <tr key={day}>
                      <td className="border border-gray-300 px-4 py-2 capitalize">{day}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={appointmentPreferences[day as keyof typeof appointmentPreferences].am}
                          onChange={(e) => setAppointmentPreferences({
                            ...appointmentPreferences,
                            [day]: { ...appointmentPreferences[day as keyof typeof appointmentPreferences], am: e.target.checked }
                          })}
                          className="w-5 h-5"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={appointmentPreferences[day as keyof typeof appointmentPreferences].pm}
                          onChange={(e) => setAppointmentPreferences({
                            ...appointmentPreferences,
                            [day]: { ...appointmentPreferences[day as keyof typeof appointmentPreferences], pm: e.target.checked }
                          })}
                          className="w-5 h-5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={handleAppointmentTimeCheckAll}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Check All
                </button>
                <button 
                  onClick={handleAppointmentTimeReset}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setShowAppointmentTimes(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}