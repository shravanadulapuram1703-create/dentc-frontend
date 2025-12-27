import { useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Edit,
  Trash2,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  AlertCircle,
  File,
  Paperclip,
  DollarSign,
  Calendar,
  User,
  UserCheck,
  Upload,
  Scan
} from 'lucide-react';
import { components } from '../../styles/theme';

interface PatientNote {
  id: string;
  type: 'Patient Notes' | 'Responsible Party Notes' | 'Financial Notes' | 'Appointment Notes' | 'System Notes' | 'Document (Upload)' | 'Document (Scan)';
  content: string;
  documentName?: string;
  documentType?: string;
  createdDate: string;
  createdBy: string;
  isSystemGenerated: boolean;
  hasAttachment: boolean;
}

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
}

interface OutletContext {
  patient: PatientData;
}

// Mock data
const mockPatientNotes: PatientNote[] = [
  {
    id: 'PN001',
    type: 'Patient Notes',
    content: 'Patient called to confirm appointment for next week. Reminded about financial policy.',
    createdDate: '12/20/2024',
    createdBy: 'NICOLASM',
    isSystemGenerated: false,
    hasAttachment: false
  },
  {
    id: 'PN002',
    type: 'Document (Upload)',
    content: 'Eligibility verification PDF from Delta Dental',
    documentName: 'eligibility_verification_12202024.pdf',
    documentType: 'Insurance Document',
    createdDate: '12/20/2024',
    createdBy: 'FRONTDESK',
    isSystemGenerated: false,
    hasAttachment: true
  },
  {
    id: 'PN003',
    type: 'Financial Notes',
    content: 'Payment plan approved. Patient will pay $150/month for 6 months starting January 2025.',
    createdDate: '12/15/2024',
    createdBy: 'BILLING_DEPT',
    isSystemGenerated: false,
    hasAttachment: false
  },
  {
    id: 'PN004',
    type: 'System Notes',
    content: 'Appointment confirmation sent via SMS on 12/18/2024 at 3:45 PM. Patient confirmed.',
    createdDate: '12/18/2024',
    createdBy: '_DenticonEngage',
    isSystemGenerated: true,
    hasAttachment: false
  },
  {
    id: 'PN005',
    type: 'Document (Scan)',
    content: 'Signed consent form for crown procedure',
    documentName: 'consent_form_crown_scan.pdf',
    documentType: 'Consent Form (CF)',
    createdDate: '12/15/2024',
    createdBy: 'ASSISTANTM',
    isSystemGenerated: false,
    hasAttachment: true
  },
  {
    id: 'PN006',
    type: 'Responsible Party Notes',
    content: 'RP called regarding payment options. Explained CareCredit financing. RP will apply online.',
    createdDate: '12/10/2024',
    createdBy: 'NICOLASM',
    isSystemGenerated: false,
    hasAttachment: false
  },
  {
    id: 'PN007',
    type: 'Appointment Notes',
    content: 'Patient arrived 15 minutes late. Rescheduled cleaning appointment to next month.',
    createdDate: '12/08/2024',
    createdBy: 'FRONTDESK',
    isSystemGenerated: false,
    hasAttachment: false
  },
  {
    id: 'PN008',
    type: 'System Notes',
    content: 'Insurance eligibility check completed successfully. Benefits verified.',
    createdDate: '12/05/2024',
    createdBy: '_DenticonEngage',
    isSystemGenerated: true,
    hasAttachment: false
  },
  {
    id: 'PN009',
    type: 'Document (Upload)',
    content: 'X-ray images received from external provider',
    documentName: 'external_xrays_120124.jpg',
    documentType: 'Diagnostic Report',
    createdDate: '12/01/2024',
    createdBy: 'DR_JOHNSON',
    isSystemGenerated: false,
    hasAttachment: true
  }
];

function toProperCase(text: string): string {
  return text
    .replace(/[^a-zA-Z\s]/g, " ")   // remove unwanted characters
    .replace(/\s+/g, " ")           // collapse multiple spaces
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase()); // Proper case
}


export default function PatientNotesListing() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  const [filterType, setFilterType] = useState<string>('Show All');
  const [excludeSystemNotes, setExcludeSystemNotes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter patient notes
  const filteredNotes = mockPatientNotes.filter(note => {
    // Apply type filter
    if (filterType !== 'Show All' && note.type !== filterType) {
      return false;
    }
    // Apply exclude system notes filter
    if (excludeSystemNotes && note.isSystemGenerated) {
      return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = showAll 
    ? filteredNotes 
    : filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDeleteClick = (noteId: string) => {
    setSelectedNoteId(noteId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    // Handle delete logic here
    console.log('Deleting note:', selectedNoteId);
    setDeleteModalOpen(false);
    setSelectedNoteId(null);
  };

  const handleEditNote = (noteId: string) => {
    navigate(`/patient/${patientId}/notes/edit/${noteId}`);
  };

  const handleViewNote = (noteId: string) => {
    navigate(`/patient/${patientId}/notes/view/${noteId}`);
  };

  const handleAddNote = () => {
    navigate(`/patient/${patientId}/notes/new`);
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'Patient Notes':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Responsible Party Notes':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'Financial Notes':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Appointment Notes':
        return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'System Notes':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Document (Upload)':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Document (Scan)':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'Patient Notes':
        return User;
      case 'Responsible Party Notes':
        return UserCheck;
      case 'Financial Notes':
        return DollarSign;
      case 'Appointment Notes':
        return Calendar;
      case 'System Notes':
        return FileText;
      case 'Document (Upload)':
        return Upload;
      case 'Document (Scan)':
        return Scan;
      default:
        return FileText;
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <FileText className="w-6 h-6 text-amber-700" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Patient Notes</h1>
                <p className="text-sm text-slate-600">Administrative notes & documents</p>
              </div>
            </div>
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              Add Patient Note
            </button>
          </div>

          {/* Patient Summary */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t-2 border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Patient
              </div>
              <div className="font-semibold text-slate-900">{patient.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                DOB / Age
              </div>
              <div className="font-semibold text-slate-900">
                {patient.dob} ({patient.age}y)
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Responsible Party
              </div>
              <div className="font-semibold text-slate-900">Self</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Insurance
              </div>
              <div className="font-semibold text-slate-900">Delta Dental PPO</div>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-6">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">Filter:</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
              >
                <option>Show All</option>
                <option>Patient Notes</option>
                <option>Responsible Party Notes</option>
                <option>Financial Notes</option>
                <option>Appointment Notes</option>
                <option>System Notes</option>
                <option>Document (Upload)</option>
                <option>Document (Scan)</option>
              </select>
            </div>

            {/* Exclude System Notes Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeSystemNotes}
                onChange={(e) => {
                  setExcludeSystemNotes(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">Exclude System Notes</span>
            </label>

            {/* Results Count */}
            <div className="ml-auto text-sm font-semibold text-slate-600">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'Note' : 'Notes'}
            </div>
          </div>
        </div>

        {/* Patient Notes Grid */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-20">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-64">
                    Note Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-56">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-56">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedNotes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 rounded-full">
                          <FileText className="w-8 h-8 text-slate-400" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 mb-1">No Patient Notes Found</p>
                          <p className="text-sm text-slate-600">
                            {excludeSystemNotes || filterType !== 'Show All'
                              ? 'Try adjusting your filters'
                              : 'Click "Add Patient Note" to create the first note'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedNotes.map((note) => {
                    const TypeIcon = getNoteTypeIcon(note.type);
                    return (
                      <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                        {/* Actions Column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* View Icon / Attachment */}
                            <button
                              onClick={() => handleViewNote(note.id)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title={note.hasAttachment ? 'View Document' : 'View Note'}
                            >
                              {note.hasAttachment ? (
                                <Paperclip className="w-4 h-4" strokeWidth={2} />
                              ) : (
                                <Eye className="w-4 h-4" strokeWidth={2} />
                              )}
                            </button>

                            {/* Edit Icon */}
                            <button
                              onClick={() => handleEditNote(note.id)}
                              disabled={note.isSystemGenerated}
                              className={`p-2 rounded-lg transition-colors ${
                                note.isSystemGenerated
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-green-600 hover:bg-green-100'
                              }`}
                              title={
                                note.isSystemGenerated
                                  ? 'System notes cannot be edited'
                                  : 'Edit Note'
                              }
                            >
                              <Edit className="w-4 h-4" strokeWidth={2} />
                            </button>

                            {/* Delete Icon */}
                            <button
                              onClick={() => handleDeleteClick(note.id)}
                              disabled={note.isSystemGenerated}
                              className={`p-2 rounded-lg transition-colors ${
                                note.isSystemGenerated
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-100'
                              }`}
                              title={
                                note.isSystemGenerated
                                  ? 'System notes cannot be deleted'
                                  : 'Delete Note'
                              }
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                            </button>
                          </div>
                        </td>

                        {/* Note Type Column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border-2 ${getNoteTypeColor(
                                note.type
                              )}`}
                            >
                              <TypeIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                              {note.type}
                            </span>
                            {note.hasAttachment && (
                              <File className="w-4 h-4 text-slate-500" strokeWidth={2} />
                            )}
                          </div>
                          {note.documentName && (
                            <div className="text-xs text-slate-500 mt-1 font-medium">
                              {note.documentName}
                            </div>
                          )}
                        </td>

                        {/* Notes Content Column */}
                        <td className="px-4 py-3">
                          <div className="max-w-2xl">
                            <p className="text-sm text-slate-900 line-clamp-2">{note.content}</p>
                          </div>
                        </td>

                        {/* Created Date Column */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            {note.createdDate}
                          </div>
                        </td>
                        {/* Created createdBy Column */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            <span className="font-bold">{toProperCase(note.createdBy)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!showAll && filteredNotes.length > 0 && (
            <div className="border-t-2 border-slate-200 px-4 py-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border-2 border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4 text-slate-700" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border-2 border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" strokeWidth={2} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg border-2 font-semibold text-sm transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-300 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border-2 border-[#E2E8F0] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4 text-[#1F3A5F]" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border-2 border-[#E2E8F0] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4 text-[#1F3A5F]" strokeWidth={2} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-[#1F3A5F]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setShowAll(true)}
                    className={components.buttonPrimary + " text-sm"}
                  >
                    Show All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show All Active */}
          {showAll && filteredNotes.length > itemsPerPage && (
            <div className="border-t-2 border-[#E2E8F0] px-4 py-3 bg-[#F7F9FC]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1F3A5F]">
                  Showing all {filteredNotes.length} notes
                </span>
                <button
                  onClick={() => {
                    setShowAll(false);
                    setCurrentPage(1);
                  }}
                  className={components.buttonSecondary + " text-sm"}
                >
                  Show Paginated
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-slate-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-2">Delete Patient Note?</h3>
                <p className="text-sm text-slate-600">
                  This action cannot be undone. The patient note will be permanently deleted from the
                  patient's record.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedNoteId(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}