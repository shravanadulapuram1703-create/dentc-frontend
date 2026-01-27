import { X, Calendar, Eye, EyeOff, Loader2, AlertCircle, AlertTriangle, Search, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { 
  getFeeSchedules, 
  type FeeSchedule,
  getProcedureCodesByFeeSchedule 
} from "../../api/feeSchedules";
import { 
  fetchPatientMetadata,
  type PatientMetadataResponse,
  type PatientTypeOption,
} from "../../services/patientMetadataApi";
import { 
  getPatientDetails, 
  updatePatientFull,
  type PatientDetails as ApiPatientDetails,
  type PatientUpdateRequestFull
} from "../../services/patientApi";
import { fetchProviders, type Provider } from "../../services/schedulerApi";

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  patientId: string | number; // Changed from patientData to patientId
  currentOffice?: string; // Optional - will use useAuth() if not provided
}

// Shared PatientFormData interface (same as AddNewPatient)
interface PatientFormData {
  // Identity Gate (Required to unlock)
  birthdate: string;
  lastName: string;
  firstName: string;

  // Additional Details
  title: string;
  preferredName: string;
  pronouns: string;

  // Address
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;

  // Contact
  phone: string;
  cellPhone: string;
  workPhone: string;
  email: string;

  // SSN
  ssn: string;

  // Additional Identification
  chartNo: string;
  driverLicense: string;
  mediId: string;
  studentStatus: string;
  schoolName: string;

  // Demographics
  maritalStatus: string;
  sex: string;

  // Health Care Guardian
  guardianName: string;
  guardianPhone: string;

  // Patient Status Flags
  active: boolean;
  assignBenefits: boolean;
  hipaaAgreement: boolean;
  noCorrespondence: boolean;
  noAutoEmail: boolean;
  noAutoSMS: boolean;
  addToQuickFill: boolean;

  // Coverage Type
  noCoverage: boolean;
  primaryDental: boolean;
  secondaryDental: boolean;
  primaryMedical: boolean;
  secondaryMedical: boolean;

  // Office & Provider
  office: string;
  feeSchedule: string; // Display name for UI
  feeScheduleId: string; // Backend ID
  preferredProvider: string;
  preferredHygienist: string;

  // Referral
  referralType: string;
  referredBy: string;
  referredTo: string;
  referralToDate: string;

  // Responsible Party
  relToResp: string;

  // Preferred Contact
  preferredContact: string;

  // Notes
  patientNotes: string;
  hipaaSharing: string;

  // Starting Balances
  balanceCurrent: string;
  balanceOver30: string;
  balanceOver60: string;
  balanceOver90: string;
  balanceOver120: string;

  // Audit Info (Edit only)
  modifiedBy: string;
  modifiedOn: string;
}

export default function EditPatientModal({
  isOpen,
  onClose,
  onSave,
  patientId,
  currentOffice: propCurrentOffice,
}: EditPatientModalProps) {
  const { currentOffice: authCurrentOffice } = useAuth();
  const currentOffice = propCurrentOffice || authCurrentOffice || "";
  const [showSSN, setShowSSN] = useState(false);
  const [isOrthoPatient, setIsOrthoPatient] = useState(false);

  // Loading and error states
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Metadata state
  const [metadata, setMetadata] = useState<PatientMetadataResponse | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [hygienists, setHygienists] = useState<Provider[]>([]);
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingFeeSchedules, setLoadingFeeSchedules] = useState(false);
  const [feeScheduleError, setFeeScheduleError] = useState<string | null>(null);
  const [patientTypesMetadata, setPatientTypesMetadata] = useState<PatientTypeOption[]>([]);
  
  // Fee Schedule Change Warning Modal
  const [showFeeScheduleWarning, setShowFeeScheduleWarning] = useState(false);
  const [pendingFeeSchedule, setPendingFeeSchedule] = useState<{ id: string; name: string } | null>(null);

  // Form state (same structure as AddNewPatient)
  const [formData, setFormData] = useState<PatientFormData>({
    // Identity Gate
    birthdate: "",
    lastName: "",
    firstName: "",

    // Additional Details
    title: "",
    preferredName: "",
    pronouns: "Please Select",

    // Address
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",

    // Contact
    phone: "",
    cellPhone: "",
    workPhone: "",
    email: "",

    // SSN
    ssn: "",

    // Additional Identification
    chartNo: "",
    driverLicense: "",
    mediId: "",
    studentStatus: "No",
    schoolName: "",

    // Demographics
    maritalStatus: "Single",
    sex: "",

    // Guardian
    guardianName: "",
    guardianPhone: "",

    // Status Flags
    active: true,
    assignBenefits: false,
    hipaaAgreement: false,
    noCorrespondence: false,
    noAutoEmail: false,
    noAutoSMS: false,
    addToQuickFill: false,

    // Coverage
    noCoverage: true,
    primaryDental: false,
    secondaryDental: false,
    primaryMedical: false,
    secondaryMedical: false,

    // Office & Provider
    office: currentOffice || "",
    feeSchedule: "",
    feeScheduleId: "",
    preferredProvider: "",
    preferredHygienist: "None",

    // Referral
    referralType: "",
    referredBy: "",
    referredTo: "",
    referralToDate: "",

    // Responsible Party
    relToResp: "Please Select",

    // Preferred Contact
    preferredContact: "No Preference",

    // Notes
    patientNotes: "",
    hipaaSharing: "",

    // Balances
    balanceCurrent: "0.00",
    balanceOver30: "0.00",
    balanceOver60: "0.00",
    balanceOver90: "0.00",
    balanceOver120: "0.00",

    // Audit Info (Edit only)
    modifiedBy: "",
    modifiedOn: "",
  });

  // Patient Types state (same structure as AddNewPatient)
  const [patientTypes, setPatientTypes] = useState({
    CH: false, // Child
    CP: false, // Collection Problem
    EF: false, // Employee & Family
    OR: false, // Ortho Patient
    SN: false, // Short Notice Appointment
    SR: false, // Senior Citizen
    SS: false, // Spanish Speaking
  });

  // Helper function to calculate age from birthdate (same as AddNewPatient)
  const calculateAge = (birthdate: string): string => {
    if (!birthdate) return "";
    
    const today = new Date();
    const birthDate = new Date(birthdate);
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) return "";
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Return empty string for negative ages (future dates)
    return age >= 0 ? age.toString() : "";
  };

  // Helper function to format date from YYYY-MM-DD to MM/DD/YYYY for display
  const formatDateForDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper function to format SSN for display (XXX-XX-XXXX)
  const formatSSNForDisplay = (ssn: string | null | undefined): string => {
    if (!ssn) return "";
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
    }
    return cleaned;
  };

  // Add timestamp to notes (same as AddNewPatient)
  const addTimestamp = (field: "patientNotes" | "hipaaSharing") => {
    const timestamp = new Date().toLocaleString();
    setFormData({
      ...formData,
      [field]: formData[field] + `\n[${timestamp}] `,
    });
  };

  // Identity Gate Logic (for edit mode, should always be complete)
  const isIdentityComplete =
    formData.birthdate.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.firstName.trim() !== "";

  // Helper function to map PatientDetails API response to formData
  const mapPatientDetailsToFormData = (patient: ApiPatientDetails): PatientFormData => {
    // Map gender code to display name
    const genderMap: Record<string, string> = {
      'M': 'Male',
      'F': 'Female',
      'O': 'Other'
    };
    const genderDisplay = patient.gender ? genderMap[patient.gender] || patient.gender : "";

    // Map patient flags to checkbox state
    const patientTypesFromApi = {
      CH: patient.patient_flags?.is_child ?? false,
      CP: patient.patient_flags?.is_collection_problem ?? false,
      EF: patient.patient_flags?.is_employee_family ?? false,
      OR: patient.patient_flags?.is_ortho ?? false,
      SN: patient.patient_flags?.is_short_notice ?? false,
      SR: patient.patient_flags?.is_senior ?? false,
      SS: patient.patient_flags?.is_spanish_speaking ?? false,
    };
    setPatientTypes(patientTypesFromApi);
    setIsOrthoPatient(patientTypesFromApi.OR);

    // Preferred Contact - keep API value directly (matches AddNewPatient.tsx)
    const preferredContactValue = patient.contact?.preferred_contact || "No Preference";

    return {
      // Identity
      birthdate: patient.dob || "",
      lastName: patient.last_name || "",
      firstName: patient.first_name || "",
      title: patient.title || "",
      preferredName: patient.preferred_name || "",
      pronouns: patient.pronouns || "Please Select",

      // Address
      address1: patient.address?.address_line_1 || "",
      address2: patient.address?.address_line_2 || "",
      city: patient.address?.city || "",
      state: patient.address?.state || "",
      zip: patient.address?.zip || "",

      // Contact
      phone: patient.contact?.home_phone || "",
      cellPhone: patient.contact?.cell_phone || "",
      workPhone: patient.contact?.work_phone || "",
      email: patient.contact?.email || "",
      preferredContact: preferredContactValue,

      // SSN - Format if available (may need to be added to API)
      ssn: (patient as any).ssn ? formatSSNForDisplay((patient as any).ssn) : "",

      // Additional Identification (may need to be added to API)
      chartNo: patient.chart_no || "",
      driverLicense: (patient as any).driver_license || "",
      mediId: (patient as any).medi_id || "",
      studentStatus: (patient as any).student_status || "No",
      schoolName: (patient as any).school_name || "",

      // Demographics
      maritalStatus: patient.marital_status || "Single",
      sex: genderDisplay,

      // Guardian - Check both nested and root level
      guardianName: patient.guardian?.guardian_name || patient.guardian_name || "",
      guardianPhone: patient.guardian?.guardian_phone || patient.guardian_phone || "",

      // Status Flags
      active: patient.patient_flags?.is_active ?? true,
      assignBenefits: patient.patient_flags?.assign_benefits ?? false,
      hipaaAgreement: patient.patient_flags?.hipaa_agreement ?? false,
      noCorrespondence: patient.patient_flags?.no_correspondence ?? false,
      noAutoEmail: patient.patient_flags?.no_auto_email ?? false,
      noAutoSMS: patient.patient_flags?.no_auto_sms ?? false,
      addToQuickFill: patient.patient_flags?.add_to_quickfill ?? false,

      // Coverage - Not available in PatientDetails API, will need to be fetched separately or added to API
      noCoverage: !patient.insurance?.primary_dental && !patient.insurance?.secondary_dental && !patient.insurance?.primary_medical && !patient.insurance?.secondary_medical,
      primaryDental: !!patient.insurance?.primary_dental,
      secondaryDental: !!patient.insurance?.secondary_dental,
      primaryMedical: !!patient.insurance?.primary_medical,
      secondaryMedical: !!patient.insurance?.secondary_medical,

      // Office & Provider
      office: patient.office?.home_office_name || currentOffice || "",
      feeSchedule: patient.fee_schedule?.fee_schedule_name || "",
      feeScheduleId: patient.fee_schedule?.fee_schedule_id || "",
      preferredProvider: patient.provider?.preferred_provider_id || "",
      preferredHygienist: patient.provider?.preferred_hygienist_id || "None",

      // Referral
      referralType: patient.referral?.referral_type || "",
      referredBy: patient.referral?.referred_by || "",
      referredTo: (patient as any).referral?.referred_to || "",
      referralToDate: (patient as any).referral?.referral_to_date || "",

      // Responsible Party
      relToResp: patient.responsible_party?.relationship || "Please Select",

      // Notes
      patientNotes: patient.notes?.patient_notes || "",
      hipaaSharing: patient.notes?.hipaa_sharing || "",

      // Balances - Use aging from balances if available
      balanceCurrent: patient.balances?.aging?.current?.toString() || "0.00",
      balanceOver30: patient.balances?.aging?.over_30?.toString() || "0.00",
      balanceOver60: patient.balances?.aging?.over_60?.toString() || "0.00",
      balanceOver90: patient.balances?.aging?.over_90?.toString() || "0.00",
      balanceOver120: patient.balances?.aging?.over_120?.toString() || "0.00",

      // Audit Info (Edit only)
      modifiedBy: (patient as any).updated_by || (patient as any).modified_by || "", // Should come from API
      modifiedOn: patient.updated_at ? formatDateForDisplay(patient.updated_at) : "",
    };
  };

  // Load metadata on mount (same as AddNewPatient)
  useEffect(() => {
    if (!isOpen) return;

    const loadMetadata = async () => {
      setIsLoadingMetadata(true);
      setMetadataError(null);
      
      try {
        // Load patient metadata (titles, pronouns, states, etc.)
        const metadataResponse = await fetchPatientMetadata();
        setMetadata(metadataResponse);
        setPatientTypesMetadata(metadataResponse.patient_types);
        
        // Load providers
        setLoadingProviders(true);
        try {
          const providersList = await fetchProviders(currentOffice);
          setProviders(providersList);
          // Filter hygienists (assuming they have a type or role field)
          // For now, we'll use all providers as potential hygienists
          setHygienists(providersList);
        } catch (error) {
          console.error('Error loading providers:', error);
        } finally {
          setLoadingProviders(false);
        }
        
        // Load fee schedules
        setLoadingFeeSchedules(true);
        try {
          const response = await getFeeSchedules(currentOffice);
          setFeeSchedules(response.feeSchedules);
        } catch (error) {
          console.error('Error loading fee schedules:', error);
          setFeeScheduleError('Failed to load fee schedules. Using default values.');
        } finally {
          setLoadingFeeSchedules(false);
        }
      } catch (error) {
        console.error('Error loading metadata:', error);
        setMetadataError('Failed to load form metadata. Some fields may not be available.');
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [isOpen, currentOffice]);

  // Fee Schedule Change Handler (same as AddNewPatient)
  const handleFeeScheduleChange = async (feeScheduleId: string) => {
    const selectedSchedule = feeSchedules.find(fs => fs.feeScheduleId === feeScheduleId);
    
    if (!selectedSchedule) return;

    // If fee schedule is being changed (not initial selection), show warning
    if (formData.feeScheduleId && formData.feeScheduleId !== feeScheduleId) {
      setPendingFeeSchedule({
        id: selectedSchedule.feeScheduleId,
        name: selectedSchedule.feeScheduleName,
      });
      setShowFeeScheduleWarning(true);
      return;
    }

    // Direct update for initial selection
    setFormData({
      ...formData,
      feeSchedule: selectedSchedule.feeScheduleName,
      feeScheduleId: selectedSchedule.feeScheduleId,
    });

    // Preload procedure codes for this fee schedule
    try {
      await getProcedureCodesByFeeSchedule(selectedSchedule.feeScheduleId);
    } catch (error) {
      console.warn('Failed to preload procedure codes:', error);
    }
  };

  // Confirm Fee Schedule Change
  const confirmFeeScheduleChange = () => {
    if (pendingFeeSchedule) {
      setFormData({
        ...formData,
        feeSchedule: pendingFeeSchedule.name,
        feeScheduleId: pendingFeeSchedule.id,
      });
      
      // TODO: Clear any selected procedures in treatment plan
      console.log('Fee schedule changed - clearing dependent data');
    }
    
    setShowFeeScheduleWarning(false);
    setPendingFeeSchedule(null);
  };

  // Cancel Fee Schedule Change
  const cancelFeeScheduleChange = () => {
    setShowFeeScheduleWarning(false);
    setPendingFeeSchedule(null);
  };

  // Load patient details when modal opens
  useEffect(() => {
    if (!isOpen || !patientId) return;

    const loadPatientData = async () => {
      setIsLoadingPatient(true);
      setPatientError(null);

      try {
        const patientDetails = await getPatientDetails(patientId);
        const mappedFormData = mapPatientDetailsToFormData(patientDetails);
        setFormData(mappedFormData);
      } catch (error: any) {
        console.error('Error loading patient details:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to load patient details';
        setPatientError(errorMessage);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    loadPatientData();
  }, [isOpen, patientId, currentOffice]);

  const handleSave = async () => {
    // Validation for required fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.birthdate ||
      !formData.sex ||
      !formData.address1 ||
      !formData.city ||
      !formData.state ||
      !formData.zip
    ) {
      alert("Please fill in all required fields marked with *");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Extract numeric office ID
      const extractOfficeIdNumber = (officeId?: string): number | undefined => {
        if (!officeId) return undefined;
        if (/^\d+$/.test(officeId)) return parseInt(officeId, 10);
        const match = officeId.match(/(\d+)$/);
        return match && match[1] ? parseInt(match[1], 10) : undefined;
      };

      const officeIdNum = extractOfficeIdNumber(currentOffice);
      if (!officeIdNum) {
        throw new Error("Invalid office ID");
      }

      // Convert form data to API format (same as AddNewPatient)
      const patientTypesArray = Object.entries(patientTypes)
        .filter(([_, checked]) => checked)
        .map(([code, _]) => code);

      // Determine patient type (general or ortho)
      const patientType = patientTypes.OR ? "Ortho" : "General";

      // Convert DOB from date input format (YYYY-MM-DD) to API format
      const dobFormatted = formData.birthdate; // Already in YYYY-MM-DD format

      // Convert gender from display name to code
      const genderOption = metadata?.genders.find(g => g.name === formData.sex);
      const genderCode = genderOption?.code === "M" ? "M" : genderOption?.code === "F" ? "F" : "O";

      // Preferred Contact - send value directly (matches AddNewPatient.tsx)
      const preferredContactApi = formData.preferredContact !== "No Preference" && formData.preferredContact !== ""
        ? formData.preferredContact
        : undefined;

      // Helper to conditionally include properties
      const optional = <T,>(value: T | null | undefined | ""): T | undefined => {
        return (value === null || value === undefined || value === "") ? undefined : value;
      };

      const payload: PatientUpdateRequestFull = {
        identity: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          ...(formData.preferredName && { preferred_name: formData.preferredName }),
          dob: dobFormatted,
          gender: genderCode as "M" | "F" | "O",
          ...(formData.title && { title: formData.title }),
          ...(formData.pronouns !== "Please Select" && { pronouns: formData.pronouns }),
          ...(formData.maritalStatus && { marital_status: formData.maritalStatus }),
          ...(formData.ssn && { ssn: formData.ssn.replace(/\D/g, '') }),
          ...(formData.chartNo && { chart_no: formData.chartNo }),
          ...(formData.driverLicense && { driver_license: formData.driverLicense }),
          ...(formData.mediId && { medi_id: formData.mediId }),
          ...(formData.studentStatus !== "No" && { student_status: formData.studentStatus }),
          ...(formData.studentStatus !== "No" && formData.schoolName && { school_name: formData.schoolName }),
        },
        address: {
          ...(formData.address1 && { address_line_1: formData.address1 }),
          ...(formData.address2 && { address_line_2: formData.address2 }),
          ...(formData.city && { city: formData.city }),
          ...(formData.state && { state: formData.state }),
          ...(formData.zip && { zip: formData.zip }),
        },
        contact: {
          ...(formData.phone && { home_phone: formData.phone }),
          ...(formData.cellPhone && { cell_phone: formData.cellPhone }),
          ...(formData.workPhone && { work_phone: formData.workPhone }),
          ...(formData.email && { email: formData.email }),
          ...(preferredContactApi && { preferred_contact: preferredContactApi }),
        },
        office: {
          home_office_id: officeIdNum,
        },
        ...(formData.preferredProvider && {
          provider: {
            ...(formData.preferredProvider && { preferred_provider_id: formData.preferredProvider }),
            ...(formData.preferredHygienist !== "None" && { preferred_hygienist_id: formData.preferredHygienist }),
          },
        }),
        ...(formData.feeScheduleId && {
          fee_schedule: {
            fee_schedule_id: formData.feeScheduleId,
          },
        }),
        patient_type: patientType,
        patient_flags: {
          is_ortho: patientTypes.OR,
          is_child: patientTypes.CH,
          is_collection_problem: patientTypes.CP,
          is_employee_family: patientTypes.EF,
          is_short_notice: patientTypes.SN,
          is_senior: patientTypes.SR,
          is_spanish_speaking: patientTypes.SS,
          assign_benefits: formData.assignBenefits,
          hipaa_agreement: formData.hipaaAgreement,
          no_correspondence: formData.noCorrespondence,
          no_auto_email: formData.noAutoEmail,
          no_auto_sms: formData.noAutoSMS,
          add_to_quickfill: formData.addToQuickFill,
        },
        ...(formData.relToResp !== "Please Select" && {
          responsible_party: {
            relationship: formData.relToResp,
          },
        }),
        coverage: {
          no_coverage: formData.noCoverage,
          primary_dental: formData.primaryDental,
          secondary_dental: formData.secondaryDental,
          primary_medical: formData.primaryMedical,
          secondary_medical: formData.secondaryMedical,
        },
        referral: {
          ...(formData.referralType && { referral_type: formData.referralType }),
          ...(formData.referredBy && { referred_by: formData.referredBy }),
          ...(formData.referredTo && { referred_to: formData.referredTo }),
          ...(formData.referralToDate && { referral_to_date: formData.referralToDate }),
        },
        guardian: {
          ...(formData.guardianName && { guardian_name: formData.guardianName }),
          ...(formData.guardianPhone && { guardian_phone: formData.guardianPhone }),
        },
        notes: {
          ...(formData.patientNotes && { patient_notes: formData.patientNotes }),
          ...(formData.hipaaSharing && { hipaa_sharing: formData.hipaaSharing }),
        },
        starting_balances: {
          current: parseFloat(formData.balanceCurrent) || 0,
          over_30: parseFloat(formData.balanceOver30) || 0,
          over_60: parseFloat(formData.balanceOver60) || 0,
          over_90: parseFloat(formData.balanceOver90) || 0,
          over_120: parseFloat(formData.balanceOver120) || 0,
        },
        patient_types: patientTypesArray,
      };

      await updatePatientFull(patientId, payload);
      
      alert("✅ Patient updated successfully!");
      onSave(payload); // Notify parent component
      onClose();
    } catch (error: any) {
      console.error("Error updating patient:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to update patient";
      setSaveError(errorMessage);
      alert(`❌ Error updating patient: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this patient? This action cannot be undone.",
      )
    ) {
      // Delete logic here
      onClose();
    }
  };

  if (!isOpen) return null;

  // Show loading state while fetching patient data
  if (isLoadingPatient) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-transparent">
        <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#3A6EA5] animate-spin" />
          <p className="text-[#1F3A5F] font-medium">Loading patient details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto border-4 border-[#3A6EA5]">
        {/* Header - Medical Slate Theme */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2.5 flex items-center justify-between z-10 border-b-4 border-[#1F3A5F]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-white">
                PATIENT INFORMATION
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOrthoPatient}
                  onChange={(e) => {
                    setIsOrthoPatient(e.target.checked);
                    setPatientTypes({ ...patientTypes, OR: e.target.checked });
                  }}
                  className="w-3.5 h-3.5 rounded border-2 border-white"
                />
                <span className="text-sm">Ortho Patient</span>
              </label>
            </div>
            <div className="text-[#B0C4DE] text-xs mt-1">
              Patient ID: {patientId ? (typeof patientId === 'string' ? patientId : patientId.toString()) : 'N/A'}
            </div>
            <div className="text-[#B0C4DE] text-xs mt-1">
              Modified By: {formData.modifiedBy || "—"} | Modified On: {formData.modifiedOn || "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#16314d] p-1.5 rounded transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Error Messages */}
        {patientError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 font-medium">Error loading patient: {patientError}</p>
            </div>
          </div>
        )}

        {metadataError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 m-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-700 font-medium">{metadataError}</p>
            </div>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 font-medium">Error saving: {saveError}</p>
            </div>
          </div>
        )}

        {/* Top Bar Info - Medical Slate Theme */}
        <div className="bg-[#F7F9FC] px-4 py-2 border-b-2 border-[#E2E8F0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <div>
              Home Office:{" "}
              <span className="text-[#1F3A5F] font-semibold">
                {formData.office || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 p-6">
          {/* Left Column - Main Form */}
          <div className="col-span-9 space-y-3">
            {/* 1. Identity Gate Section */}
            <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#1F3A5F] text-sm tracking-wide border-b border-[#E2E8F0] pb-2 flex-1">
                  Identity Information (Required)
                </h3>
              </div>

              <div className="grid grid-cols-12 gap-3">
                {/* Birth Date - takes 3 columns */}
                <div className="col-span-3">
                  <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                    Birth Date <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthdate: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                  />
                </div>

                {/* Age - takes 1 column, read-only */}
                <div className="col-span-1">
                  <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                    Age
                  </label>
                  <input
                    type="text"
                    value={calculateAge(formData.birthdate)}
                    disabled
                    className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#64748B] text-sm cursor-not-allowed"
                  />
                </div>

                {/* Last Name - takes 4 columns */}
                <div className="col-span-4">
                  <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                    Last Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                  />
                </div>

                {/* First Name - takes 4 columns */}
                <div className="col-span-4">
                  <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                    First Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Remaining form sections */}
            <div>
              {/* 2. Additional Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Additional Details
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Title
                    </label>
                    <select
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    >
                      <option value="">Select</option>
                      {metadata?.titles.map((title) => (
                        <option key={title.code} value={title.name}>
                          {title.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Preferred Name
                    </label>
                    <input
                      type="text"
                      value={formData.preferredName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferredName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Pronouns
                    </label>
                    <select
                      value={formData.pronouns}
                      onChange={(e) =>
                        setFormData({ ...formData, pronouns: e.target.value })
                      }
                      disabled={isLoadingMetadata}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                    >
                      <option value="Please Select">Please Select</option>
                      {metadata?.pronouns.map((pronoun) => (
                        <option key={pronoun.code} value={pronoun.name}>
                          {pronoun.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Address Section */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Address & Location
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Address Line 1 <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address1}
                      onChange={(e) =>
                        setFormData({ ...formData, address1: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.address2}
                      onChange={(e) =>
                        setFormData({ ...formData, address2: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        State
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        disabled={isLoadingMetadata}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                      >
                        <option value="">Select State</option>
                        {metadata?.states.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        value={formData.zip}
                        onChange={(e) =>
                          setFormData({ ...formData, zip: e.target.value })
                        }
                        disabled={!formData.state}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3.5. Contact Information Section */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Contact Information
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Home Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="(XXX) XXX-XXXX"
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Cell Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.cellPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, cellPhone: e.target.value })
                      }
                      placeholder="(XXX) XXX-XXXX"
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Work Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.workPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, workPhone: e.target.value })
                      }
                      placeholder="(XXX) XXX-XXXX"
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@example.com"
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Preferred Contact
                    </label>
                    <select
                      value={formData.preferredContact}
                      onChange={(e) =>
                        setFormData({ ...formData, preferredContact: e.target.value })
                      }
                      disabled={isLoadingMetadata}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                    >
                      <option value="No Preference">No Preference</option>
                      <option value="home_phone">Home Phone</option>
                      <option value="cell_phone">Cell Phone</option>
                      <option value="work_phone">Work Phone</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Demographics & 5. Health Care Guardian - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                {/* 4. Demographics */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                  <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                    Demographics
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Marital Status
                      </label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maritalStatus: e.target.value,
                          })
                        }
                        disabled={isLoadingMetadata}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                      >
                        {metadata?.marital_statuses.map((status) => (
                          <option key={status.code} value={status.name}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Sex <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.sex}
                        onChange={(e) =>
                          setFormData({ ...formData, sex: e.target.value })
                        }
                        disabled={isLoadingMetadata}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                      >
                        <option value="">Select</option>
                        {metadata?.genders.map((gender) => (
                          <option key={gender.code} value={gender.name}>
                            {gender.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. Health Care Guardian */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                  <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                    Health Care Guardian
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        value={formData.guardianName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guardianName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Guardian Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.guardianPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guardianPhone: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Patient Status & 7. Coverage Type - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                {/* 6. Patient Status */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                  <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                    Patient Status
                  </h3>

                  <div className="grid grid-cols-1 gap-y-2 gap-x-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) =>
                          setFormData({ ...formData, active: e.target.checked })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Active
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignBenefits}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            assignBenefits: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Assign Benefits to Patient
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hipaaAgreement}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hipaaAgreement: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        HIPAA Agreement
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.noCorrespondence}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            noCorrespondence: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        No Correspondence
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.noAutoEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            noAutoEmail: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        No Auto Email
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.noAutoSMS}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            noAutoSMS: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        No Auto SMS
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        checked={formData.addToQuickFill}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            addToQuickFill: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Add Patient to Quick-Fill List
                      </span>
                    </label>
                  </div>
                </div>

                {/* 7. Coverage Type */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                  <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                    Coverage Type
                  </h3>

                  <div className="grid grid-cols-1 gap-y-2 gap-x-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.noCoverage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            noCoverage: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        No Coverage
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.primaryDental}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            primaryDental: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Primary Dental
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.secondaryDental}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            secondaryDental: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Secondary Dental
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.primaryMedical}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            primaryMedical: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Primary Medical
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.secondaryMedical}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            secondaryMedical: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Secondary Medical
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 8. Office & Provider */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Office & Provider
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Office
                    </label>
                    <input
                      type="text"
                      value={formData.office}
                      readOnly
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg bg-gray-100 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm flex items-center gap-2">
                      Fee Schedule
                      <Info className="w-4 h-4 text-[#3A6EA5]" />
                    </label>
                    <select
                      value={formData.feeScheduleId}
                      onChange={(e) => handleFeeScheduleChange(e.target.value)}
                      disabled={loadingFeeSchedules}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {loadingFeeSchedules ? (
                        <option value="">Loading...</option>
                      ) : feeSchedules.length === 0 ? (
                        <option value="">No fee schedules available</option>
                      ) : (
                        <>
                          <option value="">Select Fee Schedule</option>
                          {feeSchedules.map((schedule) => (
                            <option 
                              key={schedule.feeScheduleId} 
                              value={schedule.feeScheduleId}
                            >
                              {schedule.feeScheduleName}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {feeScheduleError && (
                      <p className="text-xs text-[#EF4444] mt-1">{feeScheduleError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Preferred Provider <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.preferredProvider}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferredProvider: e.target.value,
                        })
                      }
                      disabled={loadingProviders}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                    >
                      <option value="">Select Provider</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Preferred Hygienist
                    </label>
                    <select
                      value={formData.preferredHygienist}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferredHygienist: e.target.value,
                        })
                      }
                      disabled={loadingProviders}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                    >
                      <option value="None">None</option>
                      {hygienists.map((hygienist) => (
                        <option key={hygienist.id} value={hygienist.id}>
                          {hygienist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 9. Referral Information */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Referral Information
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Referral Type <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.referralType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referralType: e.target.value,
                        })
                      }
                      disabled={isLoadingMetadata}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                    >
                      <option value="">Select</option>
                      {metadata?.referral_types.map((type) => (
                        <option key={type.code} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Referred By
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.referredBy}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            referredBy: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 pr-10 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                      />
                      <Search className="absolute right-3 top-2.5 w-4 h-4 text-[#64748B]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Referred To
                    </label>
                    <select
                      value={formData.referredTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referredTo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    >
                      <option value="">Select</option>
                      <option value="Specialist A">Specialist A</option>
                      <option value="Specialist B">Specialist B</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Referral To Date
                    </label>
                    <input
                      type="date"
                      value={formData.referralToDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referralToDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 10. Responsible Party Relationship & SSN - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                {/* 10. Responsible Party Relationship */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                  <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                    Responsible Party Relationship
                  </h3>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Rel. to Resp
                    </label>
                    <select
                      value={formData.relToResp}
                      onChange={(e) =>
                        setFormData({ ...formData, relToResp: e.target.value })
                      }
                      disabled={isLoadingMetadata}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                    >
                      <option value="Please Select">Please Select</option>
                      {metadata?.responsible_party_relationships.map((rel) => (
                        <option key={rel.code} value={rel.name}>
                          {rel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SSN */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                  <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                    Social Security Number
                  </h3>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      SSN
                    </label>
                    <input
                      type="text"
                      value={formData.ssn}
                      onChange={(e) => {
                        // Format SSN as XXX-XX-XXXX
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = value;
                        if (value.length > 3) {
                          formatted = value.slice(0, 3) + '-' + value.slice(3);
                        }
                        if (value.length > 5) {
                          formatted = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 9);
                        }
                        setFormData({ ...formData, ssn: formatted });
                      }}
                      placeholder="XXX-XX-XXXX"
                      maxLength={11}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 11. Additional Identification */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Additional Identification
                </h3>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Chart No
                    </label>
                    <input
                      type="text"
                      value={formData.chartNo}
                      onChange={(e) =>
                        setFormData({ ...formData, chartNo: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Driver License
                    </label>
                    <input
                      type="text"
                      value={formData.driverLicense}
                      onChange={(e) =>
                        setFormData({ ...formData, driverLicense: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Medi ID
                    </label>
                    <input
                      type="text"
                      value={formData.mediId}
                      onChange={(e) =>
                        setFormData({ ...formData, mediId: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Student
                    </label>
                    <select
                      value={formData.studentStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, studentStatus: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    >
                      <option value="No">No</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Full-time">Full-time</option>
                    </select>
                  </div>
                  {formData.studentStatus !== "No" && (
                    <div>
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        School Name
                      </label>
                      <input
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) =>
                          setFormData({ ...formData, schoolName: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 12. Notes Section - Side by Side */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-2 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Notes
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[#1E293B] font-normal text-sm">
                        Patient Notes
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addTimestamp("patientNotes")}
                          className="text-xs text-[#3A6EA5] hover:text-[#1F3A5F] font-semibold"
                        >
                          Date Stamp
                        </button>
                        <span className="text-xs text-[#64748B]">
                          {formData.patientNotes.length}/1000
                        </span>
                      </div>
                    </div>
                    <textarea
                      value={formData.patientNotes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          patientNotes: e.target.value.slice(0, 1000),
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[#1E293B] font-normal text-sm">
                        HIPAA Information Sharing
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addTimestamp("hipaaSharing")}
                          className="text-xs text-[#3A6EA5] hover:text-[#1F3A5F] font-semibold"
                        >
                          Date Stamp
                        </button>
                        <span className="text-xs text-[#64748B]">
                          {formData.hipaaSharing.length}/1000
                        </span>
                      </div>
                    </div>
                    <textarea
                      value={formData.hipaaSharing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hipaaSharing: e.target.value.slice(0, 1000),
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 13. Starting Balances */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                  Starting Balances
                </h3>

                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Current
                    </label>
                    <input
                      type="text"
                      value={formData.balanceCurrent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balanceCurrent: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Over 30
                    </label>
                    <input
                      type="text"
                      value={formData.balanceOver30}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balanceOver30: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Over 60
                    </label>
                    <input
                      type="text"
                      value={formData.balanceOver60}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balanceOver60: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Over 90
                    </label>
                    <input
                      type="text"
                      value={formData.balanceOver90}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balanceOver90: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Over 120
                    </label>
                    <input
                      type="text"
                      value={formData.balanceOver120}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          balanceOver120: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Patient Types (3 columns) */}
          <div className="col-span-3">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 sticky top-[140px]">
              <h3 className="font-semibold text-[#1F3A5F] mb-3 text-sm tracking-wide border-b border-[#E2E8F0] pb-2">
                Patient Type
              </h3>

              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.CH}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        CH: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    CH – Child
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.CP}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        CP: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    CP – Collection Problem, See Notes
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.EF}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        EF: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    EF – Employee & Family
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.OR}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsOrthoPatient(checked);
                      setPatientTypes({
                        ...patientTypes,
                        OR: checked,
                      });
                    }}
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    OR – Ortho Patient
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.SN}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        SN: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    SN – Short Notice Appointment
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.SR}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        SR: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    SR – Senior Citizen
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                  <input
                    type="checkbox"
                    checked={patientTypes.SS}
                    onChange={(e) =>
                      setPatientTypes({
                        ...patientTypes,
                        SS: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm text-[#1E293B]">
                    SS – Spanish Speaking
                  </span>
                </label>

              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-[#E2E8F0] px-6 pb-6">
          <button
            onClick={() =>
              alert("Future implementation: Responsible Party workflow")
            }
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-colors bg-[#3A6EA5] text-white hover:bg-[#1F3A5F]"
          >
            Responsible Party &gt;&gt;
          </button>
          <button className="px-6 py-2 rounded-lg font-semibold text-sm transition-colors bg-yellow-500 text-gray-900 rounded hover:bg-yellow-600">
            MOVE PATIENTS
          </button>
          <button 
            onClick={handleDelete}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-colors bg-red-600 text-white rounded hover:bg-red-700"
          >
            DELETE PATIENT
          </button>
          <button className="px-6 py-2 rounded-lg font-semibold text-sm transition-colors bg-[#3A6EA5] text-white rounded hover:bg-[#3A6EA5]">
            PATIENT PICTURE
          </button>
          <button className="px-6 py-2 rounded-lg font-semibold text-sm transition-colors bg-[#3A6EA5] text-white rounded hover:bg-[#3A6EA5]">
            PATIENT FINGERPRINT
          </button>
        {/* </div> */}
        {/* <div className="flex gap-3"> */}
          {/* <button 
            onClick={handleSave}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            SAVE
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] rounded-lg hover:bg-[#F7F9FC] transition-colors font-semibold text-sm"
          >
            CANCEL
          </button> */}





        {/* <div className="flex gap-3"> */}
          <button
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to cancel? All unsaved data will be lost.",
                )
              ) {
                onClose();
              }
            }}
            className="px-6 py-2 bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] rounded-lg hover:bg-[#F7F9FC] transition-colors font-semibold text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
              !isSaving
                ? "bg-[#2FB9A7] text-white hover:bg-[#26a396]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
          {saveError && (
            <div className="mt-2 text-sm text-red-600">
              {saveError}
            </div>
          )}
        </div>
        {/* </div> */}
      </div>

      {/* Fee Schedule Warning Modal */}
      {showFeeScheduleWarning && pendingFeeSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-[#EF4444] to-[#DC2626] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">
                  Fee Schedule Change Warning
                </h2>
              </div>
              <button
                onClick={cancelFeeScheduleChange}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-[#1E293B] mb-4">
                You are about to change the fee schedule from:
              </p>
              
              <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#64748B] uppercase">Current</span>
                </div>
                <div className="text-[#1E293B] font-semibold">{formData.feeSchedule}</div>
              </div>

              <div className="flex justify-center mb-3">
                <div className="text-[#64748B]">↓</div>
              </div>

              <div className="bg-[#FEF2F2] border-2 border-[#EF4444] rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#EF4444] uppercase">New</span>
                </div>
                <div className="text-[#1E293B] font-semibold">{pendingFeeSchedule.name}</div>
              </div>

              <div className="bg-[#FEF9E7] border-2 border-[#F59E0B] rounded-lg p-4 mb-6">
                <p className="text-sm text-[#92400E] font-medium">
                  <strong>⚠️ Warning:</strong> Changing the fee schedule will affect:
                </p>
                <ul className="mt-2 ml-4 text-sm text-[#92400E] space-y-1 list-disc">
                  <li>Available procedure codes</li>
                  <li>Fee calculations</li>
                  <li>Insurance estimations</li>
                  <li>Treatment plan pricing</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelFeeScheduleChange}
                  className="flex-1 px-4 py-2.5 border-2 border-[#E2E8F0] text-[#1E293B] rounded-lg hover:bg-[#F7F9FC] transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFeeScheduleChange}
                  className="flex-1 px-4 py-2.5 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] transition-colors font-semibold text-sm"
                >
                  Continue with Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}