// Note Permissions System
// Role-based access control for Patient Notes & Documents

export type UserRole = 
  | 'Owner'           // Full access to everything
  | 'Admin'           // Full access except some system settings
  | 'Doctor'          // Clinical focus
  | 'Hygienist'       // Clinical focus, limited
  | 'Office Manager'  // Administrative focus
  | 'Front Desk'      // Scheduling and basic notes
  | 'Billing'         // Financial focus
  | 'Assistant'       // Support role
  | 'Read Only';      // View only

export type NoteType = 
  | 'Patient Notes'
  | 'Responsible Party Notes'
  | 'Financial Notes'
  | 'Appointment Notes'
  | 'System Notes'
  | 'Document (Upload)'
  | 'Document (Scan)';

export type NoteAction = 'view' | 'add' | 'edit' | 'delete';

export interface NotePermission {
  noteType: NoteType;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  restrictions?: string[];  // Additional restrictions or conditions
}

// Permission matrix by role and note type
export const NOTE_PERMISSIONS: Record<UserRole, Record<NoteType, NotePermission>> = {
  'Owner': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: true, canDelete: true },
  },
  'Admin': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: true, canDelete: true },
  },
  'Doctor': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: true, canEdit: false, canDelete: false, restrictions: ['Can view but cannot modify financial notes'] },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: true, canDelete: false },
  },
  'Hygienist': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: false, canDelete: false },
  },
  'Office Manager': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: true, canDelete: true },
  },
  'Front Desk': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: false, canDelete: false },
  },
  'Billing': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: true, canEdit: true, canDelete: true },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: false, canDelete: false },
  },
  'Assistant': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: true, canEdit: true, canDelete: false },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: true, canEdit: false, canDelete: false },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: true, canEdit: false, canDelete: false },
  },
  'Read Only': {
    'Patient Notes': { noteType: 'Patient Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Responsible Party Notes': { noteType: 'Responsible Party Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Financial Notes': { noteType: 'Financial Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Appointment Notes': { noteType: 'Appointment Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'System Notes': { noteType: 'System Notes', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Upload)': { noteType: 'Document (Upload)', canView: true, canAdd: false, canEdit: false, canDelete: false },
    'Document (Scan)': { noteType: 'Document (Scan)', canView: true, canAdd: false, canEdit: false, canDelete: false },
  },
};

// Helper function to check if user has permission for a specific action
export function hasNotePermission(
  userRole: UserRole,
  noteType: NoteType,
  action: NoteAction
): boolean {
  const permissions = NOTE_PERMISSIONS[userRole]?.[noteType];
  
  if (!permissions) {
    return false;
  }

  switch (action) {
    case 'view':
      return permissions.canView;
    case 'add':
      return permissions.canAdd;
    case 'edit':
      return permissions.canEdit;
    case 'delete':
      return permissions.canDelete;
    default:
      return false;
  }
}

// Check if user can perform action on their own notes only
export function canModifyOwnNote(
  userRole: UserRole,
  noteType: NoteType,
  action: 'edit' | 'delete',
  noteCreatedBy: string,
  currentUserId: string
): boolean {
  const hasGeneralPermission = hasNotePermission(userRole, noteType, action);
  
  // If user doesn't have general permission, check if they created the note
  if (!hasGeneralPermission && noteCreatedBy === currentUserId) {
    // Allow edit of own notes for most roles (except Read Only)
    if (action === 'edit' && userRole !== 'Read Only') {
      return true;
    }
  }
  
  return hasGeneralPermission;
}

// Get available note types for user to create
export function getAvailableNoteTypes(userRole: UserRole): NoteType[] {
  const permissions = NOTE_PERMISSIONS[userRole];
  
  return Object.entries(permissions)
    .filter(([_, perm]) => perm.canAdd)
    .map(([noteType, _]) => noteType as NoteType);
}

// Get permission restrictions for display
export function getPermissionRestrictions(
  userRole: UserRole,
  noteType: NoteType
): string[] {
  const permissions = NOTE_PERMISSIONS[userRole]?.[noteType];
  return permissions?.restrictions || [];
}

// Audit action logging
export interface NoteAuditEntry {
  id: string;
  noteId: string;
  action: 'created' | 'updated' | 'deleted' | 'viewed' | 'restored';
  performedBy: string;
  performedByRole: UserRole;
  timestamp: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  userAgent?: string;
}

export function createAuditEntry(
  noteId: string,
  action: NoteAuditEntry['action'],
  performedBy: string,
  performedByRole: UserRole,
  changes?: NoteAuditEntry['changes']
): NoteAuditEntry {
  return {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    noteId,
    action,
    performedBy,
    performedByRole,
    timestamp: new Date().toISOString(),
    changes,
    ipAddress: '192.168.1.1', // Would come from request in production
    userAgent: navigator.userAgent,
  };
}
