import { X } from 'lucide-react';

interface PatientHeaderProps {
  isOrthoPatient: boolean;
  onOrthoPatientChange: (value: boolean) => void;
  onClose: () => void;
}

export default function PatientHeader({
  isOrthoPatient,
  onOrthoPatientChange,
  onClose,
}: PatientHeaderProps) {
  return (
    <>
      {/* Header */}
      <div
        className="sticky top-0 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2.5 flex items-center justify-between z-10 border-b-4 border-[#1F3A5F]"
        role="banner"
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-white" id="modal-title">
              PATIENT INFORMATION
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOrthoPatient}
                onChange={(e) => onOrthoPatientChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-2 border-white"
                aria-label="Ortho Patient"
              />
              <span className="text-sm">Ortho Patient</span>
            </label>
          </div>
          <div className="text-[#B0C4DE] text-xs mt-1">
            Modified By: UDAFIX | Modified On: 12/21/2025 10:23 AM PT
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-[#16314d] p-1.5 rounded transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {/* Top Bar Info */}
      <div className="bg-[#F7F9FC] px-4 py-2 border-b-2 border-[#E2E8F0] flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div>
            Home Office: <span className="text-[#1F3A5F] font-semibold">MOON</span>
          </div>
          <div>
            First Visit: <span className="text-[#1F3A5F] font-semibold">09/08/2015</span>
          </div>
          <div>
            Exit Pnt: <span className="text-[#1F3A5F] font-semibold">-1639.69</span>
          </div>
        </div>
      </div>
    </>
  );
}
