// Note Audit Trail & Version History System
// Tracks all changes to patient notes for compliance and accountability

export interface NoteVersion {
  versionId: string;
  noteId: string;
  versionNumber: number;
  content: string;
  noteType: string;
  documentType?: string;
  documentUrl?: string;
  modifiedBy: string;
  modifiedByRole: string;
  modifiedAt: string;
  changeReason?: string;
  changesSummary?: string[];
}

export interface NoteAuditLog {
  auditId: string;
  noteId: string;
  action: 'created' | 'updated' | 'deleted' | 'restored' | 'viewed' | 'downloaded' | 'printed';
  performedBy: string;
  performedByRole: string;
  performedAt: string;
  patientId: string;
  officeId: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface SoftDeletedNote {
  noteId: string;
  deletedBy: string;
  deletedByRole: string;
  deletedAt: string;
  deletionReason?: string;
  canBeRestored: boolean;
  permanentDeletionDate?: string; // When it will be permanently deleted (e.g., 90 days)
  originalNote: {
    type: string;
    content: string;
    createdBy: string;
    createdAt: string;
  };
}

// Mock storage for demonstration
let noteVersions: NoteVersion[] = [];
let auditLogs: NoteAuditLog[] = [];
let softDeletedNotes: SoftDeletedNote[] = [];

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new version when note is edited
export function createNoteVersion(
  noteId: string,
  content: string,
  noteType: string,
  modifiedBy: string,
  modifiedByRole: string,
  changeReason?: string,
  documentType?: string,
  documentUrl?: string
): NoteVersion {
  const existingVersions = noteVersions.filter(v => v.noteId === noteId);
  const versionNumber = existingVersions.length + 1;

  const version: NoteVersion = {
    versionId: generateId('VER'),
    noteId,
    versionNumber,
    content,
    noteType,
    documentType,
    documentUrl,
    modifiedBy,
    modifiedByRole,
    modifiedAt: new Date().toISOString(),
    changeReason,
  };

  noteVersions.push(version);
  return version;
}

// Get version history for a note
export function getNoteVersionHistory(noteId: string): NoteVersion[] {
  return noteVersions
    .filter(v => v.noteId === noteId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

// Get specific version
export function getNoteVersion(versionId: string): NoteVersion | undefined {
  return noteVersions.find(v => v.versionId === versionId);
}

// Compare two versions
export function compareVersions(version1: NoteVersion, version2: NoteVersion): string[] {
  const changes: string[] = [];

  if (version1.content !== version2.content) {
    changes.push('Content modified');
  }
  if (version1.noteType !== version2.noteType) {
    changes.push(`Note type changed from "${version1.noteType}" to "${version2.noteType}"`);
  }
  if (version1.documentType !== version2.documentType) {
    changes.push('Document type changed');
  }
  if (version1.documentUrl !== version2.documentUrl) {
    changes.push('Document file changed');
  }

  return changes;
}

// Create audit log entry
export function createAuditLog(
  noteId: string,
  action: NoteAuditLog['action'],
  performedBy: string,
  performedByRole: string,
  patientId: string,
  officeId: string,
  details?: Record<string, any>,
  changes?: NoteAuditLog['changes']
): NoteAuditLog {
  const auditLog: NoteAuditLog = {
    auditId: generateId('AUDIT'),
    noteId,
    action,
    performedBy,
    performedByRole,
    performedAt: new Date().toISOString(),
    patientId,
    officeId,
    ipAddress: '192.168.1.1', // Would come from request
    userAgent: navigator.userAgent,
    details,
    changes,
  };

  auditLogs.push(auditLog);
  return auditLog;
}

// Get audit logs for a note
export function getNoteAuditLogs(noteId: string): NoteAuditLog[] {
  return auditLogs
    .filter(log => log.noteId === noteId)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
}

// Get audit logs for a patient
export function getPatientAuditLogs(patientId: string, limit?: number): NoteAuditLog[] {
  const logs = auditLogs
    .filter(log => log.patientId === patientId)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  
  return limit ? logs.slice(0, limit) : logs;
}

// Get audit logs by user
export function getUserAuditLogs(userId: string, limit?: number): NoteAuditLog[] {
  const logs = auditLogs
    .filter(log => log.performedBy === userId)
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  
  return limit ? logs.slice(0, limit) : logs;
}

// Soft delete a note
export function softDeleteNote(
  noteId: string,
  noteType: string,
  noteContent: string,
  createdBy: string,
  createdAt: string,
  deletedBy: string,
  deletedByRole: string,
  deletionReason?: string,
  retentionDays: number = 90
): SoftDeletedNote {
  const deletedAt = new Date();
  const permanentDeletionDate = new Date(deletedAt);
  permanentDeletionDate.setDate(permanentDeletionDate.getDate() + retentionDays);

  const softDeleted: SoftDeletedNote = {
    noteId,
    deletedBy,
    deletedByRole,
    deletedAt: deletedAt.toISOString(),
    deletionReason,
    canBeRestored: true,
    permanentDeletionDate: permanentDeletionDate.toISOString(),
    originalNote: {
      type: noteType,
      content: noteContent,
      createdBy,
      createdAt,
    },
  };

  softDeletedNotes.push(softDeleted);
  return softDeleted;
}

// Get soft deleted notes
export function getSoftDeletedNotes(patientId?: string): SoftDeletedNote[] {
  // In production, would filter by patientId
  return softDeletedNotes.filter(note => note.canBeRestored);
}

// Restore a soft deleted note
export function restoreNote(noteId: string, restoredBy: string, restoredByRole: string): boolean {
  const index = softDeletedNotes.findIndex(note => note.noteId === noteId);
  
  if (index === -1 || !softDeletedNotes[index].canBeRestored) {
    return false;
  }

  // Remove from soft deleted list
  softDeletedNotes.splice(index, 1);

  // Create audit log for restoration
  createAuditLog(
    noteId,
    'restored',
    restoredBy,
    restoredByRole,
    'PATIENT-ID', // Would come from context
    'OFFICE-ID',   // Would come from context
    { restorationReason: 'Note restored from deleted items' }
  );

  return true;
}

// Permanently delete a note (after retention period)
export function permanentlyDeleteNote(noteId: string): boolean {
  const index = softDeletedNotes.findIndex(note => note.noteId === noteId);
  
  if (index === -1) {
    return false;
  }

  const note = softDeletedNotes[index];
  
  // Check if retention period has passed
  const now = new Date();
  const permanentDeletionDate = new Date(note.permanentDeletionDate || now);
  
  if (now >= permanentDeletionDate) {
    // Mark as not restorable
    softDeletedNotes[index].canBeRestored = false;
    
    // In production, would actually remove from database after creating final audit log
    createAuditLog(
      noteId,
      'deleted',
      'SYSTEM',
      'System',
      'PATIENT-ID',
      'OFFICE-ID',
      { reason: 'Automatic permanent deletion after retention period' }
    );
    
    return true;
  }
  
  return false;
}

// Get audit summary for compliance reporting
export interface AuditSummary {
  totalActions: number;
  actionsByType: Record<string, number>;
  uniqueUsers: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  topUsers: Array<{
    userId: string;
    actionCount: number;
  }>;
}

export function getAuditSummary(patientId?: string, startDate?: string, endDate?: string): AuditSummary {
  let logs = auditLogs;
  
  if (patientId) {
    logs = logs.filter(log => log.patientId === patientId);
  }
  
  if (startDate) {
    logs = logs.filter(log => new Date(log.performedAt) >= new Date(startDate));
  }
  
  if (endDate) {
    logs = logs.filter(log => new Date(log.performedAt) <= new Date(endDate));
  }
  
  const actionsByType: Record<string, number> = {};
  const userActions: Record<string, number> = {};
  
  logs.forEach(log => {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
    userActions[log.performedBy] = (userActions[log.performedBy] || 0) + 1;
  });
  
  const sortedUsers = Object.entries(userActions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, actionCount]) => ({ userId, actionCount }));
  
  const dates = logs.map(log => new Date(log.performedAt).getTime()).sort();
  
  return {
    totalActions: logs.length,
    actionsByType,
    uniqueUsers: Object.keys(userActions).length,
    dateRange: {
      earliest: dates.length > 0 ? new Date(dates[0]).toISOString() : '',
      latest: dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : '',
    },
    topUsers: sortedUsers,
  };
}

// Export audit logs for compliance (CSV format)
export function exportAuditLogsToCSV(logs: NoteAuditLog[]): string {
  const headers = [
    'Audit ID',
    'Note ID',
    'Action',
    'Performed By',
    'Role',
    'Timestamp',
    'Patient ID',
    'Office ID',
    'IP Address',
  ];
  
  const rows = logs.map(log => [
    log.auditId,
    log.noteId,
    log.action,
    log.performedBy,
    log.performedByRole,
    log.performedAt,
    log.patientId,
    log.officeId,
    log.ipAddress || 'N/A',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}
