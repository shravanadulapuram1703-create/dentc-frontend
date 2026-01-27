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
 * Check Duplicate Patient API Response Structure (from backend)
 */
interface CheckDuplicateApiResponse {
  has_duplicates: boolean;
  duplicates: Array<{
    id: number;
    chart_no: string;
    name: string;
    dob: string;
    phone: string | null;
    match_score: number;
    match_reasons: string[];
  }>;
}

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
    const response = await api.post<CheckDuplicateApiResponse>(
      '/api/v1/patients/check-duplicate',
      payload
    );

    // Handle new response structure with has_duplicates and duplicates array
    if (response.data.has_duplicates && response.data.duplicates && response.data.duplicates.length > 0) {
      // Map API response to DuplicatePatient interface
      return response.data.duplicates.map(dup => ({
        birthdate: dup.dob,
        name: dup.name,
        officeShortId: '', // Not in API response, will be empty
        patientId: dup.id || dup.chart_no,
        email: '', // Not in API response, will be empty
        provider: '', // Not in API response, will be empty
        status: 'Active', // Default, not in API response
        source: dup.match_reasons.join(', '), // Use match reasons as source
      }));
    }
    
    return [];
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