import { Camera, Loader2, Wifi, WifiOff } from 'lucide-react';
import type { PatientDocumentRead } from '@/api/generated/model';
import { useDeviceScan } from '../hooks/useDeviceScan';
import { useImageUpload } from '../hooks/useImageMutations';
import { DEFAULT_CATEGORY } from '../constants';

interface ScanButtonProps {
  patientId: number;
  officeId?: number | null;
  onCaptured?: (doc: PatientDocumentRead) => void;
}

/**
 * Capture from a connected imaging device. The device boundary is env-gated and
 * OFF by default, so this renders a clear "device unavailable" state rather than
 * failing silently. A captured image is uploaded through the same backend path
 * as a manual upload.
 */
export default function ScanButton({ patientId, officeId, onCaptured }: ScanButtonProps) {
  const { status, isScanning, runScan } = useDeviceScan();
  const { upload, isUploading } = useImageUpload();

  const unavailable = status === 'unavailable';
  const busy = isScanning || isUploading;

  const handleScan = async () => {
    const result = await runScan({ patient_id: patientId, scan_type: 'periapical' });
    if (!result) return;
    const doc = await upload({
      file: result.file,
      patient_id: patientId,
      office_id: officeId,
      category: DEFAULT_CATEGORY,
      description: 'Captured from imaging device',
    });
    if (doc) onCaptured?.(doc);
  };

  const statusBadge = unavailable ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#94A3B8]">
      <WifiOff className="w-3.5 h-3.5" /> Device offline
    </span>
  ) : status === 'error' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
      <WifiOff className="w-3.5 h-3.5" /> Device error
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9A7]">
      <Wifi className="w-3.5 h-3.5" /> Device ready
    </span>
  );

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleScan}
        disabled={unavailable || busy}
        title={
          unavailable
            ? 'No imaging device bridge is configured on this workstation'
            : 'Capture an image from the connected device'
        }
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] hover:bg-[#3A6EA5] hover:text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#3A6EA5]"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {isScanning ? 'Capturing…' : isUploading ? 'Saving…' : 'Scan'}
      </button>
      {statusBadge}
    </div>
  );
}
