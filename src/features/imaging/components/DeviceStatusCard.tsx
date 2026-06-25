import { Wifi, WifiOff, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import type { DeviceInfo, DeviceScanStatus } from '../types';
import { AGENT_NAME } from '../constants';

interface DeviceStatusCardProps {
  status: DeviceScanStatus;
  info: DeviceInfo | null;
  onRecheck: () => void;
}

/** Compact agent connection banner shown above the capture controls. */
export default function DeviceStatusCard({ status, info, onRecheck }: DeviceStatusCardProps) {
  const detecting = status === 'detecting';
  const error = status === 'error';
  const connected = status === 'idle' || status === 'scanning';

  const tone = connected
    ? { dot: 'bg-[#2FB9A7]', text: 'text-[#0F766E]', bg: 'bg-[#2FB9A7]/10', border: 'border-[#2FB9A7]/30' }
    : error
      ? { dot: 'bg-[#D97706]', text: 'text-[#B45309]', bg: 'bg-[#FEF3C7]', border: 'border-[#FCD34D]' }
      : { dot: 'bg-[#94A3B8]', text: 'text-[#64748B]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2E8F0]' };

  const Icon = connected ? Wifi : error ? AlertTriangle : WifiOff;

  const label = detecting
    ? 'Looking for imaging agent…'
    : connected
      ? `${AGENT_NAME} connected`
      : error
        ? `${AGENT_NAME} reachable but reporting an error`
        : `${AGENT_NAME} not detected`;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border ${tone.border} ${tone.bg} px-4 py-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`} />
        </span>
        <Icon className={`w-4 h-4 shrink-0 ${tone.text}`} />
        <div className="min-w-0">
          <p className={`text-sm font-bold truncate ${tone.text}`}>{label}</p>
          {connected && (
            <p className="text-xs text-[#64748B] truncate">
              {info?.vendor ? `${info.vendor} · ` : ''}
              {info?.version ? `v${info.version} · ` : ''}
              {info?.software_running ? 'Imaging software running' : 'Imaging software not detected'}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRecheck}
        disabled={detecting}
        title="Recheck agent"
        className="p-2 rounded-md hover:bg-white/60 transition-colors disabled:opacity-40 shrink-0"
      >
        {detecting ? (
          <Loader2 className={`w-4 h-4 animate-spin ${tone.text}`} />
        ) : (
          <RefreshCw className={`w-4 h-4 ${tone.text}`} />
        )}
      </button>
    </div>
  );
}
