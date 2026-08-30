import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../layout/AppShell";
import { Calendar, Search, Info, X, AlertTriangle } from "lucide-react";
import { checkDuplicatePatient } from "../../services/patient.service";
import { DuplicatePatient } from "../../types/patient";
import { 
  getFeeSchedules, 
  type FeeSchedule,
  getProcedureCodesByFeeSchedule 
} from "../../api/feeSchedules";
import { 
  fetchPatientMetadata,
  type PatientMetadataResponse,
  type TitleOption,
  type PronounOption,
  type StateOption,
  type MaritalStatusOption,
  type GenderOption,
  type ResponsiblePartyRelationshipOption,
  type ContactPreferenceOption,
  type ReferralTypeOption,
  type PatientTypeOption,
} from "../../services/patientMetadataApi";
import {
  registerPatientResilient,
  buildPatientCreate,
  type PatientCreateRequestFull,
} from "../../services/patientApi";
import type { RegisterRequest } from "@/api/generated/model";
import { fetchProviders, isHygienist, type Provider } from "../../services/schedulerApi";
import { listReferrals } from "@/api/generated/endpoints/patients/patients";
import type { ReferralRead } from "@/api/generated/model";
import { resolveOffice, officeKeyToId, type OfficeOption } from "../../services/officeLookup";
import { MIN_DOB_ISO, todayIsoDate, validateDob, ageFromDob } from "../../utils/datetime";

/** referral_type direction codes: "0" = Referred By, "1" = Referred To. */
const REFERRAL_DIRECTION_TO = "1";
import { Loader2 } from "lucide-react";
import {
  createPatientInsurance,
  createPatientRecall,
  createPatientEmergencyContact,
} from "@/api/generated/endpoints/patients/patients";
import { createInsuranceSubscriber } from "@/api/generated/endpoints/insurance/insurance";
import WizardStepper from "../../features/add-patient/WizardStepper";
import ResponsiblePartyStep from "../../features/add-patient/steps/ResponsiblePartyStep";
import InsuranceSlotStep from "../../features/add-patient/steps/InsuranceSlotStep";
import MedicalAlertsStep from "../../features/add-patient/steps/MedicalAlertsStep";
import QuestionnairesStep from "../../features/add-patient/steps/QuestionnairesStep";
import RecallStep from "../../features/add-patient/steps/RecallStep";
import {
  buildWizardSteps,
  COVERAGE_SLOTS,
  DEFAULT_RECALLS,
  emptyResponsibleParty,
  emptyInsuranceSlot,
  emptyMedicalAlerts,
  emptyQuestionnaires,
  slotHasPlan,
  buildSubscriberCreateForSlot,
  buildPatientInsuranceCreateForSlot,
  buildResponsiblePartyIn,
  buildMedicalAlertsIn,
  buildQuestionnaireResponsesIn,
  buildRecallCreate,
  buildOpeningBalanceIn,
  toCode,
  type ResponsiblePartyForm,
  type InsuranceSlotForm,
  type MedicalAlertsForm,
  type QuestionnairesForm,
  type RecallEntry,
  type CoverageSlotKey,
} from "../../features/add-patient/wizardModel";
import {
  loadPatientForEdit,
  savePatientEdits,
  loadPatientSections,
  savePatientSections,
  emptySectionsBaseline,
  type PatientAudit,
  type PatientEditSnapshot,
  type PatientSectionsBaseline,
} from "../../features/add-patient/editMode";

import {
  applyCoverageChange,
  applyStatusChange,
  applyPatientTypeChange,
  coverageLockReason,
  statusLockReason,
  patientTypeConflict,
  reconcileStatusWithCoverage,
  normalizeLoadedFlags,
  normalizeLoadedPatientTypes,
  pickCoverage,
  pickStatus,
  type CoverageField,
  type StatusField,
} from "../../features/add-patient/patientFlagRules";
/** Step-1 required fields that an existing record may already be missing. */
interface PreexistingGaps {
  sex: boolean;
  address1: boolean;
  preferredProvider: boolean;
  referralType: boolean;
}

interface AddNewPatientProps {
  /** Required by the page chrome; unused in the modal variant. */
  onLogout?: () => void;
  currentOffice: string;
  setCurrentOffice?: (office: string) => void;
  /**
   * "edit" hydrates the form from an existing patient and saves with PATCH
   * instead of registering a new one. The screen itself is the create flow's
   * Patient Information step — the legacy tool edits a patient through the
   * same form it creates one with.
   */
  mode?: "create" | "edit";
  /**
   * "modal" drops the app chrome and renders inside an overlay dialog, which is
   * how the Overview's PATIENT INFORMATION → EDIT button opens this. "page" is
   * the full-screen route used by Add New Patient.
   */
  variant?: "page" | "modal";
  /** Patient to edit in the modal variant (the page variant reads the route). */
  patientId?: number;
  /** Modal variant only — dismiss without saving. */
  onClose?: () => void;
  /**
   * Modal variant only — called after a successful save. Receives the patient
   * id (the newly-registered id in create mode, the edited id in edit mode) so
   * an embedding flow (e.g. the Scheduler new-appointment wizard) can continue
   * with the patient it just created.
   */
  onSaved?: (patientId: number) => void;
}

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
}

/**
 * Provider option label. The seeded data has many providers sharing a name
 * (e.g. several "Dhileep Jinna"), so append the title to tell them apart.
 */
const providerLabel = (p: Provider): string =>
  p.title ? `${p.name}, ${p.title}` : p.name;

/**
 * Pull the legacy "Emergency Contact" block out of the Medical Questionnaire
 * answers so it can be stored in the real `patient-emergency-contacts` resource
 * (LEG-3) rather than living on as questionnaire rows.
 */
const emergencyContactFromQuestionnaire = (q: QuestionnairesForm) => ({
  name: (q.medical[toCode("Emergency contact name")] ?? "").trim(),
  phone: (q.medical[toCode("Emergency contact phone")] ?? "").trim(),
  relationship: (q.medical[toCode("Emergency contact relationship to patient")] ?? "").trim(),
});

export default function AddNewPatient({
  onLogout,
  currentOffice,
  setCurrentOffice,
  mode = "create",
  variant = "page",
  patientId: propPatientId,
  onClose,
  onSaved,
}: AddNewPatientProps) {
  const navigate = useNavigate();
  const { patientId: routePatientId } = useParams<{ patientId?: string }>();
  const isModal = variant === "modal";
  // The modal is handed its patient directly; the page reads the route.
  const editPatientId =
    mode !== "edit"
      ? NaN
      : (propPatientId ?? (routePatientId ? Number(routePatientId) : NaN));
  const isEditMode = Number.isFinite(editPatientId);

  // Age beside the Birth Date field. Blank whenever the date isn't usable, so a
  // rejected DOB never reads as if it were accepted.
  const calculateAge = ageFromDob;

  // Form data state
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
    office: currentOffice,
    feeSchedule: "", // real default selected once fee schedules load
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
  });

  // Patient Types state
  const [patientTypes, setPatientTypes] = useState({
    CH: false, // Child
    CP: false, // Collection Problem
    EF: false, // Employee & Family
    OR: false, // Ortho Patient
    SN: false, // Short Notice Appointment
    SR: false, // Senior Citizen
    SS: false, // Spanish Speaking
    UP: false, // Update Information
  });

  // ── Checkbox-group consistency ──────────────────────────────────────────
  // Patient Status / Coverage Type / Patient Type were independent checkboxes,
  // so the form accepted impossible combinations (every coverage ticked next to
  // "No Coverage"; a patient marked both Child and Senior Citizen). Every click
  // now goes through the rules in features/add-patient/patientFlagRules, which
  // tick what a choice implies and clear what it contradicts.
  const setCoverageFlag = (field: CoverageField, checked: boolean) =>
    setFormData((prev) => {
      const coverage = applyCoverageChange(pickCoverage(prev), field, checked);
      const status = reconcileStatusWithCoverage(pickStatus(prev), coverage);
      return { ...prev, ...coverage, ...status };
    });

  const setStatusFlag = (field: StatusField, checked: boolean) =>
    setFormData((prev) => ({
      ...prev,
      ...applyStatusChange(pickStatus(prev), pickCoverage(prev), field, checked),
    }));

  const setPatientTypeFlag = (code: keyof typeof patientTypes, checked: boolean) =>
    setPatientTypes((prev) => applyPatientTypeChange(prev, code, checked));

  // Fee Schedule state
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [loadingFeeSchedules, setLoadingFeeSchedules] = useState(false);
  const [feeScheduleError, setFeeScheduleError] = useState<string | null>(null);
  const [showFeeScheduleWarning, setShowFeeScheduleWarning] = useState(false);
  const [pendingFeeSchedule, setPendingFeeSchedule] = useState<{ id: string; name: string } | null>(null);

  // Duplicate check modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatePatients, setDuplicatePatients] = useState<DuplicatePatient[]>([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // ✅ Identity Gate Logic
  // The DOB must be *valid*, not merely filled in — a future or out-of-range
  // birth date keeps the rest of the form locked (KAN-37).
  const dobError = validateDob(formData.birthdate);
  const isIdentityComplete =
    dobError === null &&
    formData.lastName.trim() !== "" &&
    formData.firstName.trim() !== "";

  // ✅ Load every dropdown source on mount.
  //
  // These run in PARALLEL and each settles independently. They used to be chained
  // inside one `try` after `await fetchPatientMetadata()`, which meant a slow or
  // failing definitions call left Preferred Provider / Fee Schedule / Hygienist
  // permanently empty. Now one failure only blanks its own dropdown.
  useEffect(() => {
    let cancelled = false;

    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const metadataResponse = await fetchPatientMetadata();
        if (cancelled) return;
        setMetadata(metadataResponse);
        setPatientTypesMetadata(metadataResponse.patient_types);
        setMetadataError(null);
      } catch (error) {
        console.error("Error loading patient metadata:", error);
        if (!cancelled) setMetadataError("Failed to load form metadata. Some fields may not be available.");
      } finally {
        if (!cancelled) setLoadingMetadata(false);
      }
    };

    // Office name for the read-only "Office" field. Re-runs whenever the global
    // nav selection changes, so the field always tracks the header.
    const loadHomeOffice = async () => {
      try {
        const office = await resolveOffice(currentOffice);
        if (cancelled) return;
        setHomeOffice(office);
        setFormData((prev) => ({
          ...prev,
          office: office?.name ?? currentOffice ?? "",
        }));
      } catch (error) {
        console.error("Error resolving current office:", error);
        // Fall back to the raw key so the field is never blank.
        if (!cancelled) setFormData((prev) => ({ ...prev, office: currentOffice ?? "" }));
      }
    };

    const loadProviders = async () => {
      setLoadingProviders(true);
      try {
        const providersList = await fetchProviders(currentOffice);
        if (cancelled) return;
        // Preferred Provider = the treating providers (dentists); Preferred
        // Hygienist = only providers whose ProviderRead.role is a hygienist.
        const hygienistList = providersList.filter(isHygienist);
        setProviders(providersList.filter((p) => !isHygienist(p)));
        setHygienists(hygienistList);
      } catch (error) {
        console.error("Error loading providers:", error);
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    };

    const loadFeeSchedules = async () => {
      setLoadingFeeSchedules(true);
      try {
        const response = await getFeeSchedules(currentOffice);
        if (cancelled) return;
        setFeeSchedules(response.feeSchedules);
        setFeeScheduleError(
          response.feeSchedules.length === 0 ? "No fee schedules are set up for this organization." : null,
        );
        // Default to the office's usual schedule when none is chosen yet.
        setFormData((prev) => {
          if (prev.feeScheduleId || response.feeSchedules.length === 0) return prev;
          const preferred =
            response.feeSchedules.find((fs) => fs.feeScheduleName === "CP-50") ??
            response.feeSchedules[0]!;
          return {
            ...prev,
            feeSchedule: preferred.feeScheduleName,
            feeScheduleId: preferred.feeScheduleId,
          };
        });
      } catch (error) {
        console.error("Error loading fee schedules:", error);
        if (!cancelled) setFeeScheduleError("Failed to load fee schedules.");
      } finally {
        if (!cancelled) setLoadingFeeSchedules(false);
      }
    };

    // "Referred To" = referral sources the practice refers patients OUT to
    // (direction code "1"; "0" is Referred By). Filtered SERVER-side — the
    // referrals table holds 800+ rows, so paging them all client-side just to
    // fill a dropdown was needlessly slow.
    const loadReferralTargets = async () => {
      setLoadingReferralTargets(true);
      try {
        const res = await listReferrals({
          referral_type: REFERRAL_DIRECTION_TO,
          size: 200,
          sort: "last_name",
          order: "asc",
        });
        if (cancelled) return;
        setReferralTargets(res.items ?? []);
      } catch (error) {
        console.error("Error loading referral targets:", error);
      } finally {
        if (!cancelled) setLoadingReferralTargets(false);
      }
    };

    void Promise.allSettled([
      loadHomeOffice(),
      loadMetadata(),
      loadProviders(),
      loadFeeSchedules(),
      loadReferralTargets(),
    ]);

    return () => {
      cancelled = true;
    };
  }, [currentOffice]);

  // ✅ Fee Schedule Change Handler
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

  // ✅ Confirm Fee Schedule Change
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

  // ✅ Cancel Fee Schedule Change
  const cancelFeeScheduleChange = () => {
    setShowFeeScheduleWarning(false);
    setPendingFeeSchedule(null);
  };

  // Metadata state
  const [metadata, setMetadata] = useState<PatientMetadataResponse | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  
  // Providers and Hygienists state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [hygienists, setHygienists] = useState<Provider[]>([]);

  // "Referred To" targets — real referral sources (direction code "1").
  const [referralTargets, setReferralTargets] = useState<ReferralRead[]>([]);
  const [loadingReferralTargets, setLoadingReferralTargets] = useState(false);

  // The office this patient is being registered under — always mirrors the
  // office picked in the global nav (`currentOffice`), resolved to its name.
  const [homeOffice, setHomeOffice] = useState<OfficeOption | null>(null);
  
  // Patient Types metadata
  const [patientTypesMetadata, setPatientTypesMetadata] = useState<PatientTypeOption[]>([]);
  
  // Loading and saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Inline validation errors, keyed by field name (legacy parity: the form
  // "identifies where there is missing information" rather than popping alerts).
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Surface the DOB problem as soon as something has been entered; an untouched
  // empty field only complains once the user tries to move on.
  const showDobError = Boolean(
    dobError && (formData.birthdate.trim() !== "" || errors.birthdate)
  );

  // ── Wizard state (legacy Denticon multi-step registration) ──────────────
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [respParty, setRespParty] = useState<ResponsiblePartyForm>(emptyResponsibleParty());
  const [insuranceSlots, setInsuranceSlots] = useState<Record<string, InsuranceSlotForm>>({});
  const [medicalAlerts, setMedicalAlerts] = useState<MedicalAlertsForm>(emptyMedicalAlerts());
  const [questionnaires, setQuestionnaires] = useState<QuestionnairesForm>(emptyQuestionnaires());
  // Resolved catalog labels lifted from the steps (code → label) so Finish can
  // send alert_label / question_text with the register payload.
  const [medicalAlertLabels, setMedicalAlertLabels] = useState<Record<string, string>>({});
  const [questionLabels, setQuestionLabels] = useState<{
    dental: Record<string, string>;
    medical: Record<string, string>;
  }>({ dental: {}, medical: {} });
  const [recalls, setRecalls] = useState<RecallEntry[]>(() =>
    DEFAULT_RECALLS.map((r) => ({ ...r })),
  );
  const [firstVisit, setFirstVisit] = useState("");
  const [lastVisit, setLastVisit] = useState("");

  // ── Edit mode ───────────────────────────────────────────────────────────
  // The wizard is hydrated once, after metadata has loaded, because `sex` is
  // stored as a display name taken from the tenant's gender list.
  const [isLoadingPatient, setIsLoadingPatient] = useState(isEditMode);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  /** Patient id whose hydrate is done or in flight — see the effect below. */
  const loadingPatientRef = useRef<number | null>(null);
  const [audit, setAudit] = useState<PatientAudit | null>(null);
  // Row ids behind Steps 2-5, so saving an edited patient reconciles the stored
  // alert / answer / recall rows instead of appending a second copy of each.
  const [sectionsBaseline, setSectionsBaseline] = useState<PatientSectionsBaseline>(
    emptySectionsBaseline,
  );
  const [responsiblePartyId, setResponsiblePartyId] = useState<number | null>(null);

  // Required Step-1 fields the stored record was already missing when it loaded.
  // Only meaningful in edit mode; create starts with no record and enforces
  // everything. See `requiredHere` (KAN-29).
  const preexistingGapsRef = useRef<PreexistingGaps>({
    sex: false,
    address1: false,
    preferredProvider: false,
    referralType: false,
  });

  // Hydrate every step from the stored patient. Waits for metadata because
  // `sex` is held as the tenant's display label. Runs once per patient id; the
  // guard also stops a metadata refetch from discarding edits already typed in.
  //
  // The guard is a REF, not the `loadedPatientId` state. Keying it off state
  // that the effect itself sets makes the effect cancel its own in-flight run
  // the moment it succeeds — which left the "Loading…" banner up forever and
  // discarded the later awaits' results.
  useEffect(() => {
    if (!isEditMode || !metadata) return;
    if (loadingPatientRef.current === editPatientId) return;
    loadingPatientRef.current = editPatientId;
    let cancelled = false;
    let settled = false;

    (async () => {
      setIsLoadingPatient(true);
      try {
        const snapshot: PatientEditSnapshot = await loadPatientForEdit(
          editPatientId,
          metadata.genders,
        );
        settled = true;
        if (cancelled) return;

        setFormData((prev) => {
          const hydrated = { ...prev, ...(snapshot.form as Partial<PatientFormData>) };
          // Remember which required fields the stored record already lacked, so
          // editing an unrelated field isn't blocked by a gap the user never
          // created (KAN-29). See `requiredInEditMode` below.
          preexistingGapsRef.current = {
            sex: !hydrated.sex,
            address1: !hydrated.address1?.trim(),
            preferredProvider: !hydrated.preferredProvider,
            referralType: !hydrated.referralType,
          };
          // Stored records predate the checkbox rules and can carry impossible
          // combinations; settle them before the form renders.
          return { ...hydrated, ...normalizeLoadedFlags(hydrated) };
        });
        setPatientTypes((prev) =>
          normalizeLoadedPatientTypes({ ...prev, ...snapshot.patient_types }),
        );
        setAudit(snapshot.audit);
        setFirstVisit(snapshot.first_visit);
        setLastVisit(snapshot.last_visit);
        // Responsible Party + Recall. Loaded from the patient record already in
        // hand so the guarantor lookup does not refetch it. A section that fails
        // to load reports a warning and falls back to the create flow's blank
        // state, so the user can still fill in what the patient is missing.
        const sections = await loadPatientSections(snapshot.patient);
        if (cancelled) return;
        setRespParty(sections.responsible_party);
        setResponsiblePartyId(sections.responsible_party_id);
        setRecalls(sections.recalls);
        setSectionsBaseline(sections.baseline);
        setLoadWarnings([...snapshot.warnings, ...sections.warnings]);

        // Keep the patient on their own home office rather than whatever the
        // global nav happens to have selected.
        if (snapshot.patient.home_office_id != null) {
          const office = await resolveOffice(String(snapshot.patient.home_office_id));
          if (!cancelled && office) {
            setHomeOffice(office);
            setFormData((prev) => ({ ...prev, office: office.name }));
          }
        }
      } catch (error: any) {
        console.error("Error loading patient for edit:", error);
        // Let a failed hydrate be retried rather than latching the guard shut.
        settled = true;
        loadingPatientRef.current = null;
        if (!cancelled) {
          setSaveError(
            error?.response?.data?.detail || error?.message || "Failed to load this patient.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPatient(false);
      }
    })();

    return () => {
      cancelled = true;
      // A teardown before the fetch resolves (StrictMode's double mount, or the
      // patient changing mid-flight) must release the claim, or the re-run is
      // turned away by the guard while this run discards its own results.
      if (!settled) loadingPatientRef.current = null;
    };
  }, [isEditMode, editPatientId, metadata]);

  // Resolve the fee-schedule display name once the list is available — edit
  // mode hydrates the id from the patient record, which alone renders blank.
  useEffect(() => {
    if (!formData.feeScheduleId || feeSchedules.length === 0) return;
    const match = feeSchedules.find((fs) => fs.feeScheduleId === formData.feeScheduleId);
    if (match && match.feeScheduleName !== formData.feeSchedule) {
      setFormData((prev) => ({ ...prev, feeSchedule: match.feeScheduleName }));
    }
  }, [feeSchedules, formData.feeScheduleId, formData.feeSchedule]);

  // Which coverage slots are active, from the Step-1 "Coverage Type" checkboxes.
  const coverage = {
    primary_dental: formData.primaryDental,
    secondary_dental: formData.secondaryDental,
    primary_medical: formData.primaryMedical,
    secondary_medical: formData.secondaryMedical,
  };

  /**
   * The live step list. EVERY selected coverage type gets its own insurance
   * screen (legacy chains Primary Dental → Secondary Dental → …), so the flow
   * grows/shrinks with the Step-1 checkboxes.
   */
  const steps = useMemo(() => {
    const all = buildWizardSteps({
      primary_dental: formData.primaryDental,
      secondary_dental: formData.secondaryDental,
      primary_medical: formData.primaryMedical,
      secondary_medical: formData.secondaryMedical,
    });
    // Editing walks the create flow's steps so a Quick-Saved patient can come
    // back and complete what they skipped — minus the sections that now belong
    // to a dedicated screen of their own:
    //   • Medical Alerts / Questionnaires → /patient/:id/medical-history
    //     (which also owns Signature and Copy Medical History)
    //   • Insurance slots → /patient/:id/insurance/…, which read and write the
    //     real patient_insurance rows; these wizard screens only build a *new*
    //     link, so they would offer to re-enter coverage and drop it on save.
    // Responsible Party and Recall stay here, reached from the Overview.
    const ownedElsewhere = new Set(["medical-alerts", "questionnaires"]);
    return isEditMode ? all.filter((s) => !s.slotKey && !ownedElsewhere.has(s.id)) : all;
  }, [
    isEditMode,
    formData.primaryDental,
    formData.secondaryDental,
    formData.primaryMedical,
    formData.secondaryMedical,
  ]);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  // Changing coverage on Step 1 can shorten the flow — keep the index in range.
  useEffect(() => {
    if (stepIndex > steps.length - 1) setStepIndex(steps.length - 1);
    setMaxReached((m) => Math.min(m, steps.length - 1));
  }, [steps.length, stepIndex]);

  const activeInsuranceSlots: InsuranceSlotForm[] = COVERAGE_SLOTS.filter(
    (s) => coverage[s.key],
  ).map((s) => insuranceSlots[s.key] ?? emptyInsuranceSlot(s));

  const slotFor = (key: CoverageSlotKey): InsuranceSlotForm =>
    insuranceSlots[key] ?? emptyInsuranceSlot(COVERAGE_SLOTS.find((s) => s.key === key)!);

  const updateInsuranceSlot = (key: string, patch: Partial<InsuranceSlotForm>) =>
    setInsuranceSlots((prev) => {
      const slotDef = COVERAGE_SLOTS.find((s) => s.key === key)!;
      const base = prev[key] ?? emptyInsuranceSlot(slotDef);
      return { ...prev, [key]: { ...base, ...patch } };
    });

  const goToStep = (i: number) => {
    setStepIndex(i);
    setMaxReached((m) => Math.max(m, i));
  };

  // Check Patient (Duplicate Detection)
  const handleCheckPatient = async () => {
    setCheckingDuplicate(true);

    try {
      const duplicates = await checkDuplicatePatient({
        birthdate: formData.birthdate,
        firstName: formData.firstName,
        lastName: formData.lastName,
        office: currentOffice,
      });

      if (duplicates && duplicates.length > 0) {
        setDuplicatePatients(duplicates);
        setShowDuplicateModal(true);
      } else {
        alert("✅ No duplicate patients found. You may proceed.");
      }
    } catch (error: any) {
      console.error("Duplicate check error:", error);
      alert(
        error.message || 
        "⚠️ Unable to check for duplicate patients. Please try again."
      );
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Numeric office id saved as `home_office_id`. Prefer the resolved office
  // record (from the global-nav selection); fall back to parsing the key.
  const getOfficeIdNum = (): number | undefined =>
    homeOffice?.id ?? officeKeyToId(currentOffice);

  // Validate the Step-1 required fields; surface inline (legacy parity: "identify
  // where there is missing information") instead of a chain of blocking alerts.
  // Returns true when valid.
  /**
   * Whether a create-flow required field should block **this** save.
   *
   * Creating a patient requires Sex, Address, Preferred Provider and Referral
   * Type. Edit reuses this same Step-1 form, which applied those rules
   * retroactively to records that pre-date them — 88% of existing patients have
   * no `preferred_provider_id` — so Save bailed out early and the edit appeared
   * to do nothing (KAN-29 / KAN-86).
   *
   * In edit mode a field is therefore enforced only if the stored record already
   * had a value: existing data still cannot be erased, but a gap the user did not
   * create cannot block an unrelated change.
   */
  const requiredHere = (field: keyof PreexistingGaps): boolean =>
    !isEditMode || !preexistingGapsRef.current[field];

  const validateStep1 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (dobError) nextErrors.birthdate = dobError;
    if (!formData.sex && requiredHere("sex")) nextErrors.sex = "Sex is required";
    if (!formData.address1.trim() && requiredHere("address1"))
      nextErrors.address1 = "Address is required";
    if (!formData.preferredProvider && requiredHere("preferredProvider"))
      nextErrors.preferredProvider = "Preferred Provider is required";
    if (!formData.referralType && requiredHere("referralType"))
      nextErrors.referralType = "Referral Type is required";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      // A bare `return false` left Save looking inert — the user saw nothing at
      // all happen. Say what is missing, then jump to the first offending field.
      setSaveError(
        `Please complete the highlighted field${Object.keys(nextErrors).length > 1 ? "s" : ""}: ` +
          Object.values(nextErrors).join(", "),
      );
      const firstField = Object.keys(nextErrors)[0];
      document
        .querySelector(`[data-field="${firstField}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setErrors({});
    setSaveError(null);
    return true;
  };

  const buildPatientPayload = (officeIdNum: number): PatientCreateRequestFull => {
      // Convert form data to API format
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

      const payload: PatientCreateRequestFull = {
        identity: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          preferred_name: formData.preferredName || undefined,
          dob: dobFormatted,
          gender: genderCode as "M" | "F" | "O",
          title: formData.title || undefined,
          pronouns: formData.pronouns !== "Please Select" ? formData.pronouns : undefined,
          marital_status: formData.maritalStatus || undefined,
          ssn: formData.ssn ? formData.ssn.replace(/\D/g, '') : undefined, // Remove dashes for API
          ...(formData.chartNo && { chart_no: formData.chartNo }),
          ...(formData.driverLicense && { driver_license: formData.driverLicense }),
          ...(formData.mediId && { medi_id: formData.mediId }),
          ...(formData.studentStatus !== "No" && { student_status: formData.studentStatus }),
          ...(formData.studentStatus !== "No" && formData.schoolName && { school_name: formData.schoolName }),
        },
        address: {
          address_line_1: formData.address1 || undefined,
          address_line_2: formData.address2 || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
        },
        contact: {
          home_phone: formData.phone || undefined,
          cell_phone: formData.cellPhone || undefined,
          work_phone: formData.workPhone || undefined,
          email: formData.email || undefined,
          preferred_contact: formData.preferredContact !== "No Preference" && formData.preferredContact !== "" 
            ? formData.preferredContact 
            : undefined,
        },
        office: {
          home_office_id: officeIdNum,
        },
        provider: {
          preferred_provider_id: formData.preferredProvider || undefined,
          preferred_hygienist_id: formData.preferredHygienist !== "None" ? formData.preferredHygienist : undefined,
        },
        fee_schedule: formData.feeScheduleId ? {
          fee_schedule_id: formData.feeScheduleId,
        } : undefined,
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
          // The "Active" checkbox was never included, so `is_active` went out as
          // null and the backend silently defaulted it to true — un-ticking Active
          // was ignored.
          is_active: formData.active,
        },
        responsible_party: {
          relationship: formData.relToResp !== "Please Select" ? formData.relToResp : undefined,
        },
        coverage: {
          no_coverage: formData.noCoverage,
          primary_dental: formData.primaryDental,
          secondary_dental: formData.secondaryDental,
          primary_medical: formData.primaryMedical,
          secondary_medical: formData.secondaryMedical,
        },
        referral: {
          referral_type: formData.referralType || undefined,
          referred_by: formData.referredBy || undefined,
          referred_to: formData.referredTo || undefined,
          referral_to_date: formData.referralToDate || undefined,
        },
        guardian: {
          guardian_name: formData.guardianName || undefined,
          guardian_phone: formData.guardianPhone || undefined,
        },
        notes: {
          patient_notes: formData.patientNotes || undefined,
          hipaa_sharing: formData.hipaaSharing || undefined,
        },
        // Visit history captured on the Recall step (backend columns exist).
        ...(firstVisit && { first_visit: firstVisit }),
        ...(lastVisit && { last_visit: lastVisit }),
        starting_balances: {
          current: parseFloat(formData.balanceCurrent) || 0,
          over_30: parseFloat(formData.balanceOver30) || 0,
          over_60: parseFloat(formData.balanceOver60) || 0,
          over_90: parseFloat(formData.balanceOver90) || 0,
          over_120: parseFloat(formData.balanceOver120) || 0,
        },
        patient_types: patientTypesArray,
      };
      return payload;
  };

  // Compose the atomic /patients/register request. `full` includes the wizard's
  // later-step data (alerts / questionnaires / recalls); Quick Save omits them.
  const buildRegisterRequest = (officeIdNum: number, full: boolean) => {
    const patient = buildPatientCreate(buildPatientPayload(officeIdNum));
    const opening_balance = buildOpeningBalanceIn({
      current: formData.balanceCurrent,
      over_30: formData.balanceOver30,
      over_60: formData.balanceOver60,
      over_90: formData.balanceOver90,
      over_120: formData.balanceOver120,
    });
    // LEG-10..13: a non-self guarantor is sent as `person` and is created AND
    // linked by the backend inside this same transaction.
    const responsible_party = buildResponsiblePartyIn(respParty);
    const request: RegisterRequest = { patient, responsible_party };
    if (opening_balance) request.opening_balance = opening_balance;
    if (full) {
      const alerts = buildMedicalAlertsIn(medicalAlerts, medicalAlertLabels);
      const answers = buildQuestionnaireResponsesIn(questionnaires, questionLabels);
      if (alerts.length) request.medical_alerts = alerts;
      if (answers.length) request.questionnaire_responses = answers;
      // Recalls are intentionally NOT sent here — `RecallIn` cannot express
      // LEG-8's interval_unit / scheduled_date / scheduled_time, so they are
      // persisted through the standalone patient-recalls resource instead
      // (gap LEG-17).
    }
    return request;
  };

  /**
   * Everything that cannot ride inside the register composite, attached after the
   * patient exists. Best-effort: each failure is reported, none undoes the patient.
   *   • Insurance — subscribers/plans are their own resources.
   *   • Recalls   — need LEG-8 fields `RecallIn` lacks (gap LEG-17).
   *   • Emergency contact — real `patient-emergency-contacts` resource (LEG-3).
   */
  const persistPostRegister = async (patientId: number, officeIdNum: number): Promise<string[]> => {
    const warnings: string[] = [];

    // Recalls (rows with a due date) — full fidelity via patient-recalls.
    for (const entry of recalls) {
      if (!entry.due_date) continue;
      try {
        await createPatientRecall(buildRecallCreate(entry, patientId, officeIdNum));
      } catch {
        warnings.push(`Recall "${entry.reason || entry.procedure_code}" could not be saved.`);
      }
    }

    // Emergency contact (LEG-3) — captured on the Medical Questionnaire step.
    const ec = emergencyContactFromQuestionnaire(questionnaires);
    if (ec.name) {
      try {
        await createPatientEmergencyContact({
          patient_id: patientId,
          name: ec.name,
          relationship: ec.relationship || undefined,
          phone: ec.phone || undefined,
          is_primary: true,
          is_active: true,
        });
      } catch {
        warnings.push("Emergency contact could not be saved.");
      }
    }

    for (const slot of activeInsuranceSlots) {
      if (!slotHasPlan(slot)) continue;
      try {
        let subscriberId: number | null = null;
        try {
          const sub = await createInsuranceSubscriber(
            buildSubscriberCreateForSlot(slot, formData.lastName, formData.firstName),
          );
          subscriberId = (sub as any).id ?? null;
        } catch {
          subscriberId = null; // fall back to a subscriber-less link
        }
        await createPatientInsurance(
          buildPatientInsuranceCreateForSlot(slot, patientId, subscriberId),
        );
      } catch {
        warnings.push(`${slot.label} insurance could not be saved.`);
      }
    }
    return warnings;
  };

  // Quick Save — atomic register of just the patient (+ self-RP link + opening
  // balance), then straight to Overview (skips the rest of the wizard).
  const handleQuickSave = async () => {
    if (!validateStep1()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const officeIdNum = getOfficeIdNum();
      if (!officeIdNum) {
        setSaveError("Invalid office ID");
        alert(" Invalid office ID — please select an office.");
        return;
      }
      const res = await registerPatientResilient(buildRegisterRequest(officeIdNum, false));
      if (res.warnings.length > 0) {
        alert(` Patient saved. Some items need attention:\n• ${res.warnings.join("\n• ")}`);
      } else {
        alert(" Patient saved successfully!");
      }
      // Embedded (modal) create: hand the new patient back to the host flow
      // instead of navigating away (e.g. Scheduler continues to the appointment).
      if (isModal) {
        onSaved?.(res.patient_id);
        return;
      }
      navigate(`/patient/${res.patient_id}/overview`);
    } catch (error: any) {
      console.error("Error saving patient:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to save patient";
      setSaveError(errorMessage);
      alert(` Error saving patient: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Finish — one atomic register (patient + RP + alerts + questionnaires + recalls
  // + opening balance), then attach insurance. A register failure rolls back the
  // whole patient; insurance is best-effort and surfaced as a warning.
  const handleFinish = async () => {
    if (!validateStep1()) {
      goToStep(0);
      return;
    }
    // A non-self guarantor is created as a real record, so it needs a name
    // (legacy marks Last/First required on the Responsible Party screen).
    if (respParty.rp_source !== "Self" && !respParty.last_name.trim()) {
      alert(" The responsible party needs at least a last name.");
      const rpIndex = steps.findIndex((s) => s.id === "responsible-party");
      if (rpIndex >= 0) goToStep(rpIndex);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const officeIdNum = getOfficeIdNum();
      if (!officeIdNum) {
        setSaveError("Invalid office ID");
        alert(" Invalid office ID — please select an office.");
        return;
      }
      const res = await registerPatientResilient(buildRegisterRequest(officeIdNum, true));
      const warnings = [
        ...res.warnings,
        ...(await persistPostRegister(res.patient_id, officeIdNum)),
      ];
      if (warnings.length > 0) {
        alert(` Patient registered. Some items need attention:\n• ${warnings.join("\n• ")}`);
      } else {
        alert(" Patient registered successfully!");
      }
      // Embedded (modal) create: hand the new patient back to the host flow.
      if (isModal) {
        onSaved?.(res.patient_id);
        return;
      }
      navigate(`/patient/${res.patient_id}/overview`);
    } catch (error: any) {
      console.error("Error registering patient:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to register patient";
      setSaveError(errorMessage);
      alert(` Error registering patient: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Edit mode save — PATCH the patient and reconcile every related resource,
   * then return to the Overview the user came from. Uses the very same
   * `buildPatientPayload` the create flow does, so the two stay in lockstep.
   */
  const handleSaveEdits = async () => {
    if (!validateStep1()) {
      goToStep(0);
      return;
    }
    // Same rule the create flow enforces: a non-self guarantor becomes a real
    // record, so it needs at least a last name.
    if (respParty.rp_source !== "Self" && !respParty.last_name.trim()) {
      alert("The responsible party needs at least a last name.");
      const rpIndex = steps.findIndex((s) => s.id === "responsible-party");
      if (rpIndex >= 0) goToStep(rpIndex);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const officeIdNum = getOfficeIdNum();
      if (!officeIdNum) {
        setSaveError("Invalid office ID");
        return;
      }
      // Step 1 first — it owns the patient record every other section hangs
      // off, and it is the only write whose failure aborts the save.
      const warnings = await savePatientEdits({
        patient_id: editPatientId,
        patient: buildPatientCreate(buildPatientPayload(officeIdNum)),
        opening_balance: buildOpeningBalanceIn({
          current: formData.balanceCurrent,
          over_30: formData.balanceOver30,
          over_60: formData.balanceOver60,
          over_90: formData.balanceOver90,
          over_120: formData.balanceOver120,
        }),
      });

      // Responsible Party + Recall — the sections Quick Save skips that this
      // screen still owns. Reconciled against the ids captured at load time and
      // degraded to a warning on failure. Medical alerts and the questionnaires
      // are NOT written here; the Medical History screen owns them.
      const sections = await savePatientSections({
        patient_id: editPatientId,
        office_id: officeIdNum,
        baseline: sectionsBaseline,
        responsible_party: respParty,
        responsible_party_id: responsiblePartyId,
        recalls,
      });
      warnings.push(...sections.warnings);

      // Adopt the post-save row ids. Without this a second save from the same
      // open dialog would insert a duplicate of everything the first created.
      setSectionsBaseline(sections.baseline);
      setResponsiblePartyId(sections.responsible_party_id);
      setRecalls(sections.recalls);

      if (warnings.length > 0) {
        alert(`Patient updated. Some items need attention:\n• ${warnings.join("\n• ")}`);
      }
      if (isModal) onSaved?.(editPatientId);
      else navigate(`/patient/${editPatientId}/overview`);
    } catch (error: any) {
      console.error("Error updating patient:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to update patient";
      setSaveError(errorMessage);
      alert(`Error updating patient: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Advance from the current step; Step 1 must pass required-field validation.
  const handleContinue = () => {
    if (stepIndex === 0 && !validateStep1()) return;
    goToStep(Math.min(stepIndex + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Add timestamp to notes
  const addTimestamp = (field: "patientNotes" | "hipaaSharing") => {
    const timestamp = new Date().toLocaleString();
    setFormData({
      ...formData,
      [field]: formData[field] + `\n[${timestamp}] `,
    });
  };

  const screen = (
    <>
      <div>
        {/* Header — sticky in the dialog so the title and close stay reachable. */}
        <div
          className={`bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 ${
            isModal ? "sticky top-0 z-10" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Calendar className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Step {stepIndex + 1} of {steps.length}: {currentStep?.label}
                </h1>
                <p className="text-sm text-white/80">
                  {isEditMode
                    ? `Editing ${formData.lastName || ""}${formData.firstName ? `, ${formData.firstName}` : ""}`.trim() ||
                      "Edit patient"
                    : stepIndex === 0
                      ? "Complete identity fields to unlock the form"
                      : "New patient registration"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              {/* Legacy header block: record ids + provenance. */}
              <div className="text-right text-white text-xs leading-5">
                <div className="text-sm">
                  PGID: {isEditMode ? editPatientId : "—"}
                </div>
                <div className="text-sm">
                  OID: {audit?.office_id ?? homeOffice?.id ?? "—"}
                </div>
                {isEditMode && (
                  <>
                    <div
                      className="text-white/80"
                      // The patient resource exposes no `updated_by`, so this is
                      // the user who created the record (gap PE-4).
                      title={
                        audit?.modified_by_is_creator
                          ? "The patient record does not store a last-editor; showing the user who created it."
                          : undefined
                      }
                    >
                      Modified By: {audit?.modified_by || "—"}
                      {audit?.modified_by_is_creator && (
                        <span className="text-white/60"> (creator)</span>
                      )}
                    </div>
                    <div className="text-white/80">
                      Modified On: {audit?.modified_on || "—"}
                    </div>
                  </>
                )}
              </div>
              {isModal && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-white hover:bg-white/15 p-1.5 rounded transition-colors"
                >
                  <X className="w-6 h-6" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Wizard step indicator. Editing shows it too — that is the whole point
            of the edit flow: reach the sections Quick Save skipped. An existing
            patient has already been through Step 1, so every step is unlocked
            once their record has actually arrived. */}
        <WizardStepper
          steps={steps}
          current={stepIndex}
          maxReached={isEditMode && !isLoadingPatient ? steps.length - 1 : maxReached}
          onStepClick={(i) => {
            // Stepping away mid-hydrate would validate a form that has not been
            // filled in yet, flagging "required" on fields the patient has.
            if (isLoadingPatient) return;
            // Leaving Step 1 forward requires the required fields.
            if (stepIndex === 0 && i > 0 && !validateStep1()) return;
            setStepIndex(i);
          }}
        />

        <div className={isModal ? "p-6" : "max-w-[1600px] mx-auto p-6"}>
          {isLoadingPatient && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1F3A5F]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading this patient&rsquo;s saved information…
            </div>
          )}
          {loadWarnings.length > 0 && (
            <div className="mb-4 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <ul className="list-disc pl-5 space-y-1">
                {loadWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Step 1: Patient Information ─────────────────────────────── */}
          <div className={stepIndex === 0 ? "grid grid-cols-12 gap-6" : "hidden"}>
            {/* Main Form - Left Side (9 columns) */}
            <div className="col-span-9 space-y-3">
              {/* 1. Identity Gate Section */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1F3A5F] text-sm tracking-wide border-b border-[#E2E8F0] pb-2 flex-1">
                    Identity Information (Required)
                  </h3>
                  {!isIdentityComplete && (
                    <span className="text-xs text-red-600 font-semibold">
                      ⚠️ Complete to unlock form
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-3">
                  {/* Birth Date - takes 3 columns */}
                  <div className="col-span-3" data-field="birthdate">
                    <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                      Birth Date <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.birthdate}
                      // `min`/`max` constrain the picker; `dobError` is the hard
                      // stop for anything typed past them (KAN-37).
                      min={MIN_DOB_ISO}
                      max={todayIsoDate()}
                      onChange={(e) => {
                        setFormData({ ...formData, birthdate: e.target.value });
                        clearError("birthdate");
                      }}
                      className={`w-full px-3 py-1.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm ${
                        showDobError ? "border-[#EF4444]" : "border-[#E2E8F0]"
                      }`}
                    />
                    {showDobError && (
                      <p className="text-xs text-[#EF4444] mt-1">{dobError}</p>
                    )}
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

                {/* Check Patient Button — duplicate detection is a registration
                    step; the record already exists when editing. */}
                <div className={`mt-4 ${isEditMode ? "hidden" : ""}`}>
                  <button
                    onClick={handleCheckPatient}
                    disabled={!isIdentityComplete || checkingDuplicate}
                    className={`px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                      isIdentityComplete && !checkingDuplicate
                        ? "bg-[#3A6EA5] text-white hover:bg-[#1F3A5F]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {checkingDuplicate ? "Checking..." : "Check Patient"}
                  </button>
                </div>
              </div>

              {/* Remaining form sections - disabled until identity complete */}
              <div className={isIdentityComplete ? "" : "opacity-50 pointer-events-none"}>
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
                        disabled={loadingMetadata}
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
                    <div data-field="address1">
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Address Line 1 <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address1}
                        onChange={(e) => {
                          setFormData({ ...formData, address1: e.target.value });
                          clearError("address1");
                        }}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm ${
                          errors.address1 ? "border-[#EF4444]" : "border-[#E2E8F0]"
                        }`}
                      />
                      {errors.address1 && (
                        <p className="text-xs text-[#EF4444] mt-1">{errors.address1}</p>
                      )}
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
                          disabled={loadingMetadata}
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
                        disabled={loadingMetadata}
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
                          disabled={loadingMetadata}
                          className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                        >
                          {metadata?.marital_statuses.map((status) => (
                            <option key={status.code} value={status.name}>
                              {status.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div data-field="sex">
                        <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                          Sex <span className="text-[#EF4444]">*</span>
                        </label>
                        <select
                          value={formData.sex}
                          onChange={(e) => {
                            setFormData({ ...formData, sex: e.target.value });
                            clearError("sex");
                          }}
                          disabled={loadingMetadata}
                          className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100 ${
                            errors.sex ? "border-[#EF4444]" : "border-[#E2E8F0]"
                          }`}
                        >
                          <option value="">Select</option>
                          {metadata?.genders.map((gender) => (
                            <option key={gender.code} value={gender.name}>
                              {gender.name}
                            </option>
                          ))}
                        </select>
                        {errors.sex && (
                          <p className="text-xs text-[#EF4444] mt-1">{errors.sex}</p>
                        )}
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
                        onChange={(e) => setStatusFlag("active", e.target.checked)}
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
                        disabled={!!statusLockReason(formData, formData, "assignBenefits")}
                        title={statusLockReason(formData, formData, "assignBenefits")}
                        onChange={(e) => setStatusFlag("assignBenefits", e.target.checked)}
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span
                        className={`text-sm font-normal ${
                          statusLockReason(formData, formData, "assignBenefits")
                            ? "text-[#94A3B8]"
                            : "text-[#1E293B]"
                        }`}
                      >
                        Assign Benefits to Patient
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hipaaAgreement}
                        onChange={(e) => setStatusFlag("hipaaAgreement", e.target.checked)}
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
                        onChange={(e) => setStatusFlag("noCorrespondence", e.target.checked)}
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
                        onChange={(e) => setStatusFlag("noAutoEmail", e.target.checked)}
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
                        onChange={(e) => setStatusFlag("noAutoSMS", e.target.checked)}
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
                        disabled={!!statusLockReason(formData, formData, "addToQuickFill")}
                        title={statusLockReason(formData, formData, "addToQuickFill")}
                        onChange={(e) => setStatusFlag("addToQuickFill", e.target.checked)}
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span
                        className={`text-sm font-normal ${
                          statusLockReason(formData, formData, "addToQuickFill")
                            ? "text-[#94A3B8]"
                            : "text-[#1E293B]"
                        }`}
                      >
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

                    {/* Read-only while editing: these checkboxes only choose which
                        insurance screens the NEW-patient wizard shows. An existing
                        patient's coverage is edited from the Overview's insurance
                        panel, so leaving them live here would be a silent no-op. */}
                    {isEditMode && (
                      <p className="text-xs text-[#64748B] mb-2">
                        Current coverage. Edit plans from the Overview&rsquo;s insurance panel.
                      </p>
                    )}
                    <fieldset
                      disabled={isEditMode}
                      className={`grid grid-cols-1 gap-y-2 gap-x-3 border-0 p-0 m-0 ${
                        isEditMode ? "opacity-70" : ""
                      }`}
                    >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.noCoverage}
                        onChange={(e) => setCoverageFlag("noCoverage", e.target.checked)}
                        title={coverageLockReason(formData, "noCoverage")}
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
                        onChange={(e) => setCoverageFlag("primaryDental", e.target.checked)}
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
                        onChange={(e) => setCoverageFlag("secondaryDental", e.target.checked)}
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
                        onChange={(e) => setCoverageFlag("primaryMedical", e.target.checked)}
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
                        onChange={(e) => setCoverageFlag("secondaryMedical", e.target.checked)}
                        className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm text-[#1E293B] font-normal">
                        Secondary Medical
                      </span>
                    </label>
                    </fieldset>
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
                        value={
                          homeOffice
                            ? `${homeOffice.name}${homeOffice.short_id ? ` [${homeOffice.short_id}]` : ""}`
                            : formData.office || "Select an office in the top bar"
                        }
                        readOnly
                        title="Set by the office selector in the top navigation"
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg bg-gray-100 text-sm"
                      />
                      <p className="text-xs text-[#64748B] mt-1">
                        From the office selected in the top bar.
                      </p>
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

                    <div data-field="preferredProvider">
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Preferred Provider <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.preferredProvider}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            preferredProvider: e.target.value,
                          });
                          clearError("preferredProvider");
                        }}
                        disabled={loadingProviders}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100 ${
                          errors.preferredProvider ? "border-[#EF4444]" : "border-[#E2E8F0]"
                        }`}
                      >
                        <option value="">
                          {loadingProviders
                            ? "Loading providers…"
                            : providers.length === 0
                              ? "No providers for this office"
                              : "Select Provider"}
                        </option>
                        {providers.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {providerLabel(provider)}
                          </option>
                        ))}
                      </select>
                      {errors.preferredProvider && (
                        <p className="text-xs text-[#EF4444] mt-1">{errors.preferredProvider}</p>
                      )}
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
                        <option value="None">
                          {loadingProviders
                            ? "Loading…"
                            : hygienists.length === 0
                              ? "None (no hygienists for this office)"
                              : "None"}
                        </option>
                        {hygienists.map((hygienist) => (
                          <option key={hygienist.id} value={hygienist.id}>
                            {providerLabel(hygienist)}
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
                    <div data-field="referralType">
                      <label className="block text-[#1E293B] font-normal mb-1 text-sm">
                        Referral Type <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.referralType}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            referralType: e.target.value,
                          });
                          clearError("referralType");
                        }}
                        disabled={loadingMetadata}
                        className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100 ${
                          errors.referralType ? "border-[#EF4444]" : "border-[#E2E8F0]"
                        }`}
                      >
                        <option value="">Select</option>
                        {metadata?.referral_types.map((type) => (
                          <option key={type.code} value={type.name}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      {errors.referralType && (
                        <p className="text-xs text-[#EF4444] mt-1">{errors.referralType}</p>
                      )}
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
                        disabled={loadingReferralTargets}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm disabled:bg-gray-100"
                      >
                        <option value="">
                          {loadingReferralTargets
                            ? "Loading…"
                            : referralTargets.length === 0
                              ? "No referral targets set up"
                              : "Select"}
                        </option>
                        {referralTargets.map((r) => {
                          const label =
                            r.practice_name ||
                            [r.last_name, r.first_name].filter(Boolean).join(", ") ||
                            `Referral #${r.id}`;
                          return (
                            <option key={r.id} value={label}>
                              {label}
                              {r.specialty ? ` — ${r.specialty}` : ""}
                            </option>
                          );
                        })}
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
                        disabled={loadingMetadata}
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
                      title={`Clears ${patientTypeConflict("CH")} — a patient cannot be both.`}
                      onChange={(e) => setPatientTypeFlag("CH", e.target.checked)}
                      disabled={!isIdentityComplete}
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
                      onChange={(e) => setPatientTypeFlag("CP", e.target.checked)}
                      disabled={!isIdentityComplete}
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
                      onChange={(e) => setPatientTypeFlag("EF", e.target.checked)}
                      disabled={!isIdentityComplete}
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
                      onChange={(e) => setPatientTypeFlag("OR", e.target.checked)}
                      disabled={!isIdentityComplete}
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
                      onChange={(e) => setPatientTypeFlag("SN", e.target.checked)}
                      disabled={!isIdentityComplete}
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
                      title={`Clears ${patientTypeConflict("SR")} — a patient cannot be both.`}
                      onChange={(e) => setPatientTypeFlag("SR", e.target.checked)}
                      disabled={!isIdentityComplete}
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
                      onChange={(e) => setPatientTypeFlag("SS", e.target.checked)}
                      disabled={!isIdentityComplete}
                      className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm text-[#1E293B]">
                      SS – Spanish Speaking
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-[#F7F9FC] rounded">
                    <input
                      type="checkbox"
                      checked={patientTypes.UP}
                      onChange={(e) => setPatientTypeFlag("UP", e.target.checked)}
                      disabled={!isIdentityComplete}
                      className="w-4 h-4 rounded border border-[#E2E8F0] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm text-[#1E293B]">
                      UP – Update Information
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── Later steps (siblings of the Step-1 grid), keyed by step id ── */}
          {currentStep?.id === "responsible-party" && (
            <ResponsiblePartyStep
              value={respParty}
              onChange={setRespParty}
              patient={{
                first_name: formData.firstName,
                last_name: formData.lastName,
                dob: formData.birthdate,
                sex: formData.sex,
                marital_status: formData.maritalStatus,
                ssn: formData.ssn,
                address_line1: formData.address1,
                address_line2: formData.address2,
                city: formData.city,
                state: formData.state,
                zip: formData.zip,
                phone: formData.phone,
                cell_phone: formData.cellPhone,
                work_phone: formData.workPhone,
                email: formData.email,
              }}
            />
          )}
          {/* One insurance screen per selected coverage type. */}
          {currentStep?.slotKey && (
            <InsuranceSlotStep
              key={currentStep.slotKey}
              slot={slotFor(currentStep.slotKey)}
              onChange={(patch) => updateInsuranceSlot(currentStep.slotKey!, patch)}
              // The patient does not exist until Finish, so the legacy
              // "Account Plans" scope has nothing to scope to yet.
              patientId={null}
            />
          )}
          {currentStep?.id === "medical-alerts" && (
            <MedicalAlertsStep
              value={medicalAlerts}
              onChange={setMedicalAlerts}
              onCatalog={setMedicalAlertLabels}
            />
          )}
          {currentStep?.id === "questionnaires" && (
            <QuestionnairesStep
              value={questionnaires}
              onChange={setQuestionnaires}
              onCatalog={(which, labels) =>
                setQuestionLabels((prev) => ({ ...prev, [which]: labels }))
              }
            />
          )}
          {currentStep?.id === "recall" && (
            <RecallStep
              entries={recalls}
              onChange={setRecalls}
              firstVisit={firstVisit}
              lastVisit={lastVisit}
              onVisitChange={(which, v) => (which === "first" ? setFirstVisit(v) : setLastVisit(v))}
            />
          )}

          {/* ── Footer / wizard navigation ─────────────────────────────── */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-[#E2E8F0]">
            <div className="flex gap-3">
              {stepIndex > 0 && (
                <button
                  onClick={() => {
                    setStepIndex((s) => Math.max(0, s - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={isSaving}
                  className="px-6 py-2 bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] rounded-lg hover:bg-[#F7F9FC] transition-colors font-semibold text-sm"
                >
                  &lt;&lt; Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (
                    !confirm("Are you sure you want to cancel? All unsaved data will be lost.")
                  ) {
                    return;
                  }
                  if (isModal) onClose?.();
                  else navigate(isEditMode ? `/patient/${editPatientId}/overview` : "/patient");
                }}
                className="px-6 py-2 bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] rounded-lg hover:bg-[#F7F9FC] transition-colors font-semibold text-sm"
              >
                Cancel
              </button>

              {/* Editing saves from any step — the record already exists, so
                  there is no "register at the end" moment to wait for. */}
              {isEditMode && (
                <button
                  onClick={handleSaveEdits}
                  disabled={!isIdentityComplete || isSaving || isLoadingPatient}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                    isIdentityComplete && !isSaving && !isLoadingPatient
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
                    "Save Changes"
                  )}
                </button>
              )}

              {/* Quick Save is only offered on Step 1 (save patient, skip wizard). */}
              {!isEditMode && stepIndex === 0 && (
                <button
                  onClick={handleQuickSave}
                  disabled={!isIdentityComplete || isSaving}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                    isIdentityComplete && !isSaving
                      ? "bg-white text-[#2FB9A7] border-2 border-[#2FB9A7] hover:bg-[#F0FDF9]"
                      : "bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? "Saving..." : "Quick Save"}
                </button>
              )}

              {stepIndex < steps.length - 1 ? (
                <button
                  onClick={handleContinue}
                  disabled={!isIdentityComplete || isSaving}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    isIdentityComplete && !isSaving
                      ? "bg-[#3A6EA5] text-white hover:bg-[#1F3A5F]"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Continue &gt;&gt;
                </button>
              ) : isEditMode ? null : (
                <button
                  onClick={handleFinish}
                  disabled={!isIdentityComplete || isSaving}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                    isIdentityComplete && !isSaving
                      ? "bg-[#2FB9A7] text-white hover:bg-[#26a396]"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    "Finish"
                  )}
                </button>
              )}
            </div>
          </div>

          {(saveError || Object.keys(errors).length > 0) && (
            <div className="mt-2 text-right">
              {saveError && <span className="text-sm text-red-600">{saveError}</span>}
              {Object.keys(errors).length > 0 && (
                <span className="text-sm text-[#EF4444] font-medium">
                  Please complete the highlighted required field
                  {Object.keys(errors).length > 1 ? "s" : ""}.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Patient Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                ⚠️ Identical Patients Found
              </h2>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-[#64748B] mb-4">
                The following patients match the identity information entered. Review
                before creating a new patient.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Birthdate
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Patient Name
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Office Short ID
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Patient ID
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Provider
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Active/Inactive
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-[#1F3A5F]">
                        Patient Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicatePatients.map((patient, index) => (
                      <tr
                        key={index}
                        className="border-b border-[#E2E8F0] hover:bg-[#F7F9FC]"
                      >
                        <td className="px-4 py-2">{patient.birthdate}</td>
                        <td className="px-4 py-2 font-semibold text-[#1F3A5F]">
                          {patient.name}
                        </td>
                        <td className="px-4 py-2">{patient.officeShortId}</td>
                        <td className="px-4 py-2">{patient.patientId}</td>
                        <td className="px-4 py-2">{patient.email}</td>
                        <td className="px-4 py-2">{patient.provider}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              patient.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{patient.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-6 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-semibold text-sm"
                >
                  Close & Continue Creating Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  );

  // The dialog is a plain overlay rather than the app chrome — the Overview
  // stays mounted underneath, so closing returns to it without a refetch.
  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          // Backdrop click closes; clicks inside the card must not.
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="mx-auto my-4 w-full max-w-[1500px] overflow-hidden rounded-lg border-2 border-[#3A6EA5] bg-white shadow-2xl">
          {screen}
        </div>
      </div>
    );
  }

  return (
    <AppShell
      onLogout={onLogout ?? (() => {})}
      currentOffice={currentOffice}
      setCurrentOffice={setCurrentOffice ?? (() => {})}
    >
      {screen}
    </AppShell>
  );
}