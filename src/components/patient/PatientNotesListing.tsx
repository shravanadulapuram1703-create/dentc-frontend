import { useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
  useOutletContext,
} from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { components } from "../../styles/theme";
import PatientNotesTable from "./PatientNotesTable";

export type NoteType =
  | "Patient Notes"
  | "Responsible Party Notes"
  | "Financial Notes"
  | "Appointment Notes"
  | "System Notes"
  | "Document (Upload)"
  | "Document (Scan)";

export type FilterType = NoteType | "Show All";

export interface PatientNote {
  id: string;
  type: NoteType;
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
}

interface OutletContext {
  patient: PatientData;
}

const NOTE_TYPES: NoteType[] = [
  "Patient Notes",
  "Responsible Party Notes",
  "Financial Notes",
  "Appointment Notes",
  "System Notes",
  "Document (Upload)",
  "Document (Scan)",
];

// mock data unchanged
import { mockPatientNotes } from "./mockPatientNotes";

export default function PatientNotesListing() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  const [notes, setNotes] =
    useState<PatientNote[]>(mockPatientNotes);
  const [filterType, setFilterType] =
    useState<FilterType>("Show All");
  const [excludeSystemNotes, setExcludeSystemNotes] =
    useState(false);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterType !== "Show All" && note.type !== filterType)
        return false;
      if (excludeSystemNotes && note.isSystemGenerated)
        return false;
      return true;
    });
  }, [notes, filterType, excludeSystemNotes]);

  return (
    <div className="flex-1 overflow-auto bg-[#F7F9FC]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F59E0B]/10 rounded-lg">
                <FileText className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">
                  Patient Notes
                </h1>
                <p className="text-sm text-[#64748B]">
                  Administrative notes & documents
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/patient/${patientId}/notes/new`)}
              className={components.buttonPrimary + " inline-flex items-center gap-2"}
            >
              <Plus className="w-4 h-4 shrink-0" />
              Add Patient Note
            </button>
          </div>

          {/* Patient summary */}
          <div className="grid grid-cols-4 gap-4 border-t-2 border-[#E2E8F0] pt-4">
            <div>
              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                Patient
              </div>
              <div className="font-semibold text-[#1E293B]">
                {patient.name}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
                DOB / Age
              </div>
              <div className="font-semibold text-[#1E293B]">
                {patient.dob} ({patient.age}y)
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Filter Type Dropdown */}
            <div className="flex-1 min-w-[200px]">
              <label className={components.label}>
                Note Type Filter
              </label>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as FilterType)
                }
                className={components.select}
              >
                <option>Show All</option>
                {NOTE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Exclude System Notes Checkbox */}
            <div className="flex items-center pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeSystemNotes}
                  onChange={(e) =>
                    setExcludeSystemNotes(e.target.checked)
                  }
                  className={components.checkbox}
                />
                <span className="text-sm font-semibold text-[#1E293B]">EXCLUDE SYSTEM NOTES</span>
              </label>
            </div>

            {/* Results Count */}
            <div className="ml-auto pb-2">
              <span className="text-sm font-bold text-[#475569] uppercase tracking-wide">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'Note' : 'Notes'}
              </span>
            </div>
          </div>
        </div>

        <PatientNotesTable
          notes={filteredNotes}
          onView={(id) =>
            navigate(`/patient/${patientId}/notes/view/${id}`)
          }
          onEdit={(id) =>
            navigate(`/patient/${patientId}/notes/edit/${id}`)
          }
          onDelete={(id) =>
            setNotes((prev) => prev.filter((n) => n.id !== id))
          }
        />
      </div>
    </div>
  );
}