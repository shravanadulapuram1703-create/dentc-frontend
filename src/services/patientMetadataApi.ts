/**
 * Patient form metadata (titles, pronouns, states, genders, …).
 *
 * The legacy `/patients/metadata*` endpoints no longer exist — these lookups now
 * come from the seeded `/definitions` resource (`group_code=<…>`). This module
 * composes the per-group definitions into the `PatientMetadataResponse` shape the
 * patient forms already consume. `DefinitionRead.key1` is the stored value;
 * `description` is the display label.
 */

import { listDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import type { DefinitionRead } from "@/api/generated/model";

// ===== TYPES =====

export interface MetadataOption {
  code: string;
  name: string;
  description: string;
}

export type TitleOption = MetadataOption;
export type PronounOption = MetadataOption;
export type StateOption = MetadataOption; // code = state code (e.g. "PA"); name = full state name
export type MaritalStatusOption = MetadataOption;
export type GenderOption = MetadataOption;
export type ResponsiblePartyRelationshipOption = MetadataOption;
export type ContactPreferenceOption = MetadataOption;
export type ReferralTypeOption = MetadataOption;
export type PatientTypeOption = MetadataOption; // code = e.g. "CH"/"OR"; description = full description

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

// ===== API =====

const toOption = (d: DefinitionRead): MetadataOption => ({
  code: d.key1,
  name: d.description,
  description: d.description,
});

/** Fetch one seeded `/definitions` group, sorted by sort_order, as form options. */
const fetchGroup = async (groupCode: string): Promise<MetadataOption[]> => {
  const res = await listDefinitions({ group_code: groupCode, is_active: true, size: 200 });
  return res.items
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(toOption);
};

/**
 * Fetch all patient form metadata in one shot (composed from `/definitions`).
 */
export const fetchPatientMetadata = async (): Promise<PatientMetadataResponse> => {
  const [
    titles,
    pronouns,
    states,
    marital_statuses,
    genders,
    responsible_party_relationships,
    contact_preferences,
    referral_types,
    patient_types,
  ] = await Promise.all([
    fetchGroup("title"),
    fetchGroup("pronoun"),
    fetchGroup("state"),
    fetchGroup("marital_status"),
    fetchGroup("gender"),
    fetchGroup("resp_party_rel"),
    fetchGroup("contact_pref"),
    fetchGroup("referral_type"),
    fetchGroup("patient_type"),
  ]);

  return {
    titles,
    pronouns,
    states,
    marital_statuses,
    genders,
    responsible_party_relationships,
    contact_preferences,
    referral_types,
    patient_types,
  };
};
