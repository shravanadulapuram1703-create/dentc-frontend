// Prescriptions Setup — thin service over the generated Orval client.
//
// Wraps /api/v1/prescription-library (tag: Procedures) — the reusable Rx catalog
// behind the legacy "Prescriptions Setup" screen. Snake_case bodies pass through
// unchanged. `size` maxes at 200, so listAllPrescriptions pages the full set for
// the always-loaded search rail.

import {
  listPrescriptionLibrary,
  getPrescriptionLibraryItem,
  createPrescriptionLibraryItem,
  updatePrescriptionLibraryItem,
  deletePrescriptionLibraryItem,
} from "@/api/generated/endpoints/procedures/procedures";
import type {
  PrescriptionLibraryRead,
  PrescriptionLibraryCreate,
  PrescriptionLibraryUpdate,
} from "@/api/generated/model";

const PAGE_SIZE = 200;

/** Fetch every library prescription, paging past the 200/row server cap. */
export async function listAllPrescriptions(): Promise<PrescriptionLibraryRead[]> {
  const first = await listPrescriptionLibrary({ page: 1, size: PAGE_SIZE, sort: "drug_name", order: "asc" });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listPrescriptionLibrary({ page: i + 2, size: PAGE_SIZE, sort: "drug_name", order: "asc" }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items;
}

export function getPrescriptionById(id: number): Promise<PrescriptionLibraryRead> {
  return getPrescriptionLibraryItem(id);
}

export function createPrescription(body: PrescriptionLibraryCreate): Promise<PrescriptionLibraryRead> {
  return createPrescriptionLibraryItem(body);
}

export function updatePrescription(id: number, body: PrescriptionLibraryUpdate): Promise<PrescriptionLibraryRead> {
  return updatePrescriptionLibraryItem(id, body);
}

export function deletePrescription(id: number): Promise<void> {
  return deletePrescriptionLibraryItem(id);
}
