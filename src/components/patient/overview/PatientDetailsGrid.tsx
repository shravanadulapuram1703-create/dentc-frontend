import { AlertCircle } from 'lucide-react';
import { PatientData } from './types';

interface PatientDetailsGridProps {
  patient: PatientData;
}

export default function PatientDetailsGrid({ patient }: PatientDetailsGridProps) {
  return (
    <>
      {/* Additional Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Provider</div>
          <div className="text-[#1E293B] font-semibold">{patient.provider}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Referral Type</div>
          <div className="text-[#1E293B] font-semibold">{patient.referralType}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Hygienist</div>
          <div className="text-[#1E293B] font-semibold">{patient.hygienist || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Referred By</div>
          <div className="text-[#1E293B] font-semibold">{patient.referredBy || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Home Office</div>
          <div className="text-[#1E293B] font-semibold">{patient.homeOffice}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Referred To</div>
          <div className="text-[#1E293B] font-semibold">{patient.referredTo || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">First Visit</div>
          <div className="text-[#1E293B] font-semibold">{patient.firstVisit}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Last Pano Chart</div>
          <div className="text-[#1E293B] font-semibold">{patient.lastPanoChart || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Home</div>
          <div className="text-[#3A6EA5] font-semibold">{patient.homePhone || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Contact Pref</div>
          <div className="text-[#1E293B] font-semibold">{patient.contactPref || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Work</div>
          <div className="text-[#1E293B] font-semibold">{patient.workPhone || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Fee Schedule</div>
          <div className="text-[#1E293B] font-semibold">{patient.feeSchedule}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Address</div>
          <div className="text-[#1E293B] font-semibold">{patient.address}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Type</div>
          <div className="text-[#1E293B] font-semibold">{patient.type || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">City, State and Zip</div>
          <div className="text-[#1E293B] font-semibold">{patient.city}, {patient.state} {patient.zip}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Preferred Language</div>
          <div className="text-[#1E293B] font-semibold">{patient.preferredLanguage}</div>
        </div>
      </div>

      {/* Medical Alerts */}
      {patient.medicalAlerts && (
        <div className="mt-3 bg-[#FEF2F2] border-2 border-[#EF4444] rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444]" strokeWidth={2} />
            <span className="font-semibold text-[#EF4444] text-sm">Medical Alerts: {patient.medicalAlerts}</span>
          </div>
        </div>
      )}
    </>
  );
}
