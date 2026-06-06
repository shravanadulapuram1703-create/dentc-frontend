/**
 * Patient Service
 *
 * Centralized, backend-driven patient helpers that wrap the generated Orval
 * client (no raw axios).
 *
 * Duplicate detection uses the backend's `POST /patients/check-duplicate`
 * (`checkPatientDuplicate`), which returns scored candidate matches.
 */

import { checkPatientDuplicate } from '@/api/generated/endpoints/patients/patients';
import type { DuplicateCandidate } from '@/api/generated/model';
import { DuplicatePatient, CheckDuplicatePayload } from '../types/patient';

/**
 * Find likely-duplicate patients for the identity being registered.
 *
 * @returns matching patients ordered by the backend's match score (empty if none)
 * @throws Error if the request fails
 */
export async function checkDuplicatePatient(
  payload: CheckDuplicatePayload,
): Promise<DuplicatePatient[]> {
  const { firstName, lastName, birthdate } = payload;

  try {
    const res = await checkPatientDuplicate({
      first_name: firstName || null,
      last_name: lastName || null,
      dob: birthdate || null,
    });

    return res.candidates.map((c: DuplicateCandidate) => ({
      birthdate: c.dob ?? '',
      name: [c.last_name, c.first_name].filter(Boolean).join(', '),
      officeShortId: '',
      patientId: c.chart_no || String(c.id),
      email: '',
      provider: '',
      status: c.is_active ? 'Active' : 'Inactive',
      source: `Match ${c.match_score}%`,
    }));
  } catch (error) {
    console.error('Duplicate patient check failed:', error);
    throw new Error('Unable to check for duplicate patients. Please try again.');
  }
}
