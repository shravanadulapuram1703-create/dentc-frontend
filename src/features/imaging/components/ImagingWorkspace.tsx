import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { ImageIcon, Camera, Images } from 'lucide-react';
import ScanCaptureTab from './ScanCaptureTab';
import ImagesTab from './ImagesTab';

interface PatientData {
  id: string;
  name: string;
  dob?: string;
  age?: number;
  officeId?: string;
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
  const officeId = patient.officeId ? Number(patient.officeId) : undefined;

  const [tab, setTab] = useState<TabKey>('capture');

  if (!validId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F9FC] text-sm text-[#64748B]">
        Missing patient context. Reopen the patient and try again.
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Camera }[] = [
    { key: 'capture', label: 'Scan & Capture', icon: Camera },
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
              const active = tab === key;
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

        {tab === 'capture' ? (
          <ScanCaptureTab
            patientId={numericPatientId}
            patientName={patient.name}
            patientDob={patient.dob}
            officeId={officeId}
            onCaptured={() => setTab('images')}
          />
        ) : (
          <ImagesTab patientId={numericPatientId} officeId={officeId} />
        )}
      </div>
    </div>
  );
}
