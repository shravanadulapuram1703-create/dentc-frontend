// Signatures for the ADA Dental Claim Form (2024) — Items 36, 37 and 53.
//
// Uses the same capture path as Progress Notes / Medical History / Consents:
// the shared <SignatureCapture/> (Topaz pad, on-screen fallback) produces a
// `SignatureResult`, which is stored with `POST /patient-signatures` and
// printed as an image on the form's signature line.
//
//   Item 36  patient / guardian consent          signature_type = "claim_patient_consent"   is_user_sig = false
//   Item 37  subscriber assignment of benefits   signature_type = "claim_assign_benefits"   is_user_sig = false
//   Item 53  treating dentist certification      signature_type = "claim_treating_dentist"  is_user_sig = true
//
// `patient_signatures` has no claim binding (SIG-11), so the ids of the rows
// captured for a claim are kept on the claim's fill-out record; when none is
// recorded, the latest active row of the same type on the patient is used
// ("Signature on File"). The treating dentist can also print the signature the
// provider's user account holds (GET /users/{user_id}/signature).

import {
  createPatientSignature,
  getPatientSignature,
  listPatientSignatures,
} from "@/api/generated/endpoints/patients/patients";
import { getUserSignature } from "@/api/generated/endpoints/users/users";
import type { PatientSignatureRead, ProviderRead } from "@/api/generated/model";
import { signatureBodyFields, type SignatureResult } from "@/features/signature/signatureModel";

export type ClaimSignatureKey = "patient_consent" | "assign_benefits" | "treating_dentist";

export const CLAIM_SIGNATURE_TYPE: Record<ClaimSignatureKey, string> = {
  patient_consent: "claim_patient_consent",
  assign_benefits: "claim_assign_benefits",
  treating_dentist: "claim_treating_dentist",
};

export const CLAIM_SIGNATURE_LABEL: Record<ClaimSignatureKey, { item: string; title: string; who: string }> = {
  patient_consent: { item: "36", title: "Patient / Guardian signature", who: "Patient or guardian signs the consent statement." },
  assign_benefits: { item: "37", title: "Subscriber signature", who: "Policyholder authorises direct payment to the dentist." },
  treating_dentist: { item: "53", title: "Treating dentist signature", who: "Treating dentist certifies the procedures." },
};

export interface ClaimSignature {
  key: ClaimSignatureKey;
  /** patient_signatures.id, or null for a provider's user-account signature. */
  signature_id: number | null;
  /** Image data URL (PNG / JPEG) — empty when the row holds a legacy SigString only. */
  image: string;
  signed_at: string;
  device_source: string;
  /** Where it came from: captured for this claim, the patient's latest of this type, or the user account. */
  source: "claim" | "patient_latest" | "user_account";
}

export type ClaimSignatureIds = Record<ClaimSignatureKey, number | null>;

export const emptyClaimSignatureIds = (): ClaimSignatureIds => ({
  patient_consent: null,
  assign_benefits: null,
  treating_dentist: null,
});

const isImage = (v: string | null | undefined): v is string => !!v && /^data:image\//i.test(v);

function fromRow(key: ClaimSignatureKey, row: PatientSignatureRead, source: ClaimSignature["source"]): ClaimSignature {
  return {
    key,
    signature_id: row.id,
    image: isImage(row.signature_data) ? row.signature_data : "",
    signed_at: row.signed_at || row.created_at || "",
    device_source: row.device_source || "",
    source,
  };
}

/**
 * Resolve the three signatures for a claim: rows recorded on the claim first,
 * then the patient's latest active row per type, then (Item 53 only) the
 * treating provider's user-account signature.
 */
export async function loadClaimSignatures(args: {
  patient_id: number;
  ids: ClaimSignatureIds;
  treating_provider: ProviderRead | null;
  errors?: Record<string, string>;
}): Promise<Record<ClaimSignatureKey, ClaimSignature | null>> {
  const { patient_id, ids, treating_provider } = args;
  const errors = args.errors ?? {};
  const out: Record<ClaimSignatureKey, ClaimSignature | null> = {
    patient_consent: null,
    assign_benefits: null,
    treating_dentist: null,
  };
  const keys = Object.keys(CLAIM_SIGNATURE_TYPE) as ClaimSignatureKey[];

  // 1. Rows pinned to this claim.
  await Promise.all(
    keys.map(async (key) => {
      const id = ids[key];
      if (id == null) return;
      try {
        const row = await getPatientSignature(id);
        if (row.is_active && !row.voided_at) out[key] = fromRow(key, row, "claim");
      } catch (err) {
        errors[`claim_signature_${key}`] = (err as { response?: { status?: number } })?.response?.status
          ? `HTTP ${(err as { response: { status: number } }).response.status}`
          : "request failed";
      }
    }),
  );

  // 2. Latest active of each type on the patient.
  if (keys.some((k) => !out[k])) {
    try {
      const res = await listPatientSignatures({ patient_id, is_active: true, include_image: true, size: 100, sort: "signed_at", order: "desc" });
      const rows = (res.items ?? []).filter((r) => !r.voided_at);
      for (const key of keys) {
        if (out[key]) continue;
        const type = CLAIM_SIGNATURE_TYPE[key];
        const match = rows
          .filter((r) => (r.signature_type || "") === type)
          .sort((a, b) => (b.signed_at || b.created_at || "").localeCompare(a.signed_at || a.created_at || ""))[0];
        if (match) out[key] = fromRow(key, match, "patient_latest");
      }
    } catch (err) {
      errors.patient_signatures_list = (err as Error)?.message || "request failed";
    }
  }

  // 3. Treating dentist — the provider's user-account signature.
  if (!out.treating_dentist && treating_provider?.user_id != null) {
    try {
      const sig = await getUserSignature(treating_provider.user_id);
      if (isImage(sig.signature_data)) {
        out.treating_dentist = {
          key: "treating_dentist",
          signature_id: null,
          image: sig.signature_data,
          signed_at: sig.signed_at || sig.updated_at || "",
          device_source: sig.device_source || "",
          source: "user_account",
        };
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      // 404 = no signature on the user account; anything else is worth surfacing.
      if (status !== 404) errors.user_signature = status ? `HTTP ${status}` : "request failed";
    }
  }
  return out;
}

/** Store a freshly captured signature for one form item and return the row. */
export async function saveClaimSignature(args: {
  patient_id: number;
  key: ClaimSignatureKey;
  result: SignatureResult;
  /** The signed-in user id (for the treating dentist / over-the-shoulder attribution). */
  signed_by_user_id?: number | null;
}): Promise<ClaimSignature> {
  const { patient_id, key, result } = args;
  const row = await createPatientSignature({
    patient_id,
    ...signatureBodyFields(result),
    signed_at: result.captured_at,
    is_user_sig: key === "treating_dentist",
    signature_type: CLAIM_SIGNATURE_TYPE[key],
    signed_by_user_id: args.signed_by_user_id ?? null,
    // Sent for the day the backend grows the columns (SIG-1..3); ignored today.
    sig_string: result.sig_string,
    point_count: result.point_count,
    stroke_count: result.stroke_count,
    device_model: result.device_model,
    device_serial: result.device_serial,
    device_vendor: result.device_source === "topaz" ? "topaz" : null,
  });
  return fromRow(key, row, "claim");
}
