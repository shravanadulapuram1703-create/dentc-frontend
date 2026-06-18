// Prescriptions Setup — form model + mappers. snake_case throughout, bound
// directly to the generated client types.

import type {
  PrescriptionLibraryRead,
  PrescriptionLibraryCreate,
  PrescriptionLibraryUpdate,
} from "@/api/generated/model";

// Legacy Sig field cap.
export const SIG_MAX = 240;

export interface PrescriptionForm {
  drug_name: string;
  dispense: string;
  sig: string;
  refills: string; // kept as string for the numeric input; coerced on save
  is_as_written: boolean;
  is_active: boolean;
}

export function emptyPrescriptionForm(): PrescriptionForm {
  return { drug_name: "", dispense: "", sig: "", refills: "0", is_as_written: false, is_active: true };
}

export function prescriptionToForm(p: PrescriptionLibraryRead): PrescriptionForm {
  return {
    drug_name: p.drug_name ?? "",
    dispense: p.dispense ?? "",
    sig: p.sig ?? "",
    refills: String(p.refills ?? 0),
    is_as_written: !!p.is_as_written,
    is_active: !!p.is_active,
  };
}

function parseRefills(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function buildPrescriptionCreate(form: PrescriptionForm): PrescriptionLibraryCreate {
  return {
    drug_name: form.drug_name.trim(),
    dispense: form.dispense.trim() || null,
    sig: form.sig.trim() || null,
    refills: parseRefills(form.refills),
    is_as_written: form.is_as_written,
    is_active: form.is_active,
  };
}

export function buildPrescriptionUpdate(form: PrescriptionForm): PrescriptionLibraryUpdate {
  return {
    drug_name: form.drug_name.trim(),
    dispense: form.dispense.trim() || null,
    sig: form.sig.trim() || null,
    refills: parseRefills(form.refills),
    is_as_written: form.is_as_written,
    is_active: form.is_active,
  };
}

export function yesNo(v: boolean | null | undefined): string {
  return v ? "Yes" : "No";
}

/** Format an ISO timestamp like the legacy "Modified On" badge (best-effort, local). */
export function formatModified(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
