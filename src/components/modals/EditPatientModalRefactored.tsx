import { useState, useReducer, useEffect, useRef } from 'react';
import { PatientFormData, PatientTypes } from './patient/types';
import { patientFormReducer, patientTypesReducer } from './patient/reducers';
import PatientHeader from './patient/PatientHeader';
import PatientIdentitySection from './patient/PatientIdentitySection';
import AddressSection from './patient/AddressSection';
import PatientStatusSection from './patient/PatientStatusSection';
import FooterActions from './patient/FooterActions';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  patientData?: any;
}

const INITIAL_FORM_DATA: PatientFormData = {
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
  referredToDate: '',
};

const INITIAL_PATIENT_TYPES: PatientTypes = {
  child: false,
  collectionProblem: false,
  employeeFamily: false,
  geriatric: false,
  shortNoticeAppointment: false,
  singleParent: false,
  spanishSpeaking: false,
};

export default function EditPatientModal({
  isOpen,
  onClose,
  onSave,
  patientData,
}: EditPatientModalProps) {
  const [formData, dispatchForm] = useReducer(patientFormReducer, INITIAL_FORM_DATA);
  const [patientTypes, dispatchTypes] = useReducer(patientTypesReducer, INITIAL_PATIENT_TYPES);
  const [showSSN, setShowSSN] = useState(false);
  const [isOrthoPatient, setIsOrthoPatient] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus trap and ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus trap
    const modal = modalRef.current;
    if (modal) {
      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen, onClose]);

  const handleFieldChange = (field: keyof PatientFormData, value: any) => {
    dispatchForm({ type: 'SET_FIELD', field, value });
  };

  const handleSave = () => {
    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.dob ||
      !formData.sex ||
      !formData.address1 ||
      !formData.city ||
      !formData.state ||
      !formData.zip
    ) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    onSave({
      ...formData,
      patientTypes,
      isOrthoPatient,
    });
    onClose();
  };

  const handleDelete = () => {
    if (
      window.confirm(
        'Are you sure you want to delete this patient? This action cannot be undone.'
      )
    ) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto border-4 border-[#3A6EA5]"
      >
        <PatientHeader
          isOrthoPatient={isOrthoPatient}
          onOrthoPatientChange={setIsOrthoPatient}
          onClose={onClose}
        />

        <div className="grid grid-cols-12 gap-4 p-4">
          {/* Left Column - Main Form */}
          <div className="col-span-12 space-y-4">
            <PatientIdentitySection
              formData={formData}
              onFieldChange={handleFieldChange}
              showSSN={showSSN}
              onToggleSSN={() => setShowSSN(!showSSN)}
            />

            <AddressSection formData={formData} onFieldChange={handleFieldChange} />

            <PatientStatusSection formData={formData} onFieldChange={handleFieldChange} />
          </div>
        </div>

        <FooterActions onSave={handleSave} onDelete={handleDelete} onClose={onClose} />
      </div>
    </div>
  );
}
