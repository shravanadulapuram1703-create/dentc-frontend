/**
 * Fee Schedule API Service
 * 
 * Handles all fee schedule related API calls and data management.
 * Backend-ready with proper error handling for desktop (.exe) packaging.
 */

// Environment configuration for API endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FeeSchedule {
  feeScheduleId: string;
  feeScheduleName: string;
  description?: string;
  isActive: boolean;
  effectiveDate?: string;
  officeId?: string;
}

export interface ProcedureCode {
  procedureCode: string;
  description: string;
  fee: number;
  coverageType?: string;
  category?: string;
}

export interface FeeScheduleResponse {
  feeSchedules: FeeSchedule[];
  total: number;
}

export interface ProcedureCodesResponse {
  procedures: ProcedureCode[];
  feeScheduleId: string;
  feeScheduleName: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// In-Memory Cache (Session-based)
// ============================================================================

class FeeScheduleCache {
  private cache: Map<string, ProcedureCodesResponse> = new Map();
  private feeScheduleListCache: FeeScheduleResponse | null = null;
  private cacheTimestamp: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: ProcedureCodesResponse): void {
    this.cache.set(key, data);
    this.cacheTimestamp.set(key, Date.now());
  }

  get(key: string): ProcedureCodesResponse | null {
    const timestamp = this.cacheTimestamp.get(key);
    if (!timestamp || Date.now() - timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.cacheTimestamp.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  setFeeScheduleList(data: FeeScheduleResponse): void {
    this.feeScheduleListCache = data;
  }

  getFeeScheduleList(): FeeScheduleResponse | null {
    return this.feeScheduleListCache;
  }

  clear(): void {
    this.cache.clear();
    this.cacheTimestamp.clear();
    this.feeScheduleListCache = null;
  }

  clearProcedures(feeScheduleId: string): void {
    this.cache.delete(feeScheduleId);
    this.cacheTimestamp.delete(feeScheduleId);
  }
}

const cache = new FeeScheduleCache();

// ============================================================================
// Mock Data (Development/Fallback)
// ============================================================================

const MOCK_FEE_SCHEDULES: FeeSchedule[] = [
  {
    feeScheduleId: 'FS-001',
    feeScheduleName: 'Standard Fee Schedule',
    description: 'Default fee schedule for cash patients',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
  {
    feeScheduleId: 'FS-002',
    feeScheduleName: 'United Concordia PPO Plans - Excel',
    description: 'PPO fee schedule for United Concordia',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
  {
    feeScheduleId: 'FS-003',
    feeScheduleName: 'UCR California 2024',
    description: 'Usual, Customary, and Reasonable fees for California',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
  {
    feeScheduleId: 'FS-004',
    feeScheduleName: 'PPO Network A',
    description: 'PPO Network A contracted rates',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
  {
    feeScheduleId: 'FS-005',
    feeScheduleName: 'Medicaid Schedule',
    description: 'State Medicaid fee schedule',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
  {
    feeScheduleId: 'FS-006',
    feeScheduleName: 'Pediatric Fee Schedule',
    description: 'Specialized fee schedule for pediatric patients',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
  {
    feeScheduleId: 'FS-007',
    feeScheduleName: 'CP-50',
    description: 'CP-50 contracted fee schedule',
    isActive: true,
    effectiveDate: '2024-01-01',
  },
];

const MOCK_PROCEDURE_CODES: Record<string, ProcedureCode[]> = {
  'FS-001': [
    { procedureCode: 'D0120', description: 'Periodic Oral Evaluation', fee: 75.00, category: 'Diagnostic' },
    { procedureCode: 'D0150', description: 'Comprehensive Oral Evaluation', fee: 95.00, category: 'Diagnostic' },
    { procedureCode: 'D1110', description: 'Prophylaxis - Adult', fee: 95.00, category: 'Preventive' },
    { procedureCode: 'D1120', description: 'Prophylaxis - Child', fee: 75.00, category: 'Preventive' },
    { procedureCode: 'D2140', description: 'Amalgam - One Surface', fee: 145.00, category: 'Restorative' },
  ],
  'FS-002': [
    { procedureCode: 'D0120', description: 'Periodic Oral Evaluation', fee: 65.00, coverageType: 'PPO', category: 'Diagnostic' },
    { procedureCode: 'D0150', description: 'Comprehensive Oral Evaluation', fee: 85.00, coverageType: 'PPO', category: 'Diagnostic' },
    { procedureCode: 'D1110', description: 'Prophylaxis - Adult', fee: 85.00, coverageType: 'PPO', category: 'Preventive' },
    { procedureCode: 'D1120', description: 'Prophylaxis - Child', fee: 65.00, coverageType: 'PPO', category: 'Preventive' },
    { procedureCode: 'D2140', description: 'Amalgam - One Surface', fee: 125.00, coverageType: 'PPO', category: 'Restorative' },
  ],
  'FS-003': [
    { procedureCode: 'D0120', description: 'Periodic Oral Evaluation', fee: 85.00, category: 'Diagnostic' },
    { procedureCode: 'D0150', description: 'Comprehensive Oral Evaluation', fee: 105.00, category: 'Diagnostic' },
    { procedureCode: 'D1110', description: 'Prophylaxis - Adult', fee: 105.00, category: 'Preventive' },
    { procedureCode: 'D1120', description: 'Prophylaxis - Child', fee: 85.00, category: 'Preventive' },
    { procedureCode: 'D2140', description: 'Amalgam - One Surface', fee: 165.00, category: 'Restorative' },
  ],
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all fee schedules for a given office
 * @param officeId - Optional office ID to filter schedules
 * @returns Promise with fee schedule list
 */
export async function getFeeSchedules(officeId?: string): Promise<FeeScheduleResponse> {
  try {
    // Check cache first
    const cached = cache.getFeeScheduleList();
    if (cached) {
      return cached;
    }

    // Build query params
    const params = new URLSearchParams();
    if (officeId) {
      params.append('officeId', officeId);
    }

    const url = `${API_BASE_URL}/fee-schedules?${params.toString()}`;
    
    // Attempt API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: FeeScheduleResponse = await response.json();
    
    // Cache the result
    cache.setFeeScheduleList(data);
    
    return data;
  } catch (error) {
    console.warn('Fee Schedule API unavailable, using mock data:', error);
    
    // Return mock data as fallback
    const mockResponse: FeeScheduleResponse = {
      feeSchedules: MOCK_FEE_SCHEDULES,
      total: MOCK_FEE_SCHEDULES.length,
    };
    
    cache.setFeeScheduleList(mockResponse);
    return mockResponse;
  }
}

/**
 * Fetch procedure codes for a specific fee schedule
 * @param feeScheduleId - Fee schedule ID
 * @returns Promise with procedure codes
 */
export async function getProcedureCodesByFeeSchedule(
  feeScheduleId: string
): Promise<ProcedureCodesResponse> {
  try {
    // Check cache first
    const cached = cache.get(feeScheduleId);
    if (cached) {
      return cached;
    }

    const url = `${API_BASE_URL}/fee-schedules/${feeScheduleId}/procedures`;
    
    // Attempt API call
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: ProcedureCodesResponse = await response.json();
    
    // Cache the result
    cache.set(feeScheduleId, data);
    
    return data;
  } catch (error) {
    console.warn('Procedure Codes API unavailable, using mock data:', error);
    
    // Return mock data as fallback
    const feeSchedule = MOCK_FEE_SCHEDULES.find(fs => fs.feeScheduleId === feeScheduleId);
    const procedures = MOCK_PROCEDURE_CODES[feeScheduleId] || MOCK_PROCEDURE_CODES['FS-001'];
    
    const mockResponse: ProcedureCodesResponse = {
      procedures,
      feeScheduleId,
      feeScheduleName: feeSchedule?.feeScheduleName || 'Unknown Fee Schedule',
    };
    
    cache.set(feeScheduleId, mockResponse);
    return mockResponse;
  }
}

/**
 * Get a single fee schedule by ID
 * @param feeScheduleId - Fee schedule ID
 * @returns Promise with fee schedule or null
 */
export async function getFeeScheduleById(feeScheduleId: string): Promise<FeeSchedule | null> {
  try {
    const response = await getFeeSchedules();
    return response.feeSchedules.find(fs => fs.feeScheduleId === feeScheduleId) || null;
  } catch (error) {
    console.error('Error fetching fee schedule:', error);
    return null;
  }
}

/**
 * Clear all cached fee schedule data
 */
export function clearFeeScheduleCache(): void {
  cache.clear();
}

/**
 * Clear cached procedure codes for a specific fee schedule
 * @param feeScheduleId - Fee schedule ID
 */
export function clearProcedureCache(feeScheduleId: string): void {
  cache.clearProcedures(feeScheduleId);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find fee schedule by name (case-insensitive)
 * @param name - Fee schedule name
 * @returns Promise with fee schedule or null
 */
export async function findFeeScheduleByName(name: string): Promise<FeeSchedule | null> {
  try {
    const response = await getFeeSchedules();
    return response.feeSchedules.find(
      fs => fs.feeScheduleName.toLowerCase() === name.toLowerCase()
    ) || null;
  } catch (error) {
    console.error('Error finding fee schedule by name:', error);
    return null;
  }
}

/**
 * Get default fee schedule for an office
 * @param officeId - Office ID
 * @returns Promise with default fee schedule or first available
 */
export async function getDefaultFeeSchedule(officeId?: string): Promise<FeeSchedule | null> {
  try {
    const response = await getFeeSchedules(officeId);
    // Return first active schedule as default
    return response.feeSchedules.find(fs => fs.isActive) || response.feeSchedules[0] || null;
  } catch (error) {
    console.error('Error getting default fee schedule:', error);
    return null;
  }
}
