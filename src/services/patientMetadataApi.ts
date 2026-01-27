import api from "./api";

// ===== TYPES =====

export interface MetadataOption {
  code: string;
  name: string;
  description?: string;
}

export interface TitleOption extends MetadataOption {}
export interface PronounOption extends MetadataOption {}
export interface StateOption extends MetadataOption {
  code: string; // State code (e.g., "PA", "CA")
  name: string; // Full state name
}
export interface MaritalStatusOption extends MetadataOption {}
export interface GenderOption extends MetadataOption {}
export interface ResponsiblePartyRelationshipOption extends MetadataOption {}
export interface ContactPreferenceOption extends MetadataOption {}
export interface ReferralTypeOption extends MetadataOption {}
export interface PatientTypeOption extends MetadataOption {
  code: string; // e.g., "CH", "CP", "OR"
  name: string; // Display name
  description: string; // Full description
}

export interface PatientMetadataResponse {
  titles: TitleOption[];
  pronouns: PronounOption[];
  states: StateOption[];
  marital_statuses: MaritalStatusOption[];
  genders: GenderOption[];
  responsible_party_relationships: ResponsiblePartyRelationshipOption[];
  contact_preferences: ContactPreferenceOption[];
  referral_types: ReferralTypeOption[];
  patient_types: PatientTypeOption[];
}

// ===== API FUNCTIONS =====

/**
 * Fetch all patient metadata (titles, pronouns, states, etc.)
 * This is a single endpoint that returns all metadata needed for patient forms
 */
export const fetchPatientMetadata = async (): Promise<PatientMetadataResponse> => {
  const response = await api.get<PatientMetadataResponse>("/api/v1/patients/metadata");
  return response.data;
};

/**
 * Fetch individual metadata endpoints (if needed separately)
 */

export const fetchTitles = async (): Promise<TitleOption[]> => {
  const response = await api.get<{ titles: TitleOption[] }>("/api/v1/patients/metadata/titles");
  return response.data.titles;
};

export const fetchPronouns = async (): Promise<PronounOption[]> => {
  const response = await api.get<{ pronouns: PronounOption[] }>("/api/v1/patients/metadata/pronouns");
  return response.data.pronouns;
};

export const fetchStates = async (): Promise<StateOption[]> => {
  const response = await api.get<{ states: StateOption[] }>("/api/v1/patients/metadata/states");
  return response.data.states;
};

export const fetchMaritalStatuses = async (): Promise<MaritalStatusOption[]> => {
  const response = await api.get<{ marital_statuses: MaritalStatusOption[] }>("/api/v1/patients/metadata/marital-statuses");
  return response.data.marital_statuses;
};

export const fetchGenders = async (): Promise<GenderOption[]> => {
  const response = await api.get<{ genders: GenderOption[] }>("/api/v1/patients/metadata/genders");
  return response.data.genders;
};

export const fetchResponsiblePartyRelationships = async (): Promise<ResponsiblePartyRelationshipOption[]> => {
  const response = await api.get<{ relationships: ResponsiblePartyRelationshipOption[] }>("/api/v1/patients/metadata/responsible-party-relationships");
  return response.data.relationships;
};

export const fetchContactPreferences = async (): Promise<ContactPreferenceOption[]> => {
  const response = await api.get<{ contact_preferences: ContactPreferenceOption[] }>("/api/v1/patients/metadata/contact-preferences");
  return response.data.contact_preferences;
};

export const fetchReferralTypes = async (): Promise<ReferralTypeOption[]> => {
  const response = await api.get<{ referral_types: ReferralTypeOption[] }>("/api/v1/patients/metadata/referral-types");
  return response.data.referral_types;
};

export const fetchPatientTypes = async (): Promise<PatientTypeOption[]> => {
  const response = await api.get<{ patient_types: PatientTypeOption[] }>("/api/v1/patients/metadata/patient-types");
  return response.data.patient_types;
};
