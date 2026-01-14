import { User, Calendar, FileText } from 'lucide-react';
import { PatientData } from './types';

interface PatientHeaderProps {
  patient: PatientData;
}

export default function PatientHeader({ patient }: PatientHeaderProps) {
  return (
    <div className="flex gap-4 mb-4">
      {/* Patient Avatar */}
      <div className="flex-shrink-0">
        <div className="w-20 h-20 bg-[#F7F9FC] rounded-lg border-2 border-[#E2E8F0] flex items-center justify-center">
          <User className="w-10 h-10 text-[#64748B]" strokeWidth={2} />
        </div>
      </div>

      {/* Patient Header Content */}
      <div className="flex-1 grid grid-cols-12 gap-4 text-sm">
        {/* Left: Identity */}
        <div className="col-span-5">
          <div className="text-[#1E293B] font-bold text-base leading-tight">
            {patient.name}
          </div>
          <div className="text-[#475569] text-sm mb-1">
            {patient.age} / {patient.sex}
          </div>
          <div className="text-[#3A6EA5] cursor-pointer hover:underline font-semibold text-sm">
            (C) {patient.cellPhone}
          </div>
        </div>

        {/* Middle: DOB / ID / Chart */}
        <div className="col-span-4 space-y-1">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[#3A6EA5] mt-0.5" strokeWidth={2} />
            <div>
              <div className="text-[#64748B] text-xs uppercase tracking-wide">
                DOB
              </div>
              <div className="text-[#1E293B] font-semibold text-sm">
                {patient.dob}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-[#3A6EA5] mt-0.5" strokeWidth={2} />
            <div>
              <div className="text-[#64748B] text-xs uppercase tracking-wide">
                Patient ID
              </div>
              <div className="text-[#1E293B] font-semibold text-sm">
                {patient.patientId}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-[#3A6EA5] mt-0.5" strokeWidth={2} />
            <div>
              <div className="text-[#64748B] text-xs uppercase tracking-wide">
                Chart #
              </div>
              <div className="text-[#1E293B] font-semibold text-sm">
                {patient.chartNum}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visits */}
        <div className="col-span-3 space-y-1">
          <div>
            <div className="text-[#64748B] text-xs uppercase tracking-wide">
              Next Visit
            </div>
            <div className="text-[#1E293B] font-semibold text-sm">
              {patient.nextVisit}
            </div>
          </div>

          <div>
            <div className="text-[#64748B] text-xs uppercase tracking-wide">
              Next Recall
            </div>
            <div className="text-[#1E293B] font-semibold text-sm">
              {patient.nextRecall || '-'}
            </div>
          </div>

          <div>
            <div className="text-[#64748B] text-xs uppercase tracking-wide">
              Last Visit
            </div>
            <div className="text-[#1E293B] font-semibold text-sm">
              {patient.lastVisit || '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
