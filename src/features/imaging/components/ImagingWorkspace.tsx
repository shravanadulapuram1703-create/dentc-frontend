import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { ImageIcon, Camera, Images } from 'lucide-react';
import { usePatientOffice } from '@/features/office-scope';
import { useHasRight, RIGHT } from '@/features/access-control';
import ScanCaptureTab from './ScanCaptureTab';
import ImagesTab from './ImagesTab';

interface PatientData {
  id: string;
  name: string;
  dob?: string;
  age?: number;
}
interface OutletContext {
  patient: PatientData;
}

type TabKey = 'capture' | 'images';

/** Patient Imaging workspace — route container at /patient/:patientId/imaging. */
export default function ImagingWorkspace() {
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();

  const numericPatientId = Number(patientId ?? patient.id);
  const validId = Number.isFinite(numericPatientId);
  const { posting_office_id: officeId } = usePatientOffice();

  // RBAC: capturing/scanning needs Imaging Full Control. A view-only user only
  // gets the Images tab (delete/upload inside it are gated separately).
  const canCapture = useHasRight(RIGHT.imaging.full);

  const [tab, setTab] = useState<TabKey>('capture');
  // Never resolve to the capture tab without the right (default state is 'capture').
  const effectiveTab: TabKey = canCapture ? tab : 'images';

  if (!validId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC] text-sm text-[#64748B]">
        Missing patient context. Reopen the patient and try again.
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Camera }[] = [
    ...(canCapture
      ? [{ key: 'capture' as const, label: 'Scan & Capture', icon: Camera }]
      : []),
    { key: 'images', label: 'Images', icon: Images },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#3A6EA5]/10 to-[#2FB9A7]/10 rounded-lg">
              <ImageIcon className="w-6 h-6 text-[#3A6EA5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Patient Imaging</h1>
              <p className="text-sm text-[#64748B]">{patient.name}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex gap-1 border-b border-[#E2E8F0] -mb-5">
            {tabs.map(({ key, label, icon: Icon }) => {
              const active = effectiveTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                    active
                      ? 'border-[#3A6EA5] text-[#3A6EA5]'
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {effectiveTab === 'capture' ? (
          <ScanCaptureTab
            patientId={numericPatientId}
            patientName={patient.name}
            patientDob={patient.dob}
            officeId={officeId}
          />
        ) : (
          <ImagesTab patientId={numericPatientId} officeId={officeId ?? undefined} />
        )}
      </div>
    </div>
  );
}
