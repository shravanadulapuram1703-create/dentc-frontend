/**
 * ==================================================================================
 * TIME CLOCK DATA MODEL
 * ==================================================================================
 * 
 * PURPOSE:
 * - Track employee clock-in/out times
 * - Support cross-office clocking
 * - Enable administrative corrections
 * - Maintain audit trail
 * 
 * BUSINESS RULES:
 * 1. Cross-office clocking is ALLOWED (clock in at Office A, out at Office B)
 * 2. Multiple time segments per day are SUPPORTED (breaks, split shifts)
 * 3. Clock-out time cannot be in the future
 * 4. Clock-in time must be <= Clock-out time
 * 5. Edits are tracked with audit metadata
 * 
 * USE CASES:
 * - Real-time clocking (Today's Hours panel)
 * - Administrative corrections (TimeClockEditor)
 * - Payroll reporting (Time Clock Report)
 * 
 * ==================================================================================
 */

export interface TimeClockEntry {
  entryId: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // HH:MM:SS
  clockOutTime: string | null; // HH:MM:SS or null if still clocked in
  officeInId: string;
  officeInName: string;
  officeOutId: string | null;
  officeOutName: string | null;
  totalMinutes: number | null; // Null if still clocked in
  isEdited: boolean;
  editedBy?: string;
  editedByName?: string;
  editedAt?: string; // ISO timestamp
  originalClockIn?: string;
  originalClockOut?: string | null;
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface TimeClockSummary {
  userId: string;
  userName: string;
  date: string;
  entries: TimeClockEntry[];
  totalMinutes: number;
  totalHoursFormatted: string; // HH:MM:SS
  totalHoursDecimal: number; // e.g., 8.75
}

export interface TimeClockValidationError {
  field: string;
  message: string;
}

/**
 * ==================================================================================
 * VALIDATION UTILITIES
 * ==================================================================================
 */

export function validateTimeClockEntry(
  clockIn: string,
  clockOut: string | null,
  date: string
): TimeClockValidationError[] {
  const errors: TimeClockValidationError[] = [];

  if (!clockIn) {
    errors.push({
      field: 'clockIn',
      message: 'Clock In time is required',
    });
  }

  if (clockOut) {
    // Parse times
    const clockInDate = new Date(`${date}T${clockIn}`);
    const clockOutDate = new Date(`${date}T${clockOut}`);
    const now = new Date();

    // Clock out cannot be in the future
    if (clockOutDate > now) {
      errors.push({
        field: 'clockOut',
        message: 'Invalid Clock Out Time: Clock Out Time cannot be in the future',
      });
    }

    // Clock in must be <= clock out
    if (clockInDate > clockOutDate) {
      errors.push({
        field: 'clockOut',
        message: 'Clock Out time must be after Clock In time',
      });
    }
  }

  return errors;
}

/**
 * Calculate total minutes between clock in and clock out
 */
export function calculateTotalMinutes(
  clockIn: string,
  clockOut: string | null,
  date: string
): number | null {
  if (!clockOut) {
    return null; // Still clocked in
  }

  const clockInDate = new Date(`${date}T${clockIn}`);
  const clockOutDate = new Date(`${date}T${clockOut}`);

  const diffMs = clockOutDate.getTime() - clockInDate.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  return diffMinutes;
}

/**
 * Format minutes as HH:MM:SS
 */
export function formatMinutesAsTime(minutes: number | null): string {
  if (minutes === null) {
    return '--:--:--';
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = 0; // We don't track seconds in this system

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Convert minutes to decimal hours
 */
export function minutesToDecimalHours(minutes: number | null): number {
  if (minutes === null) {
    return 0;
  }
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Get current time as HH:MM:SS
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get current date as YYYY-MM-DD
 */
export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ==================================================================================
 * MOCK DATA - TIME CLOCK ENTRIES
 * ==================================================================================
 */

export const MOCK_TIME_CLOCK_ENTRIES: TimeClockEntry[] = [
  // Today's active clock-in for current user
  {
    entryId: 'TCE-001',
    userId: 'USER-001',
    userName: 'Dr. Sarah Sharma',
    date: getCurrentDate(),
    clockInTime: '08:30:00',
    clockOutTime: null, // Still clocked in
    officeInId: 'OFF-101',
    officeInName: 'Excel Dental - Wexford',
    officeOutId: null,
    officeOutName: null,
    totalMinutes: null,
    isEdited: false,
    createdAt: new Date().toISOString(),
  },

  // Yesterday - completed shift
  {
    entryId: 'TCE-002',
    userId: 'USER-001',
    userName: 'Dr. Sarah Sharma',
    date: '2026-01-26',
    clockInTime: '09:00:00',
    clockOutTime: '17:00:00',
    officeInId: 'OFF-101',
    officeInName: 'Excel Dental - Wexford',
    officeOutId: 'OFF-101',
    officeOutName: 'Excel Dental - Wexford',
    totalMinutes: 480, // 8 hours
    isEdited: false,
    createdAt: '2026-01-26T09:00:00Z',
  },

  // Yesterday - split shift (Line 1)
  {
    entryId: 'TCE-003',
    userId: 'USER-002',
    userName: 'Dr. Michael Jinna',
    date: '2026-01-26',
    clockInTime: '09:00:00',
    clockOutTime: '14:45:00',
    officeInId: 'OFF-102',
    officeInName: 'Excel Dental - Green Tree',
    officeOutId: 'OFF-102',
    officeOutName: 'Excel Dental - Green Tree',
    totalMinutes: 345, // 5h 45m
    isEdited: false,
    createdAt: '2026-01-26T09:00:00Z',
  },

  // Yesterday - split shift (Line 2)
  {
    entryId: 'TCE-004',
    userId: 'USER-002',
    userName: 'Dr. Michael Jinna',
    date: '2026-01-26',
    clockInTime: '15:00:00',
    clockOutTime: '16:45:00',
    officeInId: 'OFF-102',
    officeInName: 'Excel Dental - Green Tree',
    officeOutId: 'OFF-102',
    officeOutName: 'Excel Dental - Green Tree',
    totalMinutes: 105, // 1h 45m
    isEdited: false,
    createdAt: '2026-01-26T15:00:00Z',
  },

  // Cross-office clocking example
  {
    entryId: 'TCE-005',
    userId: 'USER-003',
    userName: 'Lisa Thompson, RDH',
    date: '2026-01-26',
    clockInTime: '08:00:00',
    clockOutTime: '16:30:00',
    officeInId: 'OFF-102',
    officeInName: 'Excel Dental - Green Tree',
    officeOutId: 'OFF-101',
    officeOutName: 'Excel Dental - Wexford', // Different office!
    totalMinutes: 510, // 8h 30m
    isEdited: false,
    createdAt: '2026-01-26T08:00:00Z',
  },

  // Edited entry example
  {
    entryId: 'TCE-006',
    userId: 'USER-004',
    userName: 'Jennifer Martinez, DA',
    date: '2026-01-25',
    clockInTime: '09:00:00',
    clockOutTime: '17:00:00',
    officeInId: 'OFF-101',
    officeInName: 'Excel Dental - Wexford',
    officeOutId: 'OFF-101',
    officeOutName: 'Excel Dental - Wexford',
    totalMinutes: 480,
    isEdited: true,
    editedBy: 'ADMIN-001',
    editedByName: 'Office Manager',
    editedAt: '2026-01-26T10:30:00Z',
    originalClockIn: '08:45:00',
    originalClockOut: '16:30:00',
    notes: 'Corrected to match approved timesheet',
    createdAt: '2026-01-25T08:45:00Z',
  },
];

/**
 * ==================================================================================
 * MOCK USERS (for dropdowns)
 * ==================================================================================
 */

export interface User {
  userId: string;
  userName: string;
  role: string;
}

export const MOCK_USERS: User[] = [
  { userId: 'USER-001', userName: 'Dr. Sarah Sharma', role: 'Dentist' },
  { userId: 'USER-002', userName: 'Dr. Michael Jinna', role: 'Dentist' },
  { userId: 'USER-003', userName: 'Lisa Thompson, RDH', role: 'Hygienist' },
  { userId: 'USER-004', userName: 'Jennifer Martinez, DA', role: 'Assistant' },
  { userId: 'USER-005', userName: 'Robert Chen, DA', role: 'Assistant' },
  { userId: 'USER-006', userName: 'Emily Davis', role: 'Front Desk' },
];
