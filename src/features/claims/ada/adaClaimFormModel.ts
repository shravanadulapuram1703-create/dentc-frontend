// ADA Dental Claim Form (Version 2024 © American Dental Association) — data
// model, code lists and completion-rule checks.
//
// Source: "ADA Dental Claim Form Completion Instructions, Version 2024"
// (Completion Instructions Date 2023 Jun 02). Every field below is named after
// the form item it prints in (Items 1–58) so the printed form, the pre-flight
// checklist and the backend/UI gap reports all speak the same language.
//
// Field identifiers are snake_case to match the backend rows they come from.

/** One of the 10 repeating service lines (Items 24–31). */
export interface AdaServiceLine {
  /** Source patient_procedures.id — for traceability only, never printed. */
  procedure_id: string;
  /** Item 24 — MM/DD/CCYY; blank on a predetermination/preauthorization. */
  procedure_date: string;
  /** Item 25 — two-digit area of the oral cavity code, or blank. */
  area_of_oral_cavity: string;
  /** Item 26 — "JP" when Item 27 is reported, otherwise blank. */
  tooth_system: string;
  /** Item 27 — tooth number(s)/letter(s), ranges with "-" and "," */
  tooth_numbers: string;
  /** Item 28 — surface letters with no separators (e.g. "MOD"). */
  tooth_surface: string;
  /** Item 29 — CDT procedure code. */
  procedure_code: string;
  /** Item 29a — diagnosis pointer letter(s) A–D, primary first. */
  diagnosis_pointer: string;
  /** Item 29b — quantity 01–99. */
  quantity: string;
  /** Item 30 — brief description. */
  description: string;
  /** Item 31 — the dentist's full fee. */
  fee: number;
}

/** Name + address block used by Items 3, 11, 12, 20, 48, 56. */
export interface AdaAddressBlock {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
}

export type AdaGender = "M" | "F" | "U" | "";
export type AdaRelationship = "self" | "spouse" | "dependent" | "other" | "";

export interface AdaClaimForm {
  // ---- Header information -------------------------------------------------
  /** Item 1 — mark all applicable boxes. */
  transaction: {
    actual_services: boolean;
    predetermination: boolean;
    epsdt: boolean;
  };
  /** Item 2. */
  predetermination_number: string;

  // ---- Dental benefit plan information -------------------------------------
  /** Item 3 (name/address) + 3a (payer id). */
  payer: AdaAddressBlock & { payer_id: string };

  // ---- Other coverage (Items 4–11a) ------------------------------------------
  other_coverage: {
    /** Item 4 — mark Dental?/Medical? when another plan exists. */
    dental: boolean;
    medical: boolean;
    /** Item 5 — Last, First, Middle Initial, Suffix. */
    subscriber_name: string;
    /** Item 6 — MM/DD/CCYY. */
    dob: string;
    /** Item 7. */
    gender: AdaGender;
    /** Item 8. */
    subscriber_id: string;
    /** Item 9. */
    group_number: string;
    /** Item 10 — patient's relationship to the person in Item 5. */
    patient_relationship: AdaRelationship;
    /** Item 11 + 11a. */
    payer: AdaAddressBlock & { payer_id: string };
  };

  // ---- Policyholder / subscriber (Items 12–17) --------------------------------
  subscriber: AdaAddressBlock & {
    /** Item 13 — MM/DD/CCYY. */
    dob: string;
    /** Item 14. */
    gender: AdaGender;
    /** Item 15 — identifier assigned by the plan. */
    subscriber_id: string;
    /** Item 16. */
    group_number: string;
    /** Item 17. */
    employer_name: string;
  };

  // ---- Patient information (Items 18–23) ---------------------------------------
  patient: AdaAddressBlock & {
    /** Item 18 — relationship to the policyholder in Item 12. */
    relationship: AdaRelationship;
    /** Item 21 — MM/DD/CCYY. */
    dob: string;
    /** Item 22. */
    gender: AdaGender;
    /** Item 23 — Patient ID / Account # assigned by the dentist. */
    patient_id: string;
  };

  // ---- Record of services provided (Items 24–35) -------------------------------
  service_lines: AdaServiceLine[];
  /** Item 31a — other fee(s) such as sales tax; null prints blank. */
  other_fees: number | null;
  /** Item 33 — permanent tooth numbers ("1".."32") to mark with an X. */
  missing_teeth: string[];
  /** Item 34 — "AB" (ICD-10-CM) when any diagnosis code is present. */
  diagnosis_code_list_qualifier: "AB" | "";
  /** Item 34a — A, B, C, D. */
  diagnosis_codes: [string, string, string, string];
  /** Item 35. */
  remarks: string;

  // ---- Authorizations (Items 36–37) --------------------------------------------
  authorizations: {
    /** Item 36 — prints "Signature on File" + date when true. */
    patient_signature_on_file: boolean;
    patient_signature_date: string;
    /** Item 37 — prints "Signature on File" + date when true. */
    subscriber_signature_on_file: boolean;
    subscriber_signature_date: string;
    /** Captured signature images (data URLs) printed on the signature lines; empty = none. */
    patient_signature_image: string;
    subscriber_signature_image: string;
  };

  // ---- Ancillary claim / treatment information (Items 38–47) -------------------
  ancillary: {
    /** Item 38 — 2-digit CMS place of service code. */
    place_of_treatment: string;
    /** Item 39 — "Y" / "N" (or blank when unknown). */
    enclosures: "Y" | "N" | "";
    /** Item 39a — MM/DD/CCYY of the last scaling and root planing. */
    date_last_srp: string;
    /** Item 40 — null prints neither box. */
    is_orthodontics: boolean | null;
    /** Item 41. */
    appliance_placed_date: string;
    /** Item 42. */
    months_of_treatment: string;
    /** Item 43 — null prints neither box. */
    replacement_of_prosthesis: boolean | null;
    /** Item 44. */
    prior_placement_date: string;
    /** Item 45. */
    treatment_resulting_from: {
      occupational_illness: boolean;
      auto_accident: boolean;
      other_accident: boolean;
    };
    /** Item 46. */
    accident_date: string;
    /** Item 47 — two-letter state. */
    auto_accident_state: string;
  };

  // ---- Billing dentist or dental entity (Items 48–52a) -------------------------
  billing: AdaAddressBlock & {
    /** Item 49. */
    npi: string;
    /** Item 50 — blank when a corporation bills. */
    license_number: string;
    /** Item 51. */
    ssn_or_tin: string;
    /** Item 52. */
    phone: string;
    /** Item 52a — legacy/additional id, never the NPI. */
    additional_provider_id: string;
  };

  // ---- Treating dentist and treatment location (Items 53–58) -------------------
  treating: {
    /** Item 53 — printed name of the treating dentist. */
    name: string;
    /** Item 53 — date the form is signed / generated. */
    signature_date: string;
    /** Item 53a. */
    is_locum_tenens: boolean;
    /** Item 54 — Type 1 NPI. */
    npi: string;
    /** Item 55. */
    license_number: string;
    /** Item 56 — physical treatment location (street address, no P.O. Box). */
    location: AdaAddressBlock;
    /** Item 56a — Healthcare Provider Taxonomy code. */
    specialty_code: string;
    /** Item 57. */
    phone: string;
    /** Item 58. */
    additional_provider_id: string;
    /** Captured / on-file signature image (data URL) for Item 53; empty = printed name only. */
    signature_image: string;
  };

  /** Not printed in any box — identifies the source claim on the footer line. */
  meta: {
    claim_id: string;
    claim_number: string;
    billing_order: string;
    patient_id: number;
    generated_at: string;
  };
}

// ---------------------------------------------------------------------------
// Code lists from the completion instructions
// ---------------------------------------------------------------------------

/** Item 25 — Area of the oral cavity (two-digit codes). */
export const AREA_OF_ORAL_CAVITY: Record<string, string> = {
  "00": "entire oral cavity",
  "01": "maxillary arch",
  "02": "mandibular arch",
  "10": "upper right quadrant",
  "20": "upper left quadrant",
  "30": "lower left quadrant",
  "40": "lower right quadrant",
};

/** DentC quadrant / arch tokens (procedure rows, code catalog) → Item 25 code. */
export const QUADRANT_TO_AREA: Record<string, string> = {
  UR: "10",
  UL: "20",
  LL: "30",
  LR: "40",
  UA: "01",
  LA: "02",
  FM: "00",
  // Legacy numeric quadrant storage.
  "1": "10",
  "2": "20",
  "3": "30",
  "4": "40",
  "10": "10",
  "20": "20",
  "30": "30",
  "40": "40",
  "01": "01",
  "02": "02",
  "00": "00",
};

/** Item 28 — single-letter surface codes. */
export const SURFACE_CODES = ["B", "D", "F", "I", "L", "M", "O"] as const;

/** Item 26 — the only tooth system the paper form accepts. */
export const TOOTH_SYSTEM_JP = "JP";

/** Item 56a — Healthcare Provider Taxonomy codes for dental service providers. */
export const PROVIDER_SPECIALTY_CODES: Array<{ code: string; label: string }> = [
  { code: "122300000X", label: "Dentist" },
  { code: "1223G0001X", label: "General Practice" },
  { code: "1223D0001X", label: "Dental Public Health" },
  { code: "1223E0200X", label: "Endodontics" },
  { code: "1223X0400X", label: "Orthodontics" },
  { code: "1223P0221X", label: "Pediatric Dentistry" },
  { code: "1223P0300X", label: "Periodontics" },
  { code: "1223P0700X", label: "Prosthodontics" },
  { code: "1223P0106X", label: "Oral & Maxillofacial Pathology" },
  { code: "1223X0008X", label: "Oral & Maxillofacial Radiology" },
  { code: "1223S0112X", label: "Oral & Maxillofacial Surgery" },
];

/** The general "Dentist" code may be used instead of any other practitioner code. */
export const DEFAULT_SPECIALTY_CODE = "122300000X";

/**
 * Map a free-text provider specialty (providers.specialty is an
 * un-enumerated string) to the taxonomy code the form requires. A value that
 * already looks like a taxonomy code is passed through.
 */
export function specialtyToTaxonomy(specialty: string | null | undefined): string {
  const raw = (specialty ?? "").trim();
  if (!raw) return DEFAULT_SPECIALTY_CODE;
  if (/^\d{4}[A-Z0-9]{5}X$/i.test(raw)) return raw.toUpperCase();
  const s = raw.toLowerCase();
  if (/endo/.test(s)) return "1223E0200X";
  if (/ortho/.test(s)) return "1223X0400X";
  if (/pedi|pedo|child/.test(s)) return "1223P0221X";
  if (/perio/.test(s)) return "1223P0300X";
  if (/prostho/.test(s)) return "1223P0700X";
  if (/patholog/.test(s)) return "1223P0106X";
  if (/radiolog/.test(s)) return "1223X0008X";
  if (/surg/.test(s)) return "1223S0112X";
  if (/public/.test(s)) return "1223D0001X";
  if (/general|gp|gd/.test(s)) return "1223G0001X";
  return DEFAULT_SPECIALTY_CODE;
}

/** Item 38 — frequently used CMS place-of-service codes named in the instructions. */
export const PLACE_OF_SERVICE_LABELS: Record<string, string> = {
  "02": "Telehealth",
  "11": "Office",
  "12": "Home",
  "21": "Inpatient Hospital",
  "22": "Outpatient Hospital",
  "31": "Skilled Nursing Facility",
  "32": "Nursing Facility",
};

/** Permanent dentition in Item 33 order: top row 1–16, bottom row 32–17. */
export const MISSING_TEETH_TOP = Array.from({ length: 16 }, (_, i) => String(i + 1));
export const MISSING_TEETH_BOTTOM = Array.from({ length: 16 }, (_, i) => String(32 - i));

/** Service lines per paper form (Item 24–31 repeat 10 times). */
export const LINES_PER_FORM = 10;

/** Codes for which Item 33 (missing teeth) is pertinent. */
export const MISSING_TEETH_PERTINENT_RE = /^D(4\d{3}|5\d{3}|6\d{3})$/i;

/** Scaling and root planing codes for Item 39a. */
export const SRP_CODES = ["D4341", "D4342"];

/**
 * Codes whose nomenclature already names the arch — Item 25 must be left
 * blank for them (rule 25.b). Complete/partial dentures, rebases, relines and
 * overdentures.
 */
export const AREA_IN_NOMENCLATURE_RE =
  /^D5(11\d|12\d|13\d|14\d|21\d|22\d|28\d|71\d|72\d|73\d|74\d|75\d|76\d|81\d|82\d|86[3-6])$/i;

/** Crowns and fixed/removable prostheses — Item 43 applies. */
export const PROSTHESIS_CODE_RE = /^D(27\d{2}|5\d{3}|62\d{2}|6[3-9]\d{2}|60[5-9]\d)$/i;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** YYYY-MM-DD / ISO timestamp / MM/DD/YYYY → MM/DD/CCYY (form rule D: four-digit year). */
export function adaDate(value: string | null | undefined): string {
  if (!value) return "";
  const v = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(v);
  if (us) {
    const [, m = "", d = "", y = ""] = us;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${yy}`;
  }
  return v;
}

/** Today's date as MM/DD/CCYY in the local calendar. */
export function adaToday(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/** Items 7 / 14 / 22 — M, F or U. */
export function adaGender(value: string | null | undefined): AdaGender {
  const v = (value ?? "").trim().toUpperCase();
  if (!v) return "";
  if (v.startsWith("M")) return "M";
  if (v.startsWith("F")) return "F";
  return "U";
}

/** Items 10 / 18 — patient_insurance.relationship → form checkbox. */
export function adaRelationship(value: string | null | undefined): AdaRelationship {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "";
  if (v === "self" || v === "s" || v === "subscriber") return "self";
  if (v === "spouse" || v === "sp" || v === "partner" || v === "domestic partner") return "spouse";
  if (v === "child" || v === "dependent" || v === "dependant" || v === "c" || v === "d") return "dependent";
  return "other";
}

/** "Last, First, Middle Initial, Suffix" (rule C: full names). */
export function adaPersonName(
  last: string | null | undefined,
  first: string | null | undefined,
  middle_initial?: string | null,
  suffix?: string | null,
): string {
  const parts = [last, first, middle_initial, suffix].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.join(", ");
}

/** Item 28 — strip separators/spaces and upper-case ("m-o-d" → "MOD"). */
export function adaSurface(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

/** Item 27 — normalise tooth lists ("3 , 4" → "3,4"; letters upper-cased). */
export function adaToothNumbers(value: string | null | undefined): string {
  return (value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/;/g, ",")
    .replace(/,+/g, ",")
    .replace(/^,|,$/g, "");
}

/** Item 25 from a DentC quadrant/arch token. */
export function adaAreaOfOralCavity(quadrant: string | null | undefined): string {
  const q = (quadrant ?? "").trim().toUpperCase();
  return QUADRANT_TO_AREA[q] ?? "";
}

export function adaMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(2);
}

/** Item 29b — 01–99 (default 01). */
export function adaQuantity(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return "01";
  return String(Math.min(99, Math.floor(n))).padStart(2, "0");
}

export function formatAddressLines(b: AdaAddressBlock): string[] {
  const line3 = [[b.city, b.state].filter(Boolean).join(", "), b.zip].filter(Boolean).join(" ");
  return [b.name, b.address_line1, b.address_line2, line3].filter((l) => l && l.trim() !== "");
}

/** Total fee for a set of lines plus Item 31a (Item 32). */
export function totalFee(lines: AdaServiceLine[], other_fees: number | null): number {
  return lines.reduce((sum, l) => sum + (Number.isFinite(l.fee) ? l.fee : 0), 0) + (other_fees ?? 0);
}

/** Split the lines into the 10-per-form pages rule E requires. */
export function chunkServiceLines(lines: AdaServiceLine[]): AdaServiceLine[][] {
  if (lines.length === 0) return [[]];
  const pages: AdaServiceLine[][] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_FORM) pages.push(lines.slice(i, i + LINES_PER_FORM));
  return pages;
}

// ---------------------------------------------------------------------------
// Completion-rule checks (the pre-flight list shown before printing)
// ---------------------------------------------------------------------------

export type AdaIssueLevel = "error" | "warning" | "info";

export interface AdaFormIssue {
  /** Form item(s) the issue concerns, e.g. "3", "24", "49–52". */
  item: string;
  level: AdaIssueLevel;
  message: string;
}

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const CDT_RE = /^D\d{4}$/;
const PO_BOX_RE = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box)\b/i;

function blockComplete(b: AdaAddressBlock): boolean {
  return !!(b.name && b.address_line1 && b.city && b.state && b.zip);
}

/**
 * Check a form against the completion instructions. Errors are items the
 * instructions say are always completed (the payer will reject the claim);
 * warnings are conditional items that look inconsistent; info is advisory.
 */
export function checkAdaClaimForm(form: AdaClaimForm): AdaFormIssue[] {
  const issues: AdaFormIssue[] = [];
  const err = (item: string, message: string) => issues.push({ item, level: "error", message });
  const warn = (item: string, message: string) => issues.push({ item, level: "warning", message });
  const info = (item: string, message: string) => issues.push({ item, level: "info", message });

  // Item 1 — exactly the boxes that apply.
  const t = form.transaction;
  if (!t.actual_services && !t.predetermination && !t.epsdt) err("1", "No Type of Transaction box is marked.");
  if (t.actual_services && t.predetermination)
    warn("1", "Both 'Statement of Actual Services' and 'Request for Predetermination' are marked.");

  // Item 3 — always completed.
  if (!form.payer.name) err("3", "Insurance company / dental benefit plan name is missing.");
  else if (!blockComplete(form.payer)) err("3", "Insurance company address, city, state or ZIP is incomplete.");
  if (!form.payer.payer_id) info("3a", "Payer ID not on file for this carrier (allowed blank when not known).");

  // Items 4–11 — other coverage.
  const oc = form.other_coverage;
  if (oc.dental || oc.medical) {
    if (!oc.subscriber_name) warn("5", "Other coverage marked but the other policyholder's name is blank.");
    if (oc.dob && !DATE_RE.test(oc.dob)) err("6", "Other policyholder date of birth must be MM/DD/CCYY.");
    if (!oc.dob) warn("6", "Other policyholder date of birth is blank.");
    if (!oc.gender) warn("7", "Other policyholder gender is blank.");
    if (!oc.subscriber_id) warn("8", "Other policyholder identifier is blank.");
    if (!oc.patient_relationship) warn("10", "Patient's relationship to the other policyholder is not marked.");
    if (!oc.payer.name) warn("11", "Other insurance company name is blank.");
  }

  // Items 12–17 — policyholder for the payer in Item 3.
  if (!form.subscriber.name) err("12", "Policyholder / subscriber name is missing.");
  else if (!blockComplete(form.subscriber)) warn("12", "Policyholder address, city, state or ZIP is incomplete.");
  if (!form.subscriber.dob) err("13", "Policyholder date of birth is missing (8 digits required).");
  else if (!DATE_RE.test(form.subscriber.dob)) err("13", "Policyholder date of birth must be MM/DD/CCYY.");
  if (!form.subscriber.gender) warn("14", "Policyholder gender is not marked.");
  if (!form.subscriber.subscriber_id) err("15", "Policyholder / subscriber identifier (member ID) is missing.");
  if (!form.subscriber.group_number) warn("16", "Plan / group number is blank.");

  // Items 18–23 — patient.
  if (!form.patient.relationship) err("18", "Patient relationship to the policyholder is not marked.");
  if (form.patient.relationship !== "self") {
    if (!form.patient.name) err("20", "Patient name is missing.");
    else if (!blockComplete(form.patient)) warn("20", "Patient address, city, state or ZIP is incomplete.");
    if (!form.patient.dob) err("21", "Patient date of birth is missing.");
    else if (!DATE_RE.test(form.patient.dob)) err("21", "Patient date of birth must be MM/DD/CCYY.");
    if (!form.patient.gender) warn("22", "Patient gender is not marked.");
  }

  // Items 24–31 — service lines.
  if (form.service_lines.length === 0) err("24–31", "The claim has no procedures to report.");
  if (form.service_lines.length > LINES_PER_FORM)
    info("24–31", `${form.service_lines.length} procedures — printed as ${Math.ceil(form.service_lines.length / LINES_PER_FORM)} fully completed forms (rule E).`);
  form.service_lines.forEach((l, i) => {
    const n = `line ${i + 1}`;
    if (t.actual_services && !l.procedure_date) warn("24", `${n}: no procedure date although the claim reports actual services.`);
    if (t.predetermination && !t.actual_services && l.procedure_date)
      warn("24", `${n}: a procedure date is printed on a predetermination request (should be blank).`);
    if (l.procedure_date && !DATE_RE.test(l.procedure_date)) err("24", `${n}: procedure date must be MM/DD/CCYY.`);
    if (l.area_of_oral_cavity && !AREA_OF_ORAL_CAVITY[l.area_of_oral_cavity])
      err("25", `${n}: '${l.area_of_oral_cavity}' is not a valid area of the oral cavity code.`);
    if (l.tooth_numbers && l.tooth_system !== TOOTH_SYSTEM_JP) err("26", `${n}: tooth system must be JP when a tooth is reported.`);
    if (l.tooth_surface && !l.tooth_numbers) warn("27", `${n}: a surface is reported without a tooth number.`);
    if (l.tooth_surface && /[^BDFILMO]/.test(l.tooth_surface))
      err("28", `${n}: surface '${l.tooth_surface}' contains letters outside B, D, F, I, L, M, O.`);
    if (!CDT_RE.test(l.procedure_code)) err("29", `${n}: '${l.procedure_code}' is not a CDT code (Dnnnn).`);
    if (l.diagnosis_pointer && !form.diagnosis_code_list_qualifier)
      err("29a", `${n}: diagnosis pointer set but Item 34 qualifier/codes are blank.`);
    if (!/^\d{2}$/.test(l.quantity) || l.quantity === "00") err("29b", `${n}: quantity must be 01–99.`);
    if (!(l.fee > 0)) warn("31", `${n}: fee is ${adaMoney(l.fee) || "blank"} — report the dentist's full fee.`);
  });

  // Items 34/34a.
  const dx = form.diagnosis_codes.filter(Boolean);
  if (dx.length > 0 && form.diagnosis_code_list_qualifier !== "AB") err("34", "Diagnosis codes present but qualifier is not AB (ICD-10-CM).");
  if (dx.length > 0 && !form.service_lines.some((l) => l.diagnosis_pointer))
    warn("29a", "Diagnosis codes are listed in Item 34a but no service line points at them.");
  if (dx.length === 0) info("34", "No ICD-10-CM diagnosis codes (required only when the payer / state regulation asks for them).");

  // Item 33.
  const pertinent = form.service_lines.some((l) => MISSING_TEETH_PERTINENT_RE.test(l.procedure_code));
  if (pertinent && form.missing_teeth.length === 0)
    info("33", "Perio / prosthodontic / implant procedures reported and no missing teeth are charted — verify the restorative chart.");

  // Item 35.
  if (form.remarks.length > 240) warn("35", "Remarks exceed 240 characters and will be truncated.");

  // Items 36/37.
  if (!form.authorizations.patient_signature_on_file && !form.authorizations.patient_signature_image)
    info("36", "Patient signature is not on file — capture it below or have the patient/guardian sign the printed form.");
  if (!form.authorizations.subscriber_signature_on_file && !form.authorizations.subscriber_signature_image)
    info("37", "Assignment of benefits is not on file — capture the subscriber signature or have them sign Item 37.");
  if (form.transaction.actual_services && !form.treating.signature_image)
    info("53", "Treating dentist signature not captured — the dentist signs the printed form (not required for predeterminations).");

  // Items 38–47.
  const a = form.ancillary;
  if (!/^\d{2}$/.test(a.place_of_treatment)) err("38", "Place of Treatment must be a 2-digit CMS place of service code.");
  if (!a.enclosures) warn("39", "Enclosures Y/N is blank.");
  if (a.date_last_srp && !DATE_RE.test(a.date_last_srp)) err("39a", "Date Last SRP must be MM/DD/CCYY.");
  if (a.is_orthodontics) {
    if (!a.appliance_placed_date) warn("41", "Orthodontic treatment marked but Date Appliance Placed is blank.");
    else if (!DATE_RE.test(a.appliance_placed_date)) err("41", "Date Appliance Placed must be MM/DD/CCYY.");
    if (!a.months_of_treatment) warn("42", "Orthodontic treatment marked but Months of Treatment is blank.");
  }
  const prosthesis = form.service_lines.some((l) => PROSTHESIS_CODE_RE.test(l.procedure_code));
  if (prosthesis && a.replacement_of_prosthesis == null)
    warn("43", "Crown / prosthesis procedures reported but Replacement of Prosthesis is not answered (Claim Fill-Out).");
  if (a.replacement_of_prosthesis && !a.prior_placement_date)
    warn("44", "Replacement of Prosthesis is YES but Date of Prior Placement is blank.");
  if (a.prior_placement_date && !DATE_RE.test(a.prior_placement_date)) err("44", "Date of Prior Placement must be MM/DD/CCYY.");
  const tr = a.treatment_resulting_from;
  if (tr.occupational_illness || tr.auto_accident || tr.other_accident) {
    if (!a.accident_date) warn("46", "Accident marked but Date of Accident is blank.");
    else if (!DATE_RE.test(a.accident_date)) err("46", "Date of Accident must be MM/DD/CCYY.");
    if (tr.auto_accident && !a.auto_accident_state) warn("47", "Auto accident marked but Auto Accident State is blank.");
  }

  // Items 48–52a — billing dentist / entity.
  if (!form.billing.name) err("48", "Billing dentist / dental entity name is missing.");
  else if (!blockComplete(form.billing)) err("48", "Billing entity address, city, state or ZIP is incomplete.");
  if (!form.billing.npi) err("49", "Billing NPI is missing.");
  else if (!/^\d{10}$/.test(form.billing.npi)) err("49", `Billing NPI '${form.billing.npi}' is not 10 digits.`);
  if (!form.billing.ssn_or_tin) err("51", "Billing SSN / TIN is missing.");
  if (!form.billing.phone) warn("52", "Billing phone number is blank.");

  // Items 53–58 — treating dentist.
  if (!form.treating.name) err("53", "Treating dentist name is missing.");
  if (!form.treating.npi) err("54", "Treating dentist NPI is missing.");
  else if (!/^\d{10}$/.test(form.treating.npi)) err("54", `Treating NPI '${form.treating.npi}' is not 10 digits.`);
  if (!form.treating.license_number) err("55", "Treating dentist license number is missing.");
  if (!blockComplete({ ...form.treating.location, name: "x" })) err("56", "Treatment location address, city, state or ZIP is incomplete.");
  if (PO_BOX_RE.test(`${form.treating.location.address_line1} ${form.treating.location.address_line2}`))
    err("56", "Treatment location must be a street address, not a P.O. Box.");
  if (!form.treating.specialty_code) err("56a", "Provider specialty code is missing.");
  if (!form.treating.phone) warn("57", "Treating dentist phone number is blank.");

  return issues;
}

export function summariseIssues(issues: AdaFormIssue[]): { errors: number; warnings: number; infos: number } {
  return {
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
    infos: issues.filter((i) => i.level === "info").length,
  };
}
