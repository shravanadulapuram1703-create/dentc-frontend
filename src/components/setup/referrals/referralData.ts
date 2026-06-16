// Referral Setup — form model.
//
// Per project convention (CLAUDE.md) the form binds DIRECTLY to the backend's
// snake_case field names on `ReferralRead`/`ReferralCreate`/`ReferralUpdate`
// (tag: Patients, path /api/v1/referrals) — no camelCase aliases, no mapper.
//
// Several legacy screen fields have NO backend column and are surfaced read-only
// as gaps (see docs/referrals/referral_setup_backend_devreport.md):
//   eReferral ID, Practice Name, Contact, Cost.
// Mapping decisions for the ambiguous legacy fields:
//   "Referred By/To" -> referral_type   (also drives the SEARCH ON filter)
//   "Type"           -> reason_code     (also drives the TYPE dropdown filter)

import type { ReferralRead, ReferralCreate, ReferralUpdate } from "@/api/generated/model";

// `referral_type` is stored as a direction CODE on the backend ("0"/"1"), not a
// label — every seeded record uses "0". Map codes ↔ display labels here.
export const REFERRAL_DIRECTIONS: { code: string; label: string }[] = [
  { code: "0", label: "Referred By" },
  { code: "1", label: "Referred To" },
];

export function referralDirectionLabel(code?: string | null): string {
  if (code == null || code === "") return "";
  return REFERRAL_DIRECTIONS.find((d) => d.code === String(code))?.label ?? String(code);
}

/** Editable referral fields, keyed identically to the backend contract. */
export interface ReferralForm {
  office_id: number | null;
  referral_type: string; // direction code: "0" = Referred By, "1" = Referred To
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  npi: string;
  specialty: string;
  reason_code: string; // legacy "Type"
  notes: string;
}

export function emptyReferralForm(): ReferralForm {
  return {
    office_id: null,
    referral_type: "0",
    first_name: "",
    last_name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    npi: "",
    specialty: "",
    reason_code: "",
    notes: "",
  };
}

export function referralToForm(r: ReferralRead): ReferralForm {
  return {
    office_id: r.office_id ?? null,
    referral_type: r.referral_type ?? "",
    first_name: r.first_name ?? "",
    last_name: r.last_name ?? "",
    address: r.address ?? "",
    city: r.city ?? "",
    state: r.state ?? "",
    zip: r.zip ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    npi: r.npi ?? "",
    specialty: r.specialty ?? "",
    reason_code: r.reason_code ?? "",
    notes: r.notes ?? "",
  };
}

/** Shared snake_case body for POST/PATCH — empty strings collapse to null. */
function commonBody(f: ReferralForm) {
  return {
    office_id: f.office_id ?? null,
    referral_type: f.referral_type.trim() || null,
    first_name: f.first_name.trim() || null,
    last_name: f.last_name.trim() || null,
    address: f.address.trim() || null,
    city: f.city.trim() || null,
    state: f.state.trim() || null,
    zip: f.zip.trim() || null,
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
    npi: f.npi.trim() || null,
    specialty: f.specialty.trim() || null,
    reason_code: f.reason_code.trim() || null,
    notes: f.notes.trim() || null,
  };
}

export function buildReferralCreate(f: ReferralForm): ReferralCreate {
  return { ...commonBody(f) };
}

export function buildReferralUpdate(f: ReferralForm): ReferralUpdate {
  return { ...commonBody(f) };
}

/** "Last, First" display label used by the search list and headers. */
export function referralDisplayName(r: Pick<ReferralRead, "last_name" | "first_name">): string {
  const last = (r.last_name ?? "").trim();
  const first = (r.first_name ?? "").trim();
  if (last && first) return `${last}, ${first}`;
  return last || first || "(unnamed)";
}
