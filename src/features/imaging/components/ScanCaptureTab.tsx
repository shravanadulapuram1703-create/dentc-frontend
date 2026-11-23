import { useState, useRef } from 'react';
import { Camera, Loader2, Check, Square } from 'lucide-react';
import type { DicomInstanceOut } from '@/api/generated/model';
import { useDeviceScan } from '../hooks/useDeviceScan';
import { useCaptureUpload } from '../hooks/useImageMutations';
import { DEFAULT_SCAN_TYPE, SCAN_TYPES } from '../constants';
import { resolveAssetUrl } from '../utils/dicomAssets';
import AgentSetupCard from './AgentSetupCard';
import DeviceStatusCard from './DeviceStatusCard';

interface ScanCaptureTabProps {
  patientId: number;
  patientName: string;
  patientDob?: string;
  officeId?: number | null;
  onCaptured?: (instance: DicomInstanceOut) => void;
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
 * "Scan & Capture" tab: opens the patient in the vendor software (deep-link),
 * then runs a *session* — repeatedly waiting for the next new capture and
 * uploading it, so a full multi-exposure series (e.g. an FMX run across many
 * tooth positions in Vatech's own acquisition screen) comes in one image at a
 * time without the user re-clicking anything here. The session keeps going
 * until "Done" is pressed; a capture already in flight when that happens
 * still gets saved (Done stops the *next* wait, not the current one). If the
 * launch step fails (e.g. the vendor software/bridge exe isn't found), the
 * flow stops there instead of silently waiting for a capture that Vatech was
 * never told to produce.
 */
export default function ScanCaptureTab({
  patientId,
  patientName,
  patientDob,
  onCaptured,
}: ScanCaptureTabProps) {
  const { status, info, runScan, launch, refresh } = useDeviceScan();
  const { upload, isUploading } = useCaptureUpload();
  const [scanType, setScanType] = useState<string>(DEFAULT_SCAN_TYPE);
  const [launching, setLaunching] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [capturedInSession, setCapturedInSession] = useState<DicomInstanceOut[]>([]);
  // Mirrors `sessionActive` for the running loop below: state updates from a
  // "Done" click don't reach an already-in-flight async function's closure,
  // so the loop reads this instead of the state variable.
  const sessionActiveRef = useRef(false);

  const detecting = status === 'detecting';
  const unavailable = status === 'unavailable';

  const runSessionLoop = async () => {
    while (sessionActiveRef.current) {
      const result = await runScan({ patient_id: patientId, scan_type: scanType });
      if (!result || !sessionActiveRef.current) break;
      const instance = await upload({
        file: result.file,
        patient_id: patientId,
        description: `Captured from imaging device (${scanType})`,
      });
      if (instance) {
        setCapturedInSession((prev) => [...prev, instance]);
        onCaptured?.(instance);
      }
    }
    sessionActiveRef.current = false;
    setSessionActive(false);
  };

  const handleStartSession = async () => {
    setLaunching(true);
    const { first, last } = splitName(patientName);
    let launched = false;
    try {
      launched = await launch({ patient_id: patientId, first_name: first, last_name: last, dob: patientDob });
    } finally {
      setLaunching(false);
    }
    // launch() already toasts its own error — don't also wait out a scan
    // that Vatech was never told to start.
    if (!launched) return;

    setCapturedInSession([]);
    sessionActiveRef.current = true;
    setSessionActive(true);
    void runSessionLoop();
  };

  const handleEndSession = () => {
    sessionActiveRef.current = false;
    setSessionActive(false);
  };

  // Agent not installed/running → first-time setup flow.
  if (unavailable || detecting) {
    return <AgentSetupCard detecting={detecting} onRecheck={() => void refresh()} />;
  }

  return (
    <div className="space-y-4">
      <DeviceStatusCard status={status} info={info} onRecheck={() => void refresh()} />

      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-[#1E293B]">Scan &amp; Capture</h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            Opens your imaging software focused on <strong>{patientName}</strong>. Capture as many
            images there as you need — a full FMX series included — each one is picked up and
            saved automatically as it appears. Press "Done" when the session is finished.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="block text-xs font-bold text-[#475569] mb-1">Scan type</label>
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              disabled={launching || sessionActive}
              className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white focus:border-[#3A6EA5] outline-none disabled:opacity-50"
            >
              {SCAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {sessionActive ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#3A6EA5]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading ? 'Saving…' : `Waiting for next capture… (${capturedInSession.length} saved)`}
              </div>
              <button
                type="button"
                onClick={handleEndSession}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#1E293B] hover:bg-[#0f172a] text-white rounded-lg font-bold text-sm transition-colors"
              >
                <Square className="w-4 h-4" />
                Done
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartSession}
              // Only this button's own click matters here, not `busy` as a
              // whole: `isScanning`/`isUploading` can still be true right
              // after "Done" because the *previous* session's last runScan()
              // call is still pending in the background (Done stops the next
              // wait, not the current one — see the component doc comment).
              // Gating on the shared `busy` flag would leave a fresh "Start
              // Session" click disabled for however long that stale wait
              // takes to resolve or time out (up to 5 minutes).
              disabled={launching}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {launching ? 'Opening imaging software…' : 'Start Session'}
            </button>
          )}
        </div>

        {capturedInSession.length > 0 && (
          <div>
            <div className="text-xs font-bold text-[#475569] mb-2">
              Captured this session ({capturedInSession.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {capturedInSession.map((instance) => (
                <div
                  key={instance.sop_instance_uid}
                  className="relative w-16 h-16 rounded-md border-2 border-[#2FB9A7] overflow-hidden bg-[#F1F5F9]"
                  title={`#${instance.instance_number ?? instance.id}`}
                >
                  {resolveAssetUrl(instance.assets.thumbnail_url) ? (
                    <img
                      src={resolveAssetUrl(instance.assets.thumbnail_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 bg-[#2FB9A7] text-white rounded-tl-md p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
