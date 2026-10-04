// The patient's photo (or the generic person icon) — used in the patient
// header and the Overview "Photo" box. When `editable`, clicking it opens the
// take/upload dialog.

import { useState } from "react";
import { Camera, User } from "lucide-react";
import { cn } from "@/components/ui/utils";
import PatientPhotoDialog from "./PatientPhotoDialog";
import { usePatientPhotoUrl } from "./patientPhotoService";

export default function PatientPhoto({
  patient_id,
  photo_document_id,
  office_id,
  editable = true,
  className,
  iconClassName,
  fallbackClassName = "bg-gradient-to-br from-blue-600 to-cyan-600 text-white",
}: {
  patient_id: number;
  photo_document_id: number | null | undefined;
  /** Office the photo document is stamped with (STAMP.document = posting). */
  office_id: number | null;
  editable?: boolean;
  /** Size + shape, e.g. "w-16 h-16 rounded-full". */
  className?: string;
  iconClassName?: string;
  /** Background/foreground of the no-photo placeholder. */
  fallbackClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const photo = usePatientPhotoUrl(photo_document_id);

  const face = photo.src ? (
    <img src={photo.src} alt="Patient photo" className="h-full w-full object-cover" />
  ) : (
    <User className={cn("h-1/2 w-1/2", iconClassName)} strokeWidth={2.25} />
  );

  const shell = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden",
    !photo.src && fallbackClassName,
    className,
  );

  if (!editable) return <div className={shell}>{face}</div>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(shell, "group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2")}
        title={photo.src ? "Change patient photo" : "Take or upload a patient photo"}
        aria-label={photo.src ? "Change patient photo" : "Take or upload a patient photo"}
      >
        {face}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="h-1/3 w-1/3 text-white" />
        </span>
      </button>
      {open && (
        <PatientPhotoDialog
          open={open}
          onOpenChange={setOpen}
          patient_id={patient_id}
          office_id={office_id}
          photo_document_id={photo_document_id}
        />
      )}
    </>
  );
}
