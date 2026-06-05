/**
 * Patient Service
 *
 * Centralized, backend-driven patient helpers that wrap the generated Orval
 * client (no raw axios).
 *
 * Duplicate detection
 * -------------------
 * The backend exposes **no** dedicated `/patients/check-duplicate` endpoint
 * (POST returns 405; the path is swallowed by `/patients/{item_id}`). See
 * docs/patients/patients_backend_devreport.md. We therefore detect likely
 * duplicates client-side by searching the canonical list endpoint
 * (`listPatients`) and matching on last/first name + date of birth.
 */

import { listPatients } from '@/api/generated/endpoints/patients/patients';
import type { PatientRead } from '@/api/generated/model';
import { DuplicatePatient, CheckDuplicatePayload } from '../types/patient';

const norm = (value?: string | null): string => (value ?? '').trim().toLowerCase();

/**
 * Find likely-duplicate patients for the identity being registered.
 *
 * Strategy: free-text search by the most selective name token, then narrow
 * client-side by exact last/first name and (when provided) date of birth.
 * Cross-office by design — duplicates should surface regardless of home office.
 *
 * @returns matching patients (empty array if none)
 * @throws Error if the search request fails
 */
export async function checkDuplicatePatient(
  payload: CheckDuplicatePayload,
): Promise<DuplicatePatient[]> {
  const { firstName, lastName, birthdate } = payload;

  const searchTerm = (lastName || firstName || '').trim();
  if (!searchTerm) return [];

  try {
    const res = await listPatients({ search: searchTerm, size: 50 });

    const matches = res.items.filter((p: PatientRead) => {
      const lastOk = lastName ? norm(p.last_name) === norm(lastName) : true;
      const firstOk = firstName ? norm(p.first_name) === norm(firstName) : true;
      const dobOk = birthdate ? p.dob === birthdate : true;
      return lastOk && firstOk && dobOk;
    });

    return matches.map((p: PatientRead) => ({
      birthdate: p.dob ?? '',
      name: [p.last_name, p.first_name].filter(Boolean).join(', '),
      officeShortId: p.home_office_id != null ? String(p.home_office_id) : '',
      patientId: p.chart_no || String(p.id),
      email: p.email ?? '',
      provider: p.preferred_provider_id ?? '',
      status: p.is_active ? 'Active' : 'Inactive',
      source: birthdate && p.dob === birthdate ? 'Name + DOB match' : 'Name match',
    }));
  } catch (error) {
    console.error('Duplicate patient check failed:', error);
    throw new Error('Unable to check for duplicate patients. Please try again.');
  }
}
