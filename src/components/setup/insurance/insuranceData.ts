// Insurance Setup — form models for carriers and employers.
//
// Per project convention (CLAUDE.md), the form binds DIRECTLY to the backend's
// snake_case field names — no camelCase aliases, no snake↔camel mapper. The keys
// here mirror `InsuranceCarrierRead`/`InsuranceCarrierUpdate` and
// `EmployerRead`/`EmployerUpdate` exactly so the body passes through to the
// generated client unchanged.

import type {
  InsuranceCarrierRead,
  InsuranceCarrierCreate,
  InsuranceCarrierUpdate,
  EmployerRead,
  EmployerCreate,
  EmployerUpdate,
} from "@/api/generated/model";

// ---------------------------------------------------------------------------
// Carrier type discriminator
// ---------------------------------------------------------------------------
// The backend stores carrier_type as a STRING flag: "True" = Dental,
// "False" = Medical. The list endpoint filters on it server-side, and reads
// also expose a derived boolean `is_dental`.
export const CARRIER_TYPE_DENTAL = "True";
export const CARRIER_TYPE_MEDICAL = "False";

export type CarrierVariant = "dental" | "medical";

export function carrierTypeFor(variant: CarrierVariant): string {
  return variant === "dental" ? CARRIER_TYPE_DENTAL : CARRIER_TYPE_MEDICAL;
}

// ---------------------------------------------------------------------------
// Carrier form
// ---------------------------------------------------------------------------

/** Editable carrier fields, keyed identically to the backend contract. */
export interface CarrierForm {
  name: string;
  carrier_type: string; // "True" (dental) | "False" (medical)
  insurance_type: string; // medical sub-type (free text), optional
  payer_id: string;
  national_id: string;
  claim_type: string;
  fee_id: string;
  phone: string;
  phone2: string;
  fax: string;
  email: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  contact: string;
  ref_num: string;
  notes: string;
  supports_realtime_eligibility: boolean;
  supports_claim_status: boolean;
  supports_dxc_attachment: boolean;
  is_active: boolean;
}

export function emptyCarrierForm(variant: CarrierVariant): CarrierForm {
  return {
    name: "",
    carrier_type: carrierTypeFor(variant),
    insurance_type: "",
    payer_id: "",
    national_id: "",
    claim_type: "",
    fee_id: "",
    phone: "",
    phone2: "",
    fax: "",
    email: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    contact: "",
    ref_num: "",
    notes: "",
    supports_realtime_eligibility: false,
    supports_claim_status: false,
    supports_dxc_attachment: false,
    is_active: true,
  };
}

export function carrierToForm(c: InsuranceCarrierRead): CarrierForm {
  return {
    name: c.name ?? "",
    carrier_type: c.carrier_type ?? CARRIER_TYPE_DENTAL,
    insurance_type: c.insurance_type ?? "",
    payer_id: c.payer_id ?? "",
    national_id: c.national_id ?? "",
    claim_type: c.claim_type ?? "",
    fee_id: c.fee_id ?? "",
    phone: c.phone ?? "",
    phone2: c.phone2 ?? "",
    fax: c.fax ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    address2: c.address2 ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    zip: c.zip ?? "",
    website: c.website ?? "",
    contact: c.contact ?? "",
    ref_num: c.ref_num ?? "",
    notes: c.notes ?? "",
    supports_realtime_eligibility: c.supports_realtime_eligibility ?? false,
    supports_claim_status: c.supports_claim_status ?? false,
    supports_dxc_attachment: c.supports_dxc_attachment ?? false,
    is_active: c.is_active ?? true,
  };
}

function carrierCommonBody(f: CarrierForm) {
  return {
    name: f.name.trim(),
    carrier_type: f.carrier_type, // preserved from the variant / loaded record
    insurance_type: f.insurance_type.trim() || null,
    payer_id: f.payer_id.trim() || null,
    national_id: f.national_id.trim() || null,
    claim_type: f.claim_type.trim() || null,
    fee_id: f.fee_id.trim() || null,
    phone: f.phone.trim() || null,
    phone2: f.phone2.trim() || null,
    fax: f.fax.trim() || null,
    email: f.email.trim() || null,
    address: f.address.trim() || null,
    address2: f.address2.trim() || null,
    city: f.city.trim() || null,
    state: f.state.trim() || null,
    zip: f.zip.trim() || null,
    website: f.website.trim() || null,
    contact: f.contact.trim() || null,
    ref_num: f.ref_num.trim() || null,
    notes: f.notes.trim() || null,
    supports_realtime_eligibility: f.supports_realtime_eligibility,
    supports_claim_status: f.supports_claim_status,
    supports_dxc_attachment: f.supports_dxc_attachment,
    is_active: f.is_active,
  };
}

export function buildCarrierCreate(f: CarrierForm): InsuranceCarrierCreate {
  return { ...carrierCommonBody(f) };
}

export function buildCarrierUpdate(f: CarrierForm): InsuranceCarrierUpdate {
  return { ...carrierCommonBody(f) };
}

// ---------------------------------------------------------------------------
// Employer form
// ---------------------------------------------------------------------------

/** Editable employer fields, keyed identically to the backend contract. */
export interface EmployerForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  salesrep: string;
  contact_person: string;
}

export function emptyEmployerForm(): EmployerForm {
  return {
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    salesrep: "",
    contact_person: "",
  };
}

export function employerToForm(e: EmployerRead): EmployerForm {
  return {
    name: e.name ?? "",
    address: e.address ?? "",
    city: e.city ?? "",
    state: e.state ?? "",
    zip: e.zip ?? "",
    phone: e.phone ?? "",
    salesrep: e.salesrep ?? "",
    contact_person: e.contact_person ?? "",
  };
}

function employerCommonBody(f: EmployerForm) {
  return {
    name: f.name.trim(),
    address: f.address.trim() || null,
    city: f.city.trim() || null,
    state: f.state.trim() || null,
    zip: f.zip.trim() || null,
    phone: f.phone.trim() || null,
    salesrep: f.salesrep.trim() || null,
    contact_person: f.contact_person.trim() || null,
  };
}

export function buildEmployerCreate(f: EmployerForm): EmployerCreate {
  return { ...employerCommonBody(f) };
}

export function buildEmployerUpdate(f: EmployerForm): EmployerUpdate {
  return { ...employerCommonBody(f) };
}
