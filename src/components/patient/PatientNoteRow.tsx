import {
  Edit,
  Trash2,
  Eye,
  Paperclip,
  FileText,
  Upload,
  Scan,
  User,
  UserCheck,
  DollarSign,
  Calendar,
} from "lucide-react";
import { PatientNote } from "./PatientNotesListing";

interface Props {
  note: PatientNote;
  onView(id: string): void;
  onEdit(id: string): void;
  onDelete(id: string): void;
}

const ICON_MAP = {
  "Patient Notes": User,
  "Responsible Party Notes": UserCheck,
  "Financial Notes": DollarSign,
  "Appointment Notes": Calendar,
  "System Notes": FileText,
  "Document (Upload)": Upload,
  "Document (Scan)": Scan,
} as const;

export default function PatientNoteRow({
  note,
  onView,
  onEdit,
  onDelete,
}: Props) {
  const Icon = ICON_MAP[note.type] ?? FileText;

  return (
    <tr className="hover:bg-[#F7F9FC] border-b border-[#E2E8F0] transition-colors">
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => onView(note.id)}
            aria-label="View note"
            className="p-1 hover:bg-[#3A6EA5]/10 rounded text-[#3A6EA5] transition-colors"
            title="View note"
          >
            {note.hasAttachment ? (
              <Paperclip size={16} />
            ) : (
              <Eye size={16} />
            )}
          </button>

          <button
            onClick={() => onEdit(note.id)}
            disabled={note.isSystemGenerated}
            aria-label="Edit note"
            className="p-1 hover:bg-[#2FB9A7]/10 rounded text-[#2FB9A7] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:text-[#94A3B8]"
            title={
              note.isSystemGenerated
                ? "System notes cannot be edited"
                : "Edit note"
            }
          >
            <Edit size={16} />
          </button>

          <button
            onClick={() => onDelete(note.id)}
            disabled={note.isSystemGenerated}
            aria-label="Delete note"
            className="p-1 hover:bg-[#EF4444]/10 rounded text-[#EF4444] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:text-[#94A3B8]"
            title={
              note.isSystemGenerated
                ? "System notes cannot be deleted"
                : "Delete note"
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>

      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#64748B]" />
          <span className="text-sm font-medium text-[#1E293B]">
            {note.type}
          </span>
        </div>
      </td>

      <td className="px-4 py-2">
        <span className="text-sm text-[#1E293B]">
          {note.content}
        </span>
      </td>

      <td className="px-4 py-2">
        <span className="text-sm text-[#475569]">
          {note.createdDate} —{" "}
          <strong className="text-[#1E293B] font-semibold">
            {note.createdBy}
          </strong>
        </span>
      </td>
    </tr>
  );
}