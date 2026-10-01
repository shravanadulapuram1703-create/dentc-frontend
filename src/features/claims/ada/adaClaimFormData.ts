// Assemble an ADA Dental Claim Form (2024) from the DentC backend.
//
// Everything printed on the form is read from the rows the claim screen already
// works with plus a handful of lookups the form needs and the screen does not:
//
//   Item 3/3a   insurance carrier (name/address/payer id)      GET /insurance-carriers/{id}
//   Items 4–11  the patient's *other* insurance slot           listPatientInsurance + subscriber/plan/carrier
//   Items 12–17 insurance subscriber row of the billed slot    (same)
//   Items 18–23 patient row                                    GET /patients/{id}
//   Items 24–31 claim procedures (+ code catalog description)  claim detail + GET /procedure-codes/{code}
//   Item 33     restorative chart (chart_conditions + history) GET /chart-conditions, /patient-procedures
//   Item 39a    last D4341/D4342 in the patient's history      GET /patient-procedures?procedure_code=
//   Items 48–52 office row (+ billing provider)                GET /offices/{id}, /providers/{id}
//   Items 53–58 treating provider row                          GET /providers/{id}
//   52a / 58    provider ↔ carrier legacy ids                  GET /provider-insurance-ids
//   2, 34a, 35, 38–47, 53a … Claim Fill-Out (patient columns + per-claim local store)
//
// Where the backend has no column for a form item the value is left blank and
// the gap is listed in docs/claims/ada_claim_form_2024_backend_devreport.md.

import { getInsuranceCarrier } from "@/api/generated/endpoints/insurance/insurance";
import { getPatient, listPatientSignatures } from "@/api/generated/endpoints/patients/patients";
import { listInsuranceClaims, listOrthoPlans } from "@/api/generated/endpoints/billing/billing";
import { getOffice, getProvider } from "@/api/generated/endpoints/organization/organization";
import { listChartConditions, listPatientProcedures } from "@/api/generated/endpoints/clinical/clinical";
import { getProcedureCode } from "@/api/generated/endpoints/procedures/procedures";
import { listProviderInsuranceIds } from "@/api/generated/endpoints/staff/staff";
import type {
  ClaimDetailCoverageRead,
  ClaimDetailProcedureRead,
  ClaimDetailResponse,
  ClaimEnclosures,
  InsuranceCarrierRead,
  OfficeRead,
  PatientProcedureRead,
  PatientRead,
  PatientSignatureRead,
  ProcedureCodeRead,
  ProviderRead,
} from "@/api/generated/model";
import type { SlotData } from "@/features/patient-insurance/insuranceModel";
import { procedureCodes as staticProcedureCodes } from "../../../data/procedureCodes";
import { claimCategory, claimOrder, resolveInsuranceSlots, type ClaimOrder } from "../../../components/patient/claimLifecycle";
import { emptyClaimFillOut, loadLocalClaimFillOut, type ClaimFillOutForm } from "../../../components/patient/claimFillOut";
import { deriveToothStatuses } from "@/features/charting/toothStatusBridge";
import { loadChartSettings } from "@/features/restorative/restorativeService";
import { upperTeeth, lowerTeeth } from "@/features/restorative/dentition";
import { providerBareName } from "@/services/providerDirectory";
import { loadOfficeClaimBilling, loadProviderTaxonomy } from "./adaLocalStores";
import { loadClaimSignatures, type ClaimSignature, type ClaimSignatureKey } from "./adaClaimSignatures";
import {
  AREA_IN_NOMENCLATURE_RE,
  PROSTHESIS_CODE_RE,
  SRP_CODES,
  TOOTH_SYSTEM_JP,
  adaAreaOfOralCavity,
  adaDate,
  adaGender,
  adaMoney,
  adaPersonName,
  adaQuantity,
  adaRelationship,
  adaSurface,
  adaToday,
  adaToothNumbers,
  specialtyToTaxonomy,
  type AdaAddressBlock,
  type AdaClaimForm,
  type AdaServiceLine,
} from "./adaClaimFormModel";

export interface AssembleAdaClaimFormArgs {
  detail: ClaimDetailResponse;
  /** Procedures the screen shows (a secondary claim reads the primary's). */
  procedures: ClaimDetailProcedureRead[];
  coverage: ClaimDetailCoverageRead[];
  /** Derived enclosures from GET /insurance-claims/{id}/readiness (may be null). */
  enclosures?: ClaimEnclosures | null;
  /** Fill-out values; defaults to the per-claim local store + patient columns. */
  fill_out?: ClaimFillOutForm | null;
}

/** Where each printed block came from — shown on the pre-flight so staff can fix the source record. */
export interface AdaSourceNotes {
  carrier: InsuranceCarrierRead | null;
  patient: PatientRead | null;
  office: OfficeRead | null;
  treating_provider: ProviderRead | null;
  billing_provider: ProviderRead | null;
  own_slot: SlotData | null;
  other_slot: SlotData | null;
  /** Item 39a came from the procedure history (true) or the fill-out override (false). */
  srp_from_history: boolean;
  /** Most recent active captured patient signature (Item 36 evidence), if any. */
  consent_signature: PatientSignatureRead | null;
  /** Signatures resolved for Items 36 / 37 / 53 (claim rows -> patient latest -> user account). */
  claim_signatures: Record<ClaimSignatureKey, ClaimSignature | null>;
  /** Lookups that failed (name → error message); the form prints blanks for them. */
  lookup_errors: Record<string, string>;
}

export interface AssembledAdaClaimForm {
  form: AdaClaimForm;
  sources: AdaSourceNotes;
  fill_out: ClaimFillOutForm;
}

const s = (v: string | number | null | undefined): string => (v == null ? "" : String(v).trim());

const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

const emptyBlock = (): AdaAddressBlock => ({
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
});

async function safe<T>(label: string, errors: Record<string, string>, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    errors[label] = status ? `HTTP ${status}` : (err as Error)?.message || "request failed";
    return null;
  }
}

/** Address block from a carrier row (Items 3 / 11). */
function carrierBlock(c: InsuranceCarrierRead | null | undefined): AdaAddressBlock & { payer_id: string } {
  return {
    name: s(c?.name),
    address_line1: s(c?.address),
    address_line2: s(c?.address2),
    city: s(c?.city),
    state: s(c?.state),
    zip: s(c?.zip),
    payer_id: s(c?.payer_id),
  };
}

/** Address block from the patient row (Item 20 / fallback for Item 12). */
function patientBlock(p: PatientRead | null, suffix = ""): AdaAddressBlock {
  if (!p) return emptyBlock();
  return {
    name: adaPersonName(p.last_name, p.first_name, p.middle_initial, suffix),
    address_line1: s(p.address_line1),
    address_line2: s(p.address_line2),
    city: s(p.city),
    state: s(p.state),
    zip: s(p.zip),
  };
}

/**
 * The office as the billing entity (Item 48) and the treatment location
 * (Item 56). `corporate_name` is the legal billing name when present; the
 * treatment location is always the office's own street address.
 */
function officeBlock(o: OfficeRead | null, opts: { corporate: boolean }): AdaAddressBlock {
  if (!o) return emptyBlock();
  const src = o.letterhead && !opts.corporate ? o.letterhead : o;
  return {
    name: opts.corporate ? s(o.corporate_name) || s(o.name) : s(src.name) || s(o.name),
    address_line1: s(src.address_line1 ?? o.address_line1),
    address_line2: s(src.address_line2 ?? o.address_line2),
    city: s(src.city ?? o.city),
    state: s(src.state ?? o.state),
    zip: s(src.zip ?? o.zip),
  };
}

/** Pick the slot the claim bills: exact plan match first, then the tier. */
function pickOwnSlot(
  slots: { D: Partial<Record<ClaimOrder, SlotData>>; M: Partial<Record<ClaimOrder, SlotData>> },
  category: "D" | "M",
  order: ClaimOrder,
  ins_plan_id: number | null | undefined,
): SlotData | null {
  const all: SlotData[] = [...Object.values(slots.D), ...Object.values(slots.M)].filter(Boolean) as SlotData[];
  if (ins_plan_id != null) {
    const exact = all.find((sl) => sl.record?.ins_plan_id === ins_plan_id);
    if (exact) return exact;
  }
  return slots[category][order] ?? null;
}

/**
 * The "Other Coverage" plan (Items 4–11): for a primary claim that is the
 * secondary plan, for a secondary claim it is the primary plan (COB rule).
 * Dental takes precedence over medical when both exist; the Medical? box is
 * still marked so the payer knows the medical plan is there.
 */
export function pickOtherSlot(
  slots: { D: Partial<Record<ClaimOrder, SlotData>>; M: Partial<Record<ClaimOrder, SlotData>> },
  own: SlotData | null,
  order: ClaimOrder,
): { slot: SlotData | null; dental: boolean; medical: boolean } {
  const isOwn = (sl: SlotData | undefined) => !!sl && !!own && sl.record?.id === own.record?.id;
  const dentalCandidates: SlotData[] = [];
  const preferred: ClaimOrder[] =
    order === "primary" ? ["secondary", "tertiary", "quaternary"] : ["primary", "secondary", "tertiary", "quaternary"];
  for (const o of preferred) {
    const sl = slots.D[o];
    if (sl?.record && !isOwn(sl)) dentalCandidates.push(sl);
  }
  const medicalCandidates = (["primary", "secondary"] as ClaimOrder[])
    .map((o) => slots.M[o])
    .filter((sl): sl is SlotData => !!sl?.record && !isOwn(sl));
  const slot = dentalCandidates[0] ?? medicalCandidates[0] ?? null;
  return { slot, dental: dentalCandidates.length > 0, medical: medicalCandidates.length > 0 };
}

interface CodeInfo {
  description: string;
  requires_quadrant: boolean;
  requires_tooth: boolean;
}

async function codeInfo(code: string, cache: Map<string, Promise<CodeInfo>>): Promise<CodeInfo> {
  let p = cache.get(code);
  if (!p) {
    p = getProcedureCode(code)
      .then((r: ProcedureCodeRead) => ({
        description: s(r.description),
        requires_quadrant: !!r.requires_quadrant || /quad|arch|mouth/i.test(s(r.tooth_area)),
        requires_tooth: !!r.requires_tooth,
      }))
      .catch(() => {
        const st = staticProcedureCodes.find((c) => c.code === code);
        const mode = st?.anatomyRules?.mode;
        return {
          description: st?.description ?? "",
          requires_quadrant: mode === "QUADRANT" || mode === "ARCH" || mode === "FULL_MOUTH",
          requires_tooth: mode === "TOOTH",
        };
      });
    cache.set(code, p);
  }
  return p;
}

/** Items 24–31 from the claim's procedures. */
async function buildServiceLines(
  procedures: ClaimDetailProcedureRead[],
  opts: { predetermination: boolean; diagnosis_present: boolean; overrides: ClaimFillOutForm["line_overrides"] },
): Promise<AdaServiceLine[]> {
  const cache = new Map<string, Promise<CodeInfo>>();
  const rows = procedures
    .filter((p) => !p.is_void)
    .slice()
    .sort((a, b) => (a.date_of_service || "").localeCompare(b.date_of_service || "") || a.procedure_code.localeCompare(b.procedure_code));
  return Promise.all(
    rows.map(async (p): Promise<AdaServiceLine> => {
      const code = s(p.procedure_code).toUpperCase();
      const info = await codeInfo(code, cache);
      const tooth = adaToothNumbers(p.tooth);
      // Item 25 is conditional: only for quadrant/arch procedures whose
      // nomenclature does not already name the area (rule 25.a / 25.b).
      const area = info.requires_quadrant && !AREA_IN_NOMENCLATURE_RE.test(code) ? adaAreaOfOralCavity(p.quadrant) : "";
      const ov = opts.overrides[p.id];
      const pointer = s(ov?.diagnosis_pointer).toUpperCase().replace(/[^A-D]/g, "");
      return {
        procedure_id: p.id,
        procedure_date: opts.predetermination ? "" : adaDate(p.date_of_service),
        area_of_oral_cavity: area,
        tooth_system: tooth ? TOOTH_SYSTEM_JP : "",
        tooth_numbers: tooth,
        tooth_surface: adaSurface(p.surface),
        procedure_code: code,
        // Per-line pointer from the fill-out grid (ADA-BE-3); when none was
        // chosen and the claim carries ICD codes, the line points at the primary.
        diagnosis_pointer: opts.diagnosis_present ? pointer || "A" : "",
        quantity: adaQuantity(ov?.quantity ?? 1),
        description: info.description || code,
        fee: num(p.fee),
      };
    }),
  );
}

/** Item 33 — permanent teeth charted as absent on the restorative chart. */
async function missingTeeth(patient_id: number, errors: Record<string, string>): Promise<string[]> {
  const [conditions, history] = await Promise.all([
    safe("chart_conditions", errors, () => listChartConditions({ patient_id, size: 200 })),
    safe("patient_procedures", errors, () => listPatientProcedures({ patient_id, size: 200 })),
  ]);
  if (!conditions) return [];
  const settings = loadChartSettings(patient_id);
  const band = new Set([...upperTeeth(settings.dentition), ...lowerTeeth(settings.dentition)]);
  const statuses = deriveToothStatuses({
    conditions: conditions.items ?? [],
    procedures: history?.items ?? [],
    edentulous: settings.edentulous,
    dentitionTeeth: settings.dentition === "permanent-17" ? null : band,
  });
  const out: string[] = [];
  for (let t = 1; t <= 32; t += 1) {
    const st = statuses.get(String(t));
    // Unerupted / not-in-dentition teeth are not "missing" in the ADA sense.
    if (st && !st.present && st.reason && !["unerupted", "not-in-dentition", "impacted"].includes(st.reason)) out.push(String(t));
  }
  return out;
}

/** Item 39a — most recent completed scaling and root planing on the account. */
async function lastSrpDate(patient_id: number, errors: Record<string, string>): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(
    SRP_CODES.map((code) =>
      safe(`srp_${code}`, errors, () =>
        listPatientProcedures({ patient_id, procedure_code: code, is_void: false, size: 50, sort: "date_of_service", order: "desc" }),
      ),
    ),
  );
  let best = "";
  for (const res of results) {
    for (const p of (res?.items ?? []) as PatientProcedureRead[]) {
      const d = s(p.date_of_service).slice(0, 10);
      if (d && d <= today && d > best) best = d;
    }
  }
  return best;
}

/** Items 52a / 58 — the carrier-assigned legacy id for a provider. */
async function additionalProviderId(
  provider_id: string | null | undefined,
  carrier_id: number | null | undefined,
  errors: Record<string, string>,
): Promise<string> {
  if (!provider_id || carrier_id == null) return "";
  const res = await safe(`provider_insurance_ids_${provider_id}`, errors, () =>
    listProviderInsuranceIds({ provider_id, carrier_id, size: 5 }),
  );
  return s(res?.items?.[0]?.ins_id);
}

/** Most frequent provider on the claim's procedures (fallback for treating dentist). */
function dominantProviderId(procedures: ClaimDetailProcedureRead[]): string | null {
  const counts = new Map<string, number>();
  for (const p of procedures) if (p.provider_id) counts.set(p.provider_id, (counts.get(p.provider_id) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of counts) if (n > bestN) [best, bestN] = [id, n];
  return best;
}

export async function assembleAdaClaimForm(args: AssembleAdaClaimFormArgs): Promise<AssembledAdaClaimForm> {
  const { detail, procedures, coverage } = args;
  const claim = detail.claim;
  const errors: Record<string, string> = {};
  const order = claimOrder(claim);
  const category = claimCategory(claim);

  // ---- Lookups (independent; run together) ----------------------------------
  const treating_id = claim.treating_provider_id || dominantProviderId(procedures);
  const [patient, carrier, slotsD, slotsM, treating, missing_teeth_charted, srp_history, consent_signature] = await Promise.all([
    safe("patient", errors, () => getPatient(claim.patient_id)),
    claim.carrier_id != null ? safe("carrier", errors, () => getInsuranceCarrier(claim.carrier_id as number)) : Promise.resolve(null),
    safe("insurance_dental", errors, () => resolveInsuranceSlots(claim.patient_id, "D")),
    safe("insurance_medical", errors, () => resolveInsuranceSlots(claim.patient_id, "M")),
    treating_id ? safe("treating_provider", errors, () => getProvider(treating_id)) : Promise.resolve(null),
    missingTeeth(claim.patient_id, errors),
    lastSrpDate(claim.patient_id, errors),
    fetchConsentSignature(claim.patient_id, errors),
  ]);

  const office_id = claim.office_id ?? patient?.home_office_id ?? null;
  const office = office_id != null ? await safe("office", errors, () => getOffice(office_id)) : null;
  const billing_id = claim.billing_provider_id || office?.billing_provider_id || treating_id;
  const billing =
    billing_id && billing_id === treating_id ? treating : billing_id ? await safe("billing_provider", errors, () => getProvider(billing_id)) : null;
  const [billing_additional_id, treating_additional_id] = await Promise.all([
    additionalProviderId(billing?.id, claim.carrier_id, errors),
    additionalProviderId(treating?.id, claim.carrier_id, errors),
  ]);

  const slots = { D: slotsD ?? {}, M: slotsM ?? {} };
  const own = pickOwnSlot(slots, category, order, claim.ins_plan_id);
  const other = pickOtherSlot(slots, own, order);

  // ---- Fill-out (patient columns + per-claim local store) --------------------
  const stored = loadLocalClaimFillOut(claim.id);
  const fill_out: ClaimFillOutForm = {
    ...emptyClaimFillOut(),
    // Item 36 defaults to a captured consent signature until staff decide otherwise.
    signature_on_file: !!consent_signature,
    first_visit: s(patient?.first_visit).slice(0, 10),
    student_status: s(patient?.student_status) || "No",
    school_name: s(patient?.school_name),
    assign_benefits: !!patient?.assign_benefits,
    ...(stored?.form ?? {}),
    ...(args.fill_out ?? {}),
  };

  // ---- Items 12–17 (subscriber) — fall back to the patient when Self --------
  const sub = own?.subscriber ?? null;
  const rel = adaRelationship(own?.record?.relationship) || (sub?.subscriber_patient_id === claim.patient_id ? "self" : "");
  const subscriber_from_patient = rel === "self" && !s(sub?.sub_last_name) && !s(sub?.sub_first_name);
  const subscriber: AdaClaimForm["subscriber"] = subscriber_from_patient
    ? {
        ...patientBlock(patient, fill_out.patient_name_suffix || fill_out.subscriber_name_suffix),
        dob: adaDate(patient?.dob),
        gender: adaGender(patient?.gender),
        subscriber_id: s(sub?.sub_member_id),
        group_number: s(sub?.group_number) || s(own?.plan?.group_number),
        employer_name: s(own?.employer?.name) || s(own?.plan?.employer_name),
      }
    : {
        name: adaPersonName(sub?.sub_last_name, sub?.sub_first_name, sub?.sub_mi, fill_out.subscriber_name_suffix),
        address_line1: s(sub?.sub_address),
        address_line2: s(sub?.sub_address2),
        city: s(sub?.sub_city),
        state: s(sub?.sub_state),
        zip: s(sub?.sub_zip),
        dob: adaDate(sub?.sub_dob),
        gender: adaGender(sub?.sub_gender),
        subscriber_id: s(sub?.sub_member_id),
        group_number: s(sub?.group_number) || s(own?.plan?.group_number),
        employer_name: s(own?.employer?.name) || s(own?.plan?.employer_name),
      };
  // Self-subscribers: the policyholder *is* the patient, so anything the
  // subscriber row leaves blank (address, DOB, gender) comes from the patient.
  if (rel === "self" && patient) {
    const pb = patientBlock(patient);
    if (!subscriber.address_line1) {
      subscriber.address_line1 = pb.address_line1;
      subscriber.address_line2 = pb.address_line2;
      subscriber.city = subscriber.city || pb.city;
      subscriber.state = subscriber.state || pb.state;
      subscriber.zip = subscriber.zip || pb.zip;
    }
    subscriber.dob = subscriber.dob || adaDate(patient.dob);
    subscriber.gender = subscriber.gender || adaGender(patient.gender);
  }

  // ---- Items 4–11 (other coverage) ------------------------------------------
  const osub = other.slot?.subscriber ?? null;
  const other_coverage: AdaClaimForm["other_coverage"] = {
    dental: other.dental || (fill_out.has_other_coverage && !other.medical),
    medical: other.medical,
    subscriber_name: adaPersonName(osub?.sub_last_name, osub?.sub_first_name, osub?.sub_mi),
    dob: adaDate(osub?.sub_dob),
    gender: adaGender(osub?.sub_gender),
    subscriber_id: s(osub?.sub_member_id),
    group_number: s(osub?.group_number) || s(other.slot?.plan?.group_number),
    patient_relationship: adaRelationship(other.slot?.record?.relationship),
    payer: carrierBlock(other.slot?.carrier),
  };
  if (other.slot && other_coverage.patient_relationship === "self" && !other_coverage.subscriber_name && patient) {
    other_coverage.subscriber_name = patientBlock(patient).name;
    other_coverage.dob = other_coverage.dob || adaDate(patient.dob);
    other_coverage.gender = other_coverage.gender || adaGender(patient.gender);
  }

  // ---- Items 24–35 -------------------------------------------------------------
  const predetermination = !!claim.is_preauth;
  const diagnosis_codes: [string, string, string, string] = [
    s(fill_out.icd_1),
    s(fill_out.icd_2),
    s(fill_out.icd_3),
    s(fill_out.icd_4),
  ];
  const diagnosis_present = diagnosis_codes.some(Boolean);
  const service_lines = await buildServiceLines(procedures, { predetermination, diagnosis_present, overrides: fill_out.line_overrides ?? {} });
  const other_fees_n = parseFloat(s(fill_out.other_fees));
  const other_fees = Number.isFinite(other_fees_n) && other_fees_n > 0 ? other_fees_n : null;
  const missing_teeth = fill_out.missing_teeth_override ?? missing_teeth_charted;

  // COB: when this is not the primary claim, note what the primary paid (rule 35 / COB).
  let remarks = s(fill_out.remarks);
  if (order !== "primary") {
    const prim_paid = coverage.reduce((sum, c) => sum + num(c.prim_ins_paid), 0);
    const cob = `Primary carrier paid $${prim_paid.toFixed(2)} — EOB attached.`;
    if (!remarks.includes("Primary carrier paid")) remarks = [remarks, cob].filter(Boolean).join(" ");
  }

  // ---- Items 38–47 -------------------------------------------------------------
  const enc = args.enclosures ?? null;
  const enclosure_count =
    num(fill_out.enclosures_radiographs) +
    num(fill_out.enclosures_oral_images) +
    num(fill_out.enclosures_models) +
    num(enc?.radiographs) +
    num(enc?.oral_images) +
    num(enc?.models) +
    num(enc?.narratives) +
    num(enc?.perio_charts) +
    num(enc?.other);
  const enclosures: "Y" | "N" = enclosure_count > 0 || enc?.attachments_enclosed ? "Y" : "N";
  const srp_override = s(fill_out.date_last_srp);

  // Items 41/42 — fall back to the ortho payment plan when the fill-out is blank (UI-19).
  let ortho_date = fill_out.ortho_appliance_placed_date;
  let ortho_months = fill_out.ortho_months_remaining;
  if (fill_out.is_orthodontic_treatment && (!ortho_date || !ortho_months || ortho_months === "0")) {
    const od = await fetchOrthoDefaults(claim.patient_id, errors);
    ortho_date = ortho_date || od.appliance_placed_date;
    ortho_months = ortho_months && ortho_months !== "0" ? ortho_months : od.months_of_treatment;
  }

  const office_billing = loadOfficeClaimBilling(office?.id);
  const treating_taxonomy = loadProviderTaxonomy(treating?.id);
  const claim_signatures = await loadClaimSignatures({
    patient_id: claim.patient_id,
    ids: fill_out.signature_ids,
    treating_provider: treating,
    errors,
  });
  const sig_img = (k: ClaimSignatureKey) => claim_signatures[k]?.image ?? "";
  const today = adaToday();
  const treating_name = treating ? providerBareName(treating) : "";
  const treating_phone = s(treating?.phone) || s(office?.phone);

  const form: AdaClaimForm = {
    transaction: {
      actual_services: !predetermination,
      predetermination,
      epsdt: !!fill_out.is_epsdt,
    },
    predetermination_number: s(fill_out.prior_authorization_number),
    payer: carrierBlock(carrier ?? own?.carrier),
    other_coverage,
    subscriber,
    patient: {
      ...patientBlock(patient, fill_out.patient_name_suffix),
      relationship: rel,
      dob: adaDate(patient?.dob),
      gender: adaGender(patient?.gender),
      patient_id: s(patient?.chart_no) || String(claim.patient_id),
    },
    service_lines,
    other_fees,
    missing_teeth,
    diagnosis_code_list_qualifier: diagnosis_present ? "AB" : "",
    diagnosis_codes,
    remarks,
    authorizations: {
      patient_signature_on_file: !!fill_out.signature_on_file || !!sig_img("patient_consent"),
      patient_signature_date: fill_out.signature_on_file || sig_img("patient_consent") ? adaDate(claim_signatures.patient_consent?.signed_at) || today : "",
      subscriber_signature_on_file: !!fill_out.assign_benefits || !!sig_img("assign_benefits"),
      subscriber_signature_date: fill_out.assign_benefits || sig_img("assign_benefits") ? adaDate(claim_signatures.assign_benefits?.signed_at) || today : "",
      patient_signature_image: sig_img("patient_consent"),
      subscriber_signature_image: sig_img("assign_benefits"),
    },
    ancillary: {
      place_of_treatment: s(fill_out.place_of_treatment) || "11",
      enclosures,
      date_last_srp: adaDate(srp_override || srp_history),
      is_orthodontics: fill_out.is_orthodontic_treatment ? true : false,
      appliance_placed_date: fill_out.is_orthodontic_treatment ? adaDate(ortho_date) : "",
      months_of_treatment: fill_out.is_orthodontic_treatment ? s(ortho_months) : "",
      // Rule 43: no prosthetic restoration on the claim → "NO"; prosthesis
      // codes present but the fill-out never answered → neither box (flagged).
      replacement_of_prosthesis: fill_out.is_prosthesis_treatment
        ? !!fill_out.is_replacement_of_prosthesis
        : service_lines.some((l) => PROSTHESIS_CODE_RE.test(l.procedure_code))
          ? null
          : false,
      prior_placement_date:
        fill_out.is_prosthesis_treatment && fill_out.is_replacement_of_prosthesis ? adaDate(fill_out.prosthesis_prior_placement_date) : "",
      treatment_resulting_from: {
        occupational_illness: !!fill_out.is_occupational_illness,
        auto_accident: !!fill_out.is_auto_accident,
        other_accident: !!fill_out.is_other_accident,
      },
      accident_date: adaDate(fill_out.accident_date),
      auto_accident_state: s(fill_out.accident_state).toUpperCase().slice(0, 2),
    },
    billing: {
      ...officeBlock(office, { corporate: true }),
      // Type 2 (entity) NPI from Office Setup -> Insurance claim billing (ADA-BE-8), else the billing provider's Type 1.
      npi: office_billing.npi || s(billing?.npi),
      // Rule 50: a corporation leaves the license blank; an individual billing
      // dentist reports it. `use_billing_license` is the office's own switch.
      license_number: office?.use_billing_license === false && s(office?.corporate_name) ? "" : s(billing?.license),
      ssn_or_tin: s(office?.tax_id) || s(billing?.tax_id),
      phone: s(office?.phone) || s(billing?.phone),
      additional_provider_id: billing_additional_id,
    },
    treating: {
      name: treating_name,
      signature_date: predetermination ? "" : today,
      is_locum_tenens: !!fill_out.is_locum_tenens,
      npi: s(treating?.npi),
      license_number: s(treating?.license),
      location: officeBlock(office, { corporate: false }),
      specialty_code: treating_taxonomy || (treating ? specialtyToTaxonomy(treating.specialty) : ""),
      phone: treating_phone,
      additional_provider_id: treating_additional_id,
      signature_image: sig_img("treating_dentist"),
    },
    meta: {
      claim_id: claim.id,
      claim_number: s(claim.claim_number),
      billing_order: order,
      patient_id: claim.patient_id,
      generated_at: new Date().toISOString(),
    },
  };

  return {
    form,
    fill_out,
    sources: {
      carrier: carrier ?? own?.carrier ?? null,
      patient,
      office,
      treating_provider: treating,
      billing_provider: billing,
      own_slot: own,
      other_slot: other.slot,
      srp_from_history: !srp_override && !!srp_history,
      consent_signature,
      claim_signatures,
      lookup_errors: errors,
    },
  };
}

// ---------------------------------------------------------------------------
// Lookups shared with the Claim Fill-Out window
// ---------------------------------------------------------------------------

/** Most recent active, non-user (patient/guardian) captured signature — Item 36 evidence (UI-8). */
export async function fetchConsentSignature(
  patient_id: number,
  errors: Record<string, string> = {},
): Promise<PatientSignatureRead | null> {
  const res = await safe("patient_signatures", errors, () =>
    listPatientSignatures({ patient_id, is_active: true, is_user_sig: false, include_image: false, size: 20, sort: "signed_at", order: "desc" }),
  );
  const rows = (res?.items ?? []).filter((r) => !r.voided_at);
  rows.sort((a, b) => s(b.signed_at || b.created_at).localeCompare(s(a.signed_at || a.created_at)));
  return rows[0] ?? null;
}

export interface OrthoDefaults {
  /** YYYY-MM-DD banding date of the active ortho plan. */
  appliance_placed_date: string;
  /** Whole months between treatment start and end (or the plan's months remaining). */
  months_of_treatment: string;
}

/** Items 41/42 from the patient's active ortho payment plan (UI-19). */
export async function fetchOrthoDefaults(patient_id: number, errors: Record<string, string> = {}): Promise<OrthoDefaults> {
  const res = await safe("ortho_plans", errors, () => listOrthoPlans({ patient_id, is_active: true, size: 5 }));
  const plan = (res?.items ?? [])[0];
  if (!plan) return { appliance_placed_date: "", months_of_treatment: "" };
  const start = s(plan.treat_start_date || plan.banding_date).slice(0, 10);
  const end = s(plan.treat_end_date).slice(0, 10);
  let months = "";
  if (start && end) {
    const a = new Date(`${start}T00:00:00`);
    const b = new Date(`${end}T00:00:00`);
    const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (m > 0) months = String(m);
  }
  if (!months && plan.ins_months_remaining != null && plan.ins_months_remaining > 0) months = String(plan.ins_months_remaining);
  return { appliance_placed_date: s(plan.banding_date || plan.treat_start_date).slice(0, 10), months_of_treatment: months };
}

export interface PredeterminationRef {
  claim_id: string;
  claim_number: string;
  prior_authorization_number: string;
  created_at: string;
}

/**
 * Item 2 — predetermination numbers entered on this patient's preauthorization
 * claims (their fill-out records), so an actual-services claim can reuse one
 * instead of re-typing it (UI-18).
 */
export async function fetchPredeterminationNumbers(
  patient_id: number,
  exclude_claim_id: string,
  errors: Record<string, string> = {},
): Promise<PredeterminationRef[]> {
  const res = await safe("preauth_claims", errors, () => listInsuranceClaims({ patient_id, is_active: true, size: 200 }));
  const out: PredeterminationRef[] = [];
  for (const c of res?.items ?? []) {
    if (c.id === exclude_claim_id || !c.is_preauth) continue;
    const stored = loadLocalClaimFillOut(c.id);
    const n = s(stored?.form.prior_authorization_number);
    if (n) out.push({ claim_id: c.id, claim_number: s(c.claim_number), prior_authorization_number: n, created_at: c.created_at });
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Label for the pre-flight / fill-out: "$12.34" or "". */
export const otherFeesLabel = (v: string | null | undefined): string => {
  const n = parseFloat(s(v));
  return Number.isFinite(n) && n > 0 ? `$${adaMoney(n)}` : "";
};
