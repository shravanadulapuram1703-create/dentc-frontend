import { useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Paperclip,
  CheckCircle,
  Search,
  X,
  Link2,
  Circle
} from 'lucide-react';
import { components } from '../../styles/theme';

interface ProgressNote {
  id: string;
  dos: string; // Date of Service
  category: string;
  toothNumbers: string[];
  surface?: string;
  region?: string;
  content: string;
  hasAttachments: boolean;
  hasLinkedProcedures: boolean;
  isSigned: boolean;
  isStruckOff: boolean;
  createdDate: string;
  createdBy: string;
  createdTime: string;
  modifiedDate?: string;
  modifiedBy?: string;
  modifiedTime?: string;
  signedBy?: string;
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
const mockProgressNotes: ProgressNote[] = [
  {
    id: 'PRN001',
    dos: '10/26/2023',
    category: 'Preventive',
    toothNumbers: [],
    content: 'Completed prophy',
    hasAttachments: false,
    hasLinkedProcedures: true,
    isSigned: true,
    isStruckOff: false,
    createdDate: '10/26/2023',
    createdBy: 'ELIZABETHC',
    createdTime: '11:50:12 AM (PST)',
    signedBy: 'WEXFOR'
  },
  {
    id: 'PRN002',
    dos: '07/14/2023',
    category: 'Restorative',
    toothNumbers: ['18'],
    surface: 'O',
    content: '#18 core and crown prep. Pt reports with #18 onlay broken. Advised crown and post. Anes with 1 carp 2% lido w 1:100k epi. Removed old onlay and placed fiber glass post. Placed core and prep for crown. Temp crown placed. NV. #18 crown dist.',
    hasAttachments: false,
    hasLinkedProcedures: true,
    isSigned: true,
    isStruckOff: false,
    createdDate: '07/14/2023',
    createdBy: 'CARON3',
    createdTime: '10:55:16 AM (PST)',
    signedBy: 'WEXFOR'
  },
  {
    id: 'PRN003',
    dos: '04/06/2023',
    category: 'Periodontics',
    toothNumbers: [],
    content: 'Pt reports with bleeding.\nRemoved temp. Deep lingual margin.\nNoted lingual margin short with affected dentin.\nGiven deep lingual margin and sufficient gingival coverage, affected dentin should remineralize. Renovate or affected dentin would result in loss of tooth due to invasion of biological width.\nWill monitor gingival health as indicator of decay arrest. Long term poor prognosis.\nNV. recall.',
    hasAttachments: false,
    hasLinkedProcedures: false,
    isSigned: false,
    isStruckOff: false,
    createdDate: '04/06/2023',
    createdBy: 'CARON3',
    createdTime: '07:41:17 AM (PST)',
    modifiedDate: '04/06/2023',
    modifiedBy: 'CARON3',
    modifiedTime: '07:47:58 AM (PST)'
  }
];

export default function ProgressNotesListing() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  console.log('=== PROGRESS NOTES COMPONENT LOADED ===');
  console.log('Patient:', patient);
  console.log('PatientId:', patientId);

  // Safety check
  if (!patient) {
    console.log('ERROR: No patient data!');
    return (
      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-[98%] mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-6">
            <h1 className="text-2xl font-bold text-red-600">Error: Patient data not available</h1>
            <p className="text-slate-600 mt-2">Please reload the patient or contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('Patient data OK, rendering component...');

  const [filterType, setFilterType] = useState<string>('Show All (No Search Filter)');
  const [filteringCriteria, setFilteringCriteria] = useState<string>('');
  const [signatureFilter, setSignatureFilter] = useState(false);
  const [hideStruckOff, setHideStruckOff] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const itemsPerPage = 10;

  // Filter progress notes
  const filteredNotes = mockProgressNotes.filter(note => {
    // Apply signature filter
    if (signatureFilter && !note.isSigned) {
      return false;
    }
    // Apply hide struck-off filter
    if (hideStruckOff && note.isStruckOff) {
      return false;
    }
    // Apply text search filter
    if (filteringCriteria.trim()) {
      const searchTerm = filteringCriteria.toLowerCase();
      const searchableContent = [
        note.content,
        note.createdBy,
        note.modifiedBy,
        note.category,
        note.toothNumbers.join(' ')
      ].join(' ').toLowerCase();
      
      if (!searchableContent.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = showAll 
    ? filteredNotes 
    : filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditNote = (noteId: string, isSigned: boolean) => {
    if (isSigned) {
      alert('Cannot edit signed progress notes');
      return;
    }
    navigate(`/patient/${patientId}/progress-notes/edit/${noteId}`);
  };

  const handleAddNote = () => {
    navigate(`/patient/${patientId}/progress-notes/new`);
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setFilterType('Show All (No Search Filter)');
    setFilteringCriteria('');
    setSignatureFilter(false);
    setHideStruckOff(true);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-[98%] mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Progress Notes for {patient.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Clinical treatment documentation
              </p>
            </div>
            <button
              onClick={handleAddNote}
              className={components.buttonPrimary + " flex items-center gap-2"}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              ADD NEW NOTE
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
                Last Visit
              </div>
              <div className="font-semibold text-slate-900">10/26/2023</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Active Treatment
              </div>
              <div className="font-semibold text-green-700">Crown Prep #18</div>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-12 gap-4 items-end">
            {/* Select Filter */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Select Filter
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm font-medium text-slate-900"
              >
                <option>Show All (No Search Filter)</option>
                <option>Date Range</option>
                <option>Category</option>
                <option>Provider</option>
                <option>Tooth Number</option>
              </select>
            </div>

            {/* Filtering Criteria */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Select Filtering Criteria
              </label>
              <input
                type="text"
                value={filteringCriteria}
                onChange={(e) => setFilteringCriteria(e.target.value)}
                placeholder="Search notes, provider, tooth..."
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] text-sm font-medium text-slate-900"
              />
            </div>

            {/* Checkboxes */}
            <div className="col-span-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signatureFilter}
                  onChange={(e) => setSignatureFilter(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-slate-300 text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]"
                />
                <span className="text-sm font-semibold text-slate-700">SIGNATURE</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideStruckOff}
                  onChange={(e) => setHideStruckOff(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-slate-300 text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]"
                />
                <span className="text-sm font-semibold text-slate-700">HIDE STRIKE-OFF</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="col-span-3 flex items-center gap-3">
              <button
                onClick={handleSearch}
                className={components.buttonPrimary + " flex items-center gap-2"}
              >
                <Search className="w-4 h-4" strokeWidth={2} />
                SEARCH
              </button>
              <button
                onClick={handleClearFilter}
                className={components.buttonSecondary + " flex items-center gap-2"}
              >
                <X className="w-4 h-4" strokeWidth={2} />
                CLEAR FILTER
              </button>
            </div>
          </div>
        </div>

        {/* Progress Notes Grid */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider w-12">
                    Edit
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider w-32">
                    DOS
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider w-16">
                    <Paperclip className="w-4 h-4 mx-auto" strokeWidth={2} />
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider w-16">
                    <Link2 className="w-4 h-4 mx-auto" strokeWidth={2} />
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider w-16">
                    <Circle className="w-4 h-4 mx-auto" strokeWidth={2} />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider w-20">
                    Th
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Progress Notes
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider w-56">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 rounded-full">
                          <FileText className="w-8 h-8 text-slate-400" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 mb-1">No Progress Notes Found</p>
                          <p className="text-sm text-slate-600">
                            {filteringCriteria || signatureFilter
                              ? 'Try adjusting your filters'
                              : 'Click "ADD NEW NOTE" to create the first clinical note'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-blue-50 transition-colors">
                      {/* Edit Icon */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleEditNote(note.id, note.isSigned)}
                          disabled={note.isSigned}
                          className={`p-2 rounded-lg transition-colors ${
                            note.isSigned
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-blue-600 hover:bg-blue-100'
                          }`}
                          title={note.isSigned ? 'Signed notes cannot be edited' : 'Edit Note'}
                        >
                          <Edit className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </td>

                      {/* DOS */}
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-slate-900">{note.dos}</div>
                      </td>

                      {/* Attachment Indicator */}
                      <td className="px-3 py-3 text-center">
                        {note.hasAttachments && (
                          <Paperclip className="w-4 h-4 text-blue-600 mx-auto" strokeWidth={2} />
                        )}
                      </td>

                      {/* Linked Procedures Indicator */}
                      <td className="px-3 py-3 text-center">
                        {note.hasLinkedProcedures && (
                          <Link2 className="w-4 h-4 text-green-600 mx-auto" strokeWidth={2} />
                        )}
                      </td>

                      {/* Tooth Association Indicator */}
                      <td className="px-3 py-3 text-center">
                        {note.toothNumbers.length > 0 && (
                          <Circle className="w-4 h-4 text-purple-600 mx-auto" strokeWidth={2} />
                        )}
                      </td>

                      {/* Tooth Numbers */}
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {note.toothNumbers.length > 0 ? (
                            <>
                              {note.toothNumbers.join(', ')}
                              {note.surface && <span className="text-blue-600 ml-1">({note.surface})</span>}
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Progress Notes Content */}
                      <td className="px-3 py-3">
                        <div className="max-w-2xl">
                          <p className="text-sm text-slate-900 whitespace-pre-line">{note.content}</p>
                        </div>
                      </td>

                      {/* Date Panel */}
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="font-bold text-slate-700">Created</span>
                            <div className="text-slate-900 font-medium">
                              {note.createdDate} {note.createdTime}
                            </div>
                            <div className="text-blue-700 font-semibold">
                              {note.createdBy}
                            </div>
                            {note.signedBy && (
                              <div className="text-green-700 font-semibold flex items-center gap-1 mt-1">
                                <CheckCircle className="w-3 h-3" strokeWidth={2.5} />
                                ({note.signedBy})
                              </div>
                            )}
                          </div>
                          {note.modifiedDate && (
                            <div className="pt-2 border-t border-slate-200">
                              <span className="font-bold text-slate-700">Modified</span>
                              <div className="text-slate-900 font-medium">
                                {note.modifiedDate} {note.modifiedTime}
                              </div>
                              <div className="text-blue-700 font-semibold">
                                {note.modifiedBy}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
                  >
                    <ChevronsLeft className="w-4 h-4 text-slate-700" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border-2 border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    className="p-2 rounded-lg border-2 border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border-2 border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4 text-slate-700" strokeWidth={2} />
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
                    SHOW ALL
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
    </div>
  );
}