// Patient Prescriptions — non-hook concerns.
//
// CRUD uses the generated React Query hooks directly in the page (idiomatic).
// This module only bridges the shared Rx library cache: the Drug Name dropdown
// can ONLY pick predefined library drugs (legacy rule, M11 Step 5), so we reuse
// the Prescriptions Setup loader rather than re-fetching.

import { listAllPrescriptions } from '@/components/setup/prescriptions/prescriptionService';
import type { PrescriptionLibraryRead } from '@/api/generated/model';

let cache: Promise<PrescriptionLibraryRead[]> | null = null;

const norm = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Everything a prescriber sees/gets from a library row — two rows with the same key are the same drug. */
const configKey = (d: PrescriptionLibraryRead) =>
  [norm(d.drug_name), norm(d.dispense), norm(d.sig), d.refills ?? 0, d.is_as_written ? 1 : 0].join('|');

/**
 * Collapse library rows that are identical in every prescriber-visible field
 * (name / dispense / sig / refills / as-written), keeping the lowest id.
 *
 * The seed importer was re-run several times without a unique key on
 * `prescription_library`, so every legacy drug exists 5x (RX-4). The backend
 * dedupe migration keeps the lowest id per (tenant_id, legacy_id) — the same
 * survivor chosen here, so `library_rx_id` stays stable across the cleanup.
 * Rows that share a name but differ in dispense/sig are NOT merged: they are
 * distinct configurations and get a disambiguated label (see rxDrugOptionLabels).
 */
export function dedupeRxLibrary(all: PrescriptionLibraryRead[]): PrescriptionLibraryRead[] {
  const keep = new Map<string, PrescriptionLibraryRead>();
  for (const d of all) {
    const k = configKey(d);
    const cur = keep.get(k);
    if (!cur || d.id < cur.id) keep.set(k, d);
  }
  return [...keep.values()].sort(
    (a, b) => a.drug_name.localeCompare(b.drug_name) || a.id - b.id,
  );
}

/**
 * Option label per library id. A drug name that is unique in the list is shown
 * bare; a name shared by several distinct configurations is suffixed with the
 * dispense / sig that tell them apart, so the picker never shows two identical
 * lines.
 */
export function rxDrugOptionLabels(library: PrescriptionLibraryRead[]): Map<number, string> {
  const nameCount = new Map<string, number>();
  for (const d of library) {
    const k = norm(d.drug_name);
    nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
  }
  const labels = new Map<number, string>();
  for (const d of library) {
    const shared = (nameCount.get(norm(d.drug_name)) ?? 0) > 1;
    const detail = [d.dispense, d.sig].map((s) => (s ?? '').trim()).filter(Boolean).join(' · ');
    labels.set(d.id, shared && detail ? `${d.drug_name} — ${detail}` : d.drug_name);
  }
  return labels;
}

/** Active, de-duplicated library drugs, drug-name sorted. Cached for the session. */
export async function loadRxLibrary(): Promise<PrescriptionLibraryRead[]> {
  if (!cache) {
    cache = listAllPrescriptions().then((all) =>
      dedupeRxLibrary(all.filter((d) => d.is_active !== false)),
    );
  }
  return cache;
}
