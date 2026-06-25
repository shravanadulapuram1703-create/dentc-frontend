import { Download, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { env } from '@/shared/config/env';
import { AGENT_NAME } from '../constants';

interface AgentSetupCardProps {
  detecting: boolean;
  onRecheck: () => void;
}

/**
 * First-time setup card shown when the local imaging agent is not detected
 * (connection refused). Offers a one-click download (when an installer URL is
 * configured) plus a "recheck" that re-probes the agent after install.
 */
export default function AgentSetupCard({ detecting, onRecheck }: AgentSetupCardProps) {
  const downloadUrl = env.imagingAgentDownloadUrl;

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#3A6EA5]/10 rounded-lg shrink-0">
          <Download className="w-6 h-6 text-[#3A6EA5]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[#1E293B]">Set up scanning on this computer</h3>
          <p className="text-sm text-[#64748B] mt-1">
            To capture X-rays and intra-oral images directly from your sensor, this
            workstation needs the <strong>{AGENT_NAME}</strong> — a small background
            helper that securely connects your imaging hardware to DentC.
          </p>

          <ol className="mt-4 space-y-2 text-sm text-[#475569]">
            <li className="flex gap-2">
              <span className="font-bold text-[#3A6EA5]">1.</span>
              Download and run the installer (one time per computer).
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#3A6EA5]">2.</span>
              The agent starts automatically and runs quietly in the background.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#3A6EA5]">3.</span>
              Come back here and select <strong>Recheck</strong> — scanning unlocks.
            </li>
          </ol>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {downloadUrl ? (
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-bold text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download {AGENT_NAME}
              </a>
            ) : (
              <span className="text-xs font-semibold text-[#94A3B8]">
                Installer link not configured — ask your administrator for the agent.
              </span>
            )}
            <button
              type="button"
              onClick={onRecheck}
              disabled={detecting}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#E2E8F0] hover:border-[#3A6EA5] text-[#475569] rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              {detecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {detecting ? 'Checking…' : 'Recheck'}
            </button>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <ShieldCheck className="w-3.5 h-3.5" />
            The agent runs only on this computer (loopback) and never exposes your
            images to the network.
          </p>
        </div>
      </div>
    </div>
  );
}
