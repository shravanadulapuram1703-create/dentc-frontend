/**
 * Patient Service
 * 
 * Centralized API logic for patient-related operations.
 * This separates backend API calls from UI components for cleaner architecture.
 * 
 * API Contract Documentation:
 * ===========================
 * 
 * 1. Check Duplicate Patient
 * ---------------------------
 * Endpoint: POST /api/v1/patients/check-duplicate
 * 
 * Request Body:
 * {
 *   "birthdate": "2016-03-02",      // Format: YYYY-MM-DD
 *   "firstName": "Dinesh",
 *   "lastName": "Gupta",
 *   "office": "OFF-001"             // Office Short ID
 * }
 * 
 * Success Response (200 OK):
 * - If duplicates found:
 *   [
 *     {
 *       "birthdate": "2016-03-02",
 *       "name": "Gupta, Dinesh",
 *       "officeShortId": "OFF-001",
 *       "patientId": "P-12345",
 *       "email": "existing@email.com",
 *       "provider": "Dr. Jinna",
 *       "status": "Active",
 *       "source": "Direct"
 *     }
 *   ]
 * 
 * - If no duplicates:
 *   []
 * 
 * Error Response (4xx/5xx):
 * {
 *   "error": "Error message",
 *   "detail": "Detailed error information"
 * }
 */

import api from './api';
import { DuplicatePatient, CheckDuplicatePayload } from '../types/patient';

/**
 * Check for duplicate patients based on identity information
 * 
 * @param payload - Patient identity information (birthdate, firstName, lastName, office)
 * @returns Promise<DuplicatePatient[]> - Array of matching patients (empty if no duplicates)
 * @throws Error if API request fails
 */
export async function checkDuplicatePatient(
  payload: CheckDuplicatePayload
): Promise<DuplicatePatient[]> {
  try {
    const response = await api.post<DuplicatePatient[]>(
      '/api/v1/patients/check-duplicate',
      payload
    );

    return response.data;
  } catch (error: any) {
    // Log error for debugging
    console.error('Duplicate patient check failed:', error);

    // Re-throw with user-friendly message
    throw new Error(
      error.response?.data?.error || 
      'Unable to check for duplicate patients. Please try again.'
    );
  }
}

/**
 * Additional patient service functions can be added here:
 * 
 * - createPatient(data: PatientFormData): Promise<Patient>
 * - updatePatient(id: string, data: Partial<PatientFormData>): Promise<Patient>
 * - getPatient(id: string): Promise<Patient>
 * - searchPatients(query: string): Promise<Patient[]>
 * etc.
 */
