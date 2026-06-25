import { useState } from 'react';
import { Camera, ExternalLink, Loader2 } from 'lucide-react';
import type { PatientDocumentRead } from '@/api/generated/model';
import { useDeviceScan } from '../hooks/useDeviceScan';
import { useImageUpload } from '../hooks/useImageMutations';
import { DEFAULT_CATEGORY, DEFAULT_SCAN_TYPE, SCAN_TYPES } from '../constants';
import AgentSetupCard from './AgentSetupCard';
import DeviceStatusCard from './DeviceStatusCard';

interface ScanCaptureTabProps {
  patientId: number;
  patientName: string;
  patientDob?: string;
  officeId?: number | null;
  onCaptured?: (doc: PatientDocumentRead) => void;
}

/** Parse a "Last, First" or "First Last" display name into name parts. */
const splitName = (name: string): { first?: string; last?: string } => {
  if (name.includes(',')) {
    const [last, first] = name.split(',').map((s) => s.trim());
    return { first: first || undefined, last: last || undefined };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(' ') };
};

/**
 * "Scan & Capture" tab: connect to the local imaging agent, open the patient in
 * the vendor software (deep-link), and capture an image. A captured image is
 * uploaded through the same backend path as a manual upload.
 */
export default function ScanCaptureTab({
  patientId,
  patientName,
  patientDob,
  officeId,
  onCaptured,
}: ScanCaptureTabProps) {
  const { status, info, isScanning, runScan, launch, refresh } = useDeviceScan();
  const { upload, isUploading } = useImageUpload();
  const [scanType, setScanType] = useState<string>(DEFAULT_SCAN_TYPE);
  const [launching, setLaunching] = useState(false);

  const detecting = status === 'detecting';
  const unavailable = status === 'unavailable';
  const busy = isScanning || isUploading;

  const handleLaunch = async () => {
    setLaunching(true);
    const { first, last } = splitName(patientName);
    try {
      await launch({ patient_id: patientId, first_name: first, last_name: last, dob: patientDob });
    } finally {
      setLaunching(false);
    }
  };

  const handleScan = async () => {
    const result = await runScan({ patient_id: patientId, scan_type: scanType });
    if (!result) return;
    const doc = await upload({
      file: result.file,
      patient_id: patientId,
      office_id: officeId,
      category: DEFAULT_CATEGORY,
      description: `Captured from imaging device (${scanType})`,
    });
    if (doc) onCaptured?.(doc);
  };

  // Agent not installed/running → first-time setup flow.
  if (unavailable || detecting) {
    return <AgentSetupCard detecting={detecting} onRecheck={() => void refresh()} />;
  }

  return (
    <div className="space-y-4">
      <DeviceStatusCard status={status} info={info} onRecheck={() => void refresh()} />

      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5 space-y-5">
        {/* Step 1 — open patient in vendor software */}
        <div>
          <h4 className="text-sm font-bold text-[#1E293B]">1 · Open patient in imaging software</h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            Launches your imaging software focused on <strong>{patientName}</strong> so
            the capture is filed to the right chart.
          </p>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching || busy}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] hover:border-[#3A6EA5] text-[#475569] rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
          >
            {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            {launching ? 'Opening…' : 'Open in imaging software'}
          </button>
        </div>

        <div className="border-t border-[#F1F5F9]" />

        {/* Step 2 — capture */}
        <div>
          <h4 className="text-sm font-bold text-[#1E293B]">2 · Capture image</h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            Acquire from the sensor. The captured image is saved to this patient
            automatically.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="block text-xs font-bold text-[#475569] mb-1">Scan type</label>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
                disabled={busy}
                className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white focus:border-[#3A6EA5] outline-none disabled:opacity-50"
              >
                {SCAN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleScan}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {isScanning ? 'Capturing…' : isUploading ? 'Saving…' : 'Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
