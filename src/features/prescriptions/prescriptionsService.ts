// Patient Prescriptions — non-hook concerns.
//
// CRUD uses the generated React Query hooks directly in the page (idiomatic).
// This module only bridges the shared Rx library cache: the Drug Name dropdown
// can ONLY pick predefined library drugs (legacy rule, M11 Step 5), so we reuse
// the Prescriptions Setup loader rather than re-fetching.

import { listAllPrescriptions } from '@/components/setup/prescriptions/prescriptionService';
import type { PrescriptionLibraryRead } from '@/api/generated/model';

let cache: Promise<PrescriptionLibraryRead[]> | null = null;

/** Active library drugs, drug-name sorted. Cached for the session. */
export async function loadRxLibrary(): Promise<PrescriptionLibraryRead[]> {
  if (!cache) {
    cache = listAllPrescriptions().then((all) =>
      all
        .filter((d) => d.is_active !== false)
        .sort((a, b) => a.drug_name.localeCompare(b.drug_name)),
    );
  }
  return cache;
}
